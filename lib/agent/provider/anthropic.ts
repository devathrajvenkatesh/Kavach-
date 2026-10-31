/**
 * Kavach - Anthropic LLM Provider Stub
 *
 * Clean architectural stub for future Anthropic Claude integration.
 * Reads API credentials and model configuration strictly from environment variables.
 * NO hardcoded API keys or model identifiers.
 */

import { LLMMessage, LLMResponse, LLMProvider, ToolMetadata } from "@/types";
import { ConfigurationError } from "./types";

export class AnthropicLLMProvider implements LLMProvider {
  readonly providerName = "anthropic";
  readonly modelIdentifier: string;
  private readonly apiKey: string;

  constructor(config?: { apiKey?: string; modelIdentifier?: string }) {
    const apiKey = config?.apiKey || process.env.ANTHROPIC_API_KEY;
    const model = config?.modelIdentifier || process.env.ANTHROPIC_MODEL;

    if (!apiKey || apiKey.trim() === "") {
      throw new ConfigurationError(
        "ANTHROPIC_API_KEY is required for AnthropicLLMProvider. Please configure ANTHROPIC_API_KEY."
      );
    }

    if (!model || model.trim() === "") {
      throw new ConfigurationError(
        "ANTHROPIC_MODEL is required for AnthropicLLMProvider. Please configure ANTHROPIC_MODEL."
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
      `AnthropicLLMProvider stub initialized for model ${this.modelIdentifier}. Live calls require full client initialization.`
    );
  }
}
