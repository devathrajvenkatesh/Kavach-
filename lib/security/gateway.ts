/**
 * Possessed Butler - Security Gateway
 *
 * Mandatory security checkpoint that sits between the LLM reasoning loop
 * and the Tool Gateway. Evaluates tool requests against user intent and policies,
 * producing an explicit PolicyDecision (APPROVE | BLOCK | REQUIRE_CONFIRMATION).
 */

import {
  ToolRequest,
  PolicyDecision,
  TrustContext,
  ThreatAssessment,
} from "@/types";
import { defaultToolRegistry } from "@/lib/tools/registry";
import { defaultPolicyEngine, PolicyEngine } from "@/lib/policy/engine";
import { defaultTaintTracker, TaintTracker } from "./taint-tracker";
import { defaultThreatAnalyzer, ThreatAnalyzer } from "./threat-analyzer";

export interface SecurityEvaluationInput {
  toolRequest: ToolRequest;
  trustContext: TrustContext;
  userObjective: string;
}

export class SecurityGateway {
  constructor(
    private policyEngine: PolicyEngine = defaultPolicyEngine,
    private taintTracker: TaintTracker = defaultTaintTracker,
    private threatAnalyzer: ThreatAnalyzer = defaultThreatAnalyzer,
    private toolRegistry = defaultToolRegistry
  ) {}

  /**
   * Evaluates a requested tool call. Produces a validated PolicyDecision.
   * Outcomes are strictly: APPROVE | BLOCK | REQUIRE_CONFIRMATION.
   */
  async evaluateToolRequest(input: SecurityEvaluationInput): Promise<{
    decision: PolicyDecision;
    threatAssessment: ThreatAssessment;
  }> {
    try {
      const { toolRequest, trustContext, userObjective } = input || {};

      if (!toolRequest || !toolRequest.toolName) {
        throw new Error("Malformed or missing tool request object");
      }

      const activeTrustContext = trustContext || {
        contextId: "ctx-unknown",
        source: "unknown",
        trustLevel: 1,
        isVerifiedUser: false,
        taintFlags: ["taint:missing_context"],
      };

      // 1. Resolve tool metadata
      const tool = this.toolRegistry.getTool(toolRequest.toolName);
      if (!tool) {
        const decision: PolicyDecision = {
          id: `pol_${Date.now()}_unregistered`,
          requestId: toolRequest.id || "req_unknown",
          decision: "BLOCK",
          reason: `Tool "${toolRequest.toolName}" is not registered in the system tool catalog.`,
          matchedRules: [],
          enforcedTrustLevel: activeTrustContext.trustLevel,
          requiresHumanApproval: false,
          evaluatedAt: new Date().toISOString(),
        };
        const threatAssessment = this.threatAnalyzer.analyzeContent(
          toolRequest.id || "req_unknown",
          JSON.stringify(toolRequest.parameters || {})
        );
        return { decision, threatAssessment };
      }

      // 2. Perform threat assessment on parameters
      const threatAssessment = this.threatAnalyzer.analyzeContent(
        toolRequest.id,
        JSON.stringify(toolRequest.parameters || {})
      );

      // 3. Check taint propagation
      const hasTaintedParameters = this.taintTracker.checkParametersForTaint(
        toolRequest.parameters || {}
      );

      // 4. Evaluate deterministic policies
      const decision = this.policyEngine.evaluate({
        toolRequest,
        toolMetadata: tool.metadata,
        trustContext: activeTrustContext,
        userObjective: userObjective || "",
        hasTaintedParameters,
        threatAssessment,
      });

      return { decision, threatAssessment };
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      const reqId = input?.toolRequest?.id || "req_fail_closed";
      const decision: PolicyDecision = {
        id: `pol_fail_closed_${Date.now()}`,
        requestId: reqId,
        decision: "BLOCK",
        reason: `Security Gateway Fail-Closed: Unexpected error during security evaluation: ${errorMsg}`,
        matchedRules: [
          {
            ruleId: "FAIL_CLOSED_SYSTEM_POLICY",
            ruleName: "Fail-Closed Security Invariant",
            description: "Block execution on internal security evaluation error",
            action: "BLOCK",
            severity: "CRITICAL",
          },
        ],
        enforcedTrustLevel: 5,
        requiresHumanApproval: false,
        evaluatedAt: new Date().toISOString(),
      };
      const threatAssessment: ThreatAssessment = {
        id: `threat_err_${Date.now()}`,
        targetContentId: reqId,
        isThreatDetected: true,
        overallThreatLevel: "CRITICAL",
        riskScore: 1.0,
        signals: [
          {
            category: "DIRECT_PROMPT_INJECTION",
            indicator: "SECURITY_EVALUATION_FAILURE",
            severity: "CRITICAL",
            confidence: 1.0,
            evidenceSnippet: `Security evaluation failed closed: ${errorMsg}`,
          },
        ],
        explanation: `Fail-closed security trigger: ${errorMsg}`,
        analyzedAt: new Date().toISOString(),
      };
      return { decision, threatAssessment };
    }
  }
}

export const defaultSecurityGateway = new SecurityGateway();
