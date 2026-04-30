# MVP Split — 3 Parallel Agents (1-hour build)

We are shipping an MVP of **AutoCFO** in ~60 minutes. To keep work parallel and avoid scope creep, the build is split into three roles. Each role has its own brief in this folder:

- `agent-a-mock-data.md` — synthetic fixtures (bank, AWS, Gmail, WhatsApp, invoices)
- `agent-b-backend.md` — FastAPI endpoints wrapping rule-based "agents" over the fixtures
- `agent-c-frontend.md` — React dashboard that consumes the backend

**Sequencing:** Agent A delivers a first pass of fixtures within ~15 min so B and C are unblocked. B and C work against the contract below from minute 0 with stubs.

---

## What we are NOT building

- Real bank, AWS/GCP, Gmail, or WhatsApp integrations. Every external system is mocked. Stub functions return realistic-looking data.
- Real LLM calls. Categorization / verification / action decisions are simple rules + thresholds. The README mentions "Cursor SDK" — ignore for MVP.
- Auth, persistence, multi-user. In-memory + JSON files only.
- Tests beyond a manual smoke check.
- Pretty design system. Use existing `App.css` and a few extra classes.

If a task is not on your brief, do not build it.

---

## Shared JSON Contract (source of truth)

All three agents must agree on these shapes. If you need to change one, update this file first and tell the other two.

### Transaction

```json
{
  "id": "txn_001",
  "date": "2026-04-21",
  "description": "AMAZON WEB SERVICES EMEA",
  "amount": -4382.17,
  "currency": "GBP",
  "counterparty": "Amazon Web Services",
  "category": "software",
  "confidence": 0.94,
  "explanation": "Monthly AWS bill for production infrastructure.",
  "review_flag": false,
  "anomaly_reason": null,
  "enrichment": {
    "source": "aws",
    "line_items": [
      { "label": "EC2 (api-cluster)", "amount": 2100.00, "note": "40% idle" },
      { "label": "RDS (prod-db)",     "amount": 1800.00 },
      { "label": "S3 egress",         "amount":  482.17 }
    ],
    "waste_flag": "~£900/mo idle compute on api-cluster"
  }
}
```

`amount` is negative for outflows, positive for inflows. `enrichment` is optional (only present for cloud / itemizable charges). `category` ∈ `payroll | vendor | software | tax | misc | unknown`.

### InvoiceRequest + Verification (returned together)

```json
{
  "id": "inv_001",
  "received_at": "2026-04-22T09:14:00Z",
  "channel": "email",
  "sender": "billing@acme-hosting.co.uk",
  "vendor": "Acme Hosting Ltd",
  "amount": 1200.00,
  "currency": "GBP",
  "due_date": "2026-05-06",
  "account_details": "GB29 NWBK 6016 1331 9268 19",
  "thread_excerpt": "Following our call last week, please find April invoice attached…",
  "verification": {
    "decision": "LEGIT",
    "confidence": 0.92,
    "evidence": [
      "Matched 4 prior bank payments to Acme Hosting Ltd",
      "Email thread with billing@acme-hosting.co.uk goes back 8 months",
      "Account number unchanged from last 3 invoices"
    ],
    "risk_flags": [],
    "requires_human_review": false,
    "rationale": "Known vendor, consistent payment details, established thread."
  }
}
```

`decision` ∈ `LEGIT | SUSPICIOUS | UNKNOWN`.

### ActionPlan

```json
{
  "id": "act_001",
  "related_ids": ["txn_001"],
  "title": "Downscale idle EC2 capacity on api-cluster",
  "recommended_action": "Reduce api-cluster from 8→5 nodes; switch 3 to spot",
  "expected_cash_impact": 900.00,
  "confidence": 0.88,
  "execution_mode": "HUMAN_APPROVAL",
  "rationale": "40% idle utilization over last 14 days; saving ~£900/mo with no SLA impact projected.",
  "next_step": "REQUEST_HUMAN"
}
```

`execution_mode` ∈ `AUTO | HUMAN_APPROVAL`. `next_step` ∈ `AUTO_EXECUTE | REQUEST_HUMAN | REJECT`.

### CashflowPoint

```json
{ "date": "2026-05-01", "projected_balance": 184320.55 }
```

---

## API Surface (Agent B owns, A and C depend on)

