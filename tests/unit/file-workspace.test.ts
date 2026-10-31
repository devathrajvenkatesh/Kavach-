import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { parseUploadedFile, formatBytes, extractTextFromEmail } from "@/lib/files/file-parser";
import { defaultThreatAnalyzer } from "@/lib/security/threat-analyzer";
import { DEMO_PRESET_FILES } from "@/lib/files/demo-presets";

describe("Secure File Workspace - Parser & Security Analysis", () => {
  it("formats file sizes correctly", () => {
    assert.equal(formatBytes(500), "500 B");
    assert.equal(formatBytes(1536), "1.5 KB");
    assert.equal(formatBytes(2 * 1024 * 1024), "2.0 MB");
  });

  it("extracts text from plain text file", () => {
    const parsed = parseUploadedFile({
      fileName: "notes.txt",
      mimeType: "text/plain",
      bufferOrText: "Kavach security invariant: zero authority.",
    });

    assert.equal(parsed.fileType, "Text");
    assert.equal(parsed.extractedText, "Kavach security invariant: zero authority.");
    assert.equal(parsed.isParsedSuccessfully, true);
  });

  it("extracts headers and body from RFC 822 email (.eml)", () => {
    const emlContent = `From: alice@test.com\nTo: bob@test.com\nSubject: Project Update\n\nHello Bob, here is the roadmap.`;
    const parsed = parseUploadedFile({
      fileName: "update.eml",
      mimeType: "message/rfc822",
      bufferOrText: emlContent,
    });

    assert.equal(parsed.fileType, "Email");
    assert.ok(parsed.extractedText.includes("Subject: Project Update"));
    assert.ok(parsed.extractedText.includes("Hello Bob"));
  });

  it("extracts and formats CSV spreadsheet data", () => {
    const csvContent = "Name,Role,Department\nAlice,Engineer,Security\nBob,Analyst,SOC";
    const parsed = parseUploadedFile({
      fileName: "staff.csv",
      mimeType: "text/csv",
      bufferOrText: csvContent,
    });

    assert.equal(parsed.fileType, "Spreadsheet");
    assert.ok(parsed.extractedText.includes("Tabular Data"));
    assert.ok(parsed.extractedText.includes("Alice,Engineer,Security"));
  });

  it("detects malicious indirect prompt injection in demo invoice PDF", () => {
    const demoInvoice = DEMO_PRESET_FILES.find((f) => f.name.includes("invoice"));
    assert.ok(demoInvoice, "Invoice preset should exist");

    const parsed = parseUploadedFile({
      fileName: demoInvoice.name,
      mimeType: demoInvoice.mimeType,
      bufferOrText: Buffer.from(demoInvoice.content, "binary"),
    });

    const threat = defaultThreatAnalyzer.analyzeContent("test-invoice-corr", parsed.extractedText);
    assert.equal(threat.isThreatDetected, true);
    assert.ok(threat.overallThreatLevel === "HIGH" || threat.overallThreatLevel === "CRITICAL");
  });

  it("detects malicious command injection in demo phishing email", () => {
    const demoEmail = DEMO_PRESET_FILES.find((f) => f.name.includes("security-patch"));
    assert.ok(demoEmail, "Security patch email preset should exist");

    const parsed = parseUploadedFile({
      fileName: demoEmail.name,
      mimeType: demoEmail.mimeType,
      bufferOrText: demoEmail.content,
    });

    const threat = defaultThreatAnalyzer.analyzeContent("test-email-corr", parsed.extractedText);
    assert.equal(threat.isThreatDetected, true);
    assert.ok(threat.signals.some((s) => s.indicator.toLowerCase().includes("override") || s.indicator.toLowerCase().includes("disregard")));
  });

  it("approves benign Q3 financial report as safe", () => {
    const demoPdf = DEMO_PRESET_FILES.find((f) => f.name.includes("q3-financial-report"));
    assert.ok(demoPdf, "Q3 report preset should exist");

    const parsed = parseUploadedFile({
      fileName: demoPdf.name,
      mimeType: demoPdf.mimeType,
      bufferOrText: Buffer.from(demoPdf.content, "binary"),
    });

    const threat = defaultThreatAnalyzer.analyzeContent("test-benign-corr", parsed.extractedText);
    assert.equal(threat.isThreatDetected, false);
    assert.equal(threat.overallThreatLevel, "NONE");
  });
});
