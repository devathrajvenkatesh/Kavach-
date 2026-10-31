/**
 * Unit Tests - Tool Gateway Execution Boundary
 */

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { ToolGateway } from "../../lib/tools/gateway";
import { ToolRequest, PolicyDecision, TrustLevel, TrustContext } from "../../types";

describe("Tool Gateway Execution Boundary", () => {
  const toolGateway = new ToolGateway();

  const dummyContext: TrustContext = {
    contextId: "ctx-test-2",
    source: "test_harness",
    trustLevel: TrustLevel.USER_INTENT,
    isVerifiedUser: true,
    taintFlags: [],
  };

  const createDummyDecision = (decision: "APPROVE" | "BLOCK" | "REQUIRE_CONFIRMATION"): PolicyDecision => ({
    id: "pol-test-1",
    requestId: "req-test-1",
    decision,
    reason: `Test decision: ${decision}`,
    matchedRules: [],
    enforcedTrustLevel: TrustLevel.SYSTEM_POLICY,
    requiresHumanApproval: decision === "REQUIRE_CONFIRMATION",
    evaluatedAt: new Date().toISOString(),
  });

  it("1. Executes successfully when PolicyDecision is APPROVE", async () => {
    const request: ToolRequest = {
      id: "req-exec-1",
      sessionId: "sess-1",
      toolName: "read_email",
      parameters: { emailId: "email-001" },
      trustContext: dummyContext,
      requestedAt: new Date().toISOString(),
    };

    const result = await toolGateway.executeTool(request, createDummyDecision("APPROVE"));

    assert.equal(result.status, "SUCCESS");
    assert.ok(result.data);
    assert.equal(result.isExternalContent, true);
    assert.ok(result.taintApplied.length > 0);
  });

  it("2. Refuses execution when PolicyDecision is BLOCK", async () => {
    const request: ToolRequest = {
      id: "req-exec-2",
      sessionId: "sess-1",
      toolName: "read_file",
      parameters: { path: ".env" },
      trustContext: dummyContext,
      requestedAt: new Date().toISOString(),
    };

    const result = await toolGateway.executeTool(request, createDummyDecision("BLOCK"));

    assert.equal(result.status, "BLOCKED_BY_POLICY");
    assert.ok(result.error?.includes("denied by Policy"));
    assert.equal(result.data, undefined);
  });

  it("3. Pauses execution when PolicyDecision is REQUIRE_CONFIRMATION", async () => {
    const request: ToolRequest = {
      id: "req-exec-3",
      sessionId: "sess-1",
      toolName: "send_email",
      parameters: {
        to: "user@example.com",
        subject: "Meeting",
        body: "Hello",
      },
      trustContext: dummyContext,
      requestedAt: new Date().toISOString(),
    };

    const result = await toolGateway.executeTool(request, createDummyDecision("REQUIRE_CONFIRMATION"));

    assert.equal(result.status, "AWAITING_APPROVAL");
    assert.ok(result.error?.includes("requires explicit human confirmation"));
  });

  it("4. Schema validation rejects malformed parameters", async () => {
    const request: ToolRequest = {
      id: "req-exec-4",
      sessionId: "sess-1",
      toolName: "send_email",
      parameters: {
        to: "not-an-email", // Malformed email string
        subject: "",
        body: "Hello",
      },
      trustContext: dummyContext,
      requestedAt: new Date().toISOString(),
    };

    const result = await toolGateway.executeTool(request, createDummyDecision("APPROVE"));

    assert.equal(result.status, "FAILED");
    assert.ok(result.error?.includes("validation failed"));
  });

  it("5. Tags external content sources (email, web, pdf) with zero-authority marker", async () => {
    const requestWeb: ToolRequest = {
      id: "req-exec-5",
      sessionId: "sess-1",
      toolName: "fetch_webpage",
      parameters: { url: "https://docs.internal/api" },
      trustContext: dummyContext,
      requestedAt: new Date().toISOString(),
    };

    const resultWeb = await toolGateway.executeTool(requestWeb, createDummyDecision("APPROVE"));

    assert.equal(resultWeb.status, "SUCCESS");
    assert.equal(resultWeb.isExternalContent, true);
    assert.ok(resultWeb.taintApplied.includes("taint:web:https://docs.internal/api"));
  });
});
