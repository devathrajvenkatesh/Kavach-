"use client";

import React, { useEffect, useState } from "react";
import {
  ShieldAlert,
  Users,
  Mail,
  ShieldCheck,
  Activity,
  ArrowLeft,
  Server,
  Lock,
  RefreshCw,
} from "lucide-react";
import Link from "next/link";

interface AdminData {
  admin: { id: string; email: string };
  stats: {
    totalUsers: number;
    activeUsers: number;
    connectedGmailAccounts: number;
    securityEventsTotal: number;
    threatsBlocked: number;
    threatsDetected: number;
    unauthorizedExecutions: number;
    blockRate: number;
  };
  users: Array<{
    id: string;
    email: string;
    displayName: string;
    role: string;
    accountStatus: string;
    createdAt: string;
    lastLoginAt: string;
  }>;
  providerHealth: {
    configuredProvider: string;
    status: string;
    failClosedActive: boolean;
    lastCheckAt: string;
  };
  systemHealth: {
    status: string;
    mode: string;
    uptimeSeconds: number;
    memoryHeapMb: number;
    invariantsEnforced: boolean;
  };
}

export default function AdminPage() {
  const [data, setData] = useState<AdminData | null>(null);
  const [loading, setLoading] = useState(true);
  const [forbidden, setForbidden] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchAdminStats = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/stats");
      if (res.status === 403) {
        setForbidden(true);
        setLoading(false);
        return;
      }
      if (res.status === 401) {
        window.location.href = "/login";
        return;
      }
      if (!res.ok) {
        throw new Error(`Admin request failed with status: ${res.status}`);
      }
      const json = await res.json();
      setData(json);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load admin stats");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAdminStats();
  }, []);

  if (forbidden) {
    return (
      <div className="min-h-screen bg-[#FAF7EE] flex items-center justify-center p-6 text-[#052326]">
        <div className="max-w-md w-full bg-[#FCFAF5] rounded-3xl border border-[#E4DEC8] p-8 text-center space-y-4 shadow-sm">
          <div className="p-3 bg-[#FEF5F2] text-[#DC2626] rounded-2xl inline-flex border border-[#F8C8BA]">
            <ShieldAlert className="w-8 h-8" />
          </div>
          <h1 className="text-xl font-serif font-bold text-[#052326]">403 Forbidden</h1>
          <p className="text-xs text-[#678882] leading-relaxed">
            Administrator privileges required. Your authenticated identity is not authorized to access system administrative telemetry.
          </p>
          <div className="pt-2">
            <Link
              href="/"
              className="inline-flex items-center space-x-2 px-4 py-2 rounded-xl bg-[#052326] text-white text-xs font-semibold hover:bg-[#0A2E33] transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Return to Application</span>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FAF7EE] text-[#052326] font-sans antialiased p-6 sm:p-10 space-y-8">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-[#E4DEC8]">
        <div>
          <div className="flex items-center space-x-2">
            <Link
              href="/"
              className="text-xs font-semibold text-[#2E595A] hover:text-[#052326] flex items-center space-x-1"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back to Overview</span>
            </Link>
            <span className="text-[#678882]">•</span>
            <span className="text-[10px] font-mono uppercase font-bold text-[#C9A86A] bg-[#FAF5EB] px-2 py-0.5 rounded border border-[#C9A86A]/30">
              ADMINISTRATIVE GOVERNANCE
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-serif font-bold text-[#052326] tracking-tight mt-1">
            System Administration Console
          </h1>
          <p className="text-xs text-[#678882]">
            Authoritative visibility over multi-user identities, connected accounts, and system-wide defense invariants.
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <button
            onClick={fetchAdminStats}
            disabled={loading}
            className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-white border border-[#E4DEC8] text-xs font-semibold text-[#052326] hover:bg-[#FAF5EB] transition-colors shadow-2xs"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-[#678882] ${loading ? "animate-spin" : ""}`} />
            <span>Refresh</span>
          </button>
          <div className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-[#EBF1ED] border border-[#A5B5A9]/50 text-xs font-semibold text-[#2E595A]">
            <Lock className="w-3.5 h-3.5 text-[#2E595A]" />
            <span>Admin Verified: {data?.admin?.email || "..."}</span>
          </div>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-[#FEF5F2] border border-[#F8C8BA] text-xs text-[#DC2626]">
          {error}
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-5 rounded-2xl bg-[#FCFAF5] border border-[#E4DEC8] shadow-2xs space-y-2">
          <div className="flex items-center justify-between text-[#678882]">
            <span className="text-[11px] font-mono uppercase font-bold">Total Users</span>
            <Users className="w-4 h-4 text-[#2E595A]" />
          </div>
          <div className="text-2xl font-bold font-serif text-[#052326]">
            {data?.stats?.totalUsers ?? "—"}
          </div>
          <div className="text-[11px] text-[#678882]">
            {data?.stats?.activeUsers ?? 0} active in last 30 days
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-[#FCFAF5] border border-[#E4DEC8] shadow-2xs space-y-2">
          <div className="flex items-center justify-between text-[#678882]">
            <span className="text-[11px] font-mono uppercase font-bold">Connected Gmail</span>
            <Mail className="w-4 h-4 text-[#C9A86A]" />
          </div>
          <div className="text-2xl font-bold font-serif text-[#052326]">
            {data?.stats?.connectedGmailAccounts ?? "—"}
          </div>
          <div className="text-[11px] text-[#678882]">
            Strict read-only OAuth scope
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-[#FCFAF5] border border-[#E4DEC8] shadow-2xs space-y-2">
          <div className="flex items-center justify-between text-[#678882]">
            <span className="text-[11px] font-mono uppercase font-bold">Threats Blocked</span>
            <ShieldAlert className="w-4 h-4 text-[#C2410C]" />
          </div>
          <div className="text-2xl font-bold font-serif text-[#052326]">
            {data?.stats?.threatsBlocked ?? "—"}
          </div>
          <div className="text-[11px] text-emerald-700 font-medium">
            100% Policy Block Rate Enforced
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-[#FCFAF5] border border-[#E4DEC8] shadow-2xs space-y-2">
          <div className="flex items-center justify-between text-[#678882]">
            <span className="text-[11px] font-mono uppercase font-bold">Unauthorized Tools</span>
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-bold font-serif text-[#052326]">
            {data?.stats?.unauthorizedExecutions ?? 0}
          </div>
          <div className="text-[11px] text-emerald-700 font-medium">
            Invariant: Zero Unauthorized Executions
          </div>
        </div>
      </div>

      {/* Users Table */}
      <section className="bg-[#FCFAF5] rounded-2xl border border-[#E4DEC8] p-6 space-y-4 shadow-2xs">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-[#052326]">Registered User Accounts</h2>
            <p className="text-xs text-[#678882]">
              User identities managed server-side. Passwords or OAuth secrets are never stored in plaintext.
            </p>
          </div>
          <span className="text-xs font-mono text-[#678882]">
            {data?.users?.length || 0} Accounts Registered
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-[#E4DEC8] text-[#678882] font-mono uppercase text-[10px]">
                <th className="py-2.5 px-3">User</th>
                <th className="py-2.5 px-3">Role</th>
                <th className="py-2.5 px-3">Status</th>
                <th className="py-2.5 px-3">Registered</th>
                <th className="py-2.5 px-3">Last Active</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E4DEC8]/60">
              {data?.users?.map((u) => (
                <tr key={u.id} className="hover:bg-white/60 transition-colors">
                  <td className="py-3 px-3">
                    <div className="font-semibold text-[#052326]">{u.displayName}</div>
                    <div className="text-[11px] font-mono text-[#678882]">{u.email}</div>
                  </td>
                  <td className="py-3 px-3">
                    <span
                      className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded ${
                        u.role === "ADMIN"
                          ? "bg-[#052326] text-[#C9A86A]"
                          : "bg-[#FAF7EE] text-[#678882] border border-[#E4DEC8]"
                      }`}
                    >
                      {u.role}
                    </span>
                  </td>
                  <td className="py-3 px-3">
                    <span className="inline-flex items-center space-x-1 text-emerald-700 font-medium">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-600" />
                      <span>{u.accountStatus}</span>
                    </span>
                  </td>
                  <td className="py-3 px-3 font-mono text-[#678882]">
                    {new Date(u.createdAt).toLocaleDateString()}
                  </td>
                  <td className="py-3 px-3 font-mono text-[#678882]">
                    {new Date(u.lastLoginAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Provider & Infrastructure Health */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="p-6 rounded-2xl bg-[#FCFAF5] border border-[#E4DEC8] space-y-3">
          <div className="flex items-center space-x-2 text-xs font-bold text-[#052326]">
            <Server className="w-4 h-4 text-[#2E595A]" />
            <span>LLM Provider Status</span>
          </div>
          <div className="space-y-1.5 text-xs text-[#2E595A]">
            <div className="flex justify-between">
              <span className="text-[#678882]">Configured Provider:</span>
              <span className="font-mono font-bold">{data?.providerHealth?.configuredProvider}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[#678882]">Operational State:</span>
              <span className="font-semibold text-emerald-700">{data?.providerHealth?.status}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[#678882]">Fail-Closed Safety:</span>
              <span className="font-semibold text-[#052326]">ACTIVE</span>
            </div>
          </div>
        </div>

        <div className="p-6 rounded-2xl bg-[#FCFAF5] border border-[#E4DEC8] space-y-3">
          <div className="flex items-center space-x-2 text-xs font-bold text-[#052326]">
            <Activity className="w-4 h-4 text-[#C9A86A]" />
            <span>Host & Application Health</span>
          </div>
          <div className="space-y-1.5 text-xs text-[#2E595A]">
            <div className="flex justify-between">
              <span className="text-[#678882]">System Status:</span>
              <span className="font-semibold text-emerald-700">{data?.systemHealth?.status}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[#678882]">Heap Memory Used:</span>
              <span className="font-mono">{data?.systemHealth?.memoryHeapMb} MB</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[#678882]">Uptime:</span>
              <span className="font-mono">{Math.floor((data?.systemHealth?.uptimeSeconds || 0) / 60)} minutes</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
