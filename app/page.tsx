"use client";

import { useState } from "react";
import { Navbar, NavSection } from "@/components/layout/Navbar";
import {
  FOUNDATIONAL_SECURITY_INVARIANT,
  TRUST_HIERARCHY_ORDER,
  EXTERNAL_CONTENT_SOURCES,
} from "@/lib/config/constants";
import {
  Shield,
  Terminal,
  FlaskConical,
  BarChart3,
  ScrollText,
  Lock,
  AlertTriangle,
  Info,
} from "lucide-react";

export default function HomePage() {
  const [activeSection, setActiveSection] = useState<NavSection>("butler");

  return (
    <div className="min-h-screen flex flex-col bg-slate-950 text-slate-100">
      <Navbar activeSection={activeSection} onSelectSection={setActiveSection} />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* Hero Section */}
        <section className="rounded-xl border border-slate-800 bg-slate-900/60 p-6 sm:p-8 backdrop-blur shadow-xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-600/5 rounded-full blur-3xl pointer-events-none" />

          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-6 border-b border-slate-800">
            <div>
              <div className="flex items-center space-x-2 text-indigo-400 font-mono text-xs uppercase tracking-widest mb-1">
                <span>Mission 1 Foundation</span>
                <span>•</span>
                <span className="text-emerald-400">Initialized & Verified</span>
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
                Workspace Operational
              </span>
              <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-slate-800 border border-slate-700 text-slate-300">
                Reasoning Runtime: Claude (Planned)
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

        {/* Conceptual Navigation Section View */}
        <section className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Interactive Placeholder Panel */}
          <div className="lg:col-span-2 space-y-6">
            <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-6">
              <div className="flex items-center justify-between pb-4 border-b border-slate-800/80">
                <div className="flex items-center space-x-2">
                  {activeSection === "butler" && <Terminal className="w-5 h-5 text-indigo-400" />}
                  {activeSection === "security" && <Shield className="w-5 h-5 text-indigo-400" />}
                  {activeSection === "attack-lab" && <FlaskConical className="w-5 h-5 text-indigo-400" />}
                  {activeSection === "evaluation" && <BarChart3 className="w-5 h-5 text-indigo-400" />}
                  {activeSection === "audit" && <ScrollText className="w-5 h-5 text-indigo-400" />}
                  <h2 className="text-lg font-semibold text-white capitalize">
                    {activeSection.replace("-", " ")} Module
                  </h2>
                </div>
                <span className="text-xs font-mono px-2.5 py-1 rounded bg-slate-800 text-slate-400 border border-slate-700">
                  Extension Point (Planned)
                </span>
              </div>

              {/* Dynamic Content Placeholders */}
              <div className="mt-6">
                {activeSection === "butler" && (
                  <div className="space-y-4">
                    <p className="text-sm text-slate-300">
                      The <strong className="text-white">Butler</strong> orchestrator coordinates user intents, performs defensive reasoning, and interfaces with verified tools under strict policy control.
                    </p>
                    <div className="rounded-lg border border-slate-800 bg-slate-950 p-4 font-mono text-xs text-slate-400 space-y-2">
                      <div className="text-slate-500">{"// Architecture Extension Point: lib/agent/"}</div>
                      <div className="text-indigo-300">Planned Capabilities:</div>
                      <div>- Claude Reasoning Loop with Anthropic API integration</div>
                      <div>- Defensive prompt wrapping & intentional context isolation</div>
                      <div>- Action confirmation & privilege escalation prevention</div>
                    </div>
                  </div>
                )}

                {activeSection === "security" && (
                  <div className="space-y-4">
                    <p className="text-sm text-slate-300">
                      The <strong className="text-white">Security & Policy Engine</strong> validates requests, applies data sanitization, tracks taint flags, and blocks unauthorized tool invocation.
                    </p>
                    <div className="rounded-lg border border-slate-800 bg-slate-950 p-4 font-mono text-xs text-slate-400 space-y-2">
                      <div className="text-slate-500">{"// Architecture Extension Point: lib/security/ & lib/policy/"}</div>
                      <div className="text-indigo-300">Planned Capabilities:</div>
                      <div>- Trust Boundary validation across all incoming payloads</div>
                      <div>- Deterministic policy enforcement rules (ALLOW / BLOCK / QUARANTINE)</div>
                      <div>- Secret protection and data exfiltration firewalls</div>
                    </div>
                  </div>
                )}

                {activeSection === "attack-lab" && (
                  <div className="space-y-4">
                    <p className="text-sm text-slate-300">
                      The <strong className="text-white">Attack Lab</strong> provides an isolated sandbox to inject adversarial payloads (indirect injections, goal hijacking, canary leaks) and evaluate agent resilience.
                    </p>
                    <div className="rounded-lg border border-slate-800 bg-slate-950 p-4 font-mono text-xs text-slate-400 space-y-2">
                      <div className="text-slate-500">{"// Architecture Extension Point: datasets/attacks/"}</div>
                      <div className="text-indigo-300">Planned Capabilities:</div>
                      <div>- Indirect prompt injection test suites (email, PDF, web payloads)</div>
                      <div>- Multi-stage goal hijacking scenarios</div>
                      <div>- Automated jailbreak & canary exfiltration test harness</div>
                    </div>
                  </div>
                )}

                {activeSection === "evaluation" && (
                  <div className="space-y-4">
                    <p className="text-sm text-slate-300">
                      The <strong className="text-white">Evaluation Engine</strong> measures defensive resilience, legitimate task completion rates, false positive rates, and security regression metrics.
                    </p>
                    <div className="rounded-lg border border-slate-800 bg-slate-950 p-4 font-mono text-xs text-slate-400 space-y-2">
                      <div className="text-slate-500">{"// Architecture Extension Point: lib/evaluation/"}</div>
                      <div className="text-indigo-300">Planned Capabilities:</div>
                      <div>- Benign utility benchmark vs. adversarial defense matrix</div>
                      <div>- Automated regression scoring across historical attack vectors</div>
                      <div>- Quantitative security posture rating</div>
                    </div>
                  </div>
                )}

                {activeSection === "audit" && (
                  <div className="space-y-4">
                    <p className="text-sm text-slate-300">
                      The <strong className="text-white">Audit System</strong> records an immutable, structured trace of every prompt, tool call, policy evaluation, and security anomaly.
                    </p>
                    <div className="rounded-lg border border-slate-800 bg-slate-950 p-4 font-mono text-xs text-slate-400 space-y-2">
                      <div className="text-slate-500">{"// Architecture Extension Point: lib/audit/"}</div>
                      <div className="text-indigo-300">Planned Capabilities:</div>
                      <div>- Structured audit event streaming with tamper-evident checksums</div>
                      <div>- Telemetry on blocked injections and quarantined payloads</div>
                      <div>- Full forensic timeline reconstruction for security reviews</div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Untrusted Sources Classification */}
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

          {/* Trust Hierarchy Sidebar */}
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
                <span>Foundation status: Clean scaffold ready for Mission 2 extension.</span>
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-slate-800 py-4 text-center text-xs text-slate-500">
        Possessed Butler • Defensive LLM Agent Architecture • Mission 1 Foundation
      </footer>
    </div>
  );
}
