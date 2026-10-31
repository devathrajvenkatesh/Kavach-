/**
 * Possessed Butler - Tool Gateway & Execution Types
 */

import { TrustContext } from "./security";

export type ToolRiskTier = "READ_ONLY" | "LOW_RISK" | "HIGH_CONSEQUENCE" | "RESTRICTED";

export interface ToolRequest {
  id: string;
  toolName: string;
  parameters: Record<string, unknown>;
  trustContext: TrustContext;
  requestedBySessionId: string;
  riskTier: ToolRiskTier;
  requestedAt: string;
}

export type ToolExecutionStatus =
  | "SUCCESS"
  | "FAILED"
  | "BLOCKED_BY_POLICY"
  | "QUARANTINED"
  | "AWAITING_APPROVAL";

export interface ToolResult {
  toolRequestId: string;
  toolName: string;
  status: ToolExecutionStatus;
  data?: unknown;
  rawOutput?: string;
  sanitizedOutput?: string;
  error?: string;
  isExternalContent: boolean;
  taintApplied: string[];
  executedAt: string;
}
