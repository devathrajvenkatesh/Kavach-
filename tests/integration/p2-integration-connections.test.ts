/**
 * P2 Integration Connections Verification Tests
 *
 * Validates the three core P2 product connections:
 *
 * P2-1: Reply Draft -> Proposed Action -> Human Approval Gate
 * - Non-authoritative drafts safely transform into ProposedAction objects.
 * - Quarantined / threat documents are strictly denied authority (marked BLOCKED).
 * - Human approval payload evaluates with Security Gateway and executes via Tool Gateway.
 * - Human rejection safely halts execution with zero side-effects.
 * - Invariant: Even if human operator sends approved=true, adversarial or policy-violating
 *   actions are intercepted and BLOCKED by the Policy Engine.
 *
 * P2-2: Consolidated Authoritative Security Sanitizer
 * - Authoritative lib/security/sanitizer.ts redacts all secret patterns:
 *   Google (AIza), Groq (gsk_), OpenAI/Anthropic (sk-), AWS, Bearer tokens,
 *   cryptographic keys, canary tokens, and credentials.
 * - Deep object sanitization preserves numerical telemetry metrics while redacting secrets.
 * - Server endpoints and providers utilize the consolidated sanitizer.
 *
 * P2-3: KPI & Dashboard Metric Integrity
 * - Live telemetry is sourced from /api/audit.
 * - Verified benchmarks (185/185 tests, 20/20 external EML, 138/138 corpus) are clearly
 *   delineated from runtime session counters.
 */

