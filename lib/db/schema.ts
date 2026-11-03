export type UserRole = "USER" | "ADMIN";
export type AccountStatus = "ACTIVE" | "SUSPENDED" | "DEACTIVATED";
export type MailProviderType = "GMAIL" | "MICROSOFT";

export interface DbUser {
  id: string;
  email: string;
  displayName: string;
  profileImage?: string | null;
  role: UserRole;
  accountStatus: AccountStatus;
  createdAt: string;
  lastLoginAt: string;
  updatedAt?: string;
}

export interface DbSession {
  id: string; // Session token
  userId: string;
  createdAt: string;
  expiresAt: string;
}

export interface DbConnectedAccount {
  id: string;
  userId: string;
  provider: MailProviderType;
  emailAddress: string;
  gmailAddress?: string; // backwards compatibility alias for emailAddress
  encryptedRefreshToken: string;
  encryptedAccessToken?: string | null;
  tokenExpiresAt?: number | null;
  scope: string;
  status: "CONNECTED" | "DISCONNECTED" | "ERROR";
  connectedAt: string;
  lastSynchronizedAt?: string | null;
  error?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

// Backwards compatibility interface for Gmail
export interface DbGmailConnection {
  id: string;
  userId: string;
  provider?: MailProviderType;
  emailAddress?: string;
  gmailAddress: string;
  encryptedRefreshToken: string;
  encryptedAccessToken?: string | null;
  tokenExpiresAt?: number | null;
  scope: string;
  status: "CONNECTED" | "DISCONNECTED" | "ERROR";
  connectedAt: string;
  lastSynchronizedAt?: string | null;
  error?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface AttachmentMetadata {
  id: string;
  filename: string;
  mimeType: string;
  sizeBytes: number;
}

export interface DbLiveEmail {
  id: string;
  userId: string;
  provider?: MailProviderType;
  messageId: string;
  threadId?: string | null;
  sender: string;
  recipients?: string[] | string | null; // Array or JSON string
  subject: string;
  snippet?: string | null;
  bodyText: string;
  bodyHtml?: string | null;
  date: string;
  attachments?: AttachmentMetadata[] | string | null;
  labels?: string[] | string | null;
  unread?: boolean;
  sourceTrustLevel?: number;
  securityStatus: "SAFE" | "SUSPICIOUS" | "THREAT_DETECTED" | "BLOCKED" | "ANALYZING";
  urgencyLevel: "CRITICAL" | "NORMAL" | "INFORMATIONAL";
  isQuarantined: boolean;
  quarantineReason?: string | null;
  analyzedAt: string;
  rawMetadata?: Record<string, unknown> | null;
}

export interface DbAuditRecord {
  id: string;
  userId?: string | null;
  userEmail?: string | null;
  mode: "LIVE" | "DEMO";
  correlationId: string;
  eventType: string;
  source: string;
  threatCategory?: string | null;
  severity?: string | null;
  policyDecision?: string | null;
  finalOutcome?: string | null;
  dataJson: string;
  createdAt: string;
}
