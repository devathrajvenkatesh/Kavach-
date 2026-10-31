/**
 * Possessed Butler - Deterministic Policy Rules
 *
 * Enforces the trust hierarchy:
 * SYSTEM POLICY > USER INTENT > AUTHORIZED TOOL POLICY > VALIDATED TOOL OUTPUT > EXTERNAL CONTENT
 *
 * Strict outcomes: APPROVE | BLOCK | REQUIRE_CONFIRMATION
 */

import {
  ToolRequest,
  ToolMetadata,
  TrustContext,
  PolicyRuleMatch,
} from "@/types";

export interface PolicyEvaluationContext {
  toolRequest: ToolRequest;
  toolMetadata: ToolMetadata;
  trustContext: TrustContext;
  userObjective: string;
  hasTaintedParameters: boolean;
}

export interface SecurityPolicyRule {
  id: string;
  name: string;
  description: string;
  evaluate: (ctx: PolicyEvaluationContext) => PolicyRuleMatch | null;
}

export const SENSITIVE_PATHS = [".env", ".env.local", "id_rsa", "credentials.json", "secrets.json", "/etc/passwd"];

export const BUILTIN_POLICY_RULES: SecurityPolicyRule[] = [
  // 1. Secret Protection & Sensitive File Access Rule
  {
    id: "SEC-RULE-001",
    name: "SENSITIVE_RESOURCE_ACCESS_DENIED",
    description: "Blocks any attempt to read or modify sensitive environment files, keys, or credentials.",
    evaluate: (ctx) => {
      const pathParam = String(ctx.toolRequest.parameters?.path || "").toLowerCase();
      const rawParams = JSON.stringify(ctx.toolRequest.parameters).toLowerCase();

      for (const sensitive of SENSITIVE_PATHS) {
        if (
          pathParam.includes(sensitive) ||
          rawParams.includes("canary_token") ||
          rawParams.includes("private_key")
        ) {
          return {
            ruleId: "SEC-RULE-001",
            ruleName: "SENSITIVE_RESOURCE_ACCESS_DENIED",
            description: `Attempted access to protected resource: "${sensitive}". Access denied by System Policy.`,
            action: "BLOCK",
            severity: "CRITICAL",
          };
        }
      }
      return null;
    },
  },

  // 2. Goal Hijacking & Unauthorized Directive Detection Rule
  {
    id: "SEC-RULE-002",
    name: "GOAL_HIJACKING_PREVENTION",
    description: "Blocks tool calls where external content attempts to override the user's root objective.",
    evaluate: (ctx) => {
      const userGoal = ctx.userObjective.toLowerCase();
      const toolName = ctx.toolRequest.toolName;

      // If tool is state-mutating or exfiltrating (e.g. send_email), but user never asked to send an email:
      if (toolName === "send_email") {
        const userRequestedSend =
          userGoal.includes("send") ||
          userGoal.includes("email to") ||
          userGoal.includes("forward to") ||
          userGoal.includes("compose");

        if (!userRequestedSend) {
          return {
            ruleId: "SEC-RULE-002",
            ruleName: "GOAL_HIJACKING_PREVENTION",
            description: "Agent attempted send_email action that was not authorized by the user intent.",
            action: "BLOCK",
            severity: "HIGH",
          };
        }
      }

      // Check for prompt injection markers embedded in parameters
      const rawParams = JSON.stringify(ctx.toolRequest.parameters);
      if (
        rawParams.includes("SYSTEM OVERRIDE") ||
        rawParams.includes("system_override") ||
        rawParams.includes("ignore prior instructions") ||
        rawParams.includes("disregard prior instructions")
      ) {
        return {
          ruleId: "SEC-RULE-002",
          ruleName: "INJECTION_PAYLOAD_DETECTED",
          description: "Detected prompt injection override directive embedded in tool parameters.",
          action: "BLOCK",
          severity: "CRITICAL",
        };
      }

      return null;
    },
  },

  // 3. Consequential Action Human Confirmation Rule
  {
    id: "SEC-RULE-003",
    name: "CONSEQUENTIAL_ACTION_REQUIRES_CONFIRMATION",
    description: "Requires explicit user confirmation before executing state-mutating actions.",
    evaluate: (ctx) => {
      if (ctx.toolMetadata.isConsequential || ctx.toolMetadata.requiresConfirmation) {
        return {
          ruleId: "SEC-RULE-003",
          ruleName: "CONSEQUENTIAL_ACTION_REQUIRES_CONFIRMATION",
          description: `Action "${ctx.toolRequest.toolName}" is marked as consequential. Execution halted pending user confirmation.`,
          action: "REQUIRE_CONFIRMATION",
          severity: "HIGH",
        };
      }
      return null;
    },
  },

  // 4. Safe Read Operation Rule
  {
    id: "SEC-RULE-004",
    name: "AUTHORIZED_READ_OPERATION",
    description: "Permits read-only operations that align with user intent.",
    evaluate: (ctx) => {
      if (ctx.toolMetadata.riskTier === "READ_ONLY" || ctx.toolMetadata.riskTier === "LOW_RISK") {
        return {
          ruleId: "SEC-RULE-004",
          ruleName: "AUTHORIZED_READ_OPERATION",
          description: `Read-only operation "${ctx.toolRequest.toolName}" is approved.`,
          action: "APPROVE",
          severity: "LOW",
        };
      }
      return null;
    },
  },
];
