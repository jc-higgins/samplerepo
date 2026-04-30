# AutoCFO: Autonomous Financial Intelligence

AutoCFO is an autonomous CFO agent built with the Cursor SDK.
It does not only analyze finances; it takes action:

- Monitors cashflow and predicts runway risk.
- Categorizes transactions and explains unclear bank lines.
- Detects potential fraud and escalates uncertain cases.
- Automates finance operations (invoice chasing, payment timing optimization).

Core principle: **safe autonomy over blind autonomy**.
Every action is scored with confidence and checked against policy thresholds before execution. Optional **Specter** (API/MCP) market-intelligence hooks can strengthen context beyond the MVP fixtures — relevant for the **Best use of Specter** bonus bucket.

---

## Quick start (Makefile)

**Prerequisites:** [uv](https://docs.astral.sh/uv/), Node 18+, npm, `make`, and `bash` (for `make demo`). Optional: `curl` for `make health`.

From the repository root:

```bash
make setup    # uv sync, npm install in frontend/, copy frontend/.env from .env.example if missing
make demo     # FastAPI + Vite in one terminal; Ctrl+C stops both
```

**URLs:** API `http://127.0.0.1:8000` (e.g. `GET /health`) · UI `http://localhost:5173`

**Other targets:** `make help` (list targets), `make backend` / `make frontend` (one server each), `make build` (production frontend build), `make health` (probe `/health` while the API is running). Override the API port with `BACKEND_PORT=8001 make backend`.

---

## Hackathon MVP & specs

The **~1 hour MVP** is defined in `[specs/01-mvp-split.md](specs/01-mvp-split.md)`: shared JSON shapes (transactions with optional **enrichment** such as cloud line items and waste flags, invoices with **verification**, action plans, 90-day cashflow points), a single **API table**, and a **definition of done** (backend serves all endpoints with data; frontend dashboard shows **Statements** with drill-down, **Invoices** with badges, **Actions & cashflow** with approve + SVG forecast). Integrations and “agents” are **mocked / rule-based** for the MVP — no real bank, Gmail, or WhatsApp, and no LLM calls — as spelled out in that spec.

### Judging rubric alignment (10-point model)

Event site: [Cursor × Briefcase · London 2026](https://cusor-hack-london-2026-1.vercel.app). Canonical criterion text (same JSON the site uses for judge panels): [`/api/event-format`](https://cusor-hack-london-2026-1.vercel.app/api/event-format).

| Area | Points | How AutoCFO addresses it |
| --- | --- | --- |
| Concrete workflow value | 2 | Compresses founder CFO work: explain charges, triage payables, approve guarded actions, see runway. |
| Track fit | 2 | **Financial Intelligence** — categorise, explain lines, fraud signals, confidence; movement of money is policy-gated / mocked in MVP. |
| Human-in-the-loop decision | 1 | Confidence thresholds, `review_flag`, `requires_human_review`, `execution_mode`, escalation rules below; prefer `REQUEST_HUMAN` when uncertain. |
| Technical execution | 1 | Contract-first API, FastAPI + React, working drill-down and approve path (`make demo`). |
| Demo clarity | 1 | Script in `[specs/README.md](specs/README.md)` — rehearse to **~90 seconds**. |

**Judge bonus (+3 max, 1+1+1):** **Cursor** — ship with Cursor (agents, rules, SDK story); **Specter** — add market-intelligence (API/MCP) when you integrate it; **LLM models** — MVP is intentionally non-LLM; claim this bucket only if you add real model use (APIs, routing, evals) and can show it. See `[specs/README.md](specs/README.md)` for detail.

Parallel work is split into three briefs (read `01-mvp-split.md` first):


| Agent | Brief                                                      | Focus                                                                     |
| ----- | ---------------------------------------------------------- | ------------------------------------------------------------------------- |
| A     | `[specs/agent-a-mock-data.md](specs/agent-a-mock-data.md)` | Synthetic fixtures (bank, AWS-style enrichment, Gmail/WhatsApp, invoices) |
| B     | `[specs/agent-b-backend.md](specs/agent-b-backend.md)`     | FastAPI endpoints over fixtures + small rule-based decorators             |
| C     | `[specs/agent-c-frontend.md](specs/agent-c-frontend.md)`   | Vite + React dashboard consuming the API                                  |

Incremental frontend checklists (numbered to match the Agent C build order) live in `[TODO/Agent-c/](TODO/Agent-c/)`.

Hackathon narrative, demo story for judges, and “what we are not building” for the wider plan live in `[specs/README.md](specs/README.md)`. The **Makefile** targets match the MVP runbook: `uv run uvicorn hackathon_backend.main:app` (Agent B) and `npm run dev` in `frontend/` (Agent C), from the repo root after `uv sync`.

---

## Repository workflow

### Commits and pushes

- Prefer **logical commits**: one coherent story per commit (single feature area, one bugfix, one documentation theme, or one mechanical change).
- Prefer **several smaller commits** over one huge diff so history stays readable and easy to revert or bisect.
- **Push** after completing meaningful slices of work so `origin` stays current—not only after a long uninterrupted session.
- When multiple concerns appear in one session (e.g. backend + frontend + docs), **split into separate commits** when changes can land independently.

Frontend Agent C work can follow the numbered slices in `[TODO/Agent-c/](TODO/Agent-c/)`—each numbered file is a natural commit boundary when implementing the dashboard.

### Automation / Cursor

Commit discipline also applies to AI-assisted work: project guidance lives under `[.cursor/rules/](.cursor/rules/)` (including reminders about chunked commits).

---

## Product Vision

This project targets the **Financial Intelligence** track:

- Categorize transactions and explicitly flag uncertainty.
- Detect fraud and ask for human review when signal quality is mixed.
- Explain bank lines and escalate weird/unknown patterns.

AutoCFO connects to:

- Bank account activity (incoming/outgoing transactions)
- Gmail (invoice requests, vendor communication, reminders)
- WhatsApp (informal payment and invoice context)

By joining these sources, AutoCFO can:

- Generate and tag invoices from outgoing payments.
- Validate incoming invoice requests against email + WhatsApp history.
- Decide whether to execute, delay, chase, or escalate an action.

---

## 3-Agent Split (Roles and Ownership)

This README is intentionally split into **3 parts** so each agent can pick up a clear role.

### Part 1 - Ledger Intelligence Agent (Sense + Explain)

**Mission**
Turn messy transaction streams into structured, explainable financial events.

**Inputs**

- Bank transactions
- Existing chart-of-accounts/tags
- Historical labeled examples

**Responsibilities**

- Categorize transactions (`payroll`, `vendor`, `software`, `tax`, `misc`).
- Explain each bank line in plain English ("what this charge is for").
- Detect low-confidence classifications and emit `REVIEW_REQUIRED`.
- Surface anomalies (new merchant, amount spikes, unusual cadence).

**Outputs**

- `transaction_classification` record:
  - `category`
  - `confidence` (0.00-1.00)
  - `explanation`
  - `review_flag` (boolean)
  - `anomaly_reason` (nullable)
  - optional `**enrichment`** (e.g. itemized line items, `waste_flag`) for charges that support a breakdown — shape in `[specs/01-mvp-split.md](specs/01-mvp-split.md)`

**Escalation Rules**

- Confidence < `0.80` -> always escalate.
- Unknown merchant + high amount -> escalate.
- Contradictory historical pattern -> escalate.

---

### Part 2 - Invoice & Communication Verification Agent (Cross-Channel Truth)

**Mission**
Confirm whether invoice/payment requests are legitimate by cross-checking communications and financial records.

**Inputs**

- Incoming invoice requests (email/WhatsApp)
- Gmail threads and metadata
- WhatsApp message context
- Bank history and vendor history

**Responsibilities**

- Match invoice requests to known vendors/conversations.
- Validate amount, due date, account details, and request context.
- Detect fraud indicators (urgent tone shift, new bank details, spoof patterns).
- Produce a legitimacy decision with evidence traces.

**Outputs**

- `invoice_verification` record:
  - `decision` (`LEGIT`, `SUSPICIOUS`, `UNKNOWN`)
  - `confidence` (0.00-1.00)
  - `evidence` (list of matched signals)
  - `risk_flags` (list)
  - `requires_human_review` (boolean)

**Escalation Rules**

- Conflicting identity/payment details -> escalate.
- First-time sender + payment urgency -> escalate.
- Confidence < `0.85` -> escalate.

---

### Part 3 - Cashflow Actions Agent (Decide + Act Safely)

**Mission**
Take operational finance actions that protect runway while respecting trust boundaries.

**Inputs**

- Cashflow forecast + runway model
- Outputs from Part 1 and Part 2
- Policy constraints (approval thresholds, blocked counterparties, limits)

**Responsibilities**

- Predict short-term cash pressure and recommend interventions.
- Trigger actions:
  - Chase overdue invoices
  - Delay/schedule non-critical payments
  - Approve low-risk recurring payments
- Enforce policy-based guardrails before executing any action.
- Request human approval when risk, uncertainty, or impact is high.

**Outputs**

- `action_plan` record:
  - `recommended_action`
  - `expected_cash_impact`
  - `confidence` (0.00-1.00)
  - `execution_mode` (`AUTO`, `HUMAN_APPROVAL`)
  - `rationale`

**Escalation Rules**

- Any high-impact action above threshold -> human approval.
- Depends on upstream item marked `REVIEW_REQUIRED` -> human approval.
- Confidence < `0.90` -> human approval.

---

## Shared Contract Between All 3 Parts

All agents must return:

- `decision`
- `confidence`
- `rationale`
- `evidence`
- `next_step` (`AUTO_EXECUTE`, `REQUEST_HUMAN`, `REJECT`)

Confidence is mandatory and cannot be omitted.
If evidence is weak or contradictory, default to `REQUEST_HUMAN`.

---

## Human-in-the-Loop Policy

AutoCFO is not trying to remove humans from finance; it is trying to route human attention to the highest-risk decisions.

- **Auto mode**: high-confidence, low-impact, policy-safe actions.
- **Review mode**: mixed signals, novel counterparties, unusual amounts.
- **Block mode**: suspected fraud or policy violation.

When in doubt, escalate.

---

## Why This Fits the Track

- Categorizes transactions and flags uncertainty.
- Detects fraud and asks for review when confidence is mixed.
- Explains bank lines in plain language and escalates weird cases.
- Adds actionability (autonomous CFO behavior) with explicit trust controls.

