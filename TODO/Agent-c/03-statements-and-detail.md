# 03 — Statements + TransactionDetail

**Spec:** [`specs/agent-c-frontend.md`](../specs/agent-c-frontend.md) — `Statements`, `TransactionDetail`.

## Statements

- [ ] `GET /transactions` on mount (`useEffect` + `useState`).
- [ ] Columns: date, description, category (badge), amount (outflow visually distinct), confidence, `!` or icon when `review_flag`.
- [ ] Category filter: `payroll | vendor | software | tax | misc | unknown | all`.
- [ ] Row click opens detail for that transaction id.

## TransactionDetail

- [ ] Load via `GET /transactions/{id}` or passed row object (spec allows either).
- [ ] Show counterparty, description, amount, **explanation**, confidence bar.
- [ ] If `enrichment.line_items`: small table (label, amount, note).
- [ ] If `enrichment.waste_flag`: **warning banner** with the string.
- [ ] If `anomaly_reason`: anomaly pill.

## Demo note

This is the primary **“wow”** moment — AWS-style line items + waste flag should read clearly in under two minutes.
