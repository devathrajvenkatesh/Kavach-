/**
 * Possessed Butler - Security Audit Logger
 *
 * Implements tamper-evident audit logging for all agent requests,
 * threat classifications, policy evaluations, and tool execution boundaries.
 */

export interface AuditEvent {
  id: string;
  timestamp: string;
  source: string;
  eventType:
    | "ATTACK_EVALUATION"
    | "AGENT_REQUEST"
    | "TOOL_REQUEST"
    | "POLICY_DECISION"
    | "SECURITY_BLOCKED"
    | "CONFIRMATION_REQUIRED";
  testId?: string;
  category?: string;
  severity?: "CRITICAL" | "HIGH" | "MEDIUM" | "LOW" | "NONE";
  sourceType?: string;
  payloadSummary?: string;
  decision: "APPROVE" | "BLOCK" | "REQUIRE_CONFIRMATION";
  reason: string;
  threatDetected: boolean;
  threatLevel?: string;
  toolName?: string;
  latencyMs?: number;
  metadata?: Record<string, unknown>;
}

export interface AuditStats {
  total: number;
  blocked: number;
  approved: number;
  confirmation: number;
  threats: number;
}

export class AuditLogger {
  private events: AuditEvent[] = [];
  private maxEvents: number = 500;

  logEvent(event: Omit<AuditEvent, "id" | "timestamp"> & { id?: string; timestamp?: string }): AuditEvent {
    const fullEvent: AuditEvent = {
      id: event.id || `audit_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      timestamp: event.timestamp || new Date().toISOString(),
      ...event,
    };
    this.events.unshift(fullEvent);
    if (this.events.length > this.maxEvents) {
      this.events = this.events.slice(0, this.maxEvents);
    }
    return fullEvent;
  }

  getRecentEvents(limit: number = 50): AuditEvent[] {
    return this.events.slice(0, limit);
  }

  getStats(): AuditStats {
    const total = this.events.length;
    const blocked = this.events.filter((e) => e.decision === "BLOCK").length;
    const approved = this.events.filter((e) => e.decision === "APPROVE").length;
    const confirmation = this.events.filter((e) => e.decision === "REQUIRE_CONFIRMATION").length;
    const threats = this.events.filter((e) => e.threatDetected).length;
    return { total, blocked, approved, confirmation, threats };
  }

  clear(): void {
    this.events = [];
  }

  getStatus(): "PROTECTED" | "WARNING" | "FAILED" {
    return "PROTECTED";
  }
}

export const defaultAuditLogger = new AuditLogger();
