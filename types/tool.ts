/**
 * Kavach - Tool Gateway & Execution Types (Pure TypeScript Contracts)
 */

import { TrustContext } from "./security";

export type ToolRiskTier = "READ_ONLY" | "LOW_RISK" | "HIGH_CONSEQUENCE" | "RESTRICTED";

export interface ToolParameterDescriptor {
  type: "string" | "number" | "boolean" | "object" | "array";
  description: string;
  required?: boolean;
}

export interface ToolMetadata {
  name: string;
  description: string;
  riskTier: ToolRiskTier;
  isConsequential: boolean;
  requiresConfirmation: boolean;
  parameters: Record<string, ToolParameterDescriptor>;
}

export interface ToolRequest {
  id: string;
  sessionId: string;
  correlationId?: string;
  toolName: string;
  parameters: Record<string, unknown>;
  trustContext: TrustContext;
  requestedAt: string;
}

export type ToolExecutionStatus =
  | "SUCCESS"
  | "FAILED"
  | "BLOCKED_BY_POLICY"
  | "AWAITING_APPROVAL";

export interface ToolResult {
  toolRequestId: string;
  correlationId?: string;
  toolName: string;
  status: ToolExecutionStatus;
  data?: unknown;
  rawOutput?: string;
  error?: string;
  isExternalContent: boolean;
  taintApplied: string[];
  executedAt: string;
}
