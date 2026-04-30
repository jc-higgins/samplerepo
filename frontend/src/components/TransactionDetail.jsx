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
      <p className="detail-empty">
        Select a row in Statements to view counterparty, explanation, and line
        items.
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

  return (
    <div className="detail-body">
      {waste && (
        <div className="detail-waste" role="status">
          {waste}
        </div>
      )}

      <dl className="detail-grid">
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
