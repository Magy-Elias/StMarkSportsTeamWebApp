import { NavLink } from 'react-router-dom'

export default function Sidebar() {
  return (
    <aside className="sidebar">
      <div className="sidebar-brand">
        <NavLink to="/" end className="brand-link" aria-label="ONE99 Sports Team">
          <img src="/logo.svg" alt="ONE99 Sports Team" className="sidebar-logo" />
        </NavLink>
      </div>
      <nav className="sidebar-nav">
        <NavLink to="/" end className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}>
          Home
        </NavLink>
        <NavLink to="/calendar" className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}>
          Calendar
        </NavLink>
        <NavLink to="/pending" className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}>
          Events Pending
        </NavLink>
        <NavLink to="/form-1" className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}>
          Form 1
        </NavLink>
        <NavLink to="/form-2" className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}>
          Form 2
        </NavLink>
      </nav>
    </aside>
  )
}
