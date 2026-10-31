"use client";

import { useState } from "react";
import { Navbar, NavSection } from "@/components/layout/Navbar";
import { CommandCenter } from "@/components/dashboard/CommandCenter";
import { AttackLab } from "@/components/attack-lab/AttackLab";
import { LiveAttackDemo } from "@/components/demo/LiveAttackDemo";
import { AuditTrail } from "@/components/audit/AuditTrail";
import { SecurityTraceView } from "@/components/audit/SecurityTraceView";
import {
  FOUNDATIONAL_SECURITY_INVARIANT,
  TRUST_HIERARCHY_ORDER,
  EXTERNAL_CONTENT_SOURCES,
} from "@/lib/config/constants";
import {
  Shield,
  Terminal,
  Lock,
  AlertTriangle,
  Info,
} from "lucide-react";
import { UnifiedTestCase } from "@/lib/attack-lab/types";

export default function HomePage() {
  const [activeSection, setActiveSection] = useState<NavSection>("command-center");
  const [selectedLabCategory, setSelectedLabCategory] = useState<string>("ALL");
  const [selectedDemoCase, setSelectedDemoCase] = useState<UnifiedTestCase | undefined>(undefined);
  const [selectedTraceId, setSelectedTraceId] = useState<string | undefined>(undefined);

  const handleNavigateToAttackLab = (category?: string) => {
    if (category) setSelectedLabCategory(category);
    setActiveSection("attack-lab");
  };

  const handleNavigateToLiveDemo = (testCase?: UnifiedTestCase) => {
    if (testCase) setSelectedDemoCase(testCase);
    setActiveSection("live-demo");
  };

  const handleNavigateToTrace = (correlationId?: string) => {
    if (correlationId) setSelectedTraceId(correlationId);
    setActiveSection("trace");
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-950 text-slate-100 font-sans antialiased selection:bg-indigo-500 selection:text-white">
      {/* Global Navbar */}
      <Navbar activeSection={activeSection} onSelectSection={setActiveSection} />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {activeSection === "command-center" && (
          <CommandCenter
            onNavigateToAttackLab={handleNavigateToAttackLab}
            onNavigateToLiveDemo={() => setActiveSection("live-demo")}
            onNavigateToTrace={handleNavigateToTrace}
          />
        )}

        {activeSection === "attack-lab" && (
          <AttackLab
            initialCategory={selectedLabCategory}
            onLaunchDemoWithCase={(tc) => handleNavigateToLiveDemo(tc)}
          />
        )}

        {activeSection === "live-demo" && (
          <LiveAttackDemo initialCase={selectedDemoCase} />
        )}

        {activeSection === "audit" && (
          <AuditTrail onNavigateToTrace={handleNavigateToTrace} />
        )}

        {activeSection === "trace" && (
          <SecurityTraceView initialCorrelationId={selectedTraceId} />
        )}

        {activeSection === "butler" && (
          <div className="space-y-8 animate-in fade-in duration-300">
            {/* Hero Section */}
            <section className="rounded-xl border border-slate-800 bg-slate-900/60 p-6 sm:p-8 backdrop-blur shadow-xl relative overflow-hidden">
              <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-600/5 rounded-full blur-3xl pointer-events-none" />

              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-6 border-b border-slate-800">
                <div>
                  <div className="flex items-center space-x-2 text-indigo-400 font-mono text-xs uppercase tracking-widest mb-1">
                    <span>Architecture & Threat Model</span>
                    <span>•</span>
                    <span className="text-emerald-400">Deterministic Invariants</span>
                  </div>
                  <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-white">
                    POSSESSED BUTLER
                  </h1>
                  <p className="text-slate-400 text-base sm:text-lg mt-1">
                    Defensive LLM Agent Architecture
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-emerald-950/80 border border-emerald-800/80 text-emerald-300">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 mr-1.5 animate-pulse" />
                    Security Gateway Active
                  </span>
                  <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-slate-800 border border-slate-700 text-slate-300">
                    Pipeline: Multi-Layer Hardened
                  </span>
                </div>
              </div>

              {/* Foundational Security Invariant Banner */}
              <div className="mt-6 rounded-lg border border-amber-500/30 bg-amber-950/20 p-4">
                <div className="flex items-start space-x-3">
                  <Lock className="w-5 h-5 text-amber-400 mt-0.5 flex-shrink-0" />
                  <div className="space-y-1">
                    <div className="text-xs uppercase tracking-wider font-semibold text-amber-300">
                      Foundational Security Invariant
                    </div>
                    <div className="text-sm sm:text-base font-medium text-amber-100">
                      &ldquo;{FOUNDATIONAL_SECURITY_INVARIANT}&rdquo;
                    </div>
                    <p className="text-xs text-amber-300/80 mt-1">
                      Enforces strict separation between authoritative directives and untrusted external payloads.
                    </p>
                  </div>
                </div>
              </div>
            </section>

            {/* Architecture Invariants and Trust Hierarchy */}
            <section className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Left Column: Layer Breakdown */}
              <div className="lg:col-span-2 space-y-6">
                <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-6 space-y-4">
                  <div className="flex items-center space-x-2 pb-3 border-b border-slate-800">
                    <Terminal className="w-5 h-5 text-indigo-400" />
                    <h2 className="text-base font-bold text-white uppercase tracking-wider">
                      The Controlled Agent Execution Loop
                    </h2>
                  </div>

                  <div className="p-4 rounded-lg bg-slate-950 border border-slate-800 font-mono text-xs text-indigo-300 space-y-2">
                    <div>1. User Prompt (Authenticated Intent)</div>
                    <div className="text-slate-500 pl-4">↓</div>
                    <div>2. LLM Provider Reasons (Isolated Context)</div>
                    <div className="text-slate-500 pl-4">↓</div>
                    <div>3. LLM Requests Tool Invocation (Intent Only)</div>
                    <div className="text-slate-500 pl-4">↓</div>
                    <div className="text-amber-400 font-bold">4. SECURITY GATEWAY Intercepts (Mandatory Evaluation)</div>
                    <div className="text-slate-500 pl-4">↓</div>
                    <div>5. Threat Analyzer + Policy Engine produce PolicyDecision</div>
                    <div className="text-slate-500 pl-4">↓</div>
                    <div className="text-emerald-400 font-bold">6. Tool Gateway Executes iff Decision is APPROVE</div>
                    <div className="text-slate-500 pl-4">↓</div>
                    <div>7. External Data Tagged with Zero-Authority Boundary</div>
                    <div className="text-slate-500 pl-4">↓</div>
                    <div>8. Tamper-Evident Audit Event Committed</div>
                  </div>

                  <p className="text-xs text-slate-400 leading-relaxed">
                    Under this model, even if an attacker tricks the LLM into requesting a malicious action (such as forwarding secrets or wiping logs), the Security Gateway and Policy Engine intercept and block the request before the Tool Gateway can execute it.
                  </p>
                </div>

                {/* External Content Classification */}
                <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-6">
                  <div className="flex items-center space-x-2 text-sm font-semibold text-slate-200 mb-3">
                    <AlertTriangle className="w-4 h-4 text-amber-400" />
                    <span>External Content Classification (Data Only — Zero Authority)</span>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {EXTERNAL_CONTENT_SOURCES.map((source) => (
                      <div
                        key={source}
                        className="px-3 py-2 rounded-lg bg-slate-950/60 border border-slate-800/80 text-xs font-mono text-slate-300 flex items-center space-x-1.5"
                      >
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-400/80" />
                        <span>{source}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Right Column: Trust Hierarchy */}
              <div className="space-y-6">
                <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-6">
                  <div className="flex items-center space-x-2 pb-4 border-b border-slate-800/80">
                    <Shield className="w-5 h-5 text-indigo-400" />
                    <h2 className="text-lg font-semibold text-white">Trust Hierarchy</h2>
                  </div>
                  <p className="text-xs text-slate-400 mt-2 mb-4">
                    Strict authority precedence model. Higher levels strictly override lower levels.
                  </p>

                  <div className="space-y-3">
                    {TRUST_HIERARCHY_ORDER.map((item, index) => (
                      <div
                        key={item.name}
                        className={`rounded-lg border p-3 ${
                          index === 0
                            ? "bg-indigo-950/40 border-indigo-700/50"
                            : index === 1
                            ? "bg-blue-950/30 border-blue-800/40"
                            : index === 2
                            ? "bg-slate-900/60 border-slate-800"
                            : index === 3
                            ? "bg-slate-900/40 border-slate-800"
                            : "bg-amber-950/20 border-amber-900/30"
                        }`}
                      >
                        <div className="flex items-center justify-between text-xs font-bold font-mono">
                          <span
                            className={
                              index === 0
                                ? "text-indigo-300"
                                : index === 1
                                ? "text-blue-300"
                                : index === 4
                                ? "text-amber-400"
                                : "text-slate-300"
                            }
                          >
                            {item.name}
                          </span>
                          <span className="text-slate-500 text-[10px]">Tier {item.level}</span>
                        </div>
                        <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                          {item.description}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-4">
                  <div className="flex items-center space-x-2 text-xs font-medium text-slate-400">
                    <Info className="w-4 h-4 text-slate-500" />
                    <span>Possessed Butler Architecture: Deterministic Hardened Defense.</span>
                  </div>
                </div>
              </div>
            </section>
          </div>
        )}
      </main>

      {/* Global Footer */}
      <footer className="border-t border-slate-800/80 py-4 text-center text-xs font-mono text-slate-500 bg-slate-950">
        Possessed Butler • Defensive LLM Agent Architecture • SOC Command Center Active
      </footer>
    </div>
  );
}
