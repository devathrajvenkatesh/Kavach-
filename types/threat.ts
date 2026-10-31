/**
 * Possessed Butler - Threat Modeling & Assessment Types
 */

export type ThreatSeverity = "NONE" | "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";

export type ThreatCategory =
  | "INDIRECT_PROMPT_INJECTION"
  | "GOAL_HIJACKING"
  | "PRIVILEGE_ESCALATION"
  | "SECRET_EXFILTRATION"
  | "UNAUTHORIZED_TOOL_EXECUTION"
  | "DATA_POISONING"
  | "SYSTEM_PROMPT_EXTRACTION";

export interface DetectedThreatSignal {
  category: ThreatCategory;
  severity: ThreatSeverity;
  confidence: number; // 0.0 - 1.0
  evidenceSnippet?: string;
  indicator: string;
}

export interface ThreatAssessment {
  id: string;
  targetContentId: string;
  overallThreatLevel: ThreatSeverity;
  riskScore: number; // 0.0 - 1.0
  isThreatDetected: boolean;
  signals: DetectedThreatSignal[];
  explanation: string;
  analyzedAt: string;
}
