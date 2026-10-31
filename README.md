# Possessed Butler — Defensive LLM Agent

> **Foundational Security Invariant:**  
> *"External content can provide DATA, but external content must NEVER gain AUTHORITY."*

Possessed Butler is a defensive LLM agent architecture designed to execute consequential, multi-modal tasks (involving emails, webpages, files, and external APIs) while systematically resisting **indirect prompt injection**, **goal hijacking**, **privilege escalation**, **secret exfiltration**, and **unauthorized tool execution**.

---

## Current Status (Mission 1)

| Area | Status | Notes |
| :--- | :--- | :--- |
| **Workspace & Foundation** | **Implemented** | Next.js 15, TypeScript (strict), Tailwind CSS, ESLint. |
| **Architectural Contracts & Types** | **Implemented** | Typed schemas for `AgentRequest`, `AgentResponse`, `ToolRequest`, `ToolResult`, `TrustContext`, `ThreatAssessment`, `PolicyDecision`, `AuditEvent`. |
| **Security Invariant & Trust Hierarchy** | **Implemented** | Formally defined in `lib/config/constants.ts` and `types/security.ts`. |
| **UI Shell & Navigation Placeholders** | **Implemented** | Minimal, professional dashboard shell with Butler, Security, Attack Lab, Evaluation, and Audit modules. |
| **Claude Reasoning Orchestrator** | *Planned* | Targeted for future mission (Anthropic API integration). |
| **Tool Gateway & Executors** | *Planned* | Email, Web, PDF, and File tools to be integrated in subsequent missions. |
| **Policy Engine & Threat Detection** | *Planned* | Runtime invariant checks, taint tracking, and sanitization engine. |
| **Attack Lab & Adversarial Datasets** | *Planned* | Automated adversarial suite and canary exfiltration test harness. |
| **Evaluation Engine** | *Planned* | Quantitative robustness benchmarks and regression suite. |

> **Notice on Implementation Scope:**  
> Under Mission 1, the repository establishes the architectural foundation, directory structure, core interfaces, and shell UI. **No live Claude API integration, tool executors, or active threat detection logic are implemented yet.**

---

## The Trust Hierarchy

The core defense mechanism rests upon a rigid hierarchy of authority:

```
  ▲  HIGHEST AUTHORITY
  │  1. SYSTEM POLICY          (Hardcoded, non-negotiable security guardrails)
  │  2. USER INTENT            (Explicit, authenticated user instructions)
  │  3. AUTHORIZED TOOL POLICY (Predefined permissions & risk tiering)
  │  4. VALIDATED TOOL OUTPUT  (Sanitized structured data from internal tools)
  │  5. EXTERNAL CONTENT       (Data only: emails, web, PDFs, search results)
  ▼  ZERO AUTHORITY
```

External content is treated as untrusted data at all times. It is never allowed to instruct, override, or re-target agent goals.

---

## Directory Structure

```text
app/                     # Next.js App Router (UI shell, layouts, styles)
components/              # UI components and layout structures
lib/
  agent/                 # Orchestrator & Claude runtime interface (planned)
  tools/                 # Tool gateway & tool implementations (planned)
  security/              # Trust boundary & invariant enforcement (planned)
  policy/                # Policy engine & authorization rules (planned)
  threat/                # Threat analysis & injection detection (planned)
  audit/                 # Structured audit event logging (planned)
  evaluation/            # Robustness evaluation & metrics engine (planned)
  storage/               # Local persistence & session state (planned)
  config/                # Global configuration & security constants (implemented)
types/                   # Architectural TypeScript interfaces & contracts (implemented)
datasets/
  benign/                # Legitimate operational task benchmarks (planned)
  attacks/               # Adversarial injection & jailbreak datasets (planned)
  regression/            # Fixed attack vectors for regression testing (planned)
tests/
  unit/                  # Unit tests (planned)
  integration/           # End-to-end integration tests (planned)
  security/              # Adversarial security test suites (planned)
docs/                    # Architectural & security specifications (implemented)
```

---

## Getting Started

### Prerequisites
- Node.js `v20+` or `v24.15.0+`
- npm `10+`

### Installation & Run

```bash
# Install dependencies
npm install

# Type check
npm run typecheck

# Lint
npm run lint

# Build production bundle
npm run build

# Start development server
npm run dev
```

Visit [http://localhost:3000](http://localhost:3000) to view the Possessed Butler shell.

---

## Documentation Index

- [Architecture Guide](file:///Users/venkateshdevathraj/Downloads/possessed-butler/docs/ARCHITECTURE.md)
- [Security Model](file:///Users/venkateshdevathraj/Downloads/possessed-butler/docs/SECURITY_MODEL.md)
- [Threat Model](file:///Users/venkateshdevathraj/Downloads/possessed-butler/docs/THREAT_MODEL.md)
- [Evaluation Strategy](file:///Users/venkateshdevathraj/Downloads/possessed-butler/docs/EVALUATION.md)
