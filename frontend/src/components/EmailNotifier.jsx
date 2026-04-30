import { useEffect, useRef, useState } from 'react'
import {
  getTransaction,
  pollEmails,
  resetEmailProcessing,
  startEmailProcessing,
} from '../api.js'

const MAX_VISIBLE = 5
const INSIGHT_POLL_INTERVAL_MS = 2000
const INSIGHT_POLL_MAX_ATTEMPTS = 20

const fmtMoney = (amount, currency = 'GBP') => {
  const n = Number(amount)
  if (!Number.isFinite(n)) return `${currency} ?`
  return new Intl.NumberFormat('en-GB', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
  }).format(n)
}

function EmailPopup({ entry, onDismiss }) {
  const [insight, setInsight] = useState(null)
  const [insightStatus, setInsightStatus] = useState(
    entry.email.agent_review_status || 'skipped'
  )

  const txnId = entry.email.injected_transaction_id

  useEffect(() => {
    if (!txnId) return undefined
    if (insightStatus !== 'pending') return undefined
    if (insight) return undefined

    let cancelled = false
    let attempts = 0

    const tick = async () => {
      if (cancelled) return
      attempts += 1
      try {
        const t = await getTransaction(txnId)
        if (cancelled) return
        if (t && t.agent_insight) {
          setInsight(t.agent_insight)
          setInsightStatus('done')
          return
        }
      } catch {
        // ignore — keep polling
      }
      if (attempts >= INSIGHT_POLL_MAX_ATTEMPTS) {
        setInsightStatus('timeout')
      }
    }

    tick()
    const id = setInterval(tick, INSIGHT_POLL_INTERVAL_MS)
    return () => {
      cancelled = true
      clearInterval(id)
    }
  }, [txnId, insightStatus, insight])

  const r = entry.email.receipt
  const concern = insight?.concern_level
  const concernClass =
    concern === 'high'
      ? 'email-popup__concern email-popup__concern--high'
      : concern === 'medium'
        ? 'email-popup__concern email-popup__concern--med'
        : 'email-popup__concern email-popup__concern--low'

  return (
    <div className="email-popup glass" role="alert">
      <button
        type="button"
        className="email-popup__x"
        aria-label="Dismiss"
        onClick={onDismiss}
      >
        ×
      </button>
      <div className="email-popup__from">
        {entry.email.from || '(no sender)'}
      </div>
      <div className="email-popup__subj">
        {entry.email.subject || '(no subject)'}
      </div>
      {r ? (
        <div className="email-popup__receipt">
          <div className="email-popup__merchant">
            {r.merchant ?? r.vendor ?? '(unknown merchant)'}
          </div>
          <div className="email-popup__total">
            {fmtMoney(r.total, r.currency)}
          </div>
          {Array.isArray(r.items) && r.items.length > 0 && (
            <div className="email-popup__items">
              {r.items.length} item{r.items.length === 1 ? '' : 's'}
              {r.expense_category ? ` · ${r.expense_category}` : ''}
            </div>
          )}
          {txnId && (
            <div className="email-popup__injected">
              → injected {txnId}
            </div>
          )}
        </div>
      ) : (
        <div className="email-popup__body">
          {entry.email.body_excerpt || '(empty body)'}
        </div>
      )}

      {insightStatus === 'pending' && (
        <div className="email-popup__agent email-popup__agent--pending">
          <span className="email-popup__agent-spin" aria-hidden />
          AutoCFO agent reviewing…
        </div>
      )}
      {insightStatus === 'timeout' && (
        <div className="email-popup__agent email-popup__agent--err">
          Agent review timed out — open the transaction for details.
        </div>
      )}
      {insightStatus === 'skipped' && txnId && (
        <div className="email-popup__agent email-popup__agent--skipped">
          Cursor SDK offline — classified by rules only.
        </div>
      )}
      {insight && (
        <div className="email-popup__agent">
          <div className="email-popup__agent-head">
            <span className={concernClass}>
              {concern ? concern.toUpperCase() : 'INFO'}
            </span>
            <span className="email-popup__agent-label">Agent take</span>
          </div>
          <p className="email-popup__agent-text">
            {insight.natural_explanation || '—'}
          </p>
          {insight.suggested_followup && (
            <p className="email-popup__agent-follow">
              → {insight.suggested_followup}
            </p>
          )}
        </div>
      )}
    </div>
  )
}

export function EmailNotifier({ onTransactionInjected }) {
  const [active, setActive] = useState(false)
  const [statusText, setStatusText] = useState(null)
  const [popups, setPopups] = useState([])
  const intervalRef = useRef(null)
  const counterRef = useRef(0)
  const onInjectedRef = useRef(onTransactionInjected)

  useEffect(() => {
    onInjectedRef.current = onTransactionInjected
  }, [onTransactionInjected])

  useEffect(() => {
    if (!active) return undefined
    let cancelled = false

    setStatusText('priming…')
    startEmailProcessing()
      .then((r) => {
        if (cancelled) return
        if (r?.ok === false || r?.error) {
          setStatusText(`error: ${r.error ?? 'unknown'}`)
        } else {
          setStatusText(`watching (${r?.primed_count ?? 0} primed)`)
        }
      })
      .catch((e) => {
        if (!cancelled) setStatusText(`error: ${e.message}`)
      })

    intervalRef.current = setInterval(async () => {
      try {
        const r = await pollEmails()
        if (cancelled) return
        if (r?.error) {
          setStatusText(`poll error: ${r.error}`)
          return
        }
        const fresh = r?.emails ?? []
        if (fresh.length > 0) {
          setStatusText(`watching · last batch: ${fresh.length}`)
          setPopups((prev) => {
            const next = [...prev]
            for (const em of fresh) {
              counterRef.current += 1
              next.push({ key: counterRef.current, email: em })
              if (em.injected_transaction_id) {
                onInjectedRef.current?.(em.injected_transaction_id)
              }
            }
            return next.slice(-MAX_VISIBLE)
          })
        }
      } catch (e) {
        if (!cancelled) setStatusText(`poll error: ${e.message}`)
      }
    }, 1000)

    return () => {
      cancelled = true
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }
    }
  }, [active])

  const toggle = async () => {
    if (active) {
      setActive(false)
      setStatusText('stopped')
      try {
        await resetEmailProcessing()
      } catch {
        // ignore
      }
    } else {
      setActive(true)
    }
  }

  const dismiss = (key) =>
    setPopups((prev) => prev.filter((p) => p.key !== key))

  return (
    <>
      <div className="email-notifier">
        <button
          type="button"
          className={
            'email-notifier__btn ' +
            (active ? 'email-notifier__btn--on' : '')
          }
          onClick={toggle}
          aria-pressed={active}
        >
          <span className="email-notifier__dot" aria-hidden />
          {active ? 'Stop processing emails' : 'Process emails'}
        </button>
        {statusText && (
          <span className="email-notifier__status">{statusText}</span>
        )}
      </div>
      <div
        className="email-popups"
        role="region"
        aria-label="Incoming email notifications"
      >
        {popups.map((p) => (
          <EmailPopup key={p.key} entry={p} onDismiss={() => dismiss(p.key)} />
        ))}
      </div>
    </>
  )
}
