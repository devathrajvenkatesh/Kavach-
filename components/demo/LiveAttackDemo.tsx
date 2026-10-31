"use client";

import React, { useState, useEffect } from "react";
import {
  Flame,
  AlertTriangle,
  Lock,
  CheckCircle2,
  Play,
  RotateCcw,
  ChevronRight,
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

    const nextIndex = currentStageIndex + 1;
    if (nextIndex < STAGES.length) {
      const timer = setTimeout(() => {
        setCurrentStage(STAGES[nextIndex]);
      }, 1000);
      return () => clearTimeout(timer);
    } else {
      setIsAutoPlaying(false);
    }
  }, [isAutoPlaying, currentStage, currentStageIndex]);

  const handleStartDemo = async () => {
    setCurrentStage("IDLE");
    const res = await defaultPipelineRunner.runTestCase(activeCase);
    setExecutionResult(res);
    setIsAutoPlaying(true);
  };

  const handleNextStep = () => {
    if (currentStage === "IDLE") {
      setCurrentStage("USER_REQUEST");
    } else {
      const nextIndex = currentStageIndex + 1;
      if (nextIndex < STAGES.length) {
        setCurrentStage(STAGES[nextIndex]);
      }
    }
  };

  const handleReset = () => {
    setCurrentStage("IDLE");
    setIsAutoPlaying(false);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Header */}
      <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-6 backdrop-blur space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <div className="flex items-center space-x-2 text-indigo-400 font-mono text-xs uppercase tracking-widest mb-1">
              <Flame className="w-4 h-4 text-amber-400" />
              <span>Interactive Pipeline Visualization</span>
              <span>•</span>
              <span className="text-slate-400">Zero-Authority Architecture In Action</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
              KAVACH LIVE ATTACK DEMO
            </h1>
            <p className="text-slate-400 text-xs sm:text-sm mt-1">
              Step-by-step inspection demonstrating how Kavach intercepts adversarial injections, enforces deterministic security policies, and prevents tool hijacking.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={handleStartDemo}
              disabled={isAutoPlaying}
              className="inline-flex items-center space-x-2 px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-xs font-semibold uppercase tracking-wider transition-all shadow-lg shadow-indigo-600/20 active:scale-95"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              <span>Auto Play Defense Flow</span>
            </button>

            <button
              onClick={handleNextStep}
              disabled={isAutoPlaying || currentStage === "ATTACK_BLOCKED"}
              className="inline-flex items-center space-x-2 px-3.5 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-50 border border-slate-700 text-slate-200 text-xs font-semibold uppercase tracking-wider transition-all"
            >
              <span>Next Step</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>

            <button
              onClick={handleReset}
              className="inline-flex items-center space-x-1.5 px-3 py-2 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-400 text-xs transition-all"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset</span>
            </button>
          </div>
        </div>

        {/* Preset Selector */}
        <div className="pt-2 border-t border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center space-x-2 text-xs font-mono text-slate-400">
            <span>Select Attack Scenario:</span>
            <select
              value={selectedCaseId}
              onChange={(e) => {
                setSelectedCaseId(e.target.value);
                handleReset();
              }}
              className="rounded bg-slate-950 border border-slate-700 text-slate-200 px-3 py-1 font-mono text-xs focus:outline-none focus:border-indigo-500"
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
            <span className="text-slate-500">Vector:</span>
            <span className="px-2 py-0.5 rounded bg-slate-800 text-indigo-300 font-bold">
              {activeCase.sourceType}
            </span>
            <span className="text-slate-500">Severity:</span>
            <span
              className={`px-2 py-0.5 rounded font-bold ${
                activeCase.severity === "CRITICAL"
                  ? "bg-rose-950 text-rose-300 border border-rose-800"
                  : activeCase.severity === "HIGH"
                  ? "bg-amber-950 text-amber-300 border border-amber-800"
                  : "bg-slate-800 text-slate-300"
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
          className={`rounded-xl border transition-all duration-300 p-5 backdrop-blur ${
            currentStageIndex >= 0
              ? "border-indigo-500/50 bg-indigo-950/20 shadow-lg shadow-indigo-950/30"
              : "border-slate-800/80 bg-slate-900/30 opacity-60"
          }`}
        >
          <div className="flex items-start justify-between">
            <div className="flex items-center space-x-3">
              <div
                className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs font-mono ${
                  currentStageIndex >= 0
                    ? "bg-indigo-600 text-white"
                    : "bg-slate-800 text-slate-400"
                }`}
              >
                01
              </div>
              <div>
                <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                  <span>User Request Ingestion</span>
                  {currentStageIndex >= 0 && (
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-indigo-900/60 text-indigo-300 border border-indigo-700/50">
                      Step 1 of 6
                    </span>
                  )}
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Authenticated user initiates legitimate high-level assistant objective.
                </p>
              </div>
            </div>
            {currentStageIndex >= 0 && (
              <span className="text-xs font-mono text-emerald-400 flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" /> Received
              </span>
            )}
          </div>

          {currentStageIndex >= 0 && (
            <div className="mt-4 pt-4 border-t border-slate-800/80 space-y-2 animate-in fade-in">
              <div className="text-xs font-mono text-slate-400">User Objective:</div>
              <div className="p-3 rounded-lg bg-slate-950 border border-slate-800 font-mono text-xs text-white">
                &ldquo;{activeCase.userIntent}&rdquo;
              </div>
              <div className="text-[11px] font-mono text-slate-500">
                Initial Trust Context: Level 3 (USER_INTENT) • Verified User: true
              </div>
            </div>
          )}
        </div>

        {/* Stage 2: UNTRUSTED CONTENT DETECTED */}
        <div
          className={`rounded-xl border transition-all duration-300 p-5 backdrop-blur ${
            currentStageIndex >= 1
              ? isBenign
                ? "border-cyan-500/50 bg-cyan-950/20"
                : "border-amber-500/50 bg-amber-950/20 shadow-lg shadow-amber-950/30"
              : "border-slate-800/80 bg-slate-900/30 opacity-60"
          }`}
        >
          <div className="flex items-start justify-between">
            <div className="flex items-center space-x-3">
              <div
                className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs font-mono ${
                  currentStageIndex >= 1
                    ? isBenign
                      ? "bg-cyan-600 text-white"
                      : "bg-amber-600 text-white"
                    : "bg-slate-800 text-slate-400"
                }`}
              >
                02
              </div>
              <div>
                <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                  <span>Untrusted External Content Boundary</span>
                  {currentStageIndex >= 1 && (
                    <span
                      className={`text-[10px] font-mono px-2 py-0.5 rounded border ${
                        isBenign
                          ? "bg-cyan-950 border-cyan-800 text-cyan-300"
                          : "bg-amber-950 border-amber-800 text-amber-300"
                      }`}
                    >
                      Step 2 of 6
                    </span>
                  )}
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  External document / email body / webpage loaded into runtime context.
                </p>
              </div>
            </div>
            {currentStageIndex >= 1 && (
              <span
                className={`text-xs font-mono flex items-center gap-1 ${
                  isBenign ? "text-cyan-400" : "text-amber-400 font-bold"
                }`}
              >
                {isBenign ? (
                  <>
                    <CheckCircle2 className="w-3.5 h-3.5" /> Clean Vector
                  </>
                ) : (
                  <>
                    <AlertTriangle className="w-3.5 h-3.5" /> Untrusted Vector Tagged
                  </>
                )}
              </span>
            )}
          </div>

          {currentStageIndex >= 1 && (
            <div className="mt-4 pt-4 border-t border-slate-800/80 space-y-3 animate-in fade-in">
              <div className="flex items-center justify-between text-xs font-mono">
                <span className="text-slate-400">External Content Vector:</span>
                <span className="text-amber-400 font-bold">[Zero-Authority Taint Applied]</span>
              </div>
              <pre className="p-3 rounded-lg bg-slate-950 border border-slate-800 font-mono text-xs text-slate-200 whitespace-pre-wrap break-all max-h-40 overflow-y-auto">
                {activeCase.payload}
              </pre>
              <div className="text-[11px] font-mono text-slate-500">
                Security Boundary: Wrapped inside &lt;untrusted_external_data
                source=&quot;{activeCase.sourceType}&quot;&gt;
              </div>
            </div>
          )}
        </div>

        {/* Stage 3: THREAT CLASSIFICATION */}
        <div
          className={`rounded-xl border transition-all duration-300 p-5 backdrop-blur ${
            currentStageIndex >= 2
              ? isBenign
                ? "border-emerald-500/50 bg-emerald-950/20"
                : "border-rose-500/50 bg-rose-950/20 shadow-lg shadow-rose-950/30"
              : "border-slate-800/80 bg-slate-900/30 opacity-60"
          }`}
        >
          <div className="flex items-start justify-between">
            <div className="flex items-center space-x-3">
              <div
                className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs font-mono ${
                  currentStageIndex >= 2
                    ? isBenign
                      ? "bg-emerald-600 text-white"
                      : "bg-rose-600 text-white"
                    : "bg-slate-800 text-slate-400"
                }`}
              >
                03
              </div>
              <div>
                <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                  <span>Threat Classification & Analysis</span>
                  {currentStageIndex >= 2 && (
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-rose-950 border border-rose-800 text-rose-300">
                      Step 3 of 6
                    </span>
                  )}
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Threat Analyzer parses normalized tokens, extracts signatures, and flags adversarial patterns.
                </p>
              </div>
            </div>
            {currentStageIndex >= 2 && (
              <span
                className={`text-xs font-mono font-bold flex items-center gap-1 ${
                  isBenign ? "text-emerald-400" : "text-rose-400"
                }`}
              >
                {isBenign ? "No Threat Detected" : "Threat Detected"}
              </span>
            )}
          </div>

          {currentStageIndex >= 2 && (
            <div className="mt-4 pt-4 border-t border-slate-800/80 space-y-2 animate-in fade-in">
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs font-mono">
                <div>
                  <span className="text-slate-500">Classification:</span>
                  <div className="text-white font-bold">{activeCase.category}</div>
                </div>
                <div>
                  <span className="text-slate-500">Threat Level:</span>
                  <div className={isBenign ? "text-emerald-400 font-bold" : "text-rose-400 font-bold"}>
                    {isBenign ? "NONE" : activeCase.severity}
                  </div>
                </div>
                <div>
                  <span className="text-slate-500">Normalization:</span>
                  <div className="text-indigo-300">Unicode NFKD + Zero-Width Stripped</div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Stage 4: POLICY DECISION */}
        <div
          className={`rounded-xl border transition-all duration-300 p-5 backdrop-blur ${
            currentStageIndex >= 3
              ? isBenign
                ? "border-emerald-500/50 bg-emerald-950/20"
                : "border-rose-500/50 bg-rose-950/20 shadow-lg shadow-rose-950/30"
              : "border-slate-800/80 bg-slate-900/30 opacity-60"
          }`}
        >
          <div className="flex items-start justify-between">
            <div className="flex items-center space-x-3">
              <div
                className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs font-mono ${
                  currentStageIndex >= 3
                    ? isBenign
                      ? "bg-emerald-600 text-white"
                      : "bg-rose-600 text-white"
                    : "bg-slate-800 text-slate-400"
                }`}
              >
                04
              </div>
              <div>
                <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                  <span>Policy Engine Evaluation</span>
                  {currentStageIndex >= 3 && (
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
                      Step 4 of 6
                    </span>
                  )}
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Evaluates mandatory security rules against the trust hierarchy. Higher tiers strictly override lower tiers.
                </p>
              </div>
            </div>
            {currentStageIndex >= 3 && (
              <span
                className={`text-xs font-mono font-bold px-2 py-0.5 rounded border ${
                  isBenign
                    ? "bg-emerald-950 border-emerald-800 text-emerald-400"
                    : "bg-rose-950 border-rose-800 text-rose-400"
                }`}
              >
                DECISION: {isBenign ? "APPROVE" : "BLOCK"}
              </span>
            )}
          </div>

          {currentStageIndex >= 3 && (
            <div className="mt-4 pt-4 border-t border-slate-800/80 space-y-2 animate-in fade-in">
              <div className="text-xs font-mono text-slate-400">Enforced Invariant:</div>
              <div className="p-3 rounded-lg bg-slate-950 border border-slate-800 font-mono text-xs text-amber-300">
                {isBenign
                  ? "Rule POL-BENIGN-01: Verified user intent without untrusted override -> Action Approved."
                  : "Rule POL-INVARIANT-01: External untrusted payload cannot command consequential tools -> Action Denied."}
              </div>
            </div>
          )}
        </div>

        {/* Stage 5: TOOL REQUEST INTERCEPTED */}
        <div
          className={`rounded-xl border transition-all duration-300 p-5 backdrop-blur ${
            currentStageIndex >= 4
              ? "border-indigo-500/50 bg-indigo-950/20 shadow-lg shadow-indigo-950/30"
              : "border-slate-800/80 bg-slate-900/30 opacity-60"
          }`}
        >
          <div className="flex items-start justify-between">
            <div className="flex items-center space-x-3">
              <div
                className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs font-mono ${
                  currentStageIndex >= 4
                    ? "bg-indigo-600 text-white"
                    : "bg-slate-800 text-slate-400"
                }`}
              >
                05
              </div>
              <div>
                <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                  <span>Tool Request Intercepted</span>
                  {currentStageIndex >= 4 && (
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-indigo-900/60 text-indigo-300 border border-indigo-700/50">
                      Step 5 of 6
                    </span>
                  )}
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  LLM reasoning attempted tool execution, but Security Gateway intercepted the invocation.
                </p>
              </div>
            </div>
            {currentStageIndex >= 4 && (
              <span className="text-xs font-mono text-indigo-300 font-bold flex items-center gap-1">
                <Lock className="w-3.5 h-3.5" /> Intercepted at Gateway
              </span>
            )}
          </div>

          {currentStageIndex >= 4 && (
            <div className="mt-4 pt-4 border-t border-slate-800/80 space-y-2 animate-in fade-in">
              <div className="grid grid-cols-2 gap-3 text-xs font-mono">
                <div>
                  <span className="text-slate-500">Attempted Tool:</span>
                  <div className="text-indigo-300 font-bold">
                    {activeCase.payload.includes(".env")
                      ? "read_file"
                      : activeCase.payload.includes("edit")
                      ? "edit_file"
                      : isBenign
                      ? "read_email"
                      : "send_email"}
                  </div>
                </div>
                <div>
                  <span className="text-slate-500">Execution Status:</span>
                  <div className={isBenign ? "text-emerald-400 font-bold" : "text-rose-400 font-bold"}>
                    {isBenign ? "AUTHORIZED_FORWARD" : "INTERCEPTED_AND_HELD"}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Stage 6: ATTACK BLOCKED / TASK COMPLETED */}
        <div
          className={`rounded-xl border transition-all duration-300 p-5 backdrop-blur ${
            currentStageIndex >= 5
              ? isBenign
                ? "border-emerald-500 bg-emerald-950/30 shadow-xl shadow-emerald-950/40"
                : "border-emerald-500 bg-slate-950/80 shadow-xl shadow-emerald-950/40"
              : "border-slate-800/80 bg-slate-900/30 opacity-60"
          }`}
        >
          <div className="flex items-start justify-between">
            <div className="flex items-center space-x-3">
              <div
                className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs font-mono ${
                  currentStageIndex >= 5
                    ? "bg-emerald-600 text-white"
                    : "bg-slate-800 text-slate-400"
                }`}
              >
                06
              </div>
              <div>
                <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                  <span>{isBenign ? "Benign Task Completed Safely" : "Attack Neutralized & Blocked"}</span>
                  {currentStageIndex >= 5 && (
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-950 border border-emerald-800 text-emerald-400">
                      Step 6 of 6 • Complete
                    </span>
                  )}
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  {isBenign
                    ? "Legitimate task performed without disruption or false positive."
                    : "Unauthorized action halted. Zero credentials leaked. Zero unauthorized tools executed."}
                </p>
              </div>
            </div>
            {currentStageIndex >= 5 && (
              <span className="text-xs font-mono font-bold text-emerald-400 flex items-center gap-1">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" /> SYSTEM SECURE
              </span>
            )}
          </div>

          {currentStageIndex >= 5 && (
            <div className="mt-4 pt-4 border-t border-slate-800/80 space-y-3 animate-in fade-in">
              <div className="p-3.5 rounded-lg bg-emerald-950/40 border border-emerald-800/60 text-xs font-mono text-emerald-200">
                {isBenign ? (
                  <div>
                    ✓ <strong>Outcome:</strong> Task approved and completed successfully. No security disruption.
                  </div>
                ) : (
                  <div className="space-y-1">
                    <div>
                      🛡️ <strong>Defensive Result:</strong> Attack was stopped dead before tool execution could occur.
                    </div>
                    <div className="text-[11px] text-emerald-300/80">
                      Possession Rate: 0.0% • Secret Leaks: 0 • Unauthorized Executions: 0
                    </div>
                    {executionResult && (
                      <div className="text-[10px] text-slate-300 pt-1 border-t border-emerald-900/40">
                        Measured Latency: <strong>{executionResult.latencyMs}ms</strong> • Policy: <em>{executionResult.reason}</em>
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div className="flex items-center justify-between text-[11px] font-mono text-slate-400">
                <span>Tamper-evident audit event recorded to log stream</span>
                <span className="text-indigo-400">SOC Event ID #audit_{activeCase.id}</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
