"use client";

import React, { useState } from "react";
import { KavachLogo } from "@/components/brand/KavachLogo";
import { ShieldCheck, Lock, ArrowRight, AlertCircle, CheckCircle2 } from "lucide-react";

export default function LoginPage() {
  const [loading, setLoading] = useState(false);
  const [testEmail, setTestEmail] = useState("");
  const [showDevLogin, setShowDevLogin] = useState(false);
  const [devError, setDevError] = useState<string | null>(null);

  // Check URL params for error messages
  const [errorMessage, _setErrorMessage] = useState<string | null>(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const err = params.get("error");
      if (err === "GOOGLE_CLIENT_ID_MISSING" || err === "OAUTH_NOT_CONFIGURED") {
        return "Google OAuth credentials are not configured in .env.local. Use development sign-in below or configure GOOGLE_CLIENT_ID.";
      }
      if (err) return `Authentication notice: ${err.replace(/_/g, " ").toLowerCase()}`;
    }
    return null;
  });

  const handleGoogleSignIn = () => {
    setLoading(true);
    window.location.href = "/api/auth/google";
  };

  const handleDevSignIn = async (emailToUse: string, name?: string) => {
    setLoading(true);
    setDevError(null);
    try {
      const res = await fetch("/api/auth/mock-login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: emailToUse,
          displayName: name || emailToUse.split("@")[0],
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to sign in");
      }

      window.location.href = "/";
    } catch (err) {
      setDevError(err instanceof Error ? err.message : "Failed to sign in");
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#FAF7EE] flex flex-col justify-between text-[#052326] font-sans antialiased selection:bg-[#C9A86A]/30">
      {/* Top Header */}
      <header className="border-b border-[#E4DEC8] bg-[#FAF7EE] px-6 sm:px-12 py-4 flex items-center justify-between">
        <KavachLogo size={36} showText={true} />
        <div className="flex items-center space-x-2 text-xs font-mono text-[#678882]">
          <span className="w-2 h-2 rounded-full bg-emerald-600 animate-pulse" />
          <span>SOC Perimeter Active</span>
        </div>
      </header>

      {/* Main Login Card */}
      <main className="flex-1 flex items-center justify-center p-6">
        <div className="max-w-md w-full bg-[#FCFAF5] rounded-3xl border border-[#E4DEC8] p-8 sm:p-10 shadow-[0_4px_24px_rgba(5,35,38,0.04)] space-y-8 animate-in fade-in duration-300">
          {/* Logo & Headline */}
          <div className="text-center space-y-2">
            <div className="inline-flex p-3 rounded-2xl bg-[#052326] text-[#C9A86A] shadow-xs mb-2">
              <ShieldCheck className="w-8 h-8 text-[#C9A86A]" />
            </div>
            <h1 className="text-2xl sm:text-3xl font-serif font-bold text-[#052326] tracking-tight">
              KAVACH
            </h1>
            <p className="text-xs font-mono font-semibold tracking-wider uppercase text-[#C9A86A]">
              Secure AI Agent Infrastructure
            </p>
            <p className="text-xs text-[#678882] pt-1">
              Sign in to continue to your enterprise security console
            </p>
          </div>

          {/* Error / Status Alert */}
          {(errorMessage || devError) && (
            <div className="p-3.5 rounded-xl bg-[#FEF5F2] border border-[#F8C8BA] text-xs text-[#991B1B] flex items-start space-x-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-[#DC2626]" />
              <div className="flex-1 leading-relaxed">{errorMessage || devError}</div>
            </div>
          )}

          {/* Primary Action: Google Sign-In */}
          <div className="space-y-3">
            <button
              type="button"
              onClick={handleGoogleSignIn}
              disabled={loading}
              className="w-full flex items-center justify-center space-x-3 px-5 py-3.5 rounded-2xl bg-white border border-[#E4DEC8] text-xs font-bold text-[#052326] hover:bg-[#FAF5EB] hover:border-[#052326] transition-all shadow-xs group disabled:opacity-50"
            >
              <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                />
              </svg>
              <span>{loading ? "Connecting securely..." : "Sign in with Google"}</span>
              <ArrowRight className="w-3.5 h-3.5 text-[#678882] group-hover:text-[#052326] transition-transform group-hover:translate-x-0.5" />
            </button>

            <p className="text-[11px] text-center text-[#678882]">
              Establishes server-side identity only. Mailbox permissions are requested separately.
            </p>
          </div>

          {/* Enterprise Invariant Badges */}
          <div className="pt-2 border-t border-[#E4DEC8]/80 space-y-2.5">
            <div className="flex items-center space-x-2 text-[11px] text-[#2E595A]">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
              <span>Authority Boundary: External content provides DATA, never AUTHORITY</span>
            </div>
            <div className="flex items-center space-x-2 text-[11px] text-[#2E595A]">
              <Lock className="w-3.5 h-3.5 text-[#C9A86A] shrink-0" />
              <span>Zero Token Leakage: Secrets never enter browser or LLM context</span>
            </div>
          </div>

          {/* Developer / Evaluation Options */}
          <div className="pt-2 text-center">
            <button
              type="button"
              onClick={() => setShowDevLogin(!showDevLogin)}
              className="text-[11px] text-[#678882] hover:text-[#052326] underline underline-offset-2 font-mono"
            >
              {showDevLogin ? "Hide Evaluation Access" : "Evaluation / Local Preview Access"}
            </button>

            {showDevLogin && (
              <div className="mt-4 p-4 rounded-2xl bg-white border border-[#E4DEC8] text-left space-y-3 animate-in fade-in duration-200">
                <span className="text-[10px] font-mono font-bold tracking-wider uppercase text-[#678882] block">
                  Quick Authentication (Roles evaluated server-side)
                </span>
                <div className="flex flex-col gap-2">
                  <button
                    type="button"
                    onClick={() => handleDevSignIn(process.env.ADMIN_EMAIL || "admin@acmecorp.internal", "Security Admin")}
                    disabled={loading}
                    className="w-full text-xs font-semibold px-3 py-2 rounded-xl bg-[#052326] text-white hover:bg-[#0A2E33] transition-colors flex items-center justify-between"
                  >
                    <span>Sign in as Admin ({process.env.ADMIN_EMAIL || "admin@acmecorp.internal"})</span>
                    <span className="text-[10px] font-mono text-[#C9A86A]">ADMIN</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDevSignIn("analyst@acmecorp.internal", "Security Analyst")}
                    disabled={loading}
                    className="w-full text-xs font-semibold px-3 py-2 rounded-xl bg-[#FAF7EE] border border-[#E4DEC8] text-[#2E595A] hover:bg-[#EFEAD9] transition-colors flex items-center justify-between"
                  >
                    <span>Sign in as Standard User (analyst@acmecorp.internal)</span>
                    <span className="text-[10px] font-mono text-[#678882]">USER</span>
                  </button>
                </div>

                <div className="pt-2 flex gap-2">
                  <input
                    type="email"
                    placeholder="custom.user@company.com"
                    value={testEmail}
                    onChange={(e) => setTestEmail(e.target.value)}
                    className="flex-1 text-xs px-3 py-1.5 rounded-xl border border-[#E4DEC8] bg-[#FCFAF5] focus:outline-none focus:border-[#052326]"
                  />
                  <button
                    type="button"
                    onClick={() => testEmail && handleDevSignIn(testEmail)}
                    disabled={loading || !testEmail}
                    className="text-xs font-semibold px-3 py-1.5 rounded-xl bg-white border border-[#E4DEC8] text-[#052326] hover:bg-[#FAF5EB] disabled:opacity-50"
                  >
                    Sign in
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-[#E4DEC8] py-4 px-8 text-center text-xs font-mono text-[#678882] bg-white flex flex-col sm:flex-row items-center justify-between gap-2">
        <div className="flex items-center space-x-2">
          <span className="font-serif font-bold text-[#052326]">KAVACH</span>
          <span>•</span>
          <span>Deterministic Defense for Autonomous AI Agents</span>
        </div>
        <div>
          <span>SOC Defense Perimeter: Active • Invariant: Fail-Closed</span>
        </div>
      </footer>
    </div>
  );
}
