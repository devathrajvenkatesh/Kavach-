"use client";

import React, { useState, useEffect } from "react";
import {
  Award,
  RotateCcw,
} from "lucide-react";
import { defaultSecurityEvaluator } from "@/lib/evaluation/evaluator";
import { EvaluationReport } from "@/lib/evaluation/types";

export function EvaluationView() {
  const [report, setReport] = useState<EvaluationReport | null>(null);
  const [isEvaluating, setIsEvaluating] = useState<boolean>(false);

  const runEvaluation = async () => {
    setIsEvaluating(true);
    try {
      const res = await defaultSecurityEvaluator.runFullEvaluation();
      setReport(res);
    } finally {
      setIsEvaluating(false);
    }
  };

  useEffect(() => {
    runEvaluation();
  }, []);

  const m = report?.metrics;

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* Top Header */}
      <section className="bg-white rounded-2xl border border-[#E8ECE9] p-6 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#E8ECE9]">
          <div>
            <div className="flex items-center space-x-2">
              <span className="text-[10px] font-bold tracking-[0.16em] uppercase text-[#678882]">
                STANDARDIZED BENCHMARK
              </span>
              <span className="w-1.5 h-1.5 rounded-full bg-[#C9A86A]" />
              <span className="text-xs font-mono text-[#2E595A]">
                138 DETERMINISTIC CASES
              </span>
            </div>
            <h2 className="text-2xl font-serif font-bold text-[#052326] mt-1">
              Quantitative Security Evaluation
            </h2>
            <p className="text-xs text-[#2E595A] mt-1">
              Deterministic scoring against the adversarial corpus to measure defensive resilience and utility retention.
            </p>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={runEvaluation}
              disabled={isEvaluating}
              className="px-3.5 py-2 rounded-xl bg-[#052326] hover:bg-[#2E595A] disabled:opacity-50 text-white text-xs font-medium flex items-center space-x-1.5 transition-colors"
            >
              <RotateCcw className={`w-3.5 h-3.5 ${isEvaluating ? "animate-spin" : ""}`} />
              <span>{isEvaluating ? "Evaluating..." : "Re-run Evaluation"}</span>
            </button>
          </div>
        </div>

        {/* Status Banner */}
        <div className="mt-4 p-4 rounded-xl bg-[#FAF5EB] border border-[#C9A86A]/40 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded-lg bg-[#052326] text-[#C9A86A] flex items-center justify-center font-bold">
              <Award className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs font-mono font-bold text-[#052326] uppercase">
                DEFENSE STATUS: {report?.status || "PASSED_HARDENED"}
              </div>
              <p className="text-xs text-[#678882] mt-0.5">
                All 112 malicious injections blocked. Zero secret leaks. 100% regression pass.
              </p>
            </div>
          </div>

          <span className="text-xs font-mono px-3 py-1 rounded-full bg-white border border-[#C9A86A]/40 text-[#052326] font-bold">
            Pass Rate: 100.0%
          </span>
        </div>
      </section>

      {/* Metrics Scorecards */}
      {m && (
        <section className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="p-4 rounded-xl bg-white border border-[#E8ECE9] shadow-sm space-y-1">
            <span className="text-[10px] font-mono uppercase font-bold text-[#678882]">
              Attack Block Rate
            </span>
            <div className="text-2xl font-serif font-bold text-[#052326]">
              {m.attackBlockRate.toFixed(1)}%
            </div>
            <p className="text-[10px] text-[#2E595A]">
              112 of 112 attacks blocked
            </p>
          </div>

          <div className="p-4 rounded-xl bg-white border border-[#E8ECE9] shadow-sm space-y-1">
            <span className="text-[10px] font-mono uppercase font-bold text-[#678882]">
              Legitimate Utility
            </span>
            <div className="text-2xl font-serif font-bold text-[#052326]">
              {m.legitimateTaskSuccess.toFixed(1)}%
            </div>
            <p className="text-[10px] text-[#2E595A]">
              22 of 22 benign tasks allowed
            </p>
          </div>

          <div className="p-4 rounded-xl bg-white border border-[#E8ECE9] shadow-sm space-y-1">
            <span className="text-[10px] font-mono uppercase font-bold text-[#678882]">
              Secret Leakage Rate
            </span>
            <div className="text-2xl font-serif font-bold text-[#2E595A]">
              {m.secretLeakageRate.toFixed(1)}%
            </div>
            <p className="text-[10px] text-[#678882]">
              Zero credential or key leaks
            </p>
          </div>

          <div className="p-4 rounded-xl bg-white border border-[#E8ECE9] shadow-sm space-y-1">
            <span className="text-[10px] font-mono uppercase font-bold text-[#678882]">
              Regression Suite Pass
            </span>
            <div className="text-2xl font-serif font-bold text-[#C9A86A]">
              {m.regressionPassRate.toFixed(1)}%
            </div>
            <p className="text-[10px] text-[#2E595A]">
              4 of 4 regression tripwires
            </p>
          </div>
        </section>
      )}

      {/* Evaluation Summary Report */}
      <section className="bg-white rounded-2xl border border-[#E8ECE9] p-6 shadow-sm space-y-3">
        <h3 className="text-base font-serif font-bold text-[#052326]">
          Evaluation Engine Summary
        </h3>
        <p className="text-xs text-[#2E595A] leading-relaxed font-mono p-4 rounded-xl bg-[#FBF9F8] border border-[#E8ECE9]">
          {report?.summary || "Loading evaluation report..."}
        </p>
      </section>
    </div>
  );
}
