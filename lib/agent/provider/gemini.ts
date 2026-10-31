/**
 * Kavach — Production Gemini LLM Provider
 *
 * Implements the model-independent LLMProvider contract using Google's official
 * @google/genai SDK with the Gemini Interactions API as the primary production path,
 * and direct generateContent as a compatibility fallback.
 *
 * ARCHITECTURAL INVARIANT:
 * The Gemini provider is NOT a security authority. It receives instructions,
 * returns function call requests or text, but NEVER authorizes or executes tools.
 */

import { GoogleGenAI } from "@google/genai";
import {
  LLMMessage,
  LLMResponse,
  LLMProvider,
  ToolCallRequest,
  ToolMetadata,
} from "@/types";
import { ConfigurationError } from "./types";
import { KAVACH_MASTER_SYSTEM_INSTRUCTIONS } from "@/lib/llm/prompts/kavach-system";

export class GeminiLLMProvider implements LLMProvider {
  readonly providerName = "gemini";
  readonly modelIdentifier: string;
  private readonly apiKey: string;
  private readonly client: GoogleGenAI;
  private lastInteractionId?: string;

  constructor(config?: { apiKey?: string; modelIdentifier?: string }) {
    const apiKey =
      config?.apiKey !== undefined ? config.apiKey : process.env.GEMINI_API_KEY;
    const model =
      config?.modelIdentifier !== undefined
        ? config.modelIdentifier
        : process.env.GEMINI_MODEL || "gemini-3.8-flash";

    if (!apiKey || apiKey.trim() === "") {
      throw new ConfigurationError(
        "GEMINI_API_KEY is required for GeminiLLMProvider. Please configure GEMINI_API_KEY in your environment."
      );
    }

    if (!model || model.trim() === "") {
      throw new ConfigurationError(
        "GEMINI_MODEL is required for GeminiLLMProvider. Please specify a model identifier in GEMINI_MODEL."
      );
    }

    this.apiKey = apiKey.trim();
    this.modelIdentifier = model.trim();
    this.client = new GoogleGenAI({ apiKey: this.apiKey });
  }

  /**
   * Resets the active interaction session state
   */
  reset(): void {
    this.lastInteractionId = undefined;
  }

  /**
   * Generates model completion, returning either tool call requests or final response.
   * Primary path: Gemini Interactions API.
   * Fallback path: Gemini generateContent API via @google/genai.
   */
  async generateCompletion(
    messages: LLMMessage[],
    availableTools: ToolMetadata[],
    options?: { signal?: AbortSignal }
  ): Promise<LLMResponse> {
    try {
      return await this.generateWithInteractionsAPI(
        messages,
        availableTools,
        options
      );
    } catch {
      // If Interactions API fails or is not enabled for the key/region, use generateContent fallback
      return await this.generateWithContentAPI(
        messages,
        availableTools,
        options
      );
    }
  }

