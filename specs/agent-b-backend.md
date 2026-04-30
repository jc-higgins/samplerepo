# Agent B — Backend Agents API

**Read first:** `specs/01-mvp-split.md` (shared contract + endpoint table). Stay inside that contract. Rubric: populate confidence, review flags, and modes honestly for **human-in-the-loop** scoring — see `specs/README.md`.

**Mission:** Wire FastAPI endpoints that return data shaped exactly like the contract. Behind each endpoint is a tiny rule-based "agent" function that reads fixtures from Agent A and decorates them with `category`, `confidence`, `verification`, `next_step`, etc.

For the MVP, classification, verification, action proposal, and forecasting are **deterministic Python heuristics** — no model calls in the hot path. The Cursor SDK is layered on top of that as a *second opinion* and *email drafter* (see "Cursor SDK layer" below) so the demo never blocks on the model and degrades gracefully if it's offline.

**Time budget:** 45 min for the rule-based core. Cursor-SDK polish layered on after.

---

## Where the code lives

```
backend/src/hackathon_backend/
  main.py                 # FastAPI routers — thin glue
  agents/
    __init__.py
    data_source.py        # fixtures-or-seeds shim + live-injection state
    seeds.py              # inline fallback raw transactions / vendors / etc.
    ledger.py             # categorize + explain transactions
    invoice_verifier.py   # LEGIT / SUSPICIOUS / UNKNOWN
    cashflow_actions.py   # propose actions, build forecast, summary
    cloud_summary.py      # AWS/GCP rollup from enriched transactions
    communications.py     # email drafts/sends (in-memory)
    cursor_llm.py         # Cursor SDK bridge (optional, graceful)
    email_inbox.py        # IMAP poller for receipt-style emails
  fixtures/               # owned by Agent A
services/
  cursor_invoke.mjs       # Node sidecar that wraps @cursor/sdk
  package.json            # @cursor/sdk dependency
scripts/
  inject_txn.py           # live demo CLI for POST /transactions
```

If Agent A hasn't shipped fixtures yet, `data_source.py` falls back to `seeds.py` so endpoints work from minute zero.

---

## Endpoints

The authoritative list lives in `01-mvp-split.md`. In short:

```
GET  /health
GET  /transactions, /transactions/{id}
POST /transactions                  # live injection, runs through ledger pipeline
POST /demo/reset                    # clear injected transactions
GET  /invoices, /invoices/{id}
GET  /actions, /actions/{id}
POST /actions/{id}/approve
GET  /cashflow/forecast, /cashflow/summary
GET  /cloud/cost-summary
GET  /llm/status                    # SDK availability snapshot
POST /actions/{id}/draft-email      # Cursor-SDK-drafted EmailDraft
GET  /actions/{id}/email
POST /actions/{id}/email/send       # mock-send (logs to stdout)
GET  /communications
POST /emails/process/start, /emails/process/reset
GET  /emails/state, /emails/poll    # IMAP receipt watcher
```

CORS allows `localhost:5173` only.

---

## Agent logic (rules, not ML)

### `ledger.py` — `categorize_all() -> Transaction[]`

- Keyword match on `description` → `(category, confidence, explanation)`. AWS/GCP → `software`, payroll providers → `payroll`, HMRC → `tax`, named SaaS → `software`, faster payments → `misc` inflow.
- Counterparty in `vendors` → `vendor` at 0.88 confidence.
- Otherwise: inflow ⇒ `misc` 0.78, outflow ⇒ `unknown` 0.55 + `review_flag=true`.
- **Anomaly detection:** new counterparty + ≥£1k outflow, or amount > 2× the median historical outflow for that counterparty.
- **Enrichment passthrough:** if `aws_breakdowns` / `gcp_breakdowns` keyed by txn id, attach as `enrichment`. Raw fixtures' own `enrichment` is also passed through.
- `agent_insight` (if attached during live injection) is preserved.

### `invoice_verifier.py` — `verify_all() / verify_one(id)`

- LEGIT: vendor in directory, account matches, thread length ≥ 3, no urgency keywords. 0.9–0.95.
- SUSPICIOUS: vendor known but account differs, OR sender domain typo, OR urgency tone (`urgent`, `asap`, `new bank`, `updated details`). 0.6–0.8 + `requires_human_review`.
- UNKNOWN: no vendor + no thread. 0.4–0.6 + `requires_human_review`.
- `evidence` is a list of human-readable strings: prior payment counts, thread age, etc.

### `cashflow_actions.py`

Two outputs:

