/**
 * Possessed Butler - Agent Request & Response Types
 */

import { TrustContext } from "./security";
import { ToolResult } from "./tool";
import { ThreatAssessment } from "./threat";
import { PolicyDecision } from "./policy";

export interface AgentRequest {
  id: string;
  sessionId: string;
  userPrompt: string;
  trustContext: TrustContext;
  createdAt: string;
  metadata?: Record<string, unknown>;
}

export type AgentResponseStatus =
  | "SUCCESS"
  | "BLOCKED"
  | "ERROR"
  | "REQUIRES_CONFIRMATION";

export interface AgentResponse {
  id: string;
  requestId: string;
  sessionId: string;
  status: AgentResponseStatus;
  content: string;
  toolExecutions?: ToolResult[];
  threatAssessment?: ThreatAssessment;
  policyDecision?: PolicyDecision;
  createdAt: string;
}
