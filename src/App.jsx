import { useEffect, useMemo, useRef, useState } from 'react'
import {
  Link,
  NavLink,
  Route,
  Routes,
  Navigate,
  useNavigate,
  useParams,
} from 'react-router-dom'
import './App.css'
import dataService from './services/dataService'

const STATUS_LABELS = {
  discovery: 'In Discovery',
  development: 'In Development',
  on_hold: 'On Hold',
}

const PRIORITY_LABELS = {
  high: 'High',
  medium: 'Medium',
  low: 'Low',
}

function parseDate(value) {
  if (!value) return null
  const d = new Date(value)
  return Number.isNaN(d.getTime()) ? null : d
}

function daysBetween(start, end) {
  if (!start || !end) return null
  const diffMs = end.getTime() - start.getTime()
  return Math.round(diffMs / (1000 * 60 * 60 * 24))
}

function isPast(date) {
  if (!date) return false
  const today = new Date()
  // ignore time of day
  today.setHours(0, 0, 0, 0)
  const d = new Date(date)
  d.setHours(0, 0, 0, 0)
  return d.getTime() < today.getTime()
}

function computeProjectDerived(project) {
  const now = new Date()

  const discoveryTarget = parseDate(project.discovery?.targetCompleteDate)
  const discoveryActual = parseDate(project.discovery?.actualCompleteDate)

  const hasMissingArtifacts =
    project.discovery?.requiredArtifacts?.some((a) => !a.receivedDate) || false

  const hasLateArtifacts =
    project.discovery?.requiredArtifacts?.some(
      (a) => a.dueDate && isPast(a.dueDate) && !a.receivedDate,
    ) || false

  const discoveryIsLate =
    !discoveryActual && discoveryTarget && discoveryTarget.getTime() < now.getTime()

  const devTarget = parseDate(project.development?.targetReleaseDate)
  const devActual = parseDate(project.development?.actualReleaseDate)
  const devIsLate = !devActual && devTarget && devTarget.getTime() < now.getTime()

  const riskFlags = []
  if (hasLateArtifacts) riskFlags.push('Late client artifacts')
  if (discoveryIsLate) riskFlags.push('Discovery past target date')
  if (devIsLate) riskFlags.push('Development past target release')

  const overallRisk =
    riskFlags.length === 0 ? 'on-track' : project.priority === 'high' ? 'at-risk' : 'watch'

  return {
    hasMissingArtifacts,
    hasLateArtifacts,
    discoveryIsLate,
    devIsLate,
    overallRisk,
    riskFlags,
    discoveryDaysLate:
      discoveryIsLate && discoveryTarget ? daysBetween(discoveryTarget, now) : null,
    devDaysLate: devIsLate && devTarget ? daysBetween(devTarget, now) : null,
  }
}

function RiskChip({ risk, size = 'md' }) {
  const label =
    risk === 'at-risk' ? 'At Risk' : risk === 'watch' ? 'Watch' : 'On Track'
  return (
    <span className={`risk-chip risk-${risk} risk-${size}`}>
      {label}
    </span>
  )
}

function StatusPill({ status }) {
  return <span className={`status-pill status-${status}`}>{STATUS_LABELS[status]}</span>
}

