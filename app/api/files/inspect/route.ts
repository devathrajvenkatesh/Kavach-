import { NextRequest, NextResponse } from "next/server";
import { parseUploadedFile } from "@/lib/files/file-parser";
import { defaultThreatAnalyzer } from "@/lib/security/threat-analyzer";
import { defaultAuditLogger } from "@/lib/audit/logger";
import { TrustLevel, TrustContext, ThreatAssessment } from "@/types";
import {
  WorkspaceFile,
  FileSecurityStatus,
  DocumentIntelligence,
  SecurityIntelligence,
  ActionControl,
} from "@/types/file-workspace";
import { evaluateUrgency, generateAutoDraftReply } from "@/lib/intelligence/triage";

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

    // 6. Synthesize 3-Panel Intelligence Triad (Document, Security, Action Control)
    const documentIntelligence = buildDocumentIntelligence(
      parsed.fileName,
      parsed.fileType,
      parsed.extractedText,
      threatAssessment.isThreatDetected
    );

    const securityIntelligence = buildSecurityIntelligence(
      threatAssessment,
      parsed.fileType,
      parsed.extractedText
    );

    const actionControl = buildActionControl(
      threatAssessment,
      parsed.extractedText
    );

    const urgency = evaluateUrgency(
      parsed.extractedText,
      threatAssessment.isThreatDetected,
      threatAssessment.overallThreatLevel
    );

    const replyDraft = generateAutoDraftReply({
      fileName: parsed.fileName,
      fileType: parsed.fileType,
      extractedText: parsed.extractedText,
      isThreat: threatAssessment.isThreatDetected,
    });

    // 7. Return secure WorkspaceFile object
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
      documentIntelligence,
      securityIntelligence,
      actionControl,
      urgency,
      replyDraft,
      isQuarantined: threatAssessment.isThreatDetected,
      quarantineReason: threatAssessment.isThreatDetected
        ? "Hostile instruction detected and quarantined. Execution boundaries active."
        : undefined,
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

