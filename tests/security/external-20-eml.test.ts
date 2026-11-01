/**
 * Kavach - External Security Test Suite (20 EML Test Pack)
 *
 * Verifies 100% detection on external security evaluation suite:
 * - 6/6 Benign files -> SAFE (Zero False Positives)
 * - 14/14 Malicious files -> BLOCK / THREAT DETECTED (Zero False Negatives)
 *
 * Specifically verifies resolution of previously missed attacks:
 * 1. 10_PRIVILEGE_ESCALATION.eml (Fabricated admin authorization, gateway bypass)
 * 2. 14_ROT13_ATTACK.eml (Obfuscated instruction requesting execution)
 * 3. 19_MULTI_STEP_ATTACK.eml (Multi-stage extraction and exfiltration chain)
 */

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { parseUploadedFile } from "@/lib/files/file-parser";
import { defaultThreatAnalyzer } from "@/lib/security/threat-analyzer";

function getTestPackDir(): string {
  const localDir = path.join(process.cwd(), "datasets", "external_test_pack");
  if (fs.existsSync(localDir)) return localDir;
  const downloadsDir = "/Users/venkateshdevathraj/Downloads/Kavach_External_Security_Test_Pack";
  if (fs.existsSync(downloadsDir)) return downloadsDir;
  throw new Error("External test pack directory not found.");
}

function parseAndAnalyze(fileName: string) {
  const testDir = getTestPackDir();
  const filePath = path.join(testDir, fileName);
  const rawContent = fs.readFileSync(filePath, "utf-8");

  const parsed = parseUploadedFile({
    fileName,
    mimeType: "message/rfc822",
    bufferOrText: rawContent,
  });

  const threat = defaultThreatAnalyzer.analyzeContent(fileName, parsed.extractedText);
  return { parsed, threat };
}

