import { useState, useEffect } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import UserMenu from './UserMenu.jsx'

export default function Sidebar({ user }) {
  const [isOpen, setIsOpen] = useState(false)
  const location = useLocation()

  // Close sidebar on route change (mobile)
  useEffect(() => {
    setIsOpen(false)
  }, [location.pathname])

  // Close sidebar on escape key
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape') setIsOpen(false)
    }
    if (isOpen) {
      document.addEventListener('keydown', handleEscape)
      return () => document.removeEventListener('keydown', handleEscape)
    }
  }, [isOpen])

  return (
    <>
      {/* Mobile toggle button */}
      <button
        type="button"
        className="sidebar-toggle"
        onClick={() => setIsOpen(!isOpen)}
        aria-label={isOpen ? 'Close menu' : 'Open menu'}
        aria-expanded={isOpen}
      >
        {isOpen ? (
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <path d="M18 6L6 18M6 6l12 12" />
          </svg>
        ) : (
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <path d="M3 12h18M3 6h18M3 18h18" />
          </svg>
        )}
      </button>

      {/* Backdrop overlay for mobile */}
      <div
        className={`sidebar-backdrop ${isOpen ? 'sidebar-backdrop-visible' : ''}`}
        onClick={() => setIsOpen(false)}
        aria-hidden="true"
      />

      <aside className={`sidebar ${isOpen ? 'sidebar-open' : ''}`}>
        <div className="sidebar-brand">
          <div className="brand-mark">PM</div>
          <div className="brand-text">
            <span className="brand-title">Project Control</span>
            <span className="brand-subtitle">Portfolio cockpit</span>
          </div>
        </div>
        <nav className="sidebar-nav">
          <div className="sidebar-section-label">Overview</div>
          <NavLink
            to="/overview"
            className={({ isActive }) =>
              `sidebar-link ${isActive ? 'sidebar-link-active' : ''}`
            }
          >
            Portfolio overview
          </NavLink>
          <NavLink
            to="/discovery"
            className={({ isActive }) =>
              `sidebar-link ${isActive ? 'sidebar-link-active' : ''}`
            }
          >
            Discovery pipeline
          </NavLink>
          <NavLink
            to="/development"
            className={({ isActive }) =>
              `sidebar-link ${isActive ? 'sidebar-link-active' : ''}`
            }
          >
            Development
          </NavLink>
          <NavLink
            to="/on-hold"
            className={({ isActive }) =>
              `sidebar-link ${isActive ? 'sidebar-link-active' : ''}`
            }
          >
            On-hold projects
          </NavLink>
          <NavLink
            to="/completed"
            className={({ isActive }) =>
              `sidebar-link ${isActive ? 'sidebar-link-active' : ''}`
            }
          >
            Completed projects
          </NavLink>
          <NavLink
            to="/timeline"
            className={({ isActive }) =>
              `sidebar-link ${isActive ? 'sidebar-link-active' : ''}`
            }
          >
            Timeline view
          </NavLink>

          <div className="sidebar-section-label">Projects</div>
          <NavLink
            to="/projects"
            className={({ isActive }) =>
              `sidebar-link ${isActive ? 'sidebar-link-active' : ''}`
            }
          >
            Project list
          </NavLink>

          <div className="sidebar-section-label">Admin</div>
          <NavLink
            to="/settings"
            className={({ isActive }) =>
              `sidebar-link ${isActive ? 'sidebar-link-active' : ''}`
            }
          >
            Data & settings
          </NavLink>
        </nav>
        <div className="sidebar-footer">
          <UserMenu user={user} />
        </div>
      </aside>
    </>
  )
}
