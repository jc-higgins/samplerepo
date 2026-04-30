# Agent C — Frontend Dashboard

**Read first:** `specs/01-mvp-split.md` (shared contract + endpoint table). The shapes there are what you'll be rendering.

**Mission:** Build the AutoCFO dashboard in the existing Vite + React app. Three panels: Statements (with drill-down), Invoices (with verification badge), Actions & Cashflow. Calls Agent B's API. Should read clearly in a **~90 second** judge demo (`demo/README.md`), not necessarily polished visual design.

**Time budget:** 45 min.

---

## Where things live

- Existing app: `frontend/src/App.jsx`, `frontend/src/App.css`. Replace the contents of `App.jsx` with the dashboard.
- Add components in `frontend/src/components/`:
  - `Statements.jsx`
  - `TransactionDetail.jsx` (drill-down panel/modal)
  - `Invoices.jsx`
  - `ActionsAndCashflow.jsx`
  - `CashflowChart.jsx` (simple — see below)
- API base lives at `import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000'` (already wired).
- No new dependencies unless absolutely needed. Stay on React 19 only. **Do not add a chart library** — render the cashflow line as an inline SVG (~30 lines).

---

## Layout

Single page, three sections stacked or in a 2-column grid (left: Statements, right: Invoices + Actions). Use `App.css` for styling, extend it as needed. Header reads `AutoCFO — Autonomous Financial Intelligence`.

```
┌──────────────────────────────────────────────────────────┐
│ AutoCFO    runway: ~7.4 months    backend: ok            │
├──────────────────────────────┬───────────────────────────┤
│ Statements                   │ Invoices                  │
│  - filter: category dropdown │  [LEGIT]  Acme Hosting £… │
│  - row click → detail panel  │  [SUSP.]  Acme Hosting £… │
│                              │  [UNKWN]  …               │
│                              ├───────────────────────────┤
│                              │ Actions & Cashflow        │
│                              │  Action cards + Approve   │
│                              │  90-day balance line      │
└──────────────────────────────┴───────────────────────────┘
```

---

## What each component does

### `Statements`

- `GET /transactions` on mount.
- Table columns: date, description, category (badge), amount (red for outflow), confidence, a small `!` icon if `review_flag`.
- Category filter dropdown (`payroll | vendor | software | tax | misc | unknown | all`).
- Row click → opens `TransactionDetail` for that id.

### `TransactionDetail`

- `GET /transactions/{id}` (or pass the row down — either works).
- Shows: counterparty, description, amount, explanation, confidence bar.
- If `enrichment.line_items` present: render a small itemized table (label, amount, note). If `enrichment.waste_flag`, render a warning banner with the string.
- If `anomaly_reason`, render an "anomaly" pill with the reason.

### `Invoices`

- `GET /invoices` on mount.
- Card per invoice: vendor, amount, channel pill (`email`/`whatsapp`), due date.
- Verification badge using `verification.decision`:
  - `LEGIT` → green
  - `SUSPICIOUS` → amber
  - `UNKNOWN` → grey
- Expand to show `verification.evidence` (bullet list), `risk_flags` (red pills), `rationale` (paragraph), and `confidence` as a small bar.

### `ActionsAndCashflow`

- `GET /actions` and `GET /cashflow/forecast` on mount.
- For each action: title, recommended_action, expected_cash_impact (formatted £), confidence bar, rationale.
  - If `execution_mode === "HUMAN_APPROVAL"`: show **Approve** button → `POST /actions/{id}/approve`, then optimistically flip `next_step` to `AUTO_EXECUTE`. No need to refetch forecast.
  - If `execution_mode === "AUTO"`: show "Auto-executed" tag, no button.
- Below the cards, render `CashflowChart` using the forecast.

### `CashflowChart`

- Inline SVG. Width 100%, height ~140px.
- Compute min/max of `projected_balance`, plot a polyline. Add 2–3 axis labels (today, +30d, +60d, +90d).
- Add a horizontal dashed line at "today's balance" for reference.
- That's it. No tooltips, no legend.

---

## API helpers

Single thin module `frontend/src/api.js`:

```js
const base = import.meta.env.VITE_API_URL?.replace(/\/$/, '') || 'http://127.0.0.1:8000'
const j = (r) => (r.ok ? r.json() : Promise.reject(new Error(r.status)))

export const getTransactions  = ()    => fetch(`${base}/transactions`).then(j)
export const getTransaction   = (id)  => fetch(`${base}/transactions/${id}`).then(j)
export const getInvoices      = ()    => fetch(`${base}/invoices`).then(j)
export const getActions       = ()    => fetch(`${base}/actions`).then(j)
export const getForecast      = ()    => fetch(`${base}/cashflow/forecast`).then(j)
export const approveAction    = (id)  => fetch(`${base}/actions/${id}/approve`, { method: 'POST' }).then(j)
```

Don't use react-query or zustand. `useState` + `useEffect` is fine.

---

## Build order

1. Replace `App.jsx` with the layout shell + a static "loading" state. (5 min)
2. Wire `Statements` against the contract using a hardcoded JSON file you copy from `01-mvp-split.md` until Agent B's `/transactions` is live. Swap to fetch as soon as it returns 200. (10 min)
3. `TransactionDetail` with the AWS hero data. This is the "wow" moment of the demo — make sure the line items + waste flag look good. (10 min)
4. `Invoices` panel with badges and expand. (10 min)
5. `ActionsAndCashflow` + `CashflowChart`. Approve button last. (10 min)

## Hard non-goals

- No routing library. The drill-down is a side panel or modal in the same page.
- No design system, no Tailwind, no MUI. Plain CSS in `App.css`.
- No charts library (no recharts/chart.js/d3). Inline SVG only.
- No auth screens, no settings, no dark mode toggle.
- Do not change the API shape. If something is missing, request it from Agent B and have them update `01-mvp-split.md`.
