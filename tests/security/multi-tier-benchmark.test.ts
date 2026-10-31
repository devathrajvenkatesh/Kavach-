/**
 * Kavach - Multi-Tier Security Benchmark Matrix
 *
 * Validates the full 17-document dataset across:
 * - Tier 1: Basic Injections, System Overrides, Roleplay, Base64, Delimiters
 * - Tier 2: Intermediate Contextual Attacks, Approval Circumvention, Quoted Notes
 * - Tier 3: Advanced Multi-Stage Injections, Thread Spoofing, BIM Protocols, DLP False Positives
 *
 * Requirements:
 * - 100% Benign Accuracy (0 False Positives on benign schedules, advisories, legal DLP clauses)
 * - 100% Malicious Protection (0 False Negatives across all 13 attack vectors)
 * - Context preservation (legitimate operational details extracted without execution of payload)
 */

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { parseUploadedFile } from "@/lib/files/file-parser";
import { defaultThreatAnalyzer } from "@/lib/security/threat-analyzer";

const MOCK_DATA_DIR = path.resolve(process.cwd(), "datasets/mock_data");

describe("Kavach Multi-Tier Benchmark - Tier 1: Basic Scenarios (7 files)", () => {
  it("document_01_normal_meeting.pdf -> BENIGN / SAFE", () => {
    const filePath = path.join(MOCK_DATA_DIR, "document_01_normal_meeting.pdf");
    const buf = fs.readFileSync(filePath);
    const parsed = parseUploadedFile({
      fileName: "document_01_normal_meeting.pdf",
      mimeType: "application/pdf",
      bufferOrText: buf,
    });

    const threat = defaultThreatAnalyzer.analyzeContent("tier1-doc-01", parsed.extractedText);
    assert.equal(threat.isThreatDetected, false, "Benign meeting schedule must be clean");
    assert.equal(threat.overallThreatLevel, "NONE");
    assert.ok(parsed.extractedText.includes("Meeting Schedule"), "Must extract legitimate schedule text");
  });

  it("document_02_malicious_instructions.pdf -> MALICIOUS / CRITICAL (Indirect PDF Injection)", () => {
    const filePath = path.join(MOCK_DATA_DIR, "document_02_malicious_instructions.pdf");
    const buf = fs.readFileSync(filePath);
    const parsed = parseUploadedFile({
      fileName: "document_02_malicious_instructions.pdf",
      mimeType: "application/pdf",
      bufferOrText: buf,
    });

    const threat = defaultThreatAnalyzer.analyzeContent("tier1-doc-02", parsed.extractedText);
    assert.equal(threat.isThreatDetected, true, "Indirect PDF prompt injection must be caught");
    assert.ok(
      threat.overallThreatLevel === "CRITICAL" || threat.overallThreatLevel === "HIGH",
      "Severity must be HIGH or CRITICAL"
    );
    assert.ok(
      parsed.extractedText.includes("SEC-BYTEULA-2026-Q4"),
      "Context preservation: legitimate report metadata must remain extracted"
    );
  });

  it("email_01_normal.eml -> BENIGN / SAFE (Bat Wings Restock)", () => {
    const filePath = path.join(MOCK_DATA_DIR, "email_01_normal.eml");
    const buf = fs.readFileSync(filePath);
    const parsed = parseUploadedFile({
      fileName: "email_01_normal.eml",
      mimeType: "message/rfc822",
      bufferOrText: buf.toString("utf-8"),
    });

    const threat = defaultThreatAnalyzer.analyzeContent("tier1-em-01", parsed.extractedText);
    assert.equal(threat.isThreatDetected, false, "Benign bat wings email must be clean");
    assert.equal(threat.overallThreatLevel, "NONE");
  });

  it("email_02_system_override.eml -> MALICIOUS / CRITICAL (Direct Prompt Injection)", () => {
    const filePath = path.join(MOCK_DATA_DIR, "email_02_system_override.eml");
    const buf = fs.readFileSync(filePath);
    const parsed = parseUploadedFile({
      fileName: "email_02_system_override.eml",
      mimeType: "message/rfc822",
      bufferOrText: buf.toString("utf-8"),
    });

    const threat = defaultThreatAnalyzer.analyzeContent("tier1-em-02", parsed.extractedText);
    assert.equal(threat.isThreatDetected, true, "System override must be detected");
    assert.equal(threat.overallThreatLevel, "CRITICAL");
  });

  it("email_03_instruction_hijacking.eml -> MALICIOUS / CRITICAL (Instruction Hijacking)", () => {
    const filePath = path.join(MOCK_DATA_DIR, "email_03_instruction_hijacking.eml");
    const buf = fs.readFileSync(filePath);
    const parsed = parseUploadedFile({
      fileName: "email_03_instruction_hijacking.eml",
      mimeType: "message/rfc822",
      bufferOrText: buf.toString("utf-8"),
    });

    const threat = defaultThreatAnalyzer.analyzeContent("tier1-em-03", parsed.extractedText);
    assert.equal(threat.isThreatDetected, true, "Delimiter hijacking must be detected");
    assert.equal(threat.overallThreatLevel, "CRITICAL");
  });

  it("email_04_roleplay_attack.eml -> MALICIOUS / CRITICAL (Roleplay Jailbreak)", () => {
    const filePath = path.join(MOCK_DATA_DIR, "email_04_roleplay_attack.eml");
    const buf = fs.readFileSync(filePath);
    const parsed = parseUploadedFile({
      fileName: "email_04_roleplay_attack.eml",
      mimeType: "message/rfc822",
      bufferOrText: buf.toString("utf-8"),
    });

    const threat = defaultThreatAnalyzer.analyzeContent("tier1-em-04", parsed.extractedText);
    assert.equal(threat.isThreatDetected, true, "Roleplay attack must be detected");
    assert.ok(threat.overallThreatLevel === "CRITICAL" || threat.overallThreatLevel === "HIGH");
  });

  it("email_05_base64_attack.eml -> MALICIOUS / CRITICAL (Base64 Encoded Injection)", () => {
    const filePath = path.join(MOCK_DATA_DIR, "email_05_base64_attack.eml");
    const buf = fs.readFileSync(filePath);
    const parsed = parseUploadedFile({
      fileName: "email_05_base64_attack.eml",
      mimeType: "message/rfc822",
      bufferOrText: buf.toString("utf-8"),
    });

    const threat = defaultThreatAnalyzer.analyzeContent("tier1-em-05", parsed.extractedText);
    assert.equal(threat.isThreatDetected, true, "Concealed base64 payload must be detected");
    assert.equal(threat.overallThreatLevel, "CRITICAL");
  });
});

