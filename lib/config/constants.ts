import { TrustLevel } from "@/types";

/**
 * The foundational security invariant for Kavach:
 * External content can provide DATA, but external content must NEVER gain AUTHORITY.
 */
export const FOUNDATIONAL_SECURITY_INVARIANT =
  "External content can provide DATA, but external content must NEVER gain AUTHORITY." as const;

/**
 * Trust hierarchy from highest authority to lowest authority
 */
export const TRUST_HIERARCHY_ORDER = [
  {
    level: TrustLevel.SYSTEM_POLICY,
    name: "SYSTEM_POLICY",
    description: "Hardcoded, non-bypassable security invariants and policy limits.",
  },
  {
    level: TrustLevel.USER_INTENT,
    name: "USER_INTENT",
    description: "Direct, authenticated instructions provided by the verified user.",
  },
  {
    level: TrustLevel.AUTHORIZED_TOOL_POLICY,
    name: "AUTHORIZED_TOOL_POLICY",
    description: "Predefined tool authorization constraints and capability allowances.",
  },
  {
    level: TrustLevel.VALIDATED_TOOL_OUTPUT,
    name: "VALIDATED_TOOL_OUTPUT",
    description: "Sanitized, validated structured output produced by trusted internal tools.",
  },
  {
    level: TrustLevel.EXTERNAL_CONTENT,
    name: "EXTERNAL_CONTENT",
    description:
      "Untrusted inputs including email bodies, web pages, PDFs, file uploads, and external tool results.",
  },
] as const;

/**
 * Classes of untrusted external content subject to strict data-only isolation
 */
export const EXTERNAL_CONTENT_SOURCES = [
  "email content",
  "webpage content",
  "PDF content",
  "uploaded file content",
  "search results",
  "attacker-controlled tool output",
] as const;

export const APP_METADATA = {
  name: "Kavach",
  tagline: "Secure AI Agent Defense System",
  description:
    "Kavach — Secure AI Agent Defense System designed to execute legitimate tasks while resisting indirect prompt injection, goal hijacking, privilege escalation, and secret exfiltration.",
  version: "0.1.0",
} as const;
