const fmtShort = (iso) => {
  const d = new Date(iso + (iso.length === 10 ? 'T12:00:00' : ''))
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
}

export function CashflowChart({ points }) {
  if (!Array.isArray(points) || points.length < 2) {
    return (
      <p className="cf-chart__empty">
        Need at least two forecast points — check the API.
      </p>
    )
  }

  const w = 420
  const h = 140
  const padL = 10
  const padR = 10
  const padT = 14
  const padB = 26
  const vals = points.map((p) => p.projected_balance)
  const min = Math.min(...vals)
  const max = Math.max(...vals)
  const spread = max - min || 1
  const x0 = padL
  const x1 = w - padR
  const y0 = padT
  const y1 = h - padB
  const n = points.length - 1

  const toX = (i) => x0 + (i / n) * (x1 - x0)
  const toY = (v) => y1 - ((v - min) / spread) * (y1 - y0)

  const todayBal = vals[0]
  const yRef = toY(todayBal)
  const poly = points
    .map((p, i) => `${toX(i).toFixed(1)},${toY(p.projected_balance).toFixed(1)}`)
    .join(' ')

  const labelAt = (day) => {
    const i = Math.min(day, n)
    return { i, x: toX(i), text: fmtShort(points[i].date) }
  }
  const labels = [labelAt(0), labelAt(Math.floor(n / 3)), labelAt(Math.floor((2 * n) / 3)), labelAt(n)]

  return (
    <div className="cf-chart">
      <p className="cf-chart__caption">Projected balance (90 days)</p>
      <svg
        className="cf-chart__svg"
        viewBox={`0 0 ${w} ${h}`}
        preserveAspectRatio="none"
        role="img"
        aria-label="Cash balance forecast line chart"
      >
        <line
          x1={x0}
          x2={x1}
          y1={yRef}
          y2={yRef}
          className="cf-chart__ref"
          strokeDasharray="4 4"
        />
        <polyline
          className="cf-chart__line"
          fill="none"
          strokeWidth="2"
          points={poly}
        />
        {labels.map((lb, idx) => (
          <text
            key={idx}
            x={lb.x}
            y={h - 6}
            className="cf-chart__tick"
            textAnchor="middle"
          >
            {lb.text}
          </text>
        ))}
      </svg>
      <div className="cf-chart__legend">
        <span className="cf-chart__legend-dash" aria-hidden />
        <span>Opening balance reference</span>
      </div>
    </div>
  )
}
