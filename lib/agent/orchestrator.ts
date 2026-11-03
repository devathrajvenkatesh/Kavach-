/**
 * Kavach - Agent Orchestrator
 *
 * Implements the strictly controlled agent reasoning & tool execution loop:
 * User Request -> LLM Provider -> Tool Request -> Security Gateway ->
 * Policy Decision -> Tool Gateway -> Tool Result -> LLM Provider -> Final Response
 *
 * The LLM NEVER directly executes tools.
 */

import {
  AgentRequest,
  AgentResponse,
  AgentStepExecution,
  ToolRequest,
  ToolResult,
  LLMMessage,
  LLMProvider,
} from "@/types";
import { defaultSecurityGateway, SecurityGateway } from "@/lib/security/gateway";
import { defaultToolGateway, ToolGateway } from "@/lib/tools/gateway";
import { defaultPromptBuilder, PromptBuilder } from "./prompt-builder";
import { createLLMProvider } from "./provider/factory";
import { AuditLogger, defaultAuditLogger } from "@/lib/audit/logger";
import { parseKavachModelResponse } from "@/lib/llm/prompts/kavach-system";
import { parseProviderError } from "./provider/error-handler";
import { sanitizeText } from "@/lib/security/sanitizer";

function mapThreatLevelToStructured(
  level?: string
): "BENIGN" | "LOW" | "MEDIUM" | "HIGH" | "CRITICAL" {
  if (!level || level === "NONE") return "BENIGN";
  if (level === "LOW" || level === "MEDIUM" || level === "HIGH" || level === "CRITICAL") {
    return level;
  }
  return "HIGH";
}

export interface OrchestratorOptions {
  provider?: LLMProvider;
  securityGateway?: SecurityGateway;
  toolGateway?: ToolGateway;
  promptBuilder?: PromptBuilder;
  auditLogger?: AuditLogger;
  maxTurns?: number;
}

export class AgentOrchestrator {
  private provider: LLMProvider;
  private securityGateway: SecurityGateway;
  private toolGateway: ToolGateway;
  private promptBuilder: PromptBuilder;
  private auditLogger: AuditLogger;
  private maxTurns: number;

  constructor(options?: OrchestratorOptions) {
    this.provider = options?.provider || createLLMProvider();
    this.securityGateway = options?.securityGateway || defaultSecurityGateway;
    this.toolGateway = options?.toolGateway || defaultToolGateway;
    this.promptBuilder = options?.promptBuilder || defaultPromptBuilder;
    this.auditLogger = options?.auditLogger || defaultAuditLogger;
    this.maxTurns = options?.maxTurns || 6;
  }

  getAuditLogger(): AuditLogger {
    return this.auditLogger;
  }

