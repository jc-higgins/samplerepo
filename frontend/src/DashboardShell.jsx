import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { apiBase, getCashflowSummary, getHealth } from './api.js'
import { ActionsAndCashflow } from './components/ActionsAndCashflow.jsx'
import { CloudCostSnapshot } from './components/CloudCostSnapshot.jsx'
import { Invoices } from './components/Invoices.jsx'
import { InvestigationChat } from './components/InvestigationChat.jsx'
import { Statements } from './components/Statements.jsx'
import { TransactionDetail } from './components/TransactionDetail.jsx'
import './DashboardShell.css'

const fmtBalance = (n, currency = 'GBP') =>
  new Intl.NumberFormat('en-GB', {
    style: 'currency',
    currency,
    maximumFractionDigits: 0,
  }).format(n)

export function DashboardShell() {
  const [health, setHealth] = useState({ status: 'loading' })
  const [summary, setSummary] = useState(null)
  const [selectedTxnId, setSelectedTxnId] = useState(null)
  const [selectedInvoiceId, setSelectedInvoiceId] = useState(null)

  const refreshSummary = useCallback(() => {
    return getCashflowSummary()
      .then(setSummary)
      .catch(() => setSummary(null))
  }, [])

  useEffect(() => {
    let cancelled = false
    getHealth()
      .then(() => {
        if (!cancelled) setHealth({ status: 'ok' })
      })
      .catch(() => {
        if (!cancelled) setHealth({ status: 'error' })
      })
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    if (health.status !== 'ok') return
    let cancelled = false
    getCashflowSummary()
      .then((s) => {
        if (!cancelled) setSummary(s)
      })
      .catch(() => {
        if (!cancelled) setSummary(null)
      })
    return () => {
      cancelled = true
    }
  }, [health.status])

  const backendLabel =
    health.status === 'loading'
      ? '…'
      : health.status === 'ok'
        ? 'ok'
        : 'unreachable'

  const runwayLabel =
    summary?.runway_months != null
      ? `runway ~${summary.runway_months} mo`
      : summary
        ? 'runway: net positive'
        : 'runway: …'

  const balanceLabel =
    summary && typeof summary.current_balance === 'number'
      ? fmtBalance(summary.current_balance, summary.currency)
      : null

  return (
    <div className="dashboard">
      <header className="dash-header glass">
        <div className="dash-header__row">
          <Link to="/" className="dash-back">
            ← Overview
          </Link>
          <h1 className="dash-header__title">
            AutoCFO — Autonomous Financial Intelligence
          </h1>
        </div>
        <div className="dash-header__meta">
          {balanceLabel && (
            <span className="dash-pill" title="From /cashflow/summary">
              <span className="dash-pill__k">Balance</span>
              <span className="dash-pill__v">{balanceLabel}</span>
            </span>
          )}
          <span className="dash-pill" title="Burn vs inflow model">
            <span className="dash-pill__k">Runway</span>
            <span className="dash-pill__v">{runwayLabel}</span>
          </span>
          {summary?.applied_actions?.length > 0 && (
            <span
              className="dash-pill dash-pill--accent"
              title={summary.applied_actions.join(', ')}
            >
              <span className="dash-pill__k">Actions</span>
              <span className="dash-pill__v">
                {summary.applied_actions.length} applied
              </span>
            </span>
          )}
          <span
            className={
              'dash-pill dash-pill--status ' +
              (health.status === 'ok'
                ? 'dash-pill--live'
                : health.status === 'error'
                  ? 'dash-pill--err'
                  : '')
            }
          >
            <span
              className={
                'dash-meta__dot ' +
                (health.status === 'loading'
                  ? 'dash-meta__dot--pending'
                  : health.status === 'ok'
                    ? 'dash-meta__dot--live'
                    : 'dash-meta__dot--err')
              }
              aria-hidden
            />
            <span className="dash-pill__k">API</span>
            <span className="dash-pill__v">{backendLabel}</span>
          </span>
        </div>
      </header>

      {health.status === 'loading' && (
        <p className="dash-boot" role="status">
          Connecting to API…
        </p>
      )}

      {health.status === 'error' && (
        <div className="dash-banner" role="alert">
          Backend unreachable — start{' '}
          <code className="dash-banner__code">make backend</code> or{' '}
          <code className="dash-banner__code">
            uv run uvicorn hackathon_backend.main:app --reload --port 8000
          </code>
        </div>
      )}

      <main
        className={
          'dash-main ' +
          (health.status === 'loading' ? 'dash-main--boot' : '')
        }
        aria-busy={health.status === 'loading'}
      >
        <div className="dash-grid">
          <div className="dash-stack dash-stack--left">
            <section className="dash-panel glass" aria-labelledby="cloud-snap-h">
              <CloudCostSnapshot onOpenTransaction={setSelectedTxnId} />
            </section>
            <section
              className="dash-panel glass"
              aria-labelledby="dash-statements"
            >
              <h2 id="dash-statements" className="dash-panel__h">
                Statements
              </h2>
              <Statements
                selectedId={selectedTxnId}
                onSelectId={setSelectedTxnId}
              />
            </section>
            <section
              className="dash-panel glass dash-panel--detail"
              aria-labelledby="dash-detail"
            >
              <h2 id="dash-detail" className="dash-panel__h">
                Transaction detail
              </h2>
              <TransactionDetail transactionId={selectedTxnId} />
            </section>
          </div>
          <div className="dash-stack dash-stack--right">
            <section
              className="dash-panel glass"
              aria-labelledby="dash-invoices"
            >
              <h2 id="dash-invoices" className="dash-panel__h">
                Invoices
              </h2>
              <Invoices
                selectedInvoiceId={selectedInvoiceId}
                onSelectInvoice={setSelectedInvoiceId}
              />
            </section>
            <section
              className="dash-panel glass"
              aria-labelledby="dash-investigate"
            >
              <h2 id="dash-investigate" className="dash-panel__h">
                Investigate
              </h2>
              <p className="dash-panel__lede">
                Chat uses the selected statement line and invoice as context
                (demo heuristics).
              </p>
              <InvestigationChat
                transactionId={selectedTxnId}
                invoiceId={selectedInvoiceId}
              />
            </section>
            <section
              className="dash-panel glass"
              aria-labelledby="dash-actions"
            >
              <h2 id="dash-actions" className="dash-panel__h">
                Actions &amp; Cashflow
              </h2>
              <p className="dash-panel__lede dash-panel__lede--tight">
                Approve gated plans to shift the forecast; chart uses inline SVG
                only.
              </p>
              <ActionsAndCashflow onCashflowChanged={refreshSummary} />
            </section>
          </div>
        </div>
      </main>

      <footer className="dash-foot">
        <span className="dash-foot__mono">{apiBase}</span>
      </footer>
    </div>
  )
}
