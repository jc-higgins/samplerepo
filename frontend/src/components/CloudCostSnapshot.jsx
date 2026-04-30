import { useEffect, useMemo, useState } from 'react'
import { getCloudCostSummary, getTransactions } from '../api.js'

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

function TrendSpark({ amounts }) {
  if (!amounts || amounts.length < 2) return null
  const w = 120
  const h = 36
  const pad = 4
  const vals = amounts.map((a) => Number(a))
  const lo = Math.min(...vals)
  const hi = Math.max(...vals)
  const sp = hi - lo || 1
  const n = vals.length - 1
  const pts = vals
    .map((v, i) => {
      const x = pad + (i / n) * (w - 2 * pad)
      const y = h - pad - ((v - lo) / sp) * (h - 2 * pad)
      return `${x.toFixed(1)},${y.toFixed(1)}`
    })
    .join(' ')

  return (
    <svg
      className="cloud-card__spark"
      viewBox={`0 0 ${w} ${h}`}
      preserveAspectRatio="none"
      aria-hidden
    >
      <polyline
        className="cloud-card__spark-line"
        fill="none"
        strokeWidth="1.5"
        points={pts}
      />
    </svg>
  )
}

export function CloudCostSnapshot({
  onOpenTransaction,
  accountIds = null,
  productTag = '',
}) {
  const [rows, setRows] = useState([])
  const [costApi, setCostApi] = useState(null)
  const [loading, setLoading] = useState(true)
  const [reload, setReload] = useState(0)

  const scopeKey =
    (accountIds === null ? '' : accountIds.join(',')) +
    '|' +
    (productTag || '')

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    const txOpts = {}
    if (accountIds !== null && accountIds.length > 0) {
      txOpts.accounts = accountIds
    }
    if (productTag && String(productTag).trim()) {
      txOpts.tag = String(productTag).trim()
    }
    Promise.all([
      getTransactions(txOpts),
      getCloudCostSummary(txOpts),
    ])
      .then(([txns, summary]) => {
        if (!cancelled) {
          setRows(Array.isArray(txns) ? txns : [])
          setCostApi(summary && typeof summary === 'object' ? summary : null)
        }
      })
      .catch(() => {
        if (!cancelled) {
          setRows([])
          setCostApi(null)
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [reload, scopeKey])

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

  const providers = costApi?.providers ?? {}

  return (
    <div className="cloud-snap">
      <div className="cloud-snap__head">
        <h2 id="cloud-snap-h" className="dash-panel__h cloud-snap__h">
          Cloud cost centers
        </h2>
        <button
          type="button"
          className="cloud-snap__refresh"
          onClick={() => setReload((n) => n + 1)}
        >
          Refresh
        </button>
      </div>
      <p className="cloud-snap__lede">
        Latest enriched bills on the feed — trend from mock periods in the API.
        Open a row in Statements for full line items.
      </p>
      <div className="cloud-snap__grid">
        {['aws', 'gcp'].map((key) => {
          const txn = byCloud[key]
          const meta = CLOUD_META[key]
          const rollup = providers[key]
          const histAmounts =
            rollup?.history?.map((h) => h.amount) ?? []

          if (!txn) {
            return (
              <div
                key={key}
                className={`cloud-card cloud-card--empty cloud-card--${key}`}
              >
                <h3 className="cloud-card__h">{meta.title}</h3>
                <p className="cloud-card__muted">No enriched bill in feed.</p>
              </div>
            )
          }
          const topLines = (txn.enrichment?.line_items ?? []).slice(0, 4)
          const mom = rollup?.mom_delta_pct
          return (
            <div key={key} className={`cloud-card cloud-card--${key}`}>
              <div className="cloud-card__head">
                <h3 className="cloud-card__h">{meta.title}</h3>
                <p className="cloud-card__sub">{meta.subtitle}</p>
              </div>
              {histAmounts.length >= 2 && (
                <div className="cloud-card__trend">
                  <TrendSpark amounts={histAmounts} />
                  {typeof mom === 'number' && (
                    <span
                      className={
                        'cloud-card__mom ' +
                        (mom > 0
                          ? 'cloud-card__mom--up'
                          : mom < 0
                            ? 'cloud-card__mom--down'
                            : '')
                      }
                    >
                      {mom > 0 ? '+' : ''}
                      {mom}% vs prior period
                    </span>
                  )}
                </div>
              )}
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
