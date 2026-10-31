"use client";

import React from "react";
import { Bot, Lock } from "lucide-react";

export function ProvidersView() {
  const providers = [
    {
      name: "Google Gemini",
      id: "gemini",
      model: "gemini-3.8-flash",
      api: "Gemini Interactions API (with generateContent fallback)",
      status: "PRIMARY PRODUCTION PROVIDER",
      features: "Function calling, multi-turn continuation, structured JSON contract",
      isPrimary: true,
    },
    {
      name: "Mock Provider",
      id: "mock",
      model: "mock-deterministic-v1",
      api: "In-memory deterministic test suite",
      status: "DEVELOPMENT & CI/CD",
      features: "Offline testing, 138-case regression suite, zero credentials needed",
      isPrimary: false,
    },
    {
      name: "Anthropic Claude",
      id: "anthropic",
      model: "Configurable via ANTHROPIC_MODEL",
      api: "Messages API tool calling contract",
      status: "OPTIONAL INTEGRATION READY",
      features: "Standardized LLMProvider interface",
      isPrimary: false,
    },
    {
      name: "OpenAI GPT",
      id: "openai",
      model: "Configurable via OPENAI_MODEL",
      api: "Chat Completions tool calling contract",
      status: "OPTIONAL INTEGRATION READY",
      features: "Standardized LLMProvider interface",
      isPrimary: false,
    },
  ];

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* Header */}
      <section className="bg-white rounded-2xl border border-[#E8ECE9] p-6 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#E8ECE9]">
          <div>
            <div className="flex items-center space-x-2">
              <span className="text-[10px] font-bold tracking-[0.16em] uppercase text-[#678882]">
                DECOUPLED REASONING
              </span>
              <span className="w-1.5 h-1.5 rounded-full bg-[#C9A86A]" />
              <span className="text-xs font-mono text-[#2E595A]">
                ZERO SECURITY AUTHORITY
              </span>
            </div>
            <h2 className="text-2xl font-serif font-bold text-[#052326] mt-1">
              LLM Provider Abstraction
            </h2>
            <p className="text-xs text-[#2E595A] mt-1">
              Pluggable model abstraction enabling seamless switching between Gemini 3.8 Flash, Mock, and future models without modifying security gates.
            </p>
          </div>

          <div className="flex items-center space-x-2">
            <span className="px-3 py-1 rounded-full text-xs font-mono font-medium bg-[#FAF5EB] border border-[#C9A86A]/40 text-[#C9A86A]">
              Active: gemini-3.8-flash
            </span>
          </div>
        </div>

        {/* Security Invariant */}
        <div className="mt-4 p-4 rounded-xl bg-[#FBF9F8] border border-[#E8ECE9] space-y-1.5 text-xs">
          <div className="flex items-center space-x-2 text-[#052326] font-bold">
            <Lock className="w-4 h-4 text-[#C9A86A]" />
            <span>MODEL INDEPENDENT SECURITY INVARIANT</span>
          </div>
          <p className="text-[#678882] leading-relaxed">
            The LLM Provider is strictly a reasoning tool. It receives prompt contexts, returns function call requests or user messages, but has zero network sockets or authority to execute tools directly. All tool calls must be intercepted by the Security Gateway.
          </p>
        </div>
      </section>

      {/* Providers Cards */}
      <section className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {providers.map((p) => (
          <div
            key={p.id}
            className={`p-5 rounded-2xl bg-white border transition-all space-y-3 ${
              p.isPrimary
                ? "border-[#C9A86A]/50 ring-1 ring-[#C9A86A]/20 shadow-md"
                : "border-[#E8ECE9] shadow-sm"
            }`}
          >
            <div className="flex items-center justify-between pb-2 border-b border-[#E8ECE9]">
              <div className="flex items-center space-x-2.5">
                <div
                  className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs ${
                    p.isPrimary
                      ? "bg-[#052326] text-[#C9A86A]"
                      : "bg-[#EBF1ED] text-[#2E595A]"
                  }`}
                >
                  <Bot className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-[#052326]">
                    {p.name}
                  </h4>
                  <span className="text-[10px] font-mono text-[#678882]">
                    {p.model}
                  </span>
                </div>
              </div>

              <span
                className={`text-[9px] font-mono px-2 py-0.5 rounded font-bold ${
                  p.isPrimary
                    ? "bg-[#FAF5EB] text-[#C9A86A] border border-[#C9A86A]/40"
                    : "bg-[#F3F6F4] text-[#678882]"
                }`}
              >
                {p.status}
              </span>
            </div>

            <div className="space-y-1 text-xs">
              <div className="text-[11px] text-[#2E595A]">
                <strong>API Method:</strong> {p.api}
              </div>
              <div className="text-[11px] text-[#678882]">
                <strong>Capabilities:</strong> {p.features}
              </div>
            </div>
          </div>
        ))}
      </section>
    </div>
  );
}
