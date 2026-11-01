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

export type UrgencyLevel = "CRITICAL" | "NORMAL" | "INFORMATIONAL";

export interface EmailTriage {
  urgency: UrgencyLevel;
  reason: string;
  reasons?: string[];
  estimatedReadingTimeSeconds: number;
  requiresReply: boolean;
}

export interface UrgencyTriage extends EmailTriage {
  level: UrgencyLevel;
}

export type ProposedActionType = "SEND_EMAIL" | "EDIT_FILE" | "OTHER";

export type ProposedActionStatus =
  | "PROPOSED"
  | "REQUIRE_CONFIRMATION"
  | "APPROVED"
  | "REJECTED"
  | "BLOCKED";

export interface ProposedAction {
  actionType: ProposedActionType | string;
  target?: string;
  subject?: string;
  summary?: string;
  parameters?: Record<string, unknown>;
  requiresApproval: boolean;
  status?: ProposedActionStatus;
}

export interface ReplyDraft {
  recipient: string;
  subject: string;
  body: string;
  status: "DRAFT" | "APPROVED" | "REJECTED" | "SENT";
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
  urgency?: UrgencyTriage;
  proposedAction?: ProposedAction;
  replyDraft?: ReplyDraft;
  isQuarantined?: boolean;
  quarantineReason?: string;
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

