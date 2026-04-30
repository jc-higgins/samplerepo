# 03 — Statements + TransactionDetail

**Spec:** [`specs/agent-c-frontend.md`](../specs/agent-c-frontend.md) — `Statements`, `TransactionDetail`.

## Statements

- [x] `GET /transactions` on mount (`useEffect` + `useState`).
- [x] Columns: date, description, category (badge), amount (outflow visually distinct), confidence, `!` or icon when `review_flag`.
- [x] Category filter: `payroll | vendor | software | tax | misc | unknown | all`.
- [x] Row click opens detail for that transaction id.

## TransactionDetail

- [x] Load via `GET /transactions/{id}` or passed row object (spec allows either).
- [x] Show counterparty, description, amount, **explanation**, confidence bar.
- [x] If `enrichment.line_items`: small table (label, amount, note).
- [x] If `enrichment.waste_flag`: **warning banner** with the string.
- [x] If `anomaly_reason`: anomaly pill.

## Demo note

This is the primary **“wow”** moment — AWS-style line items + waste flag should read clearly in under two minutes.
