import { useMemo, useState, useRef, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { computeProjectDerived, isPast, getAvatarColor, getInitials } from '../utils/projectUtils.js'
import { PRIORITY_LABELS } from '../constants.js'
import StatusPill from './StatusPill.jsx'
import RiskChip from './RiskChip.jsx'

function CollapsibleSection({ title, isCollapsed, onToggle, children }) {
  return (
    <section className="project-card__section">
      <button
        type="button"
        className="section-toggle"
        onClick={onToggle}
        aria-expanded={!isCollapsed}
      >
        <span className="section-toggle__title">{title}</span>
        <svg
          className={`section-toggle__chevron ${isCollapsed ? 'section-toggle__chevron--collapsed' : ''}`}
          width="14"
          height="14"
          viewBox="0 0 14 14"
          fill="none"
          aria-hidden="true"
        >
          <path d="M3.5 5.25L7 8.75l3.5-3.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>
      {!isCollapsed && <div className="section-toggle__body">{children}</div>}
    </section>
  )
}

export default function ProjectCard({ project, onEdit, onDelete, onMom, dragHandleProps, isDragging }) {
  const derived = useMemo(() => computeProjectDerived(project), [project])
  const [collapsed, setCollapsed] = useState({ info: false, discovery: true, development: true, risks: true, notes: true })
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef(null)

  const toggle = (key) => setCollapsed((prev) => ({ ...prev, [key]: !prev[key] }))

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setMenuOpen(false)
      }
    }
    if (menuOpen) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [menuOpen])

  return (
    <article
      className={`project-card ${dragHandleProps ? 'project-card-draggable' : ''} ${isDragging ? 'project-card-is-dragging' : ''}`}
    >
      <header className="project-card__header">
        <div className="project-card__title-row">
          {dragHandleProps && (
            <div
              className="drag-handle"
              {...dragHandleProps}
              aria-label={`Drag to reorder ${project.name}`}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault()
                  dragHandleProps.onKeyDown?.(e)
                }
              }}
            >
              <svg
                width="20"
                height="20"
                viewBox="0 0 20 20"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                aria-hidden="true"
              >
                <circle cx="5" cy="5" r="1.5" fill="currentColor" />
                <circle cx="10" cy="5" r="1.5" fill="currentColor" />
                <circle cx="15" cy="5" r="1.5" fill="currentColor" />
                <circle cx="5" cy="10" r="1.5" fill="currentColor" />
                <circle cx="10" cy="10" r="1.5" fill="currentColor" />
                <circle cx="15" cy="10" r="1.5" fill="currentColor" />
                <circle cx="5" cy="15" r="1.5" fill="currentColor" />
                <circle cx="10" cy="15" r="1.5" fill="currentColor" />
                <circle cx="15" cy="15" r="1.5" fill="currentColor" />
              </svg>
            </div>
          )}
          <h2 className="project-card__title">
            <Link to={`/projects/${project.id}`}>
              <span style={{ color: '#64748b', fontWeight: 500 }}>{project.client}</span> - {project.name}
            </Link>
          </h2>
          <div className="project-card__menu-wrapper" ref={menuRef}>
            <button
              type="button"
              className="project-card__menu-button"
              onClick={() => setMenuOpen(!menuOpen)}
              aria-label="Card actions"
              aria-expanded={menuOpen}
            >
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <circle cx="8" cy="3" r="1.5" fill="currentColor" />
                <circle cx="8" cy="8" r="1.5" fill="currentColor" />
                <circle cx="8" cy="13" r="1.5" fill="currentColor" />
              </svg>
            </button>
            {menuOpen && (
              <div className="project-card__menu-dropdown">
                {onMom && (
                  <button
                    type="button"
                    className="menu-item"
                    onClick={(e) => {
                      e.stopPropagation()
                      setMenuOpen(false)
                      onMom(project)
                    }}
                  >
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                      <rect x="2" y="1" width="12" height="14" rx="1.5" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
                      <path d="M5 5h6M5 8h6M5 11h3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                    </svg>
                    Meeting Minutes
                    {project.meetingMinutes?.length > 0 && (
                      <span className="menu-badge">{project.meetingMinutes.length}</span>
                    )}
                  </button>
                )}
                <button
                  type="button"
                  className="menu-item"
                  onClick={(e) => {
                    e.stopPropagation()
                    setMenuOpen(false)
                    onEdit(project)
                  }}
                >
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                    <path
                      d="M11.333 2a1.414 1.414 0 0 1 2 2L4.667 12.667 2 13.333l.667-2.667L11.333 2Z"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                  Edit
                </button>
                <button
                  type="button"
                  className="menu-item menu-item-danger"
                  onClick={(e) => {
                    e.stopPropagation()
                    setMenuOpen(false)
                    onDelete(project)
                  }}
                >
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                    <path
                      d="M2 4h12M6 4V2.667A1.333 1.333 0 0 1 7.333 2h1.334A1.333 1.333 0 0 1 10 2.667V4m2 0v9.333A1.333 1.333 0 0 1 10.667 14H5.333A1.333 1.333 0 0 1 4 13.333V4h8Z"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                    <path
                      d="M6.667 7.333v4M9.333 7.333v4"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                    />
                  </svg>
                  Delete
                </button>
              </div>
            )}
          </div>
        </div>
        <div className="project-card__meta-row">
          <div className="project-card__meta-left">
            <StatusPill status={project.status} />
            <RiskChip risk={derived.overallRisk} />
            <span style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: 500 }}>
              {PRIORITY_LABELS[project.priority]}
            </span>
          </div>
          <div className="project-card__meta-right">
            {project.teamMembers?.length > 0 && (
              <div className="project-card__avatars-compact">
                {project.teamMembers.slice(0, 2).map((m) => (
                  <div
                    key={m.id}
                    className="avatar avatar-sm"
                    style={{ background: getAvatarColor(m.name) }}
                    title={`${m.name}${m.role ? ` — ${m.role}` : ''}`}
                  >
                    {getInitials(m.name)}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </header>

      {project.onHoldReason && (
        <div className="project-card__section">
          <div style={{ fontSize: '0.8rem', color: '#92400e', backgroundColor: '#fef3c7', padding: '0.5rem 0.75rem', borderRadius: '0.5rem' }}>
            <strong>On Hold:</strong> {project.onHoldReason}
          </div>
        </div>
      )}

      {project.discovery && (
        <CollapsibleSection title="Discovery" isCollapsed={!!collapsed.discovery} onToggle={() => toggle('discovery')}>
          <dl className="summary-grid">
            <div>
              <dt>Target Complete</dt>
              <dd>{project.discovery?.targetCompleteDate || '—'}</dd>
            </div>
            <div>
              <dt>Actual Complete</dt>
              <dd>{project.discovery?.actualCompleteDate || '—'}</dd>
            </div>
            <div>
              <dt>Missing Artifacts</dt>
              <dd>{derived.hasMissingArtifacts ? 'Yes' : 'No'}</dd>
            </div>
          </dl>
          {project.discovery.requiredArtifacts?.length > 0 && (
            <div style={{ marginTop: '0.75rem' }}>
              <h4 style={{ fontSize: '0.75rem', color: '#64748b', margin: '0 0 0.4rem' }}>
                Required Artifacts
              </h4>
              <table className="artifacts-table">
                <thead>
                  <tr>
                    <th>Artifact</th>
                    <th>Owner</th>
                    <th>Due</th>
                    <th>Received</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {project.discovery.requiredArtifacts.map((a) => {
                    const overdue = a.dueDate && isPast(a.dueDate) && !a.receivedDate
                    return (
                      <tr key={a.id}>
                        <td>
                          {a.fileUrl ? (
                            <a href={a.fileUrl} target="_blank" rel="noopener noreferrer" className="artifact-link">{a.name}</a>
                          ) : a.name}
                        </td>
                        <td>{a.owner}</td>
                        <td>{a.dueDate || '—'}</td>
                        <td>{a.receivedDate || '—'}</td>
                        <td>
                          {a.receivedDate
                            ? 'Received'
                            : overdue
                              ? 'Overdue'
                              : 'Waiting'}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
          {project.discovery.notes && (
            <div style={{ marginTop: '0.75rem' }}>
              <h4 style={{ fontSize: '0.75rem', color: '#64748b', margin: '0 0 0.3rem' }}>
                Discovery notes
              </h4>
              <div
                className="rich-text"
                // eslint-disable-next-line react/no-danger
                dangerouslySetInnerHTML={{ __html: project.discovery.notes }}
              />
            </div>
          )}
        </CollapsibleSection>
      )}

      {project.development && (
        <CollapsibleSection title="Development" isCollapsed={!!collapsed.development} onToggle={() => toggle('development')}>
          <dl className="summary-grid">
            <div>
              <dt>Dev Start</dt>
              <dd>{project.development?.startDate || '—'}</dd>
            </div>
            <div>
              <dt>Releases</dt>
              <dd>{project.development?.releases?.length || 0}</dd>
            </div>
          </dl>

          {project.development?.releases?.length > 0 && (
            <div style={{ marginTop: '0.75rem' }}>
              <h4 style={{ fontSize: '0.75rem', color: '#64748b', margin: '0 0 0.4rem' }}>
                Release Schedule
              </h4>
              <table className="releases-table">
                <thead>
                  <tr>
                    <th>Release</th>
                    <th>Start</th>
                    <th>Target</th>
                    <th>Actual</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {project.development.releases.map((rel) => {
                    const isComplete = !!rel.actualEndDate
                    const isOverdue = !isComplete && rel.endDate && isPast(rel.endDate)
                    const statusClass = isComplete ? 'status-complete' : isOverdue ? 'status-late' : 'status-planned'
                    const statusText = isComplete ? 'Released' : isOverdue ? 'Overdue' : 'Planned'
                    return (
                      <tr key={rel.id}>
                        <td>{rel.name || 'Unnamed'}</td>
                        <td>{rel.startDate || '—'}</td>
                        <td>{rel.endDate || '—'}</td>
                        <td>{rel.actualEndDate || '—'}</td>
                        <td className={statusClass}>{statusText}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CollapsibleSection>
      )}

      {derived.riskFlags.length > 0 && (
        <CollapsibleSection title="Risks &amp; Alerts" isCollapsed={!!collapsed.risks} onToggle={() => toggle('risks')}>
          <ul className="risk-list">
            {derived.riskFlags.map((flag) => (
              <li key={flag}>{flag}</li>
            ))}
          </ul>
        </CollapsibleSection>
      )}

      {project.notes && (
        <CollapsibleSection title="Notes" isCollapsed={!!collapsed.notes} onToggle={() => toggle('notes')}>
          <div
            className="rich-text"
            // eslint-disable-next-line react/no-danger
            dangerouslySetInnerHTML={{ __html: project.notes }}
          />
        </CollapsibleSection>
      )}
    </article>
  )
}
