import { NavLink, Navigate, Route, Routes } from 'react-router-dom'
import { Landing } from './Landing.jsx'
import { DashboardShell } from './DashboardShell.jsx'
import './App.css'

export default function App() {
  return (
    <div className="app-root">
      <nav className="app-switcher" aria-label="Demo views">
        <NavLink
          to="/"
          end
          className={({ isActive }) => (isActive ? 'is-active' : undefined)}
        >
          Overview
        </NavLink>
        <NavLink
          to="/dashboard"
          className={({ isActive }) => (isActive ? 'is-active' : undefined)}
        >
          Dashboard
        </NavLink>
      </nav>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/dashboard" element={<DashboardShell />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </div>
  )
}
