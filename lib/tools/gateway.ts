/**
 * Possessed Butler - Tool Gateway
 *
 * The sole execution boundary for all tools. Enforces that execution is permitted
 * ONLY when a valid PolicyDecision with outcome === "APPROVE" is supplied.
 */

import {
  ToolRequest,
  ToolResult,
  PolicyDecision,
  ToolMetadata,
} from "@/types";
import { defaultToolRegistry } from "./registry";

export class ToolGateway {
  constructor(private registry = defaultToolRegistry) {}

  getAvailableToolMetadata(): ToolMetadata[] {
    return this.registry.getAllToolMetadata();
  }

  /**
   * Executes a tool request strictly under the governance of an evaluated PolicyDecision.
   * Throws or returns blocked state if the policy decision is not APPROVE.
   */
  async executeTool(
    request: ToolRequest,
    policyDecision: PolicyDecision
  ): Promise<ToolResult> {
    const executedAt = new Date().toISOString();

    // 1. Verify policy decision is strictly APPROVE
    if (policyDecision.decision === "BLOCK") {
      return {
        toolRequestId: request.id,
        toolName: request.toolName,
        status: "BLOCKED_BY_POLICY",
        error: `Execution denied by Policy: ${policyDecision.reason}`,
        isExternalContent: false,
        taintApplied: [],
        executedAt,
      };
    }

    if (policyDecision.decision === "REQUIRE_CONFIRMATION") {
      return {
        toolRequestId: request.id,
        toolName: request.toolName,
        status: "AWAITING_APPROVAL",
        error: `Action requires explicit human confirmation: ${policyDecision.reason}`,
        isExternalContent: false,
        taintApplied: [],
        executedAt,
      };
    }

    // 2. Fetch tool from registry
    const tool = this.registry.getTool(request.toolName);
    if (!tool) {
      return {
        toolRequestId: request.id,
        toolName: request.toolName,
        status: "FAILED",
        error: `Tool "${request.toolName}" is not registered in Tool Gateway.`,
        isExternalContent: false,
        taintApplied: [],
        executedAt,
      };
    }

    // 3. Schema validation using the tool's registered Zod schema
    const parseResult = tool.schema.safeParse(request.parameters);
    if (!parseResult.success) {
      const issues = (parseResult.error.issues || []) as Array<{ path: (string | number)[]; message: string }>;
      const errorMsg =
        issues.length > 0
          ? issues.map((e) => `${e.path.join(".")}: ${e.message}`).join("; ")
          : parseResult.error.message;
      return {
        toolRequestId: request.id,
        toolName: request.toolName,
        status: "FAILED",
        error: `Parameter validation failed: ${errorMsg}`,
        isExternalContent: false,
        taintApplied: [],
        executedAt,
      };
    }

    // 4. Authorized execution
    try {
      const result = await tool.execute(parseResult.data, request.trustContext);
      return {
        toolRequestId: request.id,
        toolName: request.toolName,
        status: "SUCCESS",
        data: result.data,
        rawOutput: result.rawOutput,
        isExternalContent: result.isExternalContent,
        taintApplied: result.taintApplied,
        executedAt,
      };
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      return {
        toolRequestId: request.id,
        toolName: request.toolName,
        status: "FAILED",
        error: `Tool execution error: ${errorMsg}`,
        isExternalContent: false,
        taintApplied: [],
        executedAt,
      };
    }
  }
}

export const defaultToolGateway = new ToolGateway();
