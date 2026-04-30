import { useEffect, useState } from 'react'
import './App.css'

const apiBase =
  import.meta.env.VITE_API_URL?.replace(/\/$/, '') || 'http://127.0.0.1:8000'

function App() {
  const [health, setHealth] = useState({ status: 'loading' })

  useEffect(() => {
    let cancelled = false
    fetch(`${apiBase}/health`)
      .then((r) => (r.ok ? r.json() : Promise.reject()))
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
        <h1 className="dash-header__title">
          AutoCFO — Autonomous Financial Intelligence
        </h1>
        <div className="dash-header__meta">
          <span className="dash-meta__item" title="Placeholder until forecast is wired">
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
          <code className="dash-banner__code">uv run uvicorn hackathon_backend.main:app --reload --port 8000</code>
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
            <section
              className="dash-panel glass"
              aria-labelledby="dash-statements"
            >
              <h2 id="dash-statements" className="dash-panel__h">
                Statements
              </h2>
              <p className="dash-panel__stub">
                Category filter + transaction table (next:{' '}
                <code>Statements.jsx</code>)
              </p>
            </section>
            <section
              className="dash-panel glass dash-panel--detail"
              aria-labelledby="dash-detail"
            >
              <h2 id="dash-detail" className="dash-panel__h">
                Transaction detail
              </h2>
              <p className="dash-panel__stub dash-panel__stub--muted">
                Drill-down opens here on row click — same page, no router (
                <code>TransactionDetail.jsx</code>).
              </p>
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
              <p className="dash-panel__stub">
                Verification badges + expand (next: <code>Invoices.jsx</code>)
              </p>
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

export default App
