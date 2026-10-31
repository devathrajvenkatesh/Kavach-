"use client";

import React, { useState } from "react";
import { Sidebar, NavItemKey } from "@/components/layout/Sidebar";
import { TopBar } from "@/components/layout/TopBar";
import { CommandCenter } from "@/components/dashboard/CommandCenter";
import { AttackLab } from "@/components/attack-lab/AttackLab";
import { LiveAttackDemo } from "@/components/demo/LiveAttackDemo";
import { ThreatDetectionView } from "@/components/views/ThreatDetectionView";
import { SecurityEventsView } from "@/components/views/SecurityEventsView";
import { PolicyDecisionsView } from "@/components/views/PolicyDecisionsView";
import { SecurityTraceView } from "@/components/audit/SecurityTraceView";
import { AuditTrail } from "@/components/audit/AuditTrail";
import { EvaluationView } from "@/components/views/EvaluationView";
import { ToolsView } from "@/components/views/ToolsView";
import { ProvidersView } from "@/components/views/ProvidersView";
import { SystemHealthView } from "@/components/views/SystemHealthView";
import { SettingsView } from "@/components/views/SettingsView";
import { UnifiedTestCase } from "@/lib/attack-lab/types";

export default function HomePage() {
  const [activeKey, setActiveKey] = useState<NavItemKey>("overview");
  const [selectedLabCategory, setSelectedLabCategory] = useState<string>("ALL");
  const [selectedDemoCase, setSelectedDemoCase] = useState<UnifiedTestCase | undefined>(undefined);
  const [selectedTraceId, setSelectedTraceId] = useState<string | undefined>(undefined);

  const handleNavigateToAttackLab = (category?: string) => {
    if (category) setSelectedLabCategory(category);
    setActiveKey("attack-lab");
  };

  const handleNavigateToLiveDemo = (testCase?: UnifiedTestCase) => {
    if (testCase) setSelectedDemoCase(testCase);
    setActiveKey("live-agent");
  };

  const handleNavigateToTrace = (correlationId?: string) => {
    if (correlationId) setSelectedTraceId(correlationId);
    setActiveKey("security-trace");
  };

  return (
    <div className="min-h-screen flex bg-[#FBF9F8] text-[#052326] font-sans antialiased selection:bg-[#C9A86A]/30">
      {/* 1. Left Sidebar (Fixed Desktop-First Shell) */}
      <Sidebar activeKey={activeKey} onSelectKey={setActiveKey} />

      {/* 2. Main Application Canvas */}
      <div className="flex-1 flex flex-col min-w-0 overflow-y-auto min-h-screen">
        {/* Top Navigation Bar */}
        <TopBar
          activeKey={activeKey}
          recentAlertCount={3}
          onOpenNotifications={() => setActiveKey("security-events")}
        />

        {/* Content Area */}
        <main className="flex-1 p-6 sm:p-8 max-w-7xl w-full mx-auto">
          {activeKey === "overview" && (
            <CommandCenter
              onNavigateToAttackLab={handleNavigateToAttackLab}
              onNavigateToLiveDemo={() => handleNavigateToLiveDemo()}
              onNavigateToTrace={handleNavigateToTrace}
            />
          )}

          {activeKey === "live-agent" && (
            <LiveAttackDemo initialCase={selectedDemoCase} />
          )}

          {activeKey === "attack-lab" && (
            <AttackLab
              initialCategory={selectedLabCategory}
              onLaunchDemoWithCase={(tc) => handleNavigateToLiveDemo(tc)}
            />
          )}

          {activeKey === "threat-detection" && <ThreatDetectionView />}

          {activeKey === "security-events" && (
            <SecurityEventsView onNavigateToTrace={handleNavigateToTrace} />
          )}

          {activeKey === "policy-decisions" && <PolicyDecisionsView />}

          {activeKey === "security-trace" && (
            <SecurityTraceView
              initialCorrelationId={selectedTraceId}
              onClose={() => setActiveKey("overview")}
            />
          )}

          {activeKey === "audit-trail" && (
            <AuditTrail onNavigateToTrace={handleNavigateToTrace} />
          )}

          {activeKey === "evaluation" && <EvaluationView />}

          {activeKey === "tools" && <ToolsView />}

          {activeKey === "providers" && <ProvidersView />}

          {activeKey === "system-health" && <SystemHealthView />}

          {activeKey === "settings" && <SettingsView />}
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
