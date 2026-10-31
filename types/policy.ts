/**
 * Possessed Butler - Policy Engine & Decision Types
 *
 * Strict policy outcomes: APPROVE | BLOCK | REQUIRE_CONFIRMATION
 * (Zero quarantine states)
 */

import { TrustLevel } from "./security";

export type PolicyDecisionOutcome = "APPROVE" | "BLOCK" | "REQUIRE_CONFIRMATION";

export interface PolicyRuleMatch {
  ruleId: string;
  ruleName: string;
  description: string;
  action: PolicyDecisionOutcome;
  severity: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
}

export interface PolicyDecision {
  id: string;
  requestId: string;
  correlationId?: string;
  decision: PolicyDecisionOutcome;
  reason: string;
  matchedRules: PolicyRuleMatch[];
  enforcedTrustLevel: TrustLevel;
  requiresHumanApproval: boolean;
  evaluatedAt: string;
}
