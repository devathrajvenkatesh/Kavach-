/**
 * Kavach — Provider Error & Quota Handling
 *
 * Implements safe, user-friendly provider error parsing and formatting.
 *
 * ARCHITECTURAL INVARIANT:
 * Provider infrastructure errors (e.g. quota limits, rate limits, network drops)
 * must NEVER be classified as security attacks or threats, must NEVER display
 * "Threat Quarantined", must NEVER expose raw JSON or internal stack traces,
 * while strictly preserving fail-closed behavior (0 tool executions).
 */

export interface ParsedProviderError {
  isProviderError: boolean;
  errorType:
    | "QUOTA_EXCEEDED"
    | "RATE_LIMIT"
    | "NETWORK_ERROR"
    | "SERVICE_UNAVAILABLE"
    | "CONFIG_ERROR"
    | "GENERAL_PROVIDER_ERROR";
  userMessage: string;
  retryTimeFormatted?: string;
}

/**
 * Parses seconds or duration into a concise human-readable format.
 * E.g., 15781s -> "4h 23m", 120s -> "2m", 45s -> "45s"
 */
export function formatRetryDuration(seconds: number): string {
  if (isNaN(seconds) || seconds <= 0) return "";
  if (seconds >= 3600) {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return minutes > 0 ? `${hours}h ${minutes}m` : `${hours}h`;
  }
  if (seconds >= 60) {
    const minutes = Math.floor(seconds / 60);
    const remainingSecs = seconds % 60;
    return remainingSecs > 0 ? `${minutes}m ${remainingSecs}s` : `${minutes}m`;
  }
  return `${seconds}s`;
}

/**
 * Extracts retry duration from error text or structure.
 */
export function extractRetryDelay(errorText: string): string | undefined {
  // Pattern 1: Google GenAI retryDelay in seconds, e.g. "retryDelay": "15781s" or "15781"
  const delayMatch =
    errorText.match(/"retryDelay":\s*"(\d+)s?"/i) ||
    errorText.match(/"retryDelay":\s*(\d+)/i);
  if (delayMatch && delayMatch[1]) {
    const secs = parseInt(delayMatch[1], 10);
    const formatted = formatRetryDuration(secs);
    if (formatted) return formatted;
  }

  // Pattern 2: "retry in 4h23m1.06s" or "retry in 3h 42m"
  const humanRetryMatch = errorText.match(
    /retry (?:in|after) (?:approximately )?(\d+\s*h)?\s*(\d+\s*m)?\s*(\d+(?:\.\d+)?\s*s)?/i
  );
  if (humanRetryMatch) {
    const parts: string[] = [];
    if (humanRetryMatch[1]) parts.push(humanRetryMatch[1].trim());
    if (humanRetryMatch[2]) parts.push(humanRetryMatch[2].trim());
    if (!humanRetryMatch[1] && !humanRetryMatch[2] && humanRetryMatch[3]) {
      parts.push(humanRetryMatch[3].trim());
    }
    if (parts.length > 0) {
      return parts.join(" ");
    }
  }

  // Pattern 3: "try again in 20s" or "try again in 5 minutes"
  const tryAgainMatch = errorText.match(
    /try again in (\d+)\s*(s|sec|seconds|m|min|minutes|h|hours)/i
  );
  if (tryAgainMatch) {
    const val = parseInt(tryAgainMatch[1], 10);
    const unit = tryAgainMatch[2].toLowerCase();
    if (unit.startsWith("h")) return formatRetryDuration(val * 3600);
    if (unit.startsWith("m")) return formatRetryDuration(val * 60);
    return formatRetryDuration(val);
  }

  return undefined;
}

/**
 * Authoritative provider error classifier.
 * Evaluates whether an error represents a provider infrastructure failure
 * and produces a clean, user-safe message without exposing internal details.
 */
export function parseProviderError(err: unknown): ParsedProviderError | null {
  if (!err) return null;

  let errStr = "";
  if (typeof err === "string") {
    errStr = err;
  } else if (err instanceof Error) {
    errStr = err.message;
  } else if (typeof err === "object") {
    try {
      errStr = JSON.stringify(err);
    } catch {
      errStr = String(err);
    }
  }

  const lower = errStr.toLowerCase();

  // 1. Quota Exceeded / Resource Exhausted / Rate Limit
  const isQuota =
    lower.includes("resource_exhausted") ||
    lower.includes("quota exceeded") ||
    lower.includes("quota failure") ||
    lower.includes("generativelanguage.googleapis.com") ||
    (lower.includes("quota") && lower.includes("limit"));

  const isRateLimit =
    lower.includes("rate limit") ||
    lower.includes("rate_limit") ||
    lower.includes("ratelimit") ||
    lower.includes("too many requests") ||
    lower.includes("code\": 429") ||
    lower.includes("code\":429") ||
    lower.includes("status 429") ||
    lower.includes("status: 429") ||
    lower.includes("http 429");

  if (isQuota || isRateLimit) {
    const retryFormatted = extractRetryDelay(errStr);
    const retrySuffix = retryFormatted
      ? ` Retry available in approximately ${retryFormatted}.`
      : "";
    return {
      isProviderError: true,
      errorType: isQuota ? "QUOTA_EXCEEDED" : "RATE_LIMIT",
      userMessage: `AI processing is temporarily unavailable because the model provider has reached its request limit. No action was executed.${retrySuffix}`,
      retryTimeFormatted: retryFormatted,
    };
  }

  // 2. Network / Connection Errors
  const isNetwork =
    lower.includes("econnrefused") ||
    lower.includes("enotfound") ||
    lower.includes("etimedout") ||
    lower.includes("fetch failed") ||
    lower.includes("socket hang up") ||
    lower.includes("network error") ||
    lower.includes("aborterror");

  if (isNetwork) {
    return {
      isProviderError: true,
      errorType: "NETWORK_ERROR",
      userMessage:
        "AI processing is temporarily unavailable due to a network connection issue with the model provider. No action was executed.",
    };
  }

  // 3. Service Unavailable / Server Errors (503 / 502 / 504 / UNAVAILABLE)
  const isServiceUnavailable =
    lower.includes("503 service unavailable") ||
    lower.includes("code\": 503") ||
    lower.includes("code\":503") ||
    lower.includes("status\": \"unavailable\"") ||
    lower.includes("status\":\"unavailable\"") ||
    lower.includes("bad gateway") ||
    lower.includes("gateway timeout");

  if (isServiceUnavailable) {
    return {
      isProviderError: true,
      errorType: "SERVICE_UNAVAILABLE",
      userMessage:
        "AI processing is temporarily unavailable because the model service is currently unreachable. No action was executed.",
    };
  }

  // 4. Configuration Errors
  if (
    lower.includes("configurationerror") ||
    lower.includes("api_key is missing") ||
    lower.includes("api key is missing")
  ) {
    return {
      isProviderError: true,
      errorType: "CONFIG_ERROR",
      userMessage:
        "AI processing is unavailable due to a model provider configuration error. No action was executed.",
    };
  }

  // 5. Check if it's a known provider error class or API error
  if (
    lower.includes("googleauth") ||
    lower.includes("googlegenerativeaierror") ||
    lower.includes("groqerror") ||
    lower.includes("openaierror") ||
    lower.includes("anthropicerror")
  ) {
    return {
      isProviderError: true,
      errorType: "GENERAL_PROVIDER_ERROR",
      userMessage:
        "AI processing is temporarily unavailable from the model provider. No action was executed.",
    };
  }

  // Not a recognized provider error
  return null;
}
