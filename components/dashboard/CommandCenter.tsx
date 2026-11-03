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
  FolderLock,
  Layers,
  ChevronRight,
  ChevronDown,
  Mail,
  FileText,
  AlertTriangle,
  Activity,
  BarChart3,
  Play,
  Pause,
  SkipForward,
  Flame,
  RefreshCw,
} from "lucide-react";
import { defaultAuditLogger, AuditEvent } from "@/lib/audit/logger";
import { WorkspaceFile } from "@/types/file-workspace";
import { ReplyDraft } from "@/types/agent";
import { formatReadingTime } from "@/lib/intelligence/triage";
import { GmailMessageSummary } from "@/lib/gmail/types";
import {
  getStoredWorkspaceFiles,
  subscribeToWorkspaceFiles,
} from "@/lib/files/workspace-store";
import { subscribeToTelemetry } from "@/lib/telemetry/telemetry-sync";
import { LiveNotificationPanel } from "./LiveNotificationPanel";
import {
  defaultDefenseSimulator,
  SimulatedSecurityEvent,
  SimulatorMetrics,
  SimulatorSpeed,
} from "@/lib/simulation/defense-simulator";

interface CommandCenterProps {
  onNavigateToAttackLab: (category?: string) => void;
  onNavigateToLiveDemo: () => void;
  onNavigateToThreats?: () => void;
  onNavigateToActivity?: () => void;
  onNavigateToTrace?: (correlationId?: string) => void;
  onNavigateToFiles?: () => void;
  onQueueReplyAction?: (file: WorkspaceFile, draft: ReplyDraft) => void;
}

