# 05 — Actions, approve, CashflowChart

**Spec:** [`specs/agent-c-frontend.md`](../specs/agent-c-frontend.md) — `ActionsAndCashflow`, `CashflowChart`.

## Actions

- [ ] `GET /actions` and `GET /cashflow/forecast` on mount.
- [ ] Per action: title, `recommended_action`, `expected_cash_impact` formatted (£), confidence bar, rationale.
- [ ] If `execution_mode === "HUMAN_APPROVAL"`: **Approve** → `POST /actions/{id}/approve`; optimistically update `next_step` toward execute per spec (no mandatory forecast refetch).

## CashflowChart

- [ ] Inline SVG only — **no** chart libraries (`01-mvp-split.md` / Agent C hard non-goals).
- [ ] Width 100%, height ~140px; polyline from `projected_balance`; min/max scaling.
- [ ] 2–3 axis labels (today, +30d, +60d, +90d as appropriate).
- [ ] Horizontal dashed line at today’s balance reference.

## Done when

MVP definition of done in [`specs/01-mvp-split.md`](../specs/01-mvp-split.md) is satisfied for the dashboard slice.
