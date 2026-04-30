import { useEffect, useMemo, useState } from 'react'
import { getTransactions } from '../api.js'

const money = (n, currency = 'GBP') =>
  new Intl.NumberFormat('en-GB', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
  }).format(n)

const CLOUD_META = {
  aws: {
    title: 'AWS',
    subtitle: 'Cost center: compute & data',
  },
  gcp: {
    title: 'GCP',
    subtitle: 'Cost center: Kubernetes & analytics',
  },
}

export function CloudCostSnapshot({ onOpenTransaction }) {
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    getTransactions()
      .then((data) => {
        if (!cancelled) setRows(Array.isArray(data) ? data : [])
      })
      .catch(() => {
        if (!cancelled) setRows([])
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [])

  const byCloud = useMemo(() => {
    const latest = { aws: null, gcp: null }
    for (const t of rows) {
      const src = t.enrichment?.source
      if (src !== 'aws' && src !== 'gcp') continue
      const cur = latest[src]
      if (!cur || t.date > cur.date) latest[src] = t
    }
    return latest
  }, [rows])

  if (loading) {
    return (
      <div className="cloud-snap">
        <h2 id="cloud-snap-h" className="dash-panel__h">
          Cloud cost centers
        </h2>
        <p className="cloud-snap__msg">Loading…</p>
      </div>
    )
  }

  return (
    <div className="cloud-snap">
      <h2 id="cloud-snap-h" className="dash-panel__h">
        Cloud cost centers
      </h2>
      <p className="cloud-snap__lede">
        Example split across the two hyperscalers you see on the bank feed —
        drill into line items from Statements.
      </p>
      <div className="cloud-snap__grid">
        {['aws', 'gcp'].map((key) => {
          const txn = byCloud[key]
          const meta = CLOUD_META[key]
          if (!txn) {
            return (
              <div key={key} className="cloud-card cloud-card--empty">
                <h3 className="cloud-card__h">{meta.title}</h3>
                <p className="cloud-card__muted">No enriched bill in feed.</p>
              </div>
            )
          }
          const topLines = (txn.enrichment?.line_items ?? []).slice(0, 3)
          return (
            <div key={key} className="cloud-card">
              <div className="cloud-card__head">
                <h3 className="cloud-card__h">{meta.title}</h3>
                <p className="cloud-card__sub">{meta.subtitle}</p>
              </div>
              <p className="cloud-card__amount">{money(txn.amount, txn.currency)}</p>
              <p className="cloud-card__meta">
                <span className="cloud-card__date">{txn.date}</span>
                <span className="cloud-card__sep">·</span>
                <span>{txn.description}</span>
              </p>
              {topLines.length > 0 && (
                <ul className="cloud-card__lines">
                  {topLines.map((line, i) => (
                    <li key={`${line.label}-${i}`}>
                      <span>{line.label}</span>
                      <span className="cloud-card__line-amt">
                        {money(line.amount, txn.currency)}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
              <button
                type="button"
                className="cloud-card__cta"
                onClick={() => onOpenTransaction(txn.id)}
              >
                Open in Statements
              </button>
            </div>
          )
        })}
      </div>
    </div>
  )
}
