"use client";

import React, { useState } from "react";
import {
  User,
  Bot,
  ShieldCheck,
  Search,
  Scale,
  Cpu,
  CheckCircle2,
  Lock,
  Sparkles,
} from "lucide-react";

interface PipelineNode {
  id: string;
  number: string;
  name: string;
  subtitle: string;
  icon: React.ComponentType<{ className?: string }>;
  role: string;
  invariant: string;
  status: "ACTIVE" | "VERIFIED" | "ISOLATED";
  latency: string;
  details: string;
}

const NODES: PipelineNode[] = [
  {
    id: "user",
    number: "01",
    name: "USER",
    subtitle: "Authenticated Intent",
    icon: User,
    role: "Origin of legitimate business instructions and tasks.",
    invariant: "User instructions carry Tier 2 authority over tools, subordinate only to system policy.",
    status: "VERIFIED",
    latency: "Direct",
    details: "Establishes verified session context and correlation tracking ID.",
  },
  {
    id: "agent",
    number: "02",
    name: "AI AGENT",
    subtitle: "Gemini 3.8 Flash",
    icon: Bot,
    role: "Autonomous reasoning engine parsing documents and planning multi-step tasks.",
    invariant: "The LLM is NOT a security authority. It may request tools, but NEVER executes them.",
    status: "ISOLATED",
    latency: "< 450ms",
    details: "Operates in restricted prompt environment with zero external credentials.",
  },
  {
    id: "defense",
    number: "03",
    name: "KAVACH DEFENSE",
    subtitle: "Perimeter Interceptor",
    icon: ShieldCheck,
    role: "Intercepts 100% of outgoing model function call requests before execution.",
    invariant: "External content may provide DATA. External content must NEVER provide AUTHORITY.",
    status: "ACTIVE",
    latency: "< 0.2ms",
    details: "Mandatory proxy barrier between model completions and tool invocations.",
  },
  {
    id: "threat",
    number: "04",
    name: "THREAT ANALYSIS",
    subtitle: "Heuristics & Normalization",
    icon: Search,
    role: "Scans for 8 categories of injection, canary tokens, and homoglyph obfuscation.",
    invariant: "Full Unicode NFKD normalization, zero-width stripping, and tripwire traps.",
    status: "ACTIVE",
    latency: "< 0.8ms",
    details: "Flags contextual divergence between user intent and target tool arguments.",
  },
  {
    id: "policy",
    number: "05",
    name: "POLICY ENGINE",
    subtitle: "Deterministic Rules",
    icon: Scale,
    role: "Evaluates requests against immutable rules: APPROVE, BLOCK, or REQUIRE_CONFIRMATION.",
    invariant: "No fallback defaults to allow. Any ambiguity or failure fails closed immediately.",
    status: "ACTIVE",
    latency: "< 0.3ms",
    details: "Enforces human confirmation gates on consequential mutations (email, file edits).",
  },
  {
    id: "gateway",
    number: "06",
    name: "TOOL GATEWAY",
    subtitle: "Execution Sandbox",
    icon: Cpu,
    role: "Strict Zod parameter validation and sandboxed mock/local tool invocation.",
    invariant: "All external data outputs are wrapped in <untrusted_external_data> zero-authority boundaries.",
    status: "ACTIVE",
    latency: "< 0.5ms",
    details: "Executes verified read/write operations without granting system privileges.",
  },
  {
    id: "action",
    number: "07",
    name: "ACTION",
    subtitle: "Verified Delivery",
    icon: Sparkles,
    role: "Clean, summarized output returned to user or security alert emitted.",
    invariant: "Secret canary tokens and private keys are cryptographically prevented from leaking.",
    status: "VERIFIED",
    latency: "Real-time",
    details: "Audit event recorded to tamper-evident telemetry log with correlation tracking.",
  },
];