| Method | Path                       | Returns                          |
| ------ | -------------------------- | -------------------------------- |
| GET    | `/health`                  | `{ ok: true }` (already exists)  |
| GET    | `/transactions`            | `Transaction[]`                  |
| GET    | `/transactions/{id}`       | `Transaction`                    |
| POST   | `/transactions`            | `Transaction` (live-classified)  |
| GET    | `/invoices`                | `(InvoiceRequest+verification)[]`|
| GET    | `/invoices/{id}`           | `InvoiceRequest+verification`    |
| GET    | `/actions`                 | `ActionPlan[]`                   |
| GET    | `/actions/{id}`            | `ActionPlan`                     |
| POST   | `/actions/{id}/approve`    | `ActionPlan` (sets executed=true)|
| GET    | `/cashflow/forecast`       | `CashflowPoint[]` (90 days)      |
| GET    | `/cashflow/summary`        | `CashflowSummary` (header data)  |
| GET    | `/cloud/cost-summary`      | `CloudCostSummary` (mock AWS/GCP rollup from ledger) |
| POST   | `/demo/reset`              | clears live-injected transactions|

CORS already allows `localhost:5173`.

### Live transaction injection (demo)

`POST /transactions` accepts a partial bank line and returns the fully-classified `Transaction` after running it through the same ledger pipeline used for historical data:

```json
{
  "description": "AMAZON WEB SERVICES EMEA INVOICE",
  "amount": -10247.00,
  "counterparty": "Amazon Web Services"
}
```

`description`, `amount`, and `counterparty` are required; `id`, `date`, and `currency` are optional (auto-filled with a `txn_live_<timestamp>` id, today's date, and `GBP`). The new line shows up in the next `GET /transactions` response and the dashboard picks it up on its next fetch.

A CLI driver lives at `scripts/inject_txn.py` with named scenarios (`aws_spike`, `rogue_vendor`, `new_saas`, `ambiguous_dd`, `customer_inflow`, `payroll`, `hmrc_vat`) that print the live classification for the demo. `POST /demo/reset` clears injected transactions so a demo can be replayed cleanly.

### CashflowSummary

```json
{
  "current_balance": 184320.55,
  "currency": "GBP",
  "monthly_outflow": 58316.84,
  "monthly_inflow": 33666.67,
  "monthly_net": -24650.17,
  "runway_months": 7.5,
  "runway_months_if_revenue_stops": 3.2,
  "applied_actions": ["act_aws_downscale"]
}
```

`runway_months` is `null` when `monthly_net >= 0` (cashflow positive). `applied_actions` lists ids of approved actions whose effects are baked into `monthly_outflow` and `forecast`. Approving `act_aws_downscale` lowers `monthly_outflow` by £900 and pushes `runway_months` higher; approving `act_chase_globex` injects a one-time inflow into `/cashflow/forecast` ~14 days out. This is the "approve → forecast updates" demo loop.

### CloudCostSummary

Returned by `GET /cloud/cost-summary`. Built from categorized transactions with `enrichment.source` ∈ `aws | gcp`: per-provider optional object with `latest_transaction_id`, `total_last_period`, `mom_delta_pct`, `history[]` (`period`, `date`, `amount`, `transaction_id`), `services[]` (rolled-up line items), and `waste_flag` when present.

---

## Definition of Done (MVP)

1. `uv run uvicorn hackathon_backend.main:app --reload --port 8000` serves all endpoints with non-empty data.
2. `npm run dev` shows a dashboard with three panels populated from the API: **Statements** (drill-down on a transaction shows AWS breakdown + waste flag), **Invoices** (each card shows a LEGIT/SUSPICIOUS/UNKNOWN badge with reasoning), **Actions & Cashflow** (action cards with Approve button + a 90-day projected balance line).
3. The "demo story" from `specs/README.md` works end-to-end: AWS transaction → drill-down → invoice card legit → unknown-supplier card suspicious → approve a savings action → forecast updates (or just refreshes).

### Rubric note (judges)

This MVP targets **technical execution** (working API + UI), **human-in-the-loop** (confidence, badges, approve gate), **track fit** (Financial Intelligence flows), **concrete workflow value** (statement → payables → action), and **demo clarity** (~90s path). Full criterion text: event [`/api/event-format`](https://cusor-hack-london-2026-1.vercel.app/api/event-format) → `rubric`. Bonus scoring (Cursor / Specter / LLM) is separate — see `specs/README.md`.
