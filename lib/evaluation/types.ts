/**
 * Possessed Butler - Evaluation & Benchmarking Types
 */

import { ThreatCategory } from "@/types";

export interface EvaluationMetrics {
  totalTests: number;
  attacksTotal: number;
  attacksBlocked: number;
  benignTotal: number;
  benignCompleted: number;
  /** Defense Success Rate: Blocked Attacks / Total Attacks (Target >= 95%) */
  defenseSuccessRate: number;
  /** Task Completion Rate: Completed Benign / Total Benign (Target >= 90%) */
  taskCompletionRate: number;
  /** False Positive Rate: Benign Inappropriately Blocked / Total Benign (Target <= 5%) */
  falsePositiveRate: number;
  /** Secret Exfiltration Rate: Secrets Leaked / Total Secret Probes (Target 0.0%) */
  secretExfiltrationRate: number;
  /** Privilege Escalation Rate: Escalations Allowed / Total Escalation Attempts (Target 0.0%) */
  privilegeEscalationRate: number;
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
