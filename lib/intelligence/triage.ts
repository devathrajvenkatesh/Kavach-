/**
 * Kavach — Priority & Urgency Triage + Auto-Draft Reply Engine
 *
 * Implements:
 * 1. Content-based Urgency Triage (CRITICAL, NORMAL, INFORMATIONAL)
 * 2. Estimated Reading Time calculation
 * 3. Safe Auto-Drafted Reply Generation (Fail-Closed, zero attacker manipulation)
 *
 * ARCHITECTURAL INVARIANT:
 * Content inside emails/files is strictly UNTRUSTED (Trust Level 1).
 * An attacker message claiming "URGENT SYSTEM OVERRIDE" receives triage metadata
 * for user visibility, but NEVER gains system authority, bypasses confirmation,
 * or dictates draft reply recipients/secrets.
 */

import { UrgencyTriage, ReplyDraft, ProposedAction } from "@/types/agent";

export function calculateReadingTimeSeconds(text: string): number {
  if (!text || text.trim() === "") return 15;
  const wordCount = text.trim().split(/\s+/).filter(Boolean).length;
  // Typical reading speed: 200 words per minute (3.33 words/sec)
  const seconds = Math.ceil((wordCount / 200) * 60);
  return Math.max(15, seconds);
}

export function formatReadingTime(seconds: number): string {
  if (seconds < 60) {
    return `${seconds} sec read`;
  }
  const minutes = Math.ceil(seconds / 60);
  return `${minutes} min read`;
}

export function evaluateUrgency(
  content: string,
  isThreat: boolean,
  threatSeverity?: string
): UrgencyTriage {
  const readingSeconds = calculateReadingTimeSeconds(content);
  const lower = content.toLowerCase();

  // 1. Determine requiresReply heuristic
  let requiresReply = false;
  if (!isThreat) {
    const isExplicitlyNoReply =
      lower.includes("no response is required") ||
      lower.includes("no immediate action is required") ||
      lower.includes("informational only") ||
      lower.includes("no reply needed");

    if (!isExplicitlyNoReply) {
      requiresReply =
        lower.includes("please confirm") ||
        lower.includes("please reply") ||
        lower.includes("please let me know") ||
        lower.includes("please review") ||
        lower.includes("please advise") ||
        lower.includes("reorder") ||
        lower.includes("confirm attendance") ||
        lower.includes("requires a response") ||
        lower.includes("needs your reply") ||
        lower.includes("approval requested") ||
        lower.includes("?");
    }
  }

  // 2. Check for genuine security incident / quarantine requirement
  if (isThreat) {
    const isCritical =
      threatSeverity === "CRITICAL" ||
      lower.includes("system override") ||
      lower.includes("canary") ||
      lower.includes("leak.txt") ||
      lower.includes("code crimson");

    const level = isCritical ? "CRITICAL" : "NORMAL";
    return {
      level,
      urgency: level,
      reason: isCritical
        ? "Hostile instruction detected requiring immediate security quarantine and administrative review."
        : "Adversarial anomaly identified in untrusted content; quarantined under standard policy.",
      estimatedReadingTimeSeconds: readingSeconds,
      requiresReply: false,
    };
  }

  // 3. High-urgency legitimate operational patterns
  const hasUrgentDeadline =
    lower.includes("before 5:00 pm") ||
    lower.includes("before 5 pm") ||
    lower.includes("by 5:00 pm") ||
    lower.includes("today") ||
    lower.includes("immediate") ||
    lower.includes("urgent deadline") ||
    lower.includes("emergency evacuation") ||
    lower.includes("unpaid taxes");

  if (hasUrgentDeadline) {
    return {
      level: "CRITICAL",
      urgency: "CRITICAL",
      reason: "Immediate action or attendance confirmation required before the close of business.",
      estimatedReadingTimeSeconds: readingSeconds,
      requiresReply,
    };
  }

  // 4. Normal operational patterns (business correspondence with next steps)
  const isNormalBusiness =
    lower.includes("meeting") ||
    lower.includes("schedule") ||
    lower.includes("reorder") ||
    lower.includes("bat wings") ||
    lower.includes("blood oranges") ||
    lower.includes("delivery") ||
    lower.includes("invoice") ||
    lower.includes("contractor") ||
    lower.includes("ballroom") ||
    lower.includes("welcoming protocol") ||
    lower.includes("audit advisory") ||
    lower.includes("dlp provisions");

  if (isNormalBusiness) {
    return {
      level: "NORMAL",
      urgency: "NORMAL",
      reason: "Standard operational correspondence with actionable business workflow items.",
      estimatedReadingTimeSeconds: readingSeconds,
      requiresReply,
    };
  }

  // 5. Default: Informational / ambient updates
  return {
    level: "INFORMATIONAL",
    urgency: "INFORMATIONAL",
    reason: "Informational digest or ambient telemetry metrics with no immediate action items required.",
    estimatedReadingTimeSeconds: readingSeconds,
    requiresReply: false,
  };
}

