/**
 * Possessed Butler - Agent Orchestrator
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

export interface OrchestratorOptions {
  provider?: LLMProvider;
  securityGateway?: SecurityGateway;
  toolGateway?: ToolGateway;
  promptBuilder?: PromptBuilder;
  maxTurns?: number;
}

export class AgentOrchestrator {
  private provider: LLMProvider;
  private securityGateway: SecurityGateway;
  private toolGateway: ToolGateway;
  private promptBuilder: PromptBuilder;
  private maxTurns: number;

  constructor(options?: OrchestratorOptions) {
    this.provider = options?.provider || createLLMProvider();
    this.securityGateway = options?.securityGateway || defaultSecurityGateway;
    this.toolGateway = options?.toolGateway || defaultToolGateway;
    this.promptBuilder = options?.promptBuilder || defaultPromptBuilder;
    this.maxTurns = options?.maxTurns || 6;
  }

  async processRequest(request: AgentRequest): Promise<AgentResponse> {
    const responseId = `resp_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    const steps: AgentStepExecution[] = [];
    const toolExecutions: ToolResult[] = [];

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
          toolName: toolCall.toolName,
          parameters: toolCall.arguments,
          trustContext: {
            ...request.trustContext,
            source: `agent_reasoning_step_${currentTurn}`,
          },
          requestedAt: new Date().toISOString(),
        };

        // 5. SECURITY GATEWAY: Mandatory policy and threat evaluation
        const { decision, threatAssessment } = await this.securityGateway.evaluateToolRequest({
          toolRequest,
          trustContext: request.trustContext,
          userObjective: request.userPrompt,
        });

        lastPolicyDecision = decision;
        lastThreatAssessment = threatAssessment;

        // Case A: Policy Decision is BLOCK
        if (decision.decision === "BLOCK") {
          const blockedResult: ToolResult = {
            toolRequestId: toolRequest.id,
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
            reasoning: llmResponse.content,
            toolRequest,
            policyDecision: decision,
            toolResult: blockedResult,
            timestamp: new Date().toISOString(),
          });

          // Terminate the compromised loop and alert the user
          responseStatus = "BLOCKED";
          finalContent = `[SECURITY BLOCKED] The requested action "${toolRequest.toolName}" was denied by security policy. Reason: ${decision.reason}`;
          return {
            id: responseId,
            requestId: request.id,
            sessionId: request.sessionId,
            status: responseStatus,
            content: finalContent,
            steps,
            toolExecutions,
            threatAssessment: lastThreatAssessment,
            lastPolicyDecision,
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
            reasoning: llmResponse.content,
            toolRequest,
            policyDecision: decision,
            toolResult: awaitingResult,
            timestamp: new Date().toISOString(),
          });

          responseStatus = "REQUIRES_CONFIRMATION";
          finalContent = `[CONFIRMATION REQUIRED] The agent wants to execute "${toolRequest.toolName}" with arguments: ${JSON.stringify(toolRequest.parameters)}. Consequential action requires explicit human confirmation.`;
          return {
            id: responseId,
            requestId: request.id,
            sessionId: request.sessionId,
            status: responseStatus,
            content: finalContent,
            steps,
            toolExecutions,
            threatAssessment: lastThreatAssessment,
            lastPolicyDecision,
            providerInfo: {
              providerName: this.provider.providerName,
              modelIdentifier: this.provider.modelIdentifier,
            },
            createdAt: new Date().toISOString(),
          };
        }

        // Case C: Policy Decision is APPROVE -> Forward to Tool Gateway for authorized execution
        const toolResult = await this.toolGateway.executeTool(toolRequest, decision);
        toolExecutions.push(toolResult);

        steps.push({
          stepIndex: currentTurn,
          reasoning: llmResponse.content,
          toolRequest,
          policyDecision: decision,
          toolResult,
          timestamp: new Date().toISOString(),
        });

        // 6. Return tool output back to LLM framed with strict data boundaries
        const toolMessage = this.promptBuilder.formatToolResultForContext(toolResult);
        messages.push(toolMessage);
      }
    }

    return {
      id: responseId,
      requestId: request.id,
      sessionId: request.sessionId,
      status: responseStatus,
      content: finalContent,
      steps,
      toolExecutions,
      threatAssessment: lastThreatAssessment,
      lastPolicyDecision,
      providerInfo: {
        providerName: this.provider.providerName,
        modelIdentifier: this.provider.modelIdentifier,
      },
      createdAt: new Date().toISOString(),
    };
  }
}
