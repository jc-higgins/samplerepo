import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { HeroCanvas } from './components/HeroCanvas.jsx'
import { MiniRunwayCanvas } from './components/MiniRunwayCanvas.jsx'
import { apiBase } from './api.js'
import './Landing.css'

const pillars = [
  {
    n: '01',
    title: 'Statements & enrichment',
    tag: 'Explain every bank line',
    mission:
      'Categorize transactions, surface plain-English explanations, and drill into optional enrichment — line items for itemizable charges (e.g. AWS) plus waste flags when spend looks inefficient.',
    outputs: [
      'GET /transactions · row → GET /transactions/{id}',
      'explanation · confidence · review_flag · anomaly_reason',
      'enrichment.line_items · enrichment.waste_flag',
    ],
  },
  {
    n: '02',
    title: 'Invoices & verification',
    tag: 'Cross-channel legitimacy',
    mission:
      'Enrich invoice requests with email / WhatsApp context: verification badges (LEGIT · SUSPICIOUS · UNKNOWN), evidence bullets, risk flags, and rationale the CFO can trust.',
    outputs: [
      'GET /invoices',
      'verification.decision · evidence · risk_flags',
      'channel · vendor · due_date · confidence',
    ],
  },
  {
    n: '03',
    title: 'Actions & cashflow',
    tag: 'Safe execution',
    mission:
      'Turn signals into action plans with expected cash impact, human approval when required, and a 90-day projected balance line — no chart libraries, inline SVG only.',
    outputs: [
      'GET /actions · POST /actions/{id}/approve',
      'GET /cashflow/forecast',
      'execution_mode · next_step · rationale',
    ],
  },
]

const agentCComponents = [
  'Statements.jsx — table, category filter, row → TransactionDetail',
  'TransactionDetail.jsx — explanation bar, line_items table, waste_flag banner, anomaly pill',
  'Invoices.jsx — cards, verification badge, expand evidence / risk / rationale',
  'CloudCostSnapshot.jsx — AWS/GCP cards, trend + MoM from /cloud/cost-summary',
  'ActionsAndCashflow.jsx — action cards, Approve when HUMAN_APPROVAL',
  'CashflowChart.jsx — inline SVG polyline from projected_balance',
  'InvestigationChat.jsx — demo heuristics vs selected txn + invoice',
  'api.js — thin fetch helpers (see spec)',
]

const agentCApiRows = [
  ['GET', '/transactions', 'Transaction[]'],
  ['GET', '/transactions/{id}', 'Transaction'],
  ['GET', '/invoices', 'Invoice + verification[]'],
  ['GET', '/actions', 'ActionPlan[]'],
  ['GET', '/cashflow/forecast', 'CashflowPoint[]'],
  ['GET', '/cashflow/summary', 'CashflowSummary'],
  ['GET', '/cloud/cost-summary', 'CloudCostSummary'],
  ['POST', '/actions/{id}/approve', 'ActionPlan'],
]

