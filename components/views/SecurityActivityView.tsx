"use client";

import React, { useState, useEffect } from "react";
import {
  ShieldAlert,
  CheckCircle2,
  Lock,
  Radio,
  Search,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { defaultAuditLogger, AuditEvent } from "@/lib/audit/logger";

interface SecurityActivityViewProps {
  onNavigateToTrace?: (correlationId?: string) => void;
}

export function SecurityActivityView({
  onNavigateToTrace,
}: SecurityActivityViewProps) {
  const [events, setEvents] = useState<AuditEvent[]>([]);
  const [filterType, setFilterType] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [expandedEventId, setExpandedEventId] = useState<string | null>(null);

  useEffect(() => {
    setEvents(defaultAuditLogger.getRecentEvents(100));

    const interval = setInterval(() => {
      setEvents(defaultAuditLogger.getRecentEvents(100));
    }, 2000);

    return () => clearInterval(interval);
  }, []);

  const toggleExpand = (id: string) => {
    setExpandedEventId((prev) => (prev === id ? null : id));
  };

  const filteredEvents = events.filter((evt) => {
    const isBlock = evt.decision === "BLOCK" || evt.eventType === "SECURITY_BLOCKED";
    const isConfirm = evt.decision === "REQUIRE_CONFIRMATION" || evt.eventType === "CONFIRMATION_REQUIRED";
    const isApprove = evt.decision === "APPROVE" || evt.eventType === "TOOL_EXECUTED";

    if (filterType === "BLOCKED" && !isBlock) return false;
    if (filterType === "CONFIRMATION" && !isConfirm) return false;
    if (filterType === "APPROVED" && !isApprove) return false;

    if (searchQuery.trim() !== "") {
      const q = searchQuery.toLowerCase();
      const matchReason = evt.reason?.toLowerCase().includes(q);
      const matchSource = evt.source?.toLowerCase().includes(q);
      const matchTool = evt.requestedTool?.toLowerCase().includes(q);
      return matchReason || matchSource || matchTool;
    }

    return true;
  });

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* 1. HEADER */}
      <section className="bg-white rounded-2xl border border-[#E8ECE9] p-6 sm:p-8 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-[#E8ECE9]">
          <div className="space-y-1">
            <div className="flex items-center space-x-2">
              <span className="text-[11px] font-mono font-bold tracking-wider uppercase text-[#C9A86A] bg-[#FAF5EB] px-2.5 py-0.5 rounded-full border border-[#C9A86A]/30">
                AUDIT TELEMETRY
              </span>
              <span className="text-xs text-[#678882]">•</span>
              <span className="text-xs font-mono text-[#2E595A]">
                IMMUTABLE SECURITY CHRONOLOGY
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-serif font-bold text-[#052326] tracking-tight">
              Security Activity
            </h1>
            <p className="text-sm text-[#678882] max-w-2xl">
              Chronological activity feed of all agent requests, security checks, and protection events.
            </p>
          </div>

          <div className="flex items-center space-x-2 text-xs font-mono text-[#2E595A] bg-[#FBF9F8] px-3.5 py-2 rounded-xl border border-[#E8ECE9]">
            <Radio className="w-3.5 h-3.5 text-emerald-600 animate-pulse" />
            <span>Telemetry Live</span>
          </div>
        </div>

        {/* 2. CONTROLS: FILTERS & SEARCH */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-6">
          <div className="flex flex-wrap gap-2">
            {[
              { id: "ALL", label: `All Events (${events.length})` },
              { id: "BLOCKED", label: "Threats Blocked" },
              { id: "CONFIRMATION", label: "Confirmation Gates" },
              { id: "APPROVED", label: "Safe Actions" },
            ].map((f) => (
              <button
                key={f.id}
                onClick={() => setFilterType(f.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  filterType === f.id
                    ? "bg-[#052326] text-white shadow-xs"
                    : "bg-[#FBF9F8] text-[#2E595A] hover:bg-[#EBF1ED] border border-[#E8ECE9]"
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>

          <div className="relative w-full sm:w-64">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-[#678882]" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Filter by keyword..."
              className="w-full pl-9 pr-3 py-1.5 rounded-xl border border-[#E8ECE9] text-xs focus:outline-none focus:border-[#C9A86A] transition-colors"
            />
          </div>
        </div>
      </section>

      {/* 3. CHRONOLOGICAL ACTIVITY STREAM */}
      <section className="bg-white rounded-2xl border border-[#E8ECE9] p-6 sm:p-8 shadow-xs">
        <div className="space-y-4">
          {filteredEvents.length === 0 ? (
            <div className="py-12 text-center text-xs text-[#678882]">
              No security activity matching current filters.
            </div>
          ) : (
            filteredEvents.slice(0, 30).map((evt, idx) => {
              const isBlock = evt.decision === "BLOCK" || evt.eventType === "SECURITY_BLOCKED";
              const isConfirm = evt.decision === "REQUIRE_CONFIRMATION" || evt.eventType === "CONFIRMATION_REQUIRED";
              const isExpanded = expandedEventId === evt.id;

              return (
                <div
                  key={evt.id || idx}
                  className="rounded-xl border border-[#E8ECE9] bg-white hover:border-[#A5B5A9] transition-all p-4 shadow-xs space-y-3"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start space-x-3.5 min-w-0">
                      <div
                        className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5 ${
                          isBlock
                            ? "bg-[#FAF5EB] text-[#C9A86A] border border-[#C9A86A]/40"
                            : isConfirm
                            ? "bg-[#FAF5EB] text-[#C9A86A] border border-[#C9A86A]/40"
                            : "bg-[#EBF1ED] text-[#2E595A] border border-[#A5B5A9]/50"
                        }`}
                      >
                        {isBlock ? (
                          <ShieldAlert className="w-4 h-4" />
                        ) : isConfirm ? (
                          <Lock className="w-4 h-4" />
                        ) : (
                          <CheckCircle2 className="w-4 h-4" />
                        )}
                      </div>

                      <div className="space-y-1 min-w-0">
                        <div className="text-sm font-bold text-[#052326] truncate">
                          {isBlock
                            ? evt.reason || "Adversarial Directive Intercepted"
                            : isConfirm
                            ? "Consequential Action Paused for Human Approval"
                            : evt.reason || "Authorized Operation Processed Safely"}
                        </div>

                        <div className="flex flex-wrap items-center gap-2 text-xs text-[#678882]">
                          <span>Source: {evt.source || "User Interaction"}</span>
                          <span>•</span>
                          <span>{new Date(evt.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })}</span>
                          {evt.requestedTool && (
                            <>
                              <span>•</span>
                              <span className="font-mono text-[#052326] bg-[#FBF9F8] px-1.5 py-0.5 rounded border border-[#E8ECE9]">
                                Tool: {evt.requestedTool}
                              </span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center space-x-3 flex-shrink-0">
                      <span
                        className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-full ${
                          isBlock
                            ? "bg-[#FAF5EB] text-[#C9A86A] border border-[#C9A86A]/40"
                            : isConfirm
                            ? "bg-[#FAF5EB] text-[#C9A86A] border border-[#C9A86A]/40"
                            : "bg-[#EBF1ED] text-[#2E595A]"
                        }`}
                      >
                        {isBlock ? "BLOCKED" : isConfirm ? "APPROVAL NEEDED" : "COMPLETED"}
                      </span>

                      <button
                        onClick={() => toggleExpand(evt.id)}
                        className="p-1 rounded-lg text-[#678882] hover:bg-[#FBF9F8] transition-colors"
                        title="Toggle Details"
                      >
                        {isExpanded ? (
                          <ChevronUp className="w-4 h-4" />
                        ) : (
                          <ChevronDown className="w-4 h-4" />
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Expandable Layer 2 Details */}
                  {isExpanded && (
                    <div className="mt-3 pt-3 border-t border-[#E8ECE9] grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs animate-in fade-in duration-200">
                      <div>
                        <span className="text-[10px] text-[#678882] block font-medium">
                          Security Decision Reason:
                        </span>
                        <p className="text-[#052326] mt-0.5">
                          {evt.reason || "Enforced under Kavach authority boundary rules."}
                        </p>
                      </div>

                      <div>
                        <span className="text-[10px] text-[#678882] block font-medium">
                          Payload Summary:
                        </span>
                        <p className="text-[#052326] font-mono mt-0.5 truncate">
                          {evt.payloadSummary || "No payload data recorded"}
                        </p>
                      </div>

                      {evt.correlationId && (
                        <div className="col-span-2 pt-2 border-t border-[#E8ECE9]/70 flex items-center justify-between text-[10px] font-mono text-[#678882]">
                          <span>Trace ID: {evt.correlationId}</span>
                          {onNavigateToTrace && (
                            <button
                              onClick={() => onNavigateToTrace(evt.correlationId)}
                              className="text-[#2E595A] hover:underline"
                            >
                              View Security Trace →
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </section>
    </div>
  );
}
