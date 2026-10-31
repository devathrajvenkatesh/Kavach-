"use client";

import React, { useState, useEffect } from "react";
import {
  Cpu,
  FlaskConical,
  Radio,
  ArrowRight,
  Lock,
  GitCommit,
} from "lucide-react";
import { SecurityPipelineVisualizer } from "./SecurityPipelineVisualizer";
import { KpiArea } from "./KpiArea";
import { DATASET_CATEGORIES } from "@/lib/attack-lab/dataset-loader";
import { defaultAuditLogger, AuditEvent } from "@/lib/audit/logger";
import { FOUNDATIONAL_SECURITY_INVARIANT } from "@/lib/config/constants";

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
  const [recentEvents, setRecentEvents] = useState<AuditEvent[]>([]);

  useEffect(() => {
    // Initial fetch of recent intercepted events
    setRecentEvents(defaultAuditLogger.getRecentEvents(12));

    const interval = setInterval(() => {
      setRecentEvents(defaultAuditLogger.getRecentEvents(12));
    }, 1500);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* 1. HERO SECTION */}
      <section className="bg-white rounded-2xl border border-[#E8ECE9] p-6 sm:p-8 shadow-sm relative overflow-hidden">
        {/* Subtle background glow accent */}
        <div className="absolute top-0 right-0 w-80 h-80 bg-gradient-to-bl from-[#C9A86A]/10 via-[#2E595A]/5 to-transparent rounded-full blur-2xl pointer-events-none" />

        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 relative z-10">
          <div className="space-y-2 max-w-2xl">
            {/* Live Operational Status Tag */}
            <div className="flex items-center space-x-2">
              <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-mono font-semibold bg-[#EBF1ED] text-[#052326] border border-[#A5B5A9]/50">
                <span className="w-2 h-2 rounded-full bg-[#2E595A] mr-1.5 animate-pulse" />
                DEFENSE SYSTEM OPERATIONAL
              </span>
              <span className="text-xs font-mono text-[#678882]">
                • STRICT ENFORCEMENT
              </span>
            </div>

            <h1 className="text-3xl sm:text-4xl font-serif font-bold text-[#052326] tracking-tight">
              Kavach Security Command Center
            </h1>

            <p className="text-base text-[#2E595A] leading-relaxed">
              Intelligent protection for AI agents operating in untrusted environments.
              Ensures external documents, emails, and web data can provide data, but can{" "}
              <strong className="text-[#052326] font-semibold">never gain authority</strong>.
            </p>
          </div>

          {/* Quick Action Buttons */}
          <div className="flex flex-wrap sm:flex-col sm:items-end gap-2.5 flex-shrink-0">
            <button
              onClick={() => onNavigateToAttackLab()}
              className="px-4 py-2.5 rounded-xl bg-[#052326] hover:bg-[#2E595A] text-white text-xs font-medium tracking-wide flex items-center space-x-2 shadow-sm transition-all hover:shadow"
            >
              <FlaskConical className="w-4 h-4 text-[#C9A86A]" />
              <span>Launch Attack Lab (138 Cases)</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>

            <button
              onClick={onNavigateToLiveDemo}
              className="px-4 py-2.5 rounded-xl bg-white hover:bg-[#F7F9F8] text-[#052326] border border-[#E8ECE9] hover:border-[#A5B5A9] text-xs font-medium tracking-wide flex items-center space-x-2 shadow-sm transition-all"
            >
              <Cpu className="w-4 h-4 text-[#2E595A]" />
              <span>Simulate Live Attack Turn</span>
            </button>
          </div>
        </div>

        {/* Foundational Invariant Bar */}
        <div className="mt-6 pt-5 border-t border-[#E8ECE9] flex items-center justify-between text-xs">
          <div className="flex items-center space-x-2.5 text-[#052326]">
            <Lock className="w-4 h-4 text-[#C9A86A] flex-shrink-0" />
            <span className="font-mono text-[11px] font-bold tracking-wider text-[#C9A86A] uppercase">
              FOUNDATIONAL INVARIANT:
            </span>
            <span className="italic text-[#2E595A] font-serif text-sm">
              &ldquo;{FOUNDATIONAL_SECURITY_INVARIANT}&rdquo;
            </span>
          </div>

          <span className="hidden md:inline-flex text-[11px] font-mono text-[#678882]">
            Model Invariant: Zero Tool Execution Authority
          </span>
        </div>
      </section>

      {/* 2. KPI AREA */}
      <section>
        <KpiArea />
      </section>

      {/* 3. VISUAL CONNECTED SECURITY PIPELINE */}
      <section>
        <SecurityPipelineVisualizer />
      </section>

      {/* 4. DEFENSE MATRIX & INTERCEPTED EVENTS DUAL SECTION */}
      <section className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column (2/3): Attack Categories Breakdown */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-[#E8ECE9] p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between pb-4 border-b border-[#E8ECE9]">
            <div>
              <div className="flex items-center space-x-2">
                <span className="text-[10px] font-bold tracking-[0.16em] uppercase text-[#678882]">
                  PENETRATION COVERAGE
                </span>
                <span className="w-1.5 h-1.5 rounded-full bg-[#2E595A]" />
                <span className="text-xs font-mono text-[#2E595A]">
                  8 THREAT CATEGORIES
                </span>
              </div>
              <h3 className="text-base font-serif font-bold text-[#052326] mt-0.5">
                Adversarial Threat Matrix
              </h3>
            </div>

            <button
              onClick={() => onNavigateToAttackLab()}
              className="text-xs font-semibold text-[#2E595A] hover:text-[#052326] flex items-center space-x-1"
            >
              <span>View in Attack Lab</span>
              <ArrowRight className="w-3 h-3" />
            </button>
          </div>

          <p className="text-xs text-[#678882] leading-relaxed">
            Every attack class is verified deterministically against the Security Gateway and Policy Engine.
            Click any category to filter and launch penetration test suites:
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
            {DATASET_CATEGORIES.map((cat) => (
              <div
                key={cat.id}
                onClick={() => onNavigateToAttackLab(cat.id)}
                className="p-3.5 rounded-xl border border-[#E8ECE9] bg-[#FBF9F8] hover:bg-white hover:border-[#A5B5A9] transition-all cursor-pointer group shadow-sm hover:shadow"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-[#052326] group-hover:text-[#2E595A] transition-colors">
                    {cat.label}
                  </span>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-white border border-[#E8ECE9] text-[#2E595A] font-semibold">
                    {cat.count} cases
                  </span>
                </div>
                <p className="text-[11px] text-[#678882] mt-1.5 line-clamp-1 leading-snug">
                  Deterministic regression suite for {cat.label.toLowerCase()} vectors.
                </p>
                <div className="mt-2.5 flex items-center justify-between text-[10px] text-[#2E595A] pt-2 border-t border-[#E8ECE9]/70">
                  <span className="font-mono">Defense: 100% BLOCKED</span>
                  <span className="font-semibold text-[#C9A86A] group-hover:translate-x-0.5 transition-transform flex items-center">
                    Run Suite →
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right Column (1/3): Live Security Events */}
        <div className="bg-white rounded-2xl border border-[#E8ECE9] p-6 shadow-sm space-y-4 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-4 border-b border-[#E8ECE9]">
              <div>
                <div className="flex items-center space-x-2">
                  <span className="text-[10px] font-bold tracking-[0.16em] uppercase text-[#678882]">
                    AUDIT TELEMETRY
                  </span>
                  <span className="w-1.5 h-1.5 rounded-full bg-[#C9A86A]" />
                </div>
                <h3 className="text-base font-serif font-bold text-[#052326] mt-0.5">
                  Live Interception Feed
                </h3>
              </div>

              <div className="flex items-center space-x-1.5 text-[11px] font-mono text-[#2E595A]">
                <Radio className="w-3.5 h-3.5 text-[#2E595A] animate-pulse" />
                <span>REAL-TIME</span>
              </div>
            </div>

            <div className="mt-3 space-y-2.5 max-h-[360px] overflow-y-auto pr-1">
              {recentEvents.length === 0 ? (
                <div className="p-8 text-center text-xs text-[#678882]">
                  No events logged yet. Execute an attack in the Attack Lab to observe telemetry.
                </div>
              ) : (
                recentEvents.slice(0, 7).map((ev) => {
                  const isBlocked = ev.decision === "BLOCK";
                  const isConfirm = ev.decision === "REQUIRE_CONFIRMATION";

                  return (
                    <div
                      key={ev.id}
                      onClick={() => onNavigateToTrace && onNavigateToTrace(ev.correlationId)}
                      className="p-3 rounded-lg border border-[#E8ECE9] bg-[#FBF9F8] hover:bg-white hover:border-[#A5B5A9] transition-all text-xs cursor-pointer group"
                    >
                      <div className="flex items-center justify-between">
                        <span
                          className={`font-mono text-[10px] px-1.5 py-0.5 rounded font-bold ${
                            isBlocked
                              ? "bg-[#FAF5EB] text-[#C9A86A] border border-[#C9A86A]/40"
                              : isConfirm
                              ? "bg-[#FAF5EB] text-[#C9A86A]"
                              : "bg-[#EBF1ED] text-[#2E595A]"
                          }`}
                        >
                          {ev.decision}
                        </span>
                        <span className="text-[10px] font-mono text-[#678882]">
                          {new Date(ev.timestamp).toLocaleTimeString()}
                        </span>
                      </div>

                      <div className="mt-1 font-semibold text-[#052326] truncate">
                        {ev.requestedTool
                          ? `Tool: ${ev.requestedTool}`
                          : ev.eventType.replace(/_/g, " ")}
                      </div>

                      <p className="text-[11px] text-[#678882] line-clamp-1 mt-0.5">
                        {ev.reason || "Evaluated by security policy"}
                      </p>

                      <div className="mt-1.5 pt-1.5 border-t border-[#E8ECE9]/60 flex items-center justify-between text-[9px] font-mono text-[#678882]">
                        <span className="truncate max-w-[120px]">
                          CID: {ev.correlationId.slice(0, 10)}...
                        </span>
                        <span className="text-[#2E595A] group-hover:text-[#052326] font-medium flex items-center space-x-0.5">
                          <GitCommit className="w-2.5 h-2.5 mr-0.5" />
                          <span>Inspect Trace</span>
                        </span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          <div className="pt-3 border-t border-[#E8ECE9]">
            <button
              onClick={() => onNavigateToAttackLab()}
              className="w-full py-2 rounded-xl bg-[#F7F9F8] hover:bg-[#EBF1ED] text-[#052326] border border-[#E8ECE9] text-xs font-semibold text-center transition-colors"
            >
              Open Full Audit Log & Traces
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}
