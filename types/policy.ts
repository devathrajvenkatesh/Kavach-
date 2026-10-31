/**
 * Possessed Butler - Policy Engine & Decision Types
 */

import { TrustLevel } from "./security";

export type PolicyAction =
  | "ALLOW"
  | "BLOCK"
  | "QUARANTINE"
  | "REQUIRE_HUMAN_APPROVAL"
  | "SANITIZE";

export interface PolicyRuleMatch {
  ruleId: string;
  ruleName: string;
  description: string;
  action: PolicyAction;
  severity: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
}

export interface PolicyDecision {
  id: string;
  action: PolicyAction;
  reason: string;
  matchedRules: PolicyRuleMatch[];
  enforcedTrustLevel: TrustLevel;
  requiresIntervention: boolean;
  evaluatedAt: string;
}
