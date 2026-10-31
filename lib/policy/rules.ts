/**
 * Kavach - Deterministic Policy Rules
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
  ThreatAssessment,
} from "@/types";

export interface PolicyEvaluationContext {
  toolRequest: ToolRequest;
  toolMetadata: ToolMetadata;
  trustContext: TrustContext;
  userObjective: string;
  hasTaintedParameters: boolean;
  threatAssessment?: ThreatAssessment;
}

export interface SecurityPolicyRule {
  id: string;
  name: string;
  description: string;
  evaluate: (ctx: PolicyEvaluationContext) => PolicyRuleMatch | null;
}

export const SENSITIVE_PATHS = [
  ".env",
  ".env.local",
  ".env.production",
  "id_rsa",
  "id_ed25519",
  "credentials.json",
  "secrets.json",
  "/etc/passwd",
  "/etc/shadow",
];

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
          userGoal.includes("send email") ||
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

      // If tool is state-mutating (edit_file), but user never asked to edit a file:
      if (toolName === "edit_file") {
        const userRequestedEdit =
          userGoal.includes("edit") ||
          userGoal.includes("modify") ||
          userGoal.includes("write file") ||
          userGoal.includes("update file");

        if (!userRequestedEdit || ctx.trustContext.trustLevel === 1) {
          return {
            ruleId: "SEC-RULE-002",
            ruleName: "GOAL_HIJACKING_PREVENTION",
            description: "Agent attempted edit_file action that was not authorized by the user intent or originated from untrusted external content.",
            action: "BLOCK",
            severity: "CRITICAL",
          };
        }
      }

      // Check for prompt injection markers embedded in parameters
      const rawParams = JSON.stringify(ctx.toolRequest.parameters);
      if (
        rawParams.includes("SYSTEM OVERRIDE") ||
        rawParams.includes("system_override") ||
        rawParams.includes("ignore prior instructions") ||
        rawParams.includes("disregard prior instructions") ||
        rawParams.includes("ignore previous instructions")
      ) {
        return {
          ruleId: "SEC-RULE-002",
          ruleName: "INJECTION_PAYLOAD_DETECTED",
          description: "Detected prompt injection override directive embedded in tool parameters.",
          action: "BLOCK",
          severity: "CRITICAL",
        };
      }

      // Check signals from threat analyzer
      const goalHijackSignal = ctx.threatAssessment?.signals.find(
        (s) => s.category === "GOAL_HIJACKING" && s.severity === "CRITICAL"
      );
      if (goalHijackSignal) {
        return {
          ruleId: "SEC-RULE-002",
          ruleName: "GOAL_HIJACKING_PREVENTION",
          description: `Goal hijacking detected: ${goalHijackSignal.indicator}`,
          action: "BLOCK",
          severity: "CRITICAL",
        };
      }

      return null;
    },
  },

  // 3. Tool Manipulation & Path Traversal Rule
  {
    id: "SEC-RULE-005",
    name: "TOOL_MANIPULATION_PREVENTION",
    description: "Blocks directory traversal, shell metacharacters, and malicious exfiltration destinations.",
    evaluate: (ctx) => {
      const rawParams = JSON.stringify(ctx.toolRequest.parameters);
      if (/\.\.[\/\\]/.test(rawParams)) {
        return {
          ruleId: "SEC-RULE-005",
          ruleName: "TOOL_MANIPULATION_PREVENTION",
          description: "Path traversal sequence detected in tool parameters. Access denied.",
          action: "BLOCK",
          severity: "CRITICAL",
        };
      }

      if (/@(evil\.com|attacker\.net)/i.test(rawParams) || /webhook\.site/i.test(rawParams)) {
        return {
          ruleId: "SEC-RULE-005",
          ruleName: "TOOL_MANIPULATION_PREVENTION",
          description: "Malicious external exfiltration destination detected in tool parameters.",
          action: "BLOCK",
          severity: "CRITICAL",
        };
      }

      return null;
    },
  },

  // 4. Privilege Escalation & Confirmation Bypass Rule
  {
    id: "SEC-RULE-006",
    name: "PRIVILEGE_ESCALATION_PREVENTION",
    description: "Blocks unauthorized privilege escalation and attempts to bypass human confirmation.",
    evaluate: (ctx) => {
      const rawParams = JSON.stringify(ctx.toolRequest.parameters).toLowerCase();
      if (
        rawParams.includes("bypass confirmation") ||
        rawParams.includes("bypass_confirmation") ||
        rawParams.includes("skip confirmation") ||
        rawParams.includes("skip_confirmation") ||
        rawParams.includes("sudo") ||
        rawParams.includes("runas root")
      ) {
        return {
          ruleId: "SEC-RULE-006",
          ruleName: "PRIVILEGE_ESCALATION_PREVENTION",
          description: "Attempted privilege escalation or confirmation bypass. Access denied by System Policy.",
          action: "BLOCK",
          severity: "CRITICAL",
        };
      }
      return null;
    },
  },

  // 5. Consequential Action Human Confirmation Rule
  {
    id: "SEC-RULE-003",
    name: "CONSEQUENTIAL_ACTION_REQUIRES_CONFIRMATION",
    description: "Requires explicit user confirmation before executing state-mutating actions.",
    evaluate: (ctx) => {
      if (ctx.toolMetadata?.isConsequential || ctx.toolMetadata?.requiresConfirmation) {
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

  // 6. Safe Read Operation Rule
  {
    id: "SEC-RULE-004",
    name: "AUTHORIZED_READ_OPERATION",
    description: "Permits read-only operations that align with user intent.",
    evaluate: (ctx) => {
      if (ctx.toolMetadata?.riskTier === "READ_ONLY" || ctx.toolMetadata?.riskTier === "LOW_RISK") {
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

  // 7. External Content Zero-Authority Invariant Rule
  {
    id: "SEC-RULE-007",
    name: "EXTERNAL_CONTENT_ZERO_AUTHORITY",
    description: "External content carries zero authority and can never authorize tool execution or change permissions.",
    evaluate: (ctx) => {
      if (
        ctx.trustContext.trustLevel === 1 &&
        (ctx.toolMetadata?.isConsequential || ctx.hasTaintedParameters)
      ) {
        return {
          ruleId: "SEC-RULE-007",
          ruleName: "EXTERNAL_CONTENT_ZERO_AUTHORITY",
          description: "External content attempted to authorize consequential tool execution. Denied by Trust Hierarchy Invariant.",
          action: "BLOCK",
          severity: "CRITICAL",
        };
      }
      return null;
    },
  },
];
