import { useEffect, useMemo, useRef, useState } from 'react'
import { getInvoice, getTransaction } from '../api.js'

const money = (n, currency = 'GBP') =>
  new Intl.NumberFormat('en-GB', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
  }).format(n)

function buildReply(text, ctx) {
  const q = text.toLowerCase()
  if (!ctx.txn && !ctx.inv) {
    return 'Select a statement line in Statements. I’ll answer from that row (demo rules, no live model). Optionally pick an invoice to compare payables.'
  }
  if (!ctx.txn) {
    return 'Select a statement row first — the assistant uses that line as context.'
  }

  if (!ctx.inv) {
    if (q.includes('summary') || q.includes('context') || q.includes('what do you') || q.includes('this line')) {
      return (
        `Statement: ${ctx.txn.description} — ${money(ctx.txn.amount, ctx.txn.currency)} on ${ctx.txn.date}. ` +
        `Category: ${ctx.txn.category ?? 'n/a'}. Counterparty: ${ctx.txn.counterparty ?? 'n/a'}.`
      )
    }
    if (q.includes('unusual') || q.includes('anomaly') || q.includes('strange')) {
      return (
        ctx.txn.review_flag
          ? 'This line is flagged for review in the demo data — check the detail panel for rationale.'
          : 'No demo flag on this line; still compare to typical monthly pattern for this counterparty.'
      )
    }
    if (q.includes('tax') || q.includes('vat')) {
      return 'Demo data does not compute VAT splits — use your ledger and the original document for tax treatment.'
    }
    if (q.includes('who') || q.includes('vendor') || q.includes('counterparty')) {
      return `Counterparty on this line: ${ctx.txn.counterparty ?? 'not set'}. Narrative: ${ctx.txn.description}.`
    }
    if (q.includes('match') || q.includes('invoice') || q.includes('reconcile')) {
      return 'Pick an invoice on the right to compare amount, vendor string, and due date against this bank movement.'
    }
    return 'Try: summary of this line, who is the counterparty?, is this unusual?, or pick an invoice and ask if they match.'
  }

  if (q.includes('summary') || q.includes('context') || q.includes('what do you')) {
    return (
      `Statement: ${ctx.txn.description} — ${money(ctx.txn.amount, ctx.txn.currency)} on ${ctx.txn.date}.\n` +
      `Invoice: ${ctx.inv.vendor} — ${money(ctx.inv.amount, ctx.inv.currency)} due ${ctx.inv.due_date} (${ctx.inv.verification?.decision ?? 'n/a'}).`
    )
  }

  if (q.includes('match') || q.includes('same') || q.includes('reconcile')) {
    const sameVendor =
      ctx.txn.counterparty &&
      ctx.inv.vendor &&
      ctx.txn.counterparty.toLowerCase().includes(ctx.inv.vendor.split(' ')[0].toLowerCase())
    const amtClose =
      Math.abs(Math.abs(ctx.txn.amount) - ctx.inv.amount) < 0.02
    return (
      `Heuristic check: amount ${amtClose ? 'aligns' : 'does not align'} with the invoice total. ` +
      `Vendor string ${sameVendor ? 'partially matches' : 'may not match'} the counterparty on the bank line. ` +
      `Use the presented invoice PDF/thread to confirm reference numbers.`
    )
  }

  if (q.includes('risk') || q.includes('fraud') || q.includes('safe')) {
    const d = ctx.inv.verification?.decision
    if (d === 'LEGIT')
      return 'Verifier says LEGIT — still confirm bank details on every run.'
    if (d === 'SUSPICIOUS')
      return 'SUSPICIOUS — compare IBAN to prior payments and verify out-of-band before paying.'
    return 'UNKNOWN — treat as new supplier; collect references and dual-control approval.'
  }

  if (q.includes('cloud') || q.includes('aws') || q.includes('gcp')) {
    return (
      'Cloud charges hit the bank as aggregated bills (AWS/GCP). Invoices from SaaS vendors are separate payables. ' +
      'If you’re tying a hosting invoice to a line, match on vendor name, amount, and invoice id in the narrative.'
    )
  }

  return 'Try: summary, do these match?, risk, or cloud vs invoice — I’ll use the selected statement and invoice.'
}

