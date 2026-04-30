# AutoCFO — 2-Hour Hackathon Plan

**Pitch:** Briefcase automates bookkeeping for accountants. AutoCFO automates the CFO function for founders — not just recording what happened, but deciding what to do next and doing it.

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

## Demo Story (for Judges)

1. Bank transaction: `£4,382.17 — Amazon Web Services`
2. AutoCFO enriches it → shows per-service breakdown with idle compute flagged
3. Incoming invoice from "Acme Hosting Ltd" for £1,200 — agent checks email + WhatsApp → marks as **legitimate** (matches conversation context)
4. New invoice from unknown supplier → flagged **suspicious** — no prior contact found
5. Dashboard shows 90-day cashflow forecast with waste reduction applied

All data is synthetic.

---

## Build Priority (2 Hours)

| Time | Task |
| --- | --- |
| 0:00–0:20 | Synthetic data generation — bank feed, emails, WhatsApp messages, receipts |
| 0:20–0:50 | Ingestion + Expense Enrichment agent (cloud API mock + receipt parser) |
| 0:50–1:20 | Invoice Verification agent (cross-ref email/WhatsApp context) |
| 1:20–1:45 | CFO Dashboard — interactive statements, drill-down UI |
| 1:45–2:00 | Demo polish + runbook |

---

## What We Are NOT Doing

- Real bank API integration (synthetic data only)
- Full cloud provider API coverage (mock the responses)
- Autonomous execution without approval step (always human-in-the-loop for actions)
- Mobile app