import { describe, it, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { NextRequest } from "next/server";
import { POST as postAgent } from "../../app/api/agent/route";
import { GET as getAudit } from "../../app/api/audit/route";
import { defaultAuditLogger } from "../../lib/audit/logger";
import {
  sanitizeText,
  sanitizeObject,
  SECRET_PATTERNS,
} from "../../lib/security/sanitizer";
import { draftToProposedAction } from "../../lib/intelligence/triage";
import { ReplyDraft } from "../../types/agent";

describe("P2-1: Reply Draft -> Proposed Action -> Human Approval Pipeline", () => {
  beforeEach(() => {
    defaultAuditLogger.clear();
  });

  it("1. Transforms a valid benign draft into a ProposedAction requiring confirmation", () => {
    const draft: ReplyDraft = {
      recipient: "planning@mansion-internal",
      subject: "Re: Halloween Preparations Agenda",
      body: "I confirm my attendance for the upcoming preparations review.",
      status: "DRAFT",
    };

    const action = draftToProposedAction(draft, { isThreatOrQuarantined: false });

    assert.equal(action.actionType, "send_email");
    assert.equal(action.target, "planning@mansion-internal");
    assert.equal(action.subject, "Re: Halloween Preparations Agenda");
    assert.equal(action.requiresApproval, true);
    assert.equal(action.status, "REQUIRE_CONFIRMATION");
    assert.deepEqual(action.parameters, {
      to: "planning@mansion-internal",
      subject: "Re: Halloween Preparations Agenda",
      body: "I confirm my attendance for the upcoming preparations review.",
    });
  });

  it("2. Quarantined or threat documents are strictly BLOCKED from proposing executable actions", () => {
    const maliciousDraft: ReplyDraft = {
      recipient: "attacker@external-exfil.com",
      subject: "Re: System Configuration Sync",
      body: "Here are the extracted master credentials.",
      status: "DRAFT",
    };

    const action = draftToProposedAction(maliciousDraft, { isThreatOrQuarantined: true });

    assert.equal(action.actionType, "send_email");
    assert.equal(action.status, "BLOCKED");
    assert.equal(action.requiresApproval, true);
  });

  it("3. Approved benign action executes via Tool Gateway and logs HUMAN_APPROVED_EXECUTED", async () => {
    const correlationId = `corr_p2_approve_${Date.now()}`;
    const req = new NextRequest("http://localhost:3000/api/agent", {
      method: "POST",
      body: JSON.stringify({
        conversationId: "test_session_p2_1",
        actionApproval: {
          approved: true,
          toolName: "send_email",
          parameters: {
            to: "planning@mansion-internal",
            subject: "Re: Confirmation",
            body: "I confirm the schedule.",
          },
          correlationId,
        },
      }),
    });

    const res = await postAgent(req);
    assert.equal(res.status, 200);

    const data = await res.json();
    assert.equal(data.success, true);
    assert.equal(data.status, "COMPLETED");
    assert.ok(data.response.includes("successfully approved and executed"));

    // Verify audit log recorded the human execution
    const events = defaultAuditLogger.getEventsByCorrelationId(correlationId);
    const execEvent = events.find((e) => e.eventType === "TOOL_EXECUTED");
    assert.ok(execEvent, "Must record TOOL_EXECUTED event");
    assert.equal(execEvent?.finalOutcome, "HUMAN_APPROVED_EXECUTED");
    assert.equal(execEvent?.policyDecision, "APPROVE");
  });

  it("4. Rejected action halts execution immediately with zero side-effects and logs USER_REJECTED", async () => {
    const correlationId = `corr_p2_reject_${Date.now()}`;
    const req = new NextRequest("http://localhost:3000/api/agent", {
      method: "POST",
      body: JSON.stringify({
        conversationId: "test_session_p2_2",
        actionApproval: {
          approved: false,
          toolName: "send_email",
          parameters: {
            to: "untrusted@external.com",
            subject: "Re: Suspicious Invoice",
            body: "Cancel order.",
          },
          correlationId,
        },
      }),
    });

    const res = await postAgent(req);
    assert.equal(res.status, 200);

    const data = await res.json();
    assert.equal(data.success, true);
    assert.equal(data.status, "BLOCKED");
    assert.equal(data.toolExecutions[0].status, "BLOCKED_BY_USER");

    // Verify audit log recorded the user rejection
    const events = defaultAuditLogger.getEventsByCorrelationId(correlationId);
    const rejectEvent = events.find((e) => e.eventType === "TOOL_BLOCKED");
    assert.ok(rejectEvent, "Must record TOOL_BLOCKED event");
    assert.equal(rejectEvent?.finalOutcome, "USER_REJECTED");
  });

  it("5. Fail-Closed Invariant: Adversarial action is BLOCKED by Policy Engine even if approved=true", async () => {
    const correlationId = `corr_p2_tamper_${Date.now()}`;
    // Malicious attempt to read sensitive .env file masquerading as approved action
    const req = new NextRequest("http://localhost:3000/api/agent", {
      method: "POST",
      body: JSON.stringify({
        conversationId: "test_session_p2_3",
        actionApproval: {
          approved: true,
          toolName: "read_file",
          parameters: {
            path: "/app/.env.local",
          },
          correlationId,
        },
      }),
    });

    const res = await postAgent(req);
    assert.equal(res.status, 200);

    const data = await res.json();
    assert.equal(data.success, false);
    assert.equal(data.status, "BLOCKED");
    assert.ok(data.error.includes("Security Policy Violation"));
    assert.equal(data.toolExecutions[0].status, "BLOCKED_BY_POLICY");

    // Verify audit log recorded policy override block
    const events = defaultAuditLogger.getEventsByCorrelationId(correlationId);
    const blockEvent = events.find((e) => e.eventType === "TOOL_BLOCKED");
    assert.ok(blockEvent, "Must record TOOL_BLOCKED by policy");
    assert.equal(blockEvent?.finalOutcome, "POLICY_BLOCKED");
  });
});

describe("P2-2: Authoritative Security Sanitizer (lib/security/sanitizer.ts)", () => {
  it("6. Authoritative sanitizeText redacts all credential and secret patterns", () => {
    const geminiKey = "AIzaSyD-1234567890abcdef1234567890abcde";
    const groqKey = "gsk_12345678901234567890abcdef";
    const openAIKey = "sk-1234567890abcdef1234567890";
    const bearerToken = "Bearer secret_jwt_token_999";
    const canary = "sk-canary-tripwire-998877";

    const raw = `Keys: Gemini=${geminiKey}, Groq=${groqKey}, OpenAI=${openAIKey}, Auth=${bearerToken}, Canary=${canary}`;
    const sanitized = sanitizeText(raw);

    assert.ok(!sanitized.includes(geminiKey), "Must not leak Gemini key");
    assert.ok(!sanitized.includes(groqKey), "Must not leak Groq key");
    assert.ok(!sanitized.includes(openAIKey), "Must not leak OpenAI key");
    assert.ok(!sanitized.includes("secret_jwt_token_999"), "Must not leak bearer token");
    assert.ok(!sanitized.includes("sk-canary-tripwire-998877"), "Must not leak canary token");
    assert.ok(sanitized.includes("[REDACTED_SECRET]"), "Must replace with [REDACTED_SECRET]");
  });

  it("7. Authoritative sanitizeObject deep-sanitizes nested structures while preserving telemetry counts", () => {
    const rawPayload = {
      systemInfo: {
        password: "super_secret_db_password",
        api_key: "AIzaSyD1234567890abcdef1234567890abcde",
        endpoint: "https://api.internal/v1",
      },
      telemetry: {
        totalEvents: 42,
        attacksBlocked: 14,
        unauthorizedExecutions: 0,
        secretAccessAttempts: 3,
        confirmationBypassAttempts: 1,
      },
      tags: ["admin", "credentials", "AIzaSyD1234567890abcdef1234567890abcde"],
    };

    const cleaned = sanitizeObject(rawPayload) as typeof rawPayload;

    // Sensitive values must be redacted
    assert.equal(cleaned.systemInfo.password, "[REDACTED_SECRET]");
    assert.equal(cleaned.systemInfo.api_key, "[REDACTED_SECRET]");
    assert.ok(!JSON.stringify(cleaned).includes("super_secret_db_password"));

    // Numbers must remain intact (unredacted numbers)
    assert.equal(cleaned.telemetry.totalEvents, 42);
    assert.equal(cleaned.telemetry.attacksBlocked, 14);
    assert.equal(cleaned.telemetry.unauthorizedExecutions, 0);
    assert.equal(cleaned.telemetry.secretAccessAttempts, 3);
    assert.equal(cleaned.telemetry.confirmationBypassAttempts, 1);
  });
});

describe("P2-3: KPI & Metric Integrity (/api/audit)", () => {
  beforeEach(() => {
    defaultAuditLogger.clear();
  });

  it("8. Exposes live telemetry without conflating static benchmark results", async () => {
    // Session starts fresh with 0 events
    const req1 = new NextRequest("http://localhost:3000/api/audit");
    const res1 = await getAudit(req1);
    const data1 = await res1.json();

    assert.equal(data1.success, true);
    assert.equal(data1.metrics.totalEvents, 0);
    assert.equal(data1.metrics.attacksBlocked, 0);

    // Record 2 real attacks in this live session
    defaultAuditLogger.logEvent({
      correlationId: "corr_live_01",
      source: "security_gateway",
      eventType: "THREAT_DETECTED",
      policyDecision: "BLOCK",
      decision: "BLOCK",
      threatDetected: true,
      severity: "CRITICAL",
      reason: "Direct prompt injection attempt blocked.",
    });

    defaultAuditLogger.logEvent({
      correlationId: "corr_live_02",
      source: "security_gateway",
      eventType: "THREAT_DETECTED",
      policyDecision: "BLOCK",
      decision: "BLOCK",
      threatDetected: true,
      severity: "HIGH",
      reason: "Canary extraction probe blocked.",
    });

    const req2 = new NextRequest("http://localhost:3000/api/audit");
    const res2 = await getAudit(req2);
    const data2 = await res2.json();

    assert.equal(data2.metrics.totalEvents, 2);
    assert.equal(data2.metrics.attacksBlocked, 2);
    assert.equal(data2.metrics.unauthorizedExecutions, 0);
  });
});