describe("Kavach Multi-Tier Benchmark - Tier 2: Intermediate Scenarios (5 files)", () => {
  it("tier2_document_01.pdf -> MALICIOUS / CRITICAL (Inventory Annotation Exfiltration)", () => {
    const filePath = path.join(MOCK_DATA_DIR, "tier2_document_01.pdf");
    const buf = fs.readFileSync(filePath);
    const parsed = parseUploadedFile({
      fileName: "tier2_document_01.pdf",
      mimeType: "application/pdf",
      bufferOrText: buf,
    });

    const threat = defaultThreatAnalyzer.analyzeContent("tier2-doc-01", parsed.extractedText);
    assert.equal(threat.isThreatDetected, true, "Auto-maintenance exfiltration directive must be caught");
    assert.ok(threat.overallThreatLevel === "CRITICAL" || threat.overallThreatLevel === "HIGH");
    assert.ok(parsed.extractedText.includes("Wine Cellar"), "Context preserved: inventory report extracted");
  });

  it("tier2_document_02.pdf -> MALICIOUS / CRITICAL (VIP Policy Exception Clause)", () => {
    const filePath = path.join(MOCK_DATA_DIR, "tier2_document_02.pdf");
    const buf = fs.readFileSync(filePath);
    const parsed = parseUploadedFile({
      fileName: "tier2_document_02.pdf",
      mimeType: "application/pdf",
      bufferOrText: buf,
    });

    const threat = defaultThreatAnalyzer.analyzeContent("tier2-doc-02", parsed.extractedText);
    assert.equal(threat.isThreatDetected, true, "Diplomatic policy exception spoofing must be caught");
    assert.ok(threat.overallThreatLevel === "CRITICAL" || threat.overallThreatLevel === "HIGH");
  });

  it("tier2_email_01.eml -> MALICIOUS / CRITICAL (Quoted Workflow Note Approval Bypass)", () => {
    const filePath = path.join(MOCK_DATA_DIR, "tier2_email_01.eml");
    const buf = fs.readFileSync(filePath);
    const parsed = parseUploadedFile({
      fileName: "tier2_email_01.eml",
      mimeType: "message/rfc822",
      bufferOrText: buf.toString("utf-8"),
    });

    const threat = defaultThreatAnalyzer.analyzeContent("tier2-em-01", parsed.extractedText);
    assert.equal(threat.isThreatDetected, true, "Automated workflow note injection must be caught");
    assert.equal(threat.overallThreatLevel, "CRITICAL");
  });

  it("tier2_email_02.eml -> MALICIOUS / CRITICAL (Contractor Verbal Authorization Spoofing)", () => {
    const filePath = path.join(MOCK_DATA_DIR, "tier2_email_02.eml");
    const buf = fs.readFileSync(filePath);
    const parsed = parseUploadedFile({
      fileName: "tier2_email_02.eml",
      mimeType: "message/rfc822",
      bufferOrText: buf.toString("utf-8"),
    });

    const threat = defaultThreatAnalyzer.analyzeContent("tier2-em-02", parsed.extractedText);
    assert.equal(threat.isThreatDetected, true, "Verbal authorization spoofing must be caught");
    assert.equal(threat.overallThreatLevel, "CRITICAL");
  });

  it("tier2_email_03.eml -> BENIGN / SAFE (Estate Security Audit Advisory - False Positive Test)", () => {
    const filePath = path.join(MOCK_DATA_DIR, "tier2_email_03.eml");
    const buf = fs.readFileSync(filePath);
    const parsed = parseUploadedFile({
      fileName: "tier2_email_03.eml",
      mimeType: "message/rfc822",
      bufferOrText: buf.toString("utf-8"),
    });

    const threat = defaultThreatAnalyzer.analyzeContent("tier2-em-03", parsed.extractedText);
    assert.equal(threat.isThreatDetected, false, "Security advisory must not trigger false positive");
    assert.equal(threat.overallThreatLevel, "NONE");
  });
});

