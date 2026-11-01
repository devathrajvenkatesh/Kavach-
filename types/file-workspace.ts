/**
 * Kavach - Secure File Workspace Types
 *
 * Defines contracts for untrusted file ingestion, security inspection,
 * Drive-style workspace categorization, and threat assessments.
 */

import { ThreatCategory, ThreatSeverity, DetectedThreatSignal } from "./threat";
import { UrgencyTriage, ReplyDraft } from "./agent";

export type FileSecurityStatus =
  | "SAFE"
  | "SUSPICIOUS"
  | "THREAT_DETECTED"
  | "BLOCKED"
  | "ANALYZING";

export type WorkspaceFolder =
  | "All"
  | "Safe Samples"
  | "Attack Samples"
  | "Unknown / Unclassified";

export interface DocumentIntelligence {
  fileName: string;
  fileType: string;
  contentSummary: string;
  importantInfoExtracted: Record<string, string>;
  suggestedNextSteps: string[];
}

export interface SecurityIntelligence {
  classification: "BENIGN" | "MALICIOUS";
  riskLevel: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  attackType: string;
  suspiciousInstructionDetails: string;
  detectionStatus: "Detected" | "Clean / Pass";
}

export interface ActionControl {
  proposedAction: string;
  permissionDecision: "ALLOWED" | "DENIED" | "APPROVAL REQUIRED";
  executionStatus: "Executed" | "Blocked" | "Held for Confirmation";
  reason: string;
}


export interface WorkspaceFile {
  id: string;
  name: string;
  type: "PDF" | "Email" | "Text" | "Spreadsheet" | "JSON" | "Document";
  mimeType: string;
  sizeBytes: number;
  formattedSize: string;
  folder: string;
  uploadedAt: string;
  securityStatus: FileSecurityStatus;
  riskLevel: ThreatSeverity;
  threatCategory?: ThreatCategory | string;
  summary: string;
  signals: DetectedThreatSignal[];
  extractedPreview: string;
  correlationId: string;
  analyzedAt: string;
  pageCount?: number;
  lineCount?: number;
  sourceOrigin?: string;
  documentIntelligence?: DocumentIntelligence;
  securityIntelligence?: SecurityIntelligence;
  actionControl?: ActionControl;
  urgency?: UrgencyTriage;
  replyDraft?: ReplyDraft;
  isQuarantined?: boolean;
  quarantineReason?: string;
}


export interface FileUploadProgress {
  fileName: string;
  progressPercent: number; // 0 - 100
  status: "uploading" | "parsing" | "analyzing" | "completed" | "error";
  errorMessage?: string;
}
