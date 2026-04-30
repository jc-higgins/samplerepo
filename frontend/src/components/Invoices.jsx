import { useEffect, useState } from 'react'
import { getInvoices } from '../api.js'

const money = (n, currency = 'GBP') =>
  new Intl.NumberFormat('en-GB', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
  }).format(n)

const BADGE_CLASS = {
  LEGIT: 'inv-badge inv-badge--legit',
  SUSPICIOUS: 'inv-badge inv-badge--susp',
  UNKNOWN: 'inv-badge inv-badge--unk',
}

export function Invoices({ selectedInvoiceId, onSelectInvoice }) {
  const [list, setList] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [expandedId, setExpandedId] = useState(null)
  const [presentId, setPresentId] = useState(null)
  const [reload, setReload] = useState(0)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)
    getInvoices()
      .then((data) => {
        if (!cancelled) setList(Array.isArray(data) ? data : [])
      })
      .catch(() => {
        if (!cancelled) setError('Could not load invoices.')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [reload])

  const presented = presentId ? list.find((i) => i.id === presentId) : null

  return (
    <div className="inv">
      <div className="inv-toolbar">
        <button
          type="button"
          className="inv-refresh"
          onClick={() => setReload((n) => n + 1)}
        >
          Refresh
        </button>
      </div>
      {loading && (
        <p className="inv-msg" role="status">
          Loading…
        </p>
      )}
      {error && (
        <p className="inv-msg inv-msg--err" role="alert">
          {error}
        </p>
      )}
      {!loading && !error && list.length === 0 && (
        <p className="inv-msg">No invoices yet.</p>
      )}
      <ul className="inv-list">
        {list.map((inv) => {
          const v = inv.verification ?? {}
          const decision = v.decision ?? 'UNKNOWN'
          const expanded = expandedId === inv.id
          const sel = inv.id === selectedInvoiceId
          return (
            <li
              key={inv.id}
              className={'inv-card' + (sel ? ' inv-card--selected' : '')}
            >
              <button
                type="button"
                className="inv-card__main"
                onClick={() => {
                  onSelectInvoice(inv.id)
                  setExpandedId(expanded ? null : inv.id)
                }}
              >
                <span className={BADGE_CLASS[decision] ?? BADGE_CLASS.UNKNOWN}>
                  {decision}
                </span>
                <span className="inv-card__mid">
                  <span className="inv-card__row-top">
                    <span className="inv-card__vendor">{inv.vendor}</span>
                    <span className="inv-card__amt">
                      {money(inv.amount, inv.currency)}
                    </span>
                  </span>
                  <span className="inv-card__row-bot">
                    <span className="inv-card__pill">{inv.channel}</span>
                    <span className="inv-card__due">Due {inv.due_date}</span>
                  </span>
                </span>
              </button>
              <div className="inv-card__actions">
                <button
                  type="button"
                  className="inv-doc-btn"
                  onClick={(e) => {
                    e.stopPropagation()
                    onSelectInvoice(inv.id)
                    setPresentId(inv.id)
                  }}
                >
                  Present invoice
                </button>
              </div>
              {expanded && (
                <div className="inv-expand">
                  {Array.isArray(v.evidence) && v.evidence.length > 0 && (
                    <div className="inv-block">
                      <h4 className="inv-block__h">Evidence</h4>
                      <ul className="inv-bullets">
                        {v.evidence.map((line, i) => (
                          <li key={i}>{line}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {Array.isArray(v.risk_flags) && v.risk_flags.length > 0 && (
                    <div className="inv-block">
                      <h4 className="inv-block__h">Risk flags</h4>
                      <div className="inv-risk-row">
                        {v.risk_flags.map((rf, i) => (
                          <span key={i} className="inv-risk-pill">
                            {rf}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                  {v.rationale && (
                    <div className="inv-block">
                      <h4 className="inv-block__h">Rationale</h4>
                      <p className="inv-rationale">{v.rationale}</p>
                    </div>
                  )}
                  {typeof v.confidence === 'number' && (
                    <div className="inv-conf">
                      <span className="inv-conf-label">Model confidence</span>
                      <div
                        className="detail-conf-track"
                        role="progressbar"
                        aria-valuenow={Math.round(v.confidence * 100)}
                        aria-valuemin={0}
                        aria-valuemax={100}
                      >
                        <div
                          className="detail-conf-fill"
                          style={{
                            width: `${Math.round(v.confidence * 100)}%`,
                          }}
                        />
                      </div>
                      <span className="inv-conf-pct">
                        {Math.round(v.confidence * 100)}%
                      </span>
                    </div>
                  )}
                </div>
              )}
            </li>
          )
        })}
      </ul>

      {presented && (
        <div
          className="inv-overlay"
          role="dialog"
          aria-modal="true"
          aria-labelledby="inv-doc-title"
        >
          <div className="inv-overlay__backdrop" onClick={() => setPresentId(null)} />
          <div className="inv-doc">
            <header className="inv-doc__head">
              <div>
                <p className="inv-doc__kicker">Payable — presentation</p>
                <h3 id="inv-doc-title" className="inv-doc__title">
                  {presented.vendor}
                </h3>
              </div>
              <button
                type="button"
                className="inv-doc__close"
                onClick={() => setPresentId(null)}
              >
                Close
              </button>
            </header>
            <dl className="inv-doc__grid">
              <dt>Amount</dt>
              <dd>{money(presented.amount, presented.currency)}</dd>
              <dt>Due</dt>
              <dd>{presented.due_date}</dd>
              <dt>Channel</dt>
              <dd>{presented.channel}</dd>
              <dt>From</dt>
              <dd>{presented.sender}</dd>
              <dt>Bank details</dt>
              <dd className="inv-doc__mono">{presented.account_details}</dd>
            </dl>
            <section className="inv-doc__body">
              <h4 className="inv-doc__h">Message excerpt</h4>
              <blockquote className="inv-doc__quote">
                {presented.thread_excerpt}
              </blockquote>
            </section>
            <footer className="inv-doc__foot">
              <span className={BADGE_CLASS[presented.verification?.decision] ?? BADGE_CLASS.UNKNOWN}>
                {presented.verification?.decision ?? 'UNKNOWN'}
              </span>
              <span className="inv-doc__hint">
                Use Investigate below to compare this document to a bank line.
              </span>
            </footer>
          </div>
        </div>
      )}
    </div>
  )
}
