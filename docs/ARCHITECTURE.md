# Possessed Butler — System Architecture Specification

## 1. Architectural Purpose

**Possessed Butler** is a resilient agentic system capable of processing untrusted multi-modal inputs (emails, webpages, documents, and files) while executing high-consequence user tasks without falling victim to prompt injection or control-flow hijacking.

### The Foundational Security Invariant
> **"External content can provide DATA, but external content must NEVER gain AUTHORITY."**

---

## 2. Status Matrix: Implemented vs. Planned

| Subsystem | Status | Implementation Details |
| :--- | :--- | :--- |
| **Workspace & App Shell** | **Implemented** | Next.js App Router shell with interactive conceptual navigation. |
| **Architectural Interfaces** | **Implemented** | Strict TypeScript definitions across `types/` for all major entities. |
| **Trust Model Specification** | **Implemented** | Constants, orderings, and tier assignments defined in `lib/config/`. |
| **Model-Independent LLM Abstraction** | **Implemented (M2)** | Clean `LLMProvider` contract supporting `MockLLMProvider`, `GeminiLLMProvider`, with clean stubs for Anthropic & OpenAI. Configurable via `LLM_PROVIDER`. Zero hardcoded credentials or models. |
| **Agent Orchestrator** | **Implemented (M2)** | Controlled execution loop in `lib/agent/orchestrator.ts`. Intercepts all tool calls; LLM never directly executes tools. |
| **Security Gateway** | **Implemented (M2)** | Action validator, threat analyzer, taint tracker, and policy engine in `lib/security/`. Strictly evaluates `APPROVE`, `BLOCK`, `REQUIRE_CONFIRMATION`. |
| **Tool Gateway & Registry** | **Implemented (M2)** | The sole execution boundary in `lib/tools/`. Validates `PolicyDecision === "APPROVE"` before dispatch. Parameter validation with Zod. |
| **Deterministic Sandbox Tools** | **Implemented (M2)** | Local fixtures in `lib/tools/sandbox/` for `read_email`, `send_email`, `fetch_webpage`, `read_pdf`, `read_file`, `edit_file`. External content tagged with taint flags. |
| **Attack Lab & Adversarial Datasets** | *Planned* | Simulation harness and dataset corpora (`datasets/attacks/`). |
| **Evaluation Engine** | *Planned* | Quantitative robustness benchmarks and regression suite (`lib/evaluation/`). |

---

## 3. The Controlled Execution Pipeline

```
                    ┌───────────────────────────────┐
                    │      Authenticated User       │
                    └───────────────┬───────────────┘
                                    │ (USER_INTENT)
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│                        POSSESSED BUTLER CORE                           │
│                                                                        │
│   ┌────────────────────────────────────────────────────────────────┐   │
│   │ 1. LLM Provider (Mock / Gemini / Anthropic / OpenAI)           │   │
│   │    • Isolated context frames & prompt boundary defense         │   │
│   │    • Emits structured ToolRequest (never direct execution)     │   │
│   └───────────────────────────────┬────────────────────────────────┘   │
│                                   │ ToolRequest                        │
│                                   ▼                                    │
│   ┌────────────────────────────────────────────────────────────────┐   │
│   │ 2. Security Gateway                                            │   │
│   │    • Action Validator (checks alignment with User Intent)      │   │
│   │    • Threat Analyzer (scans for injection & exfiltration)      │   │
│   │    • Policy Engine (evaluates deterministic rules)             │   │
│   │    • Produces explicit PolicyDecision:                         │   │
│   │      [ APPROVE | BLOCK | REQUIRE_CONFIRMATION ]                │   │
│   └───────────────────────────────┬────────────────────────────────┘   │
│                                   │ ToolRequest + PolicyDecision       │
│                                   ▼                                    │
│   ┌────────────────────────────────────────────────────────────────┐   │
│   │ 3. Tool Gateway (Sole Execution Boundary)                      │   │
│   │    • Refuses execution if decision !== "APPROVE"               │   │
│   │    • Pauses on REQUIRE_CONFIRMATION                            │   │
│   │    • Schema validation via Zod                                 │   │
│   │    • Tags outputs as EXTERNAL_CONTENT (Zero Authority)         │   │
│   └───────────────────────────────┬────────────────────────────────┘   │
│                                   │ Execution Authorized               │
└───────────────────────────────────┼────────────────────────────────────┘
                                    │
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│                DETERMINISTIC LOCAL SANDBOX FIXTURES                    │
│                                                                        │
│   [ read_email ]    [ send_email ]    [ fetch_webpage ]                │
│   [ read_pdf ]      [ read_file ]     [ edit_file ]                    │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 4. Policy Decision Outcomes

Policy evaluations yield strictly one of three outcomes:
1. **`APPROVE`**: The request is a safe read-only operation directly matching the user's intent with clean, untainted parameters. The Tool Gateway proceeds to execute.
2. **`BLOCK`**: The request attempts unauthorized access (e.g. reading `.env`), exhibits prompt injection overrides, or diverges from user intent (goal hijacking). Execution is denied immediately.
3. **`REQUIRE_CONFIRMATION`**: The request involves state mutation or consequential external impact (`isConsequential: true`, e.g. `send_email`, `edit_file`). Execution halts pending explicit human confirmation.

Zero quarantine states or ambiguous outcomes exist.

---

## 5. Security Invariant Enforcement

To enforce `"External content can provide DATA, but external content must NEVER gain AUTHORITY"`:
1. **Data-Only Demarcation**: All content returned by external tools (`read_email`, `fetch_webpage`, `read_pdf`) is enclosed in `<untrusted_external_data>` tags in the prompt builder.
2. **Taint Tracking**: Content originating from external tools is flagged with taint tags (e.g. `taint:email:email-002`).
3. **Goal Hijacking Prevention**: If external data contains injection instructions instructing the agent to call an unauthorized tool (e.g. forwarding credentials via `send_email`), the Security Gateway's Action Validator blocks the call because it was not initiated by the user intent.
4. **Tool Isolation**: The LLM provider has zero direct code references to tool execution functions. All execution flows strictly through `ToolGateway.executeTool()`.
