import crypto from "crypto";
import { decryptSecret } from "@/lib/db/encryption";
import { TrustLevel } from "@/types";
import { EmailMessage, NormalizedAttachment } from "./types";

export const MICROSOFT_SCOPES = "offline_access https://graph.microsoft.com/Mail.Read https://graph.microsoft.com/User.Read";
export const MICROSOFT_AUTH_URL = "https://login.microsoftonline.com/common/oauth2/v2.0/authorize";
export const MICROSOFT_TOKEN_URL = "https://login.microsoftonline.com/common/oauth2/v2.0/token";
export const MICROSOFT_GRAPH_URL = "https://graph.microsoft.com/v1.0";

/**
 * Strips HTML tags safely to plain text for untrusted content analysis.
 */
export function stripHtml(html: string): string {
  return html
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Generates an official Microsoft OAuth 2.0 authorization URL.
 * State token is bound to userId with cryptographically random entropy.
 */
export function generateMicrosoftOAuthUrl(
  userId: string,
  origin: string
): { url: string; state: string } {
  const clientId = process.env.MICROSOFT_CLIENT_ID;
  if (!clientId) {
    throw new Error("MICROSOFT_CLIENT_ID is not configured.");
  }

  const redirectUri = process.env.MICROSOFT_REDIRECT_URI || `${origin}/api/mail/microsoft/callback`;
  const stateRandom = crypto.randomBytes(16).toString("hex");
  const state = `kavach_ms:${userId}:${stateRandom}`;

  const url = new URL(MICROSOFT_AUTH_URL);
  url.searchParams.set("client_id", clientId);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("redirect_uri", redirectUri);
  url.searchParams.set("response_mode", "query");
  url.searchParams.set("scope", MICROSOFT_SCOPES);
  url.searchParams.set("state", state);
  url.searchParams.set("prompt", "consent");

  return { url: url.toString(), state };
}

/**
 * Exchanges authorization code for Microsoft Graph tokens.
 */
export async function exchangeMicrosoftCode(
  code: string,
  redirectUri: string
): Promise<{
  accessToken: string;
  refreshToken?: string;
  expiresIn: number;
  scope: string;
}> {
  const clientId = process.env.MICROSOFT_CLIENT_ID;
  const clientSecret = process.env.MICROSOFT_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    throw new Error("Microsoft OAuth credentials missing (MICROSOFT_CLIENT_ID or MICROSOFT_CLIENT_SECRET)");
  }

  const tokenRes = await fetch(MICROSOFT_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      grant_type: "authorization_code",
      code,
      redirect_uri: redirectUri,
      scope: MICROSOFT_SCOPES,
    }),
  });

  if (!tokenRes.ok) {
    throw new Error(`Failed to exchange Microsoft authorization code: ${tokenRes.status}`);
  }

  const tokenData = await tokenRes.json();
  return {
    accessToken: tokenData.access_token,
    refreshToken: tokenData.refresh_token,
    expiresIn: tokenData.expires_in || 3600,
    scope: tokenData.scope || MICROSOFT_SCOPES,
  };
}

/**
 * Refreshes an expired Microsoft Graph access token.
 */
export async function refreshMicrosoftToken(
  encryptedRefreshToken: string
): Promise<{ accessToken: string; expiresIn: number }> {
  const clientId = process.env.MICROSOFT_CLIENT_ID;
  const clientSecret = process.env.MICROSOFT_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    throw new Error("Microsoft OAuth credentials missing");
  }

  const decryptedToken = decryptSecret(encryptedRefreshToken);

  const res = await fetch(MICROSOFT_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      grant_type: "refresh_token",
      refresh_token: decryptedToken,
      scope: MICROSOFT_SCOPES,
    }),
  });

  if (!res.ok) {
    throw new Error(`Failed to refresh Microsoft access token: ${res.status}`);
  }

  const data = await res.json();
  return {
    accessToken: data.access_token,
    expiresIn: data.expires_in || 3600,
  };
}

/**
 * Fetches user profile from Microsoft Graph /me.
 */
export async function fetchMicrosoftProfile(
  accessToken: string
): Promise<{ emailAddress: string; displayName: string }> {
  const res = await fetch(`${MICROSOFT_GRAPH_URL}/me`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!res.ok) {
    throw new Error(`Failed to fetch Microsoft Graph user profile: ${res.status}`);
  }

  const data = await res.json();
  const emailAddress = data.mail || data.userPrincipalName || "";
  const displayName = data.displayName || emailAddress;

  return { emailAddress, displayName };
}

/**
 * Fetches real messages from Microsoft Graph and maps them into
 * the normalized EmailMessage format with TrustLevel 1 (UNTRUSTED).
 */
export async function fetchMicrosoftMessages(
  accessToken: string,
  maxResults: number = 10
): Promise<EmailMessage[]> {
  const endpoint = `${MICROSOFT_GRAPH_URL}/me/messages?$top=${maxResults}&$select=id,conversationId,subject,bodyPreview,body,from,toRecipients,receivedDateTime,hasAttachments,isRead&$expand=attachments($select=id,name,contentType,size)&$orderby=receivedDateTime desc`;

  const res = await fetch(endpoint, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Prefer: 'outlook.body-content-type="html"',
    },
  });

  if (!res.ok) {
    throw new Error(`Failed to fetch messages from Microsoft Graph: ${res.status}`);
  }

  const data = await res.json();
  const rawList = (data.value || []) as Array<Record<string, unknown>>;

  const messages: EmailMessage[] = [];

  for (const m of rawList) {
    const fromObj = m.from as { emailAddress?: { address?: string; name?: string } } | undefined;
    const sender = fromObj?.emailAddress?.address
      ? fromObj.emailAddress.name
        ? `${fromObj.emailAddress.name} <${fromObj.emailAddress.address}>`
        : fromObj.emailAddress.address
      : "Unknown Sender";

    const toList = (m.toRecipients || []) as Array<{ emailAddress?: { address?: string } }>;
    const recipients = toList
      .map((t) => t.emailAddress?.address)
      .filter((addr): addr is string => Boolean(addr));

    const bodyObj = m.body as { contentType?: string; content?: string } | undefined;
    const rawContent = bodyObj?.content || "";
    const isHtml = (bodyObj?.contentType || "").toLowerCase() === "html";

    const bodyText = isHtml ? stripHtml(rawContent) : rawContent;
    const bodyHtml = isHtml ? rawContent : undefined;
    const snippet = String(m.bodyPreview || bodyText.slice(0, 150));

    const attachmentsList = (m.attachments || []) as Array<Record<string, unknown>>;
    const attachments: NormalizedAttachment[] = attachmentsList.map((a) => ({
      id: String(a.id || `att_${Math.random().toString(36).slice(2)}`),
      filename: String(a.name || "attachment"),
      mimeType: String(a.contentType || "application/octet-stream"),
      sizeBytes: Number(a.size || 0),
    }));

    messages.push({
      id: String(m.id),
      provider: "MICROSOFT",
      threadId: String(m.conversationId || m.id),
      sender,
      recipients,
      subject: String(m.subject || "(No Subject)"),
      timestamp: String(m.receivedDateTime || new Date().toISOString()),
      snippet,
      bodyText,
      bodyHtml,
      attachments,
      labels: [],
      unread: !Boolean(m.isRead),
      sourceTrustLevel: TrustLevel.EXTERNAL_CONTENT,
    });
  }

  return messages;
}
