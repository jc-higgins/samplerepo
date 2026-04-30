import { useEffect, useState } from 'react'
import { apiBase, getHealth } from './api.js'
import { CloudCostSnapshot } from './components/CloudCostSnapshot.jsx'
import { Invoices } from './components/Invoices.jsx'
import { InvestigationChat } from './components/InvestigationChat.jsx'
import { Statements } from './components/Statements.jsx'
import { TransactionDetail } from './components/TransactionDetail.jsx'
import './DashboardShell.css'

export function DashboardShell({ onBack }) {
  const [health, setHealth] = useState({ status: 'loading' })
  const [selectedTxnId, setSelectedTxnId] = useState(null)
  const [selectedInvoiceId, setSelectedInvoiceId] = useState(null)

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

  const backendLabel =
    health.status === 'loading'
      ? '…'
      : health.status === 'ok'
        ? 'ok'
        : 'unreachable'

  return (
    <div className="dashboard">
      <header className="dash-header glass">
        <div className="dash-header__row">
          {onBack && (
            <button type="button" className="dash-back" onClick={onBack}>
              ← Overview
            </button>
          )}
          <h1 className="dash-header__title">
            AutoCFO — Autonomous Financial Intelligence
          </h1>
        </div>
        <div className="dash-header__meta">
          <span
            className="dash-meta__item"
            title="Placeholder until forecast is wired"
          >
            runway: ~7.4 mo
          </span>
          <span className="dash-meta__item">
            backend:{' '}
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
            />{' '}
            {backendLabel}
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
              <p className="dash-panel__stub">
                Action cards, Approve, inline SVG chart (next:{' '}
                <code>ActionsAndCashflow.jsx</code>,{' '}
                <code>CashflowChart.jsx</code>)
              </p>
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
