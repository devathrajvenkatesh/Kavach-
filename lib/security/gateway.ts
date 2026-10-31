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
    const { toolRequest, trustContext, userObjective } = input;

    // 1. Resolve tool metadata
    const tool = this.toolRegistry.getTool(toolRequest.toolName);
    if (!tool) {
      const decision: PolicyDecision = {
        id: `pol_${Date.now()}_unregistered`,
        requestId: toolRequest.id,
        decision: "BLOCK",
        reason: `Tool "${toolRequest.toolName}" is not registered in the system tool catalog.`,
        matchedRules: [],
        enforcedTrustLevel: trustContext.trustLevel,
        requiresHumanApproval: false,
        evaluatedAt: new Date().toISOString(),
      };
      const threatAssessment = this.threatAnalyzer.analyzeContent(
        toolRequest.id,
        JSON.stringify(toolRequest.parameters)
      );
      return { decision, threatAssessment };
    }

    // 2. Perform threat assessment on parameters
    const threatAssessment = this.threatAnalyzer.analyzeContent(
      toolRequest.id,
      JSON.stringify(toolRequest.parameters)
    );

    // 3. Check taint propagation
    const hasTaintedParameters = this.taintTracker.checkParametersForTaint(
      toolRequest.parameters
    );

    // 4. Evaluate deterministic policies
    const decision = this.policyEngine.evaluate({
      toolRequest,
      toolMetadata: tool.metadata,
      trustContext,
      userObjective,
      hasTaintedParameters,
    });

    return { decision, threatAssessment };
  }
}

export const defaultSecurityGateway = new SecurityGateway();
