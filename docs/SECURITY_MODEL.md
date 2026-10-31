# Possessed Butler — Security Model

## 1. Foundational Security Invariant

> **"External content can provide DATA, but external content must NEVER gain AUTHORITY."**

In typical LLM agents, untrusted external inputs (such as email messages, web documents, or file attachments) are concatenated directly into the prompt context. Because LLMs natively treat tokens uniformly, external inputs can easily manipulate the instruction stream, leading to prompt injection, goal hijacking, and unauthorized action execution.

Possessed Butler eliminates this architectural flaw by decoupling **Data** from **Authority**.

---

## 2. The Trust Hierarchy

Authority is strictly partitioned across five discrete levels. Any entity at Level $N$ cannot override or bypass policies defined at Level $> N$.

```
Tier 5 (HIGHEST): SYSTEM_POLICY
    │   • Hardcoded, non-negotiable security guardrails
    │   • Secret protection & sensitive path tripwires (.env, credentials)
    │   • Default-deny policy evaluation
    ▼
Tier 4: USER_INTENT
    │   • Authenticated commands directly entered by the legitimate user
    │   • Task goals, operational scope, and explicit approvals
    ▼
Tier 3: AUTHORIZED_TOOL_POLICY
    │   • Tool capability manifests and parameter constraint rules
    │   • Consequence tiers (READ_ONLY vs. HIGH_CONSEQUENCE)
    ▼
Tier 2: VALIDATED_TOOL_OUTPUT
    │   • Sanitized, schema-validated responses from internal tools
    │   • Explicit metadata indicating data origin and structural integrity
    ▼
Tier 1 (LOWEST): EXTERNAL_CONTENT
        • Untrusted raw inputs from the outside world (emails, web, PDFs, files)
        • Zero authority to issue instructions or invoke tools
```

---

## 3. Defense-in-Depth Implementation

```
┌─────────────────────────────────────────────────────────────┐
│ 1. Context Framing (lib/agent/prompt-builder.ts)            │
│    Wraps external data in <untrusted_external_data> tags.   │
├─────────────────────────────────────────────────────────────┤
│ 2. Action Validation (lib/security/gateway.ts)              │
│    Compares tool requests against authenticated User Intent │
│    to catch goal hijacking in flight.                       │
├─────────────────────────────────────────────────────────────┤
│ 3. Policy Engine (lib/policy/engine.ts)                     │
│    Deterministic rules: BLOCK, REQUIRE_CONFIRMATION,        │
│    or APPROVE. No quarantine states.                        │
├─────────────────────────────────────────────────────────────┤
│ 4. Tool Gateway Execution Gate (lib/tools/gateway.ts)       │
│    The ONLY execution path. Refuses execution unless        │
│    validated PolicyDecision === "APPROVE".                  │
├─────────────────────────────────────────────────────────────┤
│ 5. Output Taint Tagging (lib/tools/registry.ts)             │
│    Flags external data with taint markers permanently.      │
└─────────────────────────────────────────────────────────────┘
```

---

## 4. Policy Decision Outcomes

The policy engine evaluates every tool call before execution:

| Outcome | Meaning | Enforcement Action |
| :--- | :--- | :--- |
| **`APPROVE`** | Operation is safe, read-only, and aligns with User Intent. | Forwarded to Tool Gateway for authorized execution. |
| **`BLOCK`** | Request targets protected resources, contains injection signatures, or attempts goal hijacking. | Tool execution is denied. Orchestrator terminates compromised loop. |
| **`REQUIRE_CONFIRMATION`** | Request involves state modification (`send_email`, `edit_file`). | Tool execution halts. Human confirmation required. |

---

## 5. Implementation Status

- **Implemented in Mission 2**:
  - Model-independent provider abstraction (`MockLLMProvider`, `GeminiLLMProvider`, `AnthropicLLMProvider`, `OpenAILLMProvider`).
  - Agent Orchestrator with tool request interception.
  - Security Gateway with Action Validation and Threat Analysis.
  - Deterministic Policy Engine evaluating `APPROVE`, `BLOCK`, and `REQUIRE_CONFIRMATION`.
  - Tool Gateway acting as sole execution boundary with Zod parameter validation.
  - Deterministic sandbox fixtures for emails, webpages, PDFs, and files.
  - Automated security test suite in `tests/security/agent-core.test.ts`.
