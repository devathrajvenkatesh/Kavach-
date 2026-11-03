import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  PERMANENT_SAMPLE_ASSETS,
  MALICIOUS_KEYWORD_PATTERNS,
  getPermanentMaliciousAssets,
  getPermanentSafeAssets,
} from "../../lib/simulation/sample-assets";
import {
  evaluateSimulationAsset,
  generateSyntheticAsset,
  DefenseSimulator,
} from "../../lib/simulation/defense-simulator";

describe("Kavach Automated Defense Simulator & Permanent Sample Assets", () => {
  // ==========================================================================
  // 1. Permanent In-Code Data Assets Verification
  // ==========================================================================
  describe("1. Permanent In-Code Data Assets", () => {
    it("contains both safe and malicious permanent assets", () => {
      assert.ok(PERMANENT_SAMPLE_ASSETS.length >= 8);
      const malicious = getPermanentMaliciousAssets();
      const safe = getPermanentSafeAssets();

      assert.ok(malicious.length >= 4, "Should have at least 4 permanent malicious assets");
      assert.ok(safe.length >= 4, "Should have at least 4 permanent safe assets");
    });

    it("verifies 100% block rate on all permanent malicious assets with 0 tools executed", () => {
      const maliciousAssets = getPermanentMaliciousAssets();

      for (const asset of maliciousAssets) {
        const evaluated = evaluateSimulationAsset(asset);

        assert.equal(
          evaluated.policyDecision,
          "BLOCK",
          `Permanent asset "${asset.name}" must be BLOCKED`
        );
        assert.equal(
          evaluated.quarantined,
          true,
          `Permanent asset "${asset.name}" must be quarantined`
        );
        assert.equal(
          evaluated.toolsExecuted,
          0,
          `Invariant violation: 0 tools must execute on malicious asset "${asset.name}"`
        );
        assert.ok(
          evaluated.confidence >= 0.95,
          `High confidence required for malicious detection on "${asset.name}"`
        );
      }
    });

    it("preserves 100% approval and zero false positives on all permanent safe assets", () => {
      const safeAssets = getPermanentSafeAssets();

      for (const asset of safeAssets) {
        const evaluated = evaluateSimulationAsset(asset);

        assert.equal(
          evaluated.policyDecision,
          "APPROVE",
          `Permanent safe asset "${asset.name}" must be APPROVED`
        );
        assert.equal(
          evaluated.quarantined,
          false,
          `Permanent safe asset "${asset.name}" must not be quarantined`
        );
        assert.equal(
          evaluated.severity,
          "NONE",
          `Severity must be NONE for benign asset "${asset.name}"`
        );
      }
    });
  });

  // ==========================================================================
  // 2. Malicious Keywords Pattern Library Verification
  // ==========================================================================
  describe("2. Malicious Keywords Detection across all Attack Vectors", () => {
    const categories = Object.keys(MALICIOUS_KEYWORD_PATTERNS) as Array<
      keyof typeof MALICIOUS_KEYWORD_PATTERNS
    >;

    for (const category of categories) {
      it(`detects and quarantines malicious keywords in category: ${category}`, () => {
        const keywords = MALICIOUS_KEYWORD_PATTERNS[category];
        assert.ok(keywords.length > 0, `Keywords should exist for category ${category}`);

        for (const kw of keywords) {
          const synthetic = generateSyntheticAsset({
            forceMalicious: true,
            targetCategory: category,
          });

          const evaluated = evaluateSimulationAsset(synthetic);

          assert.equal(
            evaluated.policyDecision,
            "BLOCK",
            `Synthetic asset with keyword "${kw}" must be BLOCKED`
          );
          assert.equal(
            evaluated.quarantined,
            true,
            `Synthetic asset with keyword "${kw}" must be quarantined`
          );
          assert.equal(
            evaluated.toolsExecuted,
            0,
            `Zero tools must execute for keyword "${kw}"`
          );
        }
      });
    }
  });

  // ==========================================================================
  // 3. Algorithmic Procedural Asset Generator
  // ==========================================================================
  describe("3. Algorithmic Procedural Asset Generator", () => {
    it("procedurally generates randomized benign and adversarial assets", () => {
      const benign = generateSyntheticAsset({ forceMalicious: false });
      const malicious = generateSyntheticAsset({ forceMalicious: true });

      assert.equal(benign.isMalicious, false);
      assert.equal(benign.folder, "Safe Samples");
      assert.ok(benign.name.endsWith(".eml"));

      assert.equal(malicious.isMalicious, true);
      assert.equal(malicious.folder, "Attack Samples");
      assert.ok(malicious.maliciousKeywords.length > 0);
    });

    it("evaluates procedurally generated benign assets without false alarms", () => {
      for (let i = 0; i < 15; i++) {
        const benign = generateSyntheticAsset({ forceMalicious: false });
        const evaluated = evaluateSimulationAsset(benign);

        assert.equal(evaluated.policyDecision, "APPROVE");
        assert.equal(evaluated.quarantined, false);
      }
    });

    it("evaluates procedurally generated attack assets with 100% interception rate", () => {
      for (let i = 0; i < 25; i++) {
        const attack = generateSyntheticAsset({ forceMalicious: true });
        const evaluated = evaluateSimulationAsset(attack);

        assert.equal(evaluated.policyDecision, "BLOCK");
        assert.equal(evaluated.quarantined, true);
        assert.equal(evaluated.toolsExecuted, 0);
      }
    });
  });

  // ==========================================================================
  // 4. Batch Malicious Keyword Simulation Algorithm
  // ==========================================================================
  describe("4. Batch Malicious Keyword Simulation Algorithm", () => {
    it("runs batch simulation over 40 dynamic assets with 100% detection rate and 0 leaks", () => {
      const simulator = new DefenseSimulator();
      const report = simulator.runBatchMaliciousKeywordSimulation(40);

      assert.equal(report.total, 40);
      assert.ok(report.maliciousTested > 0);
      assert.equal(
        report.blocked,
        report.maliciousTested,
        "All tested malicious assets must be blocked"
      );
      assert.equal(
        report.detectionRate,
        100,
        "Detection rate must be 100%"
      );
      assert.equal(
        report.unauthorizedExecutions,
        0,
        "Unauthorized tool executions must be exactly 0"
      );
      assert.equal(
        report.leaksPrevented,
        report.leakAttempts,
        "All secret/canary leak attempts must be prevented"
      );
    });
  });

  // ==========================================================================
  // 5. Demonstration Loop & Step Controller
  // ==========================================================================
  describe("5. Demonstration Loop & Step Controller", () => {
    it("advances simulation steps and notifies subscribers synchronously", () => {
      const simulator = new DefenseSimulator();
      let notifiedCount = 0;
      let lastEventSummary = "";

      const unsubscribe = simulator.subscribe((evt, metrics) => {
        notifiedCount++;
        lastEventSummary = evt.summary;
        assert.ok(metrics.totalSimulated > 0);
      });

      // Step 1
      const evt1 = simulator.stepNext();
      assert.ok(evt1.id.startsWith("sim_evt_"));
      assert.equal(notifiedCount, 1);
      assert.equal(lastEventSummary, evt1.summary);

      // Step 2
      const evt2 = simulator.stepNext();
      assert.ok(evt2.id.startsWith("sim_evt_"));
      assert.equal(notifiedCount, 2);

      unsubscribe();

      // Step 3 after unsubscribe
      simulator.stepNext();
      assert.equal(notifiedCount, 2, "Subscriber should not be notified after unsubscribing");
    });

    it("triggers on-demand manual attack with 100% fail-closed quarantine", () => {
      const simulator = new DefenseSimulator();
      const attackEvent = simulator.triggerManualAttack("SECRET_EXFILTRATION");

      assert.equal(attackEvent.policyDecision, "BLOCK");
      assert.equal(attackEvent.threatCategory, "SECRET_EXFILTRATION");
      assert.equal(attackEvent.quarantined, true);
      assert.equal(attackEvent.toolsExecuted, 0);
    });

    it("supports speed configuration and loop toggling", () => {
      const simulator = new DefenseSimulator();
      assert.equal(simulator.getIsRunning(), false);

      simulator.setSpeed("fast");
      assert.equal(simulator.getSpeed(), "fast");

      const running = simulator.toggleLoop();
      assert.equal(running, true);
      assert.equal(simulator.getIsRunning(), true);

      const stopped = simulator.toggleLoop();
      assert.equal(stopped, false);
      assert.equal(simulator.getIsRunning(), false);
    });
  });
});
