/**
 * Possessed Butler - OpenAI LLM Provider Stub
 *
 * Clean architectural stub for optional future OpenAI integration.
 * Reads API credentials and model configuration strictly from environment variables.
 * NO hardcoded API keys or model identifiers.
 */

import { LLMMessage, LLMResponse, LLMProvider, ToolMetadata } from "@/types";
import { ConfigurationError } from "./types";

export class OpenAILLMProvider implements LLMProvider {
  readonly providerName = "openai";
  readonly modelIdentifier: string;
  private readonly apiKey: string;

  constructor(config?: { apiKey?: string; modelIdentifier?: string }) {
    const apiKey = config?.apiKey || process.env.OPENAI_API_KEY;
    const model = config?.modelIdentifier || process.env.OPENAI_MODEL;

    if (!apiKey || apiKey.trim() === "") {
      throw new ConfigurationError(
        "OPENAI_API_KEY is required for OpenAILLMProvider. Please configure OPENAI_API_KEY."
      );
    }

    if (!model || model.trim() === "") {
      throw new ConfigurationError(
        "OPENAI_MODEL is required for OpenAILLMProvider. Please configure OPENAI_MODEL."
      );
    }

    this.apiKey = apiKey.trim();
    this.modelIdentifier = model.trim();
  }

  async generateCompletion(
    _messages: LLMMessage[],
    _availableTools: ToolMetadata[]
  ): Promise<LLMResponse> {
    // Stub implementation ready for full SDK integration in future mission
    throw new Error(
      `OpenAILLMProvider stub initialized for model ${this.modelIdentifier}. Live calls require full client initialization.`
    );
  }
}
