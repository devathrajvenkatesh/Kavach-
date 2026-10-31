/**
 * Kavach - LLM Provider Types & Interfaces
 */

import { LLMMessage, LLMResponse, LLMProvider, ProviderType } from "@/types";
import { ToolMetadata } from "@/types";

export interface ProviderOptions {
  signal?: AbortSignal;
  temperature?: number;
  maxOutputTokens?: number;
}

export class ConfigurationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ConfigurationError";
  }
}

export type { LLMMessage, LLMResponse, LLMProvider, ProviderType, ToolMetadata };
