import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { apiBase, getCashflowSummary, getHealth, getLedgerFilters } from './api.js'
import { AccountProductScope } from './components/AccountProductScope.jsx'
import { ActionsAndCashflow } from './components/ActionsAndCashflow.jsx'
import { CloudCostSnapshot } from './components/CloudCostSnapshot.jsx'
import { EmailNotifier } from './components/EmailNotifier.jsx'
import { Invoices } from './components/Invoices.jsx'
import { FloatingStatementChat } from './components/FloatingStatementChat.jsx'
import { Statements } from './components/Statements.jsx'
import { TransactionDetail } from './components/TransactionDetail.jsx'
import './DashboardShell.css'

function scrollToTransactionDetailPanel() {
  document.getElementById('dash-section-detail')?.scrollIntoView({
    behavior: 'smooth',
    block: 'start',
  })
}

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
  const [txnReloadKey, setTxnReloadKey] = useState(0)
  const [scopeAccountIds, setScopeAccountIds] = useState(null)
  const [scopeTag, setScopeTag] = useState('')
  const [filtersMeta, setFiltersMeta] = useState({ accounts: [], tags: [] })

  const refreshSummary = useCallback(() => {
    return getCashflowSummary()
      .then(setSummary)
      .catch(() => setSummary(null))
  }, [])

  const handleEmailInjectedTxn = useCallback(
    (txnId) => {
      setSelectedTxnId(txnId)
      setTxnReloadKey((n) => n + 1)
      refreshSummary()
      scrollToTransactionDetailPanel()
    },
    [refreshSummary]
  )

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

  useEffect(() => {
    if (health.status !== 'ok') return
    let cancelled = false
    getLedgerFilters()
      .then((data) => {
        if (!cancelled && data && typeof data === 'object') {
          setFiltersMeta({
            accounts: Array.isArray(data.accounts) ? data.accounts : [],
            tags: Array.isArray(data.tags) ? data.tags : [],
          })
        }
      })
      .catch(() => {
        if (!cancelled) setFiltersMeta({ accounts: [], tags: [] })
      })
    return () => {
      cancelled = true
    }
  }, [health.status])

  const backendLabel =
    health.status === 'loading'
      ? '…'
      : health.status === 'ok'
        ? 'Connected'
        : 'Unreachable'

  const runwayLabel =
    summary?.runway_months != null
      ? `~${summary.runway_months} mo`
      : summary
        ? 'Net positive'
        : '—'

  const balanceLabel =
    summary && typeof summary.current_balance === 'number'
      ? fmtBalance(summary.current_balance, summary.currency)
      : '—'

  const actionsLabel =
    summary?.applied_actions?.length > 0
      ? `${summary.applied_actions.length} applied`
      : 'None'

  return (
    <div className="dashboard">
      <div className="dash-page">
        <header className="dash-top">
          <div className="dash-top__bar">
            <Link to="/" className="dash-top__back">
              ← Overview
            </Link>
            <div className="dash-top__brand">
              <span className="dash-top__eyebrow">AutoCFO · demo</span>
              <h1 className="dash-top__title">Financial command center</h1>
            </div>
          </div>

          <div className="dash-top__stats" aria-label="Summary metrics">
            <div className="dash-stat">
              <span className="dash-stat__k">Balance</span>
              <span className="dash-stat__v" title="From /cashflow/summary">
                {balanceLabel}
              </span>
            </div>
            <div className="dash-stat">
              <span className="dash-stat__k">Runway</span>
              <span className="dash-stat__v" title="Burn vs inflow model">
                {runwayLabel}
              </span>
            </div>
            <div
              className={
                'dash-stat ' +
                (summary?.applied_actions?.length > 0 ? 'dash-stat--accent' : '')
              }
              title={
                summary?.applied_actions?.length
                  ? summary.applied_actions.join(', ')
                  : undefined
              }
            >
              <span className="dash-stat__k">Actions</span>
              <span className="dash-stat__v">{actionsLabel}</span>
            </div>
            <div
              className={
                'dash-stat ' +
                (health.status === 'ok'
                  ? 'dash-stat--live'
                  : health.status === 'error'
                    ? 'dash-stat--err'
                    : '')
              }
            >
              <span className="dash-stat__k">API</span>
              <span className="dash-stat__v">
                <span
                  className={
                    'dash-stat__dot ' +
                    (health.status === 'loading'
                      ? 'dash-stat__dot--pending'
                      : health.status === 'ok'
                        ? 'dash-stat__dot--live'
                        : 'dash-stat__dot--err')
                  }
                  aria-hidden
                />
                {backendLabel}
              </span>
            </div>
          </div>

          {health.status === 'ok' && (
            <div className="dash-top__email">
              <EmailNotifier onTransactionInjected={handleEmailInjectedTxn} />
            </div>
          )}
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
          {health.status === 'ok' && filtersMeta.accounts.length > 0 && (
            <section
              id="dash-section-scope"
              className="dash-panel dash-scope-block dash-scroll-target"
              aria-labelledby="dash-scope-title"
            >
              <h2 id="dash-scope-title" className="dash-panel__h">
                Scope
              </h2>
              <p className="dash-panel__lede dash-panel__lede--tight">
                Default is all accounts and tags. Narrow to specific accounts
                and/or a product tag (demo tags come from counterparties).
              </p>
              <AccountProductScope
                accountsCatalog={filtersMeta.accounts}
                tagOptions={filtersMeta.tags}
                accountIds={scopeAccountIds}
                tag={scopeTag}
                onAccountIdsChange={setScopeAccountIds}
                onTagChange={setScopeTag}
              />
            </section>
          )}

          <div className="dash-split">
            <div className="dash-col dash-col--primary">
              <section
                id="dash-section-cloud"
                className="dash-panel dash-scroll-target"
                aria-labelledby="cloud-snap-h"
              >
                <CloudCostSnapshot
                  onOpenTransaction={(id) => {
                    setSelectedTxnId(id)
                    scrollToTransactionDetailPanel()
                  }}
                  accountIds={scopeAccountIds}
                  productTag={scopeTag}
                />
              </section>
              <section
                id="dash-section-statements"
                className="dash-panel dash-scroll-target"
                aria-labelledby="dash-statements"
              >
                <h2 id="dash-statements" className="dash-panel__h">
                  Statements
                </h2>
                <Statements
                  selectedId={selectedTxnId}
                  onSelectId={setSelectedTxnId}
                  reloadKey={txnReloadKey}
                  accountIds={scopeAccountIds}
                  productTag={scopeTag}
                />
              </section>
              <section
                id="dash-section-detail"
                className="dash-panel dash-panel--detail dash-scroll-target"
                aria-labelledby="dash-detail"
              >
                <h2 id="dash-detail" className="dash-panel__h">
                  Transaction detail
                </h2>
                <TransactionDetail transactionId={selectedTxnId} />
              </section>
            </div>

            <aside className="dash-col dash-col--side">
              <section
                id="dash-section-invoices"
                className="dash-panel dash-scroll-target"
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
                className="dash-panel dash-panel--hint"
                aria-labelledby="dash-investigate"
              >
                <h2 id="dash-investigate" className="dash-panel__h">
                  Statement assistant
                </h2>
                <p className="dash-panel__lede dash-panel__lede--tight">
                  Use the floating panel (bottom-right). It uses the selected
                  statement row; add an invoice to compare payables (demo
                  rule-based replies).
                </p>
              </section>
              <section
                id="dash-section-actions"
                className="dash-panel dash-scroll-target"
                aria-labelledby="dash-actions"
              >
                <h2 id="dash-actions" className="dash-panel__h">
                  Actions &amp; cashflow
                </h2>
                <p className="dash-panel__lede dash-panel__lede--tight">
                  Approve gated plans to shift the forecast. Chart is inline
                  SVG only.
                </p>
                <ActionsAndCashflow onCashflowChanged={refreshSummary} />
              </section>
            </aside>
          </div>
        </main>

        <footer className="dash-foot">
          <span className="dash-foot__mono">{apiBase}</span>
        </footer>
      </div>

      {health.status === 'ok' && (
        <FloatingStatementChat
          transactionId={selectedTxnId}
          invoiceId={selectedInvoiceId}
        />
      )}
    </div>
  )
}
