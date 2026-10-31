"use client";

import React, { useState, useEffect } from "react";
import {
  GitCommit,
  ShieldCheck,
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

  const isBlocked =
    activeTrace?.finalOutcome.includes("BLOCK") ||
    activeTrace?.events.some((e) => e.decision === "BLOCK");

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Top Banner */}
      <div className="rounded-2xl border border-[#E8ECE9] bg-white p-6 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2 text-[#678882] font-mono text-xs uppercase tracking-widest mb-1">
            <GitCommit className="w-4 h-4 text-[#2E595A]" />
            <span>Forensic Provenance Chain</span>
            <span>•</span>
            <span className="text-[#C9A86A]">Correlation ID Tracing</span>
          </div>
          <h2 className="text-2xl font-serif font-bold text-[#052326]">
            Security Provenance & Traces
          </h2>
          <p className="text-[#2E595A] text-xs sm:text-sm mt-0.5">
            End-to-end trace reconstructing the exact decision chain through each security boundary.
          </p>
        </div>

        {onClose && (
          <button
            onClick={onClose}
            className="px-3 py-1.5 rounded-lg bg-[#FBF9F8] hover:bg-[#EBF1ED] text-[#052326] border border-[#E8ECE9] text-xs font-semibold"
          >
            Close Trace View
          </button>
        )}
      </div>

      {traces.length === 0 ? (
        <div className="rounded-2xl border border-[#E8ECE9] bg-white p-12 text-center space-y-3 shadow-sm">
          <ShieldCheck className="w-12 h-12 text-[#A5B5A9] mx-auto" />
          <h3 className="text-base font-serif font-bold text-[#052326]">
            No Security Traces Recorded Yet
          </h3>
          <p className="text-xs text-[#678882] max-w-md mx-auto">
            Execute attacks or tests in the Attack Lab or launch the Live Demo to record real-time security chains.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Trace Selector Sidebar (4 cols) */}
          <div className="lg:col-span-4 rounded-2xl border border-[#E8ECE9] bg-white p-4 space-y-3 shadow-sm max-h-[750px] flex flex-col">
            <div className="flex items-center justify-between pb-2 border-b border-[#E8ECE9]">
              <span className="text-xs font-bold text-[#052326] uppercase tracking-wider">
                Correlation Traces ({traces.length})
              </span>
            </div>

            <div className="relative">
              <Search className="w-3.5 h-3.5 text-[#678882] absolute left-2.5 top-2.5" />
              <input
                type="text"
                placeholder="Search trace or attack ID..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 rounded-lg bg-[#FBF9F8] border border-[#E8ECE9] text-xs font-mono text-[#052326] focus:outline-none focus:border-[#C9A86A]"
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
                    className={`rounded-xl p-3 text-xs font-mono border cursor-pointer transition-all ${
                      isSelected
                        ? "bg-[#FAF5EB] border-[#C9A86A] shadow-sm font-semibold"
                        : "bg-[#FBF9F8] border-[#E8ECE9] hover:bg-white hover:border-[#A5B5A9]"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-[#052326] truncate max-w-[170px]">
                        {t.attackId ? `[${t.attackId}] ` : ""}
                        {t.correlationId.slice(0, 16)}
                      </span>
                      <span
                        className={`text-[9px] px-1.5 py-0.2 rounded font-bold ${
                          blocked
                            ? "bg-white text-[#C9A86A] border border-[#C9A86A]/40"
                            : "bg-white text-[#2E595A] border border-[#A5B5A9]/40"
                        }`}
                      >
                        {blocked ? "BLOCKED" : "APPROVED"}
                      </span>
                    </div>

                    <p className="text-[11px] text-[#678882] truncate mt-1">
                      {t.userIntent || "Task intent"}
                    </p>

                    <div className="mt-2 flex items-center justify-between text-[10px] text-[#678882]">
                      <span>{t.events.length} events logged</span>
                      <span>{new Date(t.startTime).toLocaleTimeString()}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Trace Detail View (8 cols) */}
          <div className="lg:col-span-8 space-y-6">
            {activeTrace ? (
              <div className="rounded-2xl border border-[#E8ECE9] bg-white p-6 shadow-sm space-y-6">
                {/* Trace Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#E8ECE9]">
                  <div>
                    <div className="flex items-center space-x-2">
                      <span className="text-[10px] font-mono text-[#678882] uppercase">
                        Correlation ID:
                      </span>
                      <span className="text-xs font-mono font-bold text-[#052326]">
                        {activeTrace.correlationId}
                      </span>
                    </div>
                    <h3 className="text-base font-serif font-bold text-[#052326] mt-1">
                      {activeTrace.userIntent}
                    </h3>
                  </div>

                  <span
                    className={`font-mono text-xs px-3 py-1 rounded-full font-bold self-start sm:self-center ${
                      isBlocked
                        ? "bg-[#FAF5EB] text-[#C9A86A] border border-[#C9A86A]/40"
                        : "bg-[#EBF1ED] text-[#2E595A]"
                    }`}
                  >
                    Outcome: {activeTrace.finalOutcome}
                  </span>
                </div>

                {/* Event Chain Timeline */}
                <div className="space-y-4">
                  <span className="text-xs font-mono font-bold text-[#678882] uppercase tracking-wider block">
                    Execution Chain ({activeTrace.events.length} Events):
                  </span>

                  <div className="space-y-3 relative pl-6 before:absolute before:left-2.5 before:top-3 before:bottom-3 before:w-0.5 before:bg-[#E8ECE9]">
                    {activeTrace.events.map((ev, index) => {
                      const isEventBlocked = ev.decision === "BLOCK";
                      const isConfirm = ev.decision === "REQUIRE_CONFIRMATION";

                      return (
                        <div key={ev.id || index} className="relative group">
                          {/* Dot */}
                          <span
                            className={`absolute -left-6 top-2 w-3 h-3 rounded-full border-2 border-white ring-1 ${
                              isEventBlocked
                                ? "bg-[#C9A86A] ring-[#C9A86A]"
                                : isConfirm
                                ? "bg-[#C9A86A] ring-[#C9A86A]"
                                : "bg-[#2E595A] ring-[#2E595A]"
                            }`}
                          />

                          <div className="p-3.5 rounded-xl bg-[#FBF9F8] border border-[#E8ECE9] hover:bg-white transition-all space-y-1 text-xs">
                            <div className="flex items-center justify-between">
                              <span className="font-mono font-bold text-[#052326]">
                                [{index + 1}] {ev.eventType}
                              </span>
                              <span className="text-[10px] font-mono text-[#678882]">
                                {new Date(ev.timestamp).toLocaleTimeString()}
                              </span>
                            </div>

                            <p className="text-xs text-[#2E595A]">
                              {ev.reason || "Evaluated by security policy"}
                            </p>

                            {ev.requestedTool && (
                              <div className="text-[11px] font-mono text-[#678882] pt-1">
                                Target Tool: <span className="text-[#052326] font-semibold">{ev.requestedTool}</span>
                              </div>
                            )}

                            {ev.policyRuleTriggered && (
                              <div className="text-[11px] font-mono text-[#C9A86A] pt-0.5">
                                Rule Triggered: {ev.policyRuleTriggered}
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            ) : (
              <div className="p-8 text-center text-xs text-[#678882]">
                Select a trace from the left panel.
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
