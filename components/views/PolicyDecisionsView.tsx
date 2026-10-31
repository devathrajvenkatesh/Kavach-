"use client";

import React, { useState } from "react";
import {
  Scale,
  Lock,
  CheckCircle2,
  Play,
} from "lucide-react";
import { BUILTIN_POLICY_RULES, SecurityPolicyRule } from "@/lib/policy/rules";
import { defaultSecurityGateway } from "@/lib/security/gateway";
import { ToolRequest, TrustLevel, PolicyDecision } from "@/types";

export function PolicyDecisionsView() {
  const [testTool, setTestTool] = useState<string>("send_email");
  const [testParams, setTestParams] = useState<string>('{"recipient": "colleague@company.com", "body": "Project update"}');
  const [testTrustLevel, setTestTrustLevel] = useState<number>(3); // User prompt
  const [decisionOutput, setDecisionOutput] = useState<PolicyDecision | null>(null);

  const handleEvaluate = async () => {
    try {
      const parsedParams = JSON.parse(testParams);
      const req: ToolRequest = {
        id: `sim-${Date.now()}`,
        sessionId: "sim-session",
        correlationId: `sim-cid-${Date.now()}`,
        toolName: testTool,
        parameters: parsedParams,
        trustContext: {
          contextId: "sim-ctx",
          source: "policy-simulator",
          trustLevel: testTrustLevel as TrustLevel,
          isVerifiedUser: testTrustLevel === 3,
          taintFlags: testTrustLevel === 1 ? ["taint:external"] : [],
        },
        requestedAt: new Date().toISOString(),
      };

      const result = await defaultSecurityGateway.evaluateToolRequest({
        toolRequest: req,
        trustContext: req.trustContext,
        userObjective: "Execute user instruction",
      });
      setDecisionOutput(result.decision);
    } catch (err: unknown) {
      alert("Invalid JSON parameters: " + String(err));
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* Header Card */}
      <section className="bg-white rounded-2xl border border-[#E8ECE9] p-6 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#E8ECE9]">
          <div>
            <div className="flex items-center space-x-2">
              <span className="text-[10px] font-bold tracking-[0.16em] uppercase text-[#678882]">
                DETERMINISTIC GOVERNANCE
              </span>
              <span className="w-1.5 h-1.5 rounded-full bg-[#C9A86A]" />
              <span className="text-xs font-mono text-[#2E595A]">
                AUTHORITATIVE BOUNDARY
              </span>
            </div>
            <h2 className="text-2xl font-serif font-bold text-[#052326] mt-1">
              Policy Engine & Decisions
            </h2>
            <p className="text-xs text-[#2E595A] mt-1">
              Deterministic rule evaluation guaranteeing that external content cannot grant authority or execute tools.
            </p>
          </div>

          <div className="flex items-center space-x-2">
            <span className="px-3 py-1 rounded-full text-xs font-mono font-medium bg-[#FAF5EB] border border-[#C9A86A]/40 text-[#C9A86A]">
              Decisions: APPROVE | BLOCK | REQUIRE_CONFIRMATION
            </span>
          </div>
        </div>

        {/* 3 Outcome Types Explanation */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
          <div className="p-4 rounded-xl bg-[#EBF1ED] border border-[#A5B5A9]/30 space-y-1.5">
            <div className="flex items-center space-x-2 text-[#2E595A] font-bold text-xs">
              <CheckCircle2 className="w-4 h-4" />
              <span>APPROVE</span>
            </div>
            <p className="text-xs text-[#052326] leading-relaxed">
              Safe read operations requested by authenticated users. Forwards request to Tool Gateway for sandboxed execution.
            </p>
          </div>

          <div className="p-4 rounded-xl bg-[#FAF5EB] border border-[#C9A86A]/40 space-y-1.5">
            <div className="flex items-center space-x-2 text-[#C9A86A] font-bold text-xs">
              <Lock className="w-4 h-4" />
              <span>BLOCK</span>
            </div>
            <p className="text-xs text-[#052326] leading-relaxed">
              Denied by security rule. Secret exfiltration, directory traversal, unsolicited directives, or tainted parameters.
            </p>
          </div>

          <div className="p-4 rounded-xl bg-[#FAF5EB] border border-[#C9A86A]/20 space-y-1.5">
            <div className="flex items-center space-x-2 text-[#2E595A] font-bold text-xs">
              <Scale className="w-4 h-4" />
              <span>REQUIRE_CONFIRMATION</span>
            </div>
            <p className="text-xs text-[#052326] leading-relaxed">
              Consequential mutations (send email, edit file). Pauses workflow until explicit human authorization is granted.
            </p>
          </div>
        </div>

        {/* Interactive Policy Rule Simulator */}
        <div className="mt-6 p-4 rounded-xl bg-[#FBF9F8] border border-[#E8ECE9] space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-[#052326] flex items-center space-x-1.5">
              <Scale className="w-3.5 h-3.5 text-[#2E595A]" />
              <span>Interactive Policy Simulator</span>
            </span>
            <span className="text-[11px] font-mono text-[#678882]">
              Live Engine Verification
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="text-[10px] font-mono uppercase font-bold text-[#678882] block mb-1">
                Target Tool
              </label>
              <select
                value={testTool}
                onChange={(e) => setTestTool(e.target.value)}
                className="w-full px-3 py-1.5 rounded-lg bg-white border border-[#E8ECE9] text-xs font-mono text-[#052326]"
              >
                <option value="read_email">read_email (Safe Read)</option>
                <option value="send_email">send_email (Consequential)</option>
                <option value="fetch_webpage">fetch_webpage (Safe Read)</option>
                <option value="read_file">read_file (Path Inspection)</option>
                <option value="edit_file">edit_file (Consequential)</option>
              </select>
            </div>

            <div>
              <label className="text-[10px] font-mono uppercase font-bold text-[#678882] block mb-1">
                Source Trust Level
              </label>
              <select
                value={testTrustLevel}
                onChange={(e) => setTestTrustLevel(Number(e.target.value))}
                className="w-full px-3 py-1.5 rounded-lg bg-white border border-[#E8ECE9] text-xs font-mono text-[#052326]"
              >
                <option value={3}>Level 3: Verified User Prompt</option>
                <option value={1}>Level 1: External Untrusted Data (Tainted)</option>
              </select>
            </div>

            <div className="flex items-end">
              <button
                onClick={handleEvaluate}
                className="w-full py-1.5 rounded-lg bg-[#052326] hover:bg-[#2E595A] text-white text-xs font-semibold tracking-wide transition-colors flex items-center justify-center space-x-1.5"
              >
                <Play className="w-3 h-3 fill-current text-[#C9A86A]" />
                <span>Evaluate Rule</span>
              </button>
            </div>
          </div>

          <div>
            <label className="text-[10px] font-mono uppercase font-bold text-[#678882] block mb-1">
              Parameters JSON
            </label>
            <input
              type="text"
              value={testParams}
              onChange={(e) => setTestParams(e.target.value)}
              className="w-full px-3 py-1.5 rounded-lg bg-white border border-[#E8ECE9] text-xs font-mono text-[#052326]"
            />
          </div>

          {/* Decision Render */}
          {decisionOutput && (
            <div className="p-3.5 rounded-lg bg-white border border-[#E8ECE9] space-y-1 text-xs">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <span className="font-semibold text-[#052326]">Outcome:</span>
                  <span
                    className={`font-mono font-bold px-2 py-0.5 rounded text-[10px] ${
                      decisionOutput.decision === "BLOCK"
                        ? "bg-[#FAF5EB] text-[#C9A86A] border border-[#C9A86A]/40"
                        : decisionOutput.decision === "REQUIRE_CONFIRMATION"
                        ? "bg-[#FAF5EB] text-[#C9A86A]"
                        : "bg-[#EBF1ED] text-[#2E595A]"
                    }`}
                  >
                    {decisionOutput.decision}
                  </span>
                </div>
                <span className="font-mono text-[10px] text-[#678882]">
                  Rule Triggered: {decisionOutput.matchedRules[0]?.ruleId || "Default Safe Invariant"}
                </span>
              </div>
              <p className="text-xs text-[#2E595A] pt-1">
                Reason: {decisionOutput.reason}
              </p>
            </div>
          )}
        </div>
      </section>

      {/* Rules Registry Table */}
      <section className="bg-white rounded-2xl border border-[#E8ECE9] p-6 shadow-sm space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-[#E8ECE9]">
          <h3 className="text-base font-serif font-bold text-[#052326]">
            Active Declarative Security Rules
          </h3>
          <span className="text-xs font-mono text-[#678882]">
            {BUILTIN_POLICY_RULES.length} Rules Enforced
          </span>
        </div>

        <div className="divide-y divide-[#E8ECE9]">
          {BUILTIN_POLICY_RULES.map((rule: SecurityPolicyRule) => (
            <div key={rule.id} className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
              <div className="space-y-0.5">
                <div className="flex items-center space-x-2">
                  <span className="font-mono font-bold text-[#2E595A]">
                    {rule.id}
                  </span>
                  <span className="font-semibold text-[#052326]">
                    {rule.name}
                  </span>
                </div>
                <p className="text-xs text-[#678882]">
                  {rule.description}
                </p>
              </div>

              <div className="flex items-center space-x-2 flex-shrink-0">
                <span className="font-mono text-[10px] px-2 py-0.5 rounded font-bold bg-[#FAF5EB] text-[#C9A86A] border border-[#C9A86A]/40">
                  DETERMINISTIC
                </span>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
