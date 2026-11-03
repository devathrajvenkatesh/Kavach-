import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "@/lib/auth";
import { exchangeGmailCode, fetchGmailProfile } from "@/lib/gmail/oauth";
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

  const storedState = req.cookies.get("kavach_gmail_oauth_state")?.value;
  if (!state || !storedState || state !== storedState) {
    return NextResponse.redirect(new URL("/settings?error=INVALID_OAUTH_STATE", origin));
  }

  if (!code) {
    return NextResponse.redirect(new URL("/settings?error=MISSING_CODE", origin));
  }

  const redirectUri = `${origin}/api/gmail/callback`;

  try {
    const { accessToken, refreshToken, expiresIn, scope } = await exchangeGmailCode(code, redirectUri);
    const { emailAddress } = await fetchGmailProfile(accessToken);

    if (!refreshToken) {
      // If refresh token wasn't returned, we might already have one or need prompt=consent
      const db = getDb();
      const existing = await db.getGmailConnectionByUserId(user.id);
      if (!existing?.encryptedRefreshToken) {
        return NextResponse.redirect(new URL("/settings?error=NO_REFRESH_TOKEN", origin));
      }
    }

    const db = getDb();
    const existing = await db.getGmailConnectionByUserId(user.id);
    const encryptedRefreshToken = refreshToken
      ? encryptSecret(refreshToken)
      : existing!.encryptedRefreshToken;

    const encryptedAccessToken = encryptSecret(accessToken);
    const tokenExpiresAt = Math.floor(Date.now() / 1000) + expiresIn;

    await db.saveGmailConnection({
      userId: user.id,
      gmailAddress: emailAddress || user.email,
      encryptedRefreshToken,
      encryptedAccessToken,
      tokenExpiresAt,
      scope,
      status: "CONNECTED",
      lastSynchronizedAt: new Date().toISOString(),
    });

    defaultAuditLogger.logEvent({
      correlationId: `gmail_connected_${Date.now()}`,
      source: "gmail_callback",
      sourceType: "oauth_consent",
      eventType: "POLICY_EVALUATED",
      policyDecision: "APPROVE",
      finalOutcome: "GMAIL_CONNECTED",
      reason: `Gmail account connected successfully: ${emailAddress || user.email}`,
      userId: user.id,
      userEmail: user.email,
      metadata: {
        gmailAddress: emailAddress || user.email,
        scope,
      },
    });

    const res = NextResponse.redirect(new URL("/settings?connected=gmail", origin));
    res.cookies.delete("kavach_gmail_oauth_state");
    return res;
  } catch {
    return NextResponse.redirect(new URL("/settings?error=GMAIL_CONNECTION_FAILED", origin));
  }
}
