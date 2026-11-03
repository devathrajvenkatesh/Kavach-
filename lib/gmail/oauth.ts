import crypto from "crypto";
import { encryptSecret, decryptSecret } from "@/lib/db/encryption";

export const GMAIL_READONLY_SCOPE = "https://www.googleapis.com/auth/gmail.readonly";

export function generateGmailOAuthUrl(userId: string, origin: string): { url: string; state: string } {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  if (!clientId) {
    throw new Error("GOOGLE_CLIENT_ID is not configured.");
  }

  const redirectUri = `${origin}/api/gmail/callback`;
  const stateRandom = crypto.randomBytes(16).toString("hex");
  const state = `kavach_gmail:${userId}:${stateRandom}`;

  const url = new URL("https://accounts.google.com/o/oauth2/v2/auth");
  url.searchParams.set("client_id", clientId);
  url.searchParams.set("redirect_uri", redirectUri);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("scope", GMAIL_READONLY_SCOPE);
  url.searchParams.set("access_type", "offline"); // Needed for refresh token
  url.searchParams.set("prompt", "consent"); // Force consent to ensure refresh token is returned
  url.searchParams.set("state", state);

  return { url: url.toString(), state };
}

export async function exchangeGmailCode(
  code: string,
  redirectUri: string
): Promise<{
  accessToken: string;
  refreshToken?: string;
  expiresIn: number;
  scope: string;
}> {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    throw new Error("Google OAuth credentials missing");
  }

  const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: redirectUri,
      grant_type: "authorization_code",
    }),
  });

  if (!tokenRes.ok) {
    // Do not log raw error text if it contains sensitive tokens
    throw new Error(`Failed to exchange Gmail authorization code: ${tokenRes.status}`);
  }

  const tokenData = await tokenRes.json();
  return {
    accessToken: tokenData.access_token,
    refreshToken: tokenData.refresh_token,
    expiresIn: tokenData.expires_in || 3600,
    scope: tokenData.scope || GMAIL_READONLY_SCOPE,
  };
}

export async function refreshGmailToken(
  encryptedRefreshToken: string
): Promise<{ accessToken: string; expiresIn: number }> {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    throw new Error("Google OAuth credentials missing");
  }

  const decryptedToken = decryptSecret(encryptedRefreshToken);

  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: decryptedToken,
      grant_type: "refresh_token",
    }),
  });

  if (!res.ok) {
    throw new Error(`Failed to refresh Gmail access token: ${res.status}`);
  }

  const data = await res.json();
  return {
    accessToken: data.access_token,
    expiresIn: data.expires_in || 3600,
  };
}

export async function fetchGmailProfile(accessToken: string): Promise<{ emailAddress: string }> {
  const res = await fetch("https://gmail.googleapis.com/gmail/v1/users/me/profile", {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!res.ok) {
    throw new Error(`Failed to fetch Gmail profile: ${res.status}`);
  }

  const data = await res.json();
  return { emailAddress: data.emailAddress || "" };
}

export { encryptSecret, decryptSecret };
