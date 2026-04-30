import { useEffect, useState } from 'react'
import { getTransaction } from '../api.js'

const money = (n, currency = 'GBP') =>
  new Intl.NumberFormat('en-GB', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
  }).format(n)

export function TransactionDetail({ transactionId }) {
  const [txn, setTxn] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!transactionId) {
      setTxn(null)
      setError(null)
      return
    }
    let cancelled = false
    setLoading(true)
    setError(null)
    getTransaction(transactionId)
      .then((data) => {
        if (!cancelled) setTxn(data)
      })
      .catch(() => {
        if (!cancelled) setError('Could not load transaction.')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [transactionId])

  if (!transactionId) {
    return (
      <p className="detail-empty" id="detail-breakdown-empty">
        Select a transaction in the table above to open the breakdown:
        counterparty, tags, explanation, and line items.
      </p>
    )
  }

  if (loading) {
    return (
      <p className="detail-empty" role="status">
        Loading detail…
      </p>
    )
  }

  if (error) {
    return (
      <p className="detail-empty detail-empty--err" role="alert">
        {error}
      </p>
    )
  }

  if (!txn) return null

  const conf =
    typeof txn.confidence === 'number' ? Math.round(txn.confidence * 100) : 0
  const items = txn.enrichment?.line_items
  const waste = txn.enrichment?.waste_flag
  const src = txn.enrichment?.source

  return (
    <div className="detail-body">
      {waste && (
        <div className="detail-waste" role="status">
          {waste}
        </div>
      )}

      {src && (
        <p className="detail-source">
          <span className="detail-source__pill">{String(src).toUpperCase()}</span>
          Enriched vendor breakdown
        </p>
      )}

      <dl className="detail-grid">
        <dt className="detail-dt">Account</dt>
        <dd className="detail-dd">
          {txn.account_label ?? txn.account_id ?? '—'}
        </dd>
        <dt className="detail-dt">Counterparty</dt>
        <dd className="detail-dd">{txn.counterparty ?? '—'}</dd>
        <dt className="detail-dt">Description</dt>
        <dd className="detail-dd">{txn.description}</dd>
        <dt className="detail-dt">Amount</dt>
        <dd
          className={
            'detail-dd ' +
            (txn.amount < 0 ? 'stmt-amount--out' : 'stmt-amount--in')
          }
        >
          {money(txn.amount, txn.currency)}
        </dd>
      </dl>

      {txn.specter && (
        <section className="detail-section" aria-labelledby="detail-specter">
          <h3 id="detail-specter" className="detail-section-h">
            Specter
          </h3>
          <p className="detail-expl">
            <strong>{txn.specter.organization_name ?? '—'}</strong>
            {txn.specter.last_updated && (
              <span className="detail-specter-meta">
                {' '}
                · updated {txn.specter.last_updated}
              </span>
            )}
          </p>
          {(txn.specter.tagline || txn.specter.description) && (
            <p className="detail-expl detail-specter-blurb">
              {txn.specter.tagline || txn.specter.description}
            </p>
          )}
        </section>
      )}

      <section className="detail-section" aria-labelledby="detail-expl">
        <h3 id="detail-expl" className="detail-section-h">
          Explanation
        </h3>
        <p className="detail-expl">{txn.explanation ?? '—'}</p>
      </section>

      <div className="detail-conf">
        <span className="detail-conf-label">Confidence</span>
        <div
          className="detail-conf-track"
          role="progressbar"
          aria-valuenow={conf}
          aria-valuemin={0}
          aria-valuemax={100}
        >
          <div
            className="detail-conf-fill"
            style={{ width: `${conf}%` }}
          />
        </div>
        <span className="detail-conf-pct">{conf}%</span>
      </div>

      {txn.anomaly_reason && (
        <p className="detail-anomaly">
          <span className="detail-anomaly-pill">Anomaly</span>
          {txn.anomaly_reason}
        </p>
      )}

      {txn.agent_insight && (
        <section className="detail-section" aria-labelledby="detail-agent">
          <h3 id="detail-agent" className="detail-section-h">
            Live agent review
          </h3>
          <div className="detail-agent-head">
            <span
              className={
                'detail-agent-pill ' +
                (txn.agent_insight.concern_level === 'high'
                  ? 'detail-agent-pill--high'
                  : txn.agent_insight.concern_level === 'medium'
                    ? 'detail-agent-pill--med'
                    : 'detail-agent-pill--low')
              }
            >
              {(txn.agent_insight.concern_level ?? 'info').toUpperCase()}
            </span>
            {txn.agent_insight.agrees_with_rule_engine === false && (
              <span className="detail-agent-disagree">
                disagrees with rule engine
              </span>
            )}
          </div>
          <p className="detail-expl">
            {txn.agent_insight.natural_explanation ?? '—'}
          </p>
          {txn.agent_insight.concern_reason && (
            <p className="detail-agent-reason">
              {txn.agent_insight.concern_reason}
            </p>
          )}
          {txn.agent_insight.suggested_followup && (
            <p className="detail-agent-follow">
              → {txn.agent_insight.suggested_followup}
            </p>
          )}
        </section>
      )}

      {Array.isArray(txn.tags) && txn.tags.length > 0 && (
        <section className="detail-section" aria-labelledby="detail-tags">
          <h3 id="detail-tags" className="detail-section-h">
            Tags
          </h3>
          <p className="detail-tags-lede">
            Product / scope labels for this line (not shown in the statement
            table).
          </p>
          <div className="detail-tags">
            {txn.tags.map((t) => (
              <span key={t} className="stmt-tag">
                {t}
              </span>
            ))}
          </div>
        </section>
      )}

      {Array.isArray(items) && items.length > 0 && (
        <section className="detail-section" aria-labelledby="detail-lines">
          <h3 id="detail-lines" className="detail-section-h">
            Line items
          </h3>
          <div className="detail-lines-wrap">
            <table className="detail-lines">
              <thead>
                <tr>
                  <th scope="col">Label</th>
                  <th scope="col" className="detail-lines-num">
                    Amount
                  </th>
                  <th scope="col">Note</th>
                </tr>
              </thead>
              <tbody>
                {items.map((line, i) => (
                  <tr key={`${line.label}-${i}`}>
                    <td>{line.label}</td>
                    <td className="detail-lines-num">
                      {money(line.amount, txn.currency)}
                    </td>
                    <td className="detail-lines-note">{line.note ?? '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  )
}
