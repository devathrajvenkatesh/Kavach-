"use client";

import React, { useState, useEffect } from "react";
import {
  Radio,
  Search,
  GitCommit,
} from "lucide-react";
import { defaultAuditLogger, AuditEvent } from "@/lib/audit/logger";

interface SecurityEventsViewProps {
  onNavigateToTrace?: (correlationId?: string) => void;
}

export function SecurityEventsView({ onNavigateToTrace }: SecurityEventsViewProps) {
  const [events, setEvents] = useState<AuditEvent[]>([]);
  const [filterDecision, setFilterDecision] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [selectedEvent, setSelectedEvent] = useState<AuditEvent | null>(null);

  useEffect(() => {
    setEvents(defaultAuditLogger.getRecentEvents(50));
    const interval = setInterval(() => {
      setEvents(defaultAuditLogger.getRecentEvents(50));
    }, 1500);
    return () => clearInterval(interval);
  }, []);

  const filtered = events.filter((ev) => {
    if (filterDecision !== "ALL" && ev.decision !== filterDecision) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchText = `${ev.eventType} ${ev.requestedTool || ""} ${ev.reason || ""} ${ev.correlationId}`.toLowerCase();
      if (!matchText.includes(q)) return false;
    }
    return true;
  });

  const blockCount = events.filter((e) => e.decision === "BLOCK").length;
  const confirmCount = events.filter((e) => e.decision === "REQUIRE_CONFIRMATION").length;
  const approveCount = events.filter((e) => e.decision === "APPROVE").length;

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Top Summary Bar */}
      <section className="bg-white rounded-2xl border border-[#E8ECE9] p-6 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#E8ECE9]">
          <div>
            <div className="flex items-center space-x-2">
              <span className="text-[10px] font-bold tracking-[0.16em] uppercase text-[#678882]">
                ACTIVE TELEMETRY
              </span>
              <span className="w-1.5 h-1.5 rounded-full bg-[#C9A86A]" />
              <span className="text-xs font-mono text-[#2E595A]">
                IMMUTABLE AUDIT STREAM
              </span>
            </div>
            <h2 className="text-2xl font-serif font-bold text-[#052326] mt-1">
              Intercepted Security Events
            </h2>
            <p className="text-xs text-[#2E595A] mt-1">
              Live audit stream recording all threat interceptions, tool authorizations, and confirmation pauses.
            </p>
          </div>

          <div className="flex items-center space-x-2">
            <span className="flex items-center space-x-1.5 px-3 py-1 rounded-full text-xs font-mono bg-[#EBF1ED] text-[#2E595A]">
              <Radio className="w-3.5 h-3.5 animate-pulse text-[#2E595A]" />
              <span>LIVE LOGGING ACTIVE</span>
            </span>
          </div>
        </div>

        {/* Counter Pills */}
        <div className="grid grid-cols-3 gap-3 mt-4">
          <div className="p-3 rounded-xl bg-[#FAF5EB] border border-[#C9A86A]/30">
            <span className="text-[10px] font-mono uppercase font-bold text-[#678882]">
              BLOCKED ATTACKS
            </span>
            <div className="text-xl font-serif font-bold text-[#C9A86A] mt-0.5">
              {blockCount}
            </div>
          </div>
          <div className="p-3 rounded-xl bg-[#FAF5EB] border border-[#C9A86A]/20">
            <span className="text-[10px] font-mono uppercase font-bold text-[#678882]">
              CONFIRMATION REQUIRED
            </span>
            <div className="text-xl font-serif font-bold text-[#2E595A] mt-0.5">
              {confirmCount}
            </div>
          </div>
          <div className="p-3 rounded-xl bg-[#EBF1ED] border border-[#A5B5A9]/30">
            <span className="text-[10px] font-mono uppercase font-bold text-[#678882]">
              APPROVED ACTIONS
            </span>
            <div className="text-xl font-serif font-bold text-[#052326] mt-0.5">
              {approveCount}
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 mt-4 pt-4 border-t border-[#E8ECE9]">
          <div className="relative w-full sm:w-80">
            <Search className="w-3.5 h-3.5 absolute left-3 top-3 text-[#678882]" />
            <input
              type="text"
              placeholder="Search event type, tool, or correlation ID..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 rounded-lg bg-[#FBF9F8] border border-[#E8ECE9] text-xs font-mono text-[#052326] focus:outline-none focus:border-[#C9A86A]"
            />
          </div>

          <div className="flex items-center space-x-1.5 text-xs self-start sm:self-center">
            <span className="text-xs text-[#678882] mr-1">Filter Decision:</span>
            {["ALL", "BLOCK", "REQUIRE_CONFIRMATION", "APPROVE"].map((d) => (
              <button
                key={d}
                onClick={() => setFilterDecision(d)}
                className={`px-2.5 py-1 rounded-md text-[11px] font-mono transition-colors ${
                  filterDecision === d
                    ? "bg-[#052326] text-white font-bold"
                    : "bg-[#FBF9F8] border border-[#E8ECE9] text-[#678882] hover:text-[#052326]"
                }`}
              >
                {d === "REQUIRE_CONFIRMATION" ? "CONFIRM" : d}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Events Table */}
      <section className="bg-white rounded-2xl border border-[#E8ECE9] shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#FBF9F8] border-b border-[#E8ECE9] text-[10px] font-mono uppercase text-[#678882] tracking-wider">
              <tr>
                <th className="py-3 px-4">Timestamp</th>
                <th className="py-3 px-4">Decision</th>
                <th className="py-3 px-4">Event / Tool</th>
                <th className="py-3 px-4">Threat Category</th>
                <th className="py-3 px-4">Reason / Enforcement</th>
                <th className="py-3 px-4 text-right">Trace</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E8ECE9]">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-[#678882]">
                    No security events match the current filter.
                  </td>
                </tr>
              ) : (
                filtered.map((ev) => (
                  <tr
                    key={ev.id}
                    className="hover:bg-[#FBF9F8] transition-colors group cursor-pointer"
                    onClick={() => setSelectedEvent(ev)}
                  >
                    <td className="py-3 px-4 font-mono text-[11px] text-[#678882] whitespace-nowrap">
                      {new Date(ev.timestamp).toLocaleTimeString()}
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap">
                      <span
                        className={`font-mono text-[10px] px-2 py-0.5 rounded font-bold ${
                          ev.decision === "BLOCK"
                            ? "bg-[#FAF5EB] text-[#C9A86A] border border-[#C9A86A]/40"
                            : ev.decision === "REQUIRE_CONFIRMATION"
                            ? "bg-[#FAF5EB] text-[#C9A86A]"
                            : "bg-[#EBF1ED] text-[#2E595A]"
                        }`}
                      >
                        {ev.decision}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-semibold text-[#052326]">
                      {ev.requestedTool ? `tool: ${ev.requestedTool}` : ev.eventType}
                    </td>
                    <td className="py-3 px-4 font-mono text-[11px] text-[#2E595A]">
                      {ev.threatCategory || "—"}
                    </td>
                    <td className="py-3 px-4 text-[#678882] max-w-xs truncate">
                      {ev.reason || "Evaluated by security policy"}
                    </td>
                    <td className="py-3 px-4 text-right whitespace-nowrap">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          if (onNavigateToTrace) onNavigateToTrace(ev.correlationId);
                        }}
                        className="inline-flex items-center space-x-1 text-[11px] font-mono text-[#2E595A] hover:text-[#052326] font-semibold"
                      >
                        <GitCommit className="w-3 h-3" />
                        <span>Trace</span>
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* Selected Event Modal Drawer */}
      {selectedEvent && (
        <div className="fixed inset-0 z-50 bg-[#052326]/30 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-[#E8ECE9] max-w-lg w-full p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[#E8ECE9]">
              <div className="flex items-center space-x-2">
                <span className="font-serif font-bold text-base text-[#052326]">
                  Security Event Inspector
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

            <div className="space-y-2 text-xs">
              <div className="p-3 rounded-lg bg-[#FBF9F8] border border-[#E8ECE9] font-mono space-y-1">
                <div>Event Type: {selectedEvent.eventType}</div>
                <div>Correlation ID: {selectedEvent.correlationId}</div>
                <div>Source: {selectedEvent.source} (Level {selectedEvent.sourceTrustLevel})</div>
                <div>Tool Target: {selectedEvent.requestedTool || "None"}</div>
                <div>Policy Rule: {selectedEvent.policyRuleTriggered || "Default Safe Invariant"}</div>
              </div>

              <div>
                <span className="text-[10px] uppercase font-bold text-[#678882] tracking-wider">
                  Enforcement Rationale:
                </span>
                <p className="text-xs text-[#052326] mt-0.5 p-2 rounded bg-[#FAF5EB] border border-[#C9A86A]/30">
                  {selectedEvent.reason}
                </p>
              </div>

              {selectedEvent.payloadSummary && (
                <div>
                  <span className="text-[10px] uppercase font-bold text-[#678882] tracking-wider">
                    Payload Snippet:
                  </span>
                  <pre className="p-2 rounded bg-[#FBF9F8] border border-[#E8ECE9] text-[10px] font-mono text-[#678882] overflow-x-auto">
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
              {onNavigateToTrace && (
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
