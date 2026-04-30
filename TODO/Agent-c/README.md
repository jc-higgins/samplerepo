# Agent C — frontend TODOs

Scratchpad and checklists for the React dashboard in [`specs/agent-c-frontend.md`](../specs/agent-c-frontend.md). Contract and endpoints: [`specs/01-mvp-split.md`](../specs/01-mvp-split.md).

Hackathon **demo clarity** (~90s): finish numbered slices so the judge path in [`demo/README.md`](../demo/README.md) is one continuous flow.

## Files in this folder

| File | Topic |
| --- | --- |
| [01-layout-shell.md](./01-layout-shell.md) | Page layout, header, loading states |
| [02-api-helpers.md](./02-api-helpers.md) | `api.js` + env base URL |
| [03-statements-and-detail.md](./03-statements-and-detail.md) | Statements table + `TransactionDetail` drill-down |
| [04-invoices.md](./04-invoices.md) | Invoices list, badges, expand |
| [05-actions-cashflow.md](./05-actions-cashflow.md) | Actions cards, approve POST, `CashflowChart` SVG |

Suggested implementation order matches the numbered files (same as the Agent C spec build order).

## Commit suggestion

Land each numbered slice as its **own commit** (or split further if a file grows large), then a final polish commit if needed—see [Repository workflow](../../README.md#repository-workflow) in the root README.
