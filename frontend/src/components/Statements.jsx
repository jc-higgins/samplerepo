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

const DETAIL_SECTION_ID = 'dash-section-detail'

function scrollToTransactionDetail() {
  document.getElementById(DETAIL_SECTION_ID)?.scrollIntoView({
    behavior: 'smooth',
    block: 'start',
  })
}

export function Statements({
  selectedId,
  onSelectId,
  reloadKey = 0,
  accountIds = null,
  productTag = '',
}) {
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [category, setCategory] = useState('all')
  const [reload, setReload] = useState(0)

  const scopeKey =
    (accountIds === null ? '' : accountIds.join(',')) +
    '|' +
    (productTag || '')

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)
    const txOpts = {}
    if (accountIds !== null && accountIds.length > 0) {
      txOpts.accounts = accountIds
    }
    if (productTag && String(productTag).trim()) {
      txOpts.tag = String(productTag).trim()
    }
    getTransactions(txOpts)
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
  }, [reload, reloadKey, scopeKey])

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
          onChange={(e) => {
            setCategory(e.target.value)
            scrollToTransactionDetail()
          }}
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
          onClick={() => {
            setReload((n) => n + 1)
            scrollToTransactionDetail()
          }}
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
                <th scope="col" className="stmt-col-acct">
                  Account
                </th>
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
                const selectRow = () => {
                  onSelectId(txn.id)
                  scrollToTransactionDetail()
                }
                return (
                  <tr
                    key={txn.id}
                    className={
                      'stmt-row' + (isSel ? ' stmt-row--selected' : '')
                    }
                    onClick={selectRow}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault()
                        selectRow()
                      }
                    }}
                    tabIndex={0}
                    role="button"
                    aria-pressed={isSel}
                  >
                    <td className="stmt-td stmt-td--date">{txn.date}</td>
                    <td className="stmt-td">{txn.description}</td>
                    <td className="stmt-td stmt-col-acct">
                      <span className="stmt-acct" title={txn.account_label}>
                        {txn.account_label ?? txn.account_id ?? '—'}
                      </span>
                    </td>
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
