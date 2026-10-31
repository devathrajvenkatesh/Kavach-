"use client";

import React, { useState, useEffect } from "react";
import {
  ScrollText,
  Shield,
  Search,
  RefreshCw,
  Trash2,
  GitCommit,
} from "lucide-react";
import { defaultAuditLogger, AuditEvent } from "@/lib/audit/logger";

interface AuditTrailProps {
  onNavigateToTrace?: (correlationId?: string) => void;
}

export function AuditTrail({ onNavigateToTrace }: AuditTrailProps = {}) {
  const [events, setEvents] = useState<AuditEvent[]>([]);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [filterDecision, setFilterDecision] = useState<string>("ALL");
  const [filterEventType, setFilterEventType] = useState<string>("ALL");
  const [selectedEvent, setSelectedEvent] = useState<AuditEvent | null>(null);

  const refreshEvents = () => {
    setEvents(defaultAuditLogger.getRecentEvents(100));
  };

  useEffect(() => {
    refreshEvents();
    const interval = setInterval(refreshEvents, 2000);
    return () => clearInterval(interval);
  }, []);

  const handleClear = () => {
    defaultAuditLogger.clear();
    setEvents([]);
  };

  const filtered = events.filter((evt) => {
    if (filterDecision !== "ALL" && evt.decision !== filterDecision) return false;
    if (filterEventType !== "ALL" && evt.eventType !== filterEventType) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchId = evt.id.toLowerCase().includes(q);
      const matchTestId = evt.testId?.toLowerCase().includes(q);
      const matchReason = evt.reason?.toLowerCase().includes(q);
      const matchTool = evt.toolName?.toLowerCase().includes(q);
      if (!matchId && !matchTestId && !matchReason && !matchTool) return false;
    }
    return true;
  });

  const stats = defaultAuditLogger.getStats();

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Header */}
      <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-6 backdrop-blur space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="flex items-center space-x-2 text-indigo-400 font-mono text-xs uppercase tracking-widest mb-1">
              <ScrollText className="w-4 h-4 text-indigo-400" />
              <span>Immutable Forensics & Security Logging</span>
              <span>•</span>
              <span className="text-emerald-400">Tamper-Evident Stream Active</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
              SECURITY AUDIT LOG
            </h1>
            <p className="text-slate-400 text-xs sm:text-sm mt-1">
              Complete forensic record of every agent reasoning turn, tool request interception, threat classification, and policy enforcement decision.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={refreshEvents}
              className="inline-flex items-center space-x-1.5 px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 text-xs font-semibold uppercase tracking-wider transition-all"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Refresh</span>
            </button>
            <button
              onClick={handleClear}
              className="inline-flex items-center space-x-1.5 px-3 py-2 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-400 text-xs transition-all"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Clear Log</span>
            </button>
          </div>
        </div>

        {/* Stats strip */}
        <div className="pt-2 border-t border-slate-800/80 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs font-mono">
          <div className="p-3 rounded-lg bg-slate-950 border border-slate-800">
            <span className="text-slate-500">Total Telemetry Events:</span>
            <div className="text-white font-bold text-base mt-0.5">{stats.total}</div>
          </div>
          <div className="p-3 rounded-lg bg-slate-950 border border-slate-800">
            <span className="text-slate-500">Blocked Interceptions:</span>
            <div className="text-rose-400 font-bold text-base mt-0.5">{stats.blocked}</div>
          </div>
          <div className="p-3 rounded-lg bg-slate-950 border border-slate-800">
            <span className="text-slate-500">Approved Actions:</span>
            <div className="text-emerald-400 font-bold text-base mt-0.5">{stats.approved}</div>
          </div>
          <div className="p-3 rounded-lg bg-slate-950 border border-slate-800">
            <span className="text-slate-500">Confirmation Gates:</span>
            <div className="text-amber-400 font-bold text-base mt-0.5">{stats.confirmation}</div>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-4 backdrop-blur space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search audit ID, reason, or tool..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500"
            />
          </div>

          <div>
            <select
              value={filterDecision}
              onChange={(e) => setFilterDecision(e.target.value)}
              className="w-full px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-xs text-slate-300 font-mono focus:outline-none focus:border-indigo-500"
            >
              <option value="ALL">Decision: All</option>
              <option value="BLOCK">BLOCK</option>
              <option value="APPROVE">APPROVE</option>
              <option value="REQUIRE_CONFIRMATION">REQUIRE_CONFIRMATION</option>
            </select>
          </div>

          <div>
            <select
              value={filterEventType}
              onChange={(e) => setFilterEventType(e.target.value)}
              className="w-full px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-xs text-slate-300 font-mono focus:outline-none focus:border-indigo-500"
            >
              <option value="ALL">Event Type: All</option>
              <option value="ATTACK_EVALUATION">ATTACK_EVALUATION</option>
              <option value="SECURITY_BLOCKED">SECURITY_BLOCKED</option>
              <option value="CONFIRMATION_REQUIRED">CONFIRMATION_REQUIRED</option>
              <option value="POLICY_DECISION">POLICY_DECISION</option>
            </select>
          </div>
        </div>
      </div>

      {/* Audit Log Table */}
      <div className="rounded-xl border border-slate-800 bg-slate-900/40 backdrop-blur overflow-hidden">
        {filtered.length === 0 ? (
          <div className="p-8 text-center text-xs font-mono text-slate-500">
            No audit records match the current filter criteria. Run attacks in Attack Lab to generate records.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-mono border-collapse">
              <thead>
                <tr className="border-b border-slate-800 bg-slate-950/80 text-[11px] text-slate-400 uppercase tracking-wider">
                  <th className="py-2.5 px-3">Timestamp</th>
                  <th className="py-2.5 px-3">Audit Event ID</th>
                  <th className="py-2.5 px-3">Event Type</th>
                  <th className="py-2.5 px-3">Test / Target ID</th>
                  <th className="py-2.5 px-3">Tool</th>
                  <th className="py-2.5 px-3">Decision</th>
                  <th className="py-2.5 px-3">Threat</th>
                  <th className="py-2.5 px-3">Reason</th>
                  <th className="py-2.5 px-3 text-right">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {filtered.map((evt) => (
                  <tr
                    key={evt.id}
                    onClick={() => setSelectedEvent(evt)}
                    className="hover:bg-slate-800/40 transition-colors cursor-pointer"
                  >
                    <td className="py-2.5 px-3 text-slate-400 text-[11px] whitespace-nowrap">
                      {new Date(evt.timestamp).toLocaleTimeString()}
                    </td>
                    <td className="py-2.5 px-3 font-bold text-white whitespace-nowrap">
                      {evt.id}
                    </td>
                    <td className="py-2.5 px-3 text-slate-300 whitespace-nowrap">
                      {evt.eventType}
                    </td>
                    <td className="py-2.5 px-3 text-indigo-300 font-bold whitespace-nowrap">
                      {evt.testId || "N/A"}
                    </td>
                    <td className="py-2.5 px-3 text-slate-400">
                      {evt.toolName || "none"}
                    </td>
                    <td className="py-2.5 px-3">
                      <span
                        className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold ${
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
                    <td className="py-2.5 px-3">
                      {evt.threatDetected ? (
                        <span className="text-rose-400 font-bold">YES</span>
                      ) : (
                        <span className="text-emerald-400">NO</span>
                      )}
                    </td>
                    <td className="py-2.5 px-3 text-slate-300 max-w-sm truncate" title={evt.reason}>
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
                        className="text-indigo-400 hover:text-indigo-300 underline text-xs"
                      >
                        Inspect
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Forensic Inspection Modal */}
      {selectedEvent && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="max-w-2xl w-full rounded-xl border border-slate-800 bg-slate-900 p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center space-x-2">
                <Shield className="w-5 h-5 text-indigo-400" />
                <h3 className="font-bold text-white text-base">Forensic Event Record</h3>
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
                    <span>View Lifecycle Trace</span>
                  </button>
                )}
                <button
                  onClick={() => setSelectedEvent(null)}
                  className="text-slate-400 hover:text-white text-xs px-2.5 py-1 rounded bg-slate-800"
                >
                  Close
                </button>
              </div>
            </div>

            <pre className="p-4 rounded-lg bg-slate-950 border border-slate-800 font-mono text-xs text-slate-200 overflow-x-auto whitespace-pre-wrap max-h-96">
              {JSON.stringify(selectedEvent, null, 2)}
            </pre>
          </div>
        </div>
      )}
    </div>
  );
}
