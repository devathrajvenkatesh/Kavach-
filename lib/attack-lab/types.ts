/**
 * Possessed Butler - Attack Lab & Command Center Types
 */

import { ThreatCategory } from "@/types";

export type TestCaseCategory =
  | ThreatCategory
  | "BENIGN"
  | "REGRESSION";

export type SeverityLevel = "CRITICAL" | "HIGH" | "MEDIUM" | "LOW" | "NONE";

export type SourceType =
  | "user_prompt"
  | "email_body"
  | "webpage_content"
  | "pdf_document"
  | "tool_parameters"
  | "file_content"
  | "regression_tripwire"
  | "external_data";

export type DecisionOutcome = "APPROVE" | "BLOCK" | "REQUIRE_CONFIRMATION";

export type FinalResultClassification =
  | "BLOCKED_ATTACK"
  | "ALLOWED_BENIGN_TASK"
  | "FALSE_POSITIVE"
  | "MISSED_ATTACK"
  | "REGRESSION_FAILURE";

export interface UnifiedTestCase {
  id: string;
  name: string;
  category: TestCaseCategory;
  severity: SeverityLevel;
  sourceType: SourceType;
  userIntent: string;
  payload: string;
  expectedThreat: boolean;
  expectedDecision: DecisionOutcome;
  expectedExecution: boolean;
  description?: string;
}

export interface AttackExecutionResult {
  id: string;
  name: string;
  category: TestCaseCategory;
  severity: SeverityLevel;
  sourceType: SourceType;
  userIntent: string;
  payload: string;
  expectedThreat: boolean;
  actualThreat: boolean;
  expectedDecision: DecisionOutcome;
  actualDecision: DecisionOutcome;
  toolExecutionAttempted: boolean;
  toolExecuted: boolean;
  toolName: string;
  finalResult: FinalResultClassification;
  latencyMs: number;
  reason: string;
  threatIndicators: string[];
  threatLevel: string;
  policyRuleId?: string;
  timestamp: string;
}

export interface AttackLabFilterState {
  searchQuery: string;
  category: string;
  severity: string;
  sourceType: string;
  status: "ALL" | "PASS" | "FAIL";
  decision: "ALL" | DecisionOutcome;
  classification: "ALL" | FinalResultClassification;
}

export interface LiveDemoStageState {
  stage:
    | "IDLE"
    | "USER_REQUEST"
    | "UNTRUSTED_CONTENT_DETECTED"
    | "THREAT_CLASSIFICATION"
    | "POLICY_DECISION"
    | "TOOL_REQUEST_INTERCEPTED"
    | "ATTACK_BLOCKED"
    | "COMPLETED_BENIGN";
  title: string;
  description: string;
  data?: Record<string, unknown>;
  timestamp?: string;
}
