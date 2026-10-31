/**
 * Kavach - Threat Detection Engine
 *
 * Comprehensive multi-layer detection for:
 * A. Direct Prompt Injection (jailbreaks, roleplay, system overrides)
 * B. Indirect Prompt Injection (markup injection, delimiter breakouts, embedded directives)
 * C. Goal Hijacking (semantic intent divergence, task substitution)
 * D. Secret / Data Exfiltration (API keys, private keys, .env, system prompt extraction, canary tokens)
 * E. Privilege Escalation (impersonation, confirmation bypass, trust level redefinition)
 * F. Tool Manipulation (unregistered tools, path traversal, injection metacharacters, malicious destinations)
 */

import {
  ThreatAssessment,
  DetectedThreatSignal,
  ThreatCategory,
  ThreatSeverity,
  ToolRequest,
  TrustContext,
} from "@/types";

// ============================================================================
// Detection Patterns & Signatures
// ============================================================================

export const DIRECT_INJECTION_PATTERNS: Array<{ regex: RegExp; indicator: string }> = [
  { regex: /ignore\s+(all\s+)?(\w+('s)?\s+)?(instructions|directives|rules|prompts|guidelines|constraints)/i, indicator: "Directive to ignore user, owner, or system instructions." },
  { regex: /ignore\s+(system\s+)?instructions/i, indicator: "Explicit directive to ignore system instructions." },
  { regex: /forget\s+(all\s+)?(your\s+)?(rules|instructions|constraints|guidelines)/i, indicator: "Command to forget system constraints." },
  { regex: /new\s+(system\s+)?(message|prompt|instructions):/i, indicator: "Attempt to inject a pseudo system prompt." },
  { regex: /system\s+(override|directive|command)\b/i, indicator: "System override directive." },
  { regex: /disregard\s+(all\s+)?(prior|previous|past)\s+(constraints|rules|instructions)/i, indicator: "Directive to disregard prior constraints." },
  { regex: /developer\s+(override|mode|access)\b/i, indicator: "Attempted developer mode override." },
  { regex: /pretend\s+(you\s+are|to\s+be)\s+(an?\s+)?(unrestricted|jailbroken|evil|unfiltered|malicious)?\s*(assistant|ai|bot|agent|version|without\s+rules)?/i, indicator: "Roleplay jailbreak attempt." },
  { regex: /\b(play|engage\s+in)\s+(a\s+)?(fictional\s+)?(roleplay|game|scenario|simulation)\b/i, indicator: "Roleplay / fictional scenario framing used to bypass guardrails." },
  { regex: /\b(you\s+play|roleplay\s+as|act\s+as|take\s+on\s+the\s+role\s+of)\s+['"]?([a-zA-Z0-9_\-\s]{2,30})['"]?/i, indicator: "Persona reassignment attempt attempting to assume unrestricted role." },
  { regex: /\bimagine\s+you\s+are\s+(an?\s+)?(evil|unrestricted|unfiltered|malicious|alternative)\s+version\b/i, indicator: "Adversarial persona assumption framing." },
  { regex: /\bno\s+(safety|security|canary|system|policy)\s*(rules|restrictions|filters|guardrails|constraints)\b/i, indicator: "Directive claiming safety rules or restrictions are removed." },
  { regex: /\b(safety|security|policy)\s+rules\s+are\s+(disabled|turned\s+off|not\s+applicable|waived|ignored)\b/i, indicator: "False assertion that security rules are disabled." },
  { regex: /\bwithout\s+(any\s+)?(safety|security|canary|policy)\s*(rules|restrictions|filters|guardrails)\b/i, indicator: "Attempt to strip safety constraints via framing." },
  { regex: /\b(bot|assistant|ai|agent|character|persona)\s+with\s+no\s+(safety|security|canary)\s*(rules|restrictions)\b/i, indicator: "Invocation of an unrestricted persona." },
  { regex: /\b(character|persona|bot)\s+who\s+is\s+allowed\s+to\s+(reveal|share|leak|print|output|read)\b/i, indicator: "Fictional roleplay framing claiming secret disclosure permission." },
  { regex: /bypass\s+(security|guardrails|safety|filters|policy)/i, indicator: "Explicit directive to bypass security controls." },
  { regex: /\b(DAN|do\s+anything\s+now)\b/i, indicator: "Classic jailbreak personality framing (DAN)." },
  { regex: /you\s+are\s+now\s+in\s+(maintenance|debug|administrator)\s+mode/i, indicator: "Fake maintenance/admin mode escalation." },
  { regex: /hypothetical\s+scenario\s+where\s+(rules|laws|security)\s+do\s+not\s+apply/i, indicator: "Hypothetical sandbox escape framing." },
];

export const INDIRECT_INJECTION_PATTERNS: Array<{ regex: RegExp; indicator: string }> = [
  { regex: /<\/?(system|admin|override|prompt|directive)[^>]*>/i, indicator: "Embedded XML/HTML pseudo-system tags." },
  { regex: /<!--\s*(system|security|admin)[^>]*-->/i, indicator: "HTML comment masquerading as system directive." },
  { regex: /\[SYSTEM\s+(ALERT|NOTICE|DIRECTIVE|INSTRUCTION|OVERRIDE)[^\]]*\]/i, indicator: "Bracketed system banner simulation." },
  { regex: /\b(system\s+directive|system\s+alert|system\s+instruction)\b/i, indicator: "System directive embedded in external content." },
  { regex: /<\/untrusted_external_data>/i, indicator: "Delimiter breakout attempt targeting boundary tags." },
  { regex: /!\[[^\]]*\]\((https?:\/\/[^\s)]+(\?|&)[^)]+)\)/i, indicator: "Markdown image data exfiltration trigger." },
  { regex: /base64\s*:\s*[A-Za-z0-9+/=]{40,}/i, indicator: "Embedded base64 encoded instruction block." },
];

export const GOAL_HIJACKING_PATTERNS: Array<{ regex: RegExp; indicator: string }> = [
  { regex: /\binstead\s*,?\s*(please\s+)?(send|forward|delete|wipe|execute|call|run|curl|fetch)/i, indicator: "Attempted task substitution using 'instead'." },
  { regex: /disregard\s+(the\s+)?user('s)?\s+(request|goal|prompt|task)/i, indicator: "Explicit directive to abandon user task." },
  { regex: /\b(new|updated|priority|override)\s+(instruction|directive|command|task|goal|rule)\s*:\s*/i, indicator: "Attempt to inject a new task or instruction directive." },
  { regex: /new\s+task\s*:\s*(abandon|replace|forget|switch)/i, indicator: "Attempted task substitution." },
  { regex: /the\s+user\s+(made\s+a\s+mistake|actually\s+wants\s+you\s+to|changed\s+their\s+mind)/i, indicator: "Deceptive claim that user changed their request." },
  { regex: /cancel\s+(the\s+)?(prior|previous|original)\s+(request|instruction|task)\s+and/i, indicator: "Attempt to cancel original user task." },
  { regex: /\bnow\s+(you\s+must|you\s+will|listen\s+to\s+me|follow\s+my\s+instructions)\b/i, indicator: "Forced compliance directive attempting task substitution." },
];

export const SECRET_EXFILTRATION_PATTERNS: Array<{ regex: RegExp; indicator: string }> = [
  { regex: /(\.env(\.local|\.production|\.development)?|\bcredentials\.json\b|\bid_rsa\b|\bid_ed25519\b)/i, indicator: "Attempt to access sensitive environment or key files." },
  { regex: /\b(sk-[a-zA-Z0-9_-]{20,}|AKIA[0-9A-Z]{16}|ghp_[a-zA-Z0-9]{36}|xox[baprs]-[a-zA-Z0-9_-]+)\b/, indicator: "Known API key format token detected." },
  { regex: /-----BEGIN\s+(RSA|EC|OPENSSH|DSA|PGP|PRIVATE)\s+KEY-----/, indicator: "Cryptographic private key header detected." },
  { regex: /(canary[\s_-]*(token|secret|tripwire|key)|sk-canary)/i, indicator: "Tripwire canary token detected." },
  { regex: /\b(master('s)?|owner('s)?|count\s+byteula('s)?)\s+(secret|canary|key|credential|token)\b/i, indicator: "Probe targeting owner/master confidential secrets." },
  { regex: /\b(print|reveal|output|display|show|send|leak|give|share)\s+.*?\b(canary|secret|token|password|private\s+key|credential)\b/i, indicator: "Explicit directive to extract or print confidential secret/canary." },
  { regex: /(repeat|output|print|reveal|display|leak)\s+(the\s+)?(instructions|system\s+prompt|initial\s+directive)\s+(above|verbatim)/i, indicator: "System prompt extraction probe." },
  { regex: /(read|access|exfiltrate|send|dump)\s+(passwords?|secrets?|tokens?|private_keys?|api_keys?)/i, indicator: "Explicit secret harvesting directive." },
];

export const PRIVILEGE_ESCALATION_PATTERNS: Array<{ regex: RegExp; indicator: string }> = [
  { regex: /(skip|bypass|disable)\s+(human\s+)?(confirmation|approval|verification)/i, indicator: "Attempt to bypass confirmation gate." },
  { regex: /(confirmation|approval)\s+is\s+(not\s+required|pre-approved|granted)/i, indicator: "Falsely claiming confirmation is pre-approved." },
  { regex: /\b(sudo|runas\s+root|grant\s+admin|elevate\s+privilege)\b/i, indicator: "Administrative privilege escalation request." },
  { regex: /(i\s+am|from:)\s+(the\s+)?(administrator|admin|system|security\s+team|it\s+department)\b/i, indicator: "Impersonation of administrative authority." },
  { regex: /["']?(trust_?level|trustlevel)["']?\s*(=|:)\s*["']?(5|system_policy|user_intent)["']?/i, indicator: "Attempt to redefine system trust level." },
  { regex: /(disable|override|turn\s+off)\s+(policy\s+engine|security\s+rules|invariant)/i, indicator: "Attempt to modify or disable security policy." },
];

export const TOOL_MANIPULATION_PATTERNS: Array<{ regex: RegExp; indicator: string }> = [
  { regex: /\.\.[\/\\]/, indicator: "Path traversal sequence (../) in parameter." },
  { regex: /[;&|`$]\s*(curl|wget|bash|sh|rm|cat|nc|python)\b/i, indicator: "Shell command injection sequence detected." },
  { regex: /@(evil\.com|attacker\.net|tempmail\.|disposable\.|shadowrealm\.net)/i, indicator: "Known malicious or disposable recipient domain." },
  { regex: /\bsend\s+(an\s+)?email\s+to\s+[^@\s]+@[^\s]+\s+containing\b/i, indicator: "Instruction to exfiltrate data via email to specified address." },
  { regex: /(webhook\.site|burpcollaborator|requestcatcher|ngrok\.io|pipedream\.net)/i, indicator: "Known exfiltration collector endpoint URL." },
];

export const CONTEXT_MANIPULATION_PATTERNS: Array<{ regex: RegExp; indicator: string }> = [
  { regex: /(-{2,}\s*(end|start)\s+of\s+(user|assistant|system|human|prompt|message|turn)\b|\[\s*(end|start)\s+of\s+(user|assistant|system|human|prompt|message|turn)\s*\])/i, indicator: "Simulated conversation boundary token attempting context breakout." },
  { regex: /\b(assistant|ai|bot|butler|system)\s*(response|reply|message)?\s*:\s*(understood|i\s+(will|understand|accept)|certainly|okay|sure|confirmed)/i, indicator: "Simulated dialogue turn injecting fake assistant compliance." },
  { regex: /###\s*(human|assistant|user|system|instruction)\b/i, indicator: "Simulated markdown turn boundary token." },
  { regex: /(human|assistant|user|system):\s*(i\s+will|i\s+must|please|now|ignore|send|delete|run|execute|read)\b/i, indicator: "Injected conversation turn boundary simulating dialogue role." },
  { regex: /<\|im_start\|>|<\|im_end\|>|<\|endoftext\|>/i, indicator: "ChatML or tokenizer delimiter injection." },
  { regex: /\[context\s+reset\]|\[end\s+of\s+session\]/i, indicator: "Fake context reset token." },
  { regex: /(ignore|forget)\s+everything\s+(above|prior\s+to\s+this)/i, indicator: "Context window wiping directive." },
  { regex: /(system\s+error\s*:\s*re-authenticate|debug\s+console\s*:\s*login)/i, indicator: "Simulated system diagnostic prompt injection." },
];

export const MULTI_STEP_PATTERNS: Array<{ regex: RegExp; indicator: string }> = [
  { regex: /(step\s*1\s*:.*step\s*2\s*:.*(send|exfil|leak|bypass|forward))/is, indicator: "Multi-stage sequential attack recipe." },
  { regex: /(first\s+read.*then\s+(send|forward|exfiltrate|delete))/i, indicator: "Multi-step read-then-exfiltrate sequence." },
  { regex: /(download|fetch).*and\s+(execute|run|install|wipe)/i, indicator: "Multi-step download and execute sequence." },
];

// ============================================================================
// Threat Analyzer Implementation
// ============================================================================

export interface ToolEvaluationContext {
  toolRequest: ToolRequest;
  userObjective: string;
  trustContext: TrustContext;
}

export class ThreatAnalyzer {
  /**
   * Scans arbitrary text content (e.g. email bodies, webpage DOMs, prompts)
   */
  analyzeContent(
    targetContentId: string,
    content: string,
    depth: number = 0
  ): ThreatAssessment {
    const signals: DetectedThreatSignal[] = [];
    const normalized = this.normalizeContent(content);

    // A. Direct Prompt Injection Scan
    this.scanPatterns(
      normalized,
      DIRECT_INJECTION_PATTERNS,
      "DIRECT_PROMPT_INJECTION",
      "CRITICAL",
      0.95,
      signals
    );

    // B. Indirect Prompt Injection Scan
    this.scanPatterns(
      content, // keep case and markup for tags
      INDIRECT_INJECTION_PATTERNS,
      "INDIRECT_PROMPT_INJECTION",
      "CRITICAL",
      0.9,
      signals
    );

    // C. Goal Hijacking Scan
    this.scanPatterns(
      normalized,
      GOAL_HIJACKING_PATTERNS,
      "GOAL_HIJACKING",
      "HIGH",
      0.88,
      signals
    );

    // D. Secret Exfiltration Scan
    this.scanPatterns(
      content,
      SECRET_EXFILTRATION_PATTERNS,
      "SECRET_EXFILTRATION",
      "CRITICAL",
      0.95,
      signals
    );

    // E. Privilege Escalation Scan
    this.scanPatterns(
      normalized,
      PRIVILEGE_ESCALATION_PATTERNS,
      "PRIVILEGE_ESCALATION",
      "HIGH",
      0.9,
      signals
    );

    // F. Tool Manipulation Scan
    this.scanPatterns(
      content,
      TOOL_MANIPULATION_PATTERNS,
      "TOOL_MANIPULATION",
      "CRITICAL",
      0.92,
      signals
    );

    // G. Context Manipulation Scan
    this.scanPatterns(
      normalized,
      CONTEXT_MANIPULATION_PATTERNS,
      "CONTEXT_MANIPULATION",
      "HIGH",
      0.9,
      signals
    );

    // H. Multi-Step / Mixed Attack Scan
    this.scanPatterns(
      content,
      MULTI_STEP_PATTERNS,
      "MULTI_STEP_ATTACK",
      "CRITICAL",
      0.92,
      signals
    );

    // I. Base64 Concealed Payload Inspection (Decode for inspection != execute)
    if (depth < 2) {
      this.scanBase64ConcealedPayloads(content, targetContentId, depth, signals);
    }

    return this.buildAssessment(targetContentId, signals);
  }

  private scanBase64ConcealedPayloads(
    content: string,
    targetContentId: string,
    depth: number,
    targetList: DetectedThreatSignal[]
  ): void {
    const base64CandidateRegex = /(?:^|\s|["'`>])([A-Za-z0-9+/]{20,}={0,2})(?:\s|$|["'`<])/g;
    let b64Match: RegExpExecArray | null;

    while ((b64Match = base64CandidateRegex.exec(content)) !== null) {
      const candidate = b64Match[1];
      try {
        const decoded = Buffer.from(candidate, "base64").toString("utf-8");
        // Verify decoded string is plausible readable text (ASCII / UTF-8 printable)
        if (/^[\x20-\x7E\r\n\t]{8,}$/.test(decoded)) {
          const decodedAssessment = this.analyzeContent(
            `${targetContentId}_b64_${depth + 1}`,
            decoded,
            depth + 1
          );

          if (decodedAssessment.isThreatDetected) {
            targetList.push({
              category: "INDIRECT_PROMPT_INJECTION",
              severity: "CRITICAL",
              confidence: 0.98,
              indicator: `Concealed Base64 payload contains malicious directive: ${decodedAssessment.signals.map((s) => s.indicator).join("; ")}`,
              evidenceSnippet: candidate.slice(0, 45) + "...",
            });

            for (const sig of decodedAssessment.signals) {
              targetList.push(sig);
            }
          }
        }
      } catch {
        // Skip un-decodable tokens
      }
    }
  }

  /**
   * Evaluates a ToolRequest in the context of authenticated user intent
   */
  analyzeToolRequest(context: ToolEvaluationContext): ThreatAssessment {
    const { toolRequest, userObjective, trustContext } = context;
    const rawParameters = JSON.stringify(toolRequest.parameters);

    // Start with general parameter content scan
    const baseAssessment = this.analyzeContent(toolRequest.id, rawParameters);
    const signals = [...baseAssessment.signals];

    const normalizedGoal = userObjective.toLowerCase();
    const toolName = toolRequest.toolName;

    // 1. Contextual Goal Hijacking: Check if action deviates sharply from user intent
    if (toolName === "send_email") {
      const userAuthorizedEmail =
        normalizedGoal.includes("send email") ||
        normalizedGoal.includes("forward to") ||
        normalizedGoal.includes("compose") ||
        normalizedGoal.includes("email to");

      if (!userAuthorizedEmail) {
        signals.push({
          category: "GOAL_HIJACKING",
          severity: "CRITICAL",
          confidence: 0.95,
          indicator: `Tool "${toolName}" was invoked, but user only requested: "${userObjective}". Goal hijacking detected.`,
          evidenceSnippet: rawParameters.slice(0, 150),
          ruleId: "THREAT-GH-001",
        });
      }
    }

    if (toolName === "edit_file") {
      const userAuthorizedEdit =
        normalizedGoal.includes("edit") ||
        normalizedGoal.includes("write") ||
        normalizedGoal.includes("modify") ||
        normalizedGoal.includes("update file");

      if (!userAuthorizedEdit) {
        signals.push({
          category: "GOAL_HIJACKING",
          severity: "HIGH",
          confidence: 0.9,
          indicator: `File mutation tool "${toolName}" was invoked without explicit user request.`,
          evidenceSnippet: rawParameters.slice(0, 150),
          ruleId: "THREAT-GH-002",
        });
      }
    }

    // 2. Secret Exfiltration: Check if reading sensitive file paths
    if (toolName === "read_file") {
      const pathArg = String(toolRequest.parameters?.path || "").toLowerCase();
      if (
        pathArg.includes(".env") ||
        pathArg.includes("id_rsa") ||
        pathArg.includes("credentials") ||
        pathArg.includes("secret")
      ) {
        signals.push({
          category: "SECRET_EXFILTRATION",
          severity: "CRITICAL",
          confidence: 0.98,
          indicator: `Tool read_file requested protected credential path: "${pathArg}".`,
          evidenceSnippet: pathArg,
          ruleId: "THREAT-EXFIL-001",
        });
      }
    }

    // 3. Untrusted Origin Authority Escalation
    if (trustContext.trustLevel === 1 && toolName !== "read_email" && toolName !== "fetch_webpage" && toolName !== "read_pdf") {
      signals.push({
        category: "PRIVILEGE_ESCALATION",
        severity: "CRITICAL",
        confidence: 0.95,
        indicator: `Untrusted external content attempted to initiate consequential tool "${toolName}".`,
        ruleId: "THREAT-PE-001",
      });
    }

    return this.buildAssessment(toolRequest.id, signals);
  }

  // ==========================================================================
  // Helper Methods
  // ==========================================================================

  private normalizeContent(content: string): string {
    return content
      .normalize("NFKD")
      .toLowerCase()
      // Normalize zero-width, soft hyphens, and invisible formatting characters
      .replace(/[\u200B-\u200D\uFEFF\u00AD\u2060\u180E]/g, "")
      // Normalize multi-spaces
      .replace(/\s+/g, " ");
  }

  private scanPatterns(
    text: string,
    patterns: Array<{ regex: RegExp; indicator: string }>,
    category: ThreatCategory,
    severity: ThreatSeverity,
    confidence: number,
    targetList: DetectedThreatSignal[]
  ): void {
    for (const pat of patterns) {
      const match = text.match(pat.regex);
      if (match) {
        targetList.push({
          category,
          severity,
          confidence,
          indicator: pat.indicator,
          evidenceSnippet: match[0],
        });
      }
    }
  }

  private buildAssessment(
    targetContentId: string,
    signals: DetectedThreatSignal[]
  ): ThreatAssessment {
    const isThreatDetected = signals.length > 0;

    let overallThreatLevel: ThreatSeverity = "NONE";
    if (signals.some((s) => s.severity === "CRITICAL")) {
      overallThreatLevel = "CRITICAL";
    } else if (signals.some((s) => s.severity === "HIGH")) {
      overallThreatLevel = "HIGH";
    } else if (signals.some((s) => s.severity === "MEDIUM")) {
      overallThreatLevel = "MEDIUM";
    } else if (signals.some((s) => s.severity === "LOW")) {
      overallThreatLevel = "LOW";
    }

    // Calculate composite risk score
    let riskScore = 0.05;
    if (isThreatDetected) {
      if (overallThreatLevel === "CRITICAL") riskScore = 0.95;
      else if (overallThreatLevel === "HIGH") riskScore = 0.8;
      else if (overallThreatLevel === "MEDIUM") riskScore = 0.5;
      else riskScore = 0.25;
    }

    const explanation = isThreatDetected
      ? `Threat detected (${overallThreatLevel}): ${signals.map((s) => s.indicator).join(" ")}`
      : "No security threat signatures detected. Content conforms to safety parameters.";

    return {
      id: `threat_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      targetContentId,
      overallThreatLevel,
      riskScore,
      isThreatDetected,
      signals,
      explanation,
      analyzedAt: new Date().toISOString(),
    };
  }
}

export const defaultThreatAnalyzer = new ThreatAnalyzer();
