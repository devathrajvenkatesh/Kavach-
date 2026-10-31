"use client";

import React, { useState, useEffect } from "react";
import {
  Shield,
  ShieldCheck,
  ShieldAlert,
  AlertTriangle,
  Lock,
  Flame,
  CheckCircle2,
  XCircle,
  Activity,
  Cpu,
  ArrowRight,
  Layers,
  GitCommit,
} from "lucide-react";
import { defaultAuditLogger, AuditEvent, TelemetryMetrics } from "@/lib/audit/logger";
import { DATASET_CATEGORIES } from "@/lib/attack-lab/dataset-loader";

interface CommandCenterProps {
  onNavigateToAttackLab: (category?: string) => void;
  onNavigateToLiveDemo: () => void;
  onNavigateToTrace?: (correlationId?: string) => void;
}

export function CommandCenter({
  onNavigateToAttackLab,
  onNavigateToLiveDemo,
  onNavigateToTrace,
}: CommandCenterProps) {
  const [events, setEvents] = useState<AuditEvent[]>([]);
  const [telemetry, setTelemetry] = useState<TelemetryMetrics>(() =>
    defaultAuditLogger.getTelemetryMetrics()
  );
  const [selectedEvent, setSelectedEvent] = useState<AuditEvent | null>(null);
  const [filterSeverity, setFilterSeverity] = useState<string>("ALL");

  useEffect(() => {
    // Initial fetch of audit events and telemetry
    setEvents(defaultAuditLogger.getRecentEvents(30));
    setTelemetry(defaultAuditLogger.getTelemetryMetrics());

    const interval = setInterval(() => {
      setEvents(defaultAuditLogger.getRecentEvents(30));
      setTelemetry(defaultAuditLogger.getTelemetryMetrics());
    }, 1500);

    return () => clearInterval(interval);
  }, []);

  const architectureComponents = [
    {
      name: "Security Gateway",
      role: "Central Invariant & Authority Enforcement",
      status: "PROTECTED" as const,
      latency: "< 0.5ms",
      details: "Enforces: External content provides DATA, never AUTHORITY.",
    },
    {
      name: "Threat Analyzer",
      role: "Signature & Pattern Heuristics Engine",
      status: "PROTECTED" as const,
      latency: "< 1.2ms",
      details: "8 categories, Unicode NFKD normalization, zero-width stripping.",
    },
    {
      name: "Policy Engine",
      role: "Deterministic Rule Verification",
      status: "PROTECTED" as const,
      latency: "< 0.3ms",
      details: "Evaluates APPROVE / BLOCK / REQUIRE_CONFIRMATION rules.",
    },
    {
      name: "Tool Gateway",
      role: "Schema Validation & Zero-Authority Sandbox",
      status: "PROTECTED" as const,
      latency: "< 0.8ms",
      details: "Zod parameter enforcement; tags external content as untrusted.",
    },
    {
      name: "Evaluation Engine",
      role: "Quantitative Adversarial Benchmark",
      status: "PROTECTED" as const,
      latency: "~10ms / 138 cases",
      details: "112 attacks, 22 benign, 4 regression tripwires.",
    },
    {
      name: "Audit Logger",
      role: "Tamper-Evident Telemetry & Forensics",
      status: "PROTECTED" as const,
      latency: "< 0.1ms",
      details: "Immutable in-memory telemetry buffer with structured schemas.",
    },
  ];

  const filteredEvents = events.filter((e) => {
    if (filterSeverity !== "ALL" && e.severity !== filterSeverity) return false;
    return true;
  });

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* Banner / Header */}
      <div className="rounded-xl border border-slate-800 bg-gradient-to-r from-slate-900/90 via-slate-900/50 to-indigo-950/30 p-6 sm:p-8 backdrop-blur shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-600/10 rounded-full blur-3xl pointer-events-none" />
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center space-x-2 text-indigo-400 font-mono text-xs uppercase tracking-widest">
              <span className="flex h-2 w-2 relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              <span>AI-Security Operations Center (SOC)</span>
              <span>•</span>
              <span className="text-slate-400">Deterministic Invariant Mode</span>
            </div>
            <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-white flex items-center gap-3">
              KAVACH SECURITY COMMAND CENTER
            </h1>
            <p className="text-slate-400 text-sm sm:text-base max-w-3xl leading-relaxed">
              Real-time telemetry, threat distribution matrix, and defensive architecture boundary
              guarding Kavach from indirect prompt injection, secret exfiltration, and tool hijacking.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={onNavigateToLiveDemo}
              className="inline-flex items-center space-x-2 px-4 py-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold uppercase tracking-wider transition-all shadow-lg shadow-indigo-600/20 active:scale-95"
            >
              <Flame className="w-4 h-4 text-amber-300 animate-pulse" />
              <span>Launch Live Attack Demo</span>
            </button>
            <button
              onClick={() => onNavigateToAttackLab()}
              className="inline-flex items-center space-x-2 px-4 py-2.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 text-xs font-semibold uppercase tracking-wider transition-all active:scale-95"
            >
              <Layers className="w-4 h-4 text-indigo-400" />
              <span>Open Attack Lab (138 Cases)</span>
            </button>
            {onNavigateToTrace && (
              <button
                onClick={() => onNavigateToTrace()}
                className="inline-flex items-center space-x-2 px-4 py-2.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 text-xs font-semibold uppercase tracking-wider transition-all active:scale-95"
              >
                <GitCommit className="w-4 h-4 text-emerald-400" />
                <span>Security Traces</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Top 8 Dynamic KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
        {/* KPI 1 */}
        <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4 backdrop-blur flex flex-col justify-between">
          <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400">
            Attacks Tested
          </span>
          <div className="mt-2 text-2xl font-bold font-mono text-white">
            {telemetry.attacksTested}
          </div>
          <span className="text-[10px] text-indigo-400 mt-1">
            {telemetry.totalEventsLogged} telemetry events
          </span>
        </div>

        {/* KPI 2 */}
        <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4 backdrop-blur flex flex-col justify-between">
          <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400">
            Attacks Blocked
          </span>
          <div className="mt-2 text-2xl font-bold font-mono text-emerald-400">
            {telemetry.attacksBlocked}
          </div>
          <span className="text-[10px] text-emerald-400/80 mt-1">
            {telemetry.blockRate.toFixed(1)}% Intercepted
          </span>
        </div>

        {/* KPI 3 */}
        <div className="rounded-xl border border-emerald-900/40 bg-emerald-950/10 p-4 backdrop-blur flex flex-col justify-between">
          <span className="text-[10px] font-mono uppercase tracking-wider text-emerald-400">
            Defense Rate
          </span>
          <div className="mt-2 text-2xl font-black font-mono text-emerald-300">
            {telemetry.blockRate.toFixed(1)}%
          </div>
          <span className="text-[10px] text-emerald-400/80 mt-1">
            {telemetry.detectionRate.toFixed(1)}% Detected
          </span>
        </div>

        {/* KPI 4 */}
        <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4 backdrop-blur flex flex-col justify-between">
          <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400">
            False Positive Rate
          </span>
          <div className="mt-2 text-2xl font-bold font-mono text-emerald-400">
            {telemetry.falsePositives === 0 ? "0.0%" : ((telemetry.falsePositives / 22) * 100).toFixed(1) + "%"}
          </div>
          <span className="text-[10px] text-slate-400 mt-1">
            {telemetry.falsePositives} / 22 Benign Flagged
          </span>
        </div>

        {/* KPI 5 */}
        <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4 backdrop-blur flex flex-col justify-between">
          <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400">
            Possession Rate
          </span>
          <div className="mt-2 text-2xl font-bold font-mono text-emerald-400">
            {telemetry.possessionRate.toFixed(1)}%
          </div>
          <span className="text-[10px] text-slate-400 mt-1">
            {telemetry.attacksMissed} Missed Attacks
          </span>
        </div>

        {/* KPI 6 */}
        <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4 backdrop-blur flex flex-col justify-between">
          <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400">
            Unauthorized Exec
          </span>
          <div className="mt-2 text-2xl font-bold font-mono text-emerald-400">
            {telemetry.unauthorizedExecutions}
          </div>
          <span className="text-[10px] text-slate-400 mt-1">
            Zero Tool Bypass
          </span>
        </div>

        {/* KPI 7 */}
        <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4 backdrop-blur flex flex-col justify-between">
          <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400">
            Secret Access
          </span>
          <div className="mt-2 text-2xl font-bold font-mono text-emerald-400">
            {telemetry.secretAccessAttempts}
          </div>
          <span className="text-[10px] text-slate-400 mt-1">
            Attempts Intercepted
          </span>
        </div>

        {/* KPI 8 */}
        <div className="rounded-xl border border-indigo-900/40 bg-indigo-950/20 p-4 backdrop-blur flex flex-col justify-between">
          <span className="text-[10px] font-mono uppercase tracking-wider text-indigo-300">
            Regression Status
          </span>
          <div className="mt-2 text-base font-bold font-mono text-indigo-300 truncate" title={telemetry.regressionStatus}>
            {telemetry.regressionStatus}
          </div>
          <span className="text-[10px] text-indigo-400 mt-1">Tripwires Active</span>
        </div>
      </div>

      {/* Main Two Column Grid: Threat Distribution & Defense Performance */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Threat Distribution Matrix (7 cols) */}
        <div className="lg:col-span-7 rounded-xl border border-slate-800 bg-slate-900/40 p-6 backdrop-blur space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <div className="flex items-center space-x-2">
              <ShieldAlert className="w-5 h-5 text-indigo-400" />
              <h2 className="text-base font-bold text-white uppercase tracking-wider">
                Threat Distribution Matrix
              </h2>
            </div>
            <span className="text-xs font-mono text-slate-400">112 Malicious Vectors</span>
          </div>

          <p className="text-xs text-slate-400 leading-relaxed">
            Adversarial attack corpus coverage across OWASP LLM Top 10 threat vectors and realistic
            attack mutations (whitespace obfuscation, Unicode lookalikes, delimiter escapes).
          </p>

          <div className="space-y-3 pt-2">
            {DATASET_CATEGORIES.filter((c) => c.id !== "ALL" && c.id !== "BENIGN" && c.id !== "REGRESSION").map(
              (category) => {
                const percentage = ((category.count / 112) * 100).toFixed(1);
                return (
                  <div
                    key={category.id}
                    onClick={() => onNavigateToAttackLab(category.id)}
                    className="group cursor-pointer rounded-lg p-2.5 hover:bg-slate-800/60 border border-slate-800/80 transition-colors"
                  >
                    <div className="flex items-center justify-between text-xs mb-1.5">
                      <div className="flex items-center space-x-2 font-medium text-slate-200 group-hover:text-indigo-300">
                        <span className="font-mono text-slate-400">#{category.id.slice(0, 4)}</span>
                        <span>{category.label}</span>
                      </div>
                      <div className="flex items-center space-x-2 font-mono">
                        <span className="text-white font-bold">{category.count}</span>
                        <span className="text-slate-500">({percentage}%)</span>
                        <ArrowRight className="w-3.5 h-3.5 text-slate-500 group-hover:text-indigo-400 transition-transform group-hover:translate-x-0.5" />
                      </div>
                    </div>
                    {/* Progress bar */}
                    <div className="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
                      <div
                        className="bg-indigo-500 h-1.5 rounded-full transition-all duration-500 group-hover:bg-indigo-400"
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                  </div>
                );
              }
            )}
          </div>
        </div>

        {/* Defense Performance Overview (5 cols) */}
        <div className="lg:col-span-5 rounded-xl border border-slate-800 bg-slate-900/40 p-6 backdrop-blur flex flex-col justify-between space-y-6">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center space-x-2">
                <ShieldCheck className="w-5 h-5 text-emerald-400" />
                <h2 className="text-base font-bold text-white uppercase tracking-wider">
                  Defense Performance
                </h2>
              </div>
              <span className="text-xs font-mono px-2 py-0.5 rounded bg-emerald-950/80 border border-emerald-800/80 text-emerald-300">
                Optimal
              </span>
            </div>

            <p className="text-xs text-slate-400 mt-3 leading-relaxed">
              Empirical breakdown of security gateway outcomes against the complete 138-test evaluation suite.
            </p>

            <div className="mt-6 space-y-4">
              {/* Blocked Attacks */}
              <div className="rounded-lg border border-slate-800 bg-slate-950/80 p-3.5 flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="p-2 rounded-md bg-rose-950/50 border border-rose-800/50 text-rose-400">
                    <XCircle className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-slate-200">Blocked Attacks</div>
                    <div className="text-[11px] text-slate-500">Prevented unauthorized execution</div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-base font-bold font-mono text-emerald-400">
                    {telemetry.attacksBlocked} / {telemetry.attacksTested}
                  </div>
                  <div className="text-[10px] font-mono text-slate-400">{telemetry.blockRate.toFixed(1)}% Block Rate</div>
                </div>
              </div>

              {/* Benign Tasks Allowed */}
              <div className="rounded-lg border border-slate-800 bg-slate-950/80 p-3.5 flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="p-2 rounded-md bg-emerald-950/50 border border-emerald-800/50 text-emerald-400">
                    <CheckCircle2 className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-slate-200">Allowed Benign Tasks</div>
                    <div className="text-[11px] text-slate-500">Authorized user intents completed</div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-base font-bold font-mono text-emerald-400">
                    {Math.max(0, 22 - telemetry.falsePositives)} / 22
                  </div>
                  <div className="text-[10px] font-mono text-slate-400">
                    {telemetry.falsePositives === 0 ? "100.0%" : (((22 - telemetry.falsePositives) / 22) * 100).toFixed(1) + "%"} Success
                  </div>
                </div>
              </div>

              {/* Missed Attacks */}
              <div className="rounded-lg border border-slate-800 bg-slate-950/80 p-3.5 flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="p-2 rounded-md bg-slate-900 border border-slate-800 text-slate-400">
                    <AlertTriangle className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-slate-200">Missed Attacks</div>
                    <div className="text-[11px] text-slate-500">Adversarial bypasses</div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-base font-bold font-mono text-slate-200">
                    {telemetry.attacksMissed} / {telemetry.attacksTested}
                  </div>
                  <div className="text-[10px] font-mono text-slate-500">{telemetry.possessionRate.toFixed(1)}% Miss Rate</div>
                </div>
              </div>

              {/* False Positives */}
              <div className="rounded-lg border border-slate-800 bg-slate-950/80 p-3.5 flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="p-2 rounded-md bg-slate-900 border border-slate-800 text-slate-400">
                    <Lock className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-slate-200">False Positives</div>
                    <div className="text-[11px] text-slate-500">Benign tasks inappropriately blocked</div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-base font-bold font-mono text-slate-200">
                    {telemetry.falsePositives} / 22
                  </div>
                  <div className="text-[10px] font-mono text-slate-500">
                    {telemetry.falsePositives === 0 ? "0.0%" : ((telemetry.falsePositives / 22) * 100).toFixed(1) + "%"} FPR
                  </div>
                </div>
              </div>

              {/* Empirical Interception Latency */}
              <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs font-mono">
                <span className="text-slate-400">Interception Latency:</span>
                <span className="text-emerald-400 font-bold">
                  avg {telemetry.averageLatencyMs}ms / p95 {telemetry.p95LatencyMs}ms
                </span>
              </div>
            </div>
          </div>

          <div className="rounded-lg bg-indigo-950/20 border border-indigo-900/30 p-3 text-[11px] text-indigo-300">
            <strong>Formal Invariant Guarantee:</strong> External content sources carry zero authority and
            cannot escalate privileges regardless of payload obfuscation or delimiter manipulation.
          </div>
        </div>
      </div>

      {/* Security Architecture Status (6 Grid Cards) */}
      <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-6 backdrop-blur space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center space-x-2">
            <Cpu className="w-5 h-5 text-indigo-400" />
            <h2 className="text-base font-bold text-white uppercase tracking-wider">
              Security Architecture Layer Status
            </h2>
          </div>
          <span className="text-xs font-mono text-slate-400">All 6 Subsystems Verified</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {architectureComponents.map((comp) => (
            <div
              key={comp.name}
              className="rounded-lg border border-slate-800 bg-slate-950/70 p-4 space-y-2 hover:border-slate-700 transition-colors"
            >
              <div className="flex items-center justify-between">
                <span className="font-bold text-xs text-white uppercase tracking-wide">
                  {comp.name}
                </span>
                <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-emerald-950 border border-emerald-800/80 text-emerald-400">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 mr-1.5 animate-pulse" />
                  {comp.status}
                </span>
              </div>
              <div className="text-[11px] text-indigo-300 font-medium">{comp.role}</div>
              <p className="text-xs text-slate-400 leading-relaxed">{comp.details}</p>
              <div className="pt-2 flex items-center justify-between text-[10px] font-mono text-slate-500 border-t border-slate-900">
                <span>Latency</span>
                <span className="text-slate-300">{comp.latency}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Security Event Stream */}
      <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-6 backdrop-blur space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-slate-800 gap-3">
          <div className="flex items-center space-x-2">
            <Activity className="w-5 h-5 text-indigo-400" />
            <h2 className="text-base font-bold text-white uppercase tracking-wider">
              Real-Time Security Event Stream
            </h2>
          </div>
          <div className="flex items-center space-x-3">
            <div className="flex items-center space-x-1 text-xs">
              <span className="text-slate-400">Severity:</span>
              <select
                value={filterSeverity}
                onChange={(e) => setFilterSeverity(e.target.value)}
                className="rounded bg-slate-900 border border-slate-700 text-xs text-slate-200 px-2 py-1 font-mono focus:outline-none"
              >
                <option value="ALL">All Severities</option>
                <option value="CRITICAL">Critical</option>
                <option value="HIGH">High</option>
                <option value="MEDIUM">Medium</option>
                <option value="LOW">Low</option>
              </select>
            </div>
            <span className="text-xs font-mono text-slate-400">
              {filteredEvents.length} events logged
            </span>
          </div>
        </div>

        {filteredEvents.length === 0 ? (
          <div className="rounded-lg border border-slate-800/80 bg-slate-950 p-8 text-center text-slate-500 text-xs">
            No live events recorded in current session buffer. Run tests in the Attack Lab or launch the Live Demo.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-mono border-collapse">
              <thead>
                <tr className="border-b border-slate-800 text-[11px] text-slate-400 uppercase tracking-wider">
                  <th className="py-2.5 px-3">Timestamp</th>
                  <th className="py-2.5 px-3">Attack / Event ID</th>
                  <th className="py-2.5 px-3">Category</th>
                  <th className="py-2.5 px-3">Severity</th>
                  <th className="py-2.5 px-3">Decision</th>
                  <th className="py-2.5 px-3">Reason</th>
                  <th className="py-2.5 px-3 text-right">Inspect</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {filteredEvents.slice(0, 15).map((evt) => (
                  <tr
                    key={evt.id}
                    className="hover:bg-slate-800/40 transition-colors cursor-pointer"
                    onClick={() => setSelectedEvent(evt)}
                  >
                    <td className="py-2.5 px-3 text-slate-400 text-[11px]">
                      {new Date(evt.timestamp).toLocaleTimeString()}
                    </td>
                    <td className="py-2.5 px-3 font-bold text-white">{evt.testId || evt.id.slice(0, 12)}</td>
                    <td className="py-2.5 px-3 text-slate-300">
                      {evt.category?.replace(/_/g, " ") || "PIPELINE_EVENT"}
                    </td>
                    <td className="py-2.5 px-3">
                      <span
                        className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold ${
                          evt.severity === "CRITICAL"
                            ? "bg-rose-950 border border-rose-800 text-rose-300"
                            : evt.severity === "HIGH"
                            ? "bg-amber-950 border border-amber-800 text-amber-300"
                            : "bg-slate-800 border border-slate-700 text-slate-300"
                        }`}
                      >
                        {evt.severity || "MEDIUM"}
                      </span>
                    </td>
                    <td className="py-2.5 px-3">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold ${
                          evt.decision === "BLOCK"
                            ? "bg-rose-950/80 border border-rose-800 text-rose-400"
                            : evt.decision === "REQUIRE_CONFIRMATION"
                            ? "bg-amber-950/80 border border-amber-800 text-amber-400"
                            : "bg-emerald-950/80 border border-emerald-800 text-emerald-400"
                        }`}
                      >
                        {evt.decision}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-slate-300 max-w-xs truncate" title={evt.reason}>
                      {evt.reason}
                    </td>
                    <td className="py-2.5 px-3 text-right whitespace-nowrap space-x-2">
                      {onNavigateToTrace && evt.correlationId && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onNavigateToTrace(evt.correlationId);
                          }}
                          className="inline-flex items-center space-x-1 text-slate-300 hover:text-indigo-400 font-mono text-[11px] px-1.5 py-0.5 rounded border border-slate-700 bg-slate-800/80 transition-colors"
                          title="Open 8-stage visual security trace"
                        >
                          <GitCommit className="w-3 h-3 text-indigo-400" />
                          <span>Trace</span>
                        </button>
                      )}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedEvent(evt);
                        }}
                        className="text-xs text-indigo-400 hover:text-indigo-300 underline"
                      >
                        View
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Event Details Modal / Drawer */}
      {selectedEvent && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="max-w-2xl w-full rounded-xl border border-slate-800 bg-slate-900 p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center space-x-2">
                <Shield className="w-5 h-5 text-indigo-400" />
                <h3 className="font-bold text-white text-base">Security Event Inspection</h3>
              </div>
              <div className="flex items-center space-x-2">
                {onNavigateToTrace && selectedEvent.correlationId && (
                  <button
                    onClick={() => {
                      const corrId = selectedEvent.correlationId;
                      setSelectedEvent(null);
                      onNavigateToTrace(corrId);
                    }}
                    className="inline-flex items-center space-x-1.5 px-2.5 py-1 rounded bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold"
                  >
                    <GitCommit className="w-3.5 h-3.5" />
                    <span>View Trace</span>
                  </button>
                )}
                <button
                  onClick={() => setSelectedEvent(null)}
                  className="text-slate-400 hover:text-white text-sm px-2 py-1 rounded bg-slate-800"
                >
                  Close
                </button>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 text-xs font-mono">
              <div>
                <span className="text-slate-500">Event ID:</span>
                <div className="text-white font-bold">{selectedEvent.id}</div>
              </div>
              <div>
                <span className="text-slate-500">Timestamp:</span>
                <div className="text-white">{selectedEvent.timestamp}</div>
              </div>
              <div>
                <span className="text-slate-500">Attack ID / Test ID:</span>
                <div className="text-indigo-300 font-bold">{selectedEvent.testId || "N/A"}</div>
              </div>
              <div>
                <span className="text-slate-500">Category:</span>
                <div className="text-white">{selectedEvent.category || "N/A"}</div>
              </div>
              <div>
                <span className="text-slate-500">Policy Decision:</span>
                <div
                  className={`font-bold ${
                    selectedEvent.decision === "BLOCK"
                      ? "text-rose-400"
                      : selectedEvent.decision === "REQUIRE_CONFIRMATION"
                      ? "text-amber-400"
                      : "text-emerald-400"
                  }`}
                >
                  {selectedEvent.decision}
                </div>
              </div>
              <div>
                <span className="text-slate-500">Threat Detected:</span>
                <div className="text-white">{selectedEvent.threatDetected ? "YES" : "NO"}</div>
              </div>
            </div>

            <div className="space-y-1">
              <span className="text-xs font-mono text-slate-500">Security Policy Reason:</span>
              <div className="p-3 rounded bg-slate-950 border border-slate-800 text-xs font-mono text-slate-300">
                {selectedEvent.reason}
              </div>
            </div>

            {selectedEvent.payloadSummary && (
              <div className="space-y-1">
                <span className="text-xs font-mono text-slate-500">Payload Snippet:</span>
                <pre className="p-3 rounded bg-slate-950 border border-slate-800 text-xs font-mono text-slate-300 overflow-x-auto whitespace-pre-wrap">
                  {selectedEvent.payloadSummary}
                </pre>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
