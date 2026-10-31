"use client";

import React, { useState } from "react";
import {
  FlaskConical,
  Play,
  RotateCcw,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Lock,
  Layers,
  Search,
  ChevronRight,
  Shield,
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
    }
  };

  // Run regression suite
  const handleRunRegression = async () => {
    await handleRunCategory("REGRESSION");
  };

  // Clear results
  const handleClearResults = () => {
    setResults({});
  };

  // Filter test cases
  const visibleCases = ALL_TEST_CASES.filter((tc) => {
    if (selectedCategory !== "ALL" && tc.category !== selectedCategory) return false;
    if (filterSeverity !== "ALL" && tc.severity !== filterSeverity) return false;
    if (filterSource !== "ALL" && tc.sourceType !== filterSource) return false;

    const res = results[tc.id];
    if (filterStatus === "PASS" && res && (res.finalResult === "MISSED_ATTACK" || res.finalResult === "FALSE_POSITIVE" || res.finalResult === "REGRESSION_FAILURE")) return false;
    if (filterStatus === "FAIL" && res && (res.finalResult === "BLOCKED_ATTACK" || res.finalResult === "ALLOWED_BENIGN_TASK")) return false;
    if (filterStatus === "FAIL" && !res) return false; // unrun

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

  // Calculate live stats of current visible run
  const executedCount = Object.keys(results).length;
  const blockedCount = Object.values(results).filter((r) => r.finalResult === "BLOCKED_ATTACK").length;
  const benignCount = Object.values(results).filter((r) => r.finalResult === "ALLOWED_BENIGN_TASK").length;
  const falsePositiveCount = Object.values(results).filter((r) => r.finalResult === "FALSE_POSITIVE").length;
  const missedCount = Object.values(results).filter((r) => r.finalResult === "MISSED_ATTACK").length;
  const regressionFailures = Object.values(results).filter((r) => r.finalResult === "REGRESSION_FAILURE").length;

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Header and Controls */}
      <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-6 backdrop-blur space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <div className="flex items-center space-x-2 text-indigo-400 font-mono text-xs uppercase tracking-widest mb-1">
              <FlaskConical className="w-4 h-4 text-indigo-400" />
              <span>Adversarial Testing Laboratory</span>
              <span>•</span>
              <span className="text-slate-400">138 Deterministic Test Cases</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
              ATTACK LAB BENCHMARK
            </h1>
            <p className="text-slate-400 text-xs sm:text-sm mt-1">
              Interactive test harness running the complete multi-layer security pipeline (Orchestrator → Security Gateway → Threat Analyzer → Policy Engine → Tool Gateway → Audit Logger).
            </p>
          </div>

          {/* Action Runner Buttons */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={handleRunAll}
              disabled={isRunning}
              className="inline-flex items-center space-x-2 px-3.5 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-800 disabled:text-slate-500 text-white text-xs font-semibold uppercase tracking-wider transition-all shadow-lg shadow-indigo-600/20 active:scale-95"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              <span>Run All 138 Cases</span>
            </button>

            <button
              onClick={() => handleRunCategory(selectedCategory)}
              disabled={isRunning}
              className="inline-flex items-center space-x-2 px-3.5 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-50 border border-slate-700 text-slate-200 text-xs font-semibold uppercase tracking-wider transition-all active:scale-95"
            >
              <Layers className="w-3.5 h-3.5 text-indigo-400" />
              <span>Run Selected Category</span>
            </button>

            <button
              onClick={handleRunRegression}
              disabled={isRunning}
              className="inline-flex items-center space-x-2 px-3.5 py-2 rounded-lg bg-amber-950/80 hover:bg-amber-900 border border-amber-800 text-amber-300 text-xs font-semibold uppercase tracking-wider transition-all active:scale-95"
            >
              <Lock className="w-3.5 h-3.5 text-amber-400" />
              <span>Run Regression Suite</span>
            </button>

            <button
              onClick={handleClearResults}
              disabled={isRunning || executedCount === 0}
              className="inline-flex items-center space-x-1.5 px-3 py-2 rounded-lg bg-slate-900 hover:bg-slate-800 disabled:opacity-30 border border-slate-800 text-slate-400 text-xs transition-all"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset</span>
            </button>
          </div>
        </div>

        {/* Progress Bar (when running) */}
        {isRunning && (
          <div className="rounded-lg bg-slate-950 border border-indigo-900/50 p-3 space-y-2 animate-pulse">
            <div className="flex items-center justify-between text-xs font-mono">
              <span className="text-indigo-400 flex items-center space-x-2">
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                <span>Running Pipeline: {runProgress.currentId}</span>
              </span>
              <span className="text-slate-400">
                {runProgress.completed} / {runProgress.total} (
                {Math.round((runProgress.completed / Math.max(runProgress.total, 1)) * 100)}%)
              </span>
            </div>
            <div className="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
              <div
                className="bg-indigo-500 h-1.5 rounded-full transition-all duration-150"
                style={{
                  width: `${(runProgress.completed / Math.max(runProgress.total, 1)) * 100}%`,
                }}
              />
            </div>
          </div>
        )}

        {/* Real-time metrics chip bar */}
        {executedCount > 0 && (
          <div className="pt-2 border-t border-slate-800/80 flex flex-wrap items-center gap-2 text-xs font-mono">
            <span className="text-slate-500">Session Results:</span>
            <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-300">
              Evaluated: {executedCount} / 138
            </span>
            <span className="px-2 py-0.5 rounded bg-emerald-950 border border-emerald-800 text-emerald-400">
              Blocked Attacks: {blockedCount}
            </span>
            <span className="px-2 py-0.5 rounded bg-cyan-950 border border-cyan-800 text-cyan-400">
              Allowed Benign: {benignCount}
            </span>
            {falsePositiveCount > 0 && (
              <span className="px-2 py-0.5 rounded bg-rose-950 border border-rose-800 text-rose-400">
                False Positives: {falsePositiveCount}
              </span>
            )}
            {missedCount > 0 && (
              <span className="px-2 py-0.5 rounded bg-rose-950 border border-rose-800 text-rose-400">
                Missed: {missedCount}
              </span>
            )}
            {regressionFailures > 0 && (
              <span className="px-2 py-0.5 rounded bg-rose-950 border border-rose-800 text-rose-400">
                Regression Fail: {regressionFailures}
              </span>
            )}
          </div>
        )}
      </div>

      {/* Category Tabs */}
      <div className="flex space-x-1.5 overflow-x-auto pb-2 scrollbar-none">
        {DATASET_CATEGORIES.map((cat) => {
          const isActive = selectedCategory === cat.id;
          return (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={`flex-shrink-0 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                isActive
                  ? "bg-indigo-600 text-white font-semibold shadow-md shadow-indigo-600/30"
                  : "bg-slate-900/60 hover:bg-slate-800 text-slate-400 hover:text-slate-200 border border-slate-800"
              }`}
            >
              <span>{cat.label}</span>
              <span className={`ml-1.5 font-mono text-[10px] px-1.5 py-0.2 rounded ${isActive ? "bg-indigo-700 text-white" : "bg-slate-800 text-slate-500"}`}>
                {cat.count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Filter and Search Bar */}
      <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-4 backdrop-blur space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3">
          {/* Search */}
          <div className="relative">
            <Search className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search ID, payload, or intent..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500"
            />
          </div>

          {/* Severity Filter */}
          <div>
            <select
              value={filterSeverity}
              onChange={(e) => setFilterSeverity(e.target.value)}
              className="w-full px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-xs text-slate-300 font-mono focus:outline-none focus:border-indigo-500"
            >
              <option value="ALL">Severity: All</option>
              <option value="CRITICAL">Critical</option>
              <option value="HIGH">High</option>
              <option value="MEDIUM">Medium</option>
              <option value="LOW">Low</option>
              <option value="NONE">None (Benign)</option>
            </select>
          </div>

          {/* Source Type Filter */}
          <div>
            <select
              value={filterSource}
              onChange={(e) => setFilterSource(e.target.value)}
              className="w-full px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-xs text-slate-300 font-mono focus:outline-none focus:border-indigo-500"
            >
              <option value="ALL">Source: All Sources</option>
              <option value="user_prompt">User Prompt</option>
              <option value="email_body">Email Body</option>
              <option value="webpage_content">Webpage Content</option>
              <option value="pdf_document">PDF Document</option>
              <option value="tool_parameters">Tool Parameters</option>
              <option value="regression_tripwire">Regression Tripwire</option>
            </select>
          </div>

          {/* Status Filter */}
          <div>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value as "ALL" | "PASS" | "FAIL")}
              className="w-full px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-xs text-slate-300 font-mono focus:outline-none focus:border-indigo-500"
            >
              <option value="ALL">Status: All (Passed & Failed)</option>
              <option value="PASS">Pass Only</option>
              <option value="FAIL">Fail Only</option>
            </select>
          </div>

          {/* Decision Filter */}
          <div>
            <select
              value={filterDecision}
              onChange={(e) => setFilterDecision(e.target.value as "ALL" | DecisionOutcome)}
              className="w-full px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-xs text-slate-300 font-mono focus:outline-none focus:border-indigo-500"
            >
              <option value="ALL">Decision: All Outcomes</option>
              <option value="BLOCK">BLOCK</option>
              <option value="APPROVE">APPROVE</option>
              <option value="REQUIRE_CONFIRMATION">REQUIRE_CONFIRMATION</option>
            </select>
          </div>

          {/* Classification Filter */}
          <div>
            <select
              value={filterClassification}
              onChange={(e) => setFilterClassification(e.target.value as "ALL" | FinalResultClassification)}
              className="w-full px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-xs text-slate-300 font-mono focus:outline-none focus:border-indigo-500"
            >
              <option value="ALL">Class: All Results</option>
              <option value="BLOCKED_ATTACK">Blocked Attack</option>
              <option value="ALLOWED_BENIGN_TASK">Allowed Benign</option>
              <option value="FALSE_POSITIVE">False Positive</option>
              <option value="MISSED_ATTACK">Missed Attack</option>
              <option value="REGRESSION_FAILURE">Regression Fail</option>
            </select>
          </div>
        </div>

        <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1">
          <span>Showing {visibleCases.length} of {ALL_TEST_CASES.length} test cases</span>
          {(searchQuery || filterSeverity !== "ALL" || filterSource !== "ALL" || filterStatus !== "ALL" || filterDecision !== "ALL" || filterClassification !== "ALL") && (
            <button
              onClick={() => {
                setSearchQuery("");
                setFilterSeverity("ALL");
                setFilterSource("ALL");
                setFilterStatus("ALL");
                setFilterDecision("ALL");
                setFilterClassification("ALL");
              }}
              className="text-indigo-400 hover:text-indigo-300 underline"
            >
              Reset Filters
            </button>
          )}
        </div>
      </div>

      {/* Main Results Table */}
      <div className="rounded-xl border border-slate-800 bg-slate-900/40 backdrop-blur overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-mono border-collapse">
            <thead>
              <tr className="border-b border-slate-800 bg-slate-950/80 text-[11px] text-slate-400 uppercase tracking-wider">
                <th className="py-3 px-3">Attack ID</th>
                <th className="py-3 px-3">Category</th>
                <th className="py-3 px-3">Severity</th>
                <th className="py-3 px-3">Source Type</th>
                <th className="py-3 px-3">Payload Preview</th>
                <th className="py-3 px-3">Exp Threat</th>
                <th className="py-3 px-3">Act Threat</th>
                <th className="py-3 px-3">Exp Decision</th>
                <th className="py-3 px-3">Act Decision</th>
                <th className="py-3 px-3">Tool Attempted?</th>
                <th className="py-3 px-3">Final Result</th>
                <th className="py-3 px-3 text-right">Latency</th>
                <th className="py-3 px-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {visibleCases.map((tc) => {
                const res = results[tc.id];
                return (
                  <tr
                    key={tc.id}
                    onClick={() => setInspectCase({ testCase: tc, result: res })}
                    className="hover:bg-slate-800/40 transition-colors cursor-pointer"
                  >
                    {/* Attack ID */}
                    <td className="py-2.5 px-3 font-bold text-white whitespace-nowrap">
                      {tc.id}
                    </td>

                    {/* Category */}
                    <td className="py-2.5 px-3 text-slate-300 whitespace-nowrap">
                      {tc.category.replace(/_/g, " ")}
                    </td>

                    {/* Severity */}
                    <td className="py-2.5 px-3">
                      <span
                        className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold ${
                          tc.severity === "CRITICAL"
                            ? "bg-rose-950 border border-rose-800 text-rose-300"
                            : tc.severity === "HIGH"
                            ? "bg-amber-950 border border-amber-800 text-amber-300"
                            : tc.severity === "MEDIUM"
                            ? "bg-indigo-950 border border-indigo-800 text-indigo-300"
                            : tc.severity === "LOW"
                            ? "bg-slate-800 text-slate-300"
                            : "bg-slate-900 border border-slate-800 text-slate-400"
                        }`}
                      >
                        {tc.severity}
                      </span>
                    </td>

                    {/* Source Type */}
                    <td className="py-2.5 px-3 text-slate-400 whitespace-nowrap text-[11px]">
                      {tc.sourceType}
                    </td>

                    {/* Payload Preview */}
                    <td className="py-2.5 px-3 text-slate-300 max-w-xs truncate" title={tc.payload}>
                      {tc.payload}
                    </td>

                    {/* Expected Threat */}
                    <td className="py-2.5 px-3 text-slate-400">
                      {tc.expectedThreat ? "YES" : "NO"}
                    </td>

                    {/* Actual Threat */}
                    <td className="py-2.5 px-3">
                      {res ? (
                        res.actualThreat ? (
                          <span className="text-rose-400 font-bold">YES</span>
                        ) : (
                          <span className="text-emerald-400">NO</span>
                        )
                      ) : (
                        <span className="text-slate-600">—</span>
                      )}
                    </td>

                    {/* Expected Decision */}
                    <td className="py-2.5 px-3 text-slate-400 font-mono">
                      {tc.expectedDecision}
                    </td>

                    {/* Actual Decision */}
                    <td className="py-2.5 px-3">
                      {res ? (
                        <span
                          className={`font-bold ${
                            res.actualDecision === "BLOCK"
                              ? "text-rose-400"
                              : res.actualDecision === "REQUIRE_CONFIRMATION"
                              ? "text-amber-400"
                              : "text-emerald-400"
                          }`}
                        >
                          {res.actualDecision}
                        </span>
                      ) : (
                        <span className="text-slate-600">—</span>
                      )}
                    </td>

                    {/* Tool Attempted? */}
                    <td className="py-2.5 px-3 text-slate-400">
                      {res ? (res.toolExecutionAttempted ? "YES" : "NO") : "—"}
                    </td>

                    {/* Final Result Classification Badge */}
                    <td className="py-2.5 px-3 whitespace-nowrap">
                      {res ? (
                        res.finalResult === "BLOCKED_ATTACK" ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-950/90 border border-emerald-800 text-emerald-300">
                            <CheckCircle2 className="w-3 h-3 mr-1 text-emerald-400" />
                            BLOCKED ATTACK
                          </span>
                        ) : res.finalResult === "ALLOWED_BENIGN_TASK" ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-cyan-950/90 border border-cyan-800 text-cyan-300">
                            <CheckCircle2 className="w-3 h-3 mr-1 text-cyan-400" />
                            ALLOWED BENIGN TASK
                          </span>
                        ) : res.finalResult === "FALSE_POSITIVE" ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-amber-950/90 border border-amber-800 text-amber-300">
                            <AlertTriangle className="w-3 h-3 mr-1 text-amber-400" />
                            FALSE POSITIVE
                          </span>
                        ) : res.finalResult === "REGRESSION_FAILURE" ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-rose-950/90 border border-rose-800 text-rose-300">
                            <XCircle className="w-3 h-3 mr-1 text-rose-400" />
                            REGRESSION FAILURE
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-rose-950/90 border border-rose-800 text-rose-300">
                            <XCircle className="w-3 h-3 mr-1 text-rose-400" />
                            MISSED ATTACK
                          </span>
                        )
                      ) : (
                        <span className="text-[11px] text-slate-600 font-sans">Ready</span>
                      )}
                    </td>

                    {/* Latency */}
                    <td className="py-2.5 px-3 text-right font-mono text-slate-400">
                      {res ? `${res.latencyMs}ms` : "—"}
                    </td>

                    {/* Run Single Button */}
                    <td className="py-2.5 px-3 text-right whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                      <button
                        onClick={() => handleRunOne(tc)}
                        disabled={isRunning}
                        className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px] font-medium transition-colors"
                      >
                        Run
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Test Case Inspection Modal */}
      {inspectCase && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="max-w-2xl w-full rounded-xl border border-slate-800 bg-slate-900 p-6 space-y-4 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center space-x-2">
                <Shield className="w-5 h-5 text-indigo-400" />
                <h3 className="font-bold text-white text-base">
                  Test Case #{inspectCase.testCase.id} Inspection
                </h3>
              </div>
              <button
                onClick={() => setInspectCase(null)}
                className="text-slate-400 hover:text-white text-xs px-2.5 py-1 rounded bg-slate-800"
              >
                Close
              </button>
            </div>

            {/* Overview Grid */}
            <div className="grid grid-cols-2 gap-3 text-xs font-mono">
              <div>
                <span className="text-slate-500">Name:</span>
                <div className="text-white font-bold">{inspectCase.testCase.name}</div>
              </div>
              <div>
                <span className="text-slate-500">Category:</span>
                <div className="text-indigo-300">{inspectCase.testCase.category}</div>
              </div>
              <div>
                <span className="text-slate-500">Severity:</span>
                <div className="text-amber-300">{inspectCase.testCase.severity}</div>
              </div>
              <div>
                <span className="text-slate-500">Source Type:</span>
                <div className="text-slate-300">{inspectCase.testCase.sourceType}</div>
              </div>
              <div>
                <span className="text-slate-500">User Intent:</span>
                <div className="text-slate-300">{inspectCase.testCase.userIntent}</div>
              </div>
              <div>
                <span className="text-slate-500">Expected Outcome:</span>
                <div className="text-white font-bold">{inspectCase.testCase.expectedDecision}</div>
              </div>
            </div>

            {/* Full Payload */}
            <div className="space-y-1">
              <span className="text-xs font-mono text-slate-500">Full Raw Payload:</span>
              <pre className="p-3 rounded-lg bg-slate-950 border border-slate-800 text-xs font-mono text-slate-200 whitespace-pre-wrap break-all max-h-48 overflow-y-auto">
                {inspectCase.testCase.payload}
              </pre>
            </div>

            {/* Run Execution Result (if evaluated) */}
            {inspectCase.result && (
              <div className="rounded-lg bg-slate-950 border border-slate-800 p-4 space-y-3">
                <div className="flex items-center justify-between text-xs font-mono">
                  <span className="text-slate-400">Execution Result:</span>
                  <span className="font-bold text-emerald-400">
                    {inspectCase.result.finalResult} ({inspectCase.result.latencyMs}ms)
                  </span>
                </div>
                <div className="text-xs font-mono space-y-1">
                  <div className="text-slate-500">Policy Reason:</div>
                  <div className="text-slate-300 p-2 rounded bg-slate-900 border border-slate-800">
                    {inspectCase.result.reason}
                  </div>
                </div>

                {inspectCase.result.threatIndicators.length > 0 && (
                  <div className="space-y-1">
                    <span className="text-xs font-mono text-slate-500">Threat Indicators Detected:</span>
                    <ul className="list-disc list-inside text-xs font-mono text-rose-300 space-y-0.5">
                      {inspectCase.result.threatIndicators.map((ind, i) => (
                        <li key={i}>{ind}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}

            {/* Bottom Actions */}
            <div className="flex items-center justify-between pt-2 border-t border-slate-800">
              <button
                onClick={() => {
                  if (onLaunchDemoWithCase) {
                    onLaunchDemoWithCase(inspectCase.testCase);
                  }
                }}
                className="text-xs font-semibold uppercase tracking-wider text-indigo-400 hover:text-indigo-300 flex items-center space-x-1"
              >
                <span>Launch in Live Attack Demo</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>

              <button
                onClick={async () => {
                  const res = await defaultPipelineRunner.runTestCase(inspectCase.testCase);
                  setResults((prev) => ({ ...prev, [inspectCase.testCase.id]: res }));
                  setInspectCase({ testCase: inspectCase.testCase, result: res });
                }}
                className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold"
              >
                Re-Run Case
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
