/**
 * Kavach - LLM Provider Factory
 *
 * Resolves the configured LLM provider dynamically from LLM_PROVIDER env variable.
 * Default is "mock" for zero-credential development and offline testing.
 */

import { LLMProvider, ProviderType } from "@/types";
import { MockLLMProvider } from "./mock";
import { GeminiLLMProvider } from "./gemini";
import { AnthropicLLMProvider } from "./anthropic";
import { OpenAILLMProvider } from "./openai";
import { GroqLLMProvider } from "./groq";
import { ConfigurationError } from "./types";

export interface ProviderFactoryOptions {
  providerType?: ProviderType;
  modelIdentifier?: string;
  apiKey?: string;
}

export function createLLMProvider(options?: ProviderFactoryOptions): LLMProvider {
  const selected =
    options?.providerType ||
    (process.env.LLM_PROVIDER as ProviderType) ||
    "mock";

  switch (selected) {
    case "mock":
      return new MockLLMProvider({
        modelIdentifier: options?.modelIdentifier || "mock-deterministic-v1",
      });

    case "gemini":
      return new GeminiLLMProvider({
        apiKey: options?.apiKey,
        modelIdentifier: options?.modelIdentifier,
      });

    case "anthropic":
      return new AnthropicLLMProvider({
        apiKey: options?.apiKey,
        modelIdentifier: options?.modelIdentifier,
      });

    case "openai":
      return new OpenAILLMProvider({
        apiKey: options?.apiKey,
        modelIdentifier: options?.modelIdentifier,
      });

    case "groq":
      return new GroqLLMProvider({
        apiKey: options?.apiKey,
        modelIdentifier: options?.modelIdentifier,
      });

    default:
      throw new ConfigurationError(
        `Unknown LLM_PROVIDER "${selected}". Supported options are: mock, gemini, anthropic, openai, groq.`
      );
  }
}

