import { useEffect, useState } from 'react'
import { getTransaction } from '../api.js'
import { InvestigationChat } from './InvestigationChat.jsx'

export function FloatingStatementChat({ transactionId, invoiceId }) {
  const [open, setOpen] = useState(false)
  const [peek, setPeek] = useState(null)

  useEffect(() => {
    if (!transactionId) {
      setPeek(null)
      return
    }
    let cancelled = false
    getTransaction(transactionId)
      .then((data) => {
        if (!cancelled) setPeek(data)
      })
      .catch(() => {
        if (!cancelled) setPeek(null)
      })
    return () => {
      cancelled = true
    }
  }, [transactionId])

  const ctxLine = !transactionId
    ? 'No statement row selected — click a line in Statements.'
    : peek
      ? `${peek.description} · ${peek.date}`
      : 'Loading line…'

  return (
    <div className="float-chat" aria-live="polite">
      {!open && (
        <button
          type="button"
          className="float-chat__fab"
          onClick={() => setOpen(true)}
          aria-expanded={false}
          aria-controls="float-chat-panel"
        >
          <span className="float-chat__fab-icon" aria-hidden>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
              <path
                d="M12 3c-4.97 0-9 3.58-9 8 0 2.03.88 3.89 2.37 5.33L4 21l4.97-1.29C10.35 20.54 11.16 20.66 12 20.66c4.97 0 9-3.58 9-8s-4.03-8-9-8Z"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinejoin="round"
              />
              <path
                d="M8.5 12.5h.01M12 12.5h.01M15.5 12.5h.01"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              />
            </svg>
          </span>
          <span className="float-chat__fab-label">
            Assistant
            {transactionId ? (
              <span className="float-chat__fab-dot" title="Statement in context" />
            ) : null}
          </span>
        </button>
      )}
      {open && (
        <div
          id="float-chat-panel"
          className="float-chat__panel"
          role="dialog"
          aria-label="Statement assistant"
        >
          <div className="float-chat__head">
            <div className="float-chat__titles">
              <p className="float-chat__kicker">Rule-based demo</p>
              <h2 className="float-chat__h">Statement assistant</h2>
              <p className="float-chat__ctx-line" title={ctxLine}>
                {ctxLine}
              </p>
            </div>
            <button
              type="button"
              className="float-chat__min"
              onClick={() => setOpen(false)}
              aria-label="Minimize assistant"
            >
              −
            </button>
          </div>
          <InvestigationChat
            transactionId={transactionId}
            invoiceId={invoiceId}
            hideContextBar
            className="float-chat__inv-chat"
          />
        </div>
      )}
    </div>
  )
}
