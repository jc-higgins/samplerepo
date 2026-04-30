# AutoCFO — Hackathon Plan

**Pitch:** Briefcase automates bookkeeping for accountants. AutoCFO automates the CFO function for founders — not just recording what happened, but deciding what to do next and doing it.

---

## Judging rubric (Cursor × Briefcase · London 2026)

Official structure and wording are published with the event site; the machine-readable rubric (same criteria judges load in the UI) is at [`https://cusor-hack-london-2026-1.vercel.app/api/event-format`](https://cusor-hack-london-2026-1.vercel.app/api/event-format) under `rubric` and `side_quests`.

**Core score (max 7)** — five criteria:

| Pts | Criterion | What judges ask |
| --- | --- | --- |
| 2 | **Concrete workflow value** | Does it replace or compress a real finance workflow a human does today? |
| 2 | **Track fit** | How purely does the submission embody its chosen track (Money Movement vs Financial Intelligence)? |
| 1 | **Human-in-the-loop decision** | Does the system know when a human should be in the loop vs not? Thresholds, confidence gates, escalation paths. |
| 1 | **Technical execution** | Architecture quality, tool design, latency, integrations that actually work. |
| 1 | **Demo clarity** | Can the judge, in **90 seconds**, see exactly what this agent does and why it matters? |

**Judge bonus bucket (max +3)** — three independent 1-point buckets (total bonus caps at 3): **Best use of Cursor**, **Best use of Specter**, **Best use of LLM models** (see event site for sponsor blurbs).

**How this repo aims at the rubric**

- **Concrete workflow value:** Founder-facing CFO loop — categorise and explain bank lines, verify payables against message context, propose cash-preserving actions with approval.
- **Track fit:** **Financial Intelligence** (read / interpret / explain; wrong answer → wrong decision downstream). Money-movement execution stays mocked behind approval in the MVP.
- **Human-in-the-loop:** Confidence scores, `review_flag`, `requires_human_review`, `execution_mode`, and explicit escalation rules in the root README and JSON contract.
- **Technical execution:** FastAPI + shared JSON contract + React dashboard; optional hooks for real integrations documented as out-of-scope for the timed MVP.
- **Demo clarity:** Follow the numbered demo story below; rehearse to ~90 seconds.
- **Bonuses:** Cursor (how the team builds — agents, rules, workflow); Specter (market-intelligence via API/MCP when you wire it); LLMs (post-MVP or optional — the MVP is rule-based by design, so document model use honestly if you add it).

---

## The Core Idea

A multi-agent pipeline that acts as an autonomous CFO for founders and small businesses. It has eyes on bank transactions, email, and WhatsApp — and can take financial actions, not just log them.

### What Makes This Different

| Briefcase / Traditional Tools | AutoCFO |
| --- | --- |
| Serves accountants | Serves the founder directly |
| Categorises past transactions | Takes forward-looking financial actions |
| Ingests documents | Cross-references communication context |
| Backward-looking | Predictive — cashflow, runway, waste |

---

## Data Sources (All Synthetic for Demo)

- **Bank account** — transaction feed, opaque line items
- **Gmail** — invoice emails, supplier threads, payment confirmations
- **Cloud provider APIs** (AWS/GCP/Azure) — EC2, RDS, S3 usage breakdown

---

## Key Workflows

### 1. Outgoing — Expense Enrichment & Invoice Generation

1. Bank transaction arrives (e.g. `£4,382.17 to AWS`)
2. AutoCFO pulls cloud provider APIs to break it down:
   - `£2,100 — EC2 (API cluster, 40% idle)`
   - `£1,800 — RDS`
   - `£482 — S3 egress`
3. Surfaces waste detection: *"You're spending £900/month on idle compute"*
4. Proposes and (with approval) executes action — downscale, switch pricing tier
5. Generates tagged invoice / expense record with the enriched breakdown

### 2. Incoming — Invoice Legitimacy Check

1. Invoice arrives via email
2. Agent triangulates against:
   - Email thread with that supplier
   - Bank transaction history
3. Flags as **Legitimate / Suspicious / New supplier** with reasoning
4. Collates into payables dashboard

### 3. Interactive Bank Statements

- Drill-down on any line item to see enriched explanation
- Filter by category, supplier, cloud service, team
- Forward-looking cashflow view based on known recurring charges

---

## Multi-Agent Architecture

```text
Bank Feed → Ingestion Agent
              ├── Expense Enrichment Agent  (cloud APIs)
              ├── Invoice Verification Agent (Gmail cross-ref)
              └── Action Agent              (flag waste, chase invoices, propose actions)
                        ↓
              CFO Dashboard (interactive statements, approvals)
```

---

## Demo Story (for Judges — target ~90 seconds)

Order matches **demo clarity** and **concrete workflow value**: one clear workflow (statement intelligence → payables risk → approved action → forecast).

1. Bank transaction: `£4,382.17 — Amazon Web Services`
2. AutoCFO enriches it → shows per-service breakdown with idle compute flagged (**Financial Intelligence** + explain-the-line-item).
3. Incoming invoice from "Acme Hosting Ltd" for £1,200 — agent checks email + WhatsApp → marks as **legitimate** (matches conversation context).
4. New invoice from unknown supplier → flagged **suspicious** — no prior contact found (**human-in-the-loop** cue).
5. Approve a savings action → dashboard shows 90-day cashflow forecast (impact visible).

All data is synthetic. Name the **track** once at the start so **track fit** is obvious.

---

## Build Priority (example 2-hour split)

The detailed MVP contract and parallel agent split are in [`01-mvp-split.md`](01-mvp-split.md) (~1-hour parallel path). For a longer slot, extend polish and bonus work (Specter, LLM routing).

| Time | Task |
| --- | --- |
| 0:00–0:20 | Synthetic data generation — bank feed, emails, WhatsApp messages, receipts |
| 0:20–0:50 | Ingestion + Expense Enrichment agent (cloud API mock + receipt parser) |
| 0:50–1:20 | Invoice Verification agent (cross-ref email/WhatsApp context) |
| 1:20–1:45 | CFO Dashboard — interactive statements, drill-down UI |
| 1:45–2:00 | Demo polish + **90-second** run-through |

---

## What We Are NOT Doing

- Real bank API integration (synthetic data only)
- Full cloud provider API coverage (mock the responses)
- Autonomous execution without approval step (always human-in-the-loop for actions)
- Mobile app
