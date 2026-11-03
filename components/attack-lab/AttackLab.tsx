"use client";

import React, { useState } from "react";
import {
  FlaskConical,
  Play,
  RotateCcw,
  Lock,
  Layers,
  Search,
  RefreshCw,
} from "lucide-react";
import {
  UnifiedTestCase,
  AttackExecutionResult,
  DecisionOutcome,
  FinalResultClassification,
} from "@/lib/attack-lab/types";
import {
  ALL_TEST_CASES,
  DATASET_CATEGORIES,
  getTestCasesByCategory,
} from "@/lib/attack-lab/dataset-loader";
import { defaultPipelineRunner } from "@/lib/attack-lab/pipeline-runner";
import { broadcastTelemetryUpdate } from "@/lib/telemetry/telemetry-sync";

interface AttackLabProps {
  initialCategory?: string;
  onLaunchDemoWithCase?: (testCase: UnifiedTestCase) => void;
}

export function AttackLab({ initialCategory = "ALL", onLaunchDemoWithCase }: AttackLabProps) {
  const [selectedCategory, setSelectedCategory] = useState<string>(initialCategory);
  const [results, setResults] = useState<Record<string, AttackExecutionResult>>({});
  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [runProgress, setRunProgress] = useState<{ completed: number; total: number; currentId: string }>({
    completed: 0,
    total: 0,
    currentId: "",
  });

  // Filter states
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [filterSeverity, setFilterSeverity] = useState<string>("ALL");
  const [filterSource, setFilterSource] = useState<string>("ALL");
  const [filterStatus, setFilterStatus] = useState<"ALL" | "PASS" | "FAIL">("ALL");
  const [filterDecision, setFilterDecision] = useState<"ALL" | DecisionOutcome>("ALL");
  const [filterClassification, setFilterClassification] = useState<"ALL" | FinalResultClassification>("ALL");

  // Inspection Drawer
  const [inspectCase, setInspectCase] = useState<{
    testCase: UnifiedTestCase;
    result?: AttackExecutionResult;
  } | null>(null);

  // Run a single test case
  const handleRunOne = async (testCase: UnifiedTestCase) => {
    setIsRunning(true);
    setRunProgress({ completed: 0, total: 1, currentId: testCase.id });
    try {
      const res = await defaultPipelineRunner.runTestCase(testCase);
      setResults((prev) => ({ ...prev, [testCase.id]: res }));
    } finally {
      setIsRunning(false);
      setRunProgress({ completed: 1, total: 1, currentId: "DONE" });
    }
  };

  // Run an entire category
  const handleRunCategory = async (category: string) => {
    const casesToRun = getTestCasesByCategory(category);
    setIsRunning(true);
    setRunProgress({ completed: 0, total: casesToRun.length, currentId: "" });
    try {
      for (let i = 0; i < casesToRun.length; i++) {
        const tc = casesToRun[i];
        setRunProgress({ completed: i, total: casesToRun.length, currentId: tc.id });
        const res = await defaultPipelineRunner.runTestCase(tc);
        setResults((prev) => ({ ...prev, [tc.id]: res }));
      }
    } finally {
      setIsRunning(false);
      setRunProgress({ completed: casesToRun.length, total: casesToRun.length, currentId: "DONE" });
      broadcastTelemetryUpdate({ source: "attack-lab", type: "CATEGORY_RUN_COMPLETE" });
    }
  };

  // Run all 138 cases
  const handleRunAll = async () => {
    setIsRunning(true);
    setRunProgress({ completed: 0, total: ALL_TEST_CASES.length, currentId: "" });
    try {
      for (let i = 0; i < ALL_TEST_CASES.length; i++) {
        const tc = ALL_TEST_CASES[i];
        setRunProgress({ completed: i, total: ALL_TEST_CASES.length, currentId: tc.id });
        const res = await defaultPipelineRunner.runTestCase(tc);
        setResults((prev) => ({ ...prev, [tc.id]: res }));
      }
    } finally {
      setIsRunning(false);
      setRunProgress({ completed: ALL_TEST_CASES.length, total: ALL_TEST_CASES.length, currentId: "DONE" });
      broadcastTelemetryUpdate({ source: "attack-lab", type: "ALL_RUN_COMPLETE" });
    }
  };

  // Run regression suite only
  const handleRunRegression = async () => {
    await handleRunCategory("REGRESSION");
  };

  const handleClearResults = () => {
    setResults({});
    setRunProgress({ completed: 0, total: 0, currentId: "" });
    broadcastTelemetryUpdate({ source: "attack-lab", type: "RESULTS_CLEARED" });
  };

  // Filter test cases
  const categoryCases = getTestCasesByCategory(selectedCategory);
  const filteredCases = categoryCases.filter((tc) => {
    const res = results[tc.id];

    if (filterSeverity !== "ALL" && tc.severity !== filterSeverity) return false;
    if (filterSource !== "ALL" && tc.sourceType !== filterSource) return false;
    const isPassed = res ? (res.finalResult === "BLOCKED_ATTACK" || res.finalResult === "ALLOWED_BENIGN_TASK") : false;
    if (filterStatus === "PASS" && (!res || !isPassed)) return false;
    if (filterStatus === "FAIL" && (!res || isPassed)) return false;
    if (filterDecision !== "ALL" && res && res.actualDecision !== filterDecision) return false;
    if (filterClassification !== "ALL" && res && res.finalResult !== filterClassification) return false;

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchId = tc.id.toLowerCase().includes(q);
      const matchName = tc.name.toLowerCase().includes(q);
      const matchPayload = tc.payload.toLowerCase().includes(q);
      const matchIntent = tc.userIntent.toLowerCase().includes(q);
      if (!matchId && !matchName && !matchPayload && !matchIntent) return false;
    }

    return true;
  });

  const executedCount = Object.keys(results).length;
  const blockedCount = Object.values(results).filter((r) => r.finalResult === "BLOCKED_ATTACK").length;
  const benignCount = Object.values(results).filter((r) => r.finalResult === "ALLOWED_BENIGN_TASK").length;

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Header and Controls */}
      <div className="rounded-2xl border border-[#E8ECE9] bg-white p-6 shadow-sm space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <div className="flex items-center space-x-2 text-[#678882] font-mono text-xs uppercase tracking-widest mb-1">
              <FlaskConical className="w-4 h-4 text-[#2E595A]" />
              <span>Adversarial Testing Laboratory</span>
              <span>•</span>
              <span className="text-[#C9A86A]">138 Deterministic Test Cases</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-serif font-bold text-[#052326]">
              Adversarial Attack Lab
            </h1>
            <p className="text-[#2E595A] text-xs sm:text-sm mt-1">
              Interactive test harness running the complete multi-layer security pipeline (Orchestrator → Security Gateway → Threat Analyzer → Policy Engine → Tool Gateway → Audit Logger).
            </p>
          </div>

          {/* Action Runner Buttons */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={handleRunAll}
              disabled={isRunning}
              className="inline-flex items-center space-x-2 px-3.5 py-2 rounded-xl bg-[#052326] hover:bg-[#2E595A] disabled:opacity-50 text-white text-xs font-semibold uppercase tracking-wider transition-all shadow-sm active:scale-95"
            >
              <Play className="w-3.5 h-3.5 fill-current text-[#C9A86A]" />
              <span>Run All 138 Cases</span>
            </button>

            <button
              onClick={() => handleRunCategory(selectedCategory)}
              disabled={isRunning}
              className="inline-flex items-center space-x-2 px-3.5 py-2 rounded-xl bg-white hover:bg-[#FBF9F8] disabled:opacity-50 border border-[#E8ECE9] text-[#052326] text-xs font-semibold uppercase tracking-wider transition-all"
            >
              <Layers className="w-3.5 h-3.5 text-[#2E595A]" />
              <span>Run Selected Category</span>
            </button>

            <button
              onClick={handleRunRegression}
              disabled={isRunning}
              className="inline-flex items-center space-x-2 px-3.5 py-2 rounded-xl bg-[#FAF5EB] hover:bg-[#F3EDE0] border border-[#C9A86A]/40 text-[#052326] text-xs font-semibold uppercase tracking-wider transition-all"
            >
              <Lock className="w-3.5 h-3.5 text-[#C9A86A]" />
              <span>Run Regression Suite</span>
            </button>

            <button
              onClick={handleClearResults}
              disabled={isRunning || executedCount === 0}
              className="inline-flex items-center space-x-1.5 px-3 py-2 rounded-xl bg-[#FBF9F8] hover:bg-[#EBF1ED] disabled:opacity-30 border border-[#E8ECE9] text-[#678882] text-xs transition-all"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset</span>
            </button>
          </div>
        </div>

        {/* Progress Bar (when running) */}
        {isRunning && (
          <div className="rounded-xl bg-[#FBF9F8] border border-[#E8ECE9] p-3 space-y-2 animate-pulse">
            <div className="flex items-center justify-between text-xs font-mono">
              <span className="text-[#2E595A] flex items-center space-x-2 font-semibold">
                <RefreshCw className="w-3.5 h-3.5 animate-spin text-[#C9A86A]" />
                <span>Running Pipeline: {runProgress.currentId}</span>
              </span>
              <span className="text-[#678882]">
                {runProgress.completed} / {runProgress.total} (
                {Math.round((runProgress.completed / Math.max(runProgress.total, 1)) * 100)}%)
              </span>
            </div>
            <div className="w-full bg-[#E8ECE9] rounded-full h-1.5 overflow-hidden">
              <div
                className="bg-[#052326] h-1.5 rounded-full transition-all duration-150"
                style={{
                  width: `${(runProgress.completed / Math.max(runProgress.total, 1)) * 100}%`,
                }}
              />
            </div>
          </div>
        )}

        {/* Real-time metrics chip bar */}
        {executedCount > 0 && (
          <div className="pt-2 border-t border-[#E8ECE9] flex flex-wrap items-center gap-2 text-xs font-mono">
            <span className="text-[#678882]">Session Results:</span>
            <span className="px-2 py-0.5 rounded bg-[#FBF9F8] border border-[#E8ECE9] text-[#052326]">
              Evaluated: {executedCount} / 138
            </span>
            <span className="px-2 py-0.5 rounded bg-[#FAF5EB] border border-[#C9A86A]/40 text-[#C9A86A] font-bold">
              Blocked Attacks: {blockedCount}
            </span>
            <span className="px-2 py-0.5 rounded bg-[#EBF1ED] border border-[#A5B5A9]/40 text-[#2E595A] font-bold">
              Allowed Benign: {benignCount}
            </span>
          </div>
        )}
      </div>

      {/* Category Tabs */}
      <div className="flex space-x-1.5 overflow-x-auto pb-2">
        {DATASET_CATEGORIES.map((cat) => {
          const isActive = selectedCategory === cat.id;
          return (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={`flex-shrink-0 px-3.5 py-1.5 rounded-xl text-xs font-medium transition-all ${
                isActive
                  ? "bg-[#052326] text-white font-semibold shadow-sm"
                  : "bg-white hover:bg-[#FBF9F8] text-[#2E595A] border border-[#E8ECE9]"
              }`}
            >
              <span>{cat.label}</span>
              <span className={`ml-1.5 font-mono text-[10px] px-1.5 py-0.2 rounded ${isActive ? "bg-white text-[#052326]" : "bg-[#F3F6F4] text-[#678882]"}`}>
                {cat.count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Filter and Search Bar */}
      <div className="rounded-2xl border border-[#E8ECE9] bg-white p-4 shadow-sm space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3">
          <div className="relative">
            <Search className="w-4 h-4 text-[#678882] absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search ID, payload..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 rounded-lg bg-[#FBF9F8] border border-[#E8ECE9] text-xs text-[#052326] placeholder-[#678882] focus:outline-none focus:border-[#C9A86A]"
            />
          </div>

          <div>
            <select
              value={filterSeverity}
              onChange={(e) => setFilterSeverity(e.target.value)}
              className="w-full px-3 py-1.5 rounded-lg bg-[#FBF9F8] border border-[#E8ECE9] text-xs text-[#052326] font-mono"
            >
              <option value="ALL">Severity: All</option>
              <option value="CRITICAL">Critical</option>
              <option value="HIGH">High</option>
              <option value="MEDIUM">Medium</option>
              <option value="LOW">Low</option>
              <option value="NONE">None (Benign)</option>
            </select>
          </div>

          <div>
            <select
              value={filterSource}
              onChange={(e) => setFilterSource(e.target.value)}
              className="w-full px-3 py-1.5 rounded-lg bg-[#FBF9F8] border border-[#E8ECE9] text-xs text-[#052326] font-mono"
            >
              <option value="ALL">Source: All</option>
              <option value="user_prompt">User Prompt</option>
              <option value="email_body">Email Body</option>
              <option value="webpage_content">Webpage Content</option>
              <option value="pdf_document">PDF Document</option>
              <option value="tool_parameters">Tool Parameters</option>
              <option value="regression_tripwire">Regression</option>
            </select>
          </div>

          <div>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value as "ALL" | "PASS" | "FAIL")}
              className="w-full px-3 py-1.5 rounded-lg bg-[#FBF9F8] border border-[#E8ECE9] text-xs text-[#052326] font-mono"
            >
              <option value="ALL">Status: All</option>
              <option value="PASS">Pass Only</option>
              <option value="FAIL">Fail Only</option>
            </select>
          </div>

          <div>
            <select
              value={filterDecision}
              onChange={(e) => setFilterDecision(e.target.value as "ALL" | DecisionOutcome)}
              className="w-full px-3 py-1.5 rounded-lg bg-[#FBF9F8] border border-[#E8ECE9] text-xs text-[#052326] font-mono"
            >
              <option value="ALL">Decision: All</option>
              <option value="BLOCK">BLOCK</option>
              <option value="APPROVE">APPROVE</option>
              <option value="REQUIRE_CONFIRMATION">REQUIRE_CONFIRMATION</option>
            </select>
          </div>

          <div>
            <select
              value={filterClassification}
              onChange={(e) => setFilterClassification(e.target.value as "ALL" | FinalResultClassification)}
              className="w-full px-3 py-1.5 rounded-lg bg-[#FBF9F8] border border-[#E8ECE9] text-xs text-[#052326] font-mono"
            >
              <option value="ALL">Class: All</option>
              <option value="BLOCKED_ATTACK">Blocked Attack</option>
              <option value="ALLOWED_BENIGN_TASK">Allowed Benign</option>
            </select>
          </div>
        </div>
      </div>

      {/* Test Cases Table */}
      <div className="rounded-2xl border border-[#E8ECE9] bg-white shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-mono">
            <thead className="bg-[#FBF9F8] border-b border-[#E8ECE9] text-[10px] uppercase text-[#678882] tracking-wider">
              <tr>
                <th className="py-3 px-4">Test ID</th>
                <th className="py-3 px-4">Category</th>
                <th className="py-3 px-4">Severity</th>
                <th className="py-3 px-4">Source</th>
                <th className="py-3 px-4">Target Payload</th>
                <th className="py-3 px-4">Expected</th>
                <th className="py-3 px-4">Actual Result</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E8ECE9]">
              {filteredCases.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-[#678882]">
                    No test cases match filter.
                  </td>
                </tr>
              ) : (
                filteredCases.map((tc) => {
                  const res = results[tc.id];
                  const hasRun = Boolean(res);

                  return (
                    <tr
                      key={tc.id}
                      className="hover:bg-[#FBF9F8] transition-colors cursor-pointer group"
                      onClick={() => setInspectCase({ testCase: tc, result: res })}
                    >
                      <td className="py-3 px-4 font-bold text-[#052326] whitespace-nowrap">
                        {tc.id}
                      </td>
                      <td className="py-3 px-4 text-[#2E595A] whitespace-nowrap">
                        {tc.category}
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap">
                        <span
                          className={`text-[10px] px-2 py-0.5 rounded font-bold ${
                            tc.severity === "CRITICAL"
                              ? "bg-[#FAF5EB] text-[#C9A86A] border border-[#C9A86A]/40"
                              : "bg-[#F3F6F4] text-[#2E595A]"
                          }`}
                        >
                          {tc.severity}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-[#678882] whitespace-nowrap">
                        {tc.sourceType}
                      </td>
                      <td className="py-3 px-4 text-[#052326] max-w-xs truncate">
                        {tc.payload}
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap">
                        <span className="text-[10px] text-[#678882]">
                          {tc.expectedDecision}
                        </span>
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap">
                        {hasRun ? (
                          <span
                            className={`text-[10px] px-2 py-0.5 rounded font-bold ${
                              res.finalResult === "BLOCKED_ATTACK" || res.finalResult === "ALLOWED_BENIGN_TASK"
                                ? "bg-[#FAF5EB] text-[#C9A86A] border border-[#C9A86A]/40"
                                : "bg-rose-50 text-rose-700"
                            }`}
                          >
                            {res.actualDecision} ({res.finalResult})
                          </span>
                        ) : (
                          <span className="text-[10px] text-[#A5B5A9]">Unexecuted</span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-right whitespace-nowrap">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleRunOne(tc);
                          }}
                          className="px-2.5 py-1 rounded bg-[#052326] hover:bg-[#2E595A] text-white text-[10px] font-bold"
                        >
                          Run
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Inspect Case Drawer */}
      {inspectCase && (
        <div className="fixed inset-0 z-50 bg-[#052326]/30 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-[#E8ECE9] max-w-xl w-full p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[#E8ECE9]">
              <div className="flex items-center space-x-2">
                <span className="font-serif font-bold text-base text-[#052326]">
                  Case Inspection: [{inspectCase.testCase.id}]
                </span>
              </div>
              <button
                onClick={() => setInspectCase(null)}
                className="text-[#678882] hover:text-[#052326] text-xs font-mono"
              >
                ✕ Close
              </button>
            </div>

            <div className="space-y-2 text-xs font-mono">
              <div className="p-3 rounded-lg bg-[#FBF9F8] border border-[#E8ECE9] space-y-1">
                <div>Name: {inspectCase.testCase.name}</div>
                <div>Category: {inspectCase.testCase.category}</div>
                <div>Severity: {inspectCase.testCase.severity}</div>
                <div>User Intent: {inspectCase.testCase.userIntent}</div>
                <div>Expected Decision: {inspectCase.testCase.expectedDecision}</div>
              </div>

              <div>
                <span className="text-[10px] uppercase font-bold text-[#678882] tracking-wider block mb-1">
                  Target Payload:
                </span>
                <pre className="p-2.5 rounded bg-[#FAF5EB] border border-[#C9A86A]/30 text-[#052326] text-[11px] overflow-x-auto whitespace-pre-wrap">
                  {inspectCase.testCase.payload}
                </pre>
              </div>

              {inspectCase.result && (
                <div className="p-3 rounded-lg bg-[#EBF1ED] border border-[#A5B5A9]/40 space-y-1">
                  <div className="font-bold text-[#2E595A]">
                    Execution Result: {inspectCase.result.finalResult}
                  </div>
                  <div>Actual Decision: {inspectCase.result.actualDecision}</div>
                  <div>Latency: {inspectCase.result.latencyMs.toFixed(1)}ms</div>
                  <div className="text-[11px] text-[#678882] pt-1">
                    Reason: {inspectCase.result.reason}
                  </div>
                </div>
              )}
            </div>

            <div className="pt-3 border-t border-[#E8ECE9] flex justify-end space-x-2">
              <button
                onClick={() => setInspectCase(null)}
                className="px-3 py-1.5 rounded-lg border border-[#E8ECE9] text-xs text-[#678882] hover:text-[#052326]"
              >
                Dismiss
              </button>
              {onLaunchDemoWithCase && (
                <button
                  onClick={() => {
                    const tc = inspectCase.testCase;
                    setInspectCase(null);
                    onLaunchDemoWithCase(tc);
                  }}
                  className="px-3 py-1.5 rounded-lg bg-[#052326] text-white text-xs font-semibold hover:bg-[#2E595A]"
                >
                  Launch in Live Simulator
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