function ProjectCard({ project, onEdit, onDelete }) {
  const derived = useMemo(() => computeProjectDerived(project), [project])

  return (
    <article className="project-card">
      <header className="project-card__header">
        <div>
          <h2 className="project-card__title">
            <Link to={`/projects/${project.id}`}>{project.name}</Link>
          </h2>
          <p className="project-card__client">{project.client}</p>
        </div>
        <div className="project-card__header-right">
          <StatusPill status={project.status} />
          <RiskChip risk={derived.overallRisk} />
          <div className="project-card__actions">
            <button
              type="button"
              className="link-button"
              onClick={() => onEdit(project)}
            >
              Edit
            </button>
            <button
              type="button"
              className="link-button link-danger"
              onClick={() => onDelete(project)}
            >
              Delete
            </button>
          </div>
        </div>
      </header>

      <section className="project-card__section">
        <h3 className="section-title">Project Information</h3>
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
      </section>

      {project.discovery && (
        <section className="project-card__section">
          <h3 className="section-title">Discovery</h3>
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
                        <td>{a.name}</td>
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
              <p style={{ margin: 0, fontSize: '0.8rem', color: '#0f172a' }}>
                {project.discovery.notes}
              </p>
            </div>
          )}
        </section>
      )}

      {project.development && (
        <section className="project-card__section">
          <h3 className="section-title">Development</h3>
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
        </section>
      )}

      {derived.riskFlags.length > 0 && (
        <section className="project-card__section">
          <h3 className="section-title">Risks & Alerts</h3>
          <ul className="risk-list">
            {derived.riskFlags.map((flag) => (
              <li key={flag}>{flag}</li>
            ))}
          </ul>
        </section>
      )}

      {project.notes && (
        <section className="project-card__section">
          <h3 className="section-title">Notes</h3>
          <p>{project.notes}</p>
        </section>
      )}
    </article>
  )
}