  async processRequest(request: AgentRequest): Promise<AgentResponse> {
    const responseId = `resp_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    const correlationId =
      request.correlationId ||
      request.id ||
      `corr_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;

    const steps: AgentStepExecution[] = [];
    const toolExecutions: ToolResult[] = [];

    // Track active trust context dynamically across multi-step turns
    let activeTrustContext = {
      ...request.trustContext,
      correlationId,
    };

    try {
      // Log request reception
      this.auditLogger.logEvent({
        correlationId,
        eventType: "REQUEST_RECEIVED",
        source: request.trustContext.source,
        sourceType: request.trustContext.source,
        sourceTrustLevel: request.trustContext.trustLevel,
        userIntent: request.userPrompt,
        payloadSummary: request.userPrompt.slice(0, 150),
        decision: "APPROVE",
        reason: "User request received by Kavach orchestrator",
      });

      // Check if untrusted external content is entering the boundary
      if (request.trustContext.trustLevel === 1 || request.trustContext.taintFlags.length > 0) {
        this.auditLogger.logEvent({
          correlationId,
          eventType: "EXTERNAL_CONTENT_INGESTED",
          source: request.trustContext.source,
          sourceType: request.trustContext.source,
          sourceTrustLevel: request.trustContext.trustLevel,
          userIntent: request.userPrompt,
          payloadSummary: request.userPrompt.slice(0, 150),
          decision: "APPROVE",
          reason: "Untrusted external vector tagged with zero-authority data boundary",
        });
      }

      // 1. Initialize conversation context with system prompt and authenticated user intent
      const messages: LLMMessage[] = [
        {
          role: "system",
          content: this.promptBuilder.buildSystemPrompt(),
        },
        {
          role: "user",
          content: request.userPrompt,
        },
      ];

      let currentTurn = 0;
      let finalContent = "";
      let lastPolicyDecision = undefined;
      let lastThreatAssessment = undefined;
      let responseStatus: AgentResponse["status"] = "SUCCESS";

      while (currentTurn < this.maxTurns) {
        currentTurn++;

        // 2. LLM reasons over the context
        const availableTools = this.toolGateway.getAvailableToolMetadata();
        const llmResponse = await this.provider.generateCompletion(messages, availableTools);

        finalContent = llmResponse.content;

        // 3. If no tool calls were requested, the reasoning loop has completed
        if (!llmResponse.toolCalls || llmResponse.toolCalls.length === 0) {
          steps.push({
            stepIndex: currentTurn,
            correlationId,
            reasoning: llmResponse.content,
            timestamp: new Date().toISOString(),
          });
          break;
        }

        // Record assistant reasoning with tool intent
        messages.push({
          role: "assistant",
          content: llmResponse.content,
        });

        // 4. Intercept and review each requested tool call
        for (const toolCall of llmResponse.toolCalls) {
          const toolRequest: ToolRequest = {
            id: toolCall.id,
            sessionId: request.sessionId,
            correlationId,
            toolName: toolCall.toolName,
            parameters: toolCall.arguments,
            trustContext: {
              ...activeTrustContext,
              correlationId,
              source: `agent_reasoning_step_${currentTurn}`,
            },
            requestedAt: new Date().toISOString(),
          };

          // Telemetry: Tool invocation intent logged
          this.auditLogger.logEvent({
            correlationId,
            eventType: "TOOL_REQUESTED",
            source: toolRequest.trustContext.source,
            sourceType: toolRequest.trustContext.source,
            sourceTrustLevel: toolRequest.trustContext.trustLevel,
            userIntent: request.userPrompt,
            requestedTool: toolRequest.toolName,
            toolArgumentsMetadata: toolRequest.parameters,
            toolExecutionAttempted: true,
            decision: "APPROVE",
            reason: `Agent reasoning formulated intent to invoke tool "${toolRequest.toolName}"`,
          });

          // 5. SECURITY GATEWAY: Mandatory policy and threat evaluation
          const { decision, threatAssessment } = await this.securityGateway.evaluateToolRequest({
            toolRequest,
            trustContext: activeTrustContext,
            userObjective: request.userPrompt,
          });

        decision.correlationId = correlationId;
        threatAssessment.correlationId = correlationId;

        lastPolicyDecision = decision;
        lastThreatAssessment = threatAssessment;

        // Telemetry: Threat detection event
        if (threatAssessment.isThreatDetected) {
          this.auditLogger.logEvent({
            correlationId,
            eventType: "THREAT_DETECTED",
            source: toolRequest.trustContext.source,
            sourceType: toolRequest.trustContext.source,
            threatCategory: threatAssessment.signals[0]?.category,
            severity: threatAssessment.overallThreatLevel,
            detectedIndicators: threatAssessment.signals.map((s) => s.indicator),
            decision: decision.decision,
            reason: threatAssessment.explanation,
            threatDetected: true,
            threatLevel: threatAssessment.overallThreatLevel,
          });
        }

        // Telemetry: Policy evaluated event
        this.auditLogger.logEvent({
          correlationId,
          eventType: "POLICY_EVALUATED",
          source: toolRequest.trustContext.source,
          sourceType: toolRequest.trustContext.source,
          policyRuleTriggered: decision.matchedRules[0]?.ruleId,
          policyDecision: decision.decision,
          decision: decision.decision,
          confirmationRequirement: decision.decision === "REQUIRE_CONFIRMATION",
          reason: decision.reason,
        });

        // Case A: Policy Decision is BLOCK
        if (decision.decision === "BLOCK") {
          const blockedResult: ToolResult = {
            toolRequestId: toolRequest.id,
            correlationId,
            toolName: toolRequest.toolName,
            status: "BLOCKED_BY_POLICY",
            error: `Security Policy Violation: ${decision.reason}`,
            isExternalContent: false,
            taintApplied: [],
            executedAt: new Date().toISOString(),
          };

          toolExecutions.push(blockedResult);
          steps.push({
            stepIndex: currentTurn,
            correlationId,
            reasoning: llmResponse.content,
            toolRequest,
            policyDecision: decision,
            toolResult: blockedResult,
            timestamp: new Date().toISOString(),
          });

          const isSecretTarget =
            decision.reason.toLowerCase().includes(".env") ||
            decision.reason.toLowerCase().includes("secret") ||
            decision.reason.toLowerCase().includes("credential") ||
            decision.reason.toLowerCase().includes("key");

          // Telemetry: Tool blocked & Attack intercepted
          this.auditLogger.logEvent({
            correlationId,
            eventType: isSecretTarget ? "SECRET_ACCESS_BLOCKED" : "TOOL_BLOCKED",
            source: toolRequest.trustContext.source,
            sourceType: toolRequest.trustContext.source,
            requestedTool: toolRequest.toolName,
            toolArgumentsMetadata: toolRequest.parameters,
            policyRuleTriggered: decision.matchedRules[0]?.ruleId,
            policyDecision: "BLOCK",
            decision: "BLOCK",
            threatCategory: threatAssessment.signals[0]?.category,
            severity: threatAssessment.overallThreatLevel,
            toolExecutionAttempted: true,
            toolExecutionResult: "BLOCKED_BY_POLICY",
            finalOutcome: "ATTACK_BLOCKED",
            reason: decision.reason,
            payloadSummary: JSON.stringify(toolRequest.parameters).slice(0, 150),
          });

          // Terminate the compromised loop and alert the user
          responseStatus = "BLOCKED";
          finalContent = `[SECURITY BLOCKED] The requested action "${toolRequest.toolName}" was denied by security policy. Reason: ${decision.reason}`;

          const structured = parseKavachModelResponse(finalContent);
          structured.status = "BLOCKED";
          structured.attack_detected = true;
          const mappedLevel = mapThreatLevelToStructured(lastThreatAssessment?.overallThreatLevel);
          structured.threat_level = mappedLevel === "BENIGN" ? "CRITICAL" : mappedLevel;
          structured.threat_findings =
            lastThreatAssessment?.signals.map((s) => s.indicator) || ["SECURITY_POLICY_VIOLATION"];
          structured.tool_actions = toolExecutions.map((t) => t.toolName);
          structured.butler_report = finalContent;

          return {
            id: responseId,
            requestId: request.id,
            sessionId: request.sessionId,
            correlationId,
            status: responseStatus,
            content: finalContent,
            steps,
            toolExecutions,
            threatAssessment: lastThreatAssessment,
            lastPolicyDecision,
            structuredOutput: structured,
            providerInfo: {
              providerName: this.provider.providerName,
              modelIdentifier: this.provider.modelIdentifier,
            },
            createdAt: new Date().toISOString(),
          };
        }

        // Case B: Policy Decision is REQUIRE_CONFIRMATION
        if (decision.decision === "REQUIRE_CONFIRMATION") {
          const awaitingResult: ToolResult = {
            toolRequestId: toolRequest.id,
            correlationId,
            toolName: toolRequest.toolName,
            status: "AWAITING_APPROVAL",
            error: `Human confirmation required: ${decision.reason}`,
            isExternalContent: false,
            taintApplied: [],
            executedAt: new Date().toISOString(),
          };

          toolExecutions.push(awaitingResult);
          steps.push({
            stepIndex: currentTurn,
            correlationId,
            reasoning: llmResponse.content,
            toolRequest,
            policyDecision: decision,
            toolResult: awaitingResult,
            timestamp: new Date().toISOString(),
          });

          this.auditLogger.logEvent({
            correlationId,
            eventType: "CONFIRMATION_REQUIRED",
            source: toolRequest.trustContext.source,
            sourceType: toolRequest.trustContext.source,
            requestedTool: toolRequest.toolName,
            toolArgumentsMetadata: toolRequest.parameters,
            policyRuleTriggered: decision.matchedRules[0]?.ruleId,
            policyDecision: "REQUIRE_CONFIRMATION",
            decision: "REQUIRE_CONFIRMATION",
            confirmationRequirement: true,
            toolExecutionAttempted: true,
            toolExecutionResult: "AWAITING_APPROVAL",
            finalOutcome: "CONFIRMATION_REQUIRED",
            reason: decision.reason,
            payloadSummary: JSON.stringify(toolRequest.parameters).slice(0, 150),
          });

          responseStatus = "REQUIRES_CONFIRMATION";
          finalContent = `[CONFIRMATION REQUIRED] The agent wants to execute "${toolRequest.toolName}" with arguments: ${JSON.stringify(toolRequest.parameters)}. Consequential action requires explicit human confirmation.`;

          const structured = parseKavachModelResponse(finalContent);
          structured.status = "REQUIRES_CONFIRMATION";
          structured.tool_actions = toolExecutions.map((t) => t.toolName);
          structured.butler_report = finalContent;

          return {
            id: responseId,
            requestId: request.id,
            sessionId: request.sessionId,
            correlationId,
            status: responseStatus,
            content: finalContent,
            steps,
            toolExecutions,
            threatAssessment: lastThreatAssessment,
            lastPolicyDecision,
            structuredOutput: structured,
            providerInfo: {
              providerName: this.provider.providerName,
              modelIdentifier: this.provider.modelIdentifier,
            },
            createdAt: new Date().toISOString(),
          };
        }

        // Case C: Policy Decision is APPROVE -> Forward to Tool Gateway for authorized execution
        const toolResult = await this.toolGateway.executeTool(toolRequest, decision);
        toolResult.correlationId = correlationId;
        toolExecutions.push(toolResult);

        this.auditLogger.logEvent({
          correlationId,
          eventType: "TOOL_EXECUTED",
          source: toolRequest.trustContext.source,
          sourceType: toolRequest.trustContext.source,
          requestedTool: toolRequest.toolName,
          toolArgumentsMetadata: toolRequest.parameters,
          policyRuleTriggered: decision.matchedRules[0]?.ruleId,
          policyDecision: "APPROVE",
          decision: "APPROVE",
          toolExecutionAttempted: true,
          toolExecutionResult: toolResult.status,
          finalOutcome: "TOOL_EXECUTED",
          reason: "Tool executed successfully within isolated sandbox boundary.",
          payloadSummary: JSON.stringify(toolRequest.parameters).slice(0, 150),
        });

        steps.push({
          stepIndex: currentTurn,
          correlationId,
          reasoning: llmResponse.content,
          toolRequest,
          policyDecision: decision,
          toolResult,
          timestamp: new Date().toISOString(),
        });

        // 6. Taint Propagation: If tool output is external content, degrade active trust level & flag taint
        if (toolResult.isExternalContent || toolResult.taintApplied.length > 0) {
          activeTrustContext = {
            ...activeTrustContext,
            trustLevel: 1, // TrustLevel.EXTERNAL_CONTENT
            taintFlags: Array.from(
              new Set([
                ...activeTrustContext.taintFlags,
                ...toolResult.taintApplied,
                "taint:external_content",
              ])
            ),
          };

          this.auditLogger.logEvent({
            correlationId,
            eventType: "EXTERNAL_CONTENT_INGESTED",
            source: toolResult.toolName,
            sourceType: "external_tool_output",
            sourceTrustLevel: 1,
            userIntent: request.userPrompt,
            requestedTool: toolResult.toolName,
            decision: "APPROVE",
            reason: `External content ingested from tool "${toolResult.toolName}". Tagged with zero-authority data boundary.`,
          });
        }

        // 7. Return tool output back to LLM framed with strict data boundaries
        const toolMessage = this.promptBuilder.formatToolResultForContext(toolResult);
        messages.push(toolMessage);
      }
    }

    const structured = parseKavachModelResponse(finalContent);
    structured.status = "COMPLETED";
    if (lastThreatAssessment?.isThreatDetected) {
      structured.attack_detected = true;
      structured.threat_level = mapThreatLevelToStructured(lastThreatAssessment.overallThreatLevel);
      structured.threat_findings = lastThreatAssessment.signals.map((s) => s.indicator);
    }
    structured.tool_actions = toolExecutions.map((t) => t.toolName);
    if (!structured.butler_report || structured.butler_report.trim() === "") {
      structured.butler_report = finalContent;
    }

    return {
      id: responseId,
      requestId: request.id,
      sessionId: request.sessionId,
      correlationId,
      status: responseStatus,
      content: structured.butler_report || finalContent,
      steps,
      toolExecutions,
      threatAssessment: lastThreatAssessment,
      lastPolicyDecision,
      structuredOutput: structured,
      providerInfo: {
        providerName: this.provider.providerName,
        modelIdentifier: this.provider.modelIdentifier,
      },
      createdAt: new Date().toISOString(),
    };
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    const providerError = parseProviderError(err);

    if (providerError) {
      this.auditLogger.logEvent({
        correlationId,
        eventType: "PROVIDER_ERROR",
        source: request.trustContext?.source || "orchestrator",
        sourceType: "provider_unavailable",
        decision: "BLOCK",
        policyDecision: "BLOCK",
        finalOutcome: "PROVIDER_UNAVAILABLE",
        threatDetected: false,
        reason: providerError.userMessage,
      });

      return {
        id: responseId,
        requestId: request.id,
        sessionId: request.sessionId,
        correlationId,
        status: "ERROR",
        content: providerError.userMessage,
        steps,
        toolExecutions: [],
        structuredOutput: {
          status: "BLOCKED",
          attack_detected: false,
          threat_level: "BENIGN",
          threat_findings: [],
          tool_actions: [],
          butler_report: providerError.userMessage,
        },
        providerInfo: {
          providerName: this.provider.providerName,
          modelIdentifier: this.provider.modelIdentifier,
        },
        createdAt: new Date().toISOString(),
      };
    }

    // Non-provider unexpected internal error: Fail-closed without exposing raw internals or fabricating threats
    const safeSanitizedMsg = sanitizeText(errorMsg);
    const safeErrorMsg = safeSanitizedMsg.startsWith("{")
      ? "An internal processing error occurred. Operation safely halted with zero tool executions."
      : `An internal processing error occurred: ${safeSanitizedMsg}`;

    this.auditLogger.logEvent({
      correlationId,
      eventType: "SYSTEM_ERROR",
      source: request.trustContext?.source || "orchestrator",
      sourceType: "orchestrator_failure",
      decision: "BLOCK",
      policyDecision: "BLOCK",
      finalOutcome: "ORCHESTRATOR_FAIL_CLOSED",
      threatDetected: false,
      reason: safeErrorMsg,
    });

    return {
      id: responseId,
      requestId: request.id,
      sessionId: request.sessionId,
      correlationId,
      status: "ERROR",
      content: `[SECURITY FAIL-CLOSED] ${safeErrorMsg}`,
      steps,
      toolExecutions: [],
      structuredOutput: {
        status: "BLOCKED",
        attack_detected: false,
        threat_level: "BENIGN",
        threat_findings: [],
        tool_actions: [],
        butler_report: `[SECURITY FAIL-CLOSED] ${safeErrorMsg}`,
      },
      providerInfo: {
        providerName: this.provider.providerName,
        modelIdentifier: this.provider.modelIdentifier,
      },
      createdAt: new Date().toISOString(),
    };
  }
}
}
