"use client";

import React from "react";
import { Shield, Terminal, FlaskConical, ScrollText, Activity, Flame, GitCommit } from "lucide-react";

export type NavSection = "command-center" | "attack-lab" | "live-demo" | "audit" | "trace" | "butler";

interface NavbarProps {
  activeSection: NavSection;
  onSelectSection: (section: NavSection) => void;
}

export const navigationItems: { id: NavSection; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { id: "command-center", label: "Command Center", icon: Activity },
  { id: "attack-lab", label: "Attack Lab", icon: FlaskConical },
  { id: "live-demo", label: "Live Demo", icon: Flame },
  { id: "audit", label: "Audit Log", icon: ScrollText },
  { id: "trace", label: "Security Traces", icon: GitCommit },
  { id: "butler", label: "Architecture", icon: Terminal },
];

export function Navbar({ activeSection, onSelectSection }: NavbarProps) {
  return (
    <header className="border-b border-slate-800 bg-slate-950/70 backdrop-blur sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="w-9 h-9 rounded-lg bg-indigo-600/20 border border-indigo-500/40 flex items-center justify-center text-indigo-400">
            <Shield className="w-5 h-5" />
          </div>
          <div>
            <span className="font-bold text-base tracking-wider text-slate-100 uppercase">
              Possessed Butler
            </span>
            <span className="ml-2 text-xs font-mono px-2 py-0.5 rounded bg-indigo-950 border border-indigo-800/60 text-indigo-300">
              Defensive LLM Agent
            </span>
          </div>
        </div>

        <nav className="flex space-x-1 sm:space-x-2">
          {navigationItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeSection === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onSelectSection(item.id)}
                className={`flex items-center space-x-2 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                  isActive
                    ? "bg-slate-800 text-indigo-300 border border-indigo-500/30"
                    : "text-slate-400 hover:text-slate-200 hover:bg-slate-900"
                }`}
              >
                <Icon className="w-4 h-4" />
                <span className="hidden sm:inline">{item.label}</span>
              </button>
            );
          })}
        </nav>
      </div>
    </header>
  );
}
