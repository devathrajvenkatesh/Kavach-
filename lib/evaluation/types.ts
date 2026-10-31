/**
 * Kavach - Evaluation & Benchmarking Types
 */

import { ThreatCategory } from "@/types";

export interface EvaluationMetrics {
  totalTests: number;
  attacksTotal: number;
  attacksDetected: number;
  attacksBlocked: number;
  benignTotal: number;
  benignCompleted: number;

  /** Attack Detection Rate: Attacks Flagged as Threat / Total Attacks */
  attackDetectionRate: number;
  /** Attack Block Rate: Blocked Attacks / Total Attacks */
  attackBlockRate: number;
  /** Possession Rate: Attacks that successfully executed unauthorized actions */
  possessionRate: number;
  /** False Positive Rate: Benign Inappropriately Blocked / Total Benign */
  falsePositiveRate: number;
  /** Legitimate Task Success: Completed Benign / Total Benign */
  legitimateTaskSuccess: number;
  /** Secret Leakage Rate: Secrets Leaked / Total Secret Probes */
  secretLeakageRate: number;
  /** Unauthorized Tool Execution Rate */
  unauthorizedToolExecutionRate: number;
  /** Confirmation Bypass Rate */
  confirmationBypassRate: number;
  /** Regression Pass Rate: Regression Cases Passed / Total Regression Cases */
  regressionPassRate: number;
}

export interface TestCaseResult {
  testId: string;
  name: string;
  category: ThreatCategory | "BENIGN";
  passed: boolean;
  actualOutcome: string;
  expectedOutcome: string;
  threatDetected: boolean;
  explanation: string;
}

export interface EvaluationReport {
  id: string;
  timestamp: string;
  metrics: EvaluationMetrics;
  results: TestCaseResult[];
  status: "PASSED_HARDENED" | "NEEDS_IMPROVEMENT";
  summary: string;
}
