# Kavach — Evaluation & Benchmarking Strategy

## 1. Evaluation Objectives

A defensive agent must achieve two competing objectives:
1. **Resilience**: Reliably defeat prompt injection, goal hijacking, and exfiltration attempts across varied attack vectors.
2. **Utility**: Execute legitimate user requests without excessive false positives, degraded performance, or refusal loops.

---

## 2. Key Quantitative Metrics

The evaluation engine scores agent performance against standard benchmark runs using the following metrics:

| Metric | Definition | Target | Current Benchmark (M3) |
| :--- | :--- | :--- | :--- |
| **Defense Success Rate (DSR)** | $\frac{\text{Blocked Attacks}}{\text{Total Attack Scenarios}}$ | $\ge 95\%$ | **100.0%** (21/21 attacks blocked) |
| **Task Completion Rate (TCR)** | $\frac{\text{Completed Benign Tasks}}{\text{Total Benign Tasks}}$ | $\ge 90\%$ | **100.0%** (4/4 benign tasks approved) |
| **False Positive Rate (FPR)** | $\frac{\text{Benign Requests Inappropriately Blocked}}{\text{Total Benign Requests}}$ | $\le 5\%$ | **0.0%** |
| **Secret Exfiltration Rate (SER)** | $\frac{\text{Canary Tokens Leaked}}{\text{Total Canary Probes}}$ | $0.0\%$ | **0.0%** |
| **Privilege Escalation Rate (PER)** | $\frac{\text{Unauthorized Consequential Actions Taken}}{\text{Total Escalation Attempts}}$ | $0.0\%$ | **0.0%** |

---

## 3. Dataset Architecture

The project maintains structured, version-controlled JSON datasets for continuous evaluation:

```
datasets/
├── attacks/
│   ├── direct_injections.json       # Instruction overrides, jailbreaks, roleplay bypasses
│   ├── indirect_injections.json     # Embedded XML/HTML directives, delimiter breakouts
│   ├── goal_hijacking.json          # 'Instead' task substitution, user intent divergence
│   ├── secret_exfiltration.json     # .env reads, credentials, API tokens, canary tokens
│   ├── privilege_escalation.json    # Confirmation bypass, admin impersonation, trust tampering
│   └── tool_manipulation.json       # Path traversal (../), command injection, exfil destinations
├── benign/
│   └── benign_tasks.json            # Legitimate email summarization, web fetching, PDF reading
└── regression/
    └── regression_suite.json        # Curated historical vectors (zero-width chars, case obfuscation)
```

---

## 4. Evaluation Engine Architecture (`lib/evaluation/`)

```
                ┌──────────────────────────────────┐
                │        SecurityEvaluator         │
                │   (lib/evaluation/evaluator.ts)  │
                └───────────────┬──────────────────┘
                                │ Loads Attack & Benign Datasets
                                ▼
                ┌──────────────────────────────────┐
                │   Threat Analyzer & Gateway      │
                │   (Multi-layer Policy Evaluation) │
                └───────────────┬──────────────────┘
                                │ Records Decision & Threat Signals
                                ▼
                ┌──────────────────────────────────┐
                │        Evaluation Scorer         │
                │   Scores DSR, TCR, FPR, SER, PER │
                └───────────────┬──────────────────┘
                                │ Emits Report
                                ▼
                ┌──────────────────────────────────┐
                │        EvaluationReport          │
                │ Status: PASSED_HARDENED (M3)     │
                └──────────────────────────────────┘
```

---

## 5. Implementation Status

- **Implemented in Mission 3**:
  - `SecurityEvaluator` (`lib/evaluation/evaluator.ts`) executing automated benchmark scoring.
  - Multi-category adversarial attack corpus with 21 attack cases across 6 threat vectors.
  - Benign operational dataset with legitimate multi-modal tasks.
  - Regression testing suite verifying zero-width evasion and case-folding defenses.
  - Continuous benchmark integration test in `tests/security/attack-lab.test.ts`.
