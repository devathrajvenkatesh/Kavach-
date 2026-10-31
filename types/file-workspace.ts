/**
 * Kavach - Secure File Workspace Types
 *
 * Defines contracts for untrusted file ingestion, security inspection,
 * Drive-style workspace categorization, and threat assessments.
 */

import { ThreatCategory, ThreatSeverity, DetectedThreatSignal } from "./threat";

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
}

export interface FileUploadProgress {
  fileName: string;
  progressPercent: number; // 0 - 100
  status: "uploading" | "parsing" | "analyzing" | "completed" | "error";
  errorMessage?: string;
}
