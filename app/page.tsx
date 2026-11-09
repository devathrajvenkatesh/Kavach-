"use client";

import React, { useState, useEffect } from "react";
import { Sidebar, NavItemKey } from "@/components/layout/Sidebar";
import { TopBar } from "@/components/layout/TopBar";
import { CommandCenter } from "@/components/dashboard/CommandCenter";
import { LiveAttackDemo } from "@/components/demo/LiveAttackDemo";
import { ThreatCenterView } from "@/components/views/ThreatCenterView";
import { SecurityActivityView } from "@/components/views/SecurityActivityView";
import { AttackLab } from "@/components/attack-lab/AttackLab";
import { AuditTrail } from "@/components/audit/AuditTrail";
import { SecurityTraceView } from "@/components/audit/SecurityTraceView";
import { SettingsView } from "@/components/views/SettingsView";
import { SecureFileWorkspace } from "@/components/files/SecureFileWorkspace";
import { WorkspaceFile } from "@/types/file-workspace";
import { ReplyDraft } from "@/types/agent";
import LoginPage from "@/app/login/page";
import { ShieldCheck } from "lucide-react";

export default function HomePage() {
  const [activeKey, setActiveKey] = useState<NavItemKey>(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const tab = params.get("tab") as NavItemKey | null;
      if (tab) return tab;
    }
    return "overview";
  });

  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [selectedLabCategory, setSelectedLabCategory] = useState<string>("ALL");
  const [selectedTraceId, setSelectedTraceId] = useState<string | undefined>(undefined);
  const [selectedWorkspaceFileForAgent, setSelectedWorkspaceFileForAgent] = useState<WorkspaceFile | null>(null);
  const [selectedQueuedDraft, setSelectedQueuedDraft] = useState<{ file: WorkspaceFile; draft: ReplyDraft } | null>(null);

  // Authenticate session on mount
  useEffect(() => {
    let isMounted = true;
    async function checkAuth() {
      try {
        const res = await fetch("/api/auth/session");
        if (res.ok) {
          const data = await res.json();
          if (isMounted) {
            setIsAuthenticated(Boolean(data.authenticated));
          }
        } else {
          if (isMounted) setIsAuthenticated(false);
        }
      } catch {
        if (isMounted) setIsAuthenticated(false);
      }
    }
    checkAuth();
    return () => {
      isMounted = false;
    };
  }, []);

  // Sync tab with URL query changes
  useEffect(() => {
    if (typeof window !== "undefined") {
      const handlePopState = () => {
        const params = new URLSearchParams(window.location.search);
        const tab = params.get("tab") as NavItemKey | null;
        if (tab) setActiveKey(tab);
      };
      window.addEventListener("popstate", handlePopState);
      return () => window.removeEventListener("popstate", handlePopState);
    }
  }, []);

  const handleSelectKey = (key: NavItemKey) => {
    setActiveKey(key);
    if (typeof window !== "undefined") {
      const url = new URL(window.location.href);
      url.searchParams.set("tab", key);
      window.history.pushState({}, "", url.toString());
    }
  };

  const handleNavigateToAttackLab = (category?: string) => {
    if (category) setSelectedLabCategory(category);
    handleSelectKey("attack-lab");
  };

  const handleNavigateToAgent = () => {
    handleSelectKey("ai-agent");
  };

  const handleNavigateToTrace = (correlationId?: string) => {
    if (correlationId) setSelectedTraceId(correlationId);
    handleSelectKey("security-trace");
  };

  const handleFileToAgent = (file: WorkspaceFile) => {
    setSelectedWorkspaceFileForAgent(file);
    handleSelectKey("ai-agent");
  };

  const handleQueueReplyAction = (file: WorkspaceFile, draft: ReplyDraft) => {
    setSelectedWorkspaceFileForAgent(file);
    setSelectedQueuedDraft({ file, draft });
    handleSelectKey("ai-agent");
  };

  // Loading Session State
  if (isAuthenticated === null) {
    return (
      <div className="min-h-screen bg-[#FAF7EE] flex items-center justify-center text-[#052326]">
        <div className="flex flex-col items-center space-y-3">
          <div className="p-3 bg-[#052326] text-[#C9A86A] rounded-2xl shadow-xs animate-pulse">
            <ShieldCheck className="w-8 h-8" />
          </div>
          <div className="text-xs font-mono font-bold uppercase tracking-wider text-[#678882]">
            Verifying Security Session...
          </div>
        </div>
      </div>
    );
  }

  // Unauthenticated State: Show Login Landing Page
  if (isAuthenticated === false) {
    return <LoginPage />;
  }

  // Authenticated State: Full Kavach Console
  return (
    <div className="min-h-screen flex bg-[#F7F4EA] text-[#052326] font-sans antialiased selection:bg-[#C9A86A]/30">
      {/* 1. Left Sidebar (Streamlined Enterprise Navigation) */}
      <Sidebar activeKey={activeKey} onSelectKey={handleSelectKey} />

      {/* 2. Main Application Canvas */}
      <div className="flex-1 flex flex-col min-w-0 overflow-y-auto min-h-screen">
        {/* Top Navigation Bar */}
        <TopBar
          activeKey={activeKey}
          recentAlertCount={3}
          onOpenNotifications={() => handleSelectKey("security-activity")}
          onNavigateToTab={handleSelectKey}
        />

        {/* Content Area */}
        <main className="flex-1 p-6 sm:p-8 max-w-7xl w-full mx-auto">
          {activeKey === "overview" && (
            <CommandCenter
              onNavigateToAttackLab={() => handleNavigateToAttackLab()}
              onNavigateToAgent={handleNavigateToAgent}
              onNavigateToThreats={() => handleSelectKey("threat-center")}
              onNavigateToActivity={() => handleSelectKey("security-activity")}
              onNavigateToTrace={handleNavigateToTrace}
              onNavigateToFiles={() => handleSelectKey("files")}
              onQueueReplyAction={handleQueueReplyAction}
            />
          )}

          {(activeKey === "ai-agent" || activeKey === "live-agent") && (
            <LiveAttackDemo
              initialWorkspaceFile={selectedWorkspaceFileForAgent}
              initialQueuedDraft={selectedQueuedDraft}
              onClearWorkspaceFile={() => setSelectedWorkspaceFileForAgent(null)}
              onClearQueuedDraft={() => setSelectedQueuedDraft(null)}
            />
          )}

          {(activeKey === "files" ||
            activeKey === "secure-files" ||
            activeKey === "files-workspace") && (
            <SecureFileWorkspace
              onSendToAgent={handleFileToAgent}
              onQueueReplyAction={handleQueueReplyAction}
            />
          )}

          {(activeKey === "threat-center" ||
            activeKey === "threat-detection" ||
            activeKey === "policy-decisions") && <ThreatCenterView />}

          {(activeKey === "security-activity" || activeKey === "security-events") && (
            <SecurityActivityView onNavigateToTrace={handleNavigateToTrace} />
          )}

          {activeKey === "attack-lab" && (
            <AttackLab
              initialCategory={selectedLabCategory}
            />
          )}

          {(activeKey === "audit" || activeKey === "audit-trail" || activeKey === "evaluation") && (
            <AuditTrail onNavigateToTrace={handleNavigateToTrace} />
          )}

          {activeKey === "security-trace" && (
            <SecurityTraceView
              initialCorrelationId={selectedTraceId}
              onClose={() => handleSelectKey("audit")}
            />
          )}

          {(activeKey === "settings" ||
            activeKey === "tools" ||
            activeKey === "providers" ||
            activeKey === "system-health") && <SettingsView />}
        </main>

        {/* Footer */}
        <footer className="border-t border-[#E8ECE9] py-4 px-8 text-center text-xs font-mono text-[#678882] bg-white flex flex-col sm:flex-row items-center justify-between gap-2">
          <div className="flex items-center space-x-2">
            <span className="font-serif font-bold text-[#052326]">KAVACH</span>
            <span>•</span>
            <span>Intelligent Protection for AI Agents</span>
          </div>
          <div>
            <span>SOC Defense Perimeter: Active • Invariant: Fail-Closed</span>
          </div>
        </footer>
      </div>
    </div>
  );
}