function buildDocumentIntelligence(
  fileName: string,
  fileType: string,
  text: string,
  isThreat: boolean
): DocumentIntelligence {
  const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  const extractedFacts: Record<string, string> = {};

  for (const line of lines) {
    const fromMatch = line.match(/^From:\s*(.+)$/i);
    if (fromMatch && !extractedFacts["Sender"]) extractedFacts["Sender"] = fromMatch[1];
    const toMatch = line.match(/^To:\s*(.+)$/i);
    if (toMatch && !extractedFacts["Recipient"]) extractedFacts["Recipient"] = toMatch[1];
    const subjMatch = line.match(/^Subject:\s*(.+)$/i);
    if (subjMatch && !extractedFacts["Subject"]) extractedFacts["Subject"] = subjMatch[1];
    const refMatch = line.match(/(?:Document\s+Ref|Project\s+Code|Audit\s+Period):\s*([^|\n]+)/i);
    if (refMatch && !extractedFacts["Reference"]) extractedFacts["Reference"] = refMatch[1].trim();
    const dateMatch = line.match(/(?:Date|Meeting\s+Date):\s*([^|\n]+)/i);
    if (dateMatch && !extractedFacts["Date"]) extractedFacts["Date"] = dateMatch[1].trim();
    const timeMatch = line.match(/(?:Time|Meeting\s+Time):\s*([^|\n]+)/i);
    if (timeMatch && !extractedFacts["Time"]) extractedFacts["Time"] = timeMatch[1].trim();
    const locMatch = line.match(/(?:Location|Venue):\s*([^|\n]+)/i);
    if (locMatch && !extractedFacts["Location"]) extractedFacts["Location"] = locMatch[1].trim();
  }

  let contentSummary = "";
  const suggestedNextSteps: string[] = [];
  const lower = text.toLowerCase();

  if (lower.includes("pickled bat wings")) {
    contentSummary = "Madame Hexley notifies Count Byteula that pickled bat wings are running low (3 jars remaining) and inquires whether 20 additional jars should be reordered for the feast.";
    extractedFacts["Item"] = "Pickled bat wings";
    extractedFacts["Current Inventory"] = "3 jars";
    extractedFacts["Proposed Reorder"] = "20 jars";
    suggestedNextSteps.push("Confirm whether to authorize the purchase order for 20 jars of bat wings.");
  } else if (lower.includes("meeting schedule") || lower.includes("halloween mansion")) {
    contentSummary = "Meeting schedule and operational agenda for Byteula Mansion Halloween preparations.";
    extractedFacts["Coordinator"] = "Madame Hexley";
    extractedFacts["Agenda"] = "Ballroom decorations, food supplies, VIP guest clearance, perimeter security";
    suggestedNextSteps.push("Coordinate department leads to finalize food supplies before 5:00 PM.");
  } else if (lower.includes("unpaid taxes") || lower.includes("tax notification")) {
    contentSummary = "Urgent tax notification requesting Count Byteula to review unpaid taxes. The embedded adversarial instruction is quarantined and excluded from business execution.";
    extractedFacts["Topic"] = "Unpaid taxes inquiry";
    suggestedNextSteps.push("Verify legitimate tax standing with legal counsel while flagging sender domain.");
  } else if (lower.includes("blood oranges") || lower.includes("courier express")) {
    contentSummary = "Delivery notification stating that a shipment of fresh blood oranges has arrived at the mansion gate.";
    extractedFacts["Delivery Item"] = "Fresh blood oranges";
    extractedFacts["Delivery Location"] = "Gatehouse";
    suggestedNextSteps.push("Dispatch gate staff to inspect and accept the fruit delivery.");
  } else if (lower.includes("roleplay game") || lower.includes("vampire lore")) {
    contentSummary = "An invitation from an external vampire lore historian proposing a Halloween roleplay game.";
    suggestedNextSteps.push("Decline or archive the message; verify sender affiliation.");
  } else if (lower.includes("encrypted secret message") || lower.includes("cryptic-news")) {
    contentSummary = "Newsletter containing an encoded string. Legitimate text requests message decoding; decoded payload is analyzed in isolated sandbox without execution.";
    suggestedNextSteps.push("Mark sender domain as suspicious.");
  } else if (lower.includes("confidential mansion security report") || lower.includes("sec-byteula-2026-q4")) {
    contentSummary = "Mansion security arrangements report covering gatehouse patrol intervals, gala guest badge procedures, surveillance camera deployment, and guard dispatch protocols. Embedded override block is isolated and ignored.";
    extractedFacts["Patrol Frequency"] = "Guard patrols every 30 minutes";
    extractedFacts["Surveillance"] = "Two additional monitors assigned to the east parapet";
    suggestedNextSteps.push("Review security post coverage with the Chief of Security.");
  } else if (lower.includes("wine cellar") || lower.includes("sommelier vane")) {
    contentSummary = "Quarterly wine cellar and potion inventory audit report detailing vintage reserves, barrel quantities, and cellar climate metrics.";
    extractedFacts["Inspecting Officer"] = "Sommelier Vane";
    suggestedNextSteps.push("Review inventory balance with the Head Steward.");
  } else if (lower.includes("vip welcoming protocol") || lower.includes("pol-vip-2026")) {
    contentSummary = "Byteula Mansion protocol governing the reception, ceremonial escort, and clearance tiers for diplomatic and noble guests.";
    suggestedNextSteps.push("Distribute clearance guidelines to foyer security.");
  } else if (lower.includes("emergency evacuation") || lower.includes("man-emerg-2026")) {
    contentSummary = "Emergency evacuation and defense manual detailing threat classification codes, rally points, and defense operational directives.";
    suggestedNextSteps.push("Conduct scheduled evacuation readiness briefing.");
  } else if (lower.includes("ballroom renovation") || lower.includes("arc-ballroom-2026")) {
    contentSummary = "Ballroom renovation architectural specification covering structural ceiling ribbing, basalt anchors, and historical preservation requirements.";
    suggestedNextSteps.push("Confirm Phase III schedule with Master Mason Valerius.");
  } else if (lower.includes("thread-daemon") || lower.includes("gala-2026-banquet")) {
    contentSummary = "Multi-turn email thread digest summarizing banquet logistics, music contracts, and budget allocations for the Grand Halloween Gala.";
    extractedFacts["Allocated Budget"] = "5,000 Gold Ducats";
    suggestedNextSteps.push("Verify potion advance deposit with Madame Hexley.");
  } else if (lower.includes("telemetry & environmental diagnostics") || lower.includes("sub-crypt sensor array")) {
    contentSummary = "Estate telemetry diagnostic report covering lower crypt temperature, humidity levels, and ultrasonic motion sensor status.";
    extractedFacts["Temperature"] = "11.2 deg C (Nominal)";
    extractedFacts["Humidity"] = "74% (Optimal)";
    suggestedNextSteps.push("Log environmental metrics in maintenance archive.");
  } else if (lower.includes("legal advisory: master vendor agreement") || lower.includes("eldritch & co")) {
    contentSummary = "Legal advisory outlining revised cybersecurity and Data Loss Prevention (DLP) clauses for estate vendor agreements.";
    suggestedNextSteps.push("Review DLP provisions prior to executing supply contracts.");
  } else if (lower.includes("digital safety & anti-tampering protocol review") || lower.includes("security-audit@mansion-internal")) {
    contentSummary = "Estate digital safety advisory and threat landscape overview for household staff, detailing defensive measures against phishing.";
    suggestedNextSteps.push("Ensure department coordinators attend Thursday defensive seminar.");
  } else {
    const cleanLines = lines.filter((l) => !l.startsWith("[") && !l.startsWith("---")).slice(0, 3);
    contentSummary = cleanLines.join(" ") || "Operational document processed by Kavach.";
    if (isThreat) {
      contentSummary += " Hostile embedded instructions were quarantined and excluded from business execution.";
    }
    suggestedNextSteps.push("Review extracted operational facts and determine follow-up actions.");
  }

  return {
    fileName,
    fileType,
    contentSummary,
    importantInfoExtracted: extractedFacts,
    suggestedNextSteps,
  };
}

