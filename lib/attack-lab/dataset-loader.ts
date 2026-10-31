/**
 * Kavach - Attack Lab Dataset Loader
 *
 * Loads, normalizes, and indexes the entire 138-case test corpus:
 * 112 malicious attack vectors across 8 categories, 22 benign tasks, and 4 regression tripwires.
 */

import directAttacks from "@/datasets/attacks/direct_injections.json";
import indirectAttacks from "@/datasets/attacks/indirect_injections.json";
import goalHijacks from "@/datasets/attacks/goal_hijacking.json";
import secretExfils from "@/datasets/attacks/secret_exfiltration.json";
import privEscs from "@/datasets/attacks/privilege_escalation.json";
import toolManips from "@/datasets/attacks/tool_manipulation.json";
import contextAttacks from "@/datasets/attacks/context_manipulation.json";
import mixedAttacks from "@/datasets/attacks/mixed_attacks.json";
import benignTasks from "@/datasets/benign/benign_tasks.json";
import regressionCases from "@/datasets/regression/regression_suite.json";

import {
  UnifiedTestCase,
  TestCaseCategory,
  SeverityLevel,
  SourceType,
  DecisionOutcome,
} from "./types";

export function loadAllTestCases(): UnifiedTestCase[] {
  const normalizedCases: UnifiedTestCase[] = [];

  const rawAttacks = [
    ...directAttacks,
    ...indirectAttacks,
    ...goalHijacks,
    ...secretExfils,
    ...privEscs,
    ...toolManips,
    ...contextAttacks,
    ...mixedAttacks,
  ];

  for (const item of rawAttacks) {
    normalizedCases.push({
      id: item.id,
      name: (item as { name?: string }).name || item.id,
      category: item.category as TestCaseCategory,
      severity: (item.severity as SeverityLevel) || "HIGH",
      sourceType: (item.sourceType as SourceType) || "user_prompt",
      userIntent: item.userIntent || "Perform task",
      payload: item.payload,
      expectedThreat: item.expectedThreat !== false,
      expectedDecision: (item.expectedDecision as DecisionOutcome) || "BLOCK",
      expectedExecution: item.expectedExecution === true,
      description: (item as { description?: string }).description,
    });
  }

  for (const item of benignTasks) {
    normalizedCases.push({
      id: item.id,
      name: (item as { name?: string }).name || item.id,
      category: "BENIGN",
      severity: "NONE",
      sourceType: (item.sourceType as SourceType) || "user_prompt",
      userIntent: item.userIntent,
      payload: (item as { payload?: string; userPrompt?: string }).payload || (item as { payload?: string; userPrompt?: string }).userPrompt || "",
      expectedThreat: false,
      expectedDecision: (item.expectedDecision as DecisionOutcome) || "APPROVE",
      expectedExecution: true,
      description: (item as { description?: string }).description,
    });
  }

  for (const item of regressionCases) {
    normalizedCases.push({
      id: item.id,
      name: item.name || item.id,
      category: "REGRESSION",
      severity: "CRITICAL",
      sourceType: "regression_tripwire",
      userIntent: item.description || "Regression verification",
      payload: item.payload,
      expectedThreat: true,
      expectedDecision: (item.expectedOutcome as DecisionOutcome) || "BLOCK",
      expectedExecution: false,
      description: item.description,
    });
  }

  return normalizedCases;
}

export const ALL_TEST_CASES = loadAllTestCases();

export const DATASET_CATEGORIES: { id: string; label: string; count: number }[] = [
  { id: "ALL", label: "All Cases", count: ALL_TEST_CASES.length },
  { id: "DIRECT_PROMPT_INJECTION", label: "Direct Injection", count: directAttacks.length },
  { id: "INDIRECT_PROMPT_INJECTION", label: "Indirect Injection", count: indirectAttacks.length },
  { id: "GOAL_HIJACKING", label: "Goal Hijacking", count: goalHijacks.length },
  { id: "SECRET_EXFILTRATION", label: "Secret Exfiltration", count: secretExfils.length },
  { id: "PRIVILEGE_ESCALATION", label: "Privilege Escalation", count: privEscs.length },
  { id: "TOOL_MANIPULATION", label: "Tool Manipulation", count: toolManips.length },
  { id: "CONTEXT_MANIPULATION", label: "Context Manipulation", count: contextAttacks.length },
  { id: "MULTI_STEP_ATTACK", label: "Mixed / Multi-Step", count: mixedAttacks.length },
  { id: "BENIGN", label: "Benign Utility Tasks", count: benignTasks.length },
  { id: "REGRESSION", label: "Regression Suite", count: regressionCases.length },
];

export function getTestCaseById(id: string): UnifiedTestCase | undefined {
  return ALL_TEST_CASES.find((c) => c.id === id);
}

export function getTestCasesByCategory(category: string): UnifiedTestCase[] {
  if (category === "ALL") return ALL_TEST_CASES;
  return ALL_TEST_CASES.filter((c) => c.category === category);
}
