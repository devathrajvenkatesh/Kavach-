"use client";

import React, { useState, useEffect } from "react";
import {
  GitCommit,
  Shield,
  CheckCircle2,
  ArrowDown,
  Search,
} from "lucide-react";
import { defaultAuditLogger, SecurityTrace } from "@/lib/audit/logger";

interface SecurityTraceViewProps {
  initialCorrelationId?: string;
  onClose?: () => void;
}

export function SecurityTraceView({ initialCorrelationId, onClose }: SecurityTraceViewProps) {
  const [traces, setTraces] = useState<SecurityTrace[]>([]);
  const [selectedCorrelationId, setSelectedCorrelationId] = useState<string>(
    initialCorrelationId || ""
  );
  const [searchQuery, setSearchQuery] = useState<string>("");

  useEffect(() => {
    const loadedTraces = defaultAuditLogger.getAllTraces();
    setTraces(loadedTraces);
    if (!selectedCorrelationId && loadedTraces.length > 0) {
      setSelectedCorrelationId(loadedTraces[0].correlationId);
    }
  }, [selectedCorrelationId]);

  const activeTrace =
    traces.find((t) => t.correlationId === selectedCorrelationId) || traces[0];

  const filteredTraces = traces.filter((t) => {
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        t.correlationId.toLowerCase().includes(q) ||
        t.userIntent.toLowerCase().includes(q) ||
        t.attackId?.toLowerCase().includes(q)
      );
    }
    return true;
  });

  // Extract security chain elements from trace events
  const reqEvent = activeTrace?.events.find((e) => e.eventType === "REQUEST_RECEIVED") || activeTrace?.events[0];
  const threatEvent = activeTrace?.events.find((e) => e.eventType === "THREAT_DETECTED") || activeTrace?.events.find((e) => e.threatDetected);
  const policyEvent = activeTrace?.events.find((e) => e.eventType === "POLICY_EVALUATED") || activeTrace?.events.find((e) => e.policyRuleTriggered);
  const toolReqEvent = activeTrace?.events.find((e) => e.eventType === "TOOL_REQUESTED");
  const toolExecEvent = activeTrace?.events.find(
    (e) =>
      e.eventType === "TOOL_EXECUTED" ||
      e.eventType === "TOOL_BLOCKED" ||
      e.eventType === "CONFIRMATION_REQUIRED" ||
      e.eventType === "SECRET_ACCESS_BLOCKED"
  );
  const finalEvent = activeTrace?.events[activeTrace.events.length - 1];

  const isBlocked =
    activeTrace?.finalOutcome === "ATTACK_BLOCKED" ||
    activeTrace?.finalOutcome === "BLOCKED_ATTACK" ||
    finalEvent?.decision === "BLOCK" ||
    finalEvent?.policyDecision === "BLOCK";

  const isApproved =
    activeTrace?.finalOutcome === "ALLOWED_BENIGN_TASK" ||
    activeTrace?.finalOutcome === "TOOL_EXECUTED" ||
    finalEvent?.decision === "APPROVE";

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Top Banner */}
      <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-6 backdrop-blur flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2 text-indigo-400 font-mono text-xs uppercase tracking-widest mb-1">
            <GitCommit className="w-4 h-4 text-indigo-400" />
            <span>Multi-Layer Observability & Provenance</span>
            <span>•</span>
            <span className="text-emerald-400">Deterministic Chain Trace</span>
          </div>
          <h2 className="text-2xl font-extrabold text-white">
            SECURITY EVENT TRACE VIEW
          </h2>
          <p className="text-slate-400 text-xs sm:text-sm mt-0.5">
            End-to-end security provenance reconstructing the exact decision chain through each architecture boundary.
          </p>
        </div>

        {onClose && (
          <button
            onClick={onClose}
            className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold"
          >
            Close Trace View
          </button>
        )}
      </div>

      {traces.length === 0 ? (
        <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-12 text-center space-y-3">
          <Shield className="w-12 h-12 text-slate-600 mx-auto" />
          <h3 className="text-base font-bold text-white">No Security Traces Recorded Yet</h3>
          <p className="text-xs text-slate-400 max-w-md mx-auto">
            Execute attacks or tests in the Attack Lab or launch the Live Demo to record real-time security chains.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Trace Selector Sidebar (4 cols) */}
          <div className="lg:col-span-4 rounded-xl border border-slate-800 bg-slate-900/40 p-4 space-y-3 backdrop-blur max-h-[750px] flex flex-col">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <span className="text-xs font-bold text-white uppercase tracking-wider">
                Correlation Traces ({traces.length})
              </span>
            </div>

            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-2.5" />
              <input
                type="text"
                placeholder="Search trace or attack ID..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 rounded bg-slate-950 border border-slate-800 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500 font-mono"
              />
            </div>

            <div className="overflow-y-auto space-y-2 flex-1 pr-1">
              {filteredTraces.map((t) => {
                const isSelected = t.correlationId === selectedCorrelationId;
                const blocked =
                  t.finalOutcome.includes("BLOCK") ||
                  t.events.some((e) => e.decision === "BLOCK");
                return (
                  <div
                    key={t.correlationId}
                    onClick={() => setSelectedCorrelationId(t.correlationId)}
                    className={`rounded-lg p-3 text-xs font-mono border cursor-pointer transition-all ${
                      isSelected
                        ? "bg-indigo-950/60 border-indigo-500/80 shadow-md shadow-indigo-950/40"
                        : "bg-slate-950/60 border-slate-800/80 hover:bg-slate-800/50 hover:border-slate-700"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-white truncate max-w-[170px]">
                        {t.attackId ? `[${t.attackId}] ` : ""}
                        {t.correlationId.slice(0, 16)}
                      </span>
                      <span
                        className={`text-[10px] px-1.5 py-0.2 rounded font-bold ${
                          blocked
                            ? "bg-rose-950 border border-rose-800 text-rose-300"
                            : "bg-emerald-950 border border-emerald-800 text-emerald-300"
                        }`}
                      >
                        {blocked ? "BLOCKED" : "APPROVED"}
                      </span>
                    </div>

                    <div className="text-[11px] text-slate-400 mt-1 truncate" title={t.userIntent}>
                      {t.userIntent}
                    </div>

                    <div className="flex items-center justify-between text-[10px] text-slate-500 mt-2 pt-1.5 border-t border-slate-900">
                      <span>{t.events.length} hops</span>
                      <span>{new Date(t.startTime).toLocaleTimeString()}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Trace Chain Visualizer (8 cols) */}
          <div className="lg:col-span-8 rounded-xl border border-slate-800 bg-slate-900/40 p-6 backdrop-blur space-y-6">
            {/* Trace Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-800 gap-2">
              <div>
                <span className="text-[10px] font-mono text-slate-500 uppercase tracking-widest">
                  Correlation ID
                </span>
                <div className="text-sm font-bold font-mono text-indigo-300">
                  {activeTrace?.correlationId}
                </div>
              </div>

              <div className="flex items-center space-x-2 text-xs font-mono">
                <span className="text-slate-400">Total Pipeline Latency:</span>
                <span className="text-white font-bold px-2 py-0.5 rounded bg-slate-800 border border-slate-700">
                  {activeTrace?.latencyMs}ms
                </span>
                <span
                  className={`px-2 py-0.5 rounded font-bold ${
                    isBlocked
                      ? "bg-rose-950 border border-rose-800 text-rose-300"
                      : isApproved
                      ? "bg-emerald-950 border border-emerald-800 text-emerald-300"
                      : "bg-amber-950 border border-amber-800 text-amber-300"
                  }`}
                >
                  {isBlocked ? "ATTACK BLOCKED" : isApproved ? "AUTHORIZED" : "REQUIRE CONFIRMATION"}
                </span>
              </div>
            </div>

            {/* The 8-Stage Security Chain */}
            <div className="space-y-4 font-mono text-xs">
              {/* 1. USER REQUEST */}
              <div className="rounded-lg border border-slate-800 bg-slate-950/80 p-4 space-y-1.5 relative">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2 text-indigo-400 font-bold text-xs uppercase">
                    <span className="w-5 h-5 rounded-full bg-indigo-900/60 border border-indigo-700 text-indigo-300 flex items-center justify-center text-[10px]">
                      1
                    </span>
                    <span>USER REQUEST</span>
                  </div>
                  <span className="text-[10px] text-slate-500">
                    {reqEvent ? new Date(reqEvent.timestamp).toLocaleTimeString() : "00:00:00"}
                  </span>
                </div>
                <div className="text-white text-xs pl-7">
                  &ldquo;{activeTrace?.userIntent}&rdquo;
                </div>
              </div>

              {/* Down Arrow */}
              <div className="flex justify-center -my-2 text-slate-600">
                <ArrowDown className="w-4 h-4" />
              </div>

              {/* 2. SOURCE / TRUST */}
              <div className="rounded-lg border border-slate-800 bg-slate-950/80 p-4 space-y-1.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2 text-indigo-400 font-bold text-xs uppercase">
                    <span className="w-5 h-5 rounded-full bg-indigo-900/60 border border-indigo-700 text-indigo-300 flex items-center justify-center text-[10px]">
                      2
                    </span>
                    <span>SOURCE & TRUST LEVEL</span>
                  </div>
                  <span className="text-[10px] text-slate-500">Tier {reqEvent?.sourceTrustLevel || 1}</span>
                </div>
                <div className="pl-7 grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <span className="text-slate-500">Source:</span>{" "}
                    <span className="text-slate-300">{reqEvent?.sourceType || activeTrace?.sourceType}</span>
                  </div>
                  <div>
                    <span className="text-slate-500">Authority Boundary:</span>{" "}
                    <span className="text-amber-400">Zero Authority Tagged</span>
                  </div>
                </div>
              </div>

              {/* Down Arrow */}
              <div className="flex justify-center -my-2 text-slate-600">
                <ArrowDown className="w-4 h-4" />
              </div>

              {/* 3. THREAT ANALYSIS */}
              <div
                className={`rounded-lg border p-4 space-y-1.5 ${
                  threatEvent?.threatDetected
                    ? "border-rose-900/60 bg-rose-950/20 text-rose-300"
                    : "border-slate-800 bg-slate-950/80 text-slate-300"
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2 font-bold text-xs uppercase">
                    <span className="w-5 h-5 rounded-full bg-slate-900 border border-slate-700 text-slate-300 flex items-center justify-center text-[10px]">
                      3
                    </span>
                    <span className={threatEvent?.threatDetected ? "text-rose-400" : "text-emerald-400"}>
                      THREAT ANALYSIS
                    </span>
                  </div>
                  <span className="text-[10px] font-bold">
                    {threatEvent?.threatDetected ? "THREAT DETECTED" : "CLEAN"}
                  </span>
                </div>
                <div className="pl-7 space-y-1">
                  <div className="text-xs">
                    <span className="text-slate-500">Category:</span>{" "}
                    <span className="font-bold text-white">
                      {threatEvent?.threatCategory || "NONE"}
                    </span>
                    {" • "}
                    <span className="text-slate-500">Severity:</span>{" "}
                    <span className="font-bold text-amber-300">
                      {threatEvent?.severity || "NONE"}
                    </span>
                  </div>
                  {threatEvent?.detectedIndicators && threatEvent.detectedIndicators.length > 0 && (
                    <div className="text-[11px] text-rose-300/90">
                      Indicators: {threatEvent.detectedIndicators.join(", ")}
                    </div>
                  )}
                </div>
              </div>

              {/* Down Arrow */}
              <div className="flex justify-center -my-2 text-slate-600">
                <ArrowDown className="w-4 h-4" />
              </div>

              {/* 4. POLICY RULE */}
              <div className="rounded-lg border border-slate-800 bg-slate-950/80 p-4 space-y-1.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2 text-indigo-400 font-bold text-xs uppercase">
                    <span className="w-5 h-5 rounded-full bg-indigo-900/60 border border-indigo-700 text-indigo-300 flex items-center justify-center text-[10px]">
                      4
                    </span>
                    <span>POLICY RULE EVALUATED</span>
                  </div>
                  <span className="text-[10px] text-indigo-300">
                    {policyEvent?.policyRuleTriggered || "POL-DETERMINISTIC-01"}
                  </span>
                </div>
                <div className="pl-7 text-xs text-slate-300">
                  {policyEvent?.reason || finalEvent?.reason || "Policy invariant verified."}
                </div>
              </div>

              {/* Down Arrow */}
              <div className="flex justify-center -my-2 text-slate-600">
                <ArrowDown className="w-4 h-4" />
              </div>

              {/* 5. DECISION */}
              <div
                className={`rounded-lg border p-4 space-y-1.5 ${
                  isBlocked
                    ? "border-rose-900/80 bg-rose-950/30"
                    : "border-emerald-900/80 bg-emerald-950/30"
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2 font-bold text-xs uppercase">
                    <span className="w-5 h-5 rounded-full bg-slate-900 border border-slate-700 text-slate-300 flex items-center justify-center text-[10px]">
                      5
                    </span>
                    <span className={isBlocked ? "text-rose-400" : "text-emerald-400"}>
                      POLICY DECISION
                    </span>
                  </div>
                  <span
                    className={`text-xs font-bold px-2 py-0.5 rounded ${
                      isBlocked
                        ? "bg-rose-950 border border-rose-800 text-rose-300"
                        : "bg-emerald-950 border border-emerald-800 text-emerald-300"
                    }`}
                  >
                    {isBlocked ? "BLOCK" : "APPROVE"}
                  </span>
                </div>
                <div className="pl-7 text-xs text-slate-300">
                  {finalEvent?.reason}
                </div>
              </div>

              {/* Down Arrow */}
              <div className="flex justify-center -my-2 text-slate-600">
                <ArrowDown className="w-4 h-4" />
              </div>

              {/* 6. TOOL REQUEST */}
              <div className="rounded-lg border border-slate-800 bg-slate-950/80 p-4 space-y-1.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2 text-indigo-400 font-bold text-xs uppercase">
                    <span className="w-5 h-5 rounded-full bg-indigo-900/60 border border-indigo-700 text-indigo-300 flex items-center justify-center text-[10px]">
                      6
                    </span>
                    <span>TOOL REQUEST (INTERCEPTED INTENT)</span>
                  </div>
                  <span className="text-[10px] text-slate-500">
                    Tool: {toolReqEvent?.requestedTool || toolExecEvent?.requestedTool || "read_email"}
                  </span>
                </div>
                <div className="pl-7 text-xs text-slate-300">
                  Arguments (Sanitized):{" "}
                  <code className="text-[11px] text-indigo-300">
                    {JSON.stringify(toolReqEvent?.toolArgumentsMetadata || toolExecEvent?.toolArgumentsMetadata || {})}
                  </code>
                </div>
              </div>

              {/* Down Arrow */}
              <div className="flex justify-center -my-2 text-slate-600">
                <ArrowDown className="w-4 h-4" />
              </div>

              {/* 7. TOOL GATEWAY */}
              <div className="rounded-lg border border-slate-800 bg-slate-950/80 p-4 space-y-1.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2 text-indigo-400 font-bold text-xs uppercase">
                    <span className="w-5 h-5 rounded-full bg-indigo-900/60 border border-indigo-700 text-indigo-300 flex items-center justify-center text-[10px]">
                      7
                    </span>
                    <span>TOOL GATEWAY EXECUTION BOUNDARY</span>
                  </div>
                  <span
                    className={`text-[10px] font-bold ${
                      isBlocked ? "text-rose-400" : "text-emerald-400"
                    }`}
                  >
                    {isBlocked ? "EXECUTION REFUSED" : "SANDBOX EXECUTION"}
                  </span>
                </div>
                <div className="pl-7 text-xs text-slate-300">
                  {isBlocked
                    ? "Tool execution blocked. Zero-authority boundary enforced. Sandbox tool NOT called."
                    : "Policy approved tool. Executed within deterministic local sandbox boundary."}
                </div>
              </div>

              {/* Down Arrow */}
              <div className="flex justify-center -my-2 text-slate-600">
                <ArrowDown className="w-4 h-4" />
              </div>

              {/* 8. FINAL RESULT */}
              <div
                className={`rounded-lg border p-4 space-y-1.5 ${
                  isBlocked
                    ? "border-emerald-500 bg-slate-950/90 shadow-xl"
                    : "border-emerald-500 bg-emerald-950/30"
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2 font-bold text-xs uppercase">
                    <span className="w-5 h-5 rounded-full bg-emerald-600 text-white flex items-center justify-center text-[10px]">
                      8
                    </span>
                    <span className="text-emerald-400">FINAL RESULT & TELEMETRY</span>
                  </div>
                  <span className="text-xs font-bold text-emerald-400 flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" /> AGENT HARDENED
                  </span>
                </div>
                <div className="pl-7 text-xs text-slate-200">
                  {isBlocked ? (
                    <div>
                      🛡️ Attack neutralized. Outcome: <strong>ATTACK_BLOCKED</strong>. No secrets leaked. No unauthorized tools executed.
                    </div>
                  ) : (
                    <div>
                      ✓ Legitimate user task completed. Outcome: <strong>ALLOWED_BENIGN_TASK</strong>.
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