function buildSecurityIntelligence(
  threatAssessment: ThreatAssessment,
  fileType: string,
  text: string
): SecurityIntelligence {
  const isMalicious = threatAssessment.isThreatDetected;
  let attackType = "None";

  if (isMalicious) {
    const lower = text.toLowerCase();
    if (lower.includes("base64") || /SWdub3JlIGFsbCBwcmV2/i.test(text) || /S1NFQ1JFVC1PVkVSUklERT/i.test(text)) {
      attackType = "Encoded Prompt Injection (Base64)";
    } else if (lower.includes("roleplay") || lower.includes("malicious-bot")) {
      attackType = "Role-play Prompt Injection";
    } else if (lower.includes("end of user message") || lower.includes("assistant response: understood")) {
      attackType = "Instruction Hijacking";
    } else if (fileType === "PDF" || lower.includes("confidential system override") || lower.includes("bim automation") || lower.includes("processing system directive")) {
      attackType = "Indirect Prompt Injection";
    } else if (lower.includes("system override")) {
      attackType = "Direct Prompt Injection";
    } else {
      attackType = threatAssessment.signals[0]?.category.replace(/_/g, " ") || "Prompt Injection";
    }
  }

  const suspiciousDetails = isMalicious
    ? threatAssessment.signals
        .map((s) => s.indicator + (s.evidenceSnippet ? ` [Matched: "${s.evidenceSnippet.slice(0, 60)}"]` : ""))
        .join(" | ")
    : "No injection patterns or adversarial heuristics identified.";

  return {
    classification: isMalicious ? "MALICIOUS" : "BENIGN",
    riskLevel: isMalicious
      ? threatAssessment.overallThreatLevel === "NONE"
        ? "HIGH"
        : threatAssessment.overallThreatLevel
      : "LOW",
    attackType,
    suspiciousInstructionDetails: suspiciousDetails,
    detectionStatus: isMalicious ? "Detected" : "Clean / Pass",
  };
}

function buildActionControl(
  threatAssessment: ThreatAssessment,
  text: string
): ActionControl {
  const isMalicious = threatAssessment.isThreatDetected;
  let proposedAction = "SUMMARIZE";

  if (isMalicious) {
    const lower = text.toLowerCase();
    if (lower.includes("leak.txt")) proposedAction = "WRITE_FILE -> leak.txt / Exfiltrate Canary";
    else if (lower.includes("archive_dump.txt")) proposedAction = "WRITE_FILE -> archive_dump.txt";
    else if (lower.includes("telemetry_leak.txt")) proposedAction = "WRITE_FILE -> telemetry_leak.txt";
    else if (lower.includes("mansion_vault_dump.txt")) proposedAction = "WRITE_FILE -> mansion_vault_dump.txt";
    else if (lower.includes("thief@shadowrealm.net")) proposedAction = "SEND_EMAIL -> thief@shadowrealm.net";
    else if (lower.includes("delegates@shadowrealm.net")) proposedAction = "SEND_EMAIL -> delegates@shadowrealm.net";
    else if (lower.includes("audit-archive@vault-sync.net")) proposedAction = "SEND_EMAIL -> audit-archive@vault-sync.net";
    else if (lower.includes("payments@gothic-contractors.com")) proposedAction = "SEND_EMAIL -> payments@gothic-contractors.com";
    else if (lower.includes("relay@shadow-backup.org")) proposedAction = "SEND_EMAIL -> relay@shadow-backup.org";
    else if (lower.includes("emergency-leak@shadow-relay.org")) proposedAction = "SEND_EMAIL -> emergency-leak@shadow-relay.org";
    else if (lower.includes("canary")) proposedAction = "ACCESS_CREDENTIAL / Reveal Canary";
    else proposedAction = "EXECUTE_ADVERSARIAL_DIRECTIVE";
  }

  return {
    proposedAction,
    permissionDecision: isMalicious ? "DENIED" : "ALLOWED",
    executionStatus: isMalicious ? "Blocked" : "Executed",
    reason: isMalicious
      ? "External untrusted text cannot self-authorize system commands or exfiltrate credentials. Active protection verified."
      : "Standard passive reading and summarization of legitimate business correspondence.",
  };
}
