"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  Bell,
  ShieldCheck,
  User,
  ChevronDown,
  LogOut,
  Sliders,
  Shield,
  ExternalLink,
  Mail,
} from "lucide-react";
import { NavItemKey } from "./Sidebar";
import Link from "next/link";

interface TopBarProps {
  activeKey: NavItemKey;
  recentAlertCount?: number;
  onOpenNotifications?: () => void;
  onNavigateToTab?: (tab: NavItemKey) => void;
}

interface CurrentUser {
  id: string;
  email: string;
  displayName: string;
  profileImage?: string | null;
  role: "USER" | "ADMIN";
}

const PAGE_META: Record<string, { title: string; subtitle: string }> = {
  overview: {
    title: "Overview",
    subtitle: "Real-time security posture and monitoring for your AI agent.",
  },
  "ai-agent": {
    title: "AI Agent",
    subtitle: "Interact securely with Kavach protected by deterministic authority boundaries.",
  },
  "live-agent": {
    title: "AI Agent",
    subtitle: "Interact securely with Kavach protected by deterministic authority boundaries.",
  },
  files: {
    title: "Secure File Workspace",
    subtitle: "Drive-style secure workspace inspecting untrusted emails, PDFs, and documents for prompt injection.",
  },
  "secure-files": {
    title: "Secure File Workspace",
    subtitle: "Drive-style secure workspace inspecting untrusted emails, PDFs, and documents for prompt injection.",
  },
  "files-workspace": {
    title: "Secure File Workspace",
    subtitle: "Drive-style secure workspace inspecting untrusted emails, PDFs, and documents for prompt injection.",
  },
  "threat-center": {
    title: "Threat Center",
    subtitle: "Kavach continuously identifies and blocks attempts to manipulate the AI agent.",
  },
  "threat-detection": {
    title: "Threat Center",
    subtitle: "Kavach continuously identifies and blocks attempts to manipulate the AI agent.",
  },
  "security-activity": {
    title: "Security Activity",
    subtitle: "Chronological activity feed of all agent requests, security checks, and protection events.",
  },
  "security-events": {
    title: "Security Activity",
    subtitle: "Chronological activity feed of all agent requests, security checks, and protection events.",
  },
  "policy-decisions": {
    title: "Policy Decisions",
    subtitle: "Deterministic enforcement of read permissions, side-effects, and human confirmations.",
  },
  "attack-lab": {
    title: "Attack Lab",
    subtitle: "Adversarial testing and security verification against 138 attack vectors.",
  },
  audit: {
    title: "Audit Trail",
    subtitle: "Tamper-evident log of all agent interactions and policy evaluations.",
  },
  "audit-trail": {
    title: "Audit Trail",
    subtitle: "Tamper-evident log of all agent interactions and policy evaluations.",
  },
  "security-trace": {
    title: "Security Forensics",
    subtitle: "Detailed end-to-end request tracing and security forensics.",
  },
  settings: {
    title: "Settings",
    subtitle: "Configure protection policies, notifications, and system diagnostics.",
  },
  admin: {
    title: "Administration",
    subtitle: "Multi-user oversight, system diagnostics, and server health.",
  },
};

