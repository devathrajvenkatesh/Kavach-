"use client";

import React from "react";
import { Lock, FileCode } from "lucide-react";
import { defaultToolGateway } from "@/lib/tools/gateway";

export function ToolsView() {
  const tools = defaultToolGateway.getAvailableToolMetadata();

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* Header */}
      <section className="bg-[#FCFAF5] rounded-2xl border border-[#E4DEC8] p-6 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#E4DEC8]">
          <div>
            <div className="flex items-center space-x-2">
              <span className="text-[10px] font-bold tracking-[0.16em] uppercase text-[#678882]">
                SANDBOXED TOOL REGISTRY
              </span>
              <span className="w-1.5 h-1.5 rounded-full bg-[#C9A86A]" />
              <span className="text-xs font-mono text-[#2E595A]">
                ZERO-AUTHORITY BOUNDARY
              </span>
            </div>
            <h2 className="text-2xl font-serif font-bold text-[#052326] mt-1">
              Registered Agent Tools
            </h2>
            <p className="text-xs text-[#2E595A] mt-1">
              Declarative parameter schemas enforced via Zod. Outputs are strictly tagged as untrusted external data.
            </p>
          </div>

          <div className="flex items-center space-x-2">
            <span className="px-3 py-1 rounded-full text-xs font-mono font-medium bg-[#EBF1ED] border border-[#A5B5A9]/40 text-[#2E595A]">
              6 Sandboxed Tools Active
            </span>
          </div>
        </div>

        {/* Boundary Invariant Notice */}
        <div className="mt-4 p-3.5 rounded-xl bg-[#FAF5EB] border border-[#C9A86A]/40 flex items-center space-x-3 text-xs">
          <Lock className="w-4 h-4 text-[#C9A86A] flex-shrink-0" />
          <span className="text-[#052326]">
            <strong>Execution Invariant:</strong> The LLM can only request tool calls. Only the Tool Gateway can execute them upon verified <code className="font-mono text-[#2E595A]">PolicyDecision: APPROVE</code>.
          </span>
        </div>
      </section>

      {/* Tools Cards */}
      <section className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {tools.map((t) => {
          const isConsequential = t.isConsequential;
          const isReadOnly = t.riskTier === "READ_ONLY";

          return (
            <div
              key={t.name}
              className="p-5 rounded-2xl bg-[#FCFAF5] border border-[#E4DEC8] shadow-sm hover:border-[#A5B5A9] transition-all space-y-3"
            >
              <div className="flex items-center justify-between pb-2 border-b border-[#E4DEC8]">
                <div className="flex items-center space-x-2">
                  <div className="w-7 h-7 rounded-lg bg-[#052326] text-[#C9A86A] flex items-center justify-center font-mono font-bold text-xs">
                    <FileCode className="w-3.5 h-3.5" />
                  </div>
                  <div>
                    <span className="text-sm font-mono font-bold text-[#052326]">
                      {t.name}
                    </span>
                  </div>
                </div>

                <div className="flex items-center space-x-1.5">
                  {isConsequential ? (
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded font-bold bg-[#FAF5EB] text-[#C9A86A] border border-[#C9A86A]/40">
                      CONSEQUENTIAL
                    </span>
                  ) : (
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded font-bold bg-[#EBF1ED] text-[#2E595A]">
                      SAFE READ
                    </span>
                  )}
                  {isReadOnly && (
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded font-bold bg-[#F3F6F4] text-[#678882]">
                      UNTAINTED LOCAL
                    </span>
                  )}
                </div>
              </div>

              <p className="text-xs text-[#678882] leading-relaxed">
                {t.description}
              </p>

              {/* Parameters Breakdown */}
              <div className="p-3 rounded-lg bg-[#FAF7EE] border border-[#E4DEC8] space-y-1.5 text-xs">
                <span className="text-[10px] font-mono uppercase font-bold text-[#678882] tracking-wider block">
                  Parameters Schema:
                </span>
                <div className="space-y-1">
                  {Object.entries(t.parameters).map(([pName, pDef]) => (
                    <div
                      key={pName}
                      className="flex items-center justify-between text-[11px] font-mono"
                    >
                      <span className="text-[#052326] font-semibold">
                        {pName} {pDef.required && <span className="text-[#C9A86A]">*</span>}
                      </span>
                      <span className="text-[#678882]">
                        ({pDef.type}) {pDef.description}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          );
        })}
      </section>
    </div>
  );
}