  /**
   * Primary Path: Google GenAI Interactions API (client.interactions.create)
   */
  private async generateWithInteractionsAPI(
    messages: LLMMessage[],
    availableTools: ToolMetadata[],
    _options?: { signal?: AbortSignal }
  ): Promise<LLMResponse> {
    const systemInstruction =
      messages.find((m) => m.role === "system")?.content ||
      KAVACH_MASTER_SYSTEM_INSTRUCTIONS;

    // Convert ToolMetadata to Interactions API function tool declarations
    const tools = availableTools.map((tool) => {
      const properties: Record<string, { type: string; description: string }> = {};
      const required: string[] = [];

      for (const [paramName, paramDef] of Object.entries(tool.parameters || {})) {
        properties[paramName] = {
          type: paramDef.type.toLowerCase(),
          description: paramDef.description,
        };
        if (paramDef.required) {
          required.push(paramName);
        }
      }

      return {
        type: "function" as const,
        name: tool.name,
        description: tool.description,
        parameters: {
          type: "object",
          properties,
          required: required.length > 0 ? required : undefined,
        },
      };
    });

    // Check if the latest message is a tool result continuation
    const lastMsg = messages[messages.length - 1];
    const isToolContinuation = lastMsg && lastMsg.role === "tool";

    let interaction;

    if (isToolContinuation && this.lastInteractionId) {
      // Continue previous interaction with tool output
      interaction = await this.client.interactions.create({
        model: this.modelIdentifier,
        previous_interaction_id: this.lastInteractionId,
        input: [
          {
            type: "function_result",
            call_id: lastMsg.toolCallId || `call_${Date.now()}`,
            name: lastMsg.name || "tool_result",
            result: lastMsg.content,
          },
        ],
      });
    } else {
      // New interaction: gather user instruction
      const userMsgs = messages.filter((m) => m.role === "user");
      const latestUserPrompt =
        userMsgs[userMsgs.length - 1]?.content || "Process current request";

      interaction = await this.client.interactions.create({
        model: this.modelIdentifier,
        system_instruction: systemInstruction,
        input: latestUserPrompt,
        tools: tools.length > 0 ? (tools as unknown as NonNullable<Parameters<typeof this.client.interactions.create>[0]>["tools"]) : undefined,
      });
    }

    // Save interaction ID for multi-turn server-side continuation
    if (interaction?.id) {
      this.lastInteractionId = interaction.id;
    }

    // Extract function calls from interaction steps
    const toolCalls: ToolCallRequest[] = [];
    const textContent = interaction.output_text || "";

    if (interaction.steps) {
      for (const step of interaction.steps) {
        if (step.type === "function_call") {
          toolCalls.push({
            id:
              step.id ||
              `call_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
            toolName: step.name,
            arguments: step.arguments || {},
          });
        }
      }
    }

    const finishReason = toolCalls.length > 0 ? "tool_use" : "stop";

    return {
      content: textContent,
      toolCalls,
      finishReason,
      raw: interaction,
    };
  }

  /**
   * Compatibility Fallback: Google GenAI generateContent API (client.models.generateContent)
   */
  private async generateWithContentAPI(
    messages: LLMMessage[],
    availableTools: ToolMetadata[],
    _options?: { signal?: AbortSignal }
  ): Promise<LLMResponse> {
    let systemInstruction: string = KAVACH_MASTER_SYSTEM_INSTRUCTIONS;
    const contents: Array<Record<string, unknown>> = [];

    for (const msg of messages) {
      if (msg.role === "system") {
        systemInstruction = msg.content;
      } else if (msg.role === "tool") {
        contents.push({
          role: "user",
          parts: [
            {
              functionResponse: {
                name: msg.name || "tool_result",
                response: { output: msg.content },
              },
            },
          ],
        });
      } else {
        contents.push({
          role: msg.role === "assistant" ? "model" : "user",
          parts: [{ text: msg.content }],
        });
      }
    }

    const functionDeclarations = availableTools.map((tool) => {
      const properties: Record<string, { type: string; description: string }> = {};
      const required: string[] = [];

      for (const [paramName, paramDef] of Object.entries(tool.parameters || {})) {
        properties[paramName] = {
          type: paramDef.type.toLowerCase(),
          description: paramDef.description,
        };
        if (paramDef.required) {
          required.push(paramName);
        }
      }

      return {
        name: tool.name,
        description: tool.description,
        parametersJsonSchema: {
          type: "object",
          properties,
          required: required.length > 0 ? required : undefined,
        },
      };
    });

    const response = await this.client.models.generateContent({
      model: this.modelIdentifier,
      contents: contents as unknown as Parameters<typeof this.client.models.generateContent>[0]["contents"],
      config: {
        systemInstruction,
        tools:
          functionDeclarations.length > 0
            ? [{ functionDeclarations }]
            : undefined,
      },
    });

    const candidate = response.candidates?.[0];
    if (!candidate) {
      return {
        content: "",
        toolCalls: [],
        finishReason: "error",
      };
    }

    const toolCalls: ToolCallRequest[] = [];
    let textContent = "";

    const parts = candidate.content?.parts || [];
    for (const part of parts) {
      if (part.text) {
        textContent += part.text;
      }
      if (part.functionCall && part.functionCall.name) {
        toolCalls.push({
          id: `call_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
          toolName: part.functionCall.name,
          arguments: (part.functionCall.args as Record<string, unknown>) || {},
        });
      }
    }

    const finishReason = toolCalls.length > 0 ? "tool_use" : "stop";

    return {
      content: textContent,
      toolCalls,
      finishReason,
      raw: response,
    };
  }
}
