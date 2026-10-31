"use client";

import React from "react";
import {
  LayoutDashboard,
  Cpu,
  FlaskConical,
  ShieldAlert,
  Radio,
  FileCheck2,
  GitCommit,
  ScrollText,
  Award,
  Wrench,
  Bot,
  Activity,
  Sliders,
} from "lucide-react";
import { KavachLogo } from "@/components/brand/KavachLogo";

export type NavItemKey =
  | "overview"
  | "live-agent"
  | "attack-lab"
  | "threat-detection"
  | "security-events"
  | "policy-decisions"
  | "security-trace"
  | "audit-trail"
  | "evaluation"
  | "tools"
  | "providers"
  | "system-health"
  | "settings";

interface SidebarProps {
  activeKey: NavItemKey;
  onSelectKey: (key: NavItemKey) => void;
}

interface NavSectionGroup {
  label: string;
  items: {
    key: NavItemKey;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
    badge?: string;
  }[];
}

const NAV_GROUPS: NavSectionGroup[] = [
  {
    label: "COMMAND CENTER",
    items: [
      { key: "overview", label: "Overview", icon: LayoutDashboard },
      { key: "live-agent", label: "Live Agent", icon: Cpu, badge: "Gemini" },
    ],
  },
  {
    label: "DEFENSE",
    items: [
      { key: "attack-lab", label: "Attack Lab", icon: FlaskConical, badge: "138" },
      { key: "threat-detection", label: "Threat Detection", icon: ShieldAlert },
      { key: "security-events", label: "Security Events", icon: Radio },
      { key: "policy-decisions", label: "Policy Decisions", icon: FileCheck2 },
    ],
  },
  {
    label: "OBSERVABILITY",
    items: [
      { key: "security-trace", label: "Security Trace", icon: GitCommit },
      { key: "audit-trail", label: "Audit Trail", icon: ScrollText },
      { key: "evaluation", label: "Evaluation", icon: Award, badge: "100%" },
    ],
  },
  {
    label: "SYSTEM",
    items: [
      { key: "tools", label: "Tools", icon: Wrench, badge: "6" },
      { key: "providers", label: "Providers", icon: Bot },
      { key: "system-health", label: "System Health", icon: Activity },
      { key: "settings", label: "Settings", icon: Sliders },
    ],
  },
];

export function Sidebar({ activeKey, onSelectKey }: SidebarProps) {
  return (
    <aside className="w-64 bg-white border-r border-[#E8ECE9] flex flex-col justify-between h-screen sticky top-0 flex-shrink-0 select-none shadow-[2px_0_12px_rgba(5,35,38,0.02)]">
      {/* Brand Header */}
      <div>
        <div className="px-5 py-5 border-b border-[#E8ECE9] flex items-center justify-between">
          <KavachLogo size={36} showText={true} />
        </div>

        {/* Navigation Sections */}
        <div className="px-3 py-4 space-y-6 overflow-y-auto max-h-[calc(100vh-140px)]">
          {NAV_GROUPS.map((group) => (
            <div key={group.label} className="space-y-1">
              <div className="px-3 pb-1 text-[10px] font-bold tracking-[0.16em] uppercase text-[#678882]/80">
                {group.label}
              </div>
              <div className="space-y-0.5">
                {group.items.map((item) => {
                  const Icon = item.icon;
                  const isActive = activeKey === item.key;
                  return (
                    <button
                      key={item.key}
                      onClick={() => onSelectKey(item.key)}
                      className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition-all group ${
                        isActive
                          ? "bg-[#EBF1ED] text-[#052326] shadow-sm font-semibold"
                          : "text-[#2E595A] hover:bg-[#F7F9F8] hover:text-[#052326]"
                      }`}
                    >
                      <div className="flex items-center space-x-2.5">
                        <Icon
                          className={`w-4 h-4 transition-colors ${
                            isActive
                              ? "text-[#2E595A]"
                              : "text-[#678882] group-hover:text-[#2E595A]"
                          }`}
                        />
                        <span className="truncate">{item.label}</span>
                      </div>

                      <div className="flex items-center space-x-1.5">
                        {item.badge && (
                          <span
                            className={`text-[9px] font-mono px-1.5 py-0.5 rounded-full ${
                              isActive
                                ? "bg-white text-[#2E595A] border border-[#A5B5A9]/40"
                                : "bg-[#F3F6F4] text-[#678882]"
                            }`}
                          >
                            {item.badge}
                          </span>
                        )}
                        {isActive && (
                          <span className="w-1.5 h-1.5 rounded-full bg-[#C9A86A] shadow-[0_0_6px_rgba(201,168,106,0.8)]" />
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Bottom Operational Status Pill */}
      <div className="p-4 border-t border-[#E8ECE9] bg-[#FBF9F8]">
        <div className="flex items-center justify-between px-3 py-2 rounded-lg bg-white border border-[#E8ECE9] shadow-sm">
          <div className="flex flex-col">
            <span className="text-[9px] tracking-[0.14em] uppercase font-bold text-[#678882]">
              DEFENSE ENGINE
            </span>
            <div className="flex items-center space-x-1.5 mt-0.5">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#2E595A] opacity-60"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-[#2E595A]"></span>
              </span>
              <span className="text-xs font-bold text-[#052326] tracking-wide">
                OPERATIONAL
              </span>
            </div>
          </div>
          <span className="text-[10px] font-mono font-medium text-[#C9A86A] bg-[#FAF5EB] px-2 py-0.5 rounded border border-[#C9A86A]/30">
            STRICT
          </span>
        </div>
      </div>
    </aside>
  );
}