1. **`list_actions()` / `get_action()`** — produces 2–4 `ActionPlan`s:
   - `act_aws_downscale` (built when AWS waste flag present): £900/mo saving, HUMAN_APPROVAL.
   - `act_chase_globex`: chase overdue invoice, has `email_target` + `email_purpose`.
   - `act_schedule_figma`: defer renewal, low-impact, AUTO.
   - `act_block_suspicious`: built when a SUSPICIOUS invoice exists; internal alert email.
   - Escalation: low-confidence OR depends-on-`review_flag` OR `expected_cash_impact ≥ £5k` ⇒ HUMAN_APPROVAL.
2. **`forecast(days=90)`** — deterministic projection. Recurring outflows on their cadence (AWS, payroll, SaaS, HMRC, Acme), weekly/monthly inflows, **plus the effects of approved actions** (AWS downscale lowers monthly outflow; approved chase injects a one-time inflow ~14 days out).
3. **`summary()`** — runway / burn / `applied_actions` for the dashboard header. Reflects approved-action effects so judges see runway shift on approve.

`POST /actions/{id}/approve` mutates an in-memory override dict. No persistence.

### `cloud_summary.py`

Rolls up transactions whose `enrichment.source` ∈ `{aws, gcp}` into per-provider totals, MoM delta, services table, and waste flag. Returned by `GET /cloud/cost-summary`.

---

## Cursor SDK layer (optional, additive)

`agents/cursor_llm.py` calls a tiny Node sidecar at `services/cursor_invoke.mjs` over a subprocess pipe. It loads `CURSOR_API_KEY` from the repo `.env` (stdlib parser, tolerant of quotes / spaces / comments). Two task-shaped helpers:

- `enrich_transaction(raw, rule_classification, history)` → `{ natural_explanation, concern_level, concern_reason, agrees_with_rule_engine, suggested_followup, _meta }`. Called from `POST /transactions` *after* the deterministic classifier has already produced a result, so the response is always populated; if the SDK is offline, `agent_insight` is just absent.
- `draft_email(purpose, recipient, sender, context_lines, tone)` → `{ subject, body, call_to_action, _meta }`. Used by `communications.draft_for_action` for actions that carry `email_target` + `email_purpose`.

`is_available()` checks Node binary + sidecar file + installed `@cursor/sdk` + `CURSOR_API_KEY`. `status()` exposes that snapshot for `GET /llm/status`. **Every SDK call returns `None` on any failure** so the rule-based path is the source of truth and the demo never breaks.

---

## Live transaction injection (demo)

`POST /transactions` accepts `{description, amount, counterparty, [id], [date], [currency], [skip_agent]}`. The line is appended to `data_source._injected_raw_transactions`, picked up by the next `categorize_all()` call, and (unless `skip_agent: true`) sent to the Cursor SDK for a second opinion. `POST /demo/reset` clears the injected list.

CLI driver: `scripts/inject_txn.py` — named scenarios (`aws_spike`, `rogue_vendor`, `new_saas`, `ambiguous_dd`, `customer_inflow`, `payroll`, `hmrc_vat`), `--custom`, `--list`, `--reset`, `--skip-agent`. Renders the classification + Cursor agent insight in the terminal.

Makefile shortcuts: `make inject SCENARIO=aws_spike`, `make inject-list`, `make demo-reset`, `make llm-status`.

---

## Email inbox watcher

`agents/email_inbox.py` polls Gmail over IMAP and parses any JSON receipt block in incoming messages into a structured `receipt` object. When a `{merchant, total}` block is found, it is best-effort injected as a raw bank line so it surfaces in the dashboard like a live webhook. Endpoints under `/emails/*` drive prime/poll/reset and the frontend popup loop.

Credentials default to a demo Gmail account; override with `AUTOCFO_INBOX_USER` / `AUTOCFO_INBOX_PASS` / `AUTOCFO_INBOX_HOST`.

---

## Smoke test

```bash
make backend                                            # uvicorn on :8000
curl -s localhost:8000/health
curl -s localhost:8000/transactions       | jq '.[0]'
curl -s localhost:8000/invoices           | jq '.[0].verification'
curl -s localhost:8000/actions            | jq '.[].id'
curl -s localhost:8000/cashflow/summary   | jq
curl -s localhost:8000/cloud/cost-summary | jq '.aws.services[0]'
curl -s localhost:8000/llm/status         | jq

# live injection (with agent insight)
scripts/inject_txn.py aws_spike

# email drafting (requires CURSOR_API_KEY)
curl -sX POST localhost:8000/actions/act_chase_globex/draft-email | jq
curl -sX POST localhost:8000/actions/act_chase_globex/email/send  | jq
```

## Hard non-goals

- No database, no migrations, no ORM. In-memory + JSON files only.
- No real payment movement. "Send" is a logged stub.
- No auth, no rate limiting.
- Do not change the frontend or the contract without updating `01-mvp-split.md` first.
- Do not block any request on the Cursor SDK — every call must have a non-LLM fallback path.