function Filters({ filter, onChange }) {
  return (
    <div className="filters">
      <div className="filters-group">
        <span className="filters-label">Status</span>
        <div className="chip-group">
          {['all', 'discovery', 'development', 'on_hold'].map((key) => (
            <button
              key={key}
              type="button"
              className={`chip ${filter.status === key ? 'chip-active' : ''}`}
              onClick={() => onChange({ ...filter, status: key })}
            >
              {key === 'all' ? 'All' : STATUS_LABELS[key]}
            </button>
          ))}
        </div>
      </div>
      <div className="filters-group">
        <span className="filters-label">Risk</span>
        <div className="chip-group">
          {['all', 'on-track', 'watch', 'at-risk'].map((key) => (
            <button
              key={key}
              type="button"
              className={`chip ${filter.risk === key ? 'chip-active' : ''}`}
              onClick={() => onChange({ ...filter, risk: key })}
            >
              {key === 'all'
                ? 'All'
                : key === 'on-track'
                  ? 'On Track'
                  : key === 'watch'
                    ? 'Watch'
                    : 'At Risk'}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

function TimelineView({ projects }) {
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  // Calculate date range from all projects
  const allDates = []
  projects.forEach((project) => {
    if (project.discovery?.targetCompleteDate) {
      allDates.push(parseDate(project.discovery.targetCompleteDate))
    }
    if (project.discovery?.actualCompleteDate) {
      allDates.push(parseDate(project.discovery.actualCompleteDate))
    }
    if (project.development?.startDate) {
      allDates.push(parseDate(project.development.startDate))
    }
    if (project.development?.targetReleaseDate) {
      allDates.push(parseDate(project.development.targetReleaseDate))
    }
    if (project.development?.actualReleaseDate) {
      allDates.push(parseDate(project.development.actualReleaseDate))
    }
  })

  const validDates = allDates.filter((d) => d !== null)
  if (validDates.length === 0) {
    return (
      <div>
        <header className="app-header">
          <div>
            <h1>Project Timeline</h1>
            <p className="subtitle">Visual timeline of all projects and milestones</p>
          </div>
        </header>
        <p className="muted">No projects with dates to display on timeline.</p>
      </div>
    )
  }

  const minDate = new Date(Math.min(...validDates.map((d) => d.getTime())))
  const maxDate = new Date(Math.max(...validDates.map((d) => d.getTime())))
  
  // Extend range by 30 days on each side for better visibility
  minDate.setDate(minDate.getDate() - 30)
  maxDate.setDate(maxDate.getDate() + 30)

  const totalDays = Math.ceil((maxDate.getTime() - minDate.getTime()) / (1000 * 60 * 60 * 24))
  const months = []
  const currentDate = new Date(minDate)
  while (currentDate <= maxDate) {
    months.push(new Date(currentDate))
    currentDate.setMonth(currentDate.getMonth() + 1)
  }

  function getDatePosition(date) {
    if (!date) return null
    const parsed = parseDate(date)
    if (!parsed) return null
    const daysFromStart = Math.ceil((parsed.getTime() - minDate.getTime()) / (1000 * 60 * 60 * 24))
    return (daysFromStart / totalDays) * 100
  }

  function formatDate(dateStr) {
    if (!dateStr) return ''
    const d = parseDate(dateStr)
    if (!d) return ''
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  }

  return (
    <div>
      <header className="app-header">
        <div>
          <h1>Project Timeline</h1>
          <p className="subtitle">
            Visual timeline of all projects showing discovery, development, and release milestones
          </p>
        </div>
      </header>

      <div className="timeline-container">
        <div className="timeline-header">
          <div className="timeline-header-left">Project</div>
          <div className="timeline-header-right">
            <div className="timeline-months">
              {months.map((month, idx) => (
                <div key={idx} className="timeline-month">
                  {month.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="timeline-content">
          {projects.map((project) => {
            const derived = computeProjectDerived(project)
            const discoveryStart = getDatePosition(project.discovery?.targetCompleteDate)
            const discoveryEnd = getDatePosition(project.discovery?.actualCompleteDate)
            const devStart = getDatePosition(project.development?.startDate)
            const devTarget = getDatePosition(project.development?.targetReleaseDate)
            const devActual = getDatePosition(project.development?.actualReleaseDate)

            return (
              <div key={project.id} className="timeline-row">
                <div className="timeline-row-label">
                  <Link to={`/projects/${project.id}`} className="timeline-project-link">
                    {project.name}
                  </Link>
                  <div className="timeline-row-meta">
                    <StatusPill status={project.status} />
                    <RiskChip risk={derived.overallRisk} size="sm" />
                  </div>
                </div>
                <div className="timeline-row-track">
                  <div className="timeline-track">
                    {discoveryStart !== null && (
                      <div
                        className="timeline-milestone timeline-discovery"
                        style={{ left: `${discoveryStart}%` }}
                        title={`Discovery target: ${formatDate(project.discovery?.targetCompleteDate)}`}
                      >
                        <div className="timeline-milestone-dot" />
                        <div className="timeline-milestone-label">Discovery Target</div>
                      </div>
                    )}
                    {discoveryEnd !== null && (
                      <div
                        className="timeline-milestone timeline-discovery-complete"
                        style={{ left: `${discoveryEnd}%` }}
                        title={`Discovery complete: ${formatDate(project.discovery?.actualCompleteDate)}`}
                      >
                        <div className="timeline-milestone-dot" />
                        <div className="timeline-milestone-label">Discovery Done</div>
                      </div>
                    )}
                    {devStart !== null && (
                      <div
                        className="timeline-milestone timeline-dev-start"
                        style={{ left: `${devStart}%` }}
                        title={`Dev start: ${formatDate(project.development?.startDate)}`}
                      >
                        <div className="timeline-milestone-dot" />
                        <div className="timeline-milestone-label">Dev Start</div>
                      </div>
                    )}
                    {devTarget !== null && (
                      <div
                        className="timeline-milestone timeline-dev-target"
                        style={{ left: `${devTarget}%` }}
                        title={`Release target: ${formatDate(project.development?.targetReleaseDate)}`}
                      >
                        <div className="timeline-milestone-dot" />
                        <div className="timeline-milestone-label">Release Target</div>
                      </div>
                    )}
                    {devActual !== null && (
                      <div
                        className="timeline-milestone timeline-dev-complete"
                        style={{ left: `${devActual}%` }}
                        title={`Released: ${formatDate(project.development?.actualReleaseDate)}`}
                      >
                        <div className="timeline-milestone-dot" />
                        <div className="timeline-milestone-label">Released</div>
                      </div>
                    )}
                    {(() => {
                      const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`
                      const todayPos = getDatePosition(todayStr)
                      return todayPos !== null && (
                        <div
                          className="timeline-today"
                          style={{ left: `${todayPos}%` }}
                          title="Today"
                        >
                          <div className="timeline-today-line" />
                        </div>
                      )
                    })()}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

function ProjectDetails({ projects }) {
  const { id } = useParams()
  const navigate = useNavigate()
  const project = projects.find((p) => p.id === id)

  if (!project) {
    return (
      <div className="details-shell">
        <button type="button" className="ghost-button" onClick={() => navigate(-1)}>
          ← Back
        </button>
        <p className="muted" style={{ marginTop: '1rem' }}>
          Project not found.
        </p>
      </div>
    )
  }

  const derived = computeProjectDerived(project)

  return (
    <div className="details-shell">
      <button type="button" className="ghost-button" onClick={() => navigate(-1)}>
        ← Back to overview
      </button>
      <header className="details-header">
        <div>
          <h1>{project.name}</h1>
          <p className="subtitle">
            {project.client} · {STATUS_LABELS[project.status]} ·{' '}
            {PRIORITY_LABELS[project.priority]} priority
          </p>
        </div>
        <div className="details-header-right">
          <StatusPill status={project.status} />
          <RiskChip risk={derived.overallRisk} />
        </div>
      </header>

      <section className="details-section">
        <h3 className="section-title">Timeline</h3>
        <dl className="summary-grid">
          <div>
            <dt>Discovery target</dt>
            <dd>{project.discovery?.targetCompleteDate || '—'}</dd>
          </div>
          <div>
            <dt>Discovery complete</dt>
            <dd>{project.discovery?.actualCompleteDate || '—'}</dd>
          </div>
          <div>
            <dt>Dev start</dt>
            <dd>{project.development?.startDate || '—'}</dd>
          </div>
          <div>
            <dt>Dev target release</dt>
            <dd>{project.development?.targetReleaseDate || '—'}</dd>
          </div>
          <div>
            <dt>Release</dt>
            <dd>{project.development?.actualReleaseDate || '—'}</dd>
          </div>
        </dl>
      </section>

      {project.discovery && (
        <section className="details-section">
          <h3 className="section-title">Discovery artifacts</h3>
          {project.discovery.requiredArtifacts?.length ? (
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
                      <td>{a.name}</td>
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
          ) : (
            <p className="muted">No tracked artifacts for discovery.</p>
          )}
          {project.discovery.notes && (
            <div style={{ marginTop: '0.75rem' }}>
              <h4 style={{ fontSize: '0.75rem', color: '#64748b', margin: '0 0 0.3rem' }}>
                Discovery notes
              </h4>
              <p style={{ margin: 0, fontSize: '0.8rem', color: '#0f172a' }}>
                {project.discovery.notes}
              </p>
            </div>
          )}
        </section>
      )}

      {derived.riskFlags.length > 0 && (
        <section className="details-section">
          <h3 className="section-title">Risks and alerts</h3>
          <ul className="risk-list">
            {derived.riskFlags.map((flag) => (
              <li key={flag}>{flag}</li>
            ))}
          </ul>
        </section>
      )}

      {project.notes && (
        <section className="details-section">
          <h3 className="section-title">Notes</h3>
          <p>{project.notes}</p>
        </section>
      )}
    </div>
  )
}

function ProjectEditor({ open, initialProject, onSave, onCancel, onDelete }) {
  const isEditing = Boolean(initialProject?.id)
  const [form, setForm] = useState(() => ({
    id: initialProject?.id ?? null,
    name: initialProject?.name ?? '',
    client: initialProject?.client ?? '',
    status: initialProject?.status ?? 'discovery',
    priority: initialProject?.priority ?? 'medium',
    discoveryTargetCompleteDate:
      initialProject?.discovery?.targetCompleteDate ?? '',
    discoveryActualCompleteDate:
      initialProject?.discovery?.actualCompleteDate ?? '',
    discoveryNotes: initialProject?.discovery?.notes ?? '',
    devStartDate: initialProject?.development?.startDate ?? '',
    devTargetReleaseDate: initialProject?.development?.targetReleaseDate ?? '',
    devActualReleaseDate: initialProject?.development?.actualReleaseDate ?? '',
    onHoldReason: initialProject?.onHoldReason ?? '',
    notes: initialProject?.notes ?? '',
  }))

  useEffect(() => {
    setForm({
      id: initialProject?.id ?? null,
      name: initialProject?.name ?? '',
      client: initialProject?.client ?? '',
      status: initialProject?.status ?? 'discovery',
      priority: initialProject?.priority ?? 'medium',
      discoveryTargetCompleteDate:
        initialProject?.discovery?.targetCompleteDate ?? '',
      discoveryActualCompleteDate:
        initialProject?.discovery?.actualCompleteDate ?? '',
      discoveryNotes: initialProject?.discovery?.notes ?? '',
      devStartDate: initialProject?.development?.startDate ?? '',
      devTargetReleaseDate: initialProject?.development?.targetReleaseDate ?? '',
      devActualReleaseDate: initialProject?.development?.actualReleaseDate ?? '',
      onHoldReason: initialProject?.onHoldReason ?? '',
      notes: initialProject?.notes ?? '',
    })
  }, [initialProject])

  if (!open) return null

  function handleChange(e) {
    const { name, value } = e.target
    setForm((prev) => ({ ...prev, [name]: value }))
  }

  function handleSubmit(e) {
    e.preventDefault()
    if (!form.name.trim()) return
    const result = {
      id: form.id,
      name: form.name.trim(),
      client: form.client.trim(),
      status: form.status,
      priority: form.priority,
      onHoldReason: form.status === 'on_hold' ? form.onHoldReason.trim() : '',
      notes: form.notes.trim(),
      discovery: {
        ...(initialProject?.discovery || {}),
        targetCompleteDate: form.discoveryTargetCompleteDate || null,
        actualCompleteDate: form.discoveryActualCompleteDate || null,
        notes: form.discoveryNotes.trim() || null,
      },
      development: {
        ...(initialProject?.development || {}),
        startDate: form.devStartDate || null,
        targetReleaseDate: form.devTargetReleaseDate || null,
        actualReleaseDate: form.devActualReleaseDate || null,
      },
    }
    onSave(result)
  }

  return (
    <div className="editor-overlay">
      <div className="editor-panel">
        <header className="editor-header">
          <div>
            <h2>{isEditing ? 'Edit project' : 'Add new project'}</h2>
            <p className="editor-subtitle">
              Capture key tracking fields; automation will update risk and status.
            </p>
          </div>
          <button type="button" className="ghost-button" onClick={onCancel}>
            Close
          </button>
        </header>

        <form className="editor-form" onSubmit={handleSubmit}>
          <div className="form-grid">
            <label>
              <span>Project name *</span>
              <input
                name="name"
                value={form.name}
                onChange={handleChange}
                required
              />
            </label>
            <label>
              <span>Client</span>
              <input
                name="client"
                value={form.client}
                onChange={handleChange}
              />
            </label>
            <label>
              <span>Status</span>
              <select
                name="status"
                value={form.status}
                onChange={handleChange}
              >
                <option value="discovery">In Discovery</option>
                <option value="development">In Development</option>
                <option value="on_hold">On Hold</option>
              </select>
            </label>
            <label>
              <span>Priority</span>
              <select
                name="priority"
                value={form.priority}
                onChange={handleChange}
              >
                <option value="high">High</option>
                <option value="medium">Medium</option>
                <option value="low">Low</option>
              </select>
            </label>
            <label>
              <span>Discovery target complete</span>
              <input
                type="date"
                name="discoveryTargetCompleteDate"
                value={form.discoveryTargetCompleteDate}
                onChange={handleChange}
              />
            </label>
            <label>
              <span>Discovery actual complete</span>
              <input
                type="date"
                name="discoveryActualCompleteDate"
                value={form.discoveryActualCompleteDate}
                onChange={handleChange}
              />
            </label>
          </div>
          <label className="notes-field">
            <span>Discovery notes</span>
            <textarea
              name="discoveryNotes"
              rows={3}
              value={form.discoveryNotes}
              onChange={handleChange}
              placeholder="Add notes about discovery phase, requirements, findings, etc."
            />
          </label>
          <div className="form-grid">
            <label>
              <span>Development start date</span>
              <input
                type="date"
                name="devStartDate"
                value={form.devStartDate}
                onChange={handleChange}
              />
            </label>
            <label>
              <span>Development target release</span>
              <input
                type="date"
                name="devTargetReleaseDate"
                value={form.devTargetReleaseDate}
                onChange={handleChange}
              />
            </label>
            <label>
              <span>Development actual release</span>
              <input
                type="date"
                name="devActualReleaseDate"
                value={form.devActualReleaseDate}
                onChange={handleChange}
              />
            </label>
            <label>
              <span>On hold reason (if on hold)</span>
              <input
                name="onHoldReason"
                value={form.onHoldReason}
                onChange={handleChange}
                placeholder="Waiting for client prioritisation"
              />
            </label>
          </div>
          <label className="notes-field">
            <span>Notes</span>
            <textarea
              name="notes"
              rows={3}
              value={form.notes}
              onChange={handleChange}
            />
          </label>

          <footer className="editor-footer">
            <div className="editor-footer-left">
              {isEditing && (
                <button
                  type="button"
                  className="danger-button"
                  onClick={() => onDelete(initialProject)}
                >
                  Delete project
                </button>
              )}
            </div>
            <div className="editor-footer-right">
              <button
                type="button"
                className="ghost-button"
                onClick={onCancel}
              >
                Cancel
              </button>
              <button type="submit" className="primary-button">
                {isEditing ? 'Save changes' : 'Add project'}
              </button>
            </div>
          </footer>
        </form>
      </div>
    </div>
  )
}

function App() {
  const [projects, setProjects] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [filter, setFilter] = useState({
    status: 'all',
    risk: 'all',
  })
  const [editorOpen, setEditorOpen] = useState(false)
  const [editingProject, setEditingProject] = useState(null)
  const fileInputRef = useRef(null)

  // Initialize data service and load projects
  useEffect(() => {
    async function loadData() {
      setIsLoading(true)
      try {
        const loadedProjects = await dataService.initialize()
        setProjects(loadedProjects)
      } catch (error) {
        console.error('Failed to load projects:', error)
        setProjects([])
      } finally {
        setIsLoading(false)
      }
    }

    loadData()

    // Subscribe to data changes
    const unsubscribe = dataService.subscribe((updatedProjects) => {
      setProjects([...updatedProjects])
    })

    return () => {
      unsubscribe()
    }
  }, [])

  const projectsWithDerived = useMemo(
    () =>
      projects.map((p) => ({
        ...p,
        derived: computeProjectDerived(p),
      })),
    [projects],
  )

  const filtered = useMemo(
    () =>
      projectsWithDerived.filter((p) => {
        if (filter.status !== 'all' && p.status !== filter.status) return false
        if (filter.risk !== 'all' && p.derived.overallRisk !== filter.risk) return false
        return true
      }),
    [projectsWithDerived, filter],
  )

  function handleExport() {
    try {
      const jsonString = dataService.exportToJSON()
      const blob = new Blob([jsonString], {
        type: 'application/json',
      })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `projects-export-${new Date().toISOString().split('T')[0]}.json`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    } catch (error) {
      console.error('Export failed:', error)
      alert('Failed to export projects. Please try again.')
    }
  }

  function handleImportClick() {
    if (fileInputRef.current) {
      fileInputRef.current.click()
    }
  }

  function handleImportChange(event) {
    const file = event.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = () => {
      try {
        dataService.importFromJSON(reader.result)
        alert('Projects imported successfully!')
      } catch (error) {
        console.error('Import failed:', error)
        alert(`Failed to import: ${error.message}`)
      } finally {
        event.target.value = ''
      }
    }
    reader.onerror = () => {
      alert('Failed to read file. Please try again.')
      event.target.value = ''
    }
    reader.readAsText(file)
  }

  function handleEdit(project) {
    setEditingProject(project)
    setEditorOpen(true)
  }

  function handleDelete(project) {
    if (!window.confirm(`Delete project "${project.name}"? This action cannot be undone.`)) {
      return
    }
    try {
      dataService.deleteProject(project.id)
      setEditorOpen(false)
    } catch (error) {
      console.error('Delete failed:', error)
      alert(`Failed to delete project: ${error.message}`)
    }
  }

  function handleSave(projectInput) {
    try {
      if (projectInput.id) {
        // Update existing project
        dataService.updateProject(projectInput.id, projectInput)
      } else {
        // Create new project
        dataService.createProject(projectInput)
      }
      setEditorOpen(false)
      setEditingProject(null)
    } catch (error) {
      console.error('Save failed:', error)
      alert(`Failed to save project: ${error.message}`)
    }
  }

  return (
    <div className="app-shell">
      <div className="app-layout">
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
            <NavLink
              to="/projects/new"
              className={({ isActive }) =>
                `sidebar-link ${isActive ? 'sidebar-link-active' : ''}`
              }
            >
              Add new project
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
            <span className="sidebar-counter">{projects.length} projects</span>
          </div>
        </aside>

        <main className="app-main">
          {isLoading ? (
            <div style={{ padding: '2rem', textAlign: 'center' }}>
              <p className="muted">Loading projects...</p>
            </div>
          ) : (
            <Routes>
            <Route path="/" element={<Navigate to="/overview" replace />} />
            <Route
              path="/overview"
              element={
                <>
                  <header className="app-header">
                    <div>
                      <h1>Portfolio overview</h1>
                      <p className="subtitle">
                        Live view of discovery, development, and on-hold work with risks
                        highlighted.
                      </p>
                    </div>
                  </header>

                  <Filters filter={filter} onChange={setFilter} />

                  <section className="projects-grid">
                    {filtered.length === 0 ? (
                      <p className="muted">No projects match the current filters.</p>
                    ) : (
                      filtered.map((project) => (
                        <ProjectCard
                          key={project.id}
                          project={project}
                          onEdit={handleEdit}
                          onDelete={handleDelete}
                        />
                      ))
                    )}
                  </section>
                </>
              }
            />
            <Route
              path="/discovery"
              element={
                <>
                  <header className="app-header">
                    <div>
                      <h1>Discovery pipeline</h1>
                      <p className="subtitle">
                        Projects currently in discovery, with artifact readiness and delays.
                      </p>
                    </div>
                  </header>
                  <section className="projects-grid">
                    {projectsWithDerived.filter((p) => p.status === 'discovery').length ===
                    0 ? (
                      <p className="muted">No projects in discovery.</p>
                    ) : (
                      projectsWithDerived
                        .filter((p) => p.status === 'discovery')
                        .map((project) => (
                          <ProjectCard
                            key={project.id}
                            project={project}
                            onEdit={handleEdit}
                            onDelete={handleDelete}
                          />
                        ))
                    )}
                  </section>
                </>
              }
            />
            <Route
              path="/development"
              element={
                <>
                  <header className="app-header">
                    <div>
                      <h1>Development</h1>
                      <p className="subtitle">
                        Active build and release work, with focus on upcoming target dates.
                      </p>
                    </div>
                  </header>
                  <section className="projects-grid">
                    {projectsWithDerived.filter((p) => p.status === 'development').length ===
                    0 ? (
                      <p className="muted">No projects in development.</p>
                    ) : (
                      projectsWithDerived
                        .filter((p) => p.status === 'development')
                        .map((project) => (
                          <ProjectCard
                            key={project.id}
                            project={project}
                            onEdit={handleEdit}
                            onDelete={handleDelete}
                          />
                        ))
                    )}
                  </section>
                </>
              }
            />
            <Route
              path="/on-hold"
              element={
                <>
                  <header className="app-header">
                    <div>
                      <h1>On-hold projects</h1>
                      <p className="subtitle">
                        Initiatives paused due to client priority or missing inputs.
                      </p>
                    </div>
                  </header>
                  <section className="projects-grid">
                    {projectsWithDerived.filter((p) => p.status === 'on_hold').length ===
                    0 ? (
                      <p className="muted">No projects currently on hold.</p>
                    ) : (
                      projectsWithDerived
                        .filter((p) => p.status === 'on_hold')
                        .map((project) => (
                          <ProjectCard
                            key={project.id}
                            project={project}
                            onEdit={handleEdit}
                            onDelete={handleDelete}
                          />
                        ))
                    )}
                  </section>
                </>
              }
            />
            <Route
              path="/timeline"
              element={<TimelineView projects={projectsWithDerived} />}
            />
            <Route
              path="/projects"
              element={
                <section className="manage-view">
                  <header className="app-header">
                    <div>
                      <h1>All projects</h1>
                      <p className="subtitle">
                        Structured list for quick edits, clean-up, and navigation to details.
                      </p>
                    </div>
                    <Link to="/projects/new" className="primary-button primary-small">
                      + Add project
                    </Link>
                  </header>

                  <div className="manage-table-wrapper">
                    <table className="manage-table">
                      <thead>
                        <tr>
                          <th>Project</th>
                          <th>Client</th>
                          <th>Status</th>
                          <th>Priority</th>
                          <th>Dev target</th>
                          <th>Risk</th>
                          <th />
                        </tr>
                      </thead>
                      <tbody>
                        {projectsWithDerived.map((p) => (
                          <tr key={p.id}>
                            <td>
                              <Link to={`/projects/${p.id}`}>{p.name}</Link>
                            </td>
                            <td>{p.client}</td>
                            <td>{STATUS_LABELS[p.status]}</td>
                            <td>{PRIORITY_LABELS[p.priority]}</td>
                            <td>{p.development?.targetReleaseDate || '—'}</td>
                            <td>
                              <RiskChip risk={p.derived.overallRisk} size="md" />
                            </td>
                            <td className="manage-actions">
                              <button
                                type="button"
                                className="link-button"
                                onClick={() => handleEdit(p)}
                              >
                                Edit
                              </button>
                              <button
                                type="button"
                                className="link-button link-danger"
                                onClick={() => handleDelete(p)}
                              >
                                Delete
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    {projectsWithDerived.length === 0 && (
                      <p className="muted">
                        No projects yet — add your first project to get started.
                      </p>
                    )}
                  </div>
                </section>
              }
            />
            <Route
              path="/projects/new"
              element={
                <section className="create-view">
                  <header className="app-header">
                    <div>
                      <h1>Add new project</h1>
                      <p className="subtitle">
                        Capture a new initiative, targets, and notes. You can refine details
                        later.
                      </p>
                    </div>
                  </header>

                  <div className="create-panel">
                    <ProjectEditor
                      open
                      initialProject={null}
                      onSave={handleSave}
                      onCancel={() => window.history.back()}
                      onDelete={handleDelete}
                    />
                  </div>
                </section>
              }
            />
            <Route
              path="/projects/:id"
              element={<ProjectDetails projects={projects} />}
            />
            <Route
              path="/settings"
              element={
                <section className="settings-view">
                  <header className="app-header">
                    <div>
                      <h1>Data & settings</h1>
                      <p className="subtitle">
                        Export and import your portfolio JSON data to keep a single source of
                        truth.
                      </p>
                    </div>
                  </header>

                  <div className="settings-card">
                    <h2 className="settings-title">Portfolio data (JSON)</h2>
                    <p className="settings-text">
                      <strong>Data persistence:</strong> All changes are automatically saved to your
                      browser's local storage and persist across page refreshes. The app loads from
                      localStorage first, then falls back to the bundled <code>projects.json</code>{' '}
                      file if no saved data exists.
                    </p>
                    <p className="settings-text" style={{ marginTop: '0.75rem' }}>
                      <strong>Export/Import:</strong> Use export to download your current portfolio
                      as a JSON file. Use import to replace your current data with a JSON file. This
                      allows you to maintain a JSON file as your source of truth and sync it with
                      the app.
                    </p>
                    <div className="settings-actions">
                      <button
                        type="button"
                        className="primary-button"
                        onClick={handleExport}
                      >
                        Export JSON
                      </button>
                      <button
                        type="button"
                        className="ghost-button"
                        onClick={handleImportClick}
                      >
                        Import JSON
                      </button>
                      <input
                        type="file"
                        accept="application/json"
                        ref={fileInputRef}
                        onChange={handleImportChange}
                        style={{ display: 'none' }}
                      />
                    </div>
                  </div>
                </section>
              }
            />
          </Routes>
          )}

          <ProjectEditor
            open={editorOpen}
            initialProject={editingProject}
            onSave={handleSave}
            onCancel={() => setEditorOpen(false)}
            onDelete={handleDelete}
          />
        </main>
      </div>
    </div>
  )
}

export default App
