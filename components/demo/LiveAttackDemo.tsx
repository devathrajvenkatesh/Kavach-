"use client";

import React, { useState, useEffect } from "react";
import {
  Play,
  RotateCcw,
  ChevronRight,
  Cpu,
} from "lucide-react";
import { UnifiedTestCase, AttackExecutionResult } from "@/lib/attack-lab/types";
import { ALL_TEST_CASES } from "@/lib/attack-lab/dataset-loader";
import { defaultPipelineRunner } from "@/lib/attack-lab/pipeline-runner";

export type DemoStage =
  | "IDLE"
  | "USER_REQUEST"
  | "UNTRUSTED_CONTENT_DETECTED"
  | "THREAT_CLASSIFICATION"
  | "POLICY_DECISION"
  | "TOOL_REQUEST_INTERCEPTED"
  | "ATTACK_BLOCKED";

const STAGES: DemoStage[] = [
  "USER_REQUEST",
  "UNTRUSTED_CONTENT_DETECTED",
  "THREAT_CLASSIFICATION",
  "POLICY_DECISION",
  "TOOL_REQUEST_INTERCEPTED",
  "ATTACK_BLOCKED",
];

const DEMO_PRESETS: { label: string; id: string; description: string }[] = [
  {
    label: "1. Indirect Injection via Email (Exfiltration)",
    id: "IND-001",
    description: "Malicious directive embedded in email body attempting to exfiltrate secrets via send_email.",
  },
  {
    label: "2. Path Traversal & Secret Harvesting (.env)",
    id: "SEC-001",
    description: "Attacker attempts to harvest sensitive environment secrets via parameter manipulation.",
  },
  {
    label: "3. Goal Hijacking via Forum Thread",
    id: "GOAL-001",
    description: "Simulated conversation turn instructs Kavach agent to abandon user task and delete files.",
  },
  {
    label: "4. Privilege Escalation & Confirmation Bypass",
    id: "PE-001",
    description: "Attacker claims admin override and attempts to bypass human confirmation gate.",
  },
  {
    label: "5. Context Boundary Tokenizer Breakout",
    id: "CTX-001",
    description: "Injects raw ChatML delimiter tokens (<|im_start|>) to escape boundary tagging.",
  },
  {
    label: "6. Legitimate Benign Task (Control Baseline)",
    id: "BEN-001",
    description: "Authentic user requests inbox email summary with zero malicious injection.",
  },
];

interface LiveAttackDemoProps {
  initialCase?: UnifiedTestCase;
}