export function Landing() {
  const [api, setApi] = useState({ loading: true, ok: null })

  useEffect(() => {
    let cancelled = false
    fetch(`${apiBase}/health`)
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then(() => {
        if (!cancelled) setApi({ loading: false, ok: true })
      })
      .catch(() => {
        if (!cancelled) setApi({ loading: false, ok: false })
      })
    return () => {
      cancelled = true
    }
  }, [])

  return (
    <div className="autocfo">
      <section className="hero">
        <HeroCanvas />
        <div className="hero__inner">
          <p className="hero__eyebrow">Invoice enrichment · explained statements</p>
          <h1 className="hero__title">AutoCFO</h1>
          <p className="hero__lede">
            Enrich messy bank lines and inbound invoices: structured explanations,
            itemized breakdowns when data exists, and verification you can demo in
            two minutes — then act on cashflow with explicit human gates.
          </p>
          <div className="hero__cta">
            <span className="hero__pill">MVP contract · specs/01-mvp-split.md</span>
            <span className="hero__pill hero__pill--ghost">
              Agent C · specs/agent-c-frontend.md
            </span>
            <Link to="/dashboard" className="hero__dash-btn">
              Open demo dashboard
            </Link>
          </div>
        </div>
        <div className="hero__glow" aria-hidden />
      </section>

      <main className="shell">
        <section className="band band--stats">
          <div className="stat glass">
            <span className="stat__label">Demo story</span>
            <MiniRunwayCanvas />
            <span className="stat__hint">
              AWS txn → drill-down with line_items + waste_flag → invoice LEGIT /
              SUSPICIOUS → approve savings action → forecast line
            </span>
          </div>
          <div className="stat glass">
            <span className="stat__label">Enrichment &amp; explain</span>
            <ul className="stat__list">
              <li>Plain-English explanation per transaction</li>
              <li>Optional enrichment (e.g. cloud line items, notes)</li>
              <li>Waste callouts when enrichment flags idle spend</li>
              <li>Invoice evidence + risk_flags + rationale</li>
            </ul>
          </div>
          <div className="stat glass">
            <span className="stat__label">Sources (mocked MVP)</span>
            <ul className="stat__list stat__list--tags">
              <li>Bank feed</li>
              <li>AWS-style detail</li>
              <li>Gmail</li>
              <li>WhatsApp</li>
            </ul>
          </div>
        </section>

        <section className="section">
          <h2 className="section__title">Three panels, one JSON contract</h2>
          <p className="section__lede">
            The MVP dashboard consumes Agent B&apos;s API using the shapes in{' '}
            <code className="inline-code">specs/01-mvp-split.md</code> — no auth,
            no chart deps; credibility for a short demo beats polish.
          </p>
          <div className="cards">
            {pillars.map((a) => (
              <article key={a.n} className="card glass">
                <header className="card__head">
                  <span className="card__num">{a.n}</span>
                  <div>
                    <h3 className="card__title">{a.title}</h3>
                    <p className="card__tag">{a.tag}</p>
                  </div>
                </header>
                <p className="card__mission">{a.mission}</p>
                <ul className="card__outputs">
                  {a.outputs.map((line) => (
                    <li key={line}>{line}</li>
                  ))}
                </ul>
              </article>
            ))}
          </div>
        </section>

        <section className="section">
          <div className="agentc glass">
            <p className="agentc__kicker">Agent C — Frontend dashboard</p>
            <h2 className="section__title section__title--inline">
              Your task (from <code className="inline-code">agent-c-frontend.md</code>)
            </h2>
            <p className="agentc__intro">
              Replace the single-page shell with the real dashboard when you wire
              data: header with runway + backend status;{' '}
              <strong>Statements</strong> with drill-down;{' '}
              <strong>Invoices</strong> with verification badges;{' '}
              <strong>Actions &amp; Cashflow</strong> with approve + SVG forecast.
            </p>

            <div className="agentc__layout" aria-hidden>
              <pre className="agentc__ascii">{`┌────────────────────────────────────────────────────────────┐
│ AutoCFO    runway: ~N mo    backend: ok                    │
├─────────────────────────────┬──────────────────────────────┤
│ Statements                  │ Invoices                      │
│  · category filter          │  [LEGIT]  vendor £…          │
│  · row → detail             │  [SUSP.]  …                  │
│                             │  [UNKWN]  …                  │
│                             ├──────────────────────────────┤
│                             │ Actions & Cashflow           │
│                             │  cards + Approve · SVG line  │
└─────────────────────────────┴──────────────────────────────┘`}</pre>
            </div>

            <h3 className="agentc__h3">Components to add under src/components/</h3>
            <ul className="agentc__list">
              {agentCComponents.map((line) => (
                <li key={line}>{line}</li>
              ))}
            </ul>

            <h3 className="agentc__h3">API surface (Agent B)</h3>
            <div className="agentc__table-wrap">
              <table className="agentc__table">
                <thead>
                  <tr>
                    <th>Method</th>
                    <th>Path</th>
                    <th>Returns</th>
                  </tr>
                </thead>
                <tbody>
                  {agentCApiRows.map(([method, path, ret]) => (
                    <tr key={path}>
                      <td><code>{method}</code></td>
                      <td><code>{path}</code></td>
                      <td>{ret}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <p className="agentc__build">
              <strong>Build order:</strong> layout shell → Statements + fixture from
              MVP doc → TransactionDetail (&quot;wow&quot;: line items + waste_flag) →
              Invoices → ActionsAndCashflow + CashflowChart → Approve POST.
            </p>
          </div>
        </section>

        <section className="section section--contract">
          <div className="contract glass">
            <h2 className="section__title section__title--inline">
              Shared contract (excerpt)
            </h2>
            <p className="contract__lede">
              Transactions carry <strong>explanation</strong> and optional{' '}
              <strong>enrichment</strong> for invoice-style clarity on bank lines;
              invoices carry <strong>verification</strong>; actions carry{' '}
              <strong>decision</strong>, <strong>confidence</strong>,{' '}
              <strong>rationale</strong>, <strong>evidence</strong>, and{' '}
              <strong>next_step</strong> —{' '}
              <code>AUTO_EXECUTE</code>, <code>REQUEST_HUMAN</code>, or{' '}
              <code>REJECT</code>. Weak evidence → human review.
            </p>
            <div className="contract__modes">
              <div>
                <span className="contract__mode">Auto</span>
                <span className="contract__desc">
                  High confidence, low impact, policy-safe.
                </span>
              </div>
              <div>
                <span className="contract__mode">Review</span>
                <span className="contract__desc">
                  Mixed signals, novel counterparties, unusual amounts.
                </span>
              </div>
              <div>
                <span className="contract__mode">Block</span>
                <span className="contract__desc">
                  Suspected fraud or policy violation.
                </span>
              </div>
            </div>
          </div>
        </section>

        <section className="panel glass" aria-live="polite">
          <div className="panel__row">
            <h2 className="panel__title">API</h2>
            <span
              className={
                'panel__dot ' +
                (api.loading
                  ? 'panel__dot--pending'
                  : api.ok
                    ? 'panel__dot--ok'
                    : 'panel__dot--err')
              }
            />
          </div>
          <p className="panel__url">{apiBase}</p>
          {api.loading && <p className="panel__status">Checking backend…</p>}
          {!api.loading && api.ok && (
            <p className="panel__status panel__status--ok">Backend reachable</p>
          )}
          {!api.loading && api.ok === false && (
            <p className="panel__status panel__status--err">
              Start <code>uv run uvicorn</code> from <code>backend/</code> — see{' '}
              <code>specs/agent-b-backend.md</code>
            </p>
          )}
        </section>
      </main>

      <footer className="foot">
        <span>AutoCFO · CFO automation · enrichment &amp; explained invoices</span>
      </footer>
    </div>
  )
}

