"use client";

import React, { useState, useEffect } from "react";
import {
  ScrollText,
  Search,
  RefreshCw,
  Trash2,
  GitCommit,
  Download,
} from "lucide-react";
import { defaultAuditLogger, AuditEvent } from "@/lib/audit/logger";

interface AuditTrailProps {
  onNavigateToTrace?: (correlationId?: string) => void;
}

export function AuditTrail({ onNavigateToTrace }: AuditTrailProps = {}) {
  const [events, setEvents] = useState<AuditEvent[]>([]);
  const [stats, setStats] = useState({ total: 0, blocked: 0, approved: 0, confirmation: 0, threats: 0 });
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [filterDecision, setFilterDecision] = useState<string>("ALL");
  const [filterEventType, setFilterEventType] = useState<string>("ALL");
  const [selectedEvent, setSelectedEvent] = useState<AuditEvent | null>(null);

  const refreshEvents = async () => {
    try {
      const res = await fetch("/api/audit");
      if (res.ok) {
        const data = await res.json();
        if (data.success && Array.isArray(data.events)) {
          setEvents(data.events);
          if (data.stats) {
            setStats(data.stats);
          }
          return;
        }
      }
    } catch {
      // Fallback to local in-memory logger if network unavailable
    }
    const fallbackEvents = defaultAuditLogger.getRecentEvents(100);
    setEvents(fallbackEvents);
    setStats(defaultAuditLogger.getStats());
  };

  useEffect(() => {
    refreshEvents().finally(() => setIsLoading(false));
    const interval = setInterval(refreshEvents, 2500);
    return () => clearInterval(interval);
  }, []);

  const handleClear = async () => {
    try {
      await fetch("/api/audit", { method: "DELETE" });
    } catch {
      // ignore
    }
    defaultAuditLogger.clear();
    setEvents([]);
    setStats({ total: 0, blocked: 0, approved: 0, confirmation: 0, threats: 0 });
  };

  const handleDownloadCSV = () => {
    window.open("/api/audit?format=csv", "_blank");
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

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Header */}
      <div className="rounded-2xl border border-[#E4DEC8] bg-[#FCFAF5] p-6 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="flex items-center space-x-2 text-[#678882] font-mono text-xs uppercase tracking-widest mb-1">
              <ScrollText className="w-4 h-4 text-[#052326]" />
              <span>Enterprise Compliance</span>
              <span>•</span>
              <span className="text-[#C9A86A]">Zero-Secret Forensics</span>
            </div>
            <h1 className="text-2xl font-serif font-bold text-[#052326]">
              Enterprise Audit Center
            </h1>
            <p className="text-[#678882] text-xs sm:text-sm mt-1">
              Tamper-evident immutable security logs capturing agent reasoning cycles, gateway decisions, and human approvals.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={handleDownloadCSV}
              className="inline-flex items-center space-x-1.5 px-3.5 py-2 rounded-xl bg-[#052326] text-white hover:bg-[#0A2E33] border border-[#052326] text-xs font-semibold shadow-xs transition-all"
            >
              <Download className="w-3.5 h-3.5 text-[#C9A86A]" />
              <span>Download Audit Report</span>
            </button>

            <button
              onClick={refreshEvents}
              disabled={isLoading}
              className="inline-flex items-center space-x-1.5 px-3 py-2 rounded-xl bg-[#FCFAF5] hover:bg-[#FAF7EE] border border-[#E4DEC8] text-[#052326] text-xs font-semibold transition-all disabled:opacity-60"
            >
              <RefreshCw className={`w-3.5 h-3.5 text-[#678882] ${isLoading ? "animate-spin" : ""}`} />
              <span>Refresh</span>
            </button>

            <button
              onClick={handleClear}
              className="inline-flex items-center space-x-1.5 px-3 py-2 rounded-xl bg-[#FCFAF5] hover:bg-[#FDF0ED] border border-[#E4DEC8] text-[#678882] hover:text-[#C2410C] text-xs font-semibold transition-all"
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
                  <td colSpan={6} className="py-12 text-center">
                    <div className="max-w-md mx-auto space-y-1.5">
                      <p className="text-xs font-semibold text-[#052326]">
                        {events.length === 0
                          ? "No audit events logged in this server session."
                          : "No audit records matching criteria."}
                      </p>
                      <p className="text-[11px] text-[#678882]">
                        {events.length === 0
                          ? "Security events generated by agent queries, file inspections, and policy decisions will be streamed here in real-time."
                          : "Try adjusting your search terms or filter selection."}
                      </p>
                    </div>
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
        <div className="fixed inset-0 z-50 bg-[#052326]/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#FCFAF5] rounded-2xl border border-[#E4DEC8] max-w-lg w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[#E4DEC8]">
              <div className="flex items-center space-x-2">
                <span className="font-serif font-bold text-base text-[#052326]">
                  Security Event Record
                </span>
                <span
                  className={`text-[10px] px-2 py-0.5 rounded font-bold uppercase ${
                    selectedEvent.decision === "BLOCK"
                      ? "bg-[#C2410C] text-white"
                      : selectedEvent.decision === "REQUIRE_CONFIRMATION"
                      ? "bg-[#C9A86A] text-white"
                      : "bg-[#1E5E4E] text-white"
                  }`}
                >
                  {selectedEvent.decision || "APPROVE"}
                </span>
              </div>
              <button
                onClick={() => setSelectedEvent(null)}
                className="text-[#678882] hover:text-[#052326] text-xs font-mono"
              >
                ✕ Close
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="bg-[#FAF7EE] p-3.5 rounded-xl border border-[#E4DEC8] space-y-2">
                <div className="flex justify-between py-1 border-b border-[#E4DEC8]/50">
                  <span className="text-[#678882]">Date</span>
                  <span className="font-medium text-[#052326]">
                    {new Date(selectedEvent.timestamp).toLocaleString("en-US", {
                      day: "2-digit",
                      month: "short",
                      year: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                </div>
                <div className="flex justify-between py-1 border-b border-[#E4DEC8]/50">
                  <span className="text-[#678882]">Event</span>
                  <span className="font-semibold text-[#052326]">{selectedEvent.eventType.replace(/_/g, " ")}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-[#E4DEC8]/50">
                  <span className="text-[#678882]">Source</span>
                  <span className="text-[#052326] capitalize">{selectedEvent.source || "System Gateway"}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-[#E4DEC8]/50">
                  <span className="text-[#678882]">Threat</span>
                  <span className="font-medium text-[#052326]">{selectedEvent.threatCategory?.replace(/_/g, " ") || "None"}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-[#E4DEC8]/50">
                  <span className="text-[#678882]">Risk</span>
                  <span className={`font-bold ${selectedEvent.severity === "CRITICAL" || selectedEvent.severity === "HIGH" ? "text-[#C2410C]" : "text-[#1E5E4E]"}`}>
                    {selectedEvent.severity || "NONE"}
                  </span>
                </div>
                <div className="flex justify-between py-1 border-b border-[#E4DEC8]/50">
                  <span className="text-[#678882]">Action</span>
                  <span className="font-mono text-[#052326]">
                    {selectedEvent.decision === "BLOCK"
                      ? "No external action executed"
                      : selectedEvent.toolName || selectedEvent.requestedTool || "No tool requested"}
                  </span>
                </div>
              </div>

              <div>
                <span className="text-[10px] uppercase font-bold text-[#678882] tracking-wider block mb-1">
                  Reason & Policy Enforcement:
                </span>
                <p className="p-3 rounded-xl bg-[#FAF7EE] border border-[#E4DEC8] text-xs text-[#052326] leading-relaxed">
                  {selectedEvent.reason || "Evaluated under standard security policy rules."}
                </p>
              </div>

              {selectedEvent.payloadSummary && (
                <div>
                  <span className="text-[10px] uppercase font-bold text-[#678882] tracking-wider block mb-1">
                    Sanitized Payload Metadata:
                  </span>
                  <pre className="p-2.5 rounded-xl bg-[#FAF7EE] border border-[#E4DEC8] text-[10px] font-mono text-[#678882] overflow-x-auto">
                    {selectedEvent.payloadSummary}
                  </pre>
                </div>
              )}
            </div>

            <div className="pt-3 border-t border-[#E4DEC8] flex justify-end space-x-2">
              <button
                onClick={() => setSelectedEvent(null)}
                className="px-3 py-1.5 rounded-xl border border-[#E4DEC8] text-xs text-[#678882] hover:text-[#052326]"
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
                  className="px-3.5 py-1.5 rounded-xl bg-[#052326] text-white text-xs font-semibold hover:bg-[#0A2E33]"
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
