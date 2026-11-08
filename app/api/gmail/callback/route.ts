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
    // If authorization code was already exchanged/consumed by a concurrent or duplicate request,
    // safely verify if a valid CONNECTED Gmail session already exists for this user.
    try {
      const db = getDb();
      for (let attempt = 0; attempt < 3; attempt++) {
        const existing = await db.getGmailConnectionByUserId(user.id);
        if (existing?.status === "CONNECTED" && existing.encryptedRefreshToken) {
          defaultAuditLogger.logEvent({
            correlationId: `gmail_callback_duplicate_${Date.now()}`,
            source: "gmail_callback",
            sourceType: "oauth_consent",
            eventType: "POLICY_EVALUATED",
            policyDecision: "APPROVE",
            finalOutcome: "GMAIL_CONNECTED",
            reason: `Reconciled concurrent/duplicate callback for connected user: ${user.email}`,
            userId: user.id,
            userEmail: user.email,
          });

          const res = NextResponse.redirect(new URL("/settings?connected=gmail", origin));
          res.cookies.delete("kavach_gmail_oauth_state");
          return res;
        }
        if (attempt < 2) {
          await new Promise((resolve) => setTimeout(resolve, 300));
        }
      }
    } catch {
      // Database check failed; fall through to error redirect
    }

    return NextResponse.redirect(new URL("/settings?error=GMAIL_CONNECTION_FAILED", origin));
  }
}
