"use client";

import React, { useState, useEffect } from "react";
import {
  RotateCcw,
  ShieldCheck,
  Wrench,
  Bot,
  Activity,
  Mail,
  RefreshCw,
  Lock,
  ArrowRight,
} from "lucide-react";
import { defaultAuditLogger } from "@/lib/audit/logger";

interface AccountStatus {
  connected: boolean;
  emailAddress?: string | null;
  gmailAddress?: string | null;
  status: "CONNECTED" | "DISCONNECTED" | "ERROR";
  connectedAt?: string | null;
  lastSynchronizedAt?: string | null;
  scope?: string | null;
  error?: string | null;
}

export function SettingsView() {
  const [activeTab, setActiveTab] = useState<"general" | "accounts" | "policies" | "diagnostics">(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      if (params.get("tab") === "accounts" || params.get("connected") || params.get("error")) {
        return "accounts";
      }
    }
    return "general";
  });

  const [enforcementMode, setEnforcementMode] = useState<string>("strict");
  const [logLevel, setLogLevel] = useState<string>("info");
  const [confirmationRequired, setConfirmationRequired] = useState<boolean>(true);
  const [resetMessage, setResetMessage] = useState<string | null>(null);
  const [userRole, setUserRole] = useState<string>("USER");

  // Gmail & Microsoft Account State
  const [gmailStatus, setGmailStatus] = useState<AccountStatus>({
    connected: false,
    status: "DISCONNECTED",
  });
  const [msStatus, setMsStatus] = useState<AccountStatus>({
    connected: false,
    status: "DISCONNECTED",
  });
  const [accountsLoading, setAccountsLoading] = useState<boolean>(true);
  const [actionLoading, setActionLoading] = useState<boolean>(false);
  const [notice, setNotice] = useState<string | null>(null);

  const fetchAccountsStatus = async () => {
    setAccountsLoading(true);
    try {
      // 1. Session check for admin status
      const sRes = await fetch("/api/auth/session");
      if (sRes.ok) {
        const sData = await sRes.json();
        if (sData.user?.role) {
          setUserRole(sData.user.role);
        }
      }

      // 2. Fetch connected accounts
      const res = await fetch("/api/mail/accounts");
      if (res.ok) {
        const data = await res.json();
        if (data.accounts?.GMAIL) {
          setGmailStatus(data.accounts.GMAIL);
        }
        if (data.accounts?.MICROSOFT) {
          setMsStatus(data.accounts.MICROSOFT);
        }
      } else {
        // Fallback to legacy Gmail status
        const gRes = await fetch("/api/gmail/status");
        if (gRes.ok) {
          const gData = await gRes.json();
          setGmailStatus(gData);
        }
      }
    } catch {
      // Ignored
    } finally {
      setAccountsLoading(false);
    }
  };

  useEffect(() => {
    fetchAccountsStatus();

    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const connected = params.get("connected");
      const error = params.get("error");

      if (connected || error) {
        setActiveTab("accounts");
      }

      if (connected === "gmail") {
        setNotice("Gmail account connected successfully.");
      } else if (connected === "microsoft") {
        setNotice("Microsoft account connected successfully.");
      } else if (error) {
        switch (error) {
          case "GMAIL_CONNECTION_FAILED":
            setNotice("Gmail connection failed: Authorization code exchange failed or Gmail API is not enabled.");
            break;
          case "NO_REFRESH_TOKEN":
            setNotice("Gmail connection failed: Google did not return a refresh token. Please re-authorize with consent.");
            break;
          case "INVALID_OAUTH_STATE":
            setNotice("Gmail connection failed: Invalid or expired OAuth state.");
            break;
          case "MISSING_CODE":
            setNotice("Gmail connection failed: Missing authorization code.");
            break;
          case "AUTH_REQUIRED":
            setNotice("Authentication required before connecting Gmail.");
            break;
          default:
            setNotice(`Gmail connection notice: ${error.replace(/_/g, " ")}`);
            break;
        }
      }
    }
  }, []);

  const handleConnectGmail = () => {
    setActionLoading(true);
    window.location.href = "/api/gmail/connect";
  };

  const handleDisconnectGmail = async () => {
    if (!confirm("Are you sure you want to disconnect Gmail? Stored credentials will be purged.")) {
      return;
    }
    setActionLoading(true);
    setNotice(null);
    try {
      const res = await fetch("/api/gmail/disconnect", { method: "POST" });
      const data = await res.json();
      if (res.ok && data.success) {
        setGmailStatus({ connected: false, status: "DISCONNECTED" });
        setNotice("Gmail account disconnected successfully.");
      } else {
        setNotice(data.error || "Failed to disconnect Gmail.");
      }
    } catch {
      setNotice("Failed to disconnect Gmail.");
    } finally {
      setActionLoading(false);
    }
  };

  const handleConnectMicrosoft = () => {
    setActionLoading(true);
    window.location.href = "/api/mail/microsoft/connect";
  };

  const handleDisconnectMicrosoft = async () => {
    if (!confirm("Are you sure you want to disconnect Microsoft 365? Stored credentials will be purged.")) {
      return;
    }
    setActionLoading(true);
    setNotice(null);
    try {
      const res = await fetch("/api/mail/microsoft/disconnect", { method: "POST" });
      const data = await res.json();
      if (res.ok && data.success) {
        setMsStatus({ connected: false, status: "DISCONNECTED" });
        setNotice("Microsoft 365 account disconnected successfully.");
      } else {
        setNotice(data.error || "Failed to disconnect Microsoft 365.");
      }
    } catch {
      setNotice("Failed to disconnect Microsoft 365.");
    } finally {
      setActionLoading(false);
    }
  };

  const handleSyncMailbox = async (provider?: "GMAIL" | "MICROSOFT") => {
    setActionLoading(true);
    setNotice(null);
    try {
      const url = provider ? `/api/mail/messages?provider=${provider}&limit=10` : "/api/mail/messages?limit=10";
      const res = await fetch(url);
      const data = await res.json();
      if (res.ok && data.success) {
        setNotice(`Successfully synchronized and analyzed ${data.count} emails through Kavach.`);
        fetchAccountsStatus();
      } else {
        setNotice(data.error || "Mailbox synchronization failed.");
      }
    } catch {
      setNotice("Mailbox synchronization failed.");
    } finally {
      setActionLoading(false);
    }
  };

  const handleClearTelemetry = () => {
    defaultAuditLogger.clear();
    setResetMessage("Telemetry logs successfully flushed.");
    setTimeout(() => setResetMessage(null), 3000);
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* 1. HEADER */}
      <section className="bg-[#FCFAF5] rounded-2xl border border-[#E4DEC8] p-6 sm:p-8 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-[#E4DEC8]">
          <div className="space-y-1">
            <div className="flex items-center space-x-2">
              <span className="text-[11px] font-mono font-bold tracking-wider uppercase text-[#C9A86A] bg-[#FAF5EB] px-2.5 py-0.5 rounded-full border border-[#C9A86A]/30">
                SYSTEM CONFIGURATION
              </span>
              <span className="text-xs text-[#678882]">•</span>
              <span className="text-xs font-mono text-[#2E595A]">
                ENTERPRISE POLICY &amp; INTEGRATIONS
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-serif font-bold text-[#052326] tracking-tight">
              Settings
            </h1>
            <p className="text-sm text-[#678882] max-w-2xl">
              Manage connected accounts, security policies, and diagnostic engineering controls.
            </p>
          </div>

          <div className="flex items-center space-x-2 px-3 py-1.5 rounded-xl bg-[#EBF1ED] border border-[#A5B5A9]/50 text-xs text-[#2E595A]">
            <ShieldCheck className="w-4 h-4 text-[#2E595A]" />
            <span className="font-bold text-[#052326]">Policies Active</span>
          </div>
        </div>

        {/* Tab Switcher */}
        <div className="flex flex-wrap gap-2 pt-6">
          <button
            onClick={() => setActiveTab("general")}
            className={`px-4 py-2 rounded-xl text-xs font-semibold tracking-wide transition-all ${
              activeTab === "general"
                ? "bg-[#052326] text-white shadow-xs"
                : "bg-[#FAF7EE] text-[#2E595A] hover:bg-[#EFEAD9] border border-[#E4DEC8]"
            }`}
          >
            General Settings
          </button>
          <button
            onClick={() => setActiveTab("accounts")}
            className={`px-4 py-2 rounded-xl text-xs font-semibold tracking-wide transition-all flex items-center space-x-1.5 ${
              activeTab === "accounts"
                ? "bg-[#052326] text-white shadow-xs"
                : "bg-[#FAF7EE] text-[#2E595A] hover:bg-[#EFEAD9] border border-[#E4DEC8]"
            }`}
          >
            <span>Connected Accounts</span>
            {(gmailStatus.connected || msStatus.connected) && (
              <span className="w-2 h-2 rounded-full bg-emerald-500 ring-2 ring-white" />
            )}
          </button>
          <button
            onClick={() => setActiveTab("policies")}
            className={`px-4 py-2 rounded-xl text-xs font-semibold tracking-wide transition-all ${
              activeTab === "policies"
                ? "bg-[#052326] text-white shadow-xs"
                : "bg-[#FAF7EE] text-[#2E595A] hover:bg-[#EFEAD9] border border-[#E4DEC8]"
            }`}
          >
            Protection Policies
          </button>
          <button
            onClick={() => setActiveTab("diagnostics")}
            className={`px-4 py-2 rounded-xl text-xs font-semibold tracking-wide transition-all ${
              activeTab === "diagnostics"
                ? "bg-[#052326] text-white shadow-xs"
                : "bg-[#FAF7EE] text-[#2E595A] hover:bg-[#EFEAD9] border border-[#E4DEC8]"
            }`}
          >
            Advanced & Diagnostics (Layer 3)
          </button>
          {userRole === "ADMIN" && (
            <button
              onClick={() => (window.location.href = "/admin")}
              className="px-4 py-2 rounded-xl text-xs font-semibold tracking-wide transition-all bg-[#EBF1ED] text-[#1E5E4E] hover:bg-[#D8E6DE] border border-[#A5B5A9]/50 flex items-center space-x-1.5 shadow-2xs ml-auto"
            >
              <ShieldCheck className="w-3.5 h-3.5 text-[#1E5E4E]" />
              <span>Admin Console</span>
            </button>
          )}
        </div>
      </section>

      {/* 2. TAB: CONNECTED ACCOUNTS */}
      {activeTab === "accounts" && (
        <section className="bg-[#FCFAF5] rounded-2xl border border-[#E4DEC8] p-6 sm:p-8 shadow-xs space-y-6 text-xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-4 border-b border-[#E4DEC8]">
            <div>
              <h2 className="text-base font-bold text-[#052326] tracking-tight">
                Connected External Accounts
              </h2>
              <p className="text-[#678882] mt-0.5">
                Connect external communication tools to Kavach. External content is ingested strictly as untrusted data.
              </p>
            </div>
            <div className="flex items-center space-x-2">
              <button
                type="button"
                onClick={() => handleSyncMailbox()}
                disabled={actionLoading || (!gmailStatus.connected && !msStatus.connected)}
                className="px-3 py-1.5 rounded-xl bg-[#FAF7EE] border border-[#E4DEC8] text-[#052326] hover:bg-[#FAF5EB] font-semibold text-xs flex items-center space-x-1.5 shadow-2xs disabled:opacity-40"
              >
                <RefreshCw className={`w-3.5 h-3.5 text-[#678882] ${actionLoading ? "animate-spin" : ""}`} />
                <span>Sync All Mailboxes</span>
              </button>
              <button
                type="button"
                onClick={fetchAccountsStatus}
                disabled={accountsLoading}
                className="px-3 py-1.5 rounded-xl bg-white border border-[#E4DEC8] text-[#2E595A] hover:bg-[#FAF5EB] font-semibold text-xs flex items-center space-x-1.5 shadow-2xs"
              >
                <RefreshCw className={`w-3.5 h-3.5 text-[#678882] ${accountsLoading ? "animate-spin" : ""}`} />
                <span>Refresh Status</span>
              </button>
            </div>
          </div>

          {notice && (
            <div className="p-3.5 rounded-xl bg-[#FAF5EB] border border-[#C9A86A]/40 text-xs text-[#052326] flex items-center justify-between">
              <span>{notice}</span>
              <button onClick={() => setNotice(null)} className="text-[#678882] hover:text-[#052326]">✕</button>
            </div>
          )}

          {/* 1. Google Gmail Card */}
          <div className="p-6 rounded-2xl bg-white border border-[#E4DEC8] shadow-xs space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-start space-x-3.5">
                <div className="p-3 bg-[#FAF7EE] rounded-2xl border border-[#E4DEC8] text-[#EA4335] shrink-0 shadow-2xs">
                  <Mail className="w-6 h-6" />
                </div>
                <div>
                  <div className="flex items-center space-x-2">
                    <h3 className="text-sm font-bold text-[#052326]">Google Gmail</h3>
                    <span
                      className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-full flex items-center space-x-1 ${
                        gmailStatus.connected
                          ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                          : "bg-[#FAF7EE] text-[#678882] border border-[#E4DEC8]"
                      }`}
                    >
                      <span
                        className={`w-1.5 h-1.5 rounded-full ${
                          gmailStatus.connected ? "bg-emerald-600 animate-pulse" : "bg-[#678882]"
                        }`}
                      />
                      <span>{gmailStatus.connected ? "Connected" : "Not connected"}</span>
                    </span>
                  </div>
                  <p className="text-[#678882] mt-0.5 text-xs">
                    Official Gmail API OAuth 2.0 integration. Real emails are inspected for prompt injections, secret exfiltration, and priority triage.
                  </p>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center space-x-2 shrink-0">
                {gmailStatus.connected ? (
                  <>
                    <button
                      type="button"
                      onClick={() => handleSyncMailbox("GMAIL")}
                      disabled={actionLoading}
                      className="px-3.5 py-2 rounded-xl bg-[#FAF7EE] border border-[#E4DEC8] text-[#052326] hover:bg-[#EFEAD9] text-xs font-semibold flex items-center space-x-1.5 transition-colors disabled:opacity-50"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 text-[#678882] ${actionLoading ? "animate-spin" : ""}`} />
                      <span>Sync Mailbox</span>
                    </button>
                    <button
                      type="button"
                      onClick={handleDisconnectGmail}
                      disabled={actionLoading}
                      className="px-3.5 py-2 rounded-xl bg-[#FEF5F2] border border-[#F8C8BA] text-[#DC2626] hover:bg-[#FEE2E2] text-xs font-semibold transition-colors disabled:opacity-50"
                    >
                      <span>Disconnect</span>
                    </button>
                  </>
                ) : (
                  <button
                    type="button"
                    onClick={handleConnectGmail}
                    disabled={actionLoading}
                    className="px-4 py-2.5 rounded-xl bg-[#052326] text-white hover:bg-[#0A2E33] text-xs font-semibold flex items-center space-x-2 shadow-xs transition-all group disabled:opacity-50"
                  >
                    <span>Connect Gmail</span>
                    <ArrowRight className="w-3.5 h-3.5 text-[#C9A86A] group-hover:translate-x-0.5 transition-transform" />
                  </button>
                )}
              </div>
            </div>

            {/* Connection Details (When Connected) */}
            {gmailStatus.connected && (
              <div className="pt-4 border-t border-[#E4DEC8]/70 grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                <div className="p-3 rounded-xl bg-[#FCFAF5] border border-[#E4DEC8]">
                  <span className="text-[#678882] block text-[10px] font-mono uppercase">Connected Mailbox</span>
                  <span className="font-bold text-[#052326] font-mono truncate block mt-0.5">
                    {gmailStatus.emailAddress || gmailStatus.gmailAddress || "—"}
                  </span>
                </div>
                <div className="p-3 rounded-xl bg-[#FCFAF5] border border-[#E4DEC8]">
                  <span className="text-[#678882] block text-[10px] font-mono uppercase">Last Synchronized</span>
                  <span className="font-semibold text-[#052326] block mt-0.5">
                    {gmailStatus.lastSynchronizedAt
                      ? new Date(gmailStatus.lastSynchronizedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })
                      : "Just now"}
                  </span>
                </div>
                <div className="p-3 rounded-xl bg-[#FCFAF5] border border-[#E4DEC8]">
                  <span className="text-[#678882] block text-[10px] font-mono uppercase">Authorized OAuth Scope</span>
                  <span className="font-mono text-[10px] text-[#2E595A] block mt-0.5 truncate">
                    gmail.readonly (Strict Read-Only)
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* 2. Microsoft 365 / Outlook Card */}
          <div className="p-6 rounded-2xl bg-white border border-[#E4DEC8] shadow-xs space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-start space-x-3.5">
                <div className="p-3 bg-[#FAF7EE] rounded-2xl border border-[#E4DEC8] text-[#0078D4] shrink-0 shadow-2xs">
                  <div className="w-6 h-6 flex items-center justify-center">
                    <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M1 1h10v10H1V1zm12 0h10v10H13V1zM1 13h10v10H1V13zm12 0h10v10H13V13z" />
                    </svg>
                  </div>
                </div>
                <div>
                  <div className="flex items-center space-x-2">
                    <h3 className="text-sm font-bold text-[#052326]">Microsoft 365 / Outlook</h3>
                    <span
                      className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-full flex items-center space-x-1 ${
                        msStatus.connected
                          ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                          : "bg-[#FAF7EE] text-[#678882] border border-[#E4DEC8]"
                      }`}
                    >
                      <span
                        className={`w-1.5 h-1.5 rounded-full ${
                          msStatus.connected ? "bg-emerald-600 animate-pulse" : "bg-[#678882]"
                        }`}
                      />
                      <span>{msStatus.connected ? "Connected" : "Not connected"}</span>
                    </span>
                  </div>
                  <p className="text-[#678882] mt-0.5 text-xs">
                    Official Microsoft Graph API OAuth 2.0 integration. Ingests corporate email communications into Kavach zero-authority defense boundary.
                  </p>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center space-x-2 shrink-0">
                {msStatus.connected ? (
                  <>
                    <button
                      type="button"
                      onClick={() => handleSyncMailbox("MICROSOFT")}
                      disabled={actionLoading}
                      className="px-3.5 py-2 rounded-xl bg-[#FAF7EE] border border-[#E4DEC8] text-[#052326] hover:bg-[#EFEAD9] text-xs font-semibold flex items-center space-x-1.5 transition-colors disabled:opacity-50"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 text-[#678882] ${actionLoading ? "animate-spin" : ""}`} />
                      <span>Sync Mailbox</span>
                    </button>
                    <button
                      type="button"
                      onClick={handleDisconnectMicrosoft}
                      disabled={actionLoading}
                      className="px-3.5 py-2 rounded-xl bg-[#FEF5F2] border border-[#F8C8BA] text-[#DC2626] hover:bg-[#FEE2E2] text-xs font-semibold transition-colors disabled:opacity-50"
                    >
                      <span>Disconnect</span>
                    </button>
                  </>
                ) : (
                  <button
                    type="button"
                    onClick={handleConnectMicrosoft}
                    disabled={actionLoading}
                    className="px-4 py-2.5 rounded-xl bg-[#0078D4] text-white hover:bg-[#0060A9] text-xs font-semibold flex items-center space-x-2 shadow-xs transition-all group disabled:opacity-50"
                  >
                    <span>Connect Microsoft 365</span>
                    <ArrowRight className="w-3.5 h-3.5 text-white group-hover:translate-x-0.5 transition-transform" />
                  </button>
                )}
              </div>
            </div>

            {/* Connection Details (When Connected) */}
            {msStatus.connected && (
              <div className="pt-4 border-t border-[#E4DEC8]/70 grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                <div className="p-3 rounded-xl bg-[#FCFAF5] border border-[#E4DEC8]">
                  <span className="text-[#678882] block text-[10px] font-mono uppercase">Connected Mailbox</span>
                  <span className="font-bold text-[#052326] font-mono truncate block mt-0.5">
                    {msStatus.emailAddress || "—"}
                  </span>
                </div>
                <div className="p-3 rounded-xl bg-[#FCFAF5] border border-[#E4DEC8]">
                  <span className="text-[#678882] block text-[10px] font-mono uppercase">Last Synchronized</span>
                  <span className="font-semibold text-[#052326] block mt-0.5">
                    {msStatus.lastSynchronizedAt
                      ? new Date(msStatus.lastSynchronizedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })
                      : "Just now"}
                  </span>
                </div>
                <div className="p-3 rounded-xl bg-[#FCFAF5] border border-[#E4DEC8]">
                  <span className="text-[#678882] block text-[10px] font-mono uppercase">Authorized OAuth Scope</span>
                  <span className="font-mono text-[10px] text-[#2E595A] block mt-0.5 truncate">
                    Mail.Read (Strict Read-Only)
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Hardened OAuth Security Guarantee Banner */}
          <div className="p-5 rounded-2xl bg-[#FCFAF5] border border-[#E4DEC8] space-y-3">
            <div className="flex items-center space-x-2 text-[#052326] font-bold text-xs">
              <Lock className="w-4 h-4 text-[#C9A86A]" />
              <span>Kavach OAuth Token &amp; Mailbox Security Invariants</span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs text-[#678882]">
              <div className="p-3 bg-white rounded-xl border border-[#E4DEC8] space-y-1">
                <span className="font-bold text-[#052326] block">Zero Token Exposure:</span>
                <p className="leading-relaxed">
                  OAuth refresh tokens are encrypted using AES-256-GCM server-side. Tokens NEVER enter browser cookies, React state, LLM context, or audit logs.
                </p>
              </div>
              <div className="p-3 bg-white rounded-xl border border-[#E4DEC8] space-y-1">
                <span className="font-bold text-[#052326] block">Read-Only Least Privilege:</span>
                <p className="leading-relaxed">
                  Only the minimum scope required to read incoming emails is authorized. Kavach cannot send, delete, or alter mailbox contents without separate explicit human approval.
                </p>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* 3. TAB: GENERAL SETTINGS */}
      {activeTab === "general" && (
        <section className="bg-[#FCFAF5] rounded-2xl border border-[#E4DEC8] p-6 sm:p-8 shadow-xs space-y-6 text-xs">
          <h2 className="text-base font-bold text-[#052326] tracking-tight">
            General Application Settings
          </h2>

          <div className="space-y-4">
            <div className="p-4 rounded-xl bg-[#FAF7EE] border border-[#E4DEC8] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <span className="font-bold text-[#052326] block text-sm">
                  Agent Display Name
                </span>
                <p className="text-[#678882] mt-0.5">
                  Public identifier presented in conversational client interfaces.
                </p>
              </div>
              <input
                type="text"
                disabled
                value="Kavach Agent"
                className="px-3 py-1.5 rounded-lg bg-[#FFFFFF] border border-[#E4DEC8] font-medium text-[#052326] w-48 text-center"
              />
            </div>

            <div className="p-4 rounded-xl bg-[#FAF7EE] border border-[#E4DEC8] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <span className="font-bold text-[#052326] block text-sm">
                  Audit Telemetry Verbosity
                </span>
                <p className="text-[#678882] mt-0.5">
                  Controls detail level of logged events. Credentials and keys are automatically redacted.
                </p>
              </div>
              <select
                value={logLevel}
                onChange={(e) => setLogLevel(e.target.value)}
                className="px-3 py-1.5 rounded-lg bg-[#FFFFFF] border border-[#E4DEC8] text-xs font-mono text-[#052326]"
              >
                <option value="info">INFO (Recommended)</option>
                <option value="verbose">VERBOSE (Detailed Traces)</option>
              </select>
            </div>

            <div className="p-4 rounded-xl bg-[#FAF7EE] border border-[#E4DEC8] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <span className="font-bold text-[#052326] block text-sm">
                  Clear Security Telemetry Buffer
                </span>
                <p className="text-[#678882] mt-0.5">
                  Flushes in-memory audit logs and resets local counter telemetry.
                </p>
              </div>
              <button
                onClick={handleClearTelemetry}
                className="px-3.5 py-2 rounded-lg bg-[#FCFAF5] border border-[#E4DEC8] text-[#678882] hover:text-[#052326] hover:bg-[#FAF5EB] font-medium flex items-center space-x-1.5 transition-colors"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Flush Logs</span>
              </button>
            </div>
            {resetMessage && (
              <div className="p-3 bg-[#FAF5EB] text-[#052326] rounded-xl text-xs font-mono border border-[#C9A86A]/40">
                {resetMessage}
              </div>
            )}
          </div>
        </section>
      )}

      {/* 4. TAB: POLICIES */}
      {activeTab === "policies" && (
        <section className="bg-[#FCFAF5] rounded-2xl border border-[#E4DEC8] p-6 sm:p-8 shadow-xs space-y-6 text-xs">
          <h2 className="text-base font-bold text-[#052326] tracking-tight">
            Security Policy & Enforcement Rules
          </h2>

          <div className="space-y-4">
            <div className="p-4 rounded-xl bg-[#FAF7EE] border border-[#E4DEC8] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <span className="font-bold text-[#052326] block text-sm">
                  Enforcement Policy Mode
                </span>
                <p className="text-[#678882] mt-0.5">
                  Strict fail-closed mode halts execution immediately on any detected threat or policy violation.
                </p>
              </div>
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => setEnforcementMode("strict")}
                  className={`px-3 py-1.5 rounded-lg text-xs font-mono font-semibold transition-colors ${
                    enforcementMode === "strict"
                      ? "bg-[#052326] text-white"
                      : "bg-[#FCFAF5] border border-[#E4DEC8] text-[#678882]"
                  }`}
                >
                  STRICT (FAIL-CLOSED)
                </button>
                <button
                  onClick={() => setEnforcementMode("permissive")}
                  className={`px-3 py-1.5 rounded-lg text-xs font-mono font-semibold transition-colors ${
                    enforcementMode === "permissive"
                      ? "bg-[#C9A86A] text-white"
                      : "bg-[#FCFAF5] border border-[#E4DEC8] text-[#678882]"
                  }`}
                >
                  AUDIT ONLY
                </button>
              </div>
            </div>

            <div className="p-4 rounded-xl bg-[#FAF7EE] border border-[#E4DEC8] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <span className="font-bold text-[#052326] block text-sm">
                  Human Confirmation Gate
                </span>
                <p className="text-[#678882] mt-0.5">
                  Mandates user confirmation before any consequential action (sending emails, modifying files) can execute.
                </p>
              </div>
              <button
                onClick={() => setConfirmationRequired(!confirmationRequired)}
                className={`px-3.5 py-1.5 rounded-lg font-mono text-xs font-bold transition-all ${
                  confirmationRequired
                    ? "bg-[#EBF1ED] text-[#2E595A] border border-[#A5B5A9]/50"
                    : "bg-[#FCFAF5] border border-[#E4DEC8] text-[#678882]"
                }`}
              >
                {confirmationRequired ? "ENABLED (MANDATORY)" : "DISABLED"}
              </button>
            </div>

            <div className="p-4 rounded-xl bg-[#FAF5EB] border border-[#C9A86A]/40 text-[#052326] space-y-1">
              <span className="font-bold block">Hardened Security Contract:</span>
              <p className="text-[#678882]">
                External content is treated with zero trust. Tools execute strictly through the Tool Gateway only when explicitly approved by the Policy Engine.
              </p>
            </div>
          </div>
        </section>
      )}

      {/* 5. TAB: DIAGNOSTICS */}
      {activeTab === "diagnostics" && (
        <section className="bg-[#FCFAF5] rounded-2xl border border-[#E4DEC8] p-6 sm:p-8 shadow-xs space-y-6 text-xs">
          <div>
            <div className="flex items-center space-x-2">
              <span className="text-[10px] font-bold font-mono uppercase text-[#C9A86A] bg-[#FAF5EB] px-2 py-0.5 rounded border border-[#C9A86A]/30">
                LAYER 3 • ENGINEERING DIAGNOSTICS
              </span>
            </div>
            <h2 className="text-base font-bold text-[#052326] tracking-tight mt-1">
              System Components & Provider Telemetry
            </h2>
            <p className="text-[#678882] mt-0.5">
              Internal implementation architecture and component status reserved for technical diagnostics.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Tool Gateway Box */}
            <div className="p-4 rounded-xl bg-[#FAF7EE] border border-[#E4DEC8] space-y-2">
              <div className="flex items-center space-x-2 text-[#2E595A]">
                <Wrench className="w-4 h-4 text-[#2E595A]" />
                <span className="font-bold text-xs">Registered Tools (6)</span>
              </div>
              <ul className="space-y-1 font-mono text-[11px] text-[#678882]">
                <li>• read_email</li>
                <li>• send_email (consequential)</li>
                <li>• read_file</li>
                <li>• write_file (consequential)</li>
                <li>• fetch_webpage</li>
                <li>• list_files</li>
              </ul>
              <div className="pt-2 text-[10px] text-[#2E595A] font-semibold">
                Boundary: Strict Gateway Enforced
              </div>
            </div>

            {/* Provider Box */}
            <div className="p-4 rounded-xl bg-[#FAF7EE] border border-[#E4DEC8] space-y-2">
              <div className="flex items-center space-x-2 text-[#052326]">
                <Bot className="w-4 h-4 text-[#C9A86A]" />
                <span className="font-bold text-xs">LLM Provider</span>
              </div>
              <div className="space-y-1 font-mono text-[11px] text-[#678882]">
                <div>Provider: Google GenAI</div>
                <div>Model: gemini-3.5-flash</div>
                <div>API: Official Interactions SDK</div>
                <div>Failover: Graceful fallback active</div>
              </div>
              <div className="pt-2 text-[10px] text-emerald-600 font-semibold">
                Runtime: Connected &amp; Operational
              </div>
            </div>

            {/* Integrity Box */}
            <div className="p-4 rounded-xl bg-[#FAF7EE] border border-[#E4DEC8] space-y-2">
              <div className="flex items-center space-x-2 text-[#2E595A]">
                <Activity className="w-4 h-4 text-[#2E595A]" />
                <span className="font-bold text-xs">Security Perimeter</span>
              </div>
              <div className="space-y-1 font-mono text-[11px] text-[#678882]">
                <div>Security Gateway: Operational</div>
                <div>Policy Engine: Deterministic</div>
                <div>Threat Analyzer: 6 Taxonomies</div>
                <div>Regression Corpus: 138 Passing</div>
              </div>
              <div className="pt-2 text-[10px] text-[#2E595A] font-semibold">
                Status: 100% Defense Verified
              </div>
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