export function SecurityPipelineVisualizer() {
  const [activeNodeId, setActiveNodeId] = useState<string>("defense");

  const selectedNode = NODES.find((n) => n.id === activeNodeId) || NODES[2];

  return (
    <div className="bg-white rounded-2xl border border-[#E8ECE9] p-6 shadow-sm">
      {/* Visual Pipeline Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-6 border-b border-[#E8ECE9] gap-3">
        <div>
          <div className="flex items-center space-x-2">
            <span className="text-[11px] font-bold tracking-[0.16em] uppercase text-[#678882]">
              PIPELINE ARCHITECTURE
            </span>
            <span className="w-1.5 h-1.5 rounded-full bg-[#C9A86A]" />
            <span className="text-[11px] font-mono text-[#2E595A]">
              7 INVIOLABLE GATES
            </span>
          </div>
          <h3 className="text-lg font-serif font-bold text-[#052326] mt-0.5">
            The Kavach Security Execution Pipeline
          </h3>
        </div>

        <div className="flex items-center space-x-2">
          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-medium bg-[#EBF1ED] text-[#2E595A] border border-[#A5B5A9]/40">
            <CheckCircle2 className="w-3.5 h-3.5 mr-1 text-[#2E595A]" />
            Deterministic Invariants Active
          </span>
        </div>
      </div>

      {/* Connected Nodes Row (GABVORA Style Horizontal Pipeline) */}
      <div className="py-6 overflow-x-auto">
        <div className="min-w-[860px] flex items-center justify-between relative px-2">
          {/* Subtle connected background line */}
          <div className="absolute top-[28px] left-6 right-6 h-[2px] bg-gradient-to-r from-[#A5B5A9]/30 via-[#2E595A]/30 to-[#C9A86A]/40 -z-0" />

          {NODES.map((node) => {
            const Icon = node.icon;
            const isSelected = activeNodeId === node.id;
            const isCriticalDefense = node.id === "defense" || node.id === "policy";

            return (
              <div key={node.id} className="relative z-10 flex flex-col items-center">
                <button
                  onClick={() => setActiveNodeId(node.id)}
                  className={`group flex flex-col items-center transition-all ${
                    isSelected ? "scale-105" : "hover:scale-102"
                  }`}
                >
                  {/* Node Circle */}
                  <div
                    className={`w-14 h-14 rounded-2xl flex items-center justify-center transition-all shadow-sm ${
                      isSelected
                        ? "bg-[#052326] text-[#C9A86A] ring-4 ring-[#C9A86A]/30 shadow-md"
                        : isCriticalDefense
                        ? "bg-[#FAF5EB] text-[#2E595A] border-2 border-[#C9A86A]/60 hover:bg-[#F3EDE0]"
                        : "bg-white text-[#2E595A] border border-[#E8ECE9] hover:border-[#A5B5A9]"
                    }`}
                  >
                    <Icon className="w-5 h-5 transition-transform group-hover:scale-110" />
                  </div>

                  {/* Node Labels */}
                  <div className="mt-3 text-center">
                    <span className="text-[10px] font-mono font-bold tracking-widest text-[#678882]">
                      {node.number}
                    </span>
                    <div
                      className={`text-xs font-bold tracking-wide uppercase transition-colors ${
                        isSelected ? "text-[#052326]" : "text-[#2E595A]"
                      }`}
                    >
                      {node.name}
                    </div>
                    <div className="text-[10px] text-[#678882] tracking-tight">
                      {node.subtitle}
                    </div>
                  </div>
                </button>
              </div>
            );
          })}
        </div>
      </div>

      {/* Selected Node Inspector Drawer */}
      <div className="mt-4 p-5 rounded-xl bg-[#FBF9F8] border border-[#E8ECE9] transition-all">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-[#E8ECE9]">
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded-lg bg-[#052326] flex items-center justify-center text-[#C9A86A] shadow-sm">
              <selectedNode.icon className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="text-xs font-mono font-bold text-[#C9A86A]">
                  GATE {selectedNode.number}
                </span>
                <span className="text-sm font-bold text-[#052326]">
                  {selectedNode.name}
                </span>
                <span className="text-xs text-[#678882]">
                  — {selectedNode.subtitle}
                </span>
              </div>
              <p className="text-xs text-[#2E595A] mt-0.5">
                {selectedNode.role}
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-white border border-[#E8ECE9] text-[#678882]">
              Latency: {selectedNode.latency}
            </span>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#EBF1ED] border border-[#A5B5A9]/40 text-[#2E595A] font-semibold">
              STATUS: {selectedNode.status}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4 text-xs">
          <div className="p-3 rounded-lg bg-white border border-[#E8ECE9]">
            <div className="flex items-center space-x-1.5 text-[#C9A86A] font-bold text-[11px] mb-1">
              <Lock className="w-3.5 h-3.5" />
              <span className="uppercase tracking-wider">Authoritative Invariant</span>
            </div>
            <p className="text-[#052326] font-medium leading-relaxed">
              &ldquo;{selectedNode.invariant}&rdquo;
            </p>
          </div>

          <div className="p-3 rounded-lg bg-white border border-[#E8ECE9]">
            <div className="flex items-center space-x-1.5 text-[#2E595A] font-bold text-[11px] mb-1">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span className="uppercase tracking-wider">Defensive Enforcement</span>
            </div>
            <p className="text-[#678882] leading-relaxed">
              {selectedNode.details}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
