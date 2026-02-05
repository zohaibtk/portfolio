import { NavLink } from 'react-router-dom'

export default function Sidebar({ projectCount }) {
  return (
    <aside className="sidebar">
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
        <span className="sidebar-counter">{projectCount} projects</span>
      </div>
    </aside>
  )
}
