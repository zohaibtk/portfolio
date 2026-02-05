import { useMemo, useState } from 'react'
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
  const [collapsed, setCollapsed] = useState({ info: true, discovery: true, development: true, team: true, risks: true, notes: true })

  const toggle = (key) => setCollapsed((prev) => ({ ...prev, [key]: !prev[key] }))

  return (
    <article
      className={`project-card ${dragHandleProps ? 'project-card-draggable' : ''} ${isDragging ? 'project-card-is-dragging' : ''}`}
    >
      <header className="project-card__header">
        <div className="project-card__title-row">
          <h2 className="project-card__title">
            <Link to={`/projects/${project.id}`}>{project.name}</Link>
          </h2>
          {dragHandleProps && (
            <div
              className="drag-handle drag-handle-corner"
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
              <span className="drag-handle-text">Drag</span>
            </div>
          )}
        </div>
        <div className="project-card__client-row">
          <p className="project-card__client">{project.client}</p>
          {project.teamMembers?.length > 0 && (
            <div className="project-card__avatars">
              {project.teamMembers.slice(0, 4).map((m) => (
                <div
                  key={m.id}
                  className="avatar avatar-sm"
                  style={{ background: getAvatarColor(m.name) }}
                  title={`${m.name}${m.role ? ` — ${m.role}` : ''}`}
                  data-tooltip={`${m.name}${m.role ? ` — ${m.role}` : ''}`}
                >
                  {getInitials(m.name)}
                </div>
              ))}
              {project.teamMembers.length > 4 && (
                <div className="avatar avatar-sm avatar-overflow">
                  +{project.teamMembers.length - 4}
                </div>
              )}
            </div>
          )}
        </div>
        <div className="project-card__meta-row">
          <div className="project-card__meta-left">
            <StatusPill status={project.status} />
            <RiskChip risk={derived.overallRisk} />
          </div>
          <div className="project-card__meta-right">
            <div className="project-card__actions">
              {onMom && (
                <button
                  type="button"
                  className="icon-button mom-icon-button"
                  onClick={(e) => {
                    e.stopPropagation()
                    onMom(project)
                  }}
                  aria-label="Meeting minutes"
                  title="Meeting minutes"
                >
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 16 16"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                    aria-hidden="true"
                  >
                    <rect x="2" y="1" width="12" height="14" rx="1.5" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
                    <path d="M5 5h6M5 8h6M5 11h3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                  </svg>
                  {project.meetingMinutes?.length > 0 && (
                    <span className="mom-badge">{project.meetingMinutes.length}</span>
                  )}
                </button>
              )}
              <button
                type="button"
                className="icon-button"
                onClick={(e) => {
                  e.stopPropagation()
                  onEdit(project)
                }}
                aria-label="Edit project"
                title="Edit project"
              >
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 16 16"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                  aria-hidden="true"
                >
                  <path
                    d="M11.333 2a1.414 1.414 0 0 1 2 2L4.667 12.667 2 13.333l.667-2.667L11.333 2Z"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </button>
              <button
                type="button"
                className="icon-button icon-button-danger"
                onClick={(e) => {
                  e.stopPropagation()
                  onDelete(project)
                }}
                aria-label="Delete project"
                title="Delete project"
              >
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 16 16"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                  aria-hidden="true"
                >
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
              </button>
            </div>
          </div>
        </div>
      </header>

      <CollapsibleSection title="Project Information" isCollapsed={!!collapsed.info} onToggle={() => toggle('info')}>
        <dl className="summary-grid">
          <div>
            <dt>Status</dt>
            <dd>
              <StatusPill status={project.status} />
            </dd>
          </div>
          <div>
            <dt>Priority</dt>
            <dd>{PRIORITY_LABELS[project.priority]}</dd>
          </div>
          {project.onHoldReason && (
            <div style={{ gridColumn: '1 / -1' }}>
              <dt>On Hold Reason</dt>
              <dd>{project.onHoldReason}</dd>
            </div>
          )}
        </dl>
      </CollapsibleSection>

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
              <dt>Start Date</dt>
              <dd>{project.development?.startDate || '—'}</dd>
            </div>
            <div>
              <dt>Target Release</dt>
              <dd>{project.development?.targetReleaseDate || '—'}</dd>
            </div>
            <div>
              <dt>Actual Release</dt>
              <dd>{project.development?.actualReleaseDate || '—'}</dd>
            </div>
          </dl>
        </CollapsibleSection>
      )}

      {project.teamMembers?.length > 0 && (
        <CollapsibleSection title={`Team (${project.teamMembers.length})`} isCollapsed={!!collapsed.team} onToggle={() => toggle('team')}>
          <div className="project-card__team-list">
            {project.teamMembers.map((m) => (
              <div key={m.id} className="project-card__team-item">
                <div className="avatar avatar-sm" style={{ background: getAvatarColor(m.name) }}>
                  {getInitials(m.name)}
                </div>
                <div className="project-card__team-info">
                  <span className="project-card__team-name">{m.name}</span>
                  {m.role && <span className="project-card__team-role">{m.role}</span>}
                </div>
              </div>
            ))}
          </div>
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
