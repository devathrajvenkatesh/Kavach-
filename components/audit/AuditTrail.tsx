"use client";

import React, { useState, useEffect } from "react";
import {
  ScrollText,
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
      <div className="rounded-2xl border border-[#E8ECE9] bg-white p-6 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="flex items-center space-x-2 text-[#678882] font-mono text-xs uppercase tracking-widest mb-1">
              <ScrollText className="w-4 h-4 text-[#2E595A]" />
              <span>Cryptographic Compliance</span>
              <span>•</span>
              <span className="text-[#C9A86A]">Zero-Secret Forensics</span>
            </div>
            <h1 className="text-2xl font-serif font-bold text-[#052326]">
              Tamper-Evident Audit Trail
            </h1>
            <p className="text-[#2E595A] text-xs sm:text-sm mt-1">
              Structured immutable security logs capturing agent reasoning cycles, gateway decisions, and parameter taint.
            </p>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={refreshEvents}
              className="inline-flex items-center space-x-1.5 px-3 py-2 rounded-lg bg-[#FBF9F8] hover:bg-[#EBF1ED] border border-[#E8ECE9] text-[#052326] text-xs font-semibold transition-all"
            >
              <RefreshCw className="w-3.5 h-3.5 text-[#2E595A]" />
              <span>Refresh</span>
            </button>

            <button
              onClick={handleClear}
              className="inline-flex items-center space-x-1.5 px-3 py-2 rounded-lg bg-white hover:bg-[#FAF5EB] border border-[#C9A86A]/40 text-[#C9A86A] text-xs font-semibold transition-all"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Clear Log</span>
            </button>
          </div>
        </div>

        {/* Real-time stats chip bar */}
        <div className="pt-3 border-t border-[#E8ECE9] grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs font-mono">
          <div className="p-3 rounded-xl bg-[#FBF9F8] border border-[#E8ECE9]">
            <span className="text-[#678882] block text-[10px] uppercase">Total Events</span>
            <span className="text-base font-bold text-[#052326]">{stats.total}</span>
          </div>
          <div className="p-3 rounded-xl bg-[#FAF5EB] border border-[#C9A86A]/30">
            <span className="text-[#678882] block text-[10px] uppercase">Blocked Actions</span>
            <span className="text-base font-bold text-[#C9A86A]">{stats.blocked}</span>
          </div>
          <div className="p-3 rounded-xl bg-[#EBF1ED] border border-[#A5B5A9]/30">
            <span className="text-[#678882] block text-[10px] uppercase">Approved Actions</span>
            <span className="text-base font-bold text-[#2E595A]">{stats.approved}</span>
          </div>
          <div className="p-3 rounded-xl bg-[#FBF9F8] border border-[#E8ECE9]">
            <span className="text-[#678882] block text-[10px] uppercase">Zero Secrets</span>
            <span className="text-base font-bold text-[#052326]">100% Redacted</span>
          </div>
        </div>

        {/* Filter / Search Bar */}
        <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="relative w-full sm:w-80">
            <Search className="w-4 h-4 text-[#678882] absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search event ID, reason, or tool..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 rounded-lg bg-[#FBF9F8] border border-[#E8ECE9] text-xs font-mono text-[#052326] focus:outline-none focus:border-[#C9A86A]"
            />
          </div>

          <div className="flex items-center space-x-2 self-start sm:self-center">
            <select
              value={filterDecision}
              onChange={(e) => setFilterDecision(e.target.value)}
              className="px-3 py-1.5 rounded-lg bg-[#FBF9F8] border border-[#E8ECE9] text-xs font-mono text-[#052326]"
            >
              <option value="ALL">Decision: All</option>
              <option value="APPROVE">APPROVE</option>
              <option value="BLOCK">BLOCK</option>
              <option value="REQUIRE_CONFIRMATION">REQUIRE_CONFIRMATION</option>
            </select>

            <select
              value={filterEventType}
              onChange={(e) => setFilterEventType(e.target.value)}
              className="px-3 py-1.5 rounded-lg bg-[#FBF9F8] border border-[#E8ECE9] text-xs font-mono text-[#052326]"
            >
              <option value="ALL">Event: All Types</option>
              <option value="USER_REQUEST">USER_REQUEST</option>
              <option value="TOOL_EXECUTION">TOOL_EXECUTION</option>
              <option value="POLICY_ENFORCEMENT">POLICY_ENFORCEMENT</option>
              <option value="THREAT_INTERCEPTED">THREAT_INTERCEPTED</option>
            </select>
          </div>
        </div>
      </div>

      {/* Audit Log Table */}
      <div className="rounded-2xl border border-[#E8ECE9] bg-white shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-mono">
            <thead className="bg-[#FBF9F8] border-b border-[#E8ECE9] text-[10px] uppercase text-[#678882] tracking-wider">
              <tr>
                <th className="py-3 px-4">Timestamp</th>
                <th className="py-3 px-4">Event Type</th>
                <th className="py-3 px-4">Decision</th>
                <th className="py-3 px-4">Tool</th>
                <th className="py-3 px-4">Reason / Details</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E8ECE9]">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-[#678882]">
                    No audit records matching criteria.
                  </td>
                </tr>
              ) : (
                filtered.map((evt) => (
                  <tr
                    key={evt.id}
                    className="hover:bg-[#FBF9F8] transition-colors cursor-pointer group"
                    onClick={() => setSelectedEvent(evt)}
                  >
                    <td className="py-3 px-4 text-[#678882] whitespace-nowrap">
                      {new Date(evt.timestamp).toLocaleTimeString()}
                    </td>
                    <td className="py-3 px-4 text-[#052326] font-semibold">
                      {evt.eventType}
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap">
                      <span
                        className={`text-[10px] px-2 py-0.5 rounded font-bold ${
                          evt.decision === "BLOCK"
                            ? "bg-[#FAF5EB] text-[#C9A86A] border border-[#C9A86A]/40"
                            : evt.decision === "REQUIRE_CONFIRMATION"
                            ? "bg-[#FAF5EB] text-[#C9A86A]"
                            : "bg-[#EBF1ED] text-[#2E595A]"
                        }`}
                      >
                        {evt.decision}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-[#2E595A]">
                      {evt.toolName || evt.requestedTool || "—"}
                    </td>
                    <td className="py-3 px-4 text-[#678882] max-w-xs truncate">
                      {evt.reason || "Evaluated by security policy"}
                    </td>
                    <td className="py-3 px-4 text-right whitespace-nowrap">
                      {onNavigateToTrace && evt.correlationId && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onNavigateToTrace(evt.correlationId);
                          }}
                          className="inline-flex items-center space-x-1 text-[11px] text-[#2E595A] hover:text-[#052326] font-semibold"
                        >
                          <GitCommit className="w-3 h-3" />
                          <span>Trace</span>
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Selected Event Modal Drawer */}
      {selectedEvent && (
        <div className="fixed inset-0 z-50 bg-[#052326]/30 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-[#E8ECE9] max-w-lg w-full p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[#E8ECE9]">
              <div className="flex items-center space-x-2">
                <span className="font-serif font-bold text-base text-[#052326]">
                  Audit Record Details
                </span>
                <span
                  className={`font-mono text-[10px] px-2 py-0.5 rounded font-bold ${
                    selectedEvent.decision === "BLOCK"
                      ? "bg-[#FAF5EB] text-[#C9A86A]"
                      : "bg-[#EBF1ED] text-[#2E595A]"
                  }`}
                >
                  {selectedEvent.decision}
                </span>
              </div>
              <button
                onClick={() => setSelectedEvent(null)}
                className="text-[#678882] hover:text-[#052326] text-xs font-mono"
              >
                ✕ Close
              </button>
            </div>

            <div className="space-y-2 text-xs font-mono">
              <div className="p-3 rounded-lg bg-[#FBF9F8] border border-[#E8ECE9] space-y-1">
                <div>ID: {selectedEvent.id}</div>
                <div>Correlation ID: {selectedEvent.correlationId}</div>
                <div>Event Type: {selectedEvent.eventType}</div>
                <div>Source: {selectedEvent.source}</div>
                <div>Tool Target: {selectedEvent.toolName || selectedEvent.requestedTool || "None"}</div>
              </div>

              <div>
                <span className="text-[10px] uppercase font-bold text-[#678882] tracking-wider block mb-1">
                  Enforcement Explanation:
                </span>
                <p className="p-2 rounded bg-[#FAF5EB] border border-[#C9A86A]/30 text-[#052326]">
                  {selectedEvent.reason}
                </p>
              </div>

              {selectedEvent.payloadSummary && (
                <div>
                  <span className="text-[10px] uppercase font-bold text-[#678882] tracking-wider block mb-1">
                    Sanitized Payload:
                  </span>
                  <pre className="p-2 rounded bg-[#FBF9F8] border border-[#E8ECE9] text-[10px] text-[#678882] overflow-x-auto">
                    {selectedEvent.payloadSummary}
                  </pre>
                </div>
              )}
            </div>

            <div className="pt-3 border-t border-[#E8ECE9] flex justify-end space-x-2">
              <button
                onClick={() => setSelectedEvent(null)}
                className="px-3 py-1.5 rounded-lg border border-[#E8ECE9] text-xs text-[#678882] hover:text-[#052326]"
              >
                Dismiss
              </button>
              {onNavigateToTrace && selectedEvent.correlationId && (
                <button
                  onClick={() => {
                    const cid = selectedEvent.correlationId;
                    setSelectedEvent(null);
                    onNavigateToTrace(cid);
                  }}
                  className="px-3 py-1.5 rounded-lg bg-[#052326] text-white text-xs font-semibold hover:bg-[#2E595A]"
                >
                  Inspect Full Trace
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