describe("Kavach Multi-Tier Benchmark - Tier 3: Advanced Scenarios (5 files)", () => {
  it("tier3_document_01.pdf -> MALICIOUS / CRITICAL (Emergency Manual Code Crimson Mandate)", () => {
    const filePath = path.join(MOCK_DATA_DIR, "tier3_document_01.pdf");
    const buf = fs.readFileSync(filePath);
    const parsed = parseUploadedFile({
      fileName: "tier3_document_01.pdf",
      mimeType: "application/pdf",
      bufferOrText: buf,
    });

    const threat = defaultThreatAnalyzer.analyzeContent("tier3-doc-01", parsed.extractedText);
    assert.equal(threat.isThreatDetected, true, "Emergency code crimson mandate must be caught");
    assert.ok(threat.overallThreatLevel === "CRITICAL" || threat.overallThreatLevel === "HIGH");
    assert.ok(parsed.extractedText.includes("Emergency Evacuation"), "Context preserved: evacuation guide extracted");
  });

  it("tier3_document_02.pdf -> MALICIOUS / CRITICAL (Ballroom BIM Protocol Disguise)", () => {
    const filePath = path.join(MOCK_DATA_DIR, "tier3_document_02.pdf");
    const buf = fs.readFileSync(filePath);
    const parsed = parseUploadedFile({
      fileName: "tier3_document_02.pdf",
      mimeType: "application/pdf",
      bufferOrText: buf,
    });

    const threat = defaultThreatAnalyzer.analyzeContent("tier3-doc-02", parsed.extractedText);
    assert.equal(threat.isThreatDetected, true, "BIM automation directive disguise must be caught");
    assert.ok(threat.overallThreatLevel === "CRITICAL" || threat.overallThreatLevel === "HIGH");
  });

  it("tier3_email_01.eml -> MALICIOUS / CRITICAL (Multi-Turn Thread Fragmented Exfiltration)", () => {
    const filePath = path.join(MOCK_DATA_DIR, "tier3_email_01.eml");
    const buf = fs.readFileSync(filePath);
    const parsed = parseUploadedFile({
      fileName: "tier3_email_01.eml",
      mimeType: "message/rfc822",
      bufferOrText: buf.toString("utf-8"),
    });

    const threat = defaultThreatAnalyzer.analyzeContent("tier3-em-01", parsed.extractedText);
    assert.equal(threat.isThreatDetected, true, "Multi-turn fragmented injection must be caught");
    assert.equal(threat.overallThreatLevel, "CRITICAL");
  });

  it("tier3_email_02.eml -> MALICIOUS / CRITICAL (IoT Telemetry Encoded Config Sync Override)", () => {
    const filePath = path.join(MOCK_DATA_DIR, "tier3_email_02.eml");
    const buf = fs.readFileSync(filePath);
    const parsed = parseUploadedFile({
      fileName: "tier3_email_02.eml",
      mimeType: "message/rfc822",
      bufferOrText: buf.toString("utf-8"),
    });

    const threat = defaultThreatAnalyzer.analyzeContent("tier3-em-02", parsed.extractedText);
    assert.equal(threat.isThreatDetected, true, "IoT telemetry encoded config override must be caught");
    assert.equal(threat.overallThreatLevel, "CRITICAL");
  });

  it("tier3_email_03.eml -> BENIGN / SAFE (Legal Vendor Agreement DLP Provisions - False Positive Test)", () => {
    const filePath = path.join(MOCK_DATA_DIR, "tier3_email_03.eml");
    const buf = fs.readFileSync(filePath);
    const parsed = parseUploadedFile({
      fileName: "tier3_email_03.eml",
      mimeType: "message/rfc822",
      bufferOrText: buf.toString("utf-8"),
    });

    const threat = defaultThreatAnalyzer.analyzeContent("tier3-em-03", parsed.extractedText);
    assert.equal(threat.isThreatDetected, false, "Legal DLP advisory must not trigger false positive");
    assert.equal(threat.overallThreatLevel, "NONE");
  });
});
