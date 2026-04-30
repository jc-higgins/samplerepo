import { useEffect, useState } from 'react'
import './App.css'

const apiBase =
  import.meta.env.VITE_API_URL?.replace(/\/$/, '') || 'http://127.0.0.1:8000'

function App() {
  const [api, setApi] = useState({ loading: true, ok: null, detail: null })

  useEffect(() => {
    let cancelled = false
    fetch(`${apiBase}/health`)
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
      .then((data) => {
        if (!cancelled) setApi({ loading: false, ok: true, detail: data })
      })
      .catch(() => {
        if (!cancelled)
          setApi({ loading: false, ok: false, detail: null })
      })
    return () => {
      cancelled = true
    }
  }, [])

  return (
    <div className="app">
      <header>
        <h1>Hackathon</h1>
        <p className="lede">
          FinTech pillar TBD — plan in <code>specs/</code>, ship in{' '}
          <code>frontend/</code> + <code>backend/</code>.
        </p>
      </header>

      <section className="panel" aria-live="polite">
        <h2>API</h2>
        <p className="mono">{apiBase}</p>
        {api.loading && <p className="status loading">Checking…</p>}
        {!api.loading && api.ok && (
          <p className="status ok">Backend reachable</p>
        )}
        {!api.loading && api.ok === false && (
          <p className="status err">
            Backend not reachable — run <code>uv run uvicorn …</code> from{' '}
            <code>backend/</code>
          </p>
        )}
      </section>
    </div>
  )
}

export default App
