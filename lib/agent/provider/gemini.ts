/**
 * Kavach - Gemini LLM Provider
 *
 * Primary real runtime provider utilizing the Google Generative Language API.
 * Reads API credentials and model configuration strictly from environment variables.
 * NO hardcoded API keys or model identifiers.
 */

import { LLMMessage, LLMResponse, LLMProvider, ToolCallRequest } from "@/types";
import { ToolMetadata } from "@/types";
import { ConfigurationError } from "./types";

interface GeminiFunctionDeclaration {
  name: string;
  description: string;
  parameters: {
    type: "OBJECT";
    properties: Record<string, { type: string; description: string }>;
    required?: string[];
  };
}

interface GeminiPart {
  text?: string;
  functionCall?: {
    name: string;
    args: Record<string, unknown>;
  };
  functionResponse?: {
    name: string;
    response: { output: unknown };
  };
}

interface GeminiContent {
  role: "user" | "model";
  parts: GeminiPart[];
}

export class GeminiLLMProvider implements LLMProvider {
  readonly providerName = "gemini";
  readonly modelIdentifier: string;
  private readonly apiKey: string;
  private readonly baseUrl: string;

  constructor(config?: { apiKey?: string; modelIdentifier?: string; baseUrl?: string }) {
    const apiKey = config?.apiKey || process.env.GEMINI_API_KEY;
    const model = config?.modelIdentifier || process.env.GEMINI_MODEL;

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
    this.baseUrl = config?.baseUrl || "https://generativelanguage.googleapis.com/v1beta";
  }

  async generateCompletion(
    messages: LLMMessage[],
    availableTools: ToolMetadata[],
    options?: { signal?: AbortSignal }
  ): Promise<LLMResponse> {
    // 1. Separate system instruction from conversation history
    let systemInstruction: string | undefined;
    const contents: GeminiContent[] = [];

    for (const msg of messages) {
      if (msg.role === "system") {
        systemInstruction = (systemInstruction ? systemInstruction + "\n\n" : "") + msg.content;
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

    // 2. Format tool declarations
    const functionDeclarations: GeminiFunctionDeclaration[] = availableTools.map((tool) => {
      const properties: Record<string, { type: string; description: string }> = {};
      const required: string[] = [];

      for (const [paramName, paramDef] of Object.entries(tool.parameters)) {
        properties[paramName] = {
          type: paramDef.type.toUpperCase(),
          description: paramDef.description,
        };
        if (paramDef.required) {
          required.push(paramName);
        }
      }

      return {
        name: tool.name,
        description: tool.description,
        parameters: {
          type: "OBJECT",
          properties,
          required: required.length > 0 ? required : undefined,
        },
      };
    });

    // 3. Construct API payload
    const requestBody: Record<string, unknown> = {
      contents,
    };

    if (systemInstruction) {
      requestBody.systemInstruction = {
        parts: [{ text: systemInstruction }],
      };
    }

    if (functionDeclarations.length > 0) {
      requestBody.tools = [{ functionDeclarations }];
    }

    const endpoint = `${this.baseUrl}/models/${encodeURIComponent(this.modelIdentifier)}:generateContent?key=${encodeURIComponent(this.apiKey)}`;

    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(requestBody),
      signal: options?.signal,
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Gemini API error [${response.status}]: ${errorText}`);
    }

    const data = await response.json();
    const candidate = data.candidates?.[0];

    if (!candidate) {
      return {
        content: "",
        toolCalls: [],
        finishReason: "error",
      };
    }

    const toolCalls: ToolCallRequest[] = [];
    let textContent = "";

    const parts: GeminiPart[] = candidate.content?.parts || [];
    for (const part of parts) {
      if (part.text) {
        textContent += part.text;
      }
      if (part.functionCall) {
        toolCalls.push({
          id: `call_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
          toolName: part.functionCall.name,
          arguments: part.functionCall.args || {},
        });
      }
    }

    const finishReason =
      toolCalls.length > 0
        ? "tool_use"
        : candidate.finishReason === "STOP"
        ? "stop"
        : "stop";

    return {
      content: textContent,
      toolCalls,
      finishReason,
      usage: data.usageMetadata
        ? {
            inputTokens: data.usageMetadata.promptTokenCount,
            outputTokens: data.usageMetadata.candidatesTokenCount,
          }
        : undefined,
      raw: data,
    };
  }
}