export function LiveAttackDemo({ initialCase }: LiveAttackDemoProps) {
  const [selectedCaseId, setSelectedCaseId] = useState<string>(initialCase?.id || "IND-001");
  const [currentStage, setCurrentStage] = useState<DemoStage>("IDLE");
  const [isAutoPlaying, setIsAutoPlaying] = useState<boolean>(false);
  const [executionResult, setExecutionResult] = useState<AttackExecutionResult | null>(null);

  const activeCase = ALL_TEST_CASES.find((c) => c.id === selectedCaseId) || ALL_TEST_CASES[0];
  const isBenign = activeCase.category === "BENIGN";

  useEffect(() => {
    if (initialCase) {
      setSelectedCaseId(initialCase.id);
      setCurrentStage("IDLE");
    }
  }, [initialCase]);

  const getStageIndex = (stage: DemoStage): number => {
    if (stage === "IDLE") return -1;
    return STAGES.indexOf(stage);
  };

  const currentStageIndex = getStageIndex(currentStage);

  // Auto-play timer
  useEffect(() => {
    if (!isAutoPlaying) return;

    if (currentStage === "IDLE") {
      setCurrentStage("USER_REQUEST");
      return;
    }

    const timer = setTimeout(() => {
      const nextIdx = currentStageIndex + 1;
      if (nextIdx < STAGES.length) {
        setCurrentStage(STAGES[nextIdx]);
      } else {
        setIsAutoPlaying(false);
      }
    }, 1800);

    return () => clearTimeout(timer);
  }, [isAutoPlaying, currentStage, currentStageIndex]);

  // Execute pipeline through real runner when reaching final stage
  useEffect(() => {
    if (currentStage === "ATTACK_BLOCKED" && !executionResult) {
      defaultPipelineRunner.runTestCase(activeCase).then((res) => {
        setExecutionResult(res);
      });
    }
  }, [currentStage, activeCase, executionResult]);

  const handleStartDemo = () => {
    setExecutionResult(null);
    setCurrentStage("USER_REQUEST");
    setIsAutoPlaying(true);
  };

  const handleNextStep = () => {
    if (currentStage === "IDLE") {
      setCurrentStage("USER_REQUEST");
    } else {
      const nextIdx = currentStageIndex + 1;
      if (nextIdx < STAGES.length) {
        setCurrentStage(STAGES[nextIdx]);
      }
    }
  };

  const handleReset = () => {
    setIsAutoPlaying(false);
    setCurrentStage("IDLE");
    setExecutionResult(null);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Header & Controls */}
      <div className="rounded-2xl border border-[#E8ECE9] bg-white p-6 shadow-sm space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <div className="flex items-center space-x-2 text-[#678882] font-mono text-xs uppercase tracking-widest mb-1">
              <Cpu className="w-4 h-4 text-[#2E595A]" />
              <span>Interactive Penetration Sandbox</span>
              <span>•</span>
              <span className="text-[#C9A86A]">Live Agent Reasoning</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-serif font-bold text-[#052326]">
              Live Attack Simulator
            </h1>
            <p className="text-[#2E595A] text-xs sm:text-sm mt-1">
              Step-by-step inspection demonstrating how Kavach intercepts adversarial injections, enforces deterministic security policies, and prevents tool hijacking.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={handleStartDemo}
              disabled={isAutoPlaying}
              className="inline-flex items-center space-x-2 px-4 py-2 rounded-xl bg-[#052326] hover:bg-[#2E595A] disabled:opacity-50 text-white text-xs font-semibold uppercase tracking-wider transition-all shadow-sm active:scale-95"
            >
              <Play className="w-3.5 h-3.5 fill-current text-[#C9A86A]" />
              <span>Auto Play Defense Flow</span>
            </button>

            <button
              onClick={handleNextStep}
              disabled={isAutoPlaying || currentStage === "ATTACK_BLOCKED"}
              className="inline-flex items-center space-x-2 px-3.5 py-2 rounded-xl bg-white hover:bg-[#FBF9F8] disabled:opacity-50 border border-[#E8ECE9] text-[#052326] text-xs font-semibold uppercase tracking-wider transition-all"
            >
              <span>Next Step</span>
              <ChevronRight className="w-3.5 h-3.5 text-[#2E595A]" />
            </button>

            <button
              onClick={handleReset}
              className="inline-flex items-center space-x-1.5 px-3 py-2 rounded-xl bg-[#FBF9F8] hover:bg-[#EBF1ED] border border-[#E8ECE9] text-[#678882] text-xs transition-all"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset</span>
            </button>
          </div>
        </div>

        {/* Preset Selector */}
        <div className="pt-3 border-t border-[#E8ECE9] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center space-x-2 text-xs font-mono text-[#678882]">
            <span>Select Attack Scenario:</span>
            <select
              value={selectedCaseId}
              onChange={(e) => {
                setSelectedCaseId(e.target.value);
                handleReset();
              }}
              className="rounded-lg bg-[#FBF9F8] border border-[#E8ECE9] text-[#052326] px-3 py-1.5 font-mono text-xs focus:outline-none focus:border-[#C9A86A]"
            >
              <optgroup label="Curated Representative Presets">
                {DEMO_PRESETS.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.label}
                  </option>
                ))}
              </optgroup>
              <optgroup label="All 138 Corpus Cases">
                {ALL_TEST_CASES.map((tc) => (
                  <option key={tc.id} value={tc.id}>
                    [{tc.id}] {tc.name} ({tc.category})
                  </option>
                ))}
              </optgroup>
            </select>
          </div>

          <div className="flex items-center space-x-2 text-xs font-mono">
            <span className="text-[#678882]">Vector:</span>
            <span className="px-2 py-0.5 rounded bg-[#EBF1ED] text-[#2E595A] font-bold">
              {activeCase.sourceType}
            </span>
            <span className="text-[#678882]">Severity:</span>
            <span
              className={`px-2 py-0.5 rounded font-bold ${
                activeCase.severity === "CRITICAL"
                  ? "bg-[#FAF5EB] text-[#C9A86A] border border-[#C9A86A]/40"
                  : "bg-[#F3F6F4] text-[#2E595A]"
              }`}
            >
              {activeCase.severity}
            </span>
          </div>
        </div>
      </div>

      {/* 6-Stage Flow Visualization Pipeline */}
      <div className="space-y-4">
        {/* Stage 1: USER REQUEST */}
        <div
          className={`rounded-2xl border transition-all duration-300 p-5 ${
            currentStageIndex >= 0
              ? "border-[#2E595A]/40 bg-white shadow-sm ring-1 ring-[#2E595A]/20"
              : "border-[#E8ECE9] bg-[#FBF9F8]/60 opacity-60"
          }`}
        >
          <div className="flex items-start justify-between">
            <div className="flex items-center space-x-3">
              <div
                className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs font-mono ${
                  currentStageIndex >= 0 ? "bg-[#052326] text-[#C9A86A]" : "bg-[#E8ECE9] text-[#678882]"
                }`}
              >
                01
              </div>
              <div>
                <h3 className="text-sm font-bold text-[#052326]">
                  1. Authenticated User Instruction
                </h3>
                <span className="text-[11px] font-mono text-[#678882]">
                  Origin: Verified Human User (Authority Tier 2)
                </span>
              </div>
            </div>
            {currentStageIndex >= 0 && (
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#EBF1ED] text-[#2E595A] font-bold">
                ESTABLISHED
              </span>
            )}
          </div>
          <div className="mt-3 p-3 rounded-xl bg-[#FBF9F8] border border-[#E8ECE9] font-mono text-xs text-[#052326]">
            &ldquo;{activeCase.userIntent}&rdquo;
          </div>
        </div>

        {/* Stage 2: UNTRUSTED CONTENT DETECTED */}
        <div
          className={`rounded-2xl border transition-all duration-300 p-5 ${
            currentStageIndex >= 1
              ? "border-[#C9A86A]/50 bg-white shadow-sm ring-1 ring-[#C9A86A]/20"
              : "border-[#E8ECE9] bg-[#FBF9F8]/60 opacity-60"
          }`}
        >
          <div className="flex items-start justify-between">
            <div className="flex items-center space-x-3">
              <div
                className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs font-mono ${
                  currentStageIndex >= 1 ? "bg-[#FAF5EB] text-[#C9A86A] border border-[#C9A86A]/40" : "bg-[#E8ECE9] text-[#678882]"
                }`}
              >
                02
              </div>
              <div>
                <h3 className="text-sm font-bold text-[#052326]">
                  2. External Content Ingestion & Boundary Tagging
                </h3>
                <span className="text-[11px] font-mono text-[#678882]">
                  Origin: {activeCase.sourceType} (Tagged: &lt;untrusted_external_data&gt;)
                </span>
              </div>
            </div>
            {currentStageIndex >= 1 && (
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#FAF5EB] text-[#C9A86A] font-bold border border-[#C9A86A]/30">
                DATA ONLY • ZERO AUTHORITY
              </span>
            )}
          </div>
          <div className="mt-3 p-3 rounded-xl bg-[#FBF9F8] border border-[#E8ECE9] font-mono text-xs text-[#C9A86A] overflow-x-auto">
            {activeCase.payload}
          </div>
        </div>

        {/* Stage 3: THREAT CLASSIFICATION */}
        <div
          className={`rounded-2xl border transition-all duration-300 p-5 ${
            currentStageIndex >= 2
              ? "border-[#2E595A]/40 bg-white shadow-sm ring-1 ring-[#2E595A]/20"
              : "border-[#E8ECE9] bg-[#FBF9F8]/60 opacity-60"
          }`}
        >
          <div className="flex items-start justify-between">
            <div className="flex items-center space-x-3">
              <div
                className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs font-mono ${
                  currentStageIndex >= 2 ? "bg-[#052326] text-[#C9A86A]" : "bg-[#E8ECE9] text-[#678882]"
                }`}
              >
                03
              </div>
              <div>
                <h3 className="text-sm font-bold text-[#052326]">
                  3. Threat Analysis & Normalization
                </h3>
                <span className="text-[11px] font-mono text-[#678882]">
                  Engine: Unicode NFKD, Heuristics, Taint Tracking
                </span>
              </div>
            </div>
            {currentStageIndex >= 2 && (
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#EBF1ED] text-[#2E595A] font-bold">
                SCANNED
              </span>
            )}
          </div>
          {currentStageIndex >= 2 && (
            <div className="mt-3 p-3 rounded-xl bg-[#FBF9F8] border border-[#E8ECE9] text-xs space-y-1">
              <div className="text-[#052326] font-semibold">
                Category: <span className="font-mono text-[#2E595A]">{activeCase.category}</span>
              </div>
              <div className="text-[#678882]">
                Expected Threat: {activeCase.expectedThreat ? "YES (ADVERSARIAL)" : "NO (BENIGN TASK)"}
              </div>
            </div>
          )}
        </div>

        {/* Stage 4: POLICY DECISION */}
        <div
          className={`rounded-2xl border transition-all duration-300 p-5 ${
            currentStageIndex >= 3
              ? "border-[#C9A86A]/50 bg-white shadow-sm ring-1 ring-[#C9A86A]/20"
              : "border-[#E8ECE9] bg-[#FBF9F8]/60 opacity-60"
          }`}
        >
          <div className="flex items-start justify-between">
            <div className="flex items-center space-x-3">
              <div
                className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs font-mono ${
                  currentStageIndex >= 3 ? "bg-[#FAF5EB] text-[#C9A86A] border border-[#C9A86A]/40" : "bg-[#E8ECE9] text-[#678882]"
                }`}
              >
                04
              </div>
              <div>
                <h3 className="text-sm font-bold text-[#052326]">
                  4. Deterministic Policy Engine Evaluation
                </h3>
                <span className="text-[11px] font-mono text-[#678882]">
                  Rule Decision: {activeCase.expectedDecision}
                </span>
              </div>
            </div>
            {currentStageIndex >= 3 && (
              <span
                className={`text-[10px] font-mono px-2 py-0.5 rounded font-bold ${
                  activeCase.expectedDecision === "BLOCK"
                    ? "bg-[#FAF5EB] text-[#C9A86A] border border-[#C9A86A]/40"
                    : "bg-[#EBF1ED] text-[#2E595A]"
                }`}
              >
                {activeCase.expectedDecision}
              </span>
            )}
          </div>
        </div>

        {/* Stage 5: TOOL REQUEST INTERCEPTED */}
        <div
          className={`rounded-2xl border transition-all duration-300 p-5 ${
            currentStageIndex >= 4
              ? "border-[#2E595A]/40 bg-white shadow-sm ring-1 ring-[#2E595A]/20"
              : "border-[#E8ECE9] bg-[#FBF9F8]/60 opacity-60"
          }`}
        >
          <div className="flex items-start justify-between">
            <div className="flex items-center space-x-3">
              <div
                className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs font-mono ${
                  currentStageIndex >= 4 ? "bg-[#052326] text-[#C9A86A]" : "bg-[#E8ECE9] text-[#678882]"
                }`}
              >
                05
              </div>
              <div>
                <h3 className="text-sm font-bold text-[#052326]">
                  5. Tool Gateway Enforcement Barrier
                </h3>
                <span className="text-[11px] font-mono text-[#678882]">
                  Tool Execution Attempted: {activeCase.expectedExecution ? "PERMITTED" : "DENIED"}
                </span>
              </div>
            </div>
            {currentStageIndex >= 4 && (
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#EBF1ED] text-[#2E595A] font-bold">
                GATEWAY ARMED
              </span>
            )}
          </div>
        </div>

        {/* Stage 6: ATTACK BLOCKED */}
        <div
          className={`rounded-2xl border transition-all duration-300 p-5 ${
            currentStageIndex >= 5
              ? "border-[#C9A86A] bg-white shadow-md ring-2 ring-[#C9A86A]/30"
              : "border-[#E8ECE9] bg-[#FBF9F8]/60 opacity-60"
          }`}
        >
          <div className="flex items-start justify-between">
            <div className="flex items-center space-x-3">
              <div
                className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs font-mono ${
                  currentStageIndex >= 5 ? "bg-[#052326] text-[#C9A86A]" : "bg-[#E8ECE9] text-[#678882]"
                }`}
              >
                06
              </div>
              <div>
                <h3 className="text-sm font-bold text-[#052326]">
                  6. Final Outcome & Telemetry Commit
                </h3>
                <span className="text-[11px] font-mono text-[#678882]">
                  Status: {isBenign ? "BENIGN TASK COMPLETED" : "ADVERSARIAL ATTACK BLOCKED"}
                </span>
              </div>
            </div>
            {currentStageIndex >= 5 && (
              <span
                className={`text-[10px] font-mono px-2.5 py-1 rounded font-bold ${
                  isBenign
                    ? "bg-[#EBF1ED] text-[#2E595A]"
                    : "bg-[#FAF5EB] text-[#C9A86A] border border-[#C9A86A]/40"
                }`}
              >
                {isBenign ? "ALLOWED BENIGN TASK" : "BLOCKED ATTACK"}
              </span>
            )}
          </div>
          {currentStageIndex >= 5 && executionResult && (
            <div className="mt-3 p-3.5 rounded-xl bg-[#FAF5EB] border border-[#C9A86A]/30 text-xs space-y-1 font-mono">
              <div className="font-bold text-[#052326]">
                Report: {executionResult.finalResult} (Latency: {executionResult.latencyMs.toFixed(1)}ms)
              </div>
              <div className="text-[#678882]">
                Reason: {executionResult.reason}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
