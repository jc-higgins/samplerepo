# 02 — API helpers (`api.js`)

**Spec:** [`specs/agent-c-frontend.md`](../specs/agent-c-frontend.md) — API helpers section.

## Checklist

- [ ] Add `frontend/src/api.js` with base `import.meta.env.VITE_API_URL` (strip trailing slash) default `http://127.0.0.1:8000`.
- [ ] `getTransactions`, `getTransaction(id)`, `getInvoices`, `getActions`, `getForecast`, `approveAction(id)` — match [`specs/01-mvp-split.md`](../specs/01-mvp-split.md) paths.
- [ ] Shared JSON helper: reject non-OK responses consistently.

## Done when

Modules can be imported from components without duplicating base URL logic.
