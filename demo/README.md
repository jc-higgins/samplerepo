# Demo runbook (~90 seconds)

The judging rubric weights **demo clarity** at 1 point and **concrete workflow value** at 2. This script is what we run on stage — every beat maps to one of those buckets.

## Pre-flight (60 seconds before judges arrive)

```bash
make setup        # one-off, idempotent — uv sync + npm install
make demo         # backend + frontend in one terminal
```

Open in tabs, side-by-side:

- `http://localhost:5173` — dashboard
- A second terminal in repo root, ready to run `scripts/inject_txn.py`

Sanity check (silent, before judges):

```bash
make health           # { "ok": true }
make llm-status       # { "available": true, ... } if Cursor SDK is wired
make demo-reset       # wipe any leftover injected transactions / drafts
```

If `llm-status` shows `available: false`, the demo still works — you lose the live "Cursor agent insight" line and email drafting goes 503. The deterministic path stays green.

## The 90-second beat sheet

| Sec   | Beat                                                                                                                                  | Rubric tag                              |
| ----- | ------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------- |
| 0–10  | "Financial Intelligence track. AutoCFO is the founder's CFO copilot — it explains every bank line and proposes safe actions."         | Track fit                               |
| 10–25 | **Statements** → click the £4,382 AWS line. Show the per-service breakdown + the **`~£900/mo idle compute`** waste flag.              | Concrete workflow + Track fit           |
| 25–45 | Switch to terminal: `scripts/inject_txn.py aws_spike` — a £10,247 AWS line lands. Point at: rule-based **anomaly** + **Cursor agent** second opinion ("2.4× usual run-rate, recommend confirming with infra"). Reload Statements — it's already there. | Technical execution + Cursor bonus     |
| 45–60 | **Invoices** tab: one **LEGIT** card (matched 4 prior payments, 8-month thread), one **SUSPICIOUS** (IBAN changed + domain typo + urgency keyword). Read one risk flag aloud. | Human-in-the-loop                      |
| 60–80 | **Actions** → "Hold suspicious payment" + "Chase Globex" + "Downscale AWS". Click **Draft email** on Chase Globex — Cursor SDK writes the body live. Click **Approve** on AWS Downscale — the **runway** number jumps and the **forecast line** shifts up. | Concrete workflow + Cursor bonus       |
| 80–90 | "Every action is gated, every decision shows confidence and evidence. That's safe autonomy." Cut.                                     | Human-in-the-loop + close               |

## Backup beats (if anything wobbles)

| Failure mode                    | Pivot                                                                  |
| ------------------------------- | ---------------------------------------------------------------------- |
| `inject_txn.py` hangs > 12s     | `Ctrl+C`, re-run with `--skip-agent` — drops the LLM hop, classification still lands. |
| Cursor SDK 503 on draft-email   | Skip the draft beat; show the action card and approve directly.        |
| Backend not reachable           | `make backend` in a fresh terminal; `make health` to confirm.          |
| Forecast doesn't refresh        | Hit the dashboard refresh; the data is correct, just cached.           |

## Live demo cheatsheet

```bash
# inject scenarios (all hit POST /transactions and run live through the SDK)
scripts/inject_txn.py                  # list scenarios
scripts/inject_txn.py aws_spike        # 2.4x usual AWS bill, fires anomaly
scripts/inject_txn.py rogue_vendor     # brand-new supplier + £6.8k outflow
scripts/inject_txn.py customer_inflow  # £15k inbound — clean classification
scripts/inject_txn.py --custom --description "FOO" --amount -42 --counterparty "Foo Ltd"
scripts/inject_txn.py --list           # last 6 transactions
scripts/inject_txn.py --reset          # clear injected lines

# email drafting (Cursor SDK)
curl -sX POST localhost:8000/actions/act_chase_globex/draft-email | jq
curl -sX POST localhost:8000/actions/act_chase_globex/email/send  | jq
curl -s     localhost:8000/communications | jq
```

## Bonus bucket call-outs

- **Best use of Cursor:** SDK runs in a Node sidecar, called from Python over a subprocess pipe. Two task-shaped helpers — `enrich_transaction` and `draft_email` — both with deterministic fallbacks. Demo shows both surfacing live in the UI.
- **Best use of LLM models:** the same two task helpers — claim only if SDK is up during your run. Concrete output you can point at: the natural-language anomaly take in the inject CLI, and the Globex chase email body.

Story stays the same as `specs/README.md`; this file is the on-stage version.
