import { useEffect, useMemo, useState } from 'react'
import { getTransactions } from '../api.js'

const CATEGORIES = [
  'all',
  'payroll',
  'vendor',
  'software',
  'tax',
  'misc',
  'unknown',
]

const money = (n, currency = 'GBP') =>
  new Intl.NumberFormat('en-GB', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
  }).format(n)

export function Statements({ selectedId, onSelectId }) {
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [category, setCategory] = useState('all')
  const [reload, setReload] = useState(0)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)
    getTransactions()
      .then((data) => {
        if (!cancelled) setRows(Array.isArray(data) ? data : [])
      })
      .catch(() => {
        if (!cancelled) setError('Could not load transactions.')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [reload])

  const filtered = useMemo(() => {
    if (category === 'all') return rows
    return rows.filter((r) => r.category === category)
  }, [rows, category])

  return (
    <div className="stmt">
      <div className="stmt-toolbar">
        <label className="stmt-filter-label" htmlFor="stmt-category">
          Category
        </label>
        <select
          id="stmt-category"
          className="stmt-select"
          value={category}
          onChange={(e) => setCategory(e.target.value)}
        >
          {CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
        <button
          type="button"
          className="stmt-refresh"
          onClick={() => setReload((n) => n + 1)}
        >
          Refresh
        </button>
      </div>

      {loading && (
        <p className="stmt-msg" role="status">
          Loading…
        </p>
      )}
      {error && (
        <p className="stmt-msg stmt-msg--err" role="alert">
          {error}
        </p>
      )}
      {!loading && !error && filtered.length === 0 && (
        <p className="stmt-msg">No transactions match this filter.</p>
      )}
      {!loading && !error && filtered.length > 0 && (
        <div className="stmt-table-wrap">
          <table className="stmt-table">
            <thead>
              <tr>
                <th scope="col">Date</th>
                <th scope="col">Description</th>
                <th scope="col">Category</th>
                <th scope="col" className="stmt-col-num">
                  Amount
                </th>
                <th scope="col" className="stmt-col-conf">
                  Conf.
                </th>
                <th scope="col" className="stmt-col-flag" aria-label="Review" />
              </tr>
            </thead>
            <tbody>
              {filtered.map((txn) => {
                const isSel = txn.id === selectedId
                const out = txn.amount < 0
                return (
                  <tr
                    key={txn.id}
                    className={
                      'stmt-row' + (isSel ? ' stmt-row--selected' : '')
                    }
                    onClick={() => onSelectId(txn.id)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault()
                        onSelectId(txn.id)
                      }
                    }}
                    tabIndex={0}
                    role="button"
                    aria-pressed={isSel}
                  >
                    <td className="stmt-td stmt-td--date">{txn.date}</td>
                    <td className="stmt-td">{txn.description}</td>
                    <td className="stmt-td">
                      <span className="stmt-cat">{txn.category}</span>
                    </td>
                    <td
                      className={
                        'stmt-td stmt-col-num ' +
                        (out ? 'stmt-amount--out' : 'stmt-amount--in')
                      }
                    >
                      {money(txn.amount, txn.currency)}
                    </td>
                    <td className="stmt-td stmt-col-conf">
                      {typeof txn.confidence === 'number'
                        ? `${Math.round(txn.confidence * 100)}%`
                        : '—'}
                    </td>
                    <td className="stmt-td stmt-col-flag">
                      {txn.review_flag ? (
                        <span className="stmt-review" title="Needs review">
                          !
                        </span>
                      ) : (
                        ''
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
