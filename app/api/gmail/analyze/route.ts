import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { defaultThreatAnalyzer } from "@/lib/security/threat-analyzer";
import { evaluateUrgency, generateAutoDraftReply } from "@/lib/intelligence/triage";
import { defaultAuditLogger } from "@/lib/audit/logger";
import { TrustLevel } from "@/types";
import { WorkspaceFile } from "@/types/file-workspace";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const auth = await requireAuth(req);
  if (auth instanceof NextResponse) return auth;

  try {
    const body = await req.json();
    const messageId = typeof body.messageId === "string" ? body.messageId.trim() : "";

    if (!messageId) {
      return NextResponse.json(
        { success: false, error: "messageId is required." },
        { status: 400 }
      );
    }

    const db = getDb();
    const userEmails = await db.getLiveEmailsByUserId(auth.user.id);
    const email = userEmails.find((e) => e.messageId === messageId);

    if (!email) {
      return NextResponse.json(
        { success: false, error: "Gmail message not found in user mailbox." },
        { status: 404 }
      );
    }

    const correlationId = `kavach_analyze_gmail_${email.messageId}_${Date.now()}`;
    const combinedContent = `Subject: ${email.subject}\nFrom: ${email.sender}\nDate: ${email.date}\n\n${email.bodyText}`;

    // Pass through Threat Analyzer
    const threatAssessment = defaultThreatAnalyzer.analyzeContent(correlationId, combinedContent);
    const isThreat = threatAssessment.isThreatDetected;
    const severity = threatAssessment.overallThreatLevel;
    const category = threatAssessment.signals[0]?.category;

    const urgency = evaluateUrgency(combinedContent, isThreat, severity);
    const replyDraft = generateAutoDraftReply({
      fileName: email.subject,
      fileType: "Email",
      extractedText: email.bodyText,
      isThreat,
    });

    // Tamper-evident audit log
    defaultAuditLogger.logEvent({
      correlationId,
      source: "gmail_analyzer",
      sourceType: "email",
      sourceTrustLevel: TrustLevel.EXTERNAL_CONTENT, // Trust Level 1 (External / Untrusted)
      eventType: isThreat ? "THREAT_DETECTED" : "EXTERNAL_CONTENT_INGESTED",
      threatCategory: category,
      severity,
      policyDecision: isThreat ? "BLOCK" : "APPROVE",
      finalOutcome: isThreat ? "THREAT_QUARANTINED" : "ANALYSIS_COMPLETED",
      reason: isThreat
        ? `Adversarial content intercepted in Gmail message: ${threatAssessment.signals[0]?.indicator || "threat"}`
        : "Email successfully analyzed within external untrusted data boundary.",
      payloadSummary: `Direct analysis of Gmail message "${email.subject}" (${email.messageId}).`,
      userId: auth.user.id,
      userEmail: auth.user.email,
      metadata: {
        messageId: email.messageId,
        authority: "NONE",
        origin: "GMAIL",
      },
    });

    const workspaceFile: WorkspaceFile = {
      id: `gmail_${email.messageId}`,
      name: email.subject || "Gmail Message",
      type: "Email",
      mimeType: "message/rfc822",
      sizeBytes: Buffer.byteLength(email.bodyText, "utf8"),
      formattedSize: `${(Buffer.byteLength(email.bodyText, "utf8") / 1024).toFixed(1)} KB`,
      folder: "Gmail Mailbox",
      uploadedAt: email.date || new Date().toISOString(),
      securityStatus: isThreat ? "THREAT_DETECTED" : "SAFE",
      riskLevel: severity,
      threatCategory: category,
      summary: isThreat
        ? "Hostile instruction detected in email. Ingestion quarantined."
        : "Verified email message. No prompt injection directives detected.",
      signals: threatAssessment.signals,
      extractedPreview: email.bodyText.slice(0, 2000),
      correlationId,
      analyzedAt: new Date().toISOString(),
      urgency,
      replyDraft,
      isQuarantined: isThreat,
      quarantineReason: isThreat
        ? "Hostile instruction detected and quarantined. Authority denied."
        : undefined,
    };

    return NextResponse.json({
      success: true,
      file: workspaceFile,
      threatAssessment,
      trustMetadata: {
        sourceType: "EMAIL",
        trustLevel: 1,
        authority: "NONE",
        origin: "GMAIL",
        userId: auth.user.id,
        messageId: email.messageId,
      },
    });
  } catch {
    return NextResponse.json(
      { success: false, error: "Failed to analyze Gmail message." },
      { status: 500 }
    );
  }
}
