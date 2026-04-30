import { useEffect, useRef, useState } from 'react'
import {
  pollEmails,
  resetEmailProcessing,
  startEmailProcessing,
} from '../api.js'

const MAX_VISIBLE = 5

const fmtMoney = (amount, currency = 'GBP') => {
  const n = Number(amount)
  if (!Number.isFinite(n)) return `${currency} ?`
  return new Intl.NumberFormat('en-GB', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
  }).format(n)
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
        {popups.map((p) => {
          const r = p.email.receipt
          return (
            <div key={p.key} className="email-popup glass" role="alert">
              <button
                type="button"
                className="email-popup__x"
                aria-label="Dismiss"
                onClick={() => dismiss(p.key)}
              >
                ×
              </button>
              <div className="email-popup__from">{p.email.from || '(no sender)'}</div>
              <div className="email-popup__subj">
                {p.email.subject || '(no subject)'}
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
                  {p.email.injected_transaction_id && (
                    <div className="email-popup__injected">
                      → injected {p.email.injected_transaction_id}
                    </div>
                  )}
                </div>
              ) : (
                <div className="email-popup__body">
                  {p.email.body_excerpt || '(empty body)'}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </>
  )
}
