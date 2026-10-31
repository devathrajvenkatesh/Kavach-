"use client";

import React, { useState } from "react";
import { RotateCcw } from "lucide-react";
import { defaultAuditLogger } from "@/lib/audit/logger";

export function SettingsView() {
  const [enforcementMode, setEnforcementMode] = useState<string>("strict");
  const [logLevel, setLogLevel] = useState<string>("info");
  const [resetMessage, setResetMessage] = useState<string | null>(null);

  const handleClearTelemetry = () => {
    defaultAuditLogger.clear();
    setResetMessage("Telemetry logs successfully flushed.");
    setTimeout(() => setResetMessage(null), 3000);
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* Header */}
      <section className="bg-white rounded-2xl border border-[#E8ECE9] p-6 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#E8ECE9]">
          <div>
            <div className="flex items-center space-x-2">
              <span className="text-[10px] font-bold tracking-[0.16em] uppercase text-[#678882]">
                CONFIGURATION & GOVERNANCE
              </span>
              <span className="w-1.5 h-1.5 rounded-full bg-[#C9A86A]" />
              <span className="text-xs font-mono text-[#2E595A]">
                SECURITY PARAMETERS
              </span>
            </div>
            <h2 className="text-2xl font-serif font-bold text-[#052326] mt-1">
              Defense Settings
            </h2>
            <p className="text-xs text-[#2E595A] mt-1">
              Manage enforcement rigor, audit verbosity, canary tripwires, and telemetry buffer lifecycle.
            </p>
          </div>

          <div className="flex items-center space-x-2">
            <span className="px-3 py-1 rounded-full text-xs font-mono font-medium bg-[#FAF5EB] border border-[#C9A86A]/40 text-[#C9A86A]">
              Mode: Strict Enforcement
            </span>
          </div>
        </div>

        {/* Settings Grid */}
        <div className="space-y-6 mt-6 text-xs">
          {/* Enforcement Mode */}
          <div className="p-4 rounded-xl bg-[#FBF9F8] border border-[#E8ECE9] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <span className="font-bold text-[#052326] block text-sm">
                Enforcement Policy Mode
              </span>
              <p className="text-[#678882] mt-0.5">
                Strict mode halts execution immediately on any threat or policy violation.
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

          {/* Audit Logging Verbosity */}
          <div className="p-4 rounded-xl bg-[#FBF9F8] border border-[#E8ECE9] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <span className="font-bold text-[#052326] block text-sm">
                Audit Telemetry Verbosity
              </span>
              <p className="text-[#678882] mt-0.5">
                Controls granularity of recorded events. Secrets and credentials are automatically redacted in all modes.
              </p>
            </div>
            <select
              value={logLevel}
              onChange={(e) => setLogLevel(e.target.value)}
              className="px-3 py-1.5 rounded-lg bg-white border border-[#E8ECE9] text-xs font-mono text-[#052326]"
            >
              <option value="info">INFO (Recommended)</option>
              <option value="verbose">VERBOSE (Full Traces)</option>
              <option value="minimal">MINIMAL (Violations Only)</option>
            </select>
          </div>

          {/* Telemetry Flush Action */}
          <div className="p-4 rounded-xl bg-[#FBF9F8] border border-[#E8ECE9] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <span className="font-bold text-[#052326] block text-sm">
                Telemetry Buffer Management
              </span>
              <p className="text-[#678882] mt-0.5">
                Flush in-memory audit logs and reset session event counters.
              </p>
              {resetMessage && (
                <span className="text-[11px] font-mono text-[#2E595A] font-bold mt-1 block">
                  ✓ {resetMessage}
                </span>
              )}
            </div>
            <button
              onClick={handleClearTelemetry}
              className="px-4 py-2 rounded-lg bg-white hover:bg-[#FAF5EB] text-[#C9A86A] border border-[#C9A86A]/40 font-mono font-bold text-xs transition-colors flex items-center space-x-1.5"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Flush Buffer</span>
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}
