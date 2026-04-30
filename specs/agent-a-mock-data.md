# Agent A — Mock Data & Fixtures

**Read first:** `specs/01-mvp-split.md` (shared contract). All shapes below come from there.

**Mission:** Produce realistic-looking synthetic fixtures for bank, cloud-cost, email, WhatsApp, and invoice data. Everyone else is blocked on you for the first ~15 minutes, so ship a thin first pass fast, then enrich.

**Time budget:** 30 min total. First pass at minute 15.

---

## Where things live

Create everything under `backend/src/hackathon_backend/fixtures/`:

```
fixtures/
  __init__.py
  data/
    transactions.json
    aws_breakdowns.json     # keyed by transaction id
    invoices.json
    gmail_threads.json      # keyed by thread id
    whatsapp_threads.json   # keyed by thread id
    vendors.json            # known counterparties
  loaders.py                # tiny helpers: load_transactions(), load_invoices(), etc.
```

Agent B will import from `hackathon_backend.fixtures.loaders`. Keep loader names stable.

---

## What to generate

### `transactions.json` — 25–40 entries over the last ~60 days

Mix of:

- 1 large AWS charge (use this id: `txn_aws_apr`, amount around `-4382.17`). This is the demo hero — keep the id stable.
- 2–3 payroll outflows (round-ish amounts, e.g. `-12500`, recurring monthly).
- 4–6 SaaS charges (Linear, Vercel, Notion, Figma, Stripe fees).
- 2–3 vendor payments (one to "Acme Hosting Ltd" — this matches an invoice).
- 1 anomaly: a new merchant with an unusually high amount (set `anomaly_reason`).
- 6–10 inflows (customer payments).
- A couple of small ambiguous charges (set `category: "unknown"`, `confidence < 0.8`, `review_flag: true`).

Use the `Transaction` shape from `01-mvp-split.md`. Only the AWS one needs `enrichment` populated inline; for others, leave `enrichment` absent (Agent B will look up `aws_breakdowns.json` for any txn whose id appears there).

### `aws_breakdowns.json` — at least the AWS hero entry

```json
{
  "txn_aws_apr": {
    "source": "aws",
    "line_items": [
      { "label": "EC2 (api-cluster)", "amount": 2100.00, "note": "40% idle over last 14 days" },
      { "label": "RDS (prod-db)",     "amount": 1800.00 },
      { "label": "S3 egress",         "amount":  482.17 }
    ],
    "waste_flag": "~£900/mo idle compute on api-cluster"
  }
}
```

You can add a second entry (e.g. GCP or a Stripe fee breakdown) if time permits.

### `vendors.json` — 6–10 entries

```json
{
  "acme-hosting": {
    "name": "Acme Hosting Ltd",
    "first_seen": "2025-08-12",
    "payment_count": 4,
    "known_account": "GB29 NWBK 6016 1331 9268 19"
  }
}
```

Used by Agent B to decide LEGIT vs SUSPICIOUS.

### `invoices.json` — 5–8 incoming invoice requests

Include at least:

- 1 **legit**: from `Acme Hosting Ltd`, account matches `vendors.json`, has matching `gmail_threads.json` entry going back months.
- 1 **suspicious**: same vendor name as a known one but a *new* IBAN, urgent tone in `thread_excerpt`.
- 1 **unknown**: brand-new sender, no prior thread, no bank history.
- 1 **whatsapp** channel for variety.

Don't compute the verification — that's Agent B's job. Just provide the raw `InvoiceRequest` fields plus a `thread_id` that points into `gmail_threads.json` or `whatsapp_threads.json` (or `null` for the unknown one).

### `gmail_threads.json` / `whatsapp_threads.json`

Lightweight: each thread is `{ id, participants: [], message_count, first_message_at, last_message_at, snippets: [strings] }`. 3–5 threads each. Snippets just need to read like real conversations ("Confirming the call on Tues, will send invoice", etc.).

### `loaders.py`

```python
import json
from pathlib import Path

DATA_DIR = Path(__file__).parent / "data"

def _load(name: str):
    return json.loads((DATA_DIR / name).read_text())

def load_transactions(): return _load("transactions.json")
def load_aws_breakdowns(): return _load("aws_breakdowns.json")
def load_invoices(): return _load("invoices.json")
def load_gmail_threads(): return _load("gmail_threads.json")
def load_whatsapp_threads(): return _load("whatsapp_threads.json")
def load_vendors(): return _load("vendors.json")
```

That's it. No classes, no validation, no Pydantic — Agent B can wrap as needed.

---

## First-pass deliverable (minute 15)

Even if rough: `transactions.json` (≥10 entries including the AWS one), `aws_breakdowns.json` (at least the hero), `invoices.json` (≥3 entries covering legit/suspicious/unknown), `vendors.json`, and `loaders.py`. Commit and tell Agents B and C they can pull.

## Polish pass (minute 15→30)

Fill out remaining fixtures, add the WhatsApp thread, broaden transaction history, add 1–2 anomalies.

## Hard non-goals

- Do not write any FastAPI endpoints.
- Do not implement classification or verification logic.
- Do not call any real APIs (AWS, Gmail, etc.). All numbers are made up but plausible.
- Do not introduce new dependencies. Plain `json` + `pathlib` only.
