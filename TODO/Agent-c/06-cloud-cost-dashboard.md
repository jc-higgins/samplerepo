# 06 — Mock AWS & GCP cost dashboard

**Context:** [`frontend/src/components/CloudCostSnapshot.jsx`](../../frontend/src/components/CloudCostSnapshot.jsx) already surfaces the latest AWS/GCP bill per `enrichment.source` from `GET /transactions`. Mock breakdowns live in [`backend/src/hackathon_backend/agents/seeds.py`](../../backend/src/hackathon_backend/agents/seeds.py) (`AWS_BREAKDOWNS`, `GCP_BREAKDOWNS`) and merge in [`ledger.py`](../../backend/src/hackathon_backend/agents/ledger.py).

**Spec:** Extend [`specs/agent-c-frontend.md`](../../specs/agent-c-frontend.md) with a short “Cloud cost dashboard” subsection when you implement this slice (and add the route to [`specs/01-mvp-split.md`](../../specs/01-mvp-split.md) endpoint table).

## Backend — mock cost API

- [ ] Add `GET /cloud/cost-summary` (name can vary; keep it read-only and CORS-safe like other routes) in [`main.py`](../../backend/src/hackathon_backend/main.py).
- [ ] Implement a small builder (e.g. in `agents/` next to `data_source`) that returns **static mock JSON** derived from existing seeds — no real AWS/GCP SDKs.
- [ ] Response shape suggestion (adjust to taste): per provider `aws` / `gcp`, include `currency`, `last_invoice_period` (or month labels), `total_last_period`, optional `mom_delta_pct` or `mom_delta_amount` comparing Mar vs Apr seed rows, `services` list rolled up from `line_items` (label, amount, optional note), and `history` as 2–3 points `{ period, amount }` for a tiny inline chart.
- [ ] Reuse transaction ids / amounts from raw transactions where it keeps numbers consistent with the bank feed; avoid inventing a second conflicting total.

## Frontend — dashboard UI

- [ ] Add `getCloudCostSummary()` (or matching name) in [`frontend/src/api.js`](../../frontend/src/api.js).
- [ ] Either extend `CloudCostSnapshot` or add a dedicated component (e.g. `CloudCostDashboard.jsx`) mounted from [`DashboardShell.jsx`](../../frontend/src/DashboardShell.jsx): two columns **AWS | GCP** with headline total, period label, MoM badge (up/down/neutral), full **service breakdown** table, and a **sparkline or bar strip** from `history` using **inline SVG only** (same rule as `CashflowChart` — no chart libraries).
- [ ] Keep drill-down to Statements: reuse existing `onOpenTransaction` / “Open in Statements” pattern for the latest txn id per cloud.
- [ ] Styles in [`DashboardShell.css`](../../frontend/src/DashboardShell.css) (or scoped class names) so the panel matches existing dashboard density and typography.

## Done when

A judge can scan **AWS vs GCP** spend, see **month-over-month mock movement**, and **service-level lines** without cross-referencing raw JSON — all backed by the new endpoint and existing seed narrative (waste flags still make sense in Statements drill-down).
