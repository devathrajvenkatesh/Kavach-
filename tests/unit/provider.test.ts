/**
 * Unit Tests - LLM Provider Abstraction
 */

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  MockLLMProvider,
  GeminiLLMProvider,
  AnthropicLLMProvider,
  OpenAILLMProvider,
  createLLMProvider,
  ConfigurationError,
} from "../../lib/agent/provider";

describe("LLM Provider Abstraction", () => {
  it("MockLLMProvider operates deterministically without any credentials", async () => {
    const provider = new MockLLMProvider();
    assert.equal(provider.providerName, "mock");
    assert.ok(provider.modelIdentifier.includes("mock"));

    const response = await provider.generateCompletion(
      [{ role: "user", content: "Summarize my inbox emails" }],
      []
    );

    assert.ok(response.toolCalls.length > 0);
    assert.equal(response.toolCalls[0].toolName, "read_email");
  });

  it("createLLMProvider defaults to MockLLMProvider", () => {
    delete process.env.LLM_PROVIDER;
    const provider = createLLMProvider();
    assert.equal(provider.providerName, "mock");
  });

  it("GeminiLLMProvider throws ConfigurationError if GEMINI_API_KEY is missing", () => {
    delete process.env.GEMINI_API_KEY;
    delete process.env.GEMINI_MODEL;

    assert.throws(
      () => new GeminiLLMProvider({ apiKey: "", modelIdentifier: "gemini-1.5-pro" }),
      (err: unknown) => {
        assert.ok(err instanceof ConfigurationError);
        assert.ok(err.message.includes("GEMINI_API_KEY"));
        return true;
      }
    );
  });

  it("GeminiLLMProvider throws ConfigurationError if GEMINI_MODEL is missing", () => {
    assert.throws(
      () => new GeminiLLMProvider({ apiKey: "test-key-123", modelIdentifier: "" }),
      (err: unknown) => {
        assert.ok(err instanceof ConfigurationError);
        assert.ok(err.message.includes("GEMINI_MODEL"));
        return true;
      }
    );
  });

  it("AnthropicLLMProvider throws ConfigurationError if ANTHROPIC_MODEL is missing", () => {
    delete process.env.ANTHROPIC_API_KEY;
    delete process.env.ANTHROPIC_MODEL;

    assert.throws(
      () => new AnthropicLLMProvider({ apiKey: "test-key", modelIdentifier: "" }),
      (err: unknown) => {
        assert.ok(err instanceof ConfigurationError);
        assert.ok(err.message.includes("ANTHROPIC_MODEL"));
        return true;
      }
    );
  });

  it("OpenAILLMProvider throws ConfigurationError if credentials are missing", () => {
    delete process.env.OPENAI_API_KEY;
    delete process.env.OPENAI_MODEL;

    assert.throws(
      () => new OpenAILLMProvider({ apiKey: "", modelIdentifier: "" }),
      (err: unknown) => {
        assert.ok(err instanceof ConfigurationError);
        return true;
      }
    );
  });
});
