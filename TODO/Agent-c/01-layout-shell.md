# 01 — Layout shell

**Spec:** [`specs/agent-c-frontend.md`](../specs/agent-c-frontend.md) (layout diagram, “Replace `App.jsx` with the dashboard”).

## Checklist

- [x] Single-page layout: header **AutoCFO — Autonomous Financial Intelligence** (or match spec wording).
- [x] Header shows **runway** placeholder or value when forecast exists; **backend** status from `GET /health`.
- [x] Two-column grid (or stacked on narrow): **Statements** left; **Invoices** + **Actions & Cashflow** right per ASCII diagram in spec.
- [x] Global loading / error states so the page does not flash empty while first fetches run.
- [x] No router: drill-down is panel or modal on the same page.

## Non-goals (from spec)

Routing library, design system, Tailwind, chart libraries, auth.

## Done when

Layout renders with static placeholders for the three panels and a clear place for the drill-down panel.
