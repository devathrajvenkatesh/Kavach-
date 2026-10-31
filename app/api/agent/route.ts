import { NextRequest, NextResponse } from "next/server";
import { AgentOrchestrator } from "@/lib/agent/orchestrator";
import { AgentRequest, TrustLevel } from "@/types";
import { ConfigurationError } from "@/lib/agent/provider/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface AgentRequestBody {
  message?: unknown;
  conversationId?: unknown;
}

export async function POST(req: NextRequest) {
  try {
    // 1. Parse & Validate request JSON
    let body: AgentRequestBody;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json(
        {
          success: false,
          error: "Malformed request payload. Expected valid JSON with 'message'.",
          status: "ERROR",
          security: {
            attackDetected: false,
            decision: "BLOCK",
          },
        },
        { status: 400 }
      );
    }

    if (!body || typeof body.message !== "string" || body.message.trim() === "") {
      return NextResponse.json(
        {
          success: false,
          error: "Message is required and cannot be empty.",
          status: "ERROR",
          security: {
            attackDetected: false,
            decision: "BLOCK",
          },
        },
        { status: 400 }
      );
    }

    const userPrompt = body.message.trim();
    if (userPrompt.length > 20000) {
      return NextResponse.json(
        {
          success: false,
          error: "Message exceeds maximum permitted length (20,000 characters).",
          status: "ERROR",
          security: {
            attackDetected: true,
            decision: "BLOCK",
          },
        },
        { status: 400 }
      );
    }

    const conversationId =
      typeof body.conversationId === "string" && body.conversationId.trim() !== ""
        ? body.conversationId.trim()
        : `session_${Date.now()}`;

    const correlationId = `corr_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

    // 2. Build AgentRequest with verified user trust context
    const agentRequest: AgentRequest = {
      id: `req_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      sessionId: conversationId,
      correlationId,
      userPrompt,
      trustContext: {
        contextId: `ctx_${conversationId}`,
        correlationId,
        source: "web_frontend",
        trustLevel: TrustLevel.USER_INTENT,
        isVerifiedUser: true,
        taintFlags: [],
      },
      createdAt: new Date().toISOString(),
    };

    // 3. Initialize Agent Orchestrator (delegates to configured provider, Security Gateway, Tool Gateway)
    let orchestrator: AgentOrchestrator;
    try {
      orchestrator = new AgentOrchestrator();
    } catch (initErr: unknown) {
      if (
        initErr instanceof ConfigurationError ||
        (initErr instanceof Error && initErr.message.includes("GEMINI_API_KEY"))
      ) {
        return NextResponse.json(
          {
            success: false,
            response:
              "Kavach is configured for Gemini, but GEMINI_API_KEY is not configured in .env.local. Please set GEMINI_API_KEY to activate live Gemini model reasoning.",
            error:
              "GEMINI_API_KEY is missing. Please configure GEMINI_API_KEY in .env.local on the server.",
            status: "ERROR",
            security: {
              attackDetected: false,
              decision: "BLOCK",
            },
          },
          { status: 200 }
        );
      }
      throw initErr;
    }

    // 4. Process Request through full Kavach Security Pipeline
    const agentResponse = await orchestrator.processRequest(agentRequest);

    // 5. Evaluate Security Outcomes
    const isBlocked =
      agentResponse.status === "BLOCKED" ||
      agentResponse.structuredOutput?.attack_detected ||
      agentResponse.structuredOutput?.status === "BLOCKED" ||
      agentResponse.lastPolicyDecision?.decision === "BLOCK";

    const isConfirmationRequired =
      agentResponse.status === "REQUIRES_CONFIRMATION" ||
      agentResponse.lastPolicyDecision?.decision === "REQUIRE_CONFIRMATION";

    const attackDetected = Boolean(
      isBlocked ||
        agentResponse.threatAssessment?.isThreatDetected ||
        agentResponse.structuredOutput?.attack_detected
    );

    let decision: "APPROVE" | "BLOCK" | "REQUIRE_CONFIRMATION" = "APPROVE";
    if (isBlocked) {
      decision = "BLOCK";
    } else if (isConfirmationRequired) {
      decision = "REQUIRE_CONFIRMATION";
    }

    const responseStatus = isBlocked
      ? "BLOCKED"
      : isConfirmationRequired
      ? "REQUIRES_CONFIRMATION"
      : "COMPLETED";

    // 6. Return Safe JSON Response (never exposing internal secrets or keys)
    return NextResponse.json({
      success: true,
      response: agentResponse.content,
      status: responseStatus,
      security: {
        attackDetected,
        decision,
        threatCategory: agentResponse.threatAssessment?.signals?.[0]?.category,
        correlationId: agentResponse.correlationId,
      },
      toolExecutions: agentResponse.toolExecutions?.map((t) => ({
        toolName: t.toolName,
        status: t.status,
      })),
      provider: agentResponse.providerInfo,
    });
  } catch (error: unknown) {
    // Sanitized Error Handling (never expose stack traces or raw keys)
    const rawError = error instanceof Error ? error.message : "Internal server error";
    const sanitizedError = rawError
      .replace(/AIza[0-9A-Za-z-_]{35}/g, "[REDACTED_API_KEY]")
      .replace(/Bearer\s+[A-Za-z0-9-_.]+/gi, "[REDACTED_TOKEN]");

    return NextResponse.json(
      {
        success: false,
        response:
          "Kavach defense encountered a server processing error. The request was halted safely without unauthorized tool execution.",
        error: sanitizedError,
        status: "ERROR",
        security: {
          attackDetected: false,
          decision: "BLOCK",
        },
      },
      { status: 500 }
    );
  }
}
