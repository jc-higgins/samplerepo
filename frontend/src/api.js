const apiBase =
  import.meta.env.VITE_API_URL?.replace(/\/$/, '') || 'http://127.0.0.1:8000'

const jsonOrThrow = (r) =>
  r.ok ? r.json() : Promise.reject(new Error(String(r.status)))

export { apiBase }

export const getHealth = () => fetch(`${apiBase}/health`).then(jsonOrThrow)

export const getTransactions = () =>
  fetch(`${apiBase}/transactions`).then(jsonOrThrow)

export const getTransaction = (id) =>
  fetch(`${apiBase}/transactions/${id}`).then(jsonOrThrow)

export const getInvoices = () => fetch(`${apiBase}/invoices`).then(jsonOrThrow)

export const getInvoice = (id) =>
  fetch(`${apiBase}/invoices/${id}`).then(jsonOrThrow)

export const getActions = () => fetch(`${apiBase}/actions`).then(jsonOrThrow)

export const getForecast = () =>
  fetch(`${apiBase}/cashflow/forecast`).then(jsonOrThrow)

export const approveAction = (id) =>
  fetch(`${apiBase}/actions/${id}/approve`, { method: 'POST' }).then(
    jsonOrThrow
  )
