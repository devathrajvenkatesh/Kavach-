"use client";

import React, { useState } from "react";
import {
  ShieldCheck,
  Search,
  X,
  ChevronRight,
} from "lucide-react";

export interface ThreatEventItem {
  id: string;
  severity: "CRITICAL" | "HIGH" | "MEDIUM";
  threatType: string;
  category: string;
  shortDescription: string;
  source: string;
  timestamp: string;
  status: "Blocked";
  indicator: string;
  detailReason: string;
}

const SEED_THREAT_EVENTS: ThreatEventItem[] = [
  {
    id: "THR-001",
    severity: "CRITICAL",
    threatType: "Secret Exfiltration Attempt",
    category: "SECRET_EXFILTRATION",
    shortDescription: "Attempt to access protected credentials and environment secrets (.env)",
    source: "Adversarial Probe via Chat",
    timestamp: "Just now",
    status: "Blocked",
    indicator: "CREDENTIAL_EXTRACTION_PROBE",
    detailReason: "Request attempted to extract canary tokens and internal environment variables.",
  },
  {
    id: "THR-002",
    severity: "CRITICAL",
    threatType: "Indirect Prompt Injection",
    category: "INDIRECT_INJECTION",
    shortDescription: "Hidden prompt injection embedded inside incoming vendor billing email",
    source: "External Email (billing-update@external-invoicing.net)",
    timestamp: "3m ago",
    status: "Blocked",
    indicator: "EMBEDDED_XML_DIRECTIVE",
    detailReason: "Email body contained hidden tags instructing agent to exfiltrate contact list via send_email.",
  },
  {
    id: "THR-003",
    severity: "CRITICAL",
    threatType: "Direct Prompt Override",
    category: "DIRECT_INJECTION",
    shortDescription: "Attacker tried to override system instructions with 'ignore all previous instructions'",
    source: "Direct User Prompt",
    timestamp: "12m ago",
    status: "Blocked",
    indicator: "IGNORE_SYSTEM_INSTRUCTIONS",
    detailReason: "Adversarial directive explicitly instructed agent to disregard core security boundary.",
  },
  {
    id: "THR-004",
    severity: "HIGH",
    threatType: "Privilege Escalation Attempt",
    category: "PRIVILEGE_ESCALATION",
    shortDescription: "Attacker falsely claimed pre-approved administrator authorization",
    source: "External Support Ticket",
    timestamp: "28m ago",
    status: "Blocked",
    indicator: "ADMIN_OVERRIDE_CLAIM",
    detailReason: "Untrusted payload attempted to bypass human confirmation gate for high-privilege action.",
  },
  {
    id: "THR-005",
    severity: "HIGH",
    threatType: "Goal Hijacking Directive",
    category: "GOAL_HIJACKING",
    shortDescription: "Web document attempted to divert agent away from legitimate summarization task",
    source: "Web Scrape Document",
    timestamp: "1h ago",
    status: "Blocked",
    indicator: "TASK_REDIRECTION_INSTEAD",
    detailReason: "Retrieved document commanded agent to abandon user task and write unauthorized local files.",
  },
  {
    id: "THR-006",
    severity: "CRITICAL",
    threatType: "Path Traversal & Tool Manipulation",
    category: "TOOL_MANIPULATION",
    shortDescription: "Directory traversal sequence (../../) injected into read_file parameter",
    source: "Tool Argument Manipulation",
    timestamp: "2h ago",
    status: "Blocked",
    indicator: "DIRECTORY_TRAVERSAL_SEQUENCE",
    detailReason: "Tool request targeted protected filesystem paths outside authorized workspace sandbox.",
  },
];

