/**
 * Kavach - Model-Independent LLM Provider Contract
 *
 * Supports interchangeable backends (Mock, Gemini, Anthropic, OpenAI)
 * without making any single model or provider a security authority.
 */

import { ToolMetadata } from "./tool";

export type ProviderType = "mock" | "gemini" | "anthropic" | "openai" | "groq";

export interface LLMMessage {
  role: "system" | "user" | "assistant" | "tool";
  content: string;
  name?: string;
  toolCallId?: string;
}

export interface ToolCallRequest {
  id: string;
  toolName: string;
  arguments: Record<string, unknown>;
}

export interface LLMResponse {
  content: string;
  toolCalls: ToolCallRequest[];
  finishReason: "stop" | "tool_use" | "length" | "error";
  usage?: {
    inputTokens?: number;
    outputTokens?: number;
  };
  raw?: unknown;
}

export interface LLMProviderConfig {
  providerType: ProviderType;
  modelIdentifier?: string;
  apiKey?: string;
  temperature?: number;
  maxOutputTokens?: number;
}

export interface LLMProvider {
  readonly providerName: string;
  readonly modelIdentifier: string;

  /**
   * Generates a completion from messages and available tool definitions.
   * Model outputs may include reasoning text and tool call requests.
   * Note: The provider never executes tools; it only returns requested calls.
   */
  generateCompletion(
    messages: LLMMessage[],
    availableTools: ToolMetadata[],
    options?: { signal?: AbortSignal }
  ): Promise<LLMResponse>;
}
