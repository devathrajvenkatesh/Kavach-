import { UrgencyTriage, ReplyDraft } from "@/types/agent";
import { FileSecurityStatus } from "@/types/file-workspace";
import { DetectedThreatSignal } from "@/types/threat";
import { TrustLevel } from "@/types";
import { MailProviderType } from "@/lib/db/schema";

export interface NormalizedAttachment {
  id: string;
  filename: string;
  mimeType: string;
  sizeBytes: number;
}

/**
 * Authoritative normalized EmailMessage structure.
 * Kavach security pipeline operates on this unified abstraction,
 * regardless of whether the email originated from Gmail or Microsoft Outlook/365.
 */
export interface EmailMessage {
  id: string;
  provider: MailProviderType;
  threadId: string;
  sender: string;
  recipients: string[];
  subject: string;
  timestamp: string; // ISO 8601 string
  snippet: string;
  bodyText: string;
  bodyHtml?: string;
  attachments: NormalizedAttachment[];
  labels: string[];
  unread: boolean;
  sourceTrustLevel: TrustLevel; // Always TrustLevel.EXTERNAL_UNTRUSTED (1)
}

/**
 * Analyzed Email Message after passing through Kavach Threat Analyzer,
 * Policy Engine, Urgency Evaluator, and Audit Logger.
 */
export interface AnalyzedEmailMessage extends EmailMessage {
  urgency: UrgencyTriage;
  securityStatus: FileSecurityStatus;
  isQuarantined: boolean;
  quarantineReason?: string;
  threatCategory?: string;
  threatSeverity?: "CRITICAL" | "HIGH" | "MEDIUM" | "LOW" | "NONE";
  signals: DetectedThreatSignal[];
  estimatedReadingTimeSeconds: number;
  requiresReply: boolean;
  replyDraft?: ReplyDraft;
  correlationId: string;
}

/**
 * Safe connection state for UI consumption (zero tokens or secrets).
 */
export interface AccountConnectionState {
  provider: MailProviderType;
  connected: boolean;
  emailAddress?: string | null;
  status: "CONNECTED" | "DISCONNECTED" | "ERROR";
  connectedAt?: string | null;
  lastSynchronizedAt?: string | null;
  error?: string | null;
  scope?: string | null;
}
