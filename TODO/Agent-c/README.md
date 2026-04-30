# Agent C — frontend TODOs

Scratchpad and checklists for the React dashboard in [`specs/agent-c-frontend.md`](../specs/agent-c-frontend.md). Contract and endpoints: [`specs/01-mvp-split.md`](../specs/01-mvp-split.md).

**Overview vs Dashboard:** The polished **landing** (`Landing.jsx`) is the default route for judge-facing demos. The **dashboard** (`DashboardShell.jsx`) is toggled from `App.jsx` (top-right **Overview | Dashboard** or **Open demo dashboard** on the hero). These TODOs **only extend functionality inside the dashboard**—they must not strip or replace the landing unless we explicitly decide to.

Hackathon **demo clarity** (~90s): finish numbered slices so the judge path is one continuous flow from Overview → Dashboard with live panels.

## Files in this folder

| File | Topic |
| --- | --- |
| [01-layout-shell.md](./01-layout-shell.md) | Page layout, header, loading states |
| [02-api-helpers.md](./02-api-helpers.md) | `api.js` + env base URL |
| [03-statements-and-detail.md](./03-statements-and-detail.md) | Statements table + `TransactionDetail` drill-down |
| [04-invoices.md](./04-invoices.md) | Invoices list, badges, expand |
| [05-actions-cashflow.md](./05-actions-cashflow.md) | Actions cards, approve POST, `CashflowChart` SVG |
| [06-cloud-cost-dashboard.md](./06-cloud-cost-dashboard.md) | Mock AWS/GCP cost summary API + dashboard panel (inline SVG) |

Suggested implementation order matches the numbered files (same as the Agent C spec build order). **06** can start after **02** (`api.js`); it does not block Statements/Invoices/Actions work.

## Commit suggestion

Land each numbered slice as its **own commit** (or split further if a file grows large), then a final polish commit if needed—see [Repository workflow](../../README.md#repository-workflow) in the root README.
