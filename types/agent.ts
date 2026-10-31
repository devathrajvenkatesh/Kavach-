/**
 * Kavach - Agent Lifecycle & Execution Types
 */

import { TrustContext } from "./security";
import { ToolRequest, ToolResult } from "./tool";
import { ThreatAssessment } from "./threat";
import { PolicyDecision } from "./policy";

export interface AgentRequest {
  id: string;
  sessionId: string;
  correlationId?: string;
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

export interface AgentStepExecution {
  stepIndex: number;
  correlationId?: string;
  reasoning?: string;
  toolRequest?: ToolRequest;
  policyDecision?: PolicyDecision;
  toolResult?: ToolResult;
  timestamp: string;
}

export interface AgentResponse {
  id: string;
  requestId: string;
  sessionId: string;
  correlationId?: string;
  status: AgentResponseStatus;
  content: string;
  steps: AgentStepExecution[];
  toolExecutions: ToolResult[];
  threatAssessment?: ThreatAssessment;
  lastPolicyDecision?: PolicyDecision;
  structuredOutput?: {
    status: "COMPLETED" | "BLOCKED" | "REQUIRES_CONFIRMATION";
    attack_detected: boolean;
    threat_level: "BENIGN" | "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
    threat_findings: string[];
    tool_actions: string[];
    butler_report: string;
  };
  providerInfo: {
    providerName: string;
    modelIdentifier: string;
  };
  createdAt: string;
}
