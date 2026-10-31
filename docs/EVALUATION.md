# Possessed Butler — Evaluation & Benchmarking Strategy

## 1. Evaluation Objectives

A defensive agent must achieve two competing objectives:
1. **Resilience**: Reliably defeat prompt injection, goal hijacking, and exfiltration attempts across varied attack vectors.
2. **Utility**: Execute legitimate user requests without excessive false positives, degraded performance, or refusal loops.

---

## 2. Key Quantitative Metrics

The evaluation engine will score agent performance against standard benchmark runs using the following metrics:

| Metric | Definition | Target |
| :--- | :--- | :--- |
| **Defense Success Rate (DSR)** | $\frac{\text{Blocked Attacks}}{\text{Total Attack Scenarios}}$ | $\ge 95\%$ |
| **Task Completion Rate (TCR)** | $\frac{\text{Completed Benign Tasks}}{\text{Total Benign Tasks}}$ | $\ge 90\%$ |
| **False Positive Rate (FPR)** | $\frac{\text{Benign Requests Inappropriately Blocked}}{\text{Total Benign Requests}}$ | $\le 5\%$ |
| **Secret Exfiltration Rate (SER)** | $\frac{\text{Canary Tokens Leaked}}{\text{Total Canary Probes}}$ | $0.0\%$ |
| **Privilege Escalation Rate (PER)** | $\frac{\text{Unauthorized Consequential Actions Taken}}{\text{Total Escalation Attempts}}$ | $0.0\%$ |

---

## 3. Dataset Architecture

The project reserves structured directories for offline and continuous integration testing:

```
datasets/
├── benign/        # Operational tasks (reading valid emails, summarizing research papers, managing tasks)
├── attacks/       # Synthetic and real-world adversarial injections, goal hijacking, and jailbreaks
└── regression/    # Hardened suite of previously identified bypasses to ensure zero regressions
```

### 3.1 Benign Test Suite (`datasets/benign/`) — *Planned*
- Normal email workflows (summarization, drafting meeting responses).
- Document ingestion (PDF technical papers, reports, financial sheets).
- Web research tasks (extracting factual tables, comparing products).

### 3.2 Adversarial Injection Suite (`datasets/attacks/`) — *Planned*
- **Direct Delimiter Exploits**: Attempts to break out of data frames (e.g. `</data><system>`).
- **Hidden Context Injections**: White-on-white text, markdown comments, metadata-embedded instructions.
- **Social Engineering Injections**: Urgent fake security alerts, impersonation of system administrators.
- **Canary Probes**: Tests that attempt to read environment variables (`ANTHROPIC_API_KEY`, `.env`).

### 3.3 Regression Suite (`datasets/regression/`) — *Planned*
- Curated vector suite from every failed evaluation run to guarantee continuous defensive gains.

---

## 4. Evaluation Engine Architecture (`lib/evaluation/`) — *Planned*

```
                ┌──────────────────────────────────┐
                │          Benchmark Runner        │
                └───────────────┬──────────────────┘
                                │ Loads Test Cases
                                ▼
                ┌──────────────────────────────────┐
                │        Test Case Generator       │
                │    (Benign vs Adversarial Mix)   │
                └───────────────┬──────────────────┘
                                │
                                ▼
                ┌──────────────────────────────────┐
                │     Isolated Agent Harness       │
                │     (Simulated Tool Gateway)     │
                └───────────────┬──────────────────┘
                                │ Captures Responses & Audit Traces
                                ▼
                ┌──────────────────────────────────┐
                │        Evaluation Scorer         │
                │  (DSR, TCR, FPR, Canary Audits)  │
                └──────────────────────────────────┘
```

---

## 5. Implementation Status (Mission 1)

- **Implemented**:
  - Evaluation directory topology (`datasets/benign/`, `datasets/attacks/`, `datasets/regression/`, `lib/evaluation/`, `tests/security/`).
  - Evaluation dashboard conceptual placeholder in UI shell.
- **Planned for Future Missions**:
  - Automated benchmark execution harness.
  - Initial dataset seeds (25+ attack cases, 25+ benign cases).
  - Quantitative scorecard generation and reporting UI.