export function InvestigationChat({
  transactionId,
  invoiceId,
  hideContextBar = false,
  className = '',
}) {
  const [txn, setTxn] = useState(null)
  const [inv, setInv] = useState(null)
  const [messages, setMessages] = useState(() => [
    {
      role: 'assistant',
      text: 'Ask about the selected statement line. Add an invoice to compare payables (demo assistant, rule-based).',
    },
  ])
  const [input, setInput] = useState('')
  const endRef = useRef(null)

  const suggestions = [
    {
      label: 'What is the summary?',
      scrollTo: 'dash-section-detail',
      gotoLabel: 'Detail',
    },
    {
      label: 'Do these match?',
      scrollTo: 'dash-section-invoices',
      gotoLabel: 'Invoices',
    },
    {
      label: 'What are the risks?',
      scrollTo: 'dash-section-detail',
      gotoLabel: 'Detail',
    },
    {
      label: 'Cloud vs invoice?',
      scrollTo: 'dash-section-cloud',
      gotoLabel: 'Cloud',
    },
  ]

  useEffect(() => {
    let cancelled = false
    if (!transactionId) {
      setTxn(null)
    } else {
      getTransaction(transactionId)
        .then((data) => {
          if (!cancelled) setTxn(data)
        })
        .catch(() => {
          if (!cancelled) setTxn(null)
        })
    }
    return () => {
      cancelled = true
    }
  }, [transactionId])

  useEffect(() => {
    let cancelled = false
    if (!invoiceId) {
      setInv(null)
    } else {
      getInvoice(invoiceId)
        .then((data) => {
          if (!cancelled) setInv(data)
        })
        .catch(() => {
          if (!cancelled) setInv(null)
        })
    }
    return () => {
      cancelled = true
    }
  }, [invoiceId])

  const ctx = useMemo(() => ({ txn, inv }), [txn, inv])
  const ctxRef = useRef(ctx)
  ctxRef.current = ctx

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  function send(text) {
    const trimmed = (text ?? input).trim()
    if (!trimmed) return
    setInput('')
    setMessages((m) => [...m, { role: 'user', text: trimmed }])
    const answer = buildReply(trimmed, ctxRef.current)
    setMessages((m) => [...m, { role: 'assistant', text: answer }])
  }

  const SCROLL_THEN_SEND_MS = 420

  function runSuggestion(entry) {
    const label = typeof entry === 'string' ? entry : entry.label
    const targetId = typeof entry === 'object' ? entry.scrollTo : null

    if (targetId) {
      document.getElementById(targetId)?.scrollIntoView({
        behavior: 'smooth',
        block: 'start',
      })
      window.setTimeout(() => send(label), SCROLL_THEN_SEND_MS)
      return
    }
    send(label)
  }

  return (
    <div className={'inv-chat ' + className}>
      {!hideContextBar && (
        <div className="inv-chat__ctx">
          <span className="inv-chat__ctx-bit">
            Statement:{' '}
            <strong>{txn ? txn.description : '—'}</strong>
          </span>
          <span className="inv-chat__ctx-bit">
            Invoice: <strong>{inv ? inv.vendor : '—'}</strong>
          </span>
        </div>
      )}
      <div className="inv-chat__log" role="log" aria-live="polite">
        {messages.map((msg, i) => (
          <div
            key={i}
            className={
              'inv-chat__msg ' +
              (msg.role === 'user' ? 'inv-chat__msg--user' : 'inv-chat__msg--bot')
            }
          >
            {msg.text.split('\n').map((line, j) => (
              <p key={j}>{line}</p>
            ))}
          </div>
        ))}
        <div ref={endRef} />
      </div>
      <div className="inv-chat__suggest" role="group" aria-label="Suggested prompts">
        {suggestions.map((s) => (
          <button
            key={s.label}
            type="button"
            className={
              'inv-chat__chip' + (s.scrollTo ? ' inv-chat__chip--goto' : '')
            }
            onClick={() => runSuggestion(s)}
            title={
              s.scrollTo
                ? `Jump to ${s.gotoLabel ?? 'section'}, then ask`
                : undefined
            }
            aria-label={
              s.scrollTo
                ? `${s.label} — scroll to ${s.gotoLabel ?? 'related panel'}`
                : s.label
            }
          >
            <span className="inv-chat__chip-text">{s.label}</span>
            {s.scrollTo && s.gotoLabel ? (
              <span className="inv-chat__chip-anchor" aria-hidden>
                {s.gotoLabel}
                <span className="inv-chat__chip-arrow">↓</span>
              </span>
            ) : null}
          </button>
        ))}
      </div>
      <div className="inv-chat__input-row">
        <input
          className="inv-chat__input"
          type="text"
          value={input}
          placeholder="Ask about this invoice vs the selected bank line…"
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') send()
          }}
          aria-label="Investigation question"
        />
        <button
          type="button"
          className="inv-chat__send"
          onClick={() => send()}
        >
          Send
        </button>
      </div>
    </div>
  )
}
