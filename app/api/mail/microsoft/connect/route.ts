import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { generateMicrosoftOAuthUrl, MICROSOFT_SCOPES } from "@/lib/mail/microsoft";
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
  const wantsJson = req.headers.get("accept")?.includes("application/json");

  const clientId = process.env.MICROSOFT_CLIENT_ID;

  // Real Microsoft OAuth 2.0 Flow
  if (clientId && mockParam !== "true") {
    try {
      const { url: oauthUrl, state } = generateMicrosoftOAuthUrl(auth.user.id, origin);
      const res = wantsJson
        ? NextResponse.json({ success: true, url: oauthUrl })
        : NextResponse.redirect(oauthUrl);

      res.cookies.set({
        name: "kavach_ms_oauth_state",
        value: state,
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/",
        maxAge: 600, // 10 minutes
      });

      return res;
    } catch {
      return wantsJson
        ? NextResponse.json({ success: false, error: "Failed to initialize Microsoft OAuth" }, { status: 500 })
        : NextResponse.redirect(new URL("/settings?error=MS_OAUTH_INIT_FAILED", origin));
    }
  }

  // Developer / Evaluation Sandbox Connection (persists in DB, survives restarts)
  try {
    const db = getDb();
    const emailAddress = `${auth.user.email.split("@")[0]}@enterprise-m365.internal`;
    const encryptedToken = encryptSecret(`mock_ms_refresh_token_${auth.user.id}_${Date.now()}`);

    await db.saveConnectedAccount({
      userId: auth.user.id,
      provider: "MICROSOFT",
      emailAddress,
      encryptedRefreshToken: encryptedToken,
      encryptedAccessToken: encryptSecret("mock_ms_access_token_ephemeral"),
      tokenExpiresAt: Math.floor(Date.now() / 1000) + 3600,
      scope: MICROSOFT_SCOPES,
      status: "CONNECTED",
      lastSynchronizedAt: new Date().toISOString(),
    });

    defaultAuditLogger.logEvent({
      correlationId: `ms_conn_${Date.now()}`,
      source: "microsoft_connect",
      sourceType: "oauth_consent",
      eventType: "POLICY_EVALUATED",
      policyDecision: "APPROVE",
      finalOutcome: "MICROSOFT_CONNECTED",
      reason: `Microsoft 365 account connected for user: ${emailAddress}`,
      userId: auth.user.id,
      userEmail: auth.user.email,
      metadata: {
        provider: "MICROSOFT",
        emailAddress,
        scope: MICROSOFT_SCOPES,
      },
    });

    if (wantsJson) {
      return NextResponse.json({ success: true, connected: true, emailAddress });
    }

    return NextResponse.redirect(new URL("/settings?connected=microsoft", origin));
  } catch {
    return wantsJson
      ? NextResponse.json({ success: false, error: "Failed to connect Microsoft 365" }, { status: 500 })
      : NextResponse.redirect(new URL("/settings?error=MS_CONNECTION_FAILED", origin));
  }
}
