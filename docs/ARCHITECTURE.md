# Possessed Butler — System Architecture Specification

## 1. Architectural Purpose

**Possessed Butler** is a resilient agentic system capable of processing untrusted multi-modal inputs (emails, webpages, documents, and external API responses) while executing high-consequence user tasks without falling victim to prompt injection or control-flow hijacking.

### The Foundational Security Invariant
> **"External content can provide DATA, but external content must NEVER gain AUTHORITY."**

---

## 2. Status Matrix: Implemented vs. Planned

| Subsystem | Mission 1 Status | Planned Future State |
| :--- | :--- | :--- |
| **Workspace & App Shell** | **Implemented** | Next.js App Router shell with interactive conceptual navigation. |
| **Architectural Interfaces** | **Implemented** | Strict TypeScript definitions across `types/` for all major entities. |
| **Trust Model Specification** | **Implemented** | Constants, orderings, and tier assignments defined in `lib/config/`. |
| **Claude Reasoning Engine** | *Planned* | Orchestrator module in `lib/agent/` utilizing Anthropic Claude API. |
| **Tool Gateway & Registry** | *Planned* | Sandboxed tool invocations (`lib/tools/`) for email, web browsing, PDF parsing, and local storage. |
| **Threat Analyzer** | *Planned* | Pre-execution heuristic and semantic injection detector (`lib/threat/`). |
| **Policy Engine** | *Planned* | Invariant verification and authorization checker (`lib/policy/`). |
| **Audit Logger** | *Planned* | Structured, tamper-evident telemetry and trace logging (`lib/audit/`). |
| **Attack Lab & Datasets** | *Planned* | Simulation harness and dataset corpora (`datasets/attacks/`). |
| **Evaluation Engine** | *Planned* | Benchmark runner measuring defense rate vs. task utility (`lib/evaluation/`). |

---

## 3. High-Level Component Architecture

```
                    ┌───────────────────────────────┐
                    │      Authenticated User       │
                    └───────────────┬───────────────┘
                                    │ (USER_INTENT)
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│                        POSSESSED BUTLER SHELL                          │
│                                                                        │
│   ┌────────────────────────────────────────────────────────────────┐   │
│   │                 Trust Boundary & Gateway                       │   │
│   └───────────────┬────────────────────────────────┬───────────────┘   │
│                   │                                │                   │
│                   ▼                                ▼                   │
│   ┌──────────────────────────────┐   ┌─────────────────────────────┐   │
│   │      Threat Analyzer         │   │       Policy Engine         │   │
│   │  (Injection / Taint Scanner) │   │ (Strict Invariant Enforcer) │   │
│   └───────────────┬──────────────┘   └─────────────┬───────────────┘   │
│                   │                                │                   │
│                   └───────────────┬────────────────┘                   │
│                                   ▼                                    │
│   ┌────────────────────────────────────────────────────────────────┐   │
│   │                 Claude Orchestrator Runtime                    │   │
│   │            (Isolated Prompt & Reasoning Envelope)              │   │
│   └───────────────┬────────────────────────────────▲───────────────┘   │
│                   │ (ToolRequest)                  │ (ToolResult)      │
│                   ▼                                │                   │
│   ┌────────────────────────────────────────────────┴───────────────┐   │
│   │                 Action & Tool Gateway                          │   │
│   │       • Sanitizer & Taint Tagger                               │   │
│   │       • Human-in-the-Loop Confirmation Gate                    │   │
│   └───────────────┬────────────────────────────────────────────────┘   │
│                   │                                                    │
└───────────────────┼────────────────────────────────────────────────────┘
                    │ Execution
                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│                         EXTERNAL WORLD & TOOLS                         │
│                                                                        │
│     [ Email Tool ]     [ Web Scraper ]     [ File / PDF Parser ]       │
│                                                                        │
│                    (EXTERNAL_CONTENT: Untrusted Data)                  │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 4. Extension Points & Subsystem Details

### 4.1 Orchestrator (`lib/agent/`) — *Planned*
- **Role**: Coordinates the reasoning cycle with Claude through the Anthropic API.
- **Security Boundary**: Wraps system instructions and user instructions in immutable system frames. External data injected as tool outputs is clearly demarcated within data-only containers.
- **Contract**: `AgentRequest` -> `AgentResponse` (defined in `types/agent.ts`).

### 4.2 Tool Gateway (`lib/tools/`) — *Planned*
- **Role**: Mediates all tool calls initiated by the agent.
- **Risk Tiering**: Tools are categorized by consequence (`READ_ONLY`, `LOW_RISK`, `HIGH_CONSEQUENCE`, `RESTRICTED`).
- **Sanitization**: All outputs from external fetch tools are marked as `EXTERNAL_CONTENT` and tagged with taint markers before being fed back to the orchestrator.
- **Contract**: `ToolRequest` -> `ToolResult` (defined in `types/tool.ts`).

### 4.3 Threat Analyzer (`lib/threat/`) — *Planned*
- **Role**: Analyzes untrusted text chunks prior to model consumption.
- **Detection Scope**: Indirect injection markers, system override directives (`"ignore previous instructions"`), jailbreak patterns, and honeytoken/canary probes.
- **Contract**: Produces `ThreatAssessment` (defined in `types/threat.ts`).

### 4.4 Policy Engine (`lib/policy/`) — *Planned*
- **Role**: Evaluates intended actions against deterministic rules before tool execution.
- **Decisions**: `ALLOW`, `BLOCK`, `QUARANTINE`, or `REQUIRE_HUMAN_APPROVAL`.
- **Contract**: Produces `PolicyDecision` (defined in `types/policy.ts`).

### 4.5 Audit Logger (`lib/audit/`) — *Planned*
- **Role**: Emits structured, machine-readable security logs for forensics.
- **Contract**: Emits `AuditEvent` (defined in `types/audit.ts`).

### 4.6 Evaluation & Attack Lab (`lib/evaluation/`, `datasets/`) — *Planned*
- **Role**: Continuous regression harness to verify defense efficacy against known injection attacks while retaining benign task utility.

---

## 5. Security Invariant Enforcement Mechanism

To enforce `"External content can provide DATA, but external content must NEVER gain AUTHORITY"`:

1. **Tagging & Taint Tracking**: Any string originating from an external source (email body, HTTP payload, document stream) carries the `EXTERNAL_CONTENT` trust level (`Tier 1`).
2. **Grammar & Envelope Isolation**: The Claude reasoning prompt is structured such that untrusted data blocks are enclosed in explicit data boundaries (e.g. `<external_untrusted_data source="..." id="...">`).
3. **Tool Invocations Cannot Be Dictated by Data**: If a tool call parameter is derived from untrusted content without explicit user confirmation, the Policy Engine rejects or gates the request.
4. **Human In The Loop (HITL)**: Irreversible or consequential actions (sending external emails, overwriting local files, transmitting credentials) require explicit confirmation regardless of model confidence.