export function ThreatCenterView() {
  const [selectedCategory, setSelectedCategory] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [selectedEvent, setSelectedEvent] = useState<ThreatEventItem | null>(null);

  // Filter events
  const filteredEvents = SEED_THREAT_EVENTS.filter((evt) => {
    const matchesCategory =
      selectedCategory === "ALL" || evt.category === selectedCategory;
    const matchesSearch =
      searchQuery.trim() === "" ||
      evt.threatType.toLowerCase().includes(searchQuery.toLowerCase()) ||
      evt.shortDescription.toLowerCase().includes(searchQuery.toLowerCase()) ||
      evt.source.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* 1. TOP SUMMARY */}
      <section className="bg-white rounded-2xl border border-[#E8ECE9] p-6 sm:p-8 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-[#E8ECE9]">
          <div className="space-y-1">
            <div className="flex items-center space-x-2">
              <span className="text-[11px] font-mono font-bold tracking-wider uppercase text-[#C9A86A] bg-[#FAF5EB] px-2.5 py-0.5 rounded-full border border-[#C9A86A]/30">
                ACTIVE MONITORING
              </span>
              <span className="text-xs text-[#678882]">•</span>
              <span className="text-xs font-mono text-[#2E595A]">
                100% INVARIANT ENFORCEMENT
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-serif font-bold text-[#052326] tracking-tight">
              Threat Center
            </h1>
            <p className="text-sm text-[#678882] max-w-2xl">
              Kavach continuously identifies and blocks attempts to manipulate the AI agent.
            </p>
          </div>

          <div className="flex items-center space-x-2 px-3 py-1.5 rounded-xl bg-[#EBF1ED] border border-[#A5B5A9]/50 text-xs text-[#2E595A] self-start sm:self-auto">
            <ShieldCheck className="w-4 h-4 text-[#2E595A]" />
            <span className="font-bold text-[#052326]">Protection Active</span>
          </div>
        </div>

        {/* 2. SUMMARY CARDS */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mt-6">
          <div className="p-4 rounded-xl bg-[#FBF9F8] border border-[#E8ECE9]">
            <span className="text-[11px] font-mono text-[#678882] uppercase tracking-wider block mb-1">
              Threats Detected
            </span>
            <div className="text-2xl font-bold text-[#052326]">112</div>
            <span className="text-[11px] text-[#678882] mt-0.5 block">
              Across all attack vectors
            </span>
          </div>

          <div className="p-4 rounded-xl bg-[#FBF9F8] border border-[#E8ECE9]">
            <span className="text-[11px] font-mono text-[#678882] uppercase tracking-wider block mb-1">
              Threats Blocked
            </span>
            <div className="text-2xl font-bold text-[#2E595A]">112</div>
            <span className="text-[11px] text-[#2E595A] font-semibold mt-0.5 block">
              Zero unauthorized execution
            </span>
          </div>

          <div className="p-4 rounded-xl bg-[#FBF9F8] border border-[#E8ECE9]">
            <span className="text-[11px] font-mono text-[#678882] uppercase tracking-wider block mb-1">
              Critical Threats
            </span>
            <div className="text-2xl font-bold text-[#C9A86A]">24</div>
            <span className="text-[11px] text-[#678882] mt-0.5 block">
              Direct and indirect injections
            </span>
          </div>

          <div className="p-4 rounded-xl bg-[#FAF5EB] border border-[#C9A86A]/40">
            <span className="text-[11px] font-mono text-[#C9A86A] uppercase tracking-wider block mb-1 font-bold">
              Protection Rate
            </span>
            <div className="text-2xl font-bold text-[#052326]">100%</div>
            <span className="text-[11px] text-[#2E595A] font-semibold mt-0.5 block">
              Deterministic invariant
            </span>
          </div>
        </div>
      </section>

      {/* 3. THREAT LIST & CATEGORY FILTERS */}
      <section className="bg-white rounded-2xl border border-[#E8ECE9] p-6 sm:p-8 shadow-xs space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-bold text-[#052326] tracking-tight">
              Detected & Blocked Threats
            </h2>
            <p className="text-xs text-[#678882]">
              Select an event to view detailed security telemetry and policy reasoning.
            </p>
          </div>

          {/* Search bar */}
          <div className="relative w-full md:w-72">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-[#678882]" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search threat events..."
              className="w-full pl-9 pr-3 py-1.5 rounded-xl border border-[#E8ECE9] text-xs focus:outline-none focus:border-[#C9A86A] transition-colors"
            />
          </div>
        </div>

        {/* Category Pills */}
        <div className="flex flex-wrap gap-2 pt-1 border-t border-[#E8ECE9]/70">
          {[
            { id: "ALL", label: "All Threats (112)" },
            { id: "SECRET_EXFILTRATION", label: "Secret Exfiltration" },
            { id: "INDIRECT_INJECTION", label: "Indirect Injection" },
            { id: "DIRECT_INJECTION", label: "Prompt Injection" },
            { id: "PRIVILEGE_ESCALATION", label: "Privilege Escalation" },
            { id: "GOAL_HIJACKING", label: "Goal Hijacking" },
            { id: "TOOL_MANIPULATION", label: "Tool Manipulation" },
          ].map((cat) => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                selectedCategory === cat.id
                  ? "bg-[#052326] text-white shadow-xs"
                  : "bg-[#FBF9F8] text-[#2E595A] hover:bg-[#EBF1ED] border border-[#E8ECE9]"
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>

        {/* Chronological Threat Event Cards */}
        <div className="space-y-3">
          {filteredEvents.length === 0 ? (
            <div className="py-12 text-center text-xs text-[#678882]">
              No threat events match your search criteria.
            </div>
          ) : (
            filteredEvents.map((evt) => (
              <div
                key={evt.id}
                onClick={() => setSelectedEvent(evt)}
                className="p-4 rounded-xl border border-[#E8ECE9] hover:border-[#C9A86A]/70 bg-white hover:bg-[#FAF5EB]/20 transition-all cursor-pointer shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 group"
              >
                <div className="flex items-start space-x-3.5 min-w-0">
                  <div className="mt-0.5 flex-shrink-0">
                    {evt.severity === "CRITICAL" ? (
                      <span className="flex items-center space-x-1 text-xs font-bold text-red-600 bg-red-50 border border-red-200 px-2 py-0.5 rounded-md">
                        <span>🔴</span>
                        <span>Critical</span>
                      </span>
                    ) : (
                      <span className="flex items-center space-x-1 text-xs font-bold text-[#C9A86A] bg-[#FAF5EB] border border-[#C9A86A]/40 px-2 py-0.5 rounded-md">
                        <span>🟠</span>
                        <span>High</span>
                      </span>
                    )}
                  </div>

                  <div className="space-y-0.5 min-w-0">
                    <div className="text-sm font-bold text-[#052326] group-hover:text-[#2E595A] transition-colors truncate">
                      {evt.threatType}
                    </div>
                    <p className="text-xs text-[#678882] line-clamp-1">
                      {evt.shortDescription}
                    </p>
                    <div className="text-[11px] text-[#678882] font-mono">
                      Source: {evt.source}
                    </div>
                  </div>
                </div>

                <div className="flex items-center space-x-3 flex-shrink-0 self-end sm:self-center">
                  <div className="text-right">
                    <span className="text-[11px] font-mono font-bold text-[#C9A86A] bg-[#FAF5EB] px-2 py-0.5 rounded border border-[#C9A86A]/30">
                      {evt.status}
                    </span>
                    <span className="text-[11px] text-[#678882] block mt-0.5">
                      {evt.timestamp}
                    </span>
                  </div>
                  <ChevronRight className="w-4 h-4 text-[#678882] group-hover:translate-x-0.5 transition-transform" />
                </div>
              </div>
            ))
          )}
        </div>
      </section>

      {/* 4. MODAL DRAWER FOR EVENT DETAILS */}
      {selectedEvent && (
        <div className="fixed inset-0 bg-[#052326]/40 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl border border-[#E8ECE9] shadow-xl max-w-lg w-full p-6 space-y-5 animate-in zoom-in-95 duration-200">
            <div className="flex items-start justify-between pb-3 border-b border-[#E8ECE9]">
              <div>
                <div className="flex items-center space-x-2">
                  <span className="text-xs font-bold font-mono text-red-600 bg-red-50 px-2 py-0.5 rounded border border-red-200">
                    {selectedEvent.severity}
                  </span>
                  <span className="text-xs text-[#678882]">ID: {selectedEvent.id}</span>
                </div>
                <h3 className="text-lg font-bold text-[#052326] mt-1">
                  {selectedEvent.threatType}
                </h3>
              </div>
              <button
                onClick={() => setSelectedEvent(null)}
                className="p-1 rounded-lg text-[#678882] hover:bg-[#FBF9F8] transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3.5 text-xs">
              <div>
                <span className="text-[#678882] font-medium block">Description:</span>
                <p className="text-[#052326] mt-0.5">{selectedEvent.shortDescription}</p>
              </div>

              <div>
                <span className="text-[#678882] font-medium block">Origin Source:</span>
                <p className="text-[#052326] font-mono mt-0.5">{selectedEvent.source}</p>
              </div>

              <div>
                <span className="text-[#678882] font-medium block">Threat Indicator Matched:</span>
                <p className="text-[#052326] font-mono mt-0.5">{selectedEvent.indicator}</p>
              </div>

              <div>
                <span className="text-[#678882] font-medium block">Defense Decision & Reason:</span>
                <p className="text-[#052326] mt-0.5">{selectedEvent.detailReason}</p>
              </div>

              <div className="p-3 rounded-xl bg-[#FAF5EB] border border-[#C9A86A]/40 text-[#052326] space-y-1">
                <span className="font-bold block">Defensive Invariant Enforced:</span>
                <p className="text-[11px] text-[#678882]">
                  &ldquo;External content can provide DATA, but external content must NEVER gain AUTHORITY.&rdquo;
                </p>
              </div>
            </div>

            <div className="pt-3 border-t border-[#E8ECE9] flex justify-end">
              <button
                onClick={() => setSelectedEvent(null)}
                className="px-4 py-2 rounded-xl bg-[#052326] text-white text-xs font-semibold hover:bg-[#2E595A] transition-colors"
              >
                Dismiss Details
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
