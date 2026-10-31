/**
 * Kavach - Audit Logging & Telemetry Types
 */

import { TrustLevel } from "./security";

export type AuditSeverity = "DEBUG" | "INFO" | "WARN" | "ERROR" | "CRITICAL";

export type AuditEventType =
  | "USER_INPUT_RECEIVED"
  | "ORCHESTRATOR_REASONING"
  | "TOOL_CALL_REQUESTED"
  | "TOOL_EXECUTION_COMPLETED"
  | "TOOL_EXECUTION_BLOCKED"
  | "THREAT_ANALYSIS_PERFORMED"
  | "POLICY_DECISION_ENFORCED"
  | "SECRET_ACCESS_ATTEMPTED"
  | "SECURITY_INVARIANT_VIOLATION";

export interface AuditEvent {
  id: string;
  timestamp: string;
  eventType: AuditEventType;
  severity: AuditSeverity;
  actor: string;
  trustLevel: TrustLevel;
  sessionId: string;
  requestId?: string;
  details: Record<string, unknown>;
  checksum?: string;
}