export function TopBar({
  activeKey,
  recentAlertCount = 0,
  onOpenNotifications,
  onNavigateToTab,
}: TopBarProps) {
  const meta = PAGE_META[activeKey] || PAGE_META.overview;

  const [user, setUser] = useState<CurrentUser | null>(null);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [showAccountModal, setShowAccountModal] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Fetch session user
  useEffect(() => {
    let isMounted = true;
    async function loadUser() {
      try {
        const res = await fetch("/api/auth/session");
        if (res.ok) {
          const data = await res.json();
          if (isMounted && data.authenticated && data.user) {
            setUser(data.user);
          }
        }
      } catch {
        // Fallback default
      }
    }
    loadUser();
    return () => {
      isMounted = false;
    };
  }, []);

  // Close dropdown on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const handleSignOut = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      window.location.href = "/login";
    } catch {
      window.location.href = "/login";
    }
  };

  return (
    <header className="h-16 bg-[#FAF7EE] border-b border-[#E4DEC8] px-6 sm:px-8 flex items-center justify-between sticky top-0 z-30 shadow-[0_1px_3px_rgba(5,35,38,0.02)]">
      {/* Left: Clean Page Title & Supporting Subtext */}
      <div>
        <h1 className="text-base font-bold text-[#052326] tracking-tight flex items-center space-x-2">
          <span>{meta.title}</span>
        </h1>
        <p className="text-xs text-[#678882] tracking-normal font-normal">
          {meta.subtitle}
        </p>
      </div>

      {/* Right: Protection Status, Agent Online, Alerts, Profile */}
      <div className="flex items-center space-x-3.5">
        {/* Layer 1: Protection Status Indicator */}
        <div className="flex items-center space-x-2 px-3 py-1 rounded-full bg-[#EBF1ED] border border-[#A5B5A9]/50 text-xs text-[#2E595A]">
          <ShieldCheck className="w-3.5 h-3.5 text-[#2E595A]" />
          <span className="font-bold text-[11px] tracking-wide text-[#052326]">
            PROTECTED
          </span>
        </div>

        {/* Layer 1: Agent Status */}
        <div className="hidden sm:flex items-center space-x-1.5 px-3 py-1 rounded-full bg-[#FCFAF5] border border-[#E4DEC8] text-xs text-[#2E595A]">
          <span className="w-2 h-2 rounded-full bg-emerald-600 animate-pulse" />
          <span className="text-[11px] font-medium text-[#2E595A]">
            Agent Online
          </span>
        </div>

        {/* Notifications Icon Button */}
        <button
          onClick={onOpenNotifications}
          className="relative p-2 rounded-lg text-[#678882] hover:text-[#052326] hover:bg-[#EFECE0] transition-colors"
          title="Security Alerts"
        >
          <Bell className="w-4 h-4" />
          {recentAlertCount > 0 && (
            <span className="absolute top-1 right-1 w-2 h-2 bg-[#C9A86A] rounded-full ring-2 ring-white" />
          )}
        </button>

        {/* User Profile Menu */}
        <div className="relative" ref={dropdownRef}>
          <button
            type="button"
            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
            className="flex items-center space-x-2 pl-2 border-l border-[#E4DEC8] hover:opacity-80 transition-opacity focus:outline-none"
          >
            <div className="w-7 h-7 rounded-full bg-[#052326] text-[#C9A86A] flex items-center justify-center text-xs font-semibold overflow-hidden border border-[#C9A86A]/40 shadow-2xs">
              {user?.profileImage ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={user.profileImage}
                  alt={user.displayName}
                  className="w-full h-full object-cover"
                />
              ) : (
                <User className="w-3.5 h-3.5" />
              )}
            </div>
            <div className="hidden md:flex flex-col text-left">
              <span className="text-xs font-semibold text-[#052326] leading-none">
                {user?.displayName || "Security Operator"}
              </span>
              <span className="text-[10px] font-mono text-[#678882] leading-none mt-0.5">
                {user?.role === "ADMIN" ? "Administrator" : "User"}
              </span>
            </div>
            <ChevronDown className="w-3.5 h-3.5 text-[#678882] hidden md:block" />
          </button>

          {/* User Profile Dropdown Menu */}
          {isDropdownOpen && (
            <div className="absolute right-0 mt-2 w-64 rounded-2xl bg-[#FCFAF5] border border-[#E4DEC8] shadow-lg py-2 z-50 animate-in fade-in duration-150 text-xs">
              {/* Profile Header */}
              <div className="px-4 py-3 border-b border-[#E4DEC8]/80">
                <div className="font-bold text-[#052326] truncate">
                  {user?.displayName || "Authenticated User"}
                </div>
                <div className="text-[11px] font-mono text-[#678882] truncate">
                  {user?.email || "user@kavach.defense"}
                </div>
                <div className="mt-1.5 flex items-center space-x-1.5">
                  <span
                    className={`text-[9px] font-mono font-bold px-2 py-0.5 rounded-full ${
                      user?.role === "ADMIN"
                        ? "bg-[#052326] text-[#C9A86A] border border-[#C9A86A]/40"
                        : "bg-[#FAF7EE] text-[#2E595A] border border-[#E4DEC8]"
                    }`}
                  >
                    {user?.role === "ADMIN" ? "ROLE: ADMIN" : "ROLE: USER"}
                  </span>
                  <span className="text-[9px] font-mono text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded">
                    ACTIVE
                  </span>
                </div>
              </div>

              {/* Menu Items */}
              <div className="py-1">
                {/* Account */}
                <button
                  onClick={() => {
                    setIsDropdownOpen(false);
                    setShowAccountModal(true);
                  }}
                  className="w-full text-left px-4 py-2 hover:bg-[#FAF5EB] text-[#2E595A] flex items-center space-x-2 font-medium"
                >
                  <User className="w-3.5 h-3.5 text-[#678882]" />
                  <span>Account</span>
                </button>

                {/* Connected Accounts */}
                <button
                  onClick={() => {
                    setIsDropdownOpen(false);
                    if (onNavigateToTab) onNavigateToTab("settings");
                  }}
                  className="w-full text-left px-4 py-2 hover:bg-[#FAF5EB] text-[#2E595A] flex items-center space-x-2 font-medium"
                >
                  <Mail className="w-3.5 h-3.5 text-[#678882]" />
                  <span>Connected Accounts</span>
                </button>

                {/* Security */}
                <button
                  onClick={() => {
                    setIsDropdownOpen(false);
                    if (onNavigateToTab) onNavigateToTab("settings");
                  }}
                  className="w-full text-left px-4 py-2 hover:bg-[#FAF5EB] text-[#2E595A] flex items-center space-x-2 font-medium"
                >
                  <Shield className="w-3.5 h-3.5 text-[#678882]" />
                  <span>Security & Invariants</span>
                </button>

                {/* Admin Console (Strictly for ADMIN role) */}
                {user?.role === "ADMIN" && (
                  <Link
                    href="/admin"
                    onClick={() => setIsDropdownOpen(false)}
                    className="w-full text-left px-4 py-2 hover:bg-[#052326] hover:text-[#C9A86A] text-[#052326] flex items-center justify-between font-bold border-t border-b border-[#E4DEC8]/60 my-1 bg-[#FAF5EB]"
                  >
                    <div className="flex items-center space-x-2">
                      <Sliders className="w-3.5 h-3.5 text-[#C9A86A]" />
                      <span>Admin Console</span>
                    </div>
                    <ExternalLink className="w-3 h-3 text-[#C9A86A]" />
                  </Link>
                )}
              </div>

              {/* Sign out */}
              <div className="border-t border-[#E4DEC8]/80 pt-1">
                <button
                  onClick={handleSignOut}
                  className="w-full text-left px-4 py-2 hover:bg-[#FEF5F2] text-[#DC2626] flex items-center space-x-2 font-medium"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>Sign out</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Account Modal */}
      {showAccountModal && (
        <div className="fixed inset-0 bg-[#052326]/40 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-[#FCFAF5] rounded-3xl border border-[#E4DEC8] max-w-sm w-full p-6 space-y-4 shadow-xl animate-in fade-in duration-200">
            <div className="flex items-center justify-between border-b border-[#E4DEC8] pb-3">
              <h3 className="text-sm font-bold text-[#052326]">User Profile Identity</h3>
              <button
                onClick={() => setShowAccountModal(false)}
                className="text-xs text-[#678882] hover:text-[#052326]"
              >
                ✕
              </button>
            </div>
            <div className="space-y-2 text-xs">
              <div className="flex justify-between py-1 border-b border-[#E4DEC8]/60">
                <span className="text-[#678882]">Display Name:</span>
                <span className="font-semibold text-[#052326]">{user?.displayName || "—"}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-[#E4DEC8]/60">
                <span className="text-[#678882]">Verified Email:</span>
                <span className="font-mono text-[#052326]">{user?.email || "—"}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-[#E4DEC8]/60">
                <span className="text-[#678882]">User ID:</span>
                <span className="font-mono text-[#678882] text-[10px]">{user?.id || "—"}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-[#E4DEC8]/60">
                <span className="text-[#678882]">Assigned Role:</span>
                <span className="font-mono font-bold text-[#052326]">{user?.role}</span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-[#678882]">Authority Level:</span>
                <span className="text-[#2E595A] font-medium">Standard Human Operator</span>
              </div>
            </div>
            <div className="pt-2">
              <button
                onClick={() => setShowAccountModal(false)}
                className="w-full py-2 rounded-xl bg-[#052326] text-white text-xs font-semibold hover:bg-[#0A2E33]"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
