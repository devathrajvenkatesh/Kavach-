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

    let emailData: {
      messageId: string;
      provider: string;
      sender: string;
      subject: string;
      bodyText: string;
      date: string;
    } | null = null;

    const db = getDb();

    if (messageId) {
      const userEmails = await db.getLiveEmailsByUserId(auth.user.id);
      const email = userEmails.find((e) => e.messageId === messageId);
      if (email) {
        emailData = {
          messageId: email.messageId,
          provider: email.provider || "EMAIL",
          sender: email.sender,
          subject: email.subject,
          bodyText: email.bodyText,
          date: email.date,
        };
      }
    }

    if (!emailData && body.content) {
      emailData = {
        messageId: `direct_${Date.now()}`,
        provider: body.provider || "EXTERNAL",
        sender: body.sender || "External Sender",
        subject: body.subject || "Direct Message Analysis",
        bodyText: String(body.content),
        date: new Date().toISOString(),
      };
    }

    if (!emailData) {
      return NextResponse.json(
        { success: false, error: "Valid messageId or content is required." },
        { status: 400 }
      );
    }

    const correlationId = `kavach_analyze_${emailData.provider.toLowerCase()}_${emailData.messageId}_${Date.now()}`;
    const combinedContent = `Subject: ${emailData.subject}\nFrom: ${emailData.sender}\nDate: ${emailData.date}\n\n${emailData.bodyText}`;

    // Pass through Authoritative Threat Analyzer
    const threatAssessment = defaultThreatAnalyzer.analyzeContent(correlationId, combinedContent);
    const isThreat = threatAssessment.isThreatDetected;
    const severity = threatAssessment.overallThreatLevel;
    const category = threatAssessment.signals[0]?.category;

    const urgency = evaluateUrgency(combinedContent, isThreat, severity);
    const replyDraft = generateAutoDraftReply({
      fileName: emailData.subject,
      fileType: "Email",
      extractedText: emailData.bodyText,
      isThreat,
    });

    // Tamper-evident immutable audit log
    defaultAuditLogger.logEvent({
      correlationId,
      source: "mail_analyzer",
      sourceType: "email",
      sourceTrustLevel: TrustLevel.EXTERNAL_CONTENT, // Trust Level 1 (External Untrusted Data)
      eventType: isThreat ? "THREAT_DETECTED" : "EXTERNAL_CONTENT_INGESTED",
      threatCategory: category,
      severity,
      policyDecision: isThreat ? "BLOCK" : "APPROVE",
      finalOutcome: isThreat ? "THREAT_QUARANTINED" : "EMAIL_ANALYZED",
      reason: isThreat
        ? `Threat detected during deep email analysis: ${threatAssessment.signals[0]?.indicator || "threat"}`
        : `${emailData.provider} email successfully passed Kavach security inspection.`,
      payloadSummary: `Email "${emailData.subject}" analyzed with score ${threatAssessment.riskScore}.`,
      userId: auth.user.id,
      userEmail: auth.user.email,
      metadata: {
        provider: emailData.provider,
        messageId: emailData.messageId,
        riskScore: threatAssessment.riskScore,
        quarantined: isThreat,
        authority: "NONE",
      },
    });

    // Construct untrusted WorkspaceFile for downstream Agent handoff
    const sizeBytes = Buffer.byteLength(emailData.bodyText, "utf8");
    const workspaceFile: WorkspaceFile = {
      id: `file_${emailData.provider.toLowerCase()}_${emailData.messageId}`,
      name: `${emailData.subject}.eml`,
      type: "Email",
      mimeType: "message/rfc822",
      sizeBytes,
      formattedSize: `${(sizeBytes / 1024).toFixed(1)} KB`,
      folder: `${emailData.provider} Mailbox`,
      uploadedAt: emailData.date || new Date().toISOString(),
      securityStatus: isThreat ? "THREAT_DETECTED" : "SAFE",
      riskLevel: severity,
      threatCategory: category,
      summary: isThreat
        ? `Hostile instruction detected in ${emailData.provider} email. Ingestion quarantined.`
        : `Verified ${emailData.provider} email message. No prompt injection directives detected.`,
      signals: threatAssessment.signals,
      extractedPreview: emailData.bodyText.slice(0, 2000),
      correlationId,
      analyzedAt: new Date().toISOString(),
      urgency,
      replyDraft,
      isQuarantined: isThreat,
      quarantineReason: isThreat
        ? threatAssessment.signals[0]?.indicator || "Hostile instruction detected and quarantined. Authority denied."
        : undefined,
    };

    return NextResponse.json({
      success: true,
      analysis: {
        isThreat,
        threatLevel: severity,
        threatCategory: category,
        riskScore: threatAssessment.riskScore,
        signals: threatAssessment.signals,
        urgency,
        replyDraft,
        quarantined: isThreat,
      },
      file: workspaceFile,
      trustMetadata: {
        sourceType: "EMAIL",
        trustLevel: 1,
        authority: "NONE",
        origin: emailData.provider,
        userId: auth.user.id,
        messageId: emailData.messageId,
      },
    });
  } catch {
    return NextResponse.json(
      {
        success: false,
        error: "Failed to perform Kavach security analysis on email.",
        code: "ANALYZE_ERROR",
      },
      { status: 500 }
    );
  }
}
