"use client";

import React, { useState, useEffect } from "react";
import {
  ShieldAlert,
  ShieldCheck,
  Play,
  Pause,
  SkipForward,
  Flame,
  ChevronDown,
  ChevronUp,
  X,
  Radio,
  FileText,
  Mail,
} from "lucide-react";
import {
  defaultDefenseSimulator,
  SimulatedSecurityEvent,
  SimulatorSpeed,
} from "@/lib/simulation/defense-simulator";

interface LiveNotificationPanelProps {
  onEventClick?: (event: SimulatedSecurityEvent) => void;
}

export function LiveNotificationPanel({ onEventClick }: LiveNotificationPanelProps) {
  const [notifications, setNotifications] = useState<SimulatedSecurityEvent[]>([]);
  const [isLooping, setIsLooping] = useState<boolean>(true);
  const [speed, setSpeed] = useState<SimulatorSpeed>("normal");
  const [isMinimized, setIsMinimized] = useState<boolean>(false);
  const [highlightPulse, setHighlightPulse] = useState<boolean>(false);

  useEffect(() => {
    // Start automated demonstration loop on mount for smooth presentations
    defaultDefenseSimulator.startLoop(speed);
    setIsLooping(true);

    // Initial seed from simulator recent history
    const initialEvents = defaultDefenseSimulator.getRecentHistory(3);
    if (initialEvents.length > 0) {
      setNotifications(initialEvents);
    } else {
      // Trigger one initial step to populate immediately
      const first = defaultDefenseSimulator.stepNext();
      setNotifications([first]);
    }

    // Subscribe to real-time events streamed from the simulator
    const unsubscribe = defaultDefenseSimulator.subscribe((newEvent) => {
      setNotifications((prev) => [newEvent, ...prev.slice(0, 3)]);
      setHighlightPulse(true);
      setTimeout(() => setHighlightPulse(false), 900);
    });

    return () => {
      unsubscribe();
      defaultDefenseSimulator.pauseLoop();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleToggleLoop = () => {
    const running = defaultDefenseSimulator.toggleLoop();
    setIsLooping(running);
  };

  const handleStepNext = () => {
    const nextEvt = defaultDefenseSimulator.stepNext();
    setNotifications((prev) => [nextEvt, ...prev.slice(0, 3)]);
  };

  const handleTriggerAttack = () => {
    const attackEvt = defaultDefenseSimulator.triggerManualAttack();
    setNotifications((prev) => [attackEvt, ...prev.slice(0, 3)]);
  };

  const handleSpeedChange = (newSpeed: SimulatorSpeed) => {
    setSpeed(newSpeed);
    defaultDefenseSimulator.setSpeed(newSpeed);
  };

  const handleDismissNotification = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  };

  if (isMinimized) {
    return (
      <aside
        aria-label="Kavach Live Defense Monitor Minimized"
        className="fixed bottom-6 right-6 z-50 animate-in fade-in slide-in-from-bottom-4 duration-300"
      >
        <button
          onClick={() => setIsMinimized(false)}
          className="bg-[#052326] text-white border border-[#C9A86A] px-4 py-2.5 rounded-full shadow-2xl flex items-center gap-2.5 hover:bg-[#0A2E33] transition-all group"
        >
          <span className="relative flex h-2.5 w-2.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500" />
          </span>
          <span className="text-xs font-mono font-bold tracking-wider text-[#C9A86A]">
            LIVE DEFENSE MONITOR
          </span>
          <span className="text-[10px] font-mono bg-[#1E5E4E] px-2 py-0.5 rounded-full text-white">
            {notifications.length} Alerts
          </span>
          <ChevronUp className="w-4 h-4 text-[#C9A86A] group-hover:-translate-y-0.5 transition-transform" />
        </button>
      </aside>
    );
  }

  return (
    <aside
      aria-label="Kavach Live Defense Monitor"
      className={`fixed bottom-6 right-6 z-50 w-84 sm:w-96 max-w-[calc(100vw-2rem)] transition-all duration-300 ${
        highlightPulse ? "scale-[1.01]" : ""
      }`}
    >
      <div className="bg-[#052326]/95 backdrop-blur-md text-white border border-[#C9A86A]/40 shadow-2xl rounded-2xl p-4 overflow-hidden relative">
        {/* Subtle background glow */}
        <div className="absolute top-0 right-0 w-32 h-32 bg-[#C9A86A]/10 rounded-full blur-xl pointer-events-none" />

        {/* Panel Header */}
        <div className="flex items-center justify-between pb-3 border-b border-white/10 relative z-10">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-[#C9A86A]/20 text-[#C9A86A]">
              <Radio className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <h4 className="text-xs font-mono font-bold uppercase tracking-wider text-[#C9A86A]">
                  Live Defense Stream
                </h4>
                <span className="relative flex h-2 w-2">
                  <span
                    className={`animate-ping absolute inline-flex h-full w-full rounded-full ${
                      isLooping ? "bg-emerald-400 opacity-75" : "bg-amber-400 opacity-75"
                    }`}
                  />
                  <span
                    className={`relative inline-flex rounded-full h-2 w-2 ${
                      isLooping ? "bg-emerald-500" : "bg-amber-500"
                    }`}
                  />
                </span>
              </div>
              <p className="text-[10px] text-[#A2B8B5]">
                {isLooping ? "Demo loop streaming data assets" : "Stream paused"}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1">
            <button
              onClick={() => setIsMinimized(true)}
              className="p-1 text-[#A2B8B5] hover:text-white rounded hover:bg-white/10 transition-colors"
              title="Minimize panel"
            >
              <ChevronDown className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Live Notification Stack */}
        <div className="my-3 space-y-2 relative z-10">
          {notifications.length === 0 ? (
            <div className="text-center py-4 text-[11px] text-[#A2B8B5]">
              Listening for security events...
            </div>
          ) : (
            notifications.map((evt) => {
              const isBlocked = evt.policyDecision === "BLOCK";
              return (
                <div
                  key={evt.id}
                  onClick={() => onEventClick && onEventClick(evt)}
                  className={`p-2.5 rounded-xl border text-xs cursor-pointer transition-all duration-300 relative group ${
                    isBlocked
                      ? "bg-[#160B0A]/85 border-[#EF4444]/40 hover:border-[#EF4444]"
                      : "bg-[#0A1A17]/85 border-[#10B981]/40 hover:border-[#10B981]"
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-1.5 min-w-0">
                      {isBlocked ? (
                        <ShieldAlert className="w-4 h-4 text-[#EF4444] shrink-0" />
                      ) : (
                        <ShieldCheck className="w-4 h-4 text-[#10B981] shrink-0" />
                      )}

                      <span
                        className={`text-[9px] font-mono font-bold px-1.5 py-0.2 rounded-full shrink-0 ${
                          isBlocked
                            ? "bg-[#DC2626]/20 text-[#FCA5A5] border border-[#DC2626]/40"
                            : "bg-[#059669]/20 text-[#6EE7B7] border border-[#059669]/40"
                        }`}
                      >
                        {isBlocked ? "⛔ BLOCKED" : "🛡️ VERIFIED SAFE"}
                      </span>

                      <span className="font-semibold text-white truncate text-[11px]">
                        {evt.assetName}
                      </span>
                    </div>

                    <button
                      onClick={(e) => handleDismissNotification(evt.id, e)}
                      className="text-[#A2B8B5] hover:text-white opacity-0 group-hover:opacity-100 transition-opacity p-0.5"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>

                  {/* Malicious keyword or Safe note */}
                  <div className="mt-1.5 flex items-center justify-between text-[10px]">
                    {isBlocked ? (
                      <span className="text-[#FCA5A5] font-mono truncate max-w-[200px]">
                        {evt.matchedKeywords.length > 0
                          ? `Keyword: "${evt.matchedKeywords[0]}"`
                          : evt.threatCategory}
                      </span>
                    ) : (
                      <span className="text-[#6EE7B7] font-mono">
                        Air-gapped Data · 0 Authority
                      </span>
                    )}

                    <span className="text-[9px] font-mono text-[#A2B8B5]">
                      {evt.policyRule.split(" ")[0]}
                    </span>
                  </div>

                  {/* Action Taken strip */}
                  <div className="mt-1 pt-1 border-t border-white/5 flex items-center justify-between text-[9px] text-[#A2B8B5]">
                    <span className="flex items-center gap-1">
                      {evt.assetType === "Email" ? (
                        <Mail className="w-3 h-3" />
                      ) : (
                        <FileText className="w-3 h-3" />
                      )}
                      <span>
                        {isBlocked ? "QUARANTINED (0 Tools Executed)" : "SAFE DATA INGESTED"}
                      </span>
                    </span>
                    <span className="font-mono">{evt.latencyMs}ms</span>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Demonstration Loop Controls */}
        <div className="pt-2 border-t border-white/10 flex items-center justify-between gap-1 text-[10px] relative z-10">
          <div className="flex items-center gap-1">
            <button
              onClick={handleToggleLoop}
              className={`p-1.5 rounded-lg flex items-center gap-1 text-[10px] font-semibold transition-colors ${
                isLooping
                  ? "bg-[#C9A86A] text-[#052326] hover:bg-[#D8BA80]"
                  : "bg-white/10 text-white hover:bg-white/20"
              }`}
              title={isLooping ? "Pause demonstration loop" : "Resume demonstration loop"}
            >
              {isLooping ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3" />}
              <span>{isLooping ? "Pause" : "Play"}</span>
            </button>

            <button
              onClick={handleStepNext}
              className="p-1.5 rounded-lg bg-white/10 text-white hover:bg-white/20 transition-colors flex items-center gap-1"
              title="Step forward to next scenario"
            >
              <SkipForward className="w-3 h-3" />
              <span>Next</span>
            </button>
          </div>

          {/* Speed Selector */}
          <div className="flex items-center rounded-lg bg-white/5 p-0.5 border border-white/10 text-[9px] font-mono">
            {(["fast", "normal", "slow"] as SimulatorSpeed[]).map((spd) => (
              <button
                key={spd}
                onClick={() => handleSpeedChange(spd)}
                className={`px-1.5 py-0.5 rounded capitalize transition-colors ${
                  speed === spd
                    ? "bg-[#1E5E4E] text-white font-bold"
                    : "text-[#A2B8B5] hover:text-white"
                }`}
              >
                {spd === "fast" ? "2s" : spd === "normal" ? "4s" : "8s"}
              </button>
            ))}
          </div>

          {/* On-Demand Malicious Attack Simulator Trigger */}
          <button
            onClick={handleTriggerAttack}
            className="p-1.5 rounded-lg bg-red-950/80 hover:bg-red-900 border border-red-500/40 text-red-200 text-[10px] font-semibold flex items-center gap-1 transition-colors"
            title="Inject an adversarial attack with malicious keywords"
          >
            <Flame className="w-3 h-3 text-red-400" />
            <span className="hidden sm:inline">Attack</span>
          </button>
        </div>
      </div>
    </aside>
  );
}
