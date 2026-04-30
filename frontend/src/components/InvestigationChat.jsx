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
    return 'Select a bank line in Statements and an invoice on the right. I’ll use both to reason about payables (demo rules, no live model).'
  }
  if (!ctx.txn) {
    return 'Add a statement line so we can compare timing and amounts to this invoice.'
  }
  if (!ctx.inv) {
    return 'Pick an invoice to compare against this bank movement.'
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

  return 'Try: summary, do these match?, risk, or cloud vs invoice — I’ll answer from the selected statement + invoice only.'
}

export function InvestigationChat({ transactionId, invoiceId }) {
  const [txn, setTxn] = useState(null)
  const [inv, setInv] = useState(null)
  const [messages, setMessages] = useState(() => [
    {
      role: 'assistant',
      text: 'Investigate payables against the bank feed. Select a statement row and an invoice, then ask questions here.',
    },
  ])
  const [input, setInput] = useState('')
  const endRef = useRef(null)

  const suggestions = [
    'What is the summary?',
    'Do these match?',
    'What are the risks?',
    'Cloud vs invoice?',
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

  return (
    <div className="inv-chat">
      <div className="inv-chat__ctx">
        <span className="inv-chat__ctx-bit">
          Statement:{' '}
          <strong>{txn ? txn.description : '—'}</strong>
        </span>
        <span className="inv-chat__ctx-bit">
          Invoice: <strong>{inv ? inv.vendor : '—'}</strong>
        </span>
      </div>
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
            key={s}
            type="button"
            className="inv-chat__chip"
            onClick={() => send(s)}
          >
            {s}
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
        <button type="button" className="inv-chat__send" onClick={() => send()}>
          Send
        </button>
      </div>
    </div>
  )
}
