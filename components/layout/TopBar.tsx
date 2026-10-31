"use client";

import React from "react";
import { Bell, Sparkles, User, ShieldCheck } from "lucide-react";
import { NavItemKey } from "./Sidebar";

interface TopBarProps {
  activeKey: NavItemKey;
  recentAlertCount?: number;
  onOpenNotifications?: () => void;
}

const PAGE_META: Record<NavItemKey, { title: string; subtitle: string }> = {
  overview: {
    title: "Security Command Center",
    subtitle: "Real-time posture and multi-layer deterministic defense for AI agents.",
  },
  "live-agent": {
    title: "Live Agent Simulator",
    subtitle: "Interactive prompt injection testing and real-time security gateway interception.",
  },
  "attack-lab": {
    title: "Adversarial Attack Lab",
    subtitle: "138-case deterministic regression corpus and category-level penetration matrix.",
  },
  "threat-detection": {
    title: "Threat Detection Engine",
    subtitle: "Unicode NFKD normalization, heuristic signatures, and exfiltration detectors.",
  },
  "security-events": {
    title: "Intercepted Security Events",
    subtitle: "Live audit telemetry of intercepted prompt injections and policy denials.",
  },
  "policy-decisions": {
    title: "Policy Engine & Governance",
    subtitle: "Deterministic rule evaluation: APPROVE, BLOCK, and REQUIRE_CONFIRMATION.",
  },
  "security-trace": {
    title: "Security Traces & Forensics",
    subtitle: "End-to-end correlation ID request tracking across agent reasoning cycles.",
  },
  "audit-trail": {
    title: "Tamper-Evident Audit Trail",
    subtitle: "Cryptographic event log preserving immutable evidence with zero secret logging.",
  },
  evaluation: {
    title: "Quantitative Security Evaluation",
    subtitle: "Standardized benchmark scorecards across 112 malicious and 22 benign cases.",
  },
  tools: {
    title: "Tool Gateway & Sandboxes",
    subtitle: "Declarative schemas, execution boundaries, and zero-authority data wrappers.",
  },
  providers: {
    title: "LLM Providers & Architecture",
    subtitle: "Decoupled agent reasoning: Gemini 3.8 Flash, Mock, and zero-execution invariants.",
  },
  "system-health": {
    title: "System Integrity & Health",
    subtitle: "Runtime latencies and component availability across the defensive perimeter.",
  },
  settings: {
    title: "Defense Configuration & Settings",
    subtitle: "Enforcement policies, audit log thresholds, and environment controls.",
  },
};

export function TopBar({
  activeKey,
  recentAlertCount = 0,
  onOpenNotifications,
}: TopBarProps) {
  const meta = PAGE_META[activeKey] || PAGE_META.overview;

  return (
    <header className="h-16 bg-white border-b border-[#E8ECE9] px-6 flex items-center justify-between sticky top-0 z-30 shadow-[0_1px_3px_rgba(5,35,38,0.02)]">
      {/* Left: Page Title & Subtitle */}
      <div>
        <h1 className="text-base font-bold text-[#052326] tracking-tight flex items-center space-x-2">
          <span>{meta.title}</span>
        </h1>
        <p className="text-xs text-[#678882] tracking-normal font-normal">
          {meta.subtitle}
        </p>
      </div>

      {/* Right: Operational Status, Active Provider, Alerts, Profile */}
      <div className="flex items-center space-x-3.5">
        {/* Defense Operational Pill */}
        <div className="hidden sm:flex items-center space-x-2 px-3 py-1 rounded-full bg-[#F2F6F3] border border-[#A5B5A9]/50 text-xs text-[#2E595A]">
          <ShieldCheck className="w-3.5 h-3.5 text-[#2E595A]" />
          <span className="font-semibold text-[11px] tracking-wide uppercase">
            DEFENSE OPERATIONAL
          </span>
        </div>

        {/* Provider Tag */}
        <div className="flex items-center space-x-1.5 px-2.5 py-1 rounded-full bg-[#FAF5EB] border border-[#C9A86A]/40 text-xs">
          <Sparkles className="w-3 h-3 text-[#C9A86A]" />
          <span className="text-[10px] uppercase font-bold tracking-wider text-[#052326]">
            PROVIDER:
          </span>
          <span className="text-[10px] font-mono font-bold text-[#C9A86A]">
            GEMINI
          </span>
        </div>

        {/* Notifications Icon */}
        <button
          onClick={onOpenNotifications}
          className="relative p-2 rounded-lg text-[#678882] hover:text-[#052326] hover:bg-[#F7F9F8] transition-colors"
          title="Recent Security Alerts"
        >
          <Bell className="w-4 h-4" />
          {recentAlertCount > 0 && (
            <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-[#C9A86A] ring-2 ring-white" />
          )}
        </button>

        {/* Profile / System Menu */}
        <div className="flex items-center space-x-2 pl-2 border-l border-[#E8ECE9]">
          <div className="w-8 h-8 rounded-full bg-[#EBF1ED] border border-[#A5B5A9]/60 flex items-center justify-center text-[#2E595A] font-semibold text-xs shadow-sm">
            <User className="w-4 h-4" />
          </div>
          <div className="hidden md:flex flex-col text-left">
            <span className="text-xs font-bold text-[#052326] leading-none">
              SecOps Lead
            </span>
            <span className="text-[10px] font-mono text-[#678882] leading-tight">
              Enterprise Admin
            </span>
          </div>
        </div>
      </div>
    </header>
  );
}
