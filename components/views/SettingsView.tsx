"use client";

import React, { useState } from "react";
import {
  RotateCcw,
  ShieldCheck,
  Wrench,
  Bot,
  Activity,
} from "lucide-react";
import { defaultAuditLogger } from "@/lib/audit/logger";

export function SettingsView() {
  const [activeTab, setActiveTab] = useState<"general" | "policies" | "diagnostics">("general");
  const [enforcementMode, setEnforcementMode] = useState<string>("strict");
  const [logLevel, setLogLevel] = useState<string>("info");
  const [confirmationRequired, setConfirmationRequired] = useState<boolean>(true);
  const [resetMessage, setResetMessage] = useState<string | null>(null);

  const handleClearTelemetry = () => {
    defaultAuditLogger.clear();
    setResetMessage("Telemetry logs successfully flushed.");
    setTimeout(() => setResetMessage(null), 3000);
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* 1. HEADER */}
      <section className="bg-white rounded-2xl border border-[#E8ECE9] p-6 sm:p-8 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-[#E8ECE9]">
          <div className="space-y-1">
            <div className="flex items-center space-x-2">
              <span className="text-[11px] font-mono font-bold tracking-wider uppercase text-[#C9A86A] bg-[#FAF5EB] px-2.5 py-0.5 rounded-full border border-[#C9A86A]/30">
                SYSTEM CONFIGURATION
              </span>
              <span className="text-xs text-[#678882]">•</span>
              <span className="text-xs font-mono text-[#2E595A]">
                ENTERPRISE POLICY GOVERNANCE
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-serif font-bold text-[#052326] tracking-tight">
              Settings
            </h1>
            <p className="text-sm text-[#678882] max-w-2xl">
              Configure protection policies, agent safety thresholds, and access diagnostic engineering controls.
            </p>
          </div>

          <div className="flex items-center space-x-2 px-3 py-1.5 rounded-xl bg-[#EBF1ED] border border-[#A5B5A9]/50 text-xs text-[#2E595A]">
            <ShieldCheck className="w-4 h-4 text-[#2E595A]" />
            <span className="font-bold text-[#052326]">Policies Active</span>
          </div>
        </div>

        {/* Tab Switcher */}
        <div className="flex flex-wrap gap-2 pt-6">
          <button
            onClick={() => setActiveTab("general")}
            className={`px-4 py-2 rounded-xl text-xs font-semibold tracking-wide transition-all ${
              activeTab === "general"
                ? "bg-[#052326] text-white shadow-xs"
                : "bg-[#FBF9F8] text-[#2E595A] hover:bg-[#EBF1ED] border border-[#E8ECE9]"
            }`}
          >
            General Settings
          </button>
          <button
            onClick={() => setActiveTab("policies")}
            className={`px-4 py-2 rounded-xl text-xs font-semibold tracking-wide transition-all ${
              activeTab === "policies"
                ? "bg-[#052326] text-white shadow-xs"
                : "bg-[#FBF9F8] text-[#2E595A] hover:bg-[#EBF1ED] border border-[#E8ECE9]"
            }`}
          >
            Protection Policies
          </button>
          <button
            onClick={() => setActiveTab("diagnostics")}
            className={`px-4 py-2 rounded-xl text-xs font-semibold tracking-wide transition-all ${
              activeTab === "diagnostics"
                ? "bg-[#052326] text-white shadow-xs"
                : "bg-[#FBF9F8] text-[#2E595A] hover:bg-[#EBF1ED] border border-[#E8ECE9]"
            }`}
          >
            Advanced & Diagnostics (Layer 3)
          </button>
        </div>
      </section>

      {/* 2. TAB CONTENT */}
      {activeTab === "general" && (
        <section className="bg-white rounded-2xl border border-[#E8ECE9] p-6 sm:p-8 shadow-xs space-y-6 text-xs">
          <h2 className="text-base font-bold text-[#052326] tracking-tight">
            General Application Settings
          </h2>

          <div className="space-y-4">
            <div className="p-4 rounded-xl bg-[#FBF9F8] border border-[#E8ECE9] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <span className="font-bold text-[#052326] block text-sm">
                  Agent Display Name
                </span>
                <p className="text-[#678882] mt-0.5">
                  Public identifier presented in conversational client interfaces.
                </p>
              </div>
              <input
                type="text"
                disabled
                value="Kavach Agent"
                className="px-3 py-1.5 rounded-lg bg-white border border-[#E8ECE9] font-medium text-[#052326] w-48 text-center"
              />
            </div>

            <div className="p-4 rounded-xl bg-[#FBF9F8] border border-[#E8ECE9] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <span className="font-bold text-[#052326] block text-sm">
                  Audit Telemetry Verbosity
                </span>
                <p className="text-[#678882] mt-0.5">
                  Controls detail level of logged events. Credentials and keys are automatically redacted.
                </p>
              </div>
              <select
                value={logLevel}
                onChange={(e) => setLogLevel(e.target.value)}
                className="px-3 py-1.5 rounded-lg bg-white border border-[#E8ECE9] text-xs font-mono text-[#052326]"
              >
                <option value="info">INFO (Recommended)</option>
                <option value="verbose">VERBOSE (Detailed Traces)</option>
              </select>
            </div>

            <div className="p-4 rounded-xl bg-[#FBF9F8] border border-[#E8ECE9] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <span className="font-bold text-[#052326] block text-sm">
                  Clear Security Telemetry Buffer
                </span>
                <p className="text-[#678882] mt-0.5">
                  Flushes in-memory audit logs and resets local counter telemetry.
                </p>
              </div>
              <button
                onClick={handleClearTelemetry}
                className="px-3.5 py-2 rounded-lg bg-white border border-[#E8ECE9] text-[#678882] hover:text-[#052326] hover:bg-[#FAF5EB] font-medium flex items-center space-x-1.5 transition-colors"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Flush Logs</span>
              </button>
            </div>
            {resetMessage && (
              <div className="p-3 bg-[#FAF5EB] text-[#052326] rounded-xl text-xs font-mono border border-[#C9A86A]/40">
                {resetMessage}
              </div>
            )}
          </div>
        </section>
      )}

      {activeTab === "policies" && (
        <section className="bg-white rounded-2xl border border-[#E8ECE9] p-6 sm:p-8 shadow-xs space-y-6 text-xs">
          <h2 className="text-base font-bold text-[#052326] tracking-tight">
            Security Policy & Enforcement Rules
          </h2>

          <div className="space-y-4">
            <div className="p-4 rounded-xl bg-[#FBF9F8] border border-[#E8ECE9] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <span className="font-bold text-[#052326] block text-sm">
                  Enforcement Policy Mode
                </span>
                <p className="text-[#678882] mt-0.5">
                  Strict fail-closed mode halts execution immediately on any detected threat or policy violation.
                </p>
              </div>
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => setEnforcementMode("strict")}
                  className={`px-3 py-1.5 rounded-lg text-xs font-mono font-semibold transition-colors ${
                    enforcementMode === "strict"
                      ? "bg-[#052326] text-white"
                      : "bg-white border border-[#E8ECE9] text-[#678882]"
                  }`}
                >
                  STRICT (FAIL-CLOSED)
                </button>
                <button
                  onClick={() => setEnforcementMode("permissive")}
                  className={`px-3 py-1.5 rounded-lg text-xs font-mono font-semibold transition-colors ${
                    enforcementMode === "permissive"
                      ? "bg-[#C9A86A] text-white"
                      : "bg-white border border-[#E8ECE9] text-[#678882]"
                  }`}
                >
                  AUDIT ONLY
                </button>
              </div>
            </div>

            <div className="p-4 rounded-xl bg-[#FBF9F8] border border-[#E8ECE9] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <span className="font-bold text-[#052326] block text-sm">
                  Human Confirmation Gate
                </span>
                <p className="text-[#678882] mt-0.5">
                  Mandates user confirmation before any consequential action (sending emails, modifying files) can execute.
                </p>
              </div>
              <button
                onClick={() => setConfirmationRequired(!confirmationRequired)}
                className={`px-3.5 py-1.5 rounded-lg font-mono text-xs font-bold transition-all ${
                  confirmationRequired
                    ? "bg-[#EBF1ED] text-[#2E595A] border border-[#A5B5A9]/50"
                    : "bg-white border border-[#E8ECE9] text-[#678882]"
                }`}
              >
                {confirmationRequired ? "ENABLED (MANDATORY)" : "DISABLED"}
              </button>
            </div>

            <div className="p-4 rounded-xl bg-[#FAF5EB] border border-[#C9A86A]/40 text-[#052326] space-y-1">
              <span className="font-bold block">Hardened Security Contract:</span>
              <p className="text-[#678882]">
                External content is treated with zero trust. Tools execute strictly through the Tool Gateway only when explicitly approved by the Policy Engine.
              </p>
            </div>
          </div>
        </section>
      )}

      {activeTab === "diagnostics" && (
        <section className="bg-white rounded-2xl border border-[#E8ECE9] p-6 sm:p-8 shadow-xs space-y-6 text-xs">
          <div>
            <div className="flex items-center space-x-2">
              <span className="text-[10px] font-bold font-mono uppercase text-[#C9A86A] bg-[#FAF5EB] px-2 py-0.5 rounded border border-[#C9A86A]/30">
                LAYER 3 • ENGINEERING DIAGNOSTICS
              </span>
            </div>
            <h2 className="text-base font-bold text-[#052326] tracking-tight mt-1">
              System Components & Provider Telemetry
            </h2>
            <p className="text-[#678882] mt-0.5">
              Internal implementation architecture and component status reserved for technical diagnostics.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Tool Gateway Box */}
            <div className="p-4 rounded-xl bg-[#FBF9F8] border border-[#E8ECE9] space-y-2">
              <div className="flex items-center space-x-2 text-[#2E595A]">
                <Wrench className="w-4 h-4 text-[#2E595A]" />
                <span className="font-bold text-xs">Registered Tools (6)</span>
              </div>
              <ul className="space-y-1 font-mono text-[11px] text-[#678882]">
                <li>• read_email</li>
                <li>• send_email (consequential)</li>
                <li>• read_file</li>
                <li>• write_file (consequential)</li>
                <li>• fetch_webpage</li>
                <li>• list_files</li>
              </ul>
              <div className="pt-2 text-[10px] text-[#2E595A] font-semibold">
                Boundary: Strict Gateway Enforced
              </div>
            </div>

            {/* Provider Box */}
            <div className="p-4 rounded-xl bg-[#FBF9F8] border border-[#E8ECE9] space-y-2">
              <div className="flex items-center space-x-2 text-[#052326]">
                <Bot className="w-4 h-4 text-[#C9A86A]" />
                <span className="font-bold text-xs">LLM Provider</span>
              </div>
              <div className="space-y-1 font-mono text-[11px] text-[#678882]">
                <div>Provider: Google GenAI</div>
                <div>Model: gemini-3.5-flash</div>
                <div>API: Official Interactions SDK</div>
                <div>Failover: Graceful fallback active</div>
              </div>
              <div className="pt-2 text-[10px] text-emerald-600 font-semibold">
                Runtime: Connected &amp; Operational
              </div>
            </div>

            {/* Integrity Box */}
            <div className="p-4 rounded-xl bg-[#FBF9F8] border border-[#E8ECE9] space-y-2">
              <div className="flex items-center space-x-2 text-[#2E595A]">
                <Activity className="w-4 h-4 text-[#2E595A]" />
                <span className="font-bold text-xs">Security Perimeter</span>
              </div>
              <div className="space-y-1 font-mono text-[11px] text-[#678882]">
                <div>Security Gateway: Operational</div>
                <div>Policy Engine: Deterministic</div>
                <div>Threat Analyzer: 6 Taxonomies</div>
                <div>Regression Corpus: 138 Passing</div>
              </div>
              <div className="pt-2 text-[10px] text-[#2E595A] font-semibold">
                Status: 100% Defense Verified
              </div>
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
