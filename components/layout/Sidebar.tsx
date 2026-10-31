"use client";

import React from "react";
import {
  LayoutDashboard,
  Bot,
  ShieldAlert,
  Radio,
  FlaskConical,
  ScrollText,
  Sliders,
  FolderLock,
} from "lucide-react";
import { KavachLogo } from "@/components/brand/KavachLogo";

export type NavItemKey =
  | "overview"
  | "ai-agent"
  | "files"
  | "threat-center"
  | "security-activity"
  | "attack-lab"
  | "audit"
  | "settings"
  // Backward compatibility keys
  | "secure-files"
  | "files-workspace"
  | "live-agent"
  | "threat-detection"
  | "security-events"
  | "policy-decisions"
  | "security-trace"
  | "audit-trail"
  | "evaluation"
  | "tools"
  | "providers"
  | "system-health";

interface SidebarProps {
  activeKey: NavItemKey;
  onSelectKey: (key: NavItemKey) => void;
}

interface NavItem {
  key: NavItemKey;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: string;
  aliases?: NavItemKey[];
}

const PRIMARY_NAV_ITEMS: NavItem[] = [
  {
    key: "overview",
    label: "Overview",
    icon: LayoutDashboard,
  },
  {
    key: "ai-agent",
    label: "AI Agent",
    icon: Bot,
    badge: "Live",
    aliases: ["live-agent"],
  },
  {
    key: "files",
    label: "Secure Files",
    icon: FolderLock,
    badge: "Drive",
    aliases: ["secure-files", "files-workspace"],
  },
  {
    key: "threat-center",
    label: "Threat Center",
    icon: ShieldAlert,
    badge: "112 Blocked",
    aliases: ["threat-detection", "policy-decisions"],
  },
  {
    key: "security-activity",
    label: "Security Activity",
    icon: Radio,
    aliases: ["security-events"],
  },
  {
    key: "attack-lab",
    label: "Attack Lab",
    icon: FlaskConical,
    badge: "138",
    aliases: ["evaluation"],
  },
  {
    key: "audit",
    label: "Audit",
    icon: ScrollText,
    aliases: ["audit-trail", "security-trace"],
  },
  {
    key: "settings",
    label: "Settings",
    icon: Sliders,
    aliases: ["tools", "providers", "system-health"],
  },
];

export function Sidebar({ activeKey, onSelectKey }: SidebarProps) {
  // Normalize alias keys to primary keys for active styling
  const isItemActive = (item: NavItem): boolean => {
    if (activeKey === item.key) return true;
    if (item.aliases && item.aliases.includes(activeKey)) return true;
    return false;
  };

  return (
    <aside className="w-64 bg-white border-r border-[#E8ECE9] flex flex-col justify-between h-screen sticky top-0 flex-shrink-0 select-none shadow-[2px_0_12px_rgba(5,35,38,0.02)]">
      {/* Brand Header */}
      <div>
        <div className="px-5 py-5 border-b border-[#E8ECE9] flex items-center justify-between">
          <KavachLogo size={36} showText={true} />
        </div>

        {/* Clean Primary Navigation */}
        <div className="px-3 py-5 space-y-1">
          <div className="px-3 pb-2 text-[10px] font-bold tracking-[0.16em] uppercase text-[#678882]/80">
            Navigation
          </div>

          <div className="space-y-1">
            {PRIMARY_NAV_ITEMS.map((item) => {
              const Icon = item.icon;
              const active = isItemActive(item);

              return (
                <button
                  key={item.key}
                  onClick={() => onSelectKey(item.key)}
                  className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs transition-all group ${
                    active
                      ? "bg-[#EBF1ED] text-[#052326] shadow-xs font-semibold"
                      : "text-[#2E595A] hover:bg-[#F7F9F8] hover:text-[#052326] font-medium"
                  }`}
                >
                  <div className="flex items-center space-x-3">
                    <Icon
                      className={`w-4 h-4 transition-colors ${
                        active
                          ? "text-[#052326]"
                          : "text-[#678882] group-hover:text-[#2E595A]"
                      }`}
                    />
                    <span className="truncate">{item.label}</span>
                  </div>

                  <div className="flex items-center space-x-1.5">
                    {item.badge && (
                      <span
                        className={`text-[9px] font-mono px-2 py-0.5 rounded-full ${
                          active
                            ? "bg-white text-[#052326] border border-[#A5B5A9]/40 font-semibold"
                            : "bg-[#F3F6F4] text-[#678882]"
                        }`}
                      >
                        {item.badge}
                      </span>
                    )}
                    {active && (
                      <span className="w-1.5 h-1.5 rounded-full bg-[#C9A86A] shadow-[0_0_6px_rgba(201,168,106,0.8)]" />
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Bottom Operational Status Pill */}
      <div className="p-4 border-t border-[#E8ECE9] bg-[#FBF9F8]">
        <div className="flex items-center justify-between px-3 py-2.5 rounded-xl bg-white border border-[#E8ECE9] shadow-xs">
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
          <span className="text-[10px] font-mono font-bold text-[#C9A86A] bg-[#FAF5EB] px-2 py-0.5 rounded border border-[#C9A86A]/30">
            PROTECTED
          </span>
        </div>
      </div>
    </aside>
  );
}
