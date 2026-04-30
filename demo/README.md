# Demo runbook (~90 seconds)

The judging rubric weights **demo clarity** at 1 point and **concrete workflow value** at 2. This script is what we run on stage — every beat maps to one of those buckets.

## Pre-flight (60 seconds before judges arrive)

```bash
make setup        # one-off, idempotent — uv sync + npm install
make demo         # backend + frontend in one terminal
```

Open in tabs, side-by-side:

- `http://localhost:5173` — dashboard.
- Gmail signed in as **`cursorhack2026@gmail.com`** (or any account you can compose from to that address).
- Editor pane on `sample_email.txt` at the repo root, ready to copy.
- A second terminal in repo root, ready as the inject-CLI backup.

Sanity check (silent, before judges):

```bash
make health           # { "ok": true }
make llm-status       # { "available": true, ... } if Cursor SDK is wired
make demo-reset       # wipe leftover injected transactions / drafts
curl -sX POST localhost:8000/emails/process/reset   # clear inbox watcher state
```

If `llm-status` shows `available: false`, the demo still works — the popup will say "Cursor SDK offline — classified by rules only" and the Live agent review section is hidden. The deterministic path stays green.

## The 90-second beat sheet

| Sec   | Beat                                                                                                                                  | Rubric tag                              |
| ----- | ------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------- |
| 0–10  | "Financial Intelligence track. AutoCFO is the founder's CFO copilot — it explains every bank line and proposes safe actions."         | Track fit                               |
| 10–25 | **Statements** → click the £4,382 AWS line. Show the per-service breakdown + the **`~£900/mo idle compute`** waste flag.              | Concrete workflow + Track fit           |
| 25–55 | Header → **Process emails**. Switch to Gmail compose, paste the JSON body from `sample_email.txt` (Domino's £37.76 team lunch), Send. Within ~1s a popup slides in bottom-right with merchant + total + injected `txn_email_<uid>`; an **"AutoCFO agent reviewing…"** spinner runs and resolves into a LOW/MEDIUM **concern pill** + plain-English explanation. Statements panel auto-refreshes — click the new row → **Live agent review** section in the detail pane. | Technical execution + Cursor bonus + Concrete workflow |
| 55–70 | **Invoices**: one **LEGIT** card (4 prior payments, 8-month thread), one **SUSPICIOUS** (IBAN changed + domain typo + urgency keyword). Read one risk flag aloud. | Human-in-the-loop                      |
| 70–85 | **Actions** → click **Draft email** on `Chase Globex` — Cursor SDK writes the body live. Click **Approve** on `Downscale AWS` — the **runway** pill jumps and the **forecast line** shifts up. | Concrete workflow + Cursor bonus       |
| 85–90 | "Every action is gated, every decision shows confidence and evidence. That's safe autonomy." Cut.                                     | Human-in-the-loop + close               |

## How the email beat actually works

1. The button calls `POST /emails/process/start`, which primes the IMAP watcher with every UID currently in the inbox so older mail does not pop up.
2. The dashboard polls `GET /emails/poll` every 1 s. Backend opens an IMAP connection, returns UIDs that are new since prime, decodes the body, and tries to parse a JSON receipt out of it.
3. If `merchant` + `total` are present, a raw bank line `txn_email_<uid>` is appended to the in-memory feed via `data_source.inject_raw_transaction` — exactly the same path B's `POST /transactions` uses.
4. A daemon thread runs `cursor_llm.enrich_transaction` against the new line and mutates the raw dict in-place. The popup polls `GET /transactions/{id}` every 2 s for ~40 s, and renders the agent take when `agent_insight` lands.
5. Statements is bumped via `reloadKey` so the new row appears without a manual refresh; clicking it opens TransactionDetail's **Live agent review** section.

## Backup beats (if anything wobbles)

| Failure mode                                  | Pivot                                                                  |
| --------------------------------------------- | ---------------------------------------------------------------------- |
| Gmail IMAP slow / rate-limited / blocked      | Use the inject CLI: `scripts/inject_txn.py aws_spike` lands a fake bank webhook with the same Cursor agent insight. |
| `inject_txn.py` hangs > 12s                   | `Ctrl+C`, re-run with `--skip-agent` — drops the LLM hop, classification still lands. |
| Cursor SDK 503 / `available: false`           | Popup says "Cursor SDK offline"; just narrate the rule-based classification and the injected `txn_email_<uid>`. |
| Email button shows `error: AUTHENTICATIONFAILED` | Re-run `make demo` after exporting `AUTOCFO_INBOX_USER` / `AUTOCFO_INBOX_PASS`; defaults are in `check_email.py`. |
| Backend not reachable                         | `make backend` in a fresh terminal; `make health` to confirm.          |
| Forecast doesn't refresh after Approve        | Hit the dashboard refresh; data is correct, just cached.               |

## Live demo cheatsheet

```bash
# email-driven demo (the headline path)
sample_email.txt                                       # body to paste into Gmail compose
curl -sX POST localhost:8000/emails/process/start | jq # prime watcher
curl -s      localhost:8000/emails/state         | jq # primed/seen-count + last_error
curl -s      localhost:8000/emails/poll          | jq # delta since last poll
curl -sX POST localhost:8000/emails/process/reset | jq # forget primed state

# inject scenarios (backup path — no Gmail needed)
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
curl -s      localhost:8000/communications | jq
```

## Bonus bucket call-outs

- **Best use of Cursor:** SDK runs in a Node sidecar, called from Python over a subprocess pipe. Three task-shaped helpers — `enrich_transaction`, `draft_email`, and the email-driven async review — all with deterministic fallbacks. Demo shows the agent reviewing a fresh receipt **live, in a popup**, while the Statements panel updates underneath it.
- **Best use of LLM models:** the same helpers — claim only if SDK is up during your run. Concrete output you can point at: the natural-language take in the email popup's **AGENT TAKE** block, and the Globex chase email body.

Story stays the same as `specs/README.md`; this file is the on-stage version.
