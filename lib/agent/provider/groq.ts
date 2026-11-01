/**
 * Kavach — Production Groq LLM Provider
 *
 * Implements the model-independent LLMProvider contract using the official Groq SDK.
 * Reads API credentials and model configuration strictly from server-side environment variables.
 *
 * ARCHITECTURAL INVARIANT:
 * The Groq provider is strictly an intelligence generator, NOT a security authority.
 * It receives instructions and untrusted data contexts, returns reasoning or tool call requests,
 * but NEVER authorizes or executes tools. The Security Gateway, Policy Engine, and Tool Gateway
 * remain the sole security arbiters and execution boundaries.
 */

import Groq from "groq-sdk";
import {
  LLMMessage,
  LLMResponse,
  LLMProvider,
  ToolCallRequest,
  ToolMetadata,
} from "@/types";
import { ConfigurationError } from "./types";
import { KAVACH_MASTER_SYSTEM_INSTRUCTIONS } from "@/lib/llm/prompts/kavach-system";
import { sanitizeText } from "@/lib/security/sanitizer";

export class GroqLLMProvider implements LLMProvider {
  readonly providerName = "groq";
  readonly modelIdentifier: string;
  private readonly apiKey: string;
  private readonly client: Groq;
  private cachedToolCalls: Map<string, ToolCallRequest> = new Map();

  constructor(config?: { apiKey?: string; modelIdentifier?: string }) {
    const apiKey =
      config?.apiKey !== undefined ? config.apiKey : process.env.GROQ_API_KEY;
    const model =
      config?.modelIdentifier !== undefined
        ? config.modelIdentifier
        : process.env.GROQ_MODEL || "llama-3.3-70b-versatile";

    if (!apiKey || apiKey.trim() === "") {
      throw new ConfigurationError(
        "GROQ_API_KEY is required for GroqLLMProvider. Please configure GROQ_API_KEY in your environment."
      );
    }

    if (!model || model.trim() === "") {
      throw new ConfigurationError(
        "GROQ_MODEL is required for GroqLLMProvider. Please specify a model identifier in GROQ_MODEL."
      );
    }

    this.apiKey = apiKey.trim();
    this.modelIdentifier = model.trim();
    this.client = new Groq({ apiKey: this.apiKey });
  }

  /**
   * Resets local tool call tracking state across multi-turn sessions
   */
  reset(): void {
    this.cachedToolCalls.clear();
  }

  /**
   * Generates model completion, returning tool call requests or final response.
   * Maps Groq chat completion messages and tool definitions into the Kavach contract.
   */
  async generateCompletion(
    messages: LLMMessage[],
    availableTools: ToolMetadata[],
    options?: { signal?: AbortSignal }
  ): Promise<LLMResponse> {
    if (options?.signal?.aborted) {
      throw new Error("Request was aborted before execution.");
    }

    // 1. Convert ToolMetadata into Groq / OpenAI-compatible tool specifications
    const groqTools: Groq.Chat.ChatCompletionTool[] = availableTools.map((tool) => {
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
        function: {
          name: tool.name,
          description: tool.description,
          parameters: {
            type: "object",
            properties,
            required: required.length > 0 ? required : undefined,
          },
        },
      };
    });

    // 2. Format messages into Groq-compliant structure
    const groqMessages = this.formatMessagesForGroq(messages);

