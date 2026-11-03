import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "@/lib/auth";
import { exchangeMicrosoftCode, fetchMicrosoftProfile } from "@/lib/mail/microsoft";
import { getDb } from "@/lib/db";
import { encryptSecret } from "@/lib/db/encryption";
import { defaultAuditLogger } from "@/lib/audit/logger";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const origin = process.env.NEXT_PUBLIC_APP_URL || url.origin;

  const { user } = await getServerSession(req);
  if (!user) {
    return NextResponse.redirect(new URL("/login?error=AUTH_REQUIRED", origin));
  }

  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const error = url.searchParams.get("error");

  if (error) {
    return NextResponse.redirect(new URL(`/settings?error=${encodeURIComponent(error)}`, origin));
  }

  const storedState = req.cookies.get("kavach_ms_oauth_state")?.value;
  if (!state || !storedState || state !== storedState) {
    return NextResponse.redirect(new URL("/settings?error=INVALID_OAUTH_STATE", origin));
  }

  if (!code) {
    return NextResponse.redirect(new URL("/settings?error=MISSING_CODE", origin));
  }

  const redirectUri = process.env.MICROSOFT_REDIRECT_URI || `${origin}/api/mail/microsoft/callback`;

  try {
    const { accessToken, refreshToken, expiresIn, scope } = await exchangeMicrosoftCode(code, redirectUri);
    const { emailAddress } = await fetchMicrosoftProfile(accessToken);

    const db = getDb();
    const existing = await db.getConnectedAccount(user.id, "MICROSOFT");

    if (!refreshToken && !existing?.encryptedRefreshToken) {
      return NextResponse.redirect(new URL("/settings?error=NO_REFRESH_TOKEN", origin));
    }

    const encryptedRefreshToken = refreshToken
      ? encryptSecret(refreshToken)
      : existing!.encryptedRefreshToken;

    const encryptedAccessToken = encryptSecret(accessToken);
    const tokenExpiresAt = Math.floor(Date.now() / 1000) + expiresIn;

    await db.saveConnectedAccount({
      userId: user.id,
      provider: "MICROSOFT",
      emailAddress: emailAddress || user.email,
      encryptedRefreshToken,
      encryptedAccessToken,
      tokenExpiresAt,
      scope,
      status: "CONNECTED",
      lastSynchronizedAt: new Date().toISOString(),
    });

    defaultAuditLogger.logEvent({
      correlationId: `ms_connected_${Date.now()}`,
      source: "microsoft_callback",
      sourceType: "oauth_consent",
      eventType: "POLICY_EVALUATED",
      policyDecision: "APPROVE",
      finalOutcome: "MICROSOFT_CONNECTED",
      reason: `Microsoft 365 account connected successfully: ${emailAddress || user.email}`,
      userId: user.id,
      userEmail: user.email,
      metadata: {
        provider: "MICROSOFT",
        emailAddress: emailAddress || user.email,
        scope,
      },
    });

    const res = NextResponse.redirect(new URL("/settings?connected=microsoft", origin));
    res.cookies.delete("kavach_ms_oauth_state");
    return res;
  } catch {
    const res = NextResponse.redirect(new URL("/settings?error=MS_OAUTH_EXCHANGE_FAILED", origin));
    res.cookies.delete("kavach_ms_oauth_state");
    return res;
  }
}
