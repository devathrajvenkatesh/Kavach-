/**
 * Possessed Butler - Core Security & Trust Hierarchy Types
 *
 * Foundational Security Invariant:
 * "External content can provide DATA, but external content must NEVER gain AUTHORITY."
 */

export enum TrustLevel {
  /** Top priority: hardcoded non-negotiable security guardrails */
  SYSTEM_POLICY = 5,
  /** Explicit instructions issued directly by authenticated user */
  USER_INTENT = 4,
  /** Explicit permission constraints governing tool execution */
  AUTHORIZED_TOOL_POLICY = 3,
  /** Verified and sanitized output from trusted internal tools */
  VALIDATED_TOOL_OUTPUT = 2,
  /** Untrusted external data: emails, web pages, PDFs, files, search outputs */
  EXTERNAL_CONTENT = 1,
}

export type TrustLevelName = keyof typeof TrustLevel;

export interface TrustContext {
  /** Unique context identifier */
  contextId: string;
  /** Request correlation ID tracking execution across layers */
  correlationId?: string;
  /** Explicit source label (e.g. 'user_terminal', 'email_attachment', 'web_fetch') */
  source: string;
  /** Trust hierarchy classification for this context */
  trustLevel: TrustLevel;
  /** Whether the source is authenticated as the legitimate user */
  isVerifiedUser: boolean;
  /** Origin domain, URI, or identifier if external */
  origin?: string;
  /** Taint tags tracked across operations (e.g. 'taint:external_email', 'taint:untrusted_pdf') */
  taintFlags: string[];
  /** Contextual metadata */
  metadata?: Record<string, unknown>;
}