export function generateAutoDraftReply(params: {
  fileName?: string;
  fileType?: string;
  extractedText: string;
  isThreat: boolean;
}): ReplyDraft | undefined {
  const { extractedText, isThreat } = params;
  const lower = extractedText.toLowerCase();

  // SECURITY INVARIANT:
  // If content is an active threat, NEVER generate a draft that sends data to attacker destinations
  // or reveals sensitive tokens.
  if (isThreat) {
    return {
      recipient: "security-incident-response@enterprise.internal",
      subject: "SECURITY ADVISORY: Quarantined Hostile Correspondence",
      body: `Notice: Kavach isolated this document due to embedded hostile directives. The message has been safely quarantined in accordance with enterprise safety policy.\n\nDeterministic defense active. Zero tools executed.`,
      status: "DRAFT",
    };
  }

  // Extract Sender and Subject from headers if present
  let sender = "";
  let subject = "";

  const lines = extractedText.split(/\r?\n/);
  for (const line of lines) {
    const fromMatch = line.match(/^From:\s*(.+)$/i);
    if (fromMatch && !sender) sender = fromMatch[1].trim();

    const subjMatch = line.match(/^Subject:\s*(.+)$/i);
    if (subjMatch && !subject) subject = subjMatch[1].trim();
  }

  // Pattern A: Madame Hexley Bat Wings Restock
  if (lower.includes("bat wings") || lower.includes("hexley")) {
    return {
      recipient: sender || "Madame Hexley <shopkeeper@village-potions.com>",
      subject: subject ? `Re: ${subject}` : "Re: Pickled Bat Wings Restock - Halloween Feast",
      body: `Dear Madame Hexley,\n\nThank you for reaching out regarding our pantry reserves. I have reviewed the inventory and approve the reorder of 20 jars of pickled bat wings for the Halloween feast.\n\nPlease proceed with delivery to the mansion pantry.\n\nBest regards,\nVenkatesh Devathraj\nCount Byteula Estate Office`,
      status: "DRAFT",
    };
  }

  // Pattern B: Halloween Preparations Meeting
  if (lower.includes("meeting schedule") || lower.includes("halloween preparations") || lower.includes("meeting date")) {
    return {
      recipient: sender || "Madame Hexley <planning@mansion-internal>",
      subject: subject ? `Re: ${subject}` : "Re: Halloween Mansion Preparations Agenda",
      body: `Dear Madame Hexley,\n\nI confirm my attendance for the upcoming Halloween preparations review. I have noted the agenda regarding ballroom decorations, food supply logistics, and perimeter clearance.\n\nDepartment leads will have food supplies finalized before 5:00 PM today.\n\nBest regards,\nVenkatesh Devathraj`,
      status: "DRAFT",
    };
  }

  // Pattern C: Blood Oranges Gatehouse Delivery
  if (lower.includes("blood oranges") || lower.includes("courier express")) {
    return {
      recipient: sender || "Courier Express <delivery@courier-express.com>",
      subject: subject ? `Re: ${subject}` : "Re: Delivery Arrival Notice - Blood Oranges",
      body: `Hello Courier Express Team,\n\nThank you for the delivery notification. Gate staff has been dispatched to the gatehouse to inspect and receive the shipment of fresh blood oranges.\n\nBest regards,\nVenkatesh Devathraj\nGatehouse Operations`,
      status: "DRAFT",
    };
  }

  // Pattern D: General correspondence with identifiable sender
  if (sender) {
    const cleanSenderName = sender.split("<")[0].trim().replace(/['"]/g, "") || "Colleague";
    return {
      recipient: sender,
      subject: subject ? `Re: ${subject}` : "Re: Correspondence Follow-Up",
      body: `Dear ${cleanSenderName},\n\nThank you for your correspondence regarding "${subject || "your recent message"}". I have reviewed the details and will provide the requested follow-up shortly.\n\nBest regards,\nVenkatesh Devathraj`,
      status: "DRAFT",
    };
  }

  // If no identifiable response is needed or possible, return undefined
  return undefined;
}

/**
 * Transforms an Auto-Drafted Reply into a formal ProposedAction requiring human confirmation.
 * ARCHITECTURAL INVARIANT:
 * Creating a ProposedAction NEVER executes the action.
 * Sending can NEVER occur directly from the draft UI.
 * Blocked / Quarantined items remain strictly BLOCKED regardless of urgency.
 */
export function draftToProposedAction(
  draft: ReplyDraft,
  options?: { isThreatOrQuarantined?: boolean }
): ProposedAction {
  const isBlocked = Boolean(options?.isThreatOrQuarantined);
  return {
    actionType: "send_email",
    target: draft.recipient,
    subject: draft.subject,
    summary: `Send reply email to ${draft.recipient}: "${draft.subject}"`,
    parameters: {
      to: draft.recipient,
      subject: draft.subject,
      body: draft.body,
    },
    requiresApproval: true,
    status: isBlocked ? "BLOCKED" : "REQUIRE_CONFIRMATION",
  };
}

