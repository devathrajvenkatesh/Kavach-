/**
 * Possessed Butler - Threat Analyzer
 *
 * Scans content and tool requests for indirect prompt injections,
 * goal hijacking signatures, and unauthorized secret exfiltration attempts.
 */

import { ThreatAssessment, DetectedThreatSignal } from "@/types";

export class ThreatAnalyzer {
  analyzeContent(targetContentId: string, content: string): ThreatAssessment {
    const signals: DetectedThreatSignal[] = [];
    const normalized = content.toLowerCase();

    // 1. Indirect Prompt Injection signatures
    if (
      normalized.includes("system override") ||
      normalized.includes("ignore previous instructions") ||
      normalized.includes("disregard prior instructions") ||
      normalized.includes("<system_override>")
    ) {
      signals.push({
        category: "INDIRECT_PROMPT_INJECTION",
        severity: "CRITICAL",
        confidence: 0.95,
        indicator: "System override directive detected in content.",
      });
    }

    // 2. Goal Hijacking signatures
    if (
      normalized.includes("forward all internal") ||
      normalized.includes("exfiltrate") ||
      normalized.includes("attacker backdoor")
    ) {
      signals.push({
        category: "GOAL_HIJACKING",
        severity: "HIGH",
        confidence: 0.9,
        indicator: "Instruction attempting to hijack goal toward exfiltration.",
      });
    }

    // 3. Secret Exfiltration signatures
    if (
      normalized.includes(".env") ||
      normalized.includes("canary_token") ||
      normalized.includes("private_key")
    ) {
      signals.push({
        category: "SECRET_EXFILTRATION",
        severity: "CRITICAL",
        confidence: 0.9,
        indicator: "Content references private keys or environment secrets.",
      });
    }

    const isThreatDetected = signals.length > 0;
    const highestSeverity = signals.some((s) => s.severity === "CRITICAL")
      ? "CRITICAL"
      : signals.some((s) => s.severity === "HIGH")
      ? "HIGH"
      : signals.some((s) => s.severity === "MEDIUM")
      ? "MEDIUM"
      : signals.some((s) => s.severity === "LOW")
      ? "LOW"
      : "NONE";

    return {
      id: `threat_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      targetContentId,
      overallThreatLevel: highestSeverity,
      riskScore: isThreatDetected ? 0.85 : 0.05,
      isThreatDetected,
      signals,
      explanation: isThreatDetected
        ? `Detected ${signals.length} threat signal(s): ${signals.map((s) => s.indicator).join("; ")}`
        : "No threat indicators detected.",
      analyzedAt: new Date().toISOString(),
    };
  }
}

export const defaultThreatAnalyzer = new ThreatAnalyzer();
