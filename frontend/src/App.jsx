import { useState } from 'react'
import { Landing } from './Landing.jsx'
import { DashboardShell } from './DashboardShell.jsx'
import './App.css'

export default function App() {
  const [page, setPage] = useState('landing')

  return (
    <div className="app-root">
      <nav className="app-switcher" aria-label="Demo views">
        <button
          type="button"
          className={page === 'landing' ? 'is-active' : undefined}
          onClick={() => setPage('landing')}
        >
          Overview
        </button>
        <button
          type="button"
          className={page === 'dashboard' ? 'is-active' : undefined}
          onClick={() => setPage('dashboard')}
        >
          Dashboard
        </button>
      </nav>
      {page === 'landing' ? (
        <Landing onGoDashboard={() => setPage('dashboard')} />
      ) : (
        <DashboardShell onBack={() => setPage('landing')} />
      )}
    </div>
  )
}
