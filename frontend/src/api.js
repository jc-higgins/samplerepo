const apiBase =
  import.meta.env.VITE_API_URL?.replace(/\/$/, '') || 'http://127.0.0.1:8000'

const jsonOrThrow = (r) =>
  r.ok ? r.json() : Promise.reject(new Error(String(r.status)))

export { apiBase }

export const getHealth = () => fetch(`${apiBase}/health`).then(jsonOrThrow)

const queryFromOpts = (opts) => {
  const p = new URLSearchParams()
  if (Array.isArray(opts.accounts) && opts.accounts.length > 0) {
    p.set('accounts', opts.accounts.join(','))
  }
  if (opts.tag && String(opts.tag).trim()) {
    p.set('tag', String(opts.tag).trim())
  }
  const q = p.toString()
  return q ? `?${q}` : ''
}

export const getLedgerFilters = () =>
  fetch(`${apiBase}/ledger/filters`).then(jsonOrThrow)

export const getTransactions = (opts = {}) =>
  fetch(`${apiBase}/transactions${queryFromOpts(opts)}`).then(jsonOrThrow)

export const getTransaction = (id) =>
  fetch(`${apiBase}/transactions/${id}`).then(jsonOrThrow)

export const getInvoices = () => fetch(`${apiBase}/invoices`).then(jsonOrThrow)

export const getInvoice = (id) =>
  fetch(`${apiBase}/invoices/${id}`).then(jsonOrThrow)

export const getActions = () => fetch(`${apiBase}/actions`).then(jsonOrThrow)

export const getForecast = () =>
  fetch(`${apiBase}/cashflow/forecast`).then(jsonOrThrow)

export const getCashflowSummary = () =>
  fetch(`${apiBase}/cashflow/summary`).then(jsonOrThrow)

export const getCloudCostSummary = (opts = {}) =>
  fetch(`${apiBase}/cloud/cost-summary${queryFromOpts(opts)}`).then(
    jsonOrThrow
  )

export const approveAction = (id) =>
  fetch(`${apiBase}/actions/${id}/approve`, { method: 'POST' }).then(
    jsonOrThrow
  )

export const startEmailProcessing = () =>
  fetch(`${apiBase}/emails/process/start`, { method: 'POST' }).then(jsonOrThrow)

export const resetEmailProcessing = () =>
  fetch(`${apiBase}/emails/process/reset`, { method: 'POST' }).then(jsonOrThrow)

export const pollEmails = () =>
  fetch(`${apiBase}/emails/poll`).then(jsonOrThrow)

export const getEmailState = () =>
  fetch(`${apiBase}/emails/state`).then(jsonOrThrow)
