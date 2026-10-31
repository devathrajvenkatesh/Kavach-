"use client";

import React, { useState, useEffect } from "react";
import Image from "next/image";
import {
  ShieldCheck,
  Bot,
  ShieldAlert,
  Radio,
  FlaskConical,
  ArrowRight,
  CheckCircle2,
  Lock,
  Clock,
  Sparkles,
} from "lucide-react";
import { defaultAuditLogger, AuditEvent } from "@/lib/audit/logger";

interface CommandCenterProps {
  onNavigateToAttackLab: (category?: string) => void;
  onNavigateToLiveDemo: () => void;
  onNavigateToThreats?: () => void;
  onNavigateToActivity?: () => void;
  onNavigateToTrace?: (correlationId?: string) => void;
  onNavigateToFiles?: () => void;
}

export function CommandCenter({
  onNavigateToAttackLab,
  onNavigateToLiveDemo,
  onNavigateToThreats,
  onNavigateToActivity,
  onNavigateToFiles,
}: CommandCenterProps) {
  const [recentEvents, setRecentEvents] = useState<AuditEvent[]>([]);
  const [lastActivityTime, setLastActivityTime] = useState<string>("Just now");

  useEffect(() => {
    const events = defaultAuditLogger.getRecentEvents(8);
    setRecentEvents(events);
    if (events.length > 0 && events[0]?.timestamp) {
      setLastActivityTime(new Date(events[0].timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }));
    }

    const interval = setInterval(() => {
      const updated = defaultAuditLogger.getRecentEvents(8);
      setRecentEvents(updated);
    }, 2500);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* 1. TOP HEADER & PROMINENT PROTECTION STATUS */}
      <section className="bg-white rounded-2xl border border-[#E8ECE9] p-6 sm:p-8 shadow-xs relative overflow-hidden">
        {/* Subtle decorative glow */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-bl from-[#C9A86A]/10 via-[#2E595A]/5 to-transparent rounded-full blur-2xl pointer-events-none" />

        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 relative z-10">
          <div className="flex items-start space-x-5 max-w-3xl">
            <div className="relative flex-shrink-0 hidden sm:block w-16 h-18 mt-1">
              <Image
                src="/kavach-emblem.png"
                alt="Kavach Shield Emblem"
                width={80}
                height={91}
                className="w-full h-full object-contain filter drop-shadow-[0_4px_16px_rgba(5,35,38,0.1)]"
                priority
              />
            </div>
            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <span className="text-[11px] font-mono font-bold tracking-wider uppercase text-[#C9A86A] bg-[#FAF5EB] px-2.5 py-0.5 rounded-full border border-[#C9A86A]/30">
                  ENTERPRISE AI DEFENSE
                </span>
                <span className="text-xs text-[#678882]">•</span>
                <span className="text-xs font-mono text-[#678882]">
                  ZERO-AUTHORITY DATA BOUNDARY
                </span>
              </div>

              <h1 className="text-3xl sm:text-4xl font-serif font-bold text-[#052326] tracking-tight">
                Kavach
              </h1>
              <h2 className="text-lg font-medium text-[#2E595A]">
                Intelligent Protection for AI Agents
              </h2>

              <p className="text-sm text-[#678882] leading-relaxed max-w-2xl">
                Kavach protects AI agents from prompt injection, unauthorized actions, and malicious external content.
              </p>
            </div>
          </div>

          {/* Quick Action Button */}
          <div className="flex flex-col sm:flex-row lg:flex-col gap-2.5 flex-shrink-0">
            <button
              onClick={onNavigateToLiveDemo}
              className="px-5 py-3 rounded-xl bg-[#052326] hover:bg-[#2E595A] text-white text-xs font-semibold tracking-wide flex items-center justify-center space-x-2 shadow-sm transition-all hover:shadow"
            >
              <Bot className="w-4 h-4 text-[#C9A86A]" />
              <span>Chat with AI Agent</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
            {onNavigateToThreats && (
              <button
                onClick={onNavigateToThreats}
                className="px-5 py-3 rounded-xl bg-white hover:bg-[#FAF5EB] text-[#052326] border border-[#E8ECE9] hover:border-[#C9A86A] text-xs font-semibold tracking-wide flex items-center justify-center space-x-2 shadow-xs transition-all"
              >
                <ShieldAlert className="w-4 h-4 text-[#C9A86A]" />
                <span>Explore Threat Center</span>
              </button>
            )}
            <button
              onClick={() => onNavigateToAttackLab()}
              className="px-5 py-3 rounded-xl bg-white hover:bg-[#F7F9F8] text-[#052326] border border-[#E8ECE9] hover:border-[#A5B5A9] text-xs font-semibold tracking-wide flex items-center justify-center space-x-2 shadow-xs transition-all"
            >
              <FlaskConical className="w-4 h-4 text-[#2E595A]" />
              <span>Adversarial Attack Lab</span>
            </button>
          </div>
        </div>

        {/* PROMINENT PROTECTION STATUS CARD */}
        <div className="mt-8 pt-6 border-t border-[#E8ECE9]/80 flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-xl bg-[#FBF9F8] border border-[#E8ECE9]">
          <div className="flex items-center space-x-3.5">
            <div className="w-10 h-10 rounded-xl bg-[#EBF1ED] border border-[#A5B5A9]/50 flex items-center justify-center text-[#2E595A] shadow-xs">
              <ShieldCheck className="w-6 h-6 text-[#2E595A]" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="text-base font-bold text-[#052326] tracking-tight">
                  PROTECTED
                </span>
                <span className="w-2 h-2 rounded-full bg-emerald-600 animate-pulse" />
              </div>
              <p className="text-xs text-[#678882]">
                Kavach is actively monitoring this agent and enforcing deterministic security boundaries.
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2 text-xs font-mono text-[#2E595A] bg-white px-3 py-1.5 rounded-lg border border-[#E8ECE9]">
            <Lock className="w-3.5 h-3.5 text-[#C9A86A]" />
            <span>Invariant: Fail-Closed Protection Active</span>
          </div>
        </div>
      </section>

      {/* 2. LAYER 1: SECURITY SUMMARY CARDS */}
      <section className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5 sm:gap-4">
        {/* Card 1: Protection Status */}
        <div className="bg-white rounded-2xl border border-[#E8ECE9] p-5 shadow-xs hover:border-[#A5B5A9] transition-all">
          <div className="flex items-center justify-between text-[#678882] mb-3">
            <span className="text-[11px] font-mono font-semibold uppercase tracking-wider">
              Protection Status
            </span>
            <ShieldCheck className="w-4 h-4 text-[#2E595A]" />
          </div>
          <div className="text-2xl font-bold text-[#052326] tracking-tight flex items-center space-x-2">
            <span>Protected</span>
          </div>
          <p className="text-[11px] text-[#678882] mt-1">
            Deterministic defense active
          </p>
        </div>

        {/* Card 2: Threats Blocked */}
        <div className="bg-white rounded-2xl border border-[#E8ECE9] p-5 shadow-xs hover:border-[#A5B5A9] transition-all">
          <div className="flex items-center justify-between text-[#678882] mb-3">
            <span className="text-[11px] font-mono font-semibold uppercase tracking-wider">
              Threats Blocked
            </span>
            <ShieldAlert className="w-4 h-4 text-[#C9A86A]" />
          </div>
          <div className="text-2xl font-bold text-[#052326] tracking-tight">
            112
          </div>
          <p className="text-[11px] text-[#2E595A] font-semibold mt-1">
            100% of detected attacks halted
          </p>
        </div>

        {/* Card 3: Security Events */}
        <div className="bg-white rounded-2xl border border-[#E8ECE9] p-5 shadow-xs hover:border-[#A5B5A9] transition-all">
          <div className="flex items-center justify-between text-[#678882] mb-3">
            <span className="text-[11px] font-mono font-semibold uppercase tracking-wider">
              Security Events
            </span>
            <Radio className="w-4 h-4 text-[#2E595A]" />
          </div>
          <div className="text-2xl font-bold text-[#052326] tracking-tight">
            138
          </div>
          <p className="text-[11px] text-[#678882] mt-1">
            Evaluated against corpus
          </p>
        </div>

        {/* Card 4: Agent Status */}
        <div className="bg-white rounded-2xl border border-[#E8ECE9] p-5 shadow-xs hover:border-[#A5B5A9] transition-all">
          <div className="flex items-center justify-between text-[#678882] mb-3">
            <span className="text-[11px] font-mono font-semibold uppercase tracking-wider">
              Agent Status
            </span>
            <Bot className="w-4 h-4 text-[#2E595A]" />
          </div>
          <div className="text-2xl font-bold text-[#052326] tracking-tight flex items-center space-x-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-600 animate-pulse" />
            <span>Online</span>
          </div>
          <p className="text-[11px] text-[#678882] mt-1">
            Ready for safe interactions
          </p>
        </div>

        {/* Card 5: Last Activity */}
        <div className="bg-white rounded-2xl border border-[#E8ECE9] p-5 shadow-xs hover:border-[#A5B5A9] transition-all col-span-2 sm:col-span-1">
          <div className="flex items-center justify-between text-[#678882] mb-3">
            <span className="text-[11px] font-mono font-semibold uppercase tracking-wider">
              Last Activity
            </span>
            <Clock className="w-4 h-4 text-[#678882]" />
          </div>
          <div className="text-2xl font-bold text-[#052326] tracking-tight">
            {lastActivityTime}
          </div>
          <p className="text-[11px] text-[#678882] mt-1">
            Real-time telemetry stream
          </p>
        </div>
      </section>

      {/* 3. CORE PROTECTION PILLARS */}
      <section className="bg-white rounded-2xl border border-[#E8ECE9] p-6 sm:p-8 shadow-xs space-y-5">
        <div>
          <h3 className="text-base font-bold text-[#052326] tracking-tight">
            How Kavach Protects Your AI Agent
          </h3>
          <p className="text-xs text-[#678882] mt-0.5">
            Four active protection layers guarantee that untrusted inputs cannot hijack agent behavior or trigger unauthorized actions.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="p-4 rounded-xl bg-[#FBF9F8] border border-[#E8ECE9] space-y-2">
            <div className="w-8 h-8 rounded-lg bg-[#FAF5EB] border border-[#C9A86A]/40 flex items-center justify-center text-[#052326]">
              <ShieldAlert className="w-4 h-4 text-[#C9A86A]" />
            </div>
            <h4 className="text-xs font-bold text-[#052326]">Prompt Injection Defense</h4>
            <p className="text-[11px] text-[#678882] leading-relaxed">
              Detects and halts direct instructions, jailbreak personas, and hidden directives inside emails or webpages.
            </p>
          </div>

          <div className="p-4 rounded-xl bg-[#FBF9F8] border border-[#E8ECE9] space-y-2">
            <div className="w-8 h-8 rounded-lg bg-[#EBF1ED] border border-[#A5B5A9]/50 flex items-center justify-center text-[#2E595A]">
              <Lock className="w-4 h-4 text-[#2E595A]" />
            </div>
            <h4 className="text-xs font-bold text-[#052326]">Human Confirmation Gate</h4>
            <p className="text-[11px] text-[#678882] leading-relaxed">
              Consequential actions (sending emails, modifying files) are paused automatically until confirmed by a human.
            </p>
          </div>

          <div className="p-4 rounded-xl bg-[#FBF9F8] border border-[#E8ECE9] space-y-2">
            <div className="w-8 h-8 rounded-lg bg-[#FBF9F8] border border-[#E8ECE9] flex items-center justify-center text-[#052326]">
              <CheckCircle2 className="w-4 h-4 text-[#2E595A]" />
            </div>
            <h4 className="text-xs font-bold text-[#052326]">Sensitive Data Shield</h4>
            <p className="text-[11px] text-[#678882] leading-relaxed">
              Strictly prevents API keys, credentials, environment tokens, and private files from leaking or exfiltrating.
            </p>
          </div>

          <div className="p-4 rounded-xl bg-[#FBF9F8] border border-[#E8ECE9] space-y-2 flex flex-col justify-between">
            <div className="space-y-2">
              <div className="w-8 h-8 rounded-lg bg-[#EBF1ED] border border-[#A5B5A9]/50 flex items-center justify-center text-[#2E595A]">
                <Sparkles className="w-4 h-4 text-[#2E595A]" />
              </div>
              <h4 className="text-xs font-bold text-[#052326]">Zero-Authority Data Boundary</h4>
              <p className="text-[11px] text-[#678882] leading-relaxed">
                External content is tagged as raw untrusted data. The LLM can analyze it, but can never execute commands from it.
              </p>
            </div>
            {onNavigateToFiles && (
              <button
                onClick={onNavigateToFiles}
                className="mt-2 text-[11px] font-semibold text-[#2E595A] hover:text-[#052326] flex items-center gap-1 transition-colors self-start"
              >
                <span>Open Secure Files</span>
                <span>→</span>
              </button>
            )}
          </div>
        </div>
      </section>

      {/* 4. RECENT PROTECTION ACTIVITY (LAYER 1) */}
      <section className="bg-white rounded-2xl border border-[#E8ECE9] p-6 sm:p-8 shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-base font-bold text-[#052326] tracking-tight">
              Recent Protection Activity
            </h3>
            <p className="text-xs text-[#678882]">
              Live security decisions and defense intercepts processed by Kavach.
            </p>
          </div>

          {onNavigateToActivity && (
            <button
              onClick={onNavigateToActivity}
              className="text-xs font-medium text-[#2E595A] hover:text-[#052326] flex items-center space-x-1 transition-colors"
            >
              <span>View Full Activity Feed</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        <div className="divide-y divide-[#E8ECE9]/70">
          {recentEvents.length === 0 ? (
            <div className="py-6 text-center text-xs text-[#678882] font-mono">
              Protection perimeter active. No security violations detected.
            </div>
          ) : (
            recentEvents.slice(0, 5).map((evt, idx) => {
              const isBlock = evt.decision === "BLOCK" || evt.eventType === "SECURITY_BLOCKED";
              const isConfirm = evt.decision === "REQUIRE_CONFIRMATION" || evt.eventType === "CONFIRMATION_REQUIRED";

              return (
                <div key={idx} className="py-3.5 flex items-center justify-between gap-4">
                  <div className="flex items-center space-x-3 min-w-0">
                    <div
                      className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 ${
                        isBlock
                          ? "bg-[#FAF5EB] text-[#C9A86A] border border-[#C9A86A]/40"
                          : isConfirm
                          ? "bg-[#FAF5EB] text-[#C9A86A] border border-[#C9A86A]/30"
                          : "bg-[#EBF1ED] text-[#2E595A] border border-[#A5B5A9]/40"
                      }`}
                    >
                      {isBlock ? (
                        <ShieldAlert className="w-3.5 h-3.5" />
                      ) : isConfirm ? (
                        <Lock className="w-3.5 h-3.5" />
                      ) : (
                        <CheckCircle2 className="w-3.5 h-3.5" />
                      )}
                    </div>

                    <div className="min-w-0">
                      <div className="text-xs font-semibold text-[#052326] truncate">
                        {isBlock
                          ? evt.reason || "Adversarial Directive Intercepted"
                          : isConfirm
                          ? "Consequential Action Paused for Human Approval"
                          : evt.reason || "Authorized Request Processed Safely"}
                      </div>
                      <div className="text-[11px] text-[#678882] truncate">
                        Source: {evt.source || "User Interaction"} • {new Date(evt.timestamp).toLocaleTimeString()}
                      </div>
                    </div>
                  </div>

                  <div className="flex-shrink-0">
                    <span
                      className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-full ${
                        isBlock
                          ? "bg-[#FAF5EB] text-[#C9A86A] border border-[#C9A86A]/40"
                          : isConfirm
                          ? "bg-[#FAF5EB] text-[#C9A86A] border border-[#C9A86A]/40"
                          : "bg-[#EBF1ED] text-[#2E595A]"
                      }`}
                    >
                      {isBlock ? "BLOCKED" : isConfirm ? "CONFIRMATION" : "APPROVED"}
                    </span>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </section>
    </div>
  );
}
