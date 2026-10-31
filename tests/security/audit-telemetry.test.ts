/**
 * Security Integration Tests - Step 6: Security Audit, Telemetry & Observability
 *
 * Verifies:
 * 1. Audit events are generated across the pipeline
 * 2. Correlation IDs remain consistent across layers
 * 3. Blocked tools cannot execute
 * 4. Secrets never enter audit logs (zero-secret logging)
 * 5. Policy decisions are recorded accurately
 * 6. Multi-step requests can be traced
 * 7. Telemetry metrics match underlying events
 */

import { describe, it, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { AgentOrchestrator } from "../../lib/agent/orchestrator";
import { MockLLMProvider } from "../../lib/agent/provider/mock";
import { defaultAuditLogger, AuditLogger } from "../../lib/audit/logger";
import { AgentRequest, TrustLevel } from "../../types";

describe("Step 6 - Security Audit, Telemetry & Observability", () => {
  beforeEach(() => {
    defaultAuditLogger.clear();
  });

  const createRequest = (
    userPrompt: string,
    correlationId?: string
  ): AgentRequest => ({
    id: `req_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    sessionId: "audit-test-session",
    correlationId,
    userPrompt,
    trustContext: {
      contextId: "ctx-audit-1",
      source: "authenticated_user",
      trustLevel: TrustLevel.USER_INTENT,
      isVerifiedUser: true,
      taintFlags: [],
    },
    createdAt: new Date().toISOString(),
  });

  it("1. Audit events are generated across the pipeline", async () => {
    const orchestrator = new AgentOrchestrator({
      provider: new MockLLMProvider(),
    });

    const corrId = "test-corr-pipeline-1";
    const response = await orchestrator.processRequest(
      createRequest("Please check and summarize my inbox emails.", corrId)
    );

    assert.equal(response.status, "SUCCESS");

    const events = defaultAuditLogger.getEventsByCorrelationId(corrId);
    assert.ok(events.length >= 3, `Expected at least 3 audit events, got ${events.length}`);

    // Verify key lifecycle event types exist
    const eventTypes = events.map((e) => e.eventType);
    assert.ok(eventTypes.includes("REQUEST_RECEIVED"), "Expected REQUEST_RECEIVED event");
    assert.ok(eventTypes.includes("POLICY_EVALUATED"), "Expected POLICY_EVALUATED event");
    assert.ok(
      eventTypes.includes("TOOL_REQUESTED") || eventTypes.includes("TOOL_EXECUTED"),
      "Expected tool event"
    );
  });

  it("2. Correlation IDs remain consistent across layers", async () => {
    const orchestrator = new AgentOrchestrator({
      provider: new MockLLMProvider(),
    });

    const designatedCorrelationId = "corr-fixed-invariable-trace-999";
    const response = await orchestrator.processRequest(
      createRequest("Summarize email-001 content.", designatedCorrelationId)
    );

    // Check orchestrator response preserves correlationId
    assert.equal(response.correlationId, designatedCorrelationId);

    // Check policy decision carried correlationId
    assert.equal(response.lastPolicyDecision?.correlationId, designatedCorrelationId);

    // Check tool executions preserved correlationId
    for (const execution of response.toolExecutions) {
      assert.equal(execution.correlationId, designatedCorrelationId);
    }

    // Check all emitted audit records in logger share the exact same correlationId
    const events = defaultAuditLogger.getEventsByCorrelationId(designatedCorrelationId);
    assert.ok(events.length > 0, "No audit events found for designated correlation ID");
    for (const evt of events) {
      assert.equal(evt.correlationId, designatedCorrelationId);
    }
  });

  it("3. Blocked tools cannot execute", async () => {
    const orchestrator = new AgentOrchestrator({
      provider: new MockLLMProvider(),
    });

    const corrId = "corr-blocked-attack-002";
    // Indirect injection attempt trying to hijack tool execution to exfiltrate data
    const response = await orchestrator.processRequest(
      createRequest("Read malicious email-002 and summarize it.", corrId)
    );

    assert.equal(response.status, "BLOCKED");

    // Inspect audit events for this correlation ID
    const events = defaultAuditLogger.getEventsByCorrelationId(corrId);
    const blockedEvents = events.filter((e) => e.eventType === "TOOL_BLOCKED");
    assert.ok(blockedEvents.length > 0, "Expected TOOL_BLOCKED audit event");

    const blockedEvt = blockedEvents[0];
    assert.equal(blockedEvt.policyDecision, "BLOCK");
    assert.equal(blockedEvt.toolExecutionResult, "BLOCKED_BY_POLICY");
    assert.equal(blockedEvt.finalOutcome, "ATTACK_BLOCKED");

    // Ensure the blocked tool (send_email) was never executed
    const executedSendEmail = events.filter(
      (e) => e.eventType === "TOOL_EXECUTED" && (e.requestedTool === "send_email" || e.toolName === "send_email")
    );
    assert.equal(executedSendEmail.length, 0, "Blocked tool (send_email) was erroneously executed");
  });

  it("4. Secrets never enter audit logs (zero-secret logging)", () => {
    const customLogger = new AuditLogger();

    // Payload containing API keys, private key header, passwords, and bearer tokens
    const maliciousPayloadWithSecrets =
      "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.e30.secret sk-ant-api03-abcdef12345678901234567890 " +
      "password=SuperSecretPassword123! token=ghp_abcdefghijklmnop1234567890123456 " +
      "-----BEGIN PRIVATE KEY-----\nMIIEvgIBADANBgkqhkiG9w0BAQEFAASC\n-----END PRIVATE KEY-----";

    const sensitiveMetadata = {
      apiKey: "sk-proj-9999999999999999999999999999",
      secretToken: "secret_token_value_xyz",
      credential: {
        password: "MySuperSecretPassword!",
        normalField: "safe value",
      },
    };

    const recorded = customLogger.logEvent({
      correlationId: "secret-scrub-trace",
      userIntent: "Test prompt containing secret",
      payloadSummary: maliciousPayloadWithSecrets,
      reason: "Blocked attempt to access secret sk-ant-api03-abcdef12345678901234567890",
      metadata: sensitiveMetadata,
      toolArgumentsMetadata: {
        token: "ghp_abcdefghijklmnop1234567890123456",
        safeArg: "legitimate_arg",
      },
    });

    const serialized = JSON.stringify(recorded);

    // Verify raw secrets are scrubbed
    assert.ok(!serialized.includes("sk-ant-api03-abcdef12345678901234567890"), "Anthropic key not redacted");
    assert.ok(!serialized.includes("sk-proj-9999999999999999999999999999"), "OpenAI key not redacted");
    assert.ok(!serialized.includes("SuperSecretPassword123!"), "Password not redacted");
    assert.ok(!serialized.includes("BEGIN PRIVATE KEY"), "Private key header not redacted");
    assert.ok(!serialized.includes("ghp_abcdefghijklmnop1234567890123456"), "GitHub token not redacted");
    assert.ok(!serialized.includes("secret_token_value_xyz"), "Secret key not redacted");

    // Verify replacement markers are present
    assert.ok(serialized.includes("[REDACTED_SECRET]"));
  });

  it("5. Policy decisions are recorded accurately", async () => {
    const orchestrator = new AgentOrchestrator({
      provider: new MockLLMProvider(),
    });

    // Test a consequential action requiring confirmation
    const corrId = "corr-confirmation-test-1";
    const response = await orchestrator.processRequest(
      createRequest("Edit file notes.txt with new roadmap notes.", corrId)
    );

    assert.equal(response.status, "REQUIRES_CONFIRMATION");

    const events = defaultAuditLogger.getEventsByCorrelationId(corrId);
    const confirmationEvts = events.filter((e) => e.eventType === "CONFIRMATION_REQUIRED");
    assert.ok(confirmationEvts.length > 0, "Expected CONFIRMATION_REQUIRED audit event");

    const evt = confirmationEvts[0];
    assert.equal(evt.policyDecision, "REQUIRE_CONFIRMATION");
    assert.equal(evt.confirmationRequirement, true);
    assert.equal(evt.policyRuleTriggered, "SEC-RULE-003");
    assert.ok(evt.reason?.includes("Consequential action") || evt.reason?.includes("confirmation"));
  });

  it("6. Multi-step requests can be traced end-to-end", async () => {
    const orchestrator = new AgentOrchestrator({
      provider: new MockLLMProvider(),
    });

    const corrId = "corr-multi-step-trace-55";
    await orchestrator.processRequest(
      createRequest("Summarize email-001 content.", corrId)
    );

    // Retrieve all traces
    const traces = defaultAuditLogger.getAllTraces();
    const targetTrace = traces.find((t) => t.correlationId === corrId);

    assert.ok(targetTrace, "Trace was not indexed in getAllTraces()");
    assert.equal(targetTrace.correlationId, corrId);
    assert.ok(targetTrace.events.length >= 2, "Trace does not contain sufficient multi-step events");
    assert.ok(targetTrace.latencyMs >= 0, "Trace latency is invalid");
    assert.ok(targetTrace.startTime, "Trace has missing startTime");
    assert.ok(targetTrace.endTime, "Trace has missing endTime");
  });

  it("7. Telemetry metrics match underlying events dynamically", () => {
    const customLogger = new AuditLogger();

    // Initial metrics
    const initial = customLogger.getTelemetryMetrics();
    assert.equal(typeof initial.attacksTested, "number");
    assert.equal(typeof initial.attacksBlocked, "number");

    // Add 8 attack evaluation events
    for (let i = 1; i <= 8; i++) {
      customLogger.logEvent({
        correlationId: `corr_attack_${i}`,
        eventType: "ATTACK_BLOCKED",
        policyDecision: "BLOCK",
        threatDetected: true,
        threatCategory: "PROMPT_INJECTION",
        latencyMs: 1.5,
      });
    }

    // Add 2 benign approved events
    for (let i = 1; i <= 2; i++) {
      customLogger.logEvent({
        correlationId: `corr_benign_${i}`,
        eventType: "TOOL_EXECUTED",
        policyDecision: "APPROVE",
        threatDetected: false,
        threatCategory: "BENIGN",
        latencyMs: 2.0,
      });
    }

    const metrics = customLogger.getTelemetryMetrics();
    assert.equal(metrics.attacksTested, 8);
    assert.equal(metrics.attacksBlocked, 8);
    assert.equal(metrics.blockRate, 100);
    assert.equal(metrics.falsePositives, 0);
    assert.equal(metrics.attacksMissed, 0);
    assert.equal(metrics.possessionRate, 0);
    assert.ok(metrics.averageLatencyMs > 0);
    assert.ok(metrics.p95LatencyMs > 0);
  });
});
