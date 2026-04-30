import { useCallback, useEffect, useState } from 'react'
import { approveAction, getActions, getForecast } from '../api.js'
import { CashflowChart } from './CashflowChart.jsx'

const money = (n, currency = 'GBP') =>
  new Intl.NumberFormat('en-GB', {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(n)

export function ActionsAndCashflow({ onCashflowChanged }) {
  const [actions, setActions] = useState([])
  const [forecast, setForecast] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [busyId, setBusyId] = useState(null)

  const load = useCallback(() => {
    setError(null)
    return Promise.all([getActions(), getForecast()])
      .then(([a, f]) => {
        setActions(Array.isArray(a) ? a : [])
        setForecast(Array.isArray(f) ? f : [])
      })
      .catch(() => {
        setError('Could not load actions or forecast.')
      })
  }, [])

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    load().finally(() => {
      if (!cancelled) setLoading(false)
    })
    return () => {
      cancelled = true
    }
  }, [load])

  function handleApprove(id) {
    setBusyId(id)
    approveAction(id)
      .then(() => load())
      .then(() => {
        onCashflowChanged?.()
      })
      .finally(() => {
        setBusyId(null)
      })
  }

  if (loading) {
    return (
      <p className="act-cf__msg" role="status">
        Loading actions and forecast…
      </p>
    )
  }

  if (error) {
    return (
      <p className="act-cf__msg act-cf__msg--err" role="alert">
        {error}
      </p>
    )
  }

  return (
    <div className="act-cf">
      <ul className="act-cf__list">
        {actions.map((act) => {
          const conf =
            typeof act.confidence === 'number'
              ? Math.round(act.confidence * 100)
              : 0
          const human = act.execution_mode === 'HUMAN_APPROVAL'
          const approved = act.executed === true
          const showApprove = human && !approved

          return (
            <li key={act.id} className="act-card">
              <div className="act-card__head">
                <h3 className="act-card__title">{act.title}</h3>
                {!human && (
                  <span className="act-card__tag act-card__tag--auto">Auto</span>
                )}
                {human && approved && (
                  <span className="act-card__tag act-card__tag--done">
                    Approved
                  </span>
                )}
              </div>
              <p className="act-card__rec">{act.recommended_action}</p>
              <div className="act-card__row">
                <span className="act-card__impact">
                  Impact ~{money(act.expected_cash_impact)}
                </span>
                <span className="act-card__conf-label">Confidence</span>
                <div
                  className="detail-conf-track act-card__conf-track"
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
                <span className="act-card__conf-pct">{conf}%</span>
              </div>
              <p className="act-card__why">{act.rationale}</p>
              {showApprove && (
                <button
                  type="button"
                  className="act-card__approve"
                  disabled={busyId === act.id}
                  onClick={() => handleApprove(act.id)}
                >
                  {busyId === act.id ? 'Approving…' : 'Approve'}
                </button>
              )}
            </li>
          )
        })}
      </ul>
      {actions.length === 0 && (
        <p className="act-cf__msg">No recommended actions right now.</p>
      )}
      <CashflowChart points={forecast} />
    </div>
  )
}
