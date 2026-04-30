# Agent B — Backend Agents API

**Read first:** `specs/01-mvp-split.md` (shared contract + endpoint table). Stay inside that contract. Rubric: populate confidence, review flags, and modes honestly for **human-in-the-loop** scoring — see `specs/README.md`.

**Mission:** Wire FastAPI endpoints that return data shaped exactly like the contract. Behind each endpoint is a tiny rule-based "agent" function that reads fixtures from Agent A and decorates them with `category`, `confidence`, `verification`, `next_step`, etc. No LLM calls, no real integrations — pure Python heuristics.

**Time budget:** 45 min.

---

## Where to put code

Existing entrypoint: `backend/src/hackathon_backend/main.py`. Extend it. Create:

```
hackathon_backend/
  main.py                 # add new routers
  agents/
    __init__.py
    ledger.py             # categorize + explain transactions
    invoice_verifier.py   # LEGIT / SUSPICIOUS / UNKNOWN
    cashflow_actions.py   # propose actions, build forecast
  fixtures/               # owned by Agent A
```

If Agent A hasn't shipped yet, start with hardcoded sample data inside each agent module so the endpoints work, then swap to `from hackathon_backend.fixtures.loaders import ...` once available.

---

## Endpoints to implement

All listed in `01-mvp-split.md`. Mount them on the existing `app` in `main.py`. Keep CORS as-is.

```
GET  /transactions               -> Transaction[]
GET  /transactions/{id}          -> Transaction
GET  /invoices                   -> (InvoiceRequest + verification)[]
GET  /actions                    -> ActionPlan[]
GET  /cashflow/forecast          -> CashflowPoint[]   # 90 days
POST /actions/{id}/approve       -> ActionPlan        # mark executed=true
```

Use Pydantic models if you want type safety, but plain dicts are fine for an MVP. The shapes in `01-mvp-split.md` are authoritative.

---

## Agent logic (rules, not ML)

### `ledger.py` — categorize_transaction(txn) -> Transaction

Heuristic, no scope creep:

- Keyword match on `description` / `counterparty` → category. e.g. `"AWS"|"AMAZON WEB SERVICES" -> software`, `"PAYROLL"|"WISE PAYROLL" -> payroll`, `"HMRC" -> tax`, `"STRIPE PAYOUT" -> misc` (inflow), known vendor name → `vendor`.
- `confidence`: 0.95 if exact keyword hit, 0.85 if vendor in `vendors.json`, 0.6 if no match (then `category="unknown"`, `review_flag=true`).
- `explanation`: a 1-line string templated from the match ("Monthly AWS bill for production infrastructure.").
- `anomaly_reason`: set if amount is >2× the median outflow for that counterparty's category over the last 60 days, OR if counterparty is brand new and amount > £1000.
- If `aws_breakdowns.json` has an entry for this txn id, attach it as `enrichment`.

If Agent A populated `category` etc. directly in the fixture, you can pass it through as long as you also fill `enrichment` for AWS.

### `invoice_verifier.py` — verify_invoice(invoice) -> verification dict

- LEGIT: vendor exists in `vendors.json`, account number matches `known_account`, thread exists with `message_count >= 3`, no urgency keywords. confidence 0.9–0.95.
- SUSPICIOUS: vendor name matches a known vendor but `account_details` differs from `known_account`, OR thread excerpt contains urgency keywords (`"urgent"`, `"asap"`, `"new bank"`, `"updated details"`). confidence 0.6–0.8. Set `risk_flags`. `requires_human_review=true`.
- UNKNOWN: no matching vendor, no thread. confidence 0.4–0.6. `requires_human_review=true`.
- `evidence` is a list of human-readable strings derived from the matches you found. Make them sound real (counts of prior payments, thread age, etc.).

### `cashflow_actions.py`

Two outputs:

1. `build_action_plans()` — produce 2–4 `ActionPlan` records. The hero one is built from the AWS waste flag: `recommended_action` to downscale, `expected_cash_impact` ≈ 900, `execution_mode="HUMAN_APPROVAL"`. Add 1 chase-overdue-invoice action and 1 schedule-payment action derived from the fixtures. Apply escalation rules from the top-level README:
   - confidence < 0.90 → `next_step="REQUEST_HUMAN"`, `execution_mode="HUMAN_APPROVAL"`.
   - any depends-on transaction with `review_flag=true` → human approval.
2. `forecast_cashflow(days=90)` — start from current synthetic balance (e.g. £180k), apply known recurring outflows (payroll, AWS, SaaS) on their cadence and an assumed weekly inflow. Return one point per day. Cheap, deterministic, no statistical model.

`POST /actions/{id}/approve` mutates an in-memory dict to mark the action executed and flips `next_step` to `AUTO_EXECUTE`. Persistence not required.

---

## Order of work

1. Skeleton endpoints returning hardcoded sample objects matching the contract — get the frontend agent unstuck within 10 minutes.
2. Pull from `fixtures/loaders.py` once Agent A has shipped first pass.
3. Add the rule-based agent functions one at a time: ledger → invoice → actions → forecast.
4. POST approve last.

Smoke test:

```bash
uv run uvicorn hackathon_backend.main:app --reload --port 8000
curl localhost:8000/transactions | jq '.[0]'
curl localhost:8000/invoices     | jq '.[0].verification'
curl localhost:8000/actions      | jq
curl localhost:8000/cashflow/forecast | jq '.[0]'
```

## Hard non-goals

- No database, no migrations, no ORM. In-memory only.
- No real LLM. No `openai`, `anthropic`, no Cursor SDK calls.
- No auth, no rate limiting, no logging beyond defaults.
- Do not change the frontend. Do not redesign the contract without updating `01-mvp-split.md` and pinging the others.
- Do not add new top-level dependencies unless strictly necessary.
