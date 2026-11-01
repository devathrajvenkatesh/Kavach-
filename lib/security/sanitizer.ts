/**
 * Kavach - Authoritative Server-Side Security Sanitization Engine
 *
 * Single authoritative source for zero-secret redaction, API key scrubbing,
 * canary protection, and credential stripping across the entire defense chain.
 */

// Comprehensive regex patterns for sensitive secrets, credentials, tokens, and keys
export const SECRET_PATTERNS: RegExp[] = [
  /sk-[a-zA-Z0-9_-]{16,}/g, // Anthropic / OpenAI API keys
  /gsk_[a-zA-Z0-9_-]{20,}/g, // Groq API keys
  /AIza[0-9A-Za-z-_]{35}/g, // Google / Gemini API keys
  /AKIA[0-9A-Z]{16}/g, // AWS Access Key
  /ghp_[a-zA-Z0-9]{16,}/g, // GitHub Personal Access Token
  /xox[baprs]-[a-zA-Z0-9_-]+/g, // Slack token
  /-----BEGIN\s+(RSA|EC|OPENSSH|DSA|PGP|PRIVATE)\s+KEY-----[\s\S]*?-----END\s+(RSA|EC|OPENSSH|DSA|PGP|PRIVATE)\s+KEY-----/gi, // Cryptographic private keys
  /Bearer\s+[a-zA-Z0-9._~+/-]+=*/gi, // Bearer authentication tokens
  /(?:canary[_-]?(?:token|secret|tripwire|key)|sk-canary)[a-zA-Z0-9_-]*/gi, // Canary tripwire tokens
  /master(\x27s)?\s+(secret|canary|key|credential|token)/gi, // Master secret canary references
  /(\.env(\.local|\.production|\.development)?|\bcredentials\.json\b|\bid_rsa\b)/gi, // Sensitive file references
  /(?:password|passwd|secret|api_key|apikey|token|access_token)\s*[:=]\s*['"]?[^\s'";]+['"]?/gi, // Inline credential assignments
];

export const SENSITIVE_KEY_NAMES = [
  "password",
  "passwd",
  "secret",
  "token",
  "credential",
  "credentials",
  "apikey",
  "api_key",
  "privatekey",
  "private_key",
  "authorization",
  "auth",
  "access_token",
];

const METRIC_COUNT_KEYS = new Set([
  "unauthorizedexecutions",
  "secretaccessattempts",
  "confirmationbypassattempts",
  "totalevents",
  "attacksblocked",
  "benignallowed",
  "threatsdetected",
]);

/**
 * Sanitizes arbitrary text strings by replacing all secret patterns with [REDACTED_SECRET].
 */
export function sanitizeText(text: string): string {
  if (!text || typeof text !== "string") return "";
  let sanitized = text;
  for (const pattern of SECRET_PATTERNS) {
    sanitized = sanitized.replace(pattern, "[REDACTED_SECRET]");
  }
  return sanitized;
}

/**
 * Deep-sanitizes any object, array, or primitive data structure.
 * Replaces sensitive keys and string values matching secret patterns.
 * Explicitly preserves numerical telemetry count metrics.
 */
export function sanitizeObject(obj: unknown): unknown {
  if (obj === null || obj === undefined) return obj;
  if (typeof obj === "string") return sanitizeText(obj);
  if (typeof obj === "number" || typeof obj === "boolean") return obj;
  if (Array.isArray(obj)) return obj.map((item) => sanitizeObject(item));

  if (typeof obj === "object") {
    const cleaned: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(obj as Record<string, unknown>)) {
      const lowerKey = key.toLowerCase();
      const isMetricCount = METRIC_COUNT_KEYS.has(lowerKey);

      if (
        !isMetricCount &&
        typeof value !== "number" &&
        typeof value !== "boolean" &&
        SENSITIVE_KEY_NAMES.some((s) => lowerKey.includes(s))
      ) {
        cleaned[key] = "[REDACTED_SECRET]";
      } else {
        cleaned[key] = sanitizeObject(value);
      }
    }
    return cleaned;
  }
  return obj;
}
