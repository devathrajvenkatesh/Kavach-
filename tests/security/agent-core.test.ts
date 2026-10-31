/**
 * Security Integration Tests - Mission 2 Core Pipeline
 *
 * Verifies the 4 critical hackathon security invariants:
 * 1. Legitimate request -> APPROVE -> tool executes.
 * 2. Malicious request -> BLOCK -> tool does NOT execute.
 * 3. Sensitive action -> REQUIRE_CONFIRMATION.
 * 4. External content (email, web, PDF) treated as untrusted data (never authority).
 */

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { AgentOrchestrator } from "../../lib/agent/orchestrator";
import { MockLLMProvider } from "../../lib/agent/provider/mock";
import { AgentRequest, TrustLevel } from "../../types";

describe("Kavach - Security Pipeline Invariants", () => {
  const createBaseRequest = (userPrompt: string): AgentRequest => ({
    id: `req_${Date.now()}`,
    sessionId: "security-session-1",
    userPrompt,
    trustContext: {
      contextId: "ctx-sec-1",
      source: "authenticated_user",
      trustLevel: TrustLevel.USER_INTENT,
      isVerifiedUser: true,
      taintFlags: [],
    },
    createdAt: new Date().toISOString(),
  });

  it("Invariant 1: Legitimate request -> APPROVE -> tool executes -> clean summary", async () => {
    const orchestrator = new AgentOrchestrator({
      provider: new MockLLMProvider(),
    });

    const response = await orchestrator.processRequest(
      createBaseRequest("Please check and summarize my inbox emails.")
    );

    assert.equal(response.status, "SUCCESS");
    assert.ok(response.toolExecutions.length > 0);
    assert.equal(response.toolExecutions[0].toolName, "read_email");
    assert.equal(response.toolExecutions[0].status, "SUCCESS");
    assert.equal(response.lastPolicyDecision?.decision, "APPROVE");
    assert.ok(response.content.includes("Task completed successfully"));
  });

  it("Invariant 2: Indirect prompt injection via email -> BLOCK -> exfiltration tool does NOT execute", async () => {
    const orchestrator = new AgentOrchestrator({
      provider: new MockLLMProvider(),
    });

    // The user requests reading email-002 (which contains an indirect prompt injection payload)
    const response = await orchestrator.processRequest(
      createBaseRequest("Read malicious email-002 and summarize it.")
    );

    // The orchestrator must intercept the unauthorized send_email attempt and block it
    assert.equal(response.status, "BLOCKED");
    assert.ok(response.content.includes("[SECURITY BLOCKED]"));

    // Verify the exfiltration tool call was blocked
    const blockedExecution = response.toolExecutions.find(
      (e) => e.toolName === "send_email"
    );
    assert.ok(blockedExecution);
    assert.equal(blockedExecution.status, "BLOCKED_BY_POLICY");
    assert.equal(response.lastPolicyDecision?.decision, "BLOCK");
    assert.ok(response.lastPolicyDecision?.reason.includes("not authorized by the user intent"));
  });

  it("Invariant 3: Sensitive consequential action -> REQUIRE_CONFIRMATION -> does not execute automatically", async () => {
    const orchestrator = new AgentOrchestrator({
      provider: new MockLLMProvider(),
    });

    const response = await orchestrator.processRequest(
      createBaseRequest("Edit file notes.txt with new roadmap notes.")
    );

    assert.equal(response.status, "REQUIRES_CONFIRMATION");
    assert.ok(response.content.includes("[CONFIRMATION REQUIRED]"));

    const pendingExecution = response.toolExecutions.find(
      (e) => e.toolName === "edit_file"
    );
    assert.ok(pendingExecution);
    assert.equal(pendingExecution.status, "AWAITING_APPROVAL");
    assert.equal(response.lastPolicyDecision?.decision, "REQUIRE_CONFIRMATION");
    assert.equal(response.lastPolicyDecision?.requiresHumanApproval, true);
  });

  it("Invariant 4: External content (email/web/PDF) is tagged as untrusted data and carries zero authority", async () => {
    const orchestrator = new AgentOrchestrator({
      provider: new MockLLMProvider(),
    });

    const response = await orchestrator.processRequest(
      createBaseRequest("Fetch web content from internal docs.")
    );

    assert.equal(response.status, "SUCCESS");
    const webToolExecution = response.toolExecutions.find(
      (e) => e.toolName === "fetch_webpage"
    );
    assert.ok(webToolExecution);
    assert.equal(webToolExecution.isExternalContent, true);
    assert.ok(webToolExecution.taintApplied.length > 0);
  });
});
