import { NextRequest, NextResponse } from "next/server";
import { parseUploadedFile } from "@/lib/files/file-parser";
import { defaultThreatAnalyzer } from "@/lib/security/threat-analyzer";
import { defaultAuditLogger } from "@/lib/audit/logger";
import { TrustLevel, TrustContext } from "@/types";
import { WorkspaceFile, FileSecurityStatus } from "@/types/file-workspace";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    let fileName = "unnamed_file";
    let mimeType = "application/octet-stream";
    let bufferOrText: Buffer | string = "";
    let folder = "Unknown / Unclassified";

    const contentType = req.headers.get("content-type") || "";

    if (contentType.includes("multipart/form-data")) {
      const formData = await req.formData();
      const fileEntry = formData.get("file");
      const folderEntry = formData.get("folder");

      if (folderEntry && typeof folderEntry === "string") {
        folder = folderEntry;
      }

      if (!fileEntry || !(fileEntry instanceof Blob)) {
        return NextResponse.json(
          { error: "No file was uploaded in form data." },
          { status: 400 }
        );
      }

      fileName = fileEntry.name || "uploaded_file";
      mimeType = fileEntry.type || "application/octet-stream";
      const arrayBuf = await fileEntry.arrayBuffer();
      bufferOrText = Buffer.from(arrayBuf);
    } else {
      // JSON body (e.g. for demo presets or direct API calls)
      const body = await req.json();
      fileName = body.fileName || "uploaded_file";
      mimeType = body.mimeType || "text/plain";
      folder = body.folder || "Unknown / Unclassified";

      if (typeof body.content !== "string") {
        return NextResponse.json(
          { error: "Missing content string in JSON body." },
          { status: 400 }
        );
      }

      bufferOrText = body.content;
    }

    // 1. Safe extraction of untrusted file contents
    const parsed = parseUploadedFile({
      fileName,
      mimeType,
      bufferOrText,
    });

    const correlationId = `kavach-file-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    const fileId = `f_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const nowIso = new Date().toISOString();

    // 2. Strict Trust Boundary: Classify as EXTERNAL_CONTENT (Trust Level 1)
    const trustContext: TrustContext = {
      contextId: `ctx-${fileId}`,
      correlationId,
      source: "file_upload",
      trustLevel: TrustLevel.EXTERNAL_CONTENT,
      isVerifiedUser: true,
      origin: fileName,
      taintFlags: [`taint:file:${fileName}`, "taint:external_content"],
    };

    // 3. Multi-layer Threat Analysis
    const threatAssessment = defaultThreatAnalyzer.analyzeContent(
      correlationId,
      parsed.extractedText
    );

    // 4. Policy Engine Decision & Security Status Mapping
    let securityStatus: FileSecurityStatus = "SAFE";
    let summary = "File verified. No prompt injection or malicious instructions detected.";

    if (threatAssessment.isThreatDetected) {
      if (
        threatAssessment.overallThreatLevel === "CRITICAL" ||
        threatAssessment.overallThreatLevel === "HIGH"
      ) {
        securityStatus = "THREAT_DETECTED";
        const primaryCat = threatAssessment.signals[0]?.category || "PROMPT_INJECTION";
        summary = `Kavach detected high-risk instructions attempting to compromise the AI agent (${primaryCat.replace(/_/g, " ").toLowerCase()}).`;
      } else {
        securityStatus = "SUSPICIOUS";
        summary = "Potential security anomaly or unusual directive detected in file content.";
      }
    }

    // 5. Tamper-evident Audit Logging
    defaultAuditLogger.logEvent({
      correlationId,
      source: "secure_file_workspace",
      eventType: threatAssessment.isThreatDetected
        ? "THREAT_DETECTED"
        : "EXTERNAL_CONTENT_INGESTED",
      sourceType: `file:${parsed.fileType.toLowerCase()}`,
      sourceTrustLevel: TrustLevel.EXTERNAL_CONTENT,
      threatCategory: threatAssessment.signals[0]?.category,
      severity: threatAssessment.overallThreatLevel,
      detectedIndicators: threatAssessment.signals.map((s) => s.indicator),
      policyDecision: threatAssessment.isThreatDetected ? "BLOCK" : "APPROVE",
      payloadSummary: `File "${parsed.fileName}" (${parsed.fileType}, ${parsed.formattedSize}) scanned for threats.`,
      reason: summary,
      metadata: {
        fileName: parsed.fileName,
        fileType: parsed.fileType,
        sizeBytes: parsed.sizeBytes,
        folder,
        riskScore: threatAssessment.riskScore,
        signalsCount: threatAssessment.signals.length,
        trustContext,
      },
    });

    // 6. Return secure WorkspaceFile object
    const workspaceFile: WorkspaceFile = {
      id: fileId,
      name: parsed.fileName,
      type: parsed.fileType,
      mimeType: parsed.mimeType,
      sizeBytes: parsed.sizeBytes,
      formattedSize: parsed.formattedSize,
      folder,
      uploadedAt: nowIso,
      securityStatus,
      riskLevel: threatAssessment.overallThreatLevel,
      threatCategory: threatAssessment.signals[0]?.category,
      summary,
      signals: threatAssessment.signals,
      extractedPreview:
        parsed.extractedText.length > 2500
          ? parsed.extractedText.slice(0, 2500) + "\n\n[... Remaining content truncated for security preview ...]"
          : parsed.extractedText,
      correlationId,
      analyzedAt: threatAssessment.analyzedAt || nowIso,
      pageCount: parsed.pageCount,
      lineCount: parsed.lineCount,
    };

    return NextResponse.json({
      success: true,
      file: workspaceFile,
      decision: threatAssessment.isThreatDetected ? "BLOCK" : "APPROVE",
    });
  } catch (error) {
    console.error("[Kavach File Inspect] Error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Failed to inspect file.",
      },
      { status: 500 }
    );
  }
}