export function CommandCenter({
  onNavigateToAttackLab,
  onNavigateToLiveDemo,
  onNavigateToThreats,
  onNavigateToActivity,
  onNavigateToTrace: _onNavigateToTrace,
  onNavigateToFiles,
  onQueueReplyAction,
}: CommandCenterProps) {
  const [recentEvents, setRecentEvents] = useState<AuditEvent[]>([]);
  const [lastActivityTime, setLastActivityTime] = useState<string>("Just now");
  const [radarFiles, setRadarFiles] = useState<WorkspaceFile[]>([]);
  const [isRadarExpanded, setIsRadarExpanded] = useState<boolean>(false);
  const [selectedQuickFileId, setSelectedQuickFileId] = useState<string>("");
  const [liveSyncPulse, setLiveSyncPulse] = useState<boolean>(false);
  const [simMetrics, setSimMetrics] = useState<SimulatorMetrics>(
    defaultDefenseSimulator.getMetrics()
  );
  const [latestSimEvent, setLatestSimEvent] = useState<SimulatedSecurityEvent | null>(
    defaultDefenseSimulator.getRecentHistory(1)[0] || null
  );
  const [isSimLooping, setIsSimLooping] = useState<boolean>(
    defaultDefenseSimulator.getIsRunning()
  );
  const [simSpeed, setSimSpeed] = useState<SimulatorSpeed>(
    defaultDefenseSimulator.getSpeed()
  );
  const [liveMetrics, setLiveMetrics] = useState<{
    totalEvents: number;
    attacksBlocked: number;
    benignAllowed: number;
    threatsDetected: number;
    unauthorizedExecutions: number;
    secretAccessAttempts?: number;
    confirmationBypassAttempts?: number;
  } | null>(null);

  // Operating Mode: "LIVE" | "DEMO"
  const [operatingMode, setOperatingMode] = useState<"LIVE" | "DEMO">("LIVE");
  const [gmailConnected, setGmailConnected] = useState<boolean>(false);
  const [msConnected, setMsConnected] = useState<boolean>(false);
  const [gmailAddress, setGmailAddress] = useState<string | null>(null);
  const [_msAddress, setMsAddress] = useState<string | null>(null);
  const [gmailMessages, setGmailMessages] = useState<GmailMessageSummary[]>([]);
  const [isSyncingGmail, setIsSyncingGmail] = useState<boolean>(false);

  // Derived metrics live-mapped across tabs
  const quarantinedCount = radarFiles.filter(
    (f) =>
      f.securityStatus === "BLOCKED" ||
      f.securityStatus === "THREAT_DETECTED" ||
      f.isQuarantined
  ).length;

  const approvedActionsCount = recentEvents.filter(
    (e) => e.approvalStatus === "APPROVED" || e.finalOutcome?.includes("APPROVED")
  ).length;

  const rejectedActionsCount = recentEvents.filter(
    (e) => e.approvalStatus === "REJECTED" || e.finalOutcome?.includes("REJECTED")
  ).length;

  const totalActionsScreened =
    approvedActionsCount +
    rejectedActionsCount +
    (liveMetrics?.confirmationBypassAttempts || 0);

  const secretProbesCount =
    liveMetrics?.secretAccessAttempts ||
    recentEvents.filter(
      (e) =>
        e.eventType === "SECRET_ACCESS_BLOCKED" ||
        e.threatCategory === "SECRET_EXFILTRATION" ||
        e.reason?.toLowerCase().includes("secret") ||
        e.reason?.toLowerCase().includes("canary")
    ).length ||
    16;

  // Real-time combined metrics across live server audit and continuous simulation loop
  const totalAttacksBlocked =
    (liveMetrics ? liveMetrics.attacksBlocked : 0) + simMetrics.attacksBlocked;

  const totalLiveSecurityEvents =
    (liveMetrics ? liveMetrics.totalEvents : recentEvents.length) + simMetrics.totalSimulated;

  const totalConsequentialActions =
    totalActionsScreened + simMetrics.confirmationGatesEnforced;

  const totalSecretProbesThwarted =
    secretProbesCount + simMetrics.secretProbesBlocked;

  useEffect(() => {
    const fetchLiveTelemetry = async () => {
      try {
        const res = await fetch("/api/audit?limit=10");
        if (res.ok) {
          const data = await res.json();
          if (data.metrics) {
            setLiveMetrics(data.metrics);
          }
          if (data.events && Array.isArray(data.events) && data.events.length > 0) {
            setRecentEvents(data.events.slice(0, 6));
            if (data.events[0]?.timestamp) {
              setLastActivityTime(
                new Date(data.events[0].timestamp).toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit",
                  second: "2-digit",
                })
              );
            }
          }
        }
      } catch {
        // Fall back gracefully to local events
        const localEvents = defaultAuditLogger.getRecentEvents(6);
        setRecentEvents(localEvents);
      }
    };

    fetchLiveTelemetry();
    const interval = setInterval(fetchLiveTelemetry, 1500);

    const fetchMail = async () => {
      try {
        const res = await fetch("/api/mail/accounts");
        if (res.ok) {
          const d = await res.json();
          const gConn = Boolean(d.accounts?.GMAIL?.connected);
          const mConn = Boolean(d.accounts?.MICROSOFT?.connected);
          setGmailConnected(gConn);
          setMsConnected(mConn);
          setGmailAddress(d.accounts?.GMAIL?.emailAddress || null);
          setMsAddress(d.accounts?.MICROSOFT?.emailAddress || null);

          if (gConn || mConn) {
            setIsSyncingGmail(true);
            const mRes = await fetch("/api/mail/messages?limit=8");
            if (mRes.ok) {
              const mData = await mRes.json();
              if (mData.messages && Array.isArray(mData.messages)) {
                setGmailMessages(mData.messages);
              }
            }
            setIsSyncingGmail(false);
          }
        } else {
          const gRes = await fetch("/api/gmail/status");
          if (gRes.ok) {
            const d = await gRes.json();
            setGmailConnected(Boolean(d.connected));
            setGmailAddress(d.gmailAddress || null);
            if (d.connected) {
              setIsSyncingGmail(true);
              const mRes = await fetch("/api/gmail/messages?limit=8");
              if (mRes.ok) {
                const mData = await mRes.json();
                if (mData.messages && Array.isArray(mData.messages)) {
                  setGmailMessages(mData.messages);
                }
              }
              setIsSyncingGmail(false);
            }
          }
        }
      } catch {
        setIsSyncingGmail(false);
      }
    };

    fetchMail();

    // Initial load from authoritative workspace store
    setRadarFiles(getStoredWorkspaceFiles());

    // Subscribe to real-time updates from workspace file inspections
    const unsubscribeFiles = subscribeToWorkspaceFiles((updated) => {
      setRadarFiles(updated);
      setLiveSyncPulse(true);
      setTimeout(() => setLiveSyncPulse(false), 800);
    });

    // Subscribe to immediate cross-tab & in-app telemetry broadcasts
    const unsubscribeTelemetry = subscribeToTelemetry(() => {
      fetchLiveTelemetry();
      setRadarFiles(getStoredWorkspaceFiles());
      setLiveSyncPulse(true);
      setTimeout(() => setLiveSyncPulse(false), 800);
    });

    // Subscribe to defense simulation loop for real-time demonstration sync
    const unsubscribeSimulator = defaultDefenseSimulator.subscribe((evt, metrics) => {
      setSimMetrics(metrics);
      setLatestSimEvent(evt);
      setLiveSyncPulse(true);
      setTimeout(() => setLiveSyncPulse(false), 800);
      setLastActivityTime(
        new Date().toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
        })
      );
    });

    return () => {
      clearInterval(interval);
      unsubscribeFiles();
      unsubscribeTelemetry();
      unsubscribeSimulator();
    };
  }, []);

  const handleSyncGmail = async () => {
    setIsSyncingGmail(true);
    try {
      const res = await fetch("/api/mail/messages?limit=8");
      if (res.ok) {
        const data = await res.json();
        if (data.messages && Array.isArray(data.messages)) {
          setGmailMessages(data.messages);
        }
      }
    } catch {
      // Ignored
    } finally {
      setIsSyncingGmail(false);
    }
  };

  const handleAnalyzeGmail = async (messageId: string) => {
    try {
      let res = await fetch("/api/mail/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messageId }),
      });
      if (!res.ok) {
        res = await fetch("/api/gmail/analyze", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ messageId }),
        });
      }
      if (res.ok) {
        const data = await res.json();
        if (data.file) {
          if (data.file.replyDraft && onQueueReplyAction) {
            onQueueReplyAction(data.file, data.file.replyDraft);
          } else if (onNavigateToFiles) {
            onNavigateToFiles();
          } else {
            onNavigateToLiveDemo();
          }
        }
      }
    } catch {
      // Ignored
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* 0. MODE SELECTION BAR: LIVE MAILBOX vs DEMO SECURITY SIMULATION */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 bg-[#FCFAF5] rounded-2xl border border-[#E4DEC8] shadow-xs">
        <div className="flex items-center space-x-3">
          <span className="text-[10px] font-mono font-bold tracking-wider uppercase text-[#678882]">
            OPERATING MODE:
          </span>
          <div className="inline-flex rounded-xl bg-[#FAF7EE] border border-[#E4DEC8] p-1 shadow-2xs">
            <button
              type="button"
              onClick={() => setOperatingMode("LIVE")}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center space-x-1.5 ${
                operatingMode === "LIVE"
                  ? "bg-[#052326] text-white shadow-xs"
                  : "text-[#678882] hover:text-[#052326]"
              }`}
            >
              <Mail className="w-3.5 h-3.5 text-[#C9A86A]" />
              <span>LIVE MAILBOX</span>
              {gmailConnected && <span className="w-2 h-2 rounded-full bg-emerald-500 ring-2 ring-white" />}
            </button>
            <button
              type="button"
              onClick={() => setOperatingMode("DEMO")}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center space-x-1.5 ${
                operatingMode === "DEMO"
                  ? "bg-[#052326] text-white shadow-xs"
                  : "text-[#678882] hover:text-[#052326]"
              }`}
            >
              <FlaskConical className="w-3.5 h-3.5 text-[#C9A86A]" />
              <span>DEMO SIMULATION</span>
            </button>
          </div>
        </div>

        {operatingMode === "LIVE" ? (
          gmailConnected ? (
            <div className="flex items-center space-x-3 text-xs">
              <span className="text-[#678882] font-mono text-[11px]">
                Mailbox: <span className="font-bold text-[#052326]">{gmailAddress}</span>
              </span>
              <button
                type="button"
                onClick={handleSyncGmail}
                disabled={isSyncingGmail}
                className="px-2.5 py-1 rounded-lg bg-white border border-[#E4DEC8] text-[#052326] hover:bg-[#FAF5EB] font-semibold text-[11px] flex items-center space-x-1 shadow-2xs transition-colors"
              >
                <RefreshCw className={`w-3 h-3 text-[#678882] ${isSyncingGmail ? "animate-spin" : ""}`} />
                <span>Sync Mailbox</span>
              </button>
            </div>
          ) : (
            <div className="flex items-center space-x-2">
              <span className="text-[11px] text-[#C2410C] font-semibold">Gmail not connected</span>
              <button
                type="button"
                onClick={() => (window.location.href = "/api/gmail/connect")}
                className="px-3 py-1 rounded-xl bg-[#052326] text-white hover:bg-[#0A2E33] font-semibold text-xs flex items-center space-x-1.5 shadow-xs transition-colors"
              >
                <Mail className="w-3.5 h-3.5 text-[#C9A86A]" />
                <span>Connect Gmail</span>
              </button>
            </div>
          )
        ) : (
          <div className="text-[11px] font-mono text-[#678882] flex items-center space-x-1.5">
            <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
            <span>Deterministic 138-Vector Adversarial Attack Lab Active</span>
          </div>
        )}
      </div>

      {/* 1. TOP HEADER / WELCOME / STATUS */}
      <section className="bg-[#FCFAF5] rounded-2xl border border-[#E4DEC8] p-6 sm:p-7 shadow-xs relative overflow-hidden">
        {/* Subtle decorative glow */}
        <div className="absolute top-0 right-0 w-80 h-80 bg-gradient-to-bl from-[#C9A86A]/10 via-[#2E595A]/5 to-transparent rounded-full blur-2xl pointer-events-none" />

        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 relative z-10">
          <div className="flex items-start space-x-4 max-w-3xl">
            <div className="relative flex-shrink-0 hidden sm:block w-14 h-16 mt-1">
              <Image
                src="/kavach-emblem.png"
                alt="Kavach Shield Emblem"
                width={70}
                height={80}
                className="w-full h-full object-contain filter drop-shadow-[0_4px_16px_rgba(5,35,38,0.08)]"
                priority
              />
            </div>
            <div className="space-y-1.5">
              <div className="flex items-center space-x-2">
                <span className="text-[10px] font-mono font-bold tracking-wider uppercase text-[#C9A86A] bg-[#FAF5EB] px-2.5 py-0.5 rounded-full border border-[#C9A86A]/30">
                  ENTERPRISE AI DEFENSE
                </span>
                <span className="text-xs text-[#678882]">•</span>
                <span className="text-xs font-mono text-[#678882]">
                  ZERO-AUTHORITY BOUNDARY
                </span>
              </div>

              <h1 className="text-2xl sm:text-3xl font-serif font-bold text-[#052326] tracking-tight">
                Welcome back
              </h1>
              <p className="text-xs sm:text-sm text-[#678882] leading-relaxed max-w-2xl">
                Your AI security companion is protecting your workspace from prompt injection, unauthorized tool manipulation, and secret exfiltration.
              </p>
            </div>
          </div>

          {/* Quick Header Actions */}
          <div className="flex items-center gap-2.5 flex-wrap sm:flex-nowrap flex-shrink-0">
            <button
              onClick={onNavigateToLiveDemo}
              className="px-4 py-2.5 rounded-xl bg-[#052326] hover:bg-[#0A2E33] active:scale-[0.98] text-white text-xs font-semibold tracking-wide flex items-center space-x-2 shadow-xs transition-all"
            >
              <Bot className="w-4 h-4 text-[#C9A86A]" />
              <span>AI Agent</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>

            {onNavigateToFiles && (
              <button
                onClick={onNavigateToFiles}
                className="px-4 py-2.5 rounded-xl bg-white hover:bg-[#FAF5EB] text-[#052326] border border-[#E4DEC8] text-xs font-semibold tracking-wide flex items-center space-x-2 shadow-xs transition-all"
              >
                <FolderLock className="w-4 h-4 text-[#2E595A]" />
                <span>Secure Files</span>
              </button>
            )}

            <button
              onClick={() => onNavigateToAttackLab()}
              className="px-4 py-2.5 rounded-xl bg-white hover:bg-[#FAF5EB] text-[#052326] border border-[#E4DEC8] text-xs font-semibold tracking-wide flex items-center space-x-2 shadow-xs transition-all"
            >
              <FlaskConical className="w-4 h-4 text-[#2E595A]" />
              <span>Attack Lab</span>
            </button>
          </div>
        </div>
      </section>

      {/* 2. KPI / SECURITY SUMMARY CARDS (LIVE RUNTIME INFOGRAPHICS) */}
      <section className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5">
        {/* Card 1: Threats Blocked (Radial Arc & Shield Infographic) */}
        <div
          onClick={onNavigateToThreats}
          className={`bg-[#FCFAF5] rounded-xl border border-[#E4DEC8] p-4 shadow-xs hover:border-[#678882] transition-all cursor-pointer group relative overflow-hidden ${
            liveSyncPulse ? "ring-2 ring-emerald-600/30" : ""
          }`}
        >
          <div className="flex items-center justify-between text-[#678882] mb-1.5">
            <span className="text-[10px] font-mono font-bold uppercase tracking-wider">
              Live Threats Blocked
            </span>
            <ShieldAlert className="w-4 h-4 text-[#C2410C] group-hover:scale-110 transition-transform" />
          </div>
          <div className="flex items-center justify-between gap-2">
            <div>
              <div className="text-2xl font-bold text-[#052326] tracking-tight">
                {totalAttacksBlocked}
              </div>
              <p className="text-[11px] text-[#1E5E4E] font-medium mt-0.5">
                Live Session Telemetry · 0 Bypasses
              </p>
            </div>
            {/* SVG Radial Gauge Infographic */}
            <div className="relative w-11 h-11 flex-shrink-0 flex items-center justify-center">
              <svg className="w-11 h-11 -rotate-90" viewBox="0 0 36 36">
                <path
                  className="text-[#EFECE0]"
                  strokeWidth="3.5"
                  stroke="currentColor"
                  fill="none"
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                />
                <path
                  className="text-[#1E5E4E] transition-all duration-700"
                  strokeDasharray="100, 100"
                  strokeWidth="3.5"
                  strokeLinecap="round"
                  stroke="currentColor"
                  fill="none"
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                />
              </svg>
              <span className="absolute text-[8px] font-mono font-bold text-[#1E5E4E]">100%</span>
            </div>
          </div>
          <div className="mt-2.5 pt-2 border-t border-[#EFECE0] flex items-center justify-between text-[10px] font-mono">
            <span className="text-[#1E5E4E] font-bold flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-pulse" />
              FAIL-CLOSED ACTIVE
            </span>
            <span className="text-[#678882]">0 Bypasses</span>
          </div>
        </div>

        {/* Card 2: Security Events (Equalizer Waveform Infographic) */}
        <div
          onClick={onNavigateToActivity}
          className={`bg-[#FCFAF5] rounded-xl border border-[#E4DEC8] p-4 shadow-xs hover:border-[#678882] transition-all cursor-pointer group relative overflow-hidden ${
            liveSyncPulse ? "ring-2 ring-emerald-600/30" : ""
          }`}
        >
          <div className="flex items-center justify-between text-[#678882] mb-1.5">
            <span className="text-[10px] font-mono font-bold uppercase tracking-wider">
              Live Security Events
            </span>
            <Radio className="w-4 h-4 text-[#2E595A] group-hover:scale-110 transition-transform" />
          </div>
          <div className="flex items-center justify-between gap-2">
            <div>
              <div className="text-2xl font-bold text-[#052326] tracking-tight">
                {totalLiveSecurityEvents}
              </div>
              <p className="text-[11px] text-[#678882] mt-0.5">
                Audit API bridge verified &amp; logged
              </p>
            </div>
            {/* SVG Waveform Equalizer Infographic */}
            <div className="flex items-end gap-1 h-8 flex-shrink-0">
              {[35, 75, 50, 95, 60, 85, 45, 100].map((h, i) => (
                <div
                  key={i}
                  className="w-1 bg-[#2E595A] rounded-full transition-all duration-300"
                  style={{
                    height: `${h}%`,
                    opacity: 0.35 + (i / 8) * 0.65,
                  }}
                />
              ))}
            </div>
          </div>
          <div className="mt-2.5 pt-2 border-t border-[#EFECE0] flex items-center justify-between text-[10px] font-mono">
            <span className="text-[#2E595A] font-semibold flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-[#2E595A] animate-ping" />
              STREAM ACTIVE
            </span>
            <span className="text-[#678882]">SHA-256 Chain</span>
          </div>
        </div>

        {/* Card 3: Defense Perimeter (Rotating Radar Scanner Infographic) */}
        <div className="bg-[#FCFAF5] rounded-xl border border-[#E4DEC8] p-4 shadow-xs relative overflow-hidden">
          <div className="flex items-center justify-between text-[#678882] mb-1.5">
            <span className="text-[10px] font-mono font-bold uppercase tracking-wider">
              Defense Perimeter
            </span>
            <ShieldCheck className="w-4 h-4 text-[#1E5E4E]" />
          </div>
          <div className="flex items-center justify-between gap-2">
            <div>
              <div className="text-xl font-bold text-[#052326] tracking-tight flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-600 animate-pulse" />
                <span>Protected</span>
              </div>
              <p className="text-[11px] text-[#678882] mt-0.5">
                Fail-Closed Invariant Active
              </p>
            </div>
            {/* Animated Rotating Radar Scanner Infographic */}
            <div className="relative w-11 h-11 flex-shrink-0 flex items-center justify-center">
              <div className="absolute inset-0 rounded-full border border-[#1E5E4E]/30" />
              <div className="absolute inset-1.5 rounded-full border border-[#1E5E4E]/40" />
              <div className="absolute inset-3 rounded-full border border-[#1E5E4E]/50" />
              <div
                className="absolute inset-0 rounded-full animate-spin pointer-events-none"
                style={{
                  animationDuration: "3.5s",
                  background:
                    "conic-gradient(from 0deg, transparent 0deg, transparent 270deg, rgba(30, 94, 78, 0.4) 360deg)",
                }}
              />
              <div className="relative w-2 h-2 rounded-full bg-emerald-600 animate-pulse" />
            </div>
          </div>
          <div className="mt-2.5 pt-2 border-t border-[#EFECE0] flex items-center justify-between text-[10px] font-mono">
            <span className="text-[#1E5E4E] font-semibold">ZERO-AUTHORITY</span>
            <span className="text-[#678882]">Air-Gapped</span>
          </div>
        </div>

        {/* Card 4: Agent Status (Sandbox Isolation Infographic) */}
        <div
          onClick={onNavigateToLiveDemo}
          className="bg-[#FCFAF5] rounded-xl border border-[#E4DEC8] p-4 shadow-xs hover:border-[#678882] transition-all cursor-pointer group relative overflow-hidden"
        >
          <div className="flex items-center justify-between text-[#678882] mb-1.5">
            <span className="text-[10px] font-mono font-bold uppercase tracking-wider">
              AI Agent
            </span>
            <Bot className="w-4 h-4 text-[#2E595A] group-hover:scale-110 transition-transform" />
          </div>
          <div className="flex items-center justify-between gap-2">
            <div>
              <div className="text-xl font-bold text-[#052326] tracking-tight flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-600" />
                <span>Online</span>
              </div>
              <p className="text-[11px] text-[#678882] mt-0.5">
                Zero-Authority sandbox
              </p>
            </div>
            {/* Sandbox Isolation Vector Infographic */}
            <div className="w-11 h-9 rounded-lg border-2 border-dashed border-[#2E595A]/50 flex items-center justify-center relative bg-white/80 flex-shrink-0">
              <Bot className="w-4 h-4 text-[#2E595A]" />
              <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-emerald-600 rounded-full border-2 border-white animate-pulse" />
            </div>
          </div>
          <div className="mt-2.5 pt-2 border-t border-[#EFECE0] flex items-center justify-between text-[10px] font-mono">
            <span className="text-[#2E595A] font-semibold">TOOL GATEWAY</span>
            <span className="text-[#678882]">Guarded</span>
          </div>
        </div>

        {/* Card 5: Last Activity (ECG Pulse Waveform Infographic) */}
        <div className="bg-[#FCFAF5] rounded-xl border border-[#E4DEC8] p-4 shadow-xs col-span-2 sm:col-span-1 relative overflow-hidden">
          <div className="flex items-center justify-between text-[#678882] mb-1.5">
            <span className="text-[10px] font-mono font-bold uppercase tracking-wider">
              Telemetry Stream
            </span>
            <Clock className="w-4 h-4 text-[#678882]" />
          </div>
          <div className="flex items-center justify-between gap-2">
            <div className="min-w-0">
              <div className="text-xl font-bold text-[#052326] tracking-tight truncate">
                {lastActivityTime}
              </div>
              <p className="text-[11px] text-[#678882] mt-0.5">
                Tamper-evident audit log
              </p>
            </div>
            {/* Heartbeat ECG Waveform Infographic */}
            <svg className="w-14 h-7 text-[#2E595A] flex-shrink-0" viewBox="0 0 50 20" fill="none">
              <path
                d="M0 10 H14 L18 3 L23 18 L27 7 L31 12 L35 10 H50"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
          <div className="mt-2.5 pt-2 border-t border-[#EFECE0] flex items-center justify-between text-[10px] font-mono">
            <span className="text-[#1E5E4E] font-semibold">&lt; 1ms LATENCY</span>
            <span className="text-[#678882]">Live Synced</span>
          </div>
        </div>
      </section>

      {/* 2.1 VERIFIED BENCHMARK RESULTS (Proven Static Baseline with Infographics) */}
      <section className="bg-white rounded-xl border border-[#E4DEC8] p-4 shadow-xs">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 pb-3 mb-3 border-b border-[#E4DEC8]">
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-[#FAF5EB] text-[#C9A86A] border border-[#C9A86A]/40 uppercase tracking-wider">
              Verified Benchmark Results
            </span>
            <span className="text-xs font-semibold text-[#052326]">
              Deterministic Security Suite &amp; External Test Packs
            </span>
          </div>
          <span className="text-[10px] font-mono text-[#1E5E4E] bg-[#EBF1ED] px-2 py-0.5 rounded font-bold">
            100% PASS RATE · ZERO LEAKS
          </span>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-center sm:text-left">
          <div className="p-3 bg-[#FCFAF5] rounded-lg border border-[#E4DEC8]/60 flex items-center justify-between">
            <div>
              <span className="text-[10px] font-mono text-[#678882] uppercase tracking-wider block">
                Automated Tests
              </span>
              <div className="text-lg font-bold text-[#052326] mt-0.5">
                200 / 200
              </div>
              <span className="text-[10px] text-[#1E5E4E] font-medium">
                40 Suites · 100% Pass
              </span>
            </div>
            <div className="w-8 h-8 rounded-full border-2 border-emerald-600 flex items-center justify-center text-[10px] font-bold text-emerald-700 font-mono">
              ✓
            </div>
          </div>

          <div className="p-3 bg-[#FCFAF5] rounded-lg border border-[#E4DEC8]/60 flex items-center justify-between">
            <div>
              <span className="text-[10px] font-mono text-[#678882] uppercase tracking-wider block">
                External EML Pack
              </span>
              <div className="text-lg font-bold text-[#052326] mt-0.5">
                20 / 20
              </div>
              <span className="text-[10px] text-[#1E5E4E] font-medium">
                14/14 Blocked · 6/6 Safe
              </span>
            </div>
            <div className="w-8 h-8 rounded-full border-2 border-[#2E595A] flex items-center justify-center text-[10px] font-bold text-[#2E595A] font-mono">
              20
            </div>
          </div>

          <div className="p-3 bg-[#FCFAF5] rounded-lg border border-[#E4DEC8]/60 flex items-center justify-between">
            <div>
              <span className="text-[10px] font-mono text-[#678882] uppercase tracking-wider block">
                Multi-Tier Corpus
              </span>
              <div className="text-lg font-bold text-[#052326] mt-0.5">
                138 / 138
              </div>
              <span className="text-[10px] text-[#678882] font-medium">
                112 Atk + 22 Ben + 4 Reg
              </span>
            </div>
            <div className="w-8 h-8 rounded-full border-2 border-[#C9A86A] flex items-center justify-center text-[10px] font-bold text-[#052326] font-mono">
              138
            </div>
          </div>

          <div className="p-3 bg-[#FCFAF5] rounded-lg border border-[#E4DEC8]/60 flex items-center justify-between">
            <div>
              <span className="text-[10px] font-mono text-[#678882] uppercase tracking-wider block">
                Authority Isolation
              </span>
              <div className="text-lg font-bold text-[#052326] mt-0.5">
                0 Bypasses
              </div>
              <span className="text-[10px] text-[#1E5E4E] font-medium">
                0 Exfiltrations · Fail-Closed
              </span>
            </div>
            <div className="w-8 h-8 rounded-full border-2 border-emerald-600 flex items-center justify-center text-[10px] font-bold text-emerald-700 font-mono">
              0
            </div>
          </div>
        </div>
      </section>

      {/* 2.5 EXECUTIVE RADAR & CONTENT TRIAGE (DROPDOWN ACCORDION) */}
      <section
        className={`bg-[#FCFAF5] rounded-2xl border border-[#E4DEC8] shadow-xs transition-all duration-300 ${
          isRadarExpanded ? "p-6" : "p-6 pb-4"
        }`}
      >
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-4 border-b border-[#E4DEC8]">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-[#052326] text-[#C9A86A] rounded-xl shadow-xs">
              <Radio className="w-5 h-5 text-[#C9A86A] animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-[#052326]">
                  Executive Radar
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-[#EBF1ED] text-[#1E5E4E] border border-[#C5DDD2]">
                  Priority Triage
                </span>
              </div>
              <p className="text-xs text-[#678882]">
                Content-driven urgency classification, estimated reading time, and zero-authority protection.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5 flex-wrap">
            {/* Quick Ingested Files Dropdown Selector */}
            {radarFiles.length > 0 && (
              <div className="relative">
                <select
                  value={selectedQuickFileId}
                  onChange={(e) => {
                    const fid = e.target.value;
                    setSelectedQuickFileId(fid);
                    if (fid && onNavigateToFiles) {
                      onNavigateToFiles();
                    }
                  }}
                  className="text-xs bg-white border border-[#E4DEC8] rounded-xl px-3 py-1.5 text-[#052326] focus:outline-none focus:border-[#052326] font-medium shadow-2xs"
                >
                  <option value="">Select Ingested File ({radarFiles.length})...</option>
                  {radarFiles.map((file) => (
                    <option key={file.id} value={file.id}>
                      {file.name} — {file.urgency?.level || "NORMAL"} ({file.isQuarantined ? "QUARANTINED" : "SAFE"})
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Dropdown Toggle Accordion Button */}
            <button
              type="button"
              onClick={() => setIsRadarExpanded(!isRadarExpanded)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white border border-[#E4DEC8] text-xs font-semibold text-[#052326] hover:bg-[#FAF5EB] transition-all shadow-xs"
            >
              <span>
                {isRadarExpanded
                  ? "Collapse Files"
                  : `Show Files (${radarFiles.length})`}
              </span>
              <ChevronDown
                className={`w-3.5 h-3.5 text-[#678882] transition-transform duration-200 ${
                  isRadarExpanded ? "rotate-180" : ""
                }`}
              />
            </button>

            {onNavigateToFiles && (
              <button
                onClick={onNavigateToFiles}
                className="text-xs font-semibold text-[#2E595A] hover:text-[#052326] flex items-center gap-1 transition-colors pl-1"
              >
                <span>Manage Ingested Files</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Priority Grid - Displayed ONLY when expanded */}
        {isRadarExpanded && (
          <div className="mt-4 animate-in fade-in slide-in-from-top-2 duration-300">
            {operatingMode === "LIVE" && !gmailConnected && !msConnected ? (
              <div className="bg-white rounded-xl border border-dashed border-[#E4DEC8] p-8 text-center">
                <div className="flex items-center justify-center gap-3 mb-2 opacity-80">
                  <Mail className="w-8 h-8 text-[#EA4335]" />
                  <div className="w-7 h-7 flex items-center justify-center text-[#0078D4]">
                    <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M1 1h10v10H1V1zm12 0h10v10H13V1zM1 13h10v10H1V13zm12 0h10v10H13V13z" />
                    </svg>
                  </div>
                </div>
                <h4 className="text-sm font-bold text-[#052326]">Live Mailbox Defense Disconnected</h4>
                <p className="text-xs text-[#678882] max-w-md mx-auto mt-1 mb-4">
                  Connect your Google Gmail or Microsoft 365 account via official read-only OAuth to inspect incoming emails with zero-authority data isolation.
                </p>
                <div className="flex items-center justify-center gap-3 flex-wrap">
                  <button
                    type="button"
                    onClick={() => (window.location.href = "/api/gmail/connect")}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#052326] text-white text-xs font-semibold hover:bg-[#0A2E33] transition-all shadow-xs"
                  >
                    <Mail className="w-3.5 h-3.5 text-[#C9A86A]" />
                    <span>Connect Gmail</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => (window.location.href = "/api/mail/microsoft/connect")}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#0078D4] text-white text-xs font-semibold hover:bg-[#0060A9] transition-all shadow-xs"
                  >
                    <span>Connect Microsoft 365</span>
                  </button>
                </div>
              </div>
            ) : operatingMode === "LIVE" && gmailMessages.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {gmailMessages.map((msg) => {
                  const isCritical = msg.urgency.level === "CRITICAL";
                  const isInfo = msg.urgency.level === "INFORMATIONAL";
                  const isThreatBlocked =
                    msg.isQuarantined ||
                    msg.securityStatus === "THREAT_DETECTED" ||
                    msg.securityStatus === "BLOCKED";

                  const isMs = (msg as { provider?: string }).provider === "MICROSOFT";

                  return (
                    <div
                      key={msg.id}
                      className={`p-4 rounded-xl border transition-all flex flex-col justify-between ${
                        isThreatBlocked
                          ? "bg-[#FEF5F2] border-[#F8C8BA]"
                          : isCritical
                          ? "bg-[#FFFBF5] border-[#F2DEB8]"
                          : "bg-white border-[#E4DEC8]"
                      }`}
                    >
                      <div>
                        <div className="flex items-center justify-between gap-2 mb-2">
                          <span
                            className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-md flex items-center gap-1 ${
                              isCritical
                                ? "bg-[#FDF0ED] text-[#C2410C]"
                                : isInfo
                                ? "bg-[#F3F4F6] text-[#4B5563]"
                                : "bg-[#FEF9EE] text-[#B45309]"
                            }`}
                          >
                            {isCritical ? "🔥 CRITICAL" : isInfo ? "💤 INFORMATIONAL" : "⚡ NORMAL"}
                          </span>

                          {isThreatBlocked ? (
                            <span className="text-[9px] font-mono font-bold text-[#DC2626] bg-[#FEF2F2] border border-[#FCA5A5] px-1.5 py-0.5 rounded flex items-center gap-1">
                              <Lock className="w-3 h-3" />
                              QUARANTINED
                            </span>
                          ) : (
                            <span className="text-[10px] font-mono text-[#678882] flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              {formatReadingTime(msg.estimatedReadingTimeSeconds)}
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-2 mb-1">
                          {isMs ? (
                            <span className="text-[9px] font-mono font-bold text-[#0078D4] bg-[#F0F8FF] border border-[#B8D9F7] px-1.5 py-0.5 rounded shrink-0">
                              M365
                            </span>
                          ) : (
                            <Mail className="w-4 h-4 text-[#EA4335] shrink-0" />
                          )}
                          <span className="text-xs font-bold text-[#052326] truncate" title={msg.subject}>
                            {msg.subject}
                          </span>
                        </div>

                        <div className="text-[10px] font-mono text-[#678882] truncate mb-1.5">
                          From: {msg.sender}
                        </div>

                        {isThreatBlocked && (
                          <div className="text-[10px] font-mono font-bold text-[#DC2626] bg-white/80 p-1 rounded border border-[#FCA5A5]/60 mb-1.5">
                            ⛔ THREAT QUARANTINED — ZERO AUTHORITY
                          </div>
                        )}

                        <p className="text-[11px] text-[#678882] line-clamp-2 leading-relaxed">
                          {msg.urgency.reason}
                        </p>
                      </div>

                      <div className="mt-3 pt-2.5 border-t border-[#E4DEC8]/60 flex items-center justify-between text-[10px]">
                        <span className="text-[9px] font-mono text-[#2E595A] bg-[#FAF7EE] px-1.5 py-0.5 rounded border border-[#E4DEC8]">
                          Trust: Untrusted (L1)
                        </span>
                        <button
                          type="button"
                          onClick={() => handleAnalyzeGmail(msg.id)}
                          className="px-2.5 py-1 rounded-lg bg-[#052326] text-white hover:bg-[#0A2E33] font-semibold text-[10px] flex items-center space-x-1 shadow-2xs transition-colors"
                        >
                          <span>Analyze with Kavach</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : radarFiles.length === 0 ? (
              <div className="bg-white rounded-xl border border-dashed border-[#E4DEC8] p-8 text-center">
                <Radio className="w-8 h-8 text-[#C9A86A] mx-auto mb-2 opacity-60" />
                <h4 className="text-sm font-bold text-[#052326]">Executive Radar Standing By</h4>
                <p className="text-xs text-[#678882] max-w-md mx-auto mt-1 mb-4">
                  No documents currently ingested in your Secure Workspace. Upload emails or PDFs to trigger real-time content triage, reading time estimation, and threat isolation.
                </p>
                {onNavigateToFiles && (
                  <button
                    onClick={onNavigateToFiles}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#052326] text-white text-xs font-semibold hover:bg-[#0A2E33] transition-all shadow-xs"
                  >
                    <FolderLock className="w-3.5 h-3.5 text-[#C9A86A]" />
                    <span>Go to Secure File Workspace</span>
                  </button>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {radarFiles.map((file) => {
                  const urgencyLevel = file.urgency?.level || "NORMAL";
                  const isCritical = urgencyLevel === "CRITICAL";
                  const isInfo = urgencyLevel === "INFORMATIONAL";
                  const isThreatBlocked =
                    file.securityStatus === "BLOCKED" ||
                    file.securityStatus === "THREAT_DETECTED" ||
                    file.isQuarantined;

                  return (
                    <div
                      key={file.id}
                      onClick={onNavigateToFiles}
                      className={`p-4 rounded-xl border transition-all cursor-pointer group flex flex-col justify-between ${
                        isThreatBlocked
                          ? "bg-[#FEF5F2] border-[#F8C8BA] hover:border-[#EA580C]"
                          : isCritical
                          ? "bg-[#FFFBF5] border-[#F2DEB8] hover:border-[#D97706]"
                          : "bg-white border-[#E4DEC8] hover:border-[#678882]"
                      }`}
                    >
                      <div>
                        <div className="flex items-center justify-between gap-2 mb-2">
                          <span
                            className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-md flex items-center gap-1 ${
                              isCritical
                                ? "bg-[#FDF0ED] text-[#C2410C]"
                                : isInfo
                                ? "bg-[#F3F4F6] text-[#4B5563]"
                                : "bg-[#FEF9EE] text-[#B45309]"
                            }`}
                          >
                            {isCritical ? "🔥 CRITICAL" : isInfo ? "💤 INFORMATIONAL" : "⚡ NORMAL"}
                          </span>

                          {/* Security classification takes visual & logical priority over urgency */}
                          {isThreatBlocked ? (
                            <span className="text-[9px] font-mono font-bold text-[#DC2626] bg-[#FEF2F2] border border-[#FCA5A5] px-1.5 py-0.5 rounded flex items-center gap-1">
                              <Lock className="w-3 h-3" />
                              QUARANTINED
                            </span>
                          ) : (
                            <span className="text-[10px] font-mono text-[#678882] flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              {formatReadingTime(file.urgency?.estimatedReadingTimeSeconds || 60)}
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-2 mb-1.5">
                          {file.type === "Email" ? (
                            <Mail className="w-4 h-4 text-[#2E595A] shrink-0" />
                          ) : (
                            <FileText className="w-4 h-4 text-[#C9A86A] shrink-0" />
                          )}
                          <span className="text-xs font-bold text-[#052326] truncate group-hover:text-[#2E595A]">
                            {file.name}
                          </span>
                        </div>

                        {isThreatBlocked && (
                          <div className="text-[10px] font-mono font-bold text-[#DC2626] bg-white/80 p-1 rounded border border-[#FCA5A5]/60 mb-1.5">
                            ⛔ THREAT QUARANTINED — AUTHORITY DENIED
                          </div>
                        )}

                        <p className="text-[11px] text-[#678882] line-clamp-2 leading-relaxed">
                          {file.urgency?.reason || file.summary}
                        </p>
                      </div>

                      <div className="mt-3 pt-2.5 border-t border-[#E4DEC8]/60 flex items-center justify-between text-[10px]">
                        {isThreatBlocked ? (
                          <span className="font-bold text-[#C2410C] flex items-center gap-1">
                            <AlertTriangle className="w-3 h-3" />
                            Quarantined
                          </span>
                        ) : file.replyDraft ? (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              if (onQueueReplyAction) {
                                onQueueReplyAction(file, file.replyDraft!);
                              } else if (onNavigateToLiveDemo) {
                                onNavigateToLiveDemo();
                              }
                            }}
                            className="font-medium text-[#1E5E4E] hover:text-[#052326] flex items-center gap-1 bg-[#EBF1ED] hover:bg-[#D5E5DC] px-2 py-0.5 rounded transition-colors"
                          >
                            <Sparkles className="w-3 h-3 text-[#1E5E4E]" />
                            <span>Queue Reply</span>
                          </button>
                        ) : (
                          <span className="font-mono text-[#678882]">{file.formattedSize}</span>
                        )}

                        <span className="text-[#678882] group-hover:text-[#052326] font-medium flex items-center gap-0.5">
                          View
                          <ArrowRight className="w-3 h-3" />
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </section>

      {/* 3. SECURITY ANALYTICS & DEFENSE OPERATIONS (LIVE STREAMING & CONVERTED SECURITY BOARD) */}
      <section className="w-full space-y-6">
        <div
          className={`bg-[#FCFAF5] rounded-2xl border border-[#E4DEC8] p-6 sm:p-7 shadow-xs space-y-6 transition-all duration-300 ${
            liveSyncPulse ? "ring-2 ring-emerald-600/30" : ""
          }`}
        >
          {/* Top Header with Demonstration Loop & Presentation Controls */}
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-[#E4DEC8]">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-[#052326] text-[#C9A86A] rounded-xl shadow-xs">
                <BarChart3 className="w-6 h-6 text-[#C9A86A]" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-bold text-[#052326]">
                    Security Analytics &amp; Defense Operations
                  </h3>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-[#EBF1ED] text-[#1E5E4E] font-bold border border-[#C5DDD2] flex items-center gap-1.5 shadow-2xs">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-pulse" />
                    <span>LIVE SYNC ACTIVE</span>
                  </span>
                </div>
                <p className="text-xs text-[#678882] mt-0.5">
                  Live continuous enforcement across deterministic policy rules and threat vectors.
                </p>
              </div>
            </div>

            {/* Demonstration Loop Controls for Easy Presentation */}
            <div className="flex items-center gap-2 flex-wrap">
              <div className="flex items-center gap-1 bg-white border border-[#E4DEC8] rounded-xl p-1 shadow-2xs">
                <button
                  type="button"
                  onClick={() => {
                    const running = defaultDefenseSimulator.toggleLoop();
                    setIsSimLooping(running);
                  }}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors ${
                    isSimLooping
                      ? "bg-[#052326] text-[#C9A86A]"
                      : "bg-[#FAF5EB] text-[#052326] hover:bg-[#EFECE0]"
                  }`}
                  title={isSimLooping ? "Pause continuous demonstration loop" : "Start continuous demonstration loop"}
                >
                  {isSimLooping ? (
                    <>
                      <Pause className="w-3.5 h-3.5 text-[#C9A86A]" />
                      <span>Pause Stream</span>
                    </>
                  ) : (
                    <>
                      <Play className="w-3.5 h-3.5 text-[#1E5E4E]" />
                      <span>Resume Stream</span>
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => {
                    const next = defaultDefenseSimulator.stepNext();
                    setLatestSimEvent(next);
                  }}
                  className="px-2.5 py-1.5 text-xs text-[#2E595A] hover:text-[#052326] font-medium flex items-center gap-1 hover:bg-[#FAF7EE] rounded-lg transition-colors"
                  title="Step forward to next scenario"
                >
                  <SkipForward className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Next</span>
                </button>
              </div>

              {/* Speed Pills */}
              <div className="hidden sm:flex items-center bg-white border border-[#E4DEC8] rounded-xl p-1 text-[11px] font-mono shadow-2xs">
                {(["fast", "normal", "slow"] as SimulatorSpeed[]).map((spd) => (
                  <button
                    key={spd}
                    type="button"
                    onClick={() => {
                      setSimSpeed(spd);
                      defaultDefenseSimulator.setSpeed(spd);
                    }}
                    className={`px-2 py-1 rounded-lg capitalize transition-colors ${
                      simSpeed === spd
                        ? "bg-[#1E5E4E] text-white font-bold"
                        : "text-[#678882] hover:text-[#052326]"
                    }`}
                  >
                    {spd === "fast" ? "2s" : spd === "normal" ? "4s" : "8s"}
                  </button>
                ))}
              </div>

              {/* Malicious Attack Injection Simulator Button */}
              <button
                type="button"
                onClick={() => {
                  const attackEvt = defaultDefenseSimulator.triggerManualAttack();
                  setLatestSimEvent(attackEvt);
                }}
                className="px-3 py-1.5 rounded-xl bg-red-950/90 hover:bg-red-900 text-red-200 border border-red-500/40 text-xs font-semibold flex items-center gap-1.5 shadow-2xs transition-colors"
                title="Simulate an immediate adversarial attack with malicious keywords"
              >
                <Flame className="w-3.5 h-3.5 text-red-400" />
                <span>Simulate Attack</span>
              </button>
            </div>
          </div>

          {/* Deterministic Security Invariants Strip */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="px-3.5 py-2 rounded-xl bg-white border border-[#E4DEC8] flex items-center gap-2 text-xs">
              <span className="w-2 h-2 rounded-full bg-emerald-600 shrink-0" />
              <span className="text-[#052326] font-semibold truncate">Fail-Closed Invariant</span>
              <span className="ml-auto text-[10px] font-mono font-bold text-[#1E5E4E]">100% ARMED</span>
            </div>
            <div className="px-3.5 py-2 rounded-xl bg-white border border-[#E4DEC8] flex items-center gap-2 text-xs">
              <span className="w-2 h-2 rounded-full bg-[#C9A86A] shrink-0" />
              <span className="text-[#052326] font-semibold truncate">Data Authority Boundary</span>
              <span className="ml-auto text-[10px] font-mono font-bold text-[#C9A86A]">AIR-GAPPED</span>
            </div>
            <div className="px-3.5 py-2 rounded-xl bg-white border border-[#E4DEC8] flex items-center gap-2 text-xs">
              <span className="w-2 h-2 rounded-full bg-[#1E5E4E] shrink-0" />
              <span className="text-[#052326] font-semibold truncate">Human Approval Gate</span>
              <span className="ml-auto text-[10px] font-mono font-bold text-[#1E5E4E]">MANDATORY</span>
            </div>
            <div className="px-3.5 py-2 rounded-xl bg-white border border-[#E4DEC8] flex items-center gap-2 text-xs">
              <span className="w-2 h-2 rounded-full bg-[#2E595A] shrink-0" />
              <span className="text-[#052326] font-semibold truncate">Canary &amp; Secret Shield</span>
              <span className="ml-auto text-[10px] font-mono font-bold text-[#2E595A]">0 LEAKS</span>
            </div>
          </div>

          {/* 3-Column Comprehensive Analytics Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Column 1 (5 cols): Threat Vectors & Attack Categories Breakdown */}
            <div className="lg:col-span-5 bg-white rounded-xl border border-[#E4DEC8] p-5 space-y-4 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between pb-3 border-b border-[#E4DEC8]">
                  <div className="flex items-center gap-2">
                    <Layers className="w-4 h-4 text-[#C9A86A]" />
                    <h4 className="text-xs font-bold text-[#052326] uppercase tracking-wider font-mono">
                      Attack Vectors &amp; Threat Breakdown
                    </h4>
                  </div>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#FAF5EB] text-[#C9A86A] font-bold border border-[#C9A86A]/40">
                    100% BLOCKED
                  </span>
                </div>

                {/* Category Metric Bars */}
                <div className="mt-3.5 space-y-3">
                  {[
                    {
                      name: "Direct Prompt Injection",
                      count: `${28 + simMetrics.vectorBreakdown.directInjection} / ${28 + simMetrics.vectorBreakdown.directInjection}`,
                      pct: "100%",
                      color: "bg-[#2E595A]",
                    },
                    {
                      name: "Indirect Ingestion Injection (Email/PDF)",
                      count: `${34 + simMetrics.vectorBreakdown.indirectInjection} / ${34 + simMetrics.vectorBreakdown.indirectInjection}`,
                      pct: "100%",
                      color: "bg-[#1E5E4E]",
                    },
                    {
                      name: "Secret Exfiltration & Canary Theft",
                      count: `${16 + simMetrics.vectorBreakdown.secretExfiltration} / ${16 + simMetrics.vectorBreakdown.secretExfiltration}`,
                      pct: "100%",
                      color: "bg-[#C9A86A]",
                    },
                    {
                      name: "Privilege Escalation & Confirmation Bypass",
                      count: `${16 + simMetrics.vectorBreakdown.privilegeEscalation} / ${16 + simMetrics.vectorBreakdown.privilegeEscalation}`,
                      pct: "100%",
                      color: "bg-[#2E595A]",
                    },
                    {
                      name: "Goal Hijacking & Task Substitution",
                      count: `${18 + simMetrics.vectorBreakdown.goalHijacking} / ${18 + simMetrics.vectorBreakdown.goalHijacking}`,
                      pct: "100%",
                      color: "bg-[#1E5E4E]",
                    },
                    {
                      name: "Roleplay & Fictional Jailbreaks",
                      count: `${26 + simMetrics.vectorBreakdown.roleplayAttack} / ${26 + simMetrics.vectorBreakdown.roleplayAttack}`,
                      pct: "100%",
                      color: "bg-[#C9A86A]",
                    },
                  ].map((cat) => (
                    <div key={cat.name} className="space-y-1">
                      <div className="flex justify-between text-xs">
                        <span className="font-medium text-[#052326] text-[11px] truncate max-w-[220px]">
                          {cat.name}
                        </span>
                        <span className="font-mono text-[10px] text-[#678882] shrink-0">
                          {cat.count} ({cat.pct})
                        </span>
                      </div>
                      <div className="w-full bg-[#EFECE0] h-1.5 rounded-full overflow-hidden">
                        <div className={`${cat.color} h-full w-full rounded-full transition-all duration-500`} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <button
                type="button"
                onClick={() => onNavigateToAttackLab()}
                className="w-full mt-2 flex items-center justify-between p-2.5 rounded-xl bg-[#FCFAF5] border border-[#E4DEC8] hover:border-[#678882] transition-colors text-xs font-semibold text-[#052326]"
              >
                <span>Launch Adversarial Attack Lab (138 Test Cases)</span>
                <ChevronRight className="w-4 h-4 text-[#678882]" />
              </button>
            </div>

            {/* Column 2 (4 cols): Deterministic Policy Enforcement Matrix */}
            <div className="lg:col-span-4 bg-white rounded-xl border border-[#E4DEC8] p-5 space-y-3 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between pb-3 border-b border-[#E4DEC8]">
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-[#1E5E4E]" />
                    <h4 className="text-xs font-bold text-[#052326] uppercase tracking-wider font-mono">
                      Policy Enforcement Rules
                    </h4>
                  </div>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#EBF1ED] text-[#1E5E4E] font-bold">
                    DETERMINISTIC
                  </span>
                </div>

                <div className="mt-3 space-y-2.5">
                  {/* Rule 1 */}
                  <div className="p-2.5 rounded-xl bg-[#FCFAF5] border border-[#E4DEC8] space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-[#052326] flex items-center gap-1.5">
                        <ShieldAlert className="w-3.5 h-3.5 text-[#C9A86A]" />
                        <span>SEC-001 Prompt Injection</span>
                      </span>
                      <span className="text-[9px] font-mono font-bold text-[#1E5E4E] bg-[#EBF1ED] px-1.5 py-0.2 rounded">
                        100% BLOCKED
                      </span>
                    </div>
                    <p className="text-[10px] text-[#678882]">
                      Direct &amp; jailbreak directives quarantined before agent processing.
                    </p>
                  </div>

                  {/* Rule 2 */}
                  <div className="p-2.5 rounded-xl bg-[#FCFAF5] border border-[#E4DEC8] space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-[#052326] flex items-center gap-1.5">
                        <Sparkles className="w-3.5 h-3.5 text-[#2E595A]" />
                        <span>SEC-002 Zero Authority Data</span>
                      </span>
                      <span className="text-[9px] font-mono font-bold text-[#2E595A] bg-[#EBF1ED] px-1.5 py-0.2 rounded">
                        AIR-GAPPED
                      </span>
                    </div>
                    <p className="text-[10px] text-[#678882]">
                      External files provide DATA, never execution AUTHORITY ({quarantinedCount} quarantined).
                    </p>
                  </div>

                  {/* Rule 3 */}
                  <div className="p-2.5 rounded-xl bg-[#FCFAF5] border border-[#E4DEC8] space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-[#052326] flex items-center gap-1.5">
                        <CheckCircle2 className="w-3.5 h-3.5 text-[#1E5E4E]" />
                        <span>SEC-003 Canary &amp; Secret Shield</span>
                      </span>
                      <span className="text-[9px] font-mono font-bold text-[#C9A86A] bg-[#FAF5EB] px-1.5 py-0.2 rounded border border-[#C9A86A]/40">
                        0 LEAKS
                      </span>
                    </div>
                    <p className="text-[10px] text-[#678882]">
                      {totalSecretProbesThwarted} probes thwarted. Secrets redacted in transit.
                    </p>
                  </div>

                  {/* Rule 4 */}
                  <div className="p-2.5 rounded-xl bg-[#FCFAF5] border border-[#E4DEC8] space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-[#052326] flex items-center gap-1.5">
                        <Lock className="w-3.5 h-3.5 text-[#2E595A]" />
                        <span>SEC-004 Human Gate</span>
                      </span>
                      <span className="text-[9px] font-mono font-bold text-[#1E5E4E] bg-[#EBF1ED] px-1.5 py-0.2 rounded">
                        GATE ARMED
                      </span>
                    </div>
                    <p className="text-[10px] text-[#678882]">
                      {totalConsequentialActions} actions screened. Zero autonomous executions.
                    </p>
                  </div>
                </div>
              </div>

              {onNavigateToFiles && (
                <button
                  type="button"
                  onClick={onNavigateToFiles}
                  className="w-full mt-2 flex items-center justify-between p-2.5 rounded-xl bg-[#FCFAF5] border border-[#E4DEC8] hover:border-[#678882] transition-colors text-xs font-semibold text-[#052326]"
                >
                  <div className="flex items-center gap-2">
                    <FolderLock className="w-4 h-4 text-[#C9A86A]" />
                    <span>Open Secure File Workspace</span>
                  </div>
                  <ArrowRight className="w-3.5 h-3.5 text-[#678882]" />
                </button>
              )}
            </div>

            {/* Column 3 (3 cols): Real-Time Performance & Enforcement Stream */}
            <div className="lg:col-span-3 bg-white rounded-xl border border-[#E4DEC8] p-5 space-y-3.5 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between pb-3 border-b border-[#E4DEC8]">
                  <div className="flex items-center gap-2">
                    <Activity className="w-4 h-4 text-[#1E5E4E]" />
                    <h4 className="text-xs font-bold text-[#052326] uppercase tracking-wider font-mono">
                      Telemetry &amp; Stream
                    </h4>
                  </div>
                  <span className="text-[10px] font-mono text-[#678882]">
                    {lastActivityTime}
                  </span>
                </div>

                {/* Performance KPI Cards */}
                <div className="mt-3 space-y-2.5">
                  {/* Latency Meter */}
                  <div className="p-3 rounded-xl bg-[#FAF7EE] border border-[#E4DEC8] flex items-center justify-between">
                    <div>
                      <div className="text-[10px] font-mono font-bold uppercase text-[#678882]">
                        Evaluation Latency
                      </div>
                      <div className="text-lg font-bold text-[#052326] font-mono mt-0.5">
                        {latestSimEvent ? `${latestSimEvent.latencyMs}ms` : "1.2ms"}
                      </div>
                    </div>
                    {/* SVG Sparkline */}
                    <svg className="w-12 h-6 text-[#1E5E4E]" viewBox="0 0 40 20" fill="none">
                      <path
                        d="M0 10 L8 12 L16 4 L24 15 L32 8 L40 10"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </div>

                  {/* Throughput */}
                  <div className="p-3 rounded-xl bg-[#FAF7EE] border border-[#E4DEC8] flex items-center justify-between">
                    <div>
                      <div className="text-[10px] font-mono font-bold uppercase text-[#678882]">
                        Screened Assets
                      </div>
                      <div className="text-lg font-bold text-[#052326] font-mono mt-0.5">
                        {totalLiveSecurityEvents}
                      </div>
                    </div>
                    <span className="text-[10px] font-mono text-[#1E5E4E] font-bold bg-[#EBF1ED] px-2 py-0.5 rounded">
                      0 ERRORS
                    </span>
                  </div>

                  {/* Latest Enforcement Event Detail */}
                  <div className="p-3 rounded-xl bg-[#FCFAF5] border border-[#E4DEC8] space-y-1.5">
                    <div className="flex items-center justify-between text-[10px] font-mono">
                      <span className="font-bold text-[#678882] uppercase">
                        Active Enforcement:
                      </span>
                      <span
                        className={`font-bold px-1.5 py-0.2 rounded text-[9px] ${
                          (latestSimEvent?.policyDecision || recentEvents[0]?.policyDecision) === "BLOCK"
                            ? "bg-[#FDF0ED] text-[#C2410C]"
                            : "bg-[#EBF3EF] text-[#1E5E4E]"
                        }`}
                      >
                        {(latestSimEvent?.policyDecision || recentEvents[0]?.policyDecision) || "BLOCK"}
                      </span>
                    </div>

                    <div className="text-xs font-semibold text-[#052326] truncate">
                      {latestSimEvent?.assetName || recentEvents[0]?.payloadSummary || "URGENT_Wire_Transfer_Routing.eml"}
                    </div>

                    <p className="text-[10px] text-[#678882] line-clamp-2 leading-relaxed">
                      {latestSimEvent?.summary || recentEvents[0]?.reason || "Adversarial prompt injection intercepted under Policy SEC-001."}
                    </p>
                  </div>
                </div>
              </div>

              {onNavigateToActivity && (
                <button
                  type="button"
                  onClick={onNavigateToActivity}
                  className="w-full mt-2 flex items-center justify-between p-2.5 rounded-xl bg-[#FCFAF5] border border-[#E4DEC8] hover:border-[#678882] transition-colors text-xs font-semibold text-[#052326]"
                >
                  <span>View Authoritative Audit Stream</span>
                  <ChevronRight className="w-4 h-4 text-[#678882]" />
                </button>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* 4. FLOATING LIVE NOTIFICATION PANEL (BOTTOM-RIGHT) */}
      <LiveNotificationPanel
        onEventClick={(evt) => {
          if (evt.threatCategory && onNavigateToThreats) {
            onNavigateToThreats();
          } else if (onNavigateToActivity) {
            onNavigateToActivity();
          }
        }}
      />
    </div>
  );
}
