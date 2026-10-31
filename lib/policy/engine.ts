/**
 * Possessed Butler - Deterministic Policy Engine
 *
 * Evaluates tool execution requests against declarative security rules.
 * Strict outcome precedence: BLOCK > REQUIRE_CONFIRMATION > APPROVE > (Default Deny: BLOCK)
 */

import { PolicyDecision, PolicyRuleMatch, TrustLevel } from "@/types";
import { BUILTIN_POLICY_RULES, PolicyEvaluationContext } from "./rules";

export class PolicyEngine {
  constructor(private rules = BUILTIN_POLICY_RULES) {}

  evaluate(ctx: PolicyEvaluationContext): PolicyDecision {
    const evaluatedAt = new Date().toISOString();
    const requestId = ctx.toolRequest.id;
    const matches: PolicyRuleMatch[] = [];

    for (const rule of this.rules) {
      const match = rule.evaluate(ctx);
      if (match) {
        matches.push(match);
      }
    }

    // 1. BLOCK takes highest precedence
    const blockMatch = matches.find((m) => m.action === "BLOCK");
    if (blockMatch) {
      return {
        id: `pol_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
        requestId,
        decision: "BLOCK",
        reason: blockMatch.description,
        matchedRules: matches,
        enforcedTrustLevel: TrustLevel.SYSTEM_POLICY,
        requiresHumanApproval: false,
        evaluatedAt,
      };
    }

    // 2. REQUIRE_CONFIRMATION takes second precedence
    const confirmMatch = matches.find((m) => m.action === "REQUIRE_CONFIRMATION");
    if (confirmMatch) {
      return {
        id: `pol_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
        requestId,
        decision: "REQUIRE_CONFIRMATION",
        reason: confirmMatch.description,
        matchedRules: matches,
        enforcedTrustLevel: TrustLevel.AUTHORIZED_TOOL_POLICY,
        requiresHumanApproval: true,
        evaluatedAt,
      };
    }

    // 3. APPROVE
    const approveMatch = matches.find((m) => m.action === "APPROVE");
    if (approveMatch) {
      return {
        id: `pol_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
        requestId,
        decision: "APPROVE",
        reason: approveMatch.description,
        matchedRules: matches,
        enforcedTrustLevel: TrustLevel.VALIDATED_TOOL_OUTPUT,
        requiresHumanApproval: false,
        evaluatedAt,
      };
    }

    // 4. Default Deny
    return {
      id: `pol_${Date.now()}_default_deny`,
      requestId,
      decision: "BLOCK",
      reason: "No permissive policy rule matched this request. Denied by Default Zero-Trust Policy.",
      matchedRules: [],
      enforcedTrustLevel: TrustLevel.SYSTEM_POLICY,
      requiresHumanApproval: false,
      evaluatedAt,
    };
  }
}

export const defaultPolicyEngine = new PolicyEngine();
