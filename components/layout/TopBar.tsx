"use client";

import React from "react";
import { Bell, ShieldCheck, User } from "lucide-react";
import { NavItemKey } from "./Sidebar";

interface TopBarProps {
  activeKey: NavItemKey;
  recentAlertCount?: number;
  onOpenNotifications?: () => void;
}

const PAGE_META: Record<string, { title: string; subtitle: string }> = {
  overview: {
    title: "Overview",
    subtitle: "Real-time security posture and monitoring for your AI agent.",
  },
  "ai-agent": {
    title: "AI Agent",
    subtitle: "Interact securely with Kavach protected by deterministic authority boundaries.",
  },
  "live-agent": {
    title: "AI Agent",
    subtitle: "Interact securely with Kavach protected by deterministic authority boundaries.",
  },
  files: {
    title: "Secure File Workspace",
    subtitle: "Drive-style secure workspace inspecting untrusted emails, PDFs, and documents for prompt injection.",
  },
  "secure-files": {
    title: "Secure File Workspace",
    subtitle: "Drive-style secure workspace inspecting untrusted emails, PDFs, and documents for prompt injection.",
  },
  "files-workspace": {
    title: "Secure File Workspace",
    subtitle: "Drive-style secure workspace inspecting untrusted emails, PDFs, and documents for prompt injection.",
  },
  "threat-center": {
    title: "Threat Center",
    subtitle: "Kavach continuously identifies and blocks attempts to manipulate the AI agent.",
  },
  "threat-detection": {
    title: "Threat Center",
    subtitle: "Kavach continuously identifies and blocks attempts to manipulate the AI agent.",
  },
  "security-activity": {
    title: "Security Activity",
    subtitle: "Chronological activity feed of all agent requests, security checks, and protection events.",
  },
  "security-events": {
    title: "Security Activity",
    subtitle: "Chronological activity feed of all agent requests, security checks, and protection events.",
  },
  "policy-decisions": {
    title: "Policy Decisions",
    subtitle: "Deterministic enforcement of read permissions, side-effects, and human confirmations.",
  },
  "attack-lab": {
    title: "Attack Lab",
    subtitle: "Adversarial testing and security verification against 138 attack vectors.",
  },
  audit: {
    title: "Audit Trail",
    subtitle: "Tamper-evident log of all agent interactions and policy evaluations.",
  },
  "audit-trail": {
    title: "Audit Trail",
    subtitle: "Tamper-evident log of all agent interactions and policy evaluations.",
  },
  "security-trace": {
    title: "Security Forensics",
    subtitle: "Detailed end-to-end request tracing and security forensics.",
  },
  settings: {
    title: "Settings",
    subtitle: "Configure protection policies, notifications, and system diagnostics.",
  },
};

export function TopBar({
  activeKey,
  recentAlertCount = 0,
  onOpenNotifications,
}: TopBarProps) {
  const meta = PAGE_META[activeKey] || PAGE_META.overview;

  return (
    <header className="h-16 bg-white border-b border-[#E8ECE9] px-6 sm:px-8 flex items-center justify-between sticky top-0 z-30 shadow-[0_1px_3px_rgba(5,35,38,0.02)]">
      {/* Left: Clean Page Title & Supporting Subtext */}
      <div>
        <h1 className="text-base font-bold text-[#052326] tracking-tight flex items-center space-x-2">
          <span>{meta.title}</span>
        </h1>
        <p className="text-xs text-[#678882] tracking-normal font-normal">
          {meta.subtitle}
        </p>
      </div>

      {/* Right: Protection Status, Agent Online, Alerts, Profile */}
      <div className="flex items-center space-x-3.5">
        {/* Layer 1: Protection Status Indicator */}
        <div className="flex items-center space-x-2 px-3 py-1 rounded-full bg-[#EBF1ED] border border-[#A5B5A9]/50 text-xs text-[#2E595A]">
          <ShieldCheck className="w-3.5 h-3.5 text-[#2E595A]" />
          <span className="font-bold text-[11px] tracking-wide text-[#052326]">
            PROTECTED
          </span>
        </div>

        {/* Layer 1: Agent Status */}
        <div className="hidden sm:flex items-center space-x-1.5 px-3 py-1 rounded-full bg-[#FBF9F8] border border-[#E8ECE9] text-xs text-[#2E595A]">
          <span className="w-2 h-2 rounded-full bg-emerald-600 animate-pulse" />
          <span className="text-[11px] font-medium text-[#2E595A]">
            Agent Online
          </span>
        </div>

        {/* Notifications Icon Button */}
        <button
          onClick={onOpenNotifications}
          className="relative p-2 rounded-lg text-[#678882] hover:text-[#052326] hover:bg-[#F7F9F8] transition-colors"
          title="Security Alerts"
        >
          <Bell className="w-4 h-4" />
          {recentAlertCount > 0 && (
            <span className="absolute top-1 right-1 w-2 h-2 bg-[#C9A86A] rounded-full ring-2 ring-white" />
          )}
        </button>

        {/* User Profile Avatar */}
        <div className="flex items-center space-x-2 pl-2 border-l border-[#E8ECE9]">
          <div className="w-7 h-7 rounded-full bg-[#052326] text-white flex items-center justify-center text-xs font-semibold">
            <User className="w-3.5 h-3.5" />
          </div>
          <span className="hidden md:inline text-xs font-medium text-[#052326]">
            Security Admin
          </span>
        </div>
      </div>
    </header>
  );
}
