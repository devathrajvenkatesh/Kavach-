import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { generateGmailOAuthUrl } from "@/lib/gmail/oauth";
import { getDb } from "@/lib/db";
import { encryptSecret } from "@/lib/db/encryption";
import { defaultAuditLogger } from "@/lib/audit/logger";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const auth = await requireAuth(req);
  if (auth instanceof NextResponse) return auth;

  const url = new URL(req.url);
  const origin = process.env.NEXT_PUBLIC_APP_URL || url.origin;
  const mockParam = url.searchParams.get("mock");

  const clientId = process.env.GOOGLE_CLIENT_ID;

  // Real Google OAuth Flow
  if (clientId && mockParam !== "true") {
    try {
      const { url: oauthUrl, state } = generateGmailOAuthUrl(auth.user.id, origin);
      const res = NextResponse.redirect(oauthUrl);

      res.cookies.set({
        name: "kavach_gmail_oauth_state",
        value: state,
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/",
        maxAge: 600, // 10 minutes
      });

      return res;
    } catch {
      return NextResponse.redirect(new URL("/settings?error=GMAIL_OAUTH_INIT_FAILED", origin));
    }
  }

  // Developer / Demo Simulated Connection (survives restarts in persistent DB)
  try {
    const db = getDb();
    const gmailAddress = `${auth.user.email.split("@")[0]}@gmail.com`;
    const encryptedToken = encryptSecret(`mock_refresh_token_${auth.user.id}_${Date.now()}`);

    await db.saveGmailConnection({
      userId: auth.user.id,
      gmailAddress,
      encryptedRefreshToken: encryptedToken,
      encryptedAccessToken: encryptSecret("mock_access_token_ephemeral"),
      tokenExpiresAt: Math.floor(Date.now() / 1000) + 3600,
      scope: "https://www.googleapis.com/auth/gmail.readonly",
      status: "CONNECTED",
      lastSynchronizedAt: new Date().toISOString(),
    });

    defaultAuditLogger.logEvent({
      correlationId: `gmail_conn_${Date.now()}`,
      source: "gmail_connect",
      sourceType: "oauth_consent",
      eventType: "POLICY_EVALUATED",
      policyDecision: "APPROVE",
      finalOutcome: "GMAIL_CONNECTED",
      reason: `Gmail account connected for user: ${gmailAddress}`,
      userId: auth.user.id,
      userEmail: auth.user.email,
      metadata: {
        gmailAddress,
        scope: "https://www.googleapis.com/auth/gmail.readonly",
      },
    });

    return NextResponse.redirect(new URL("/settings?connected=gmail", origin));
  } catch {
    return NextResponse.redirect(new URL("/settings?error=GMAIL_CONNECT_FAILED", origin));
  }
}