    try {
      const completion = await this.client.chat.completions.create(
        {
          model: this.modelIdentifier,
          messages: groqMessages,
          tools: groqTools.length > 0 ? groqTools : undefined,
          tool_choice: groqTools.length > 0 ? "auto" : undefined,
          temperature: 0.1,
        },
        {
          signal: options?.signal,
        }
      );

      const choice = completion.choices?.[0];
      if (!choice) {
        throw new Error("Groq API returned an empty choices array.");
      }

      const message = choice.message;
      const toolCalls: ToolCallRequest[] = [];

      // Extract requested tool calls if present
      if (message.tool_calls && message.tool_calls.length > 0) {
        for (const tc of message.tool_calls) {
          if (tc.type === "function" && tc.function) {
            let parsedArgs: Record<string, unknown> = {};
            try {
              parsedArgs = JSON.parse(tc.function.arguments || "{}");
            } catch {
              parsedArgs = {};
            }

            const callRequest: ToolCallRequest = {
              id: tc.id || `call_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
              toolName: tc.function.name,
              arguments: parsedArgs,
            };

            toolCalls.push(callRequest);
            this.cachedToolCalls.set(callRequest.id, callRequest);
          }
        }
      }

      const finishReason: LLMResponse["finishReason"] =
        toolCalls.length > 0
          ? "tool_use"
          : choice.finish_reason === "length"
          ? "length"
          : "stop";

      return {
        content: message.content || "",
        toolCalls,
        finishReason,
        usage: completion.usage
          ? {
              inputTokens: completion.usage.prompt_tokens,
              outputTokens: completion.usage.completion_tokens,
            }
          : undefined,
        raw: completion,
      };
    } catch (error: unknown) {
      if (options?.signal?.aborted) {
        throw new Error("Groq request was cancelled by client.");
      }

      const rawMsg = error instanceof Error ? error.message : "Unknown Groq API error";
      // Sanitize: Never expose API key or sensitive credentials in error traces
      const sanitizedMsg = sanitizeText(rawMsg);
      throw new Error(`[GroqLLMProvider Error]: ${sanitizedMsg}`);
    }
  }

  /**
   * Translates Kavach's model-independent LLMMessage array into Groq Chat Completion messages.
   * Ensures assistant messages with tool calls properly pair with following tool response messages.
   */
  private formatMessagesForGroq(
    messages: LLMMessage[]
  ): Groq.Chat.ChatCompletionMessageParam[] {
    const formatted: Groq.Chat.ChatCompletionMessageParam[] = [];

    // Ensure Master Security Instructions are present
    const hasSystemMessage = messages.some((m) => m.role === "system");
    if (!hasSystemMessage) {
      formatted.push({
        role: "system",
        content: KAVACH_MASTER_SYSTEM_INSTRUCTIONS,
      });
    }

    for (let i = 0; i < messages.length; i++) {
      const msg = messages[i];

      if (msg.role === "system") {
        formatted.push({
          role: "system",
          content: msg.content,
        });
      } else if (msg.role === "user") {
        formatted.push({
          role: "user",
          content: msg.content,
        });
      } else if (msg.role === "assistant") {
        // Look ahead to check if this assistant message triggered tool calls
        const subsequentToolMessages: LLMMessage[] = [];
        let j = i + 1;
        while (j < messages.length && messages[j].role === "tool") {
          subsequentToolMessages.push(messages[j]);
          j++;
        }

        if (subsequentToolMessages.length > 0) {
          // Construct tool_calls array matching each tool response
          const toolCalls = subsequentToolMessages.map((toolMsg) => {
            const cached = toolMsg.toolCallId ? this.cachedToolCalls.get(toolMsg.toolCallId) : undefined;
            return {
              id: toolMsg.toolCallId || `call_${Date.now()}`,
              type: "function" as const,
              function: {
                name: toolMsg.name || cached?.toolName || "tool",
                arguments: cached ? JSON.stringify(cached.arguments) : "{}",
              },
            };
          });

          formatted.push({
            role: "assistant",
            content: msg.content || null,
            tool_calls: toolCalls,
          });
        } else {
          formatted.push({
            role: "assistant",
            content: msg.content || "",
          });
        }
      } else if (msg.role === "tool") {
        formatted.push({
          role: "tool",
          tool_call_id: msg.toolCallId || `call_${Date.now()}`,
          content: msg.content,
        });
      }
    }

    return formatted;
  }
}
