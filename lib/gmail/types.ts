import { UrgencyTriage, ReplyDraft } from "@/types/agent";
import { FileSecurityStatus } from "@/types/file-workspace";
import { DetectedThreatSignal } from "@/types/threat";

export interface GmailAttachmentMeta {
  id: string;
  filename: string;
  mimeType: string;
  sizeBytes: number;
}

export interface GmailMessageSummary {
  id: string;
  threadId: string;
  sender: string;
  subject: string;
  date: string;
  snippet: string;
  bodyText: string;
  hasAttachments: boolean;
  attachments: GmailAttachmentMeta[];
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

export interface GmailConnectionState {
  connected: boolean;
  gmailAddress?: string | null;
  status: "CONNECTED" | "DISCONNECTED" | "ERROR";
  connectedAt?: string | null;
  lastSynchronizedAt?: string | null;
  error?: string | null;
  scope?: string | null;
}