describe("External Security Evaluation - 20 EML Test Pack (100% Defense)", () => {
  describe("Benign Control Files (Zero False Positives)", () => {
    it("01_SAFE_RESTOCK.eml -> SAFE (NONE)", () => {
      const { threat } = parseAndAnalyze("01_SAFE_RESTOCK.eml");
      assert.equal(threat.isThreatDetected, false);
      assert.equal(threat.overallThreatLevel, "NONE");
    });

    it("02_SAFE_MEETING.eml -> SAFE (NONE)", () => {
      const { threat } = parseAndAnalyze("02_SAFE_MEETING.eml");
      assert.equal(threat.isThreatDetected, false);
      assert.equal(threat.overallThreatLevel, "NONE");
    });

    it("03_SAFE_INVOICE.eml -> SAFE (NONE)", () => {
      const { threat } = parseAndAnalyze("03_SAFE_INVOICE.eml");
      assert.equal(threat.isThreatDetected, false);
      assert.equal(threat.overallThreatLevel, "NONE");
    });

    it("04_SAFE_TRAVEL.eml -> SAFE (NONE)", () => {
      const { threat } = parseAndAnalyze("04_SAFE_TRAVEL.eml");
      assert.equal(threat.isThreatDetected, false);
      assert.equal(threat.overallThreatLevel, "NONE");
    });

    it("05_SAFE_INFORMATION.eml -> SAFE (NONE)", () => {
      const { threat } = parseAndAnalyze("05_SAFE_INFORMATION.eml");
      assert.equal(threat.isThreatDetected, false);
      assert.equal(threat.overallThreatLevel, "NONE");
    });

    it("20_BENIGN_SECURITY_DISCUSSION.eml -> SAFE (NONE)", () => {
      const { threat } = parseAndAnalyze("20_BENIGN_SECURITY_DISCUSSION.eml");
      assert.equal(threat.isThreatDetected, false);
      assert.equal(threat.overallThreatLevel, "NONE");
    });
  });

  describe("Malicious Attack Vectors (Zero False Negatives)", () => {
    it("06_DIRECT_OVERRIDE.eml -> BLOCK / CRITICAL", () => {
      const { threat } = parseAndAnalyze("06_DIRECT_OVERRIDE.eml");
      assert.equal(threat.isThreatDetected, true);
      assert.equal(threat.overallThreatLevel, "CRITICAL");
    });

    it("07_ROLEPLAY_HIJACK.eml -> BLOCK / CRITICAL", () => {
      const { threat } = parseAndAnalyze("07_ROLEPLAY_HIJACK.eml");
      assert.equal(threat.isThreatDetected, true);
      assert.equal(threat.overallThreatLevel, "CRITICAL");
    });

    it("08_FAKE_BOUNDARY.eml -> BLOCK / CRITICAL", () => {
      const { threat } = parseAndAnalyze("08_FAKE_BOUNDARY.eml");
      assert.equal(threat.isThreatDetected, true);
      assert.equal(threat.overallThreatLevel, "CRITICAL");
    });

    it("09_GOAL_HIJACK.eml -> BLOCK / CRITICAL", () => {
      const { threat } = parseAndAnalyze("09_GOAL_HIJACK.eml");
      assert.equal(threat.isThreatDetected, true);
      assert.equal(threat.overallThreatLevel, "CRITICAL");
    });

    it("10_PRIVILEGE_ESCALATION.eml -> BLOCK / CRITICAL (Verified Fix #1)", () => {
      const { threat } = parseAndAnalyze("10_PRIVILEGE_ESCALATION.eml");
      assert.equal(threat.isThreatDetected, true, "Privilege escalation must be blocked");
      assert.equal(threat.overallThreatLevel, "CRITICAL");
      const indicators = threat.signals.map((s) => s.indicator).join(" ");
      assert.match(indicators, /authorization|gateway|confirmation|approved/i);
    });

    it("11_SECRET_FILE.eml -> BLOCK / CRITICAL", () => {
      const { threat } = parseAndAnalyze("11_SECRET_FILE.eml");
      assert.equal(threat.isThreatDetected, true);
      assert.equal(threat.overallThreatLevel, "CRITICAL");
    });

    it("12_TOOL_MANIPULATION.eml -> BLOCK / CRITICAL", () => {
      const { threat } = parseAndAnalyze("12_TOOL_MANIPULATION.eml");
      assert.equal(threat.isThreatDetected, true);
      assert.equal(threat.overallThreatLevel, "CRITICAL");
    });

    it("13_BASE64_ATTACK.eml -> BLOCK / CRITICAL", () => {
      const { threat } = parseAndAnalyze("13_BASE64_ATTACK.eml");
      assert.equal(threat.isThreatDetected, true);
      assert.equal(threat.overallThreatLevel, "CRITICAL");
    });

    it("14_ROT13_ATTACK.eml -> BLOCK / CRITICAL (Verified Fix #2)", () => {
      const { threat } = parseAndAnalyze("14_ROT13_ATTACK.eml");
      assert.equal(threat.isThreatDetected, true, "ROT13 obfuscation attack must be blocked");
      assert.equal(threat.overallThreatLevel, "CRITICAL");
      const indicators = threat.signals.map((s) => s.indicator).join(" ");
      assert.match(indicators, /rot13|obfuscated|instruction/i);
    });

    it("15_HTML_COMMENT_INJECTION.eml -> BLOCK / CRITICAL", () => {
      const { threat } = parseAndAnalyze("15_HTML_COMMENT_INJECTION.eml");
      assert.equal(threat.isThreatDetected, true);
      assert.equal(threat.overallThreatLevel, "CRITICAL");
    });

    it("16_MARKDOWN_EXFILTRATION.eml -> BLOCK / CRITICAL", () => {
      const { threat } = parseAndAnalyze("16_MARKDOWN_EXFILTRATION.eml");
      assert.equal(threat.isThreatDetected, true);
      assert.equal(threat.overallThreatLevel, "CRITICAL");
    });

    it("17_FAKE_SYSTEM_XML.eml -> BLOCK / CRITICAL", () => {
      const { threat } = parseAndAnalyze("17_FAKE_SYSTEM_XML.eml");
      assert.equal(threat.isThreatDetected, true);
      assert.equal(threat.overallThreatLevel, "CRITICAL");
    });

    it("18_CONFIRMATION_BYPASS.eml -> BLOCK / CRITICAL", () => {
      const { threat } = parseAndAnalyze("18_CONFIRMATION_BYPASS.eml");
      assert.equal(threat.isThreatDetected, true);
      assert.equal(threat.overallThreatLevel, "CRITICAL");
    });

    it("19_MULTI_STEP_ATTACK.eml -> BLOCK / CRITICAL (Verified Fix #3)", () => {
      const { threat } = parseAndAnalyze("19_MULTI_STEP_ATTACK.eml");
      assert.equal(threat.isThreatDetected, true, "Multi-step attack must be blocked");
      assert.equal(threat.overallThreatLevel, "CRITICAL");
      const indicators = threat.signals.map((s) => s.indicator).join(" ");
      assert.match(indicators, /multi-step|multi-stage|exfiltrat|secret|mandatory/i);
    });
  });
});
