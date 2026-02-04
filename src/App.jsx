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
import ReactQuill from 'react-quill'
import 'react-quill/dist/quill.snow.css'
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragOverlay,
} from '@dnd-kit/core'
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import './App.css'
import dataService from './services/dataService'

const STATUS_LABELS = {
  discovery: 'In Discovery',
  development: 'In Development',
  on_hold: 'On Hold',
  completed: 'Completed',
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

function RichTextEditor({ label, value, onChange, placeholder }) {
  const modules = useMemo(
    () => ({
      toolbar: [
        ['bold', 'italic', 'underline'],
        [{ list: 'bullet' }, { list: 'ordered' }],
        ['clean'],
      ],
    }),
    [],
  )

  return (
    <label className="notes-field">
      <span>{label}</span>
      <div className="rte-quill">
        <ReactQuill
          theme="snow"
          value={value || ''}
          onChange={onChange}
          placeholder={placeholder}
          modules={modules}
        />
      </div>
    </label>
  )
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

function SortableProjectCard({ project, onEdit, onDelete, isDragging: externalIsDragging }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging: isSortableDragging,
    isOver,
  } = useSortable({
    id: project.id,
  })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition: isSortableDragging ? 'none' : transition,
    opacity: isSortableDragging ? 0.3 : isOver ? 0.8 : 1,
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`sortable-item ${isSortableDragging ? 'sortable-item-dragging' : ''} ${isOver ? 'sortable-item-over' : ''}`}
    >
      <ProjectCard
        project={project}
        onEdit={onEdit}
        onDelete={onDelete}
        dragHandleProps={{ ...attributes, ...listeners }}
        isDragging={isSortableDragging}
      />
    </div>
  )
}

function SortableTableRow({ project, onEdit, onDelete }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: project.id,
  })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

  return (
    <tr ref={setNodeRef} style={style}>
      <td>
        <div
          {...attributes}
          {...listeners}
          style={{
            cursor: 'grab',
            display: 'inline-flex',
            alignItems: 'center',
            padding: '0.2rem 0.4rem',
            marginRight: '0.5rem',
            color: '#94a3b8',
            borderRadius: '0.3rem',
            transition: 'background 0.15s ease, color 0.15s ease',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'rgba(79, 70, 229, 0.1)'
            e.currentTarget.style.color = '#4f46e5'
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'transparent'
            e.currentTarget.style.color = '#94a3b8'
          }}
          title="Drag to reorder"
        >
          <svg
            width="16"
            height="16"
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
        <Link to={`/projects/${project.id}`}>{project.name}</Link>
      </td>
      <td>{project.client}</td>
      <td>{STATUS_LABELS[project.status]}</td>
      <td>{PRIORITY_LABELS[project.priority]}</td>
      <td>{project.development?.targetReleaseDate || '—'}</td>
      <td>
        <RiskChip risk={project.derived.overallRisk} size="md" />
      </td>
      <td className="manage-actions">
        <button
          type="button"
          className="icon-button"
          onClick={() => onEdit(project)}
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
          onClick={() => onDelete(project)}
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
      </td>
    </tr>
  )
}

function ProjectCard({ project, onEdit, onDelete, dragHandleProps, isDragging }) {
  const derived = useMemo(() => computeProjectDerived(project), [project])

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
                  // Trigger drag start on keyboard activation
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
        <p className="project-card__client">{project.client}</p>
        <div className="project-card__meta-row">
          <div className="project-card__meta-left">
            <StatusPill status={project.status} />
            <RiskChip risk={derived.overallRisk} />
          </div>
          <div className="project-card__meta-right">
            <div className="project-card__actions">
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
              <div
                className="rich-text"
                // eslint-disable-next-line react/no-danger
                dangerouslySetInnerHTML={{ __html: project.discovery.notes }}
              />
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
          <div
            className="rich-text"
            // eslint-disable-next-line react/no-danger
            dangerouslySetInnerHTML={{ __html: project.notes }}
          />
        </section>
      )}
    </article>
  )
}

function Filters({ filter, onChange, projects, projectsWithDerived, filteredCount }) {
  // Calculate counts for each filter option
  const statusCounts = useMemo(() => {
    const counts = { all: projects.length }
    projects.forEach((p) => {
      counts[p.status] = (counts[p.status] || 0) + 1
    })
    return counts
  }, [projects])

  const riskCounts = useMemo(() => {
    const counts = { all: projectsWithDerived.length }
    projectsWithDerived.forEach((p) => {
      const risk = p.derived?.overallRisk || 'on-track'
      counts[risk] = (counts[risk] || 0) + 1
    })
    return counts
  }, [projectsWithDerived])

  const hasActiveFilters = filter.status !== 'all' || filter.risk !== 'all'

  const handleClearFilters = () => {
    onChange({ status: 'all', risk: 'all' })
  }

  return (
    <div className="filters">
      <div className="filters-header">
        <div className="filters-title">
          <svg
            width="18"
            height="18"
            viewBox="0 0 18 18"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            aria-hidden="true"
          >
            <path
              d="M2 4h14M5 9h8M7 14h4"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
            />
          </svg>
          <span>Filter Projects</span>
        </div>
        {hasActiveFilters && (
          <button
            type="button"
            className="filter-clear-button"
            onClick={handleClearFilters}
            aria-label="Clear all filters"
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
                d="M12 4L4 12M4 4l8 8"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              />
            </svg>
            Clear filters
          </button>
        )}
      </div>

      <div className="filters-content">
        <div className="filters-group">
          <span className="filters-label">
            <svg
              width="14"
              height="14"
              viewBox="0 0 14 14"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              aria-hidden="true"
            >
              <circle cx="7" cy="7" r="6" stroke="currentColor" strokeWidth="1.5" />
              <path
                d="M7 3.5v3.5l2 2"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
              />
            </svg>
            Status
          </span>
          <div className="chip-group">
            {['all', 'discovery', 'development', 'on_hold', 'completed'].map((key) => {
              const count = statusCounts[key] || 0
              const isActive = filter.status === key
              return (
                <button
                  key={key}
                  type="button"
                  className={`chip chip-with-count ${isActive ? 'chip-active' : ''}`}
                  onClick={() => onChange({ ...filter, status: key })}
                  aria-pressed={isActive}
                >
                  <span className="chip-label">
                    {key === 'all' ? 'All' : STATUS_LABELS[key]}
                  </span>
                  <span className={`chip-count ${isActive ? 'chip-count-active' : ''}`}>
                    {count}
                  </span>
                </button>
              )
            })}
          </div>
        </div>

        <div className="filters-group">
          <span className="filters-label">
            <svg
              width="14"
              height="14"
              viewBox="0 0 14 14"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              aria-hidden="true"
            >
              <path
                d="M7 2L9 5.5L13 6L10 8.5L10.5 12.5L7 10.5L3.5 12.5L4 8.5L1 6L5 5.5L7 2Z"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                fill="none"
              />
            </svg>
            Risk Level
          </span>
          <div className="chip-group">
            {['all', 'on-track', 'watch', 'at-risk'].map((key) => {
              const count = riskCounts[key] || 0
              const isActive = filter.risk === key
              return (
                <button
                  key={key}
                  type="button"
                  className={`chip chip-with-count chip-risk-${key} ${isActive ? 'chip-active' : ''}`}
                  onClick={() => onChange({ ...filter, risk: key })}
                  aria-pressed={isActive}
                >
                  <span className="chip-label">
                    {key === 'all'
                      ? 'All'
                      : key === 'on-track'
                        ? 'On Track'
                        : key === 'watch'
                          ? 'Watch'
                          : 'At Risk'}
                  </span>
                  <span className={`chip-count ${isActive ? 'chip-count-active' : ''}`}>
                    {count}
                  </span>
                </button>
              )
            })}
          </div>
        </div>
      </div>

      {hasActiveFilters && (
        <div className="filters-summary">
          <span className="filters-summary-text">
            Showing {filteredCount} of {projects.length} projects
          </span>
        </div>
      )}
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

  // Calculate statistics
  const stats = {
    total: projects.length,
    inDiscovery: projects.filter(p => p.status === 'discovery').length,
    inDevelopment: projects.filter(p => p.status === 'development').length,
    completed: projects.filter(p => p.status === 'completed').length,
    atRisk: projects.filter(p => computeProjectDerived(p).overallRisk === 'at-risk').length,
    watch: projects.filter(p => computeProjectDerived(p).overallRisk === 'watch').length
  }

  return (
    <div>
      <header className="app-header">
        <div>
          <h1>Project Timeline</h1>
          <p className="subtitle">
            Visual timeline of {stats.total} project{stats.total !== 1 ? 's' : ''} showing discovery, development, and release milestones
          </p>
        </div>
      </header>

      <div className="timeline-stats">
        <div className="timeline-stat-card">
          <div className="timeline-stat-value">{stats.total}</div>
          <div className="timeline-stat-label">Total Projects</div>
        </div>
        <div className="timeline-stat-card">
          <div className="timeline-stat-value">{stats.inDiscovery}</div>
          <div className="timeline-stat-label">In Discovery</div>
        </div>
        <div className="timeline-stat-card">
          <div className="timeline-stat-value">{stats.inDevelopment}</div>
          <div className="timeline-stat-label">In Development</div>
        </div>
        <div className="timeline-stat-card">
          <div className="timeline-stat-value">{stats.completed}</div>
          <div className="timeline-stat-label">Completed</div>
        </div>
        <div className="timeline-stat-card timeline-stat-card-warning">
          <div className="timeline-stat-value">{stats.atRisk}</div>
          <div className="timeline-stat-label">At Risk</div>
        </div>
        <div className="timeline-stat-card timeline-stat-card-watch">
          <div className="timeline-stat-value">{stats.watch}</div>
          <div className="timeline-stat-label">Watch</div>
        </div>
      </div>

      <div className="timeline-legend">
        <h3 className="timeline-legend-title">Milestone Legend</h3>
        <div className="timeline-legend-items">
          <div className="timeline-legend-item">
            <div className="timeline-legend-dot timeline-legend-dot-discovery"></div>
            <span>Discovery Target</span>
          </div>
          <div className="timeline-legend-item">
            <div className="timeline-legend-dot timeline-legend-dot-discovery-complete"></div>
            <span>Discovery Complete</span>
          </div>
          <div className="timeline-legend-item">
            <div className="timeline-legend-dot timeline-legend-dot-dev-start"></div>
            <span>Dev Start</span>
          </div>
          <div className="timeline-legend-item">
            <div className="timeline-legend-dot timeline-legend-dot-dev-target"></div>
            <span>Release Target</span>
          </div>
          <div className="timeline-legend-item">
            <div className="timeline-legend-dot timeline-legend-dot-dev-complete"></div>
            <span>Released</span>
          </div>
          <div className="timeline-legend-item">
            <div className="timeline-legend-line"></div>
            <span>Today</span>
          </div>
        </div>
      </div>

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
                  <div className="timeline-row-client">{project.client}</div>
                  <div className="timeline-row-meta">
                    <StatusPill status={project.status} />
                    <RiskChip risk={derived.overallRisk} size="sm" />
                    <span className="timeline-priority-badge">{PRIORITY_LABELS[project.priority]}</span>
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

function ProjectDetails({ projects, onEdit, onDelete }) {
  const { id } = useParams()
  const navigate = useNavigate()
  const project = projects.find((p) => p.id === id)

  if (!project) {
    return (
      <div className="details-shell">
        <div className="details-nav">
          <button type="button" className="ghost-button ghost-small" onClick={() => navigate(-1)}>
            ← Back
          </button>
        </div>
        <p className="muted details-empty-state">
          Project not found.
        </p>
      </div>
    )
  }

  const derived = computeProjectDerived(project)

  return (
    <div className="details-shell">
      <div className="details-nav">
        <button type="button" className="ghost-button ghost-small" onClick={() => navigate(-1)}>
          ← Back
        </button>
      </div>

      <header className="details-header">
        <div className="details-header-left">
          <h1>{project.name}</h1>
          <div className="details-meta">
            <span className="details-meta-item">{project.client}</span>
            <StatusPill status={project.status} />
            <RiskChip risk={derived.overallRisk} />
            <span className="details-meta-badge">{PRIORITY_LABELS[project.priority]} priority</span>
          </div>
        </div>
        <div className="details-header-right">
          <button
            type="button"
            className="icon-button"
            onClick={() => onEdit(project)}
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
            onClick={() => onDelete(project)}
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
            <div className="details-subsection">
              <h4 className="details-subsection-title">
                Discovery notes
              </h4>
              <div
                className="rich-text"
                // eslint-disable-next-line react/no-danger
                dangerouslySetInnerHTML={{ __html: project.discovery.notes }}
              />
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
          <div
            className="rich-text"
            // eslint-disable-next-line react/no-danger
            dangerouslySetInnerHTML={{ __html: project.notes }}
          />
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
    discoveryRequiredArtifacts: initialProject?.discovery?.requiredArtifacts ?? [],
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
    discoveryRequiredArtifacts: initialProject?.discovery?.requiredArtifacts ?? [],
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

  function handleArtifactChange(index, field, value) {
    setForm((prev) => {
      const artifacts = [...(prev.discoveryRequiredArtifacts || [])]
      artifacts[index] = {
        ...artifacts[index],
        [field]: value,
      }
      return { ...prev, discoveryRequiredArtifacts: artifacts }
    })
  }

  function handleAddArtifact() {
    setForm((prev) => ({
      ...prev,
      discoveryRequiredArtifacts: [
        ...(prev.discoveryRequiredArtifacts || []),
        {
          id: `a-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
          name: '',
          owner: '',
          dueDate: '',
          receivedDate: null,
        },
      ],
    }))
  }

  function handleRemoveArtifact(index) {
    setForm((prev) => {
      const artifacts = [...(prev.discoveryRequiredArtifacts || [])]
      artifacts.splice(index, 1)
      return { ...prev, discoveryRequiredArtifacts: artifacts }
    })
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
      notes: form.notes?.trim?.() || form.notes || '',
      discovery: {
        ...(initialProject?.discovery || {}),
        targetCompleteDate: form.discoveryTargetCompleteDate || null,
        actualCompleteDate: form.discoveryActualCompleteDate || null,
        notes: form.discoveryNotes?.trim?.() || form.discoveryNotes || null,
        requiredArtifacts: (form.discoveryRequiredArtifacts || [])
          .filter((a) => a.name?.trim())
          .map((a) => ({
            ...a,
            name: a.name.trim(),
            owner: a.owner?.trim() || '',
            dueDate: a.dueDate || null,
            receivedDate: a.receivedDate || null,
          })),
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
                <option value="completed">Completed</option>
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
          <RichTextEditor
            label="Discovery notes"
            value={form.discoveryNotes}
            onChange={(html) => setForm((prev) => ({ ...prev, discoveryNotes: html }))}
            placeholder="Add notes about discovery phase, requirements, findings, etc."
          />
          <div style={{ marginTop: '0.5rem' }}>
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '0.3rem',
              }}
            >
              <span className="section-title">Discovery required artifacts</span>
              <button
                type="button"
                className="ghost-button ghost-small"
                onClick={handleAddArtifact}
              >
                + Add artifact
              </button>
            </div>
            {form.discoveryRequiredArtifacts?.length ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                {form.discoveryRequiredArtifacts.map((a, index) => (
                  <div key={a.id} className="artifact-editor-row">
                    <div style={{ display: 'flex', gap: '0.4rem', marginBottom: '0.25rem' }}>
                      <input
                        value={a.name || ''}
                        onChange={(e) =>
                          handleArtifactChange(index, 'name', e.target.value)
                        }
                        placeholder="Artifact name (e.g. Requirements doc)"
                        style={{ flex: 2 }}
                      />
                      <input
                        value={a.owner || ''}
                        onChange={(e) =>
                          handleArtifactChange(index, 'owner', e.target.value)
                        }
                        placeholder="Owner (e.g. Client)"
                        style={{ flex: 1 }}
                      />
                    </div>
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem',
                        fontSize: '0.75rem',
                      }}
                    >
                      <label style={{ display: 'flex', flexDirection: 'column', gap: '0.15rem' }}>
                        <span style={{ color: '#94a3b8' }}>Due date</span>
                        <input
                          type="date"
                          value={a.dueDate || ''}
                          onChange={(e) =>
                            handleArtifactChange(index, 'dueDate', e.target.value)
                          }
                        />
                      </label>
                      <label style={{ display: 'flex', flexDirection: 'column', gap: '0.15rem' }}>
                        <span style={{ color: '#94a3b8' }}>Received</span>
                        <input
                          type="date"
                          value={a.receivedDate || ''}
                          onChange={(e) =>
                            handleArtifactChange(index, 'receivedDate', e.target.value)
                          }
                        />
                      </label>
                      <button
                        type="button"
                        className="link-button link-danger"
                        onClick={() => handleRemoveArtifact(index)}
                        style={{ marginLeft: 'auto' }}
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="muted">No required artifacts added for discovery.</p>
            )}
          </div>
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
          <RichTextEditor
            label="Notes"
            value={form.notes}
            onChange={(html) => setForm((prev) => ({ ...prev, notes: html }))}
            placeholder="General project notes, decisions, blockers, context, etc."
          />

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
  const [activeId, setActiveId] = useState(null)
  const fileInputRef = useRef(null)

  // Drag and drop sensors with improved settings
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5, // Reduced distance for more responsive feel
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
      onActivation: (event) => {
        // Announce to screen readers
        const target = event.target.closest('[data-sortable-id]')
        if (target) {
          const projectName = target.querySelector('.project-card__title')?.textContent || 'project'
          // You could use a live region here for better accessibility
        }
      },
    })
  )

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

  // Get ordered projects for overview page
  const orderedProjects = useMemo(() => {
    // Create a map of current projects for quick lookup
    const projectMap = new Map(projects.map(p => [p.id, p]))
    
    // Get the custom order
    const order = dataService.getProjectOrder()
    if (order && order.length > 0) {
      // Sort by custom order, then append any projects not in the order
      const ordered = []
      const unordered = []
      
      order.forEach(id => {
        const project = projectMap.get(id)
        if (project) {
          ordered.push(project)
          projectMap.delete(id)
        }
      })
      
      // Add any projects not in the custom order
      projectMap.forEach(project => unordered.push(project))
      
      return [...ordered, ...unordered]
    }
    
    return projects
  }, [projects])

  const orderedProjectsWithDerived = useMemo(
    () =>
      orderedProjects.map((p) => ({
        ...p,
        derived: computeProjectDerived(p),
      })),
    [orderedProjects],
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

  // Filtered ordered projects for overview page (maintains custom order)
  const filteredOrdered = useMemo(() => {
    const orderedIds = orderedProjectsWithDerived.map((p) => p.id)
    const orderedMap = new Map(orderedProjectsWithDerived.map((p) => [p.id, p]))
    
    return orderedIds
      .map((id) => orderedMap.get(id))
      .filter((p) => {
        if (!p) return false
        if (filter.status !== 'all' && p.status !== filter.status) return false
        if (filter.risk !== 'all' && p.derived.overallRisk !== filter.risk) return false
        return true
      })
  }, [orderedProjectsWithDerived, filter])

  function handleDragStart(event) {
    setActiveId(event.active.id)
  }

  function handleDragEnd(event) {
    const { active, over } = event
    setActiveId(null)

    if (over && active.id !== over.id) {
      // Get current order from dataService
      const currentOrder = dataService.getProjectOrder()
      const orderedIds = currentOrder || orderedProjects.map((p) => p.id)
      
      // Find indices in the full ordered list
      const oldIndex = orderedIds.indexOf(active.id)
      const newIndex = orderedIds.indexOf(over.id)

      if (oldIndex !== -1 && newIndex !== -1) {
        const reordered = arrayMove(orderedIds, oldIndex, newIndex)
        
        // Update the order in dataService
        dataService.updateProjectOrder(reordered)
      }
    }
  }

  function handleDragCancel() {
    setActiveId(null)
  }

  // Get the active project for drag overlay
  const activeProject = activeId
    ? orderedProjectsWithDerived.find((p) => p.id === activeId)
    : null

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

  function handleAddNew() {
    setEditingProject(null)
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
                        highlighted. Use the drag handle to reorder projects.
                      </p>
                    </div>
                  </header>

                  <Filters 
                    filter={filter} 
                    onChange={setFilter}
                    projects={projects}
                    projectsWithDerived={orderedProjectsWithDerived}
                    filteredCount={filteredOrdered.length}
                  />

                  <DndContext
                    sensors={sensors}
                    collisionDetection={closestCenter}
                    onDragStart={handleDragStart}
                    onDragEnd={handleDragEnd}
                    onDragCancel={handleDragCancel}
                  >
                    <SortableContext
                      items={filteredOrdered.map((p) => p.id)}
                      strategy={verticalListSortingStrategy}
                    >
                      <section className="projects-grid">
                        {filteredOrdered.length === 0 ? (
                          <p className="muted">No projects match the current filters.</p>
                        ) : (
                          filteredOrdered.map((project) => (
                            <SortableProjectCard
                              key={project.id}
                              project={project}
                              onEdit={handleEdit}
                              onDelete={handleDelete}
                            />
                          ))
                        )}
                      </section>
                    </SortableContext>
                    <DragOverlay>
                      {activeProject ? (
                        <div className="drag-overlay-card">
                          <ProjectCard
                            project={activeProject}
                            onEdit={handleEdit}
                            onDelete={handleDelete}
                            isDragging={true}
                          />
                        </div>
                      ) : null}
                    </DragOverlay>
                  </DndContext>
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
                  <DndContext
                    sensors={sensors}
                    collisionDetection={closestCenter}
                    onDragStart={handleDragStart}
                    onDragEnd={handleDragEnd}
                    onDragCancel={handleDragCancel}
                  >
                    <SortableContext
                      items={orderedProjectsWithDerived.filter((p) => p.status === 'discovery').map((p) => p.id)}
                      strategy={verticalListSortingStrategy}
                    >
                      <section className="projects-grid">
                        {orderedProjectsWithDerived.filter((p) => p.status === 'discovery').length ===
                        0 ? (
                          <p className="muted">No projects in discovery.</p>
                        ) : (
                          orderedProjectsWithDerived
                            .filter((p) => p.status === 'discovery')
                            .map((project) => (
                              <SortableProjectCard
                                key={project.id}
                                project={project}
                                onEdit={handleEdit}
                                onDelete={handleDelete}
                              />
                            ))
                        )}
                      </section>
                    </SortableContext>
                    <DragOverlay>
                      {activeProject ? (
                        <div className="drag-overlay-card">
                          <ProjectCard
                            project={activeProject}
                            onEdit={handleEdit}
                            onDelete={handleDelete}
                          />
                        </div>
                      ) : null}
                    </DragOverlay>
                  </DndContext>
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
                  <DndContext
                    sensors={sensors}
                    collisionDetection={closestCenter}
                    onDragStart={handleDragStart}
                    onDragEnd={handleDragEnd}
                    onDragCancel={handleDragCancel}
                  >
                    <SortableContext
                      items={orderedProjectsWithDerived.filter((p) => p.status === 'development').map((p) => p.id)}
                      strategy={verticalListSortingStrategy}
                    >
                      <section className="projects-grid">
                        {orderedProjectsWithDerived.filter((p) => p.status === 'development').length ===
                        0 ? (
                          <p className="muted">No projects in development.</p>
                        ) : (
                          orderedProjectsWithDerived
                            .filter((p) => p.status === 'development')
                            .map((project) => (
                              <SortableProjectCard
                                key={project.id}
                                project={project}
                                onEdit={handleEdit}
                                onDelete={handleDelete}
                              />
                            ))
                        )}
                      </section>
                    </SortableContext>
                    <DragOverlay>
                      {activeProject ? (
                        <div className="drag-overlay-card">
                          <ProjectCard
                            project={activeProject}
                            onEdit={handleEdit}
                            onDelete={handleDelete}
                          />
                        </div>
                      ) : null}
                    </DragOverlay>
                  </DndContext>
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
                  <DndContext
                    sensors={sensors}
                    collisionDetection={closestCenter}
                    onDragStart={handleDragStart}
                    onDragEnd={handleDragEnd}
                    onDragCancel={handleDragCancel}
                  >
                    <SortableContext
                      items={orderedProjectsWithDerived.filter((p) => p.status === 'on_hold').map((p) => p.id)}
                      strategy={verticalListSortingStrategy}
                    >
                      <section className="projects-grid">
                        {orderedProjectsWithDerived.filter((p) => p.status === 'on_hold').length ===
                        0 ? (
                          <p className="muted">No projects currently on hold.</p>
                        ) : (
                          orderedProjectsWithDerived
                            .filter((p) => p.status === 'on_hold')
                            .map((project) => (
                              <SortableProjectCard
                                key={project.id}
                                project={project}
                                onEdit={handleEdit}
                                onDelete={handleDelete}
                              />
                            ))
                        )}
                      </section>
                    </SortableContext>
                    <DragOverlay>
                      {activeProject ? (
                        <div className="drag-overlay-card">
                          <ProjectCard
                            project={activeProject}
                            onEdit={handleEdit}
                            onDelete={handleDelete}
                          />
                        </div>
                      ) : null}
                    </DragOverlay>
                  </DndContext>
                </>
              }
            />
            <Route
              path="/completed"
              element={
                <>
                  <header className="app-header">
                    <div>
                      <h1>Completed projects</h1>
                      <p className="subtitle">
                        Successfully completed projects and delivered initiatives.
                      </p>
                    </div>
                  </header>
                  <DndContext
                    sensors={sensors}
                    collisionDetection={closestCenter}
                    onDragStart={handleDragStart}
                    onDragEnd={handleDragEnd}
                    onDragCancel={handleDragCancel}
                  >
                    <SortableContext
                      items={orderedProjectsWithDerived.filter((p) => p.status === 'completed').map((p) => p.id)}
                      strategy={verticalListSortingStrategy}
                    >
                      <section className="projects-grid">
                        {orderedProjectsWithDerived.filter((p) => p.status === 'completed').length ===
                        0 ? (
                          <p className="muted">No completed projects yet.</p>
                        ) : (
                          orderedProjectsWithDerived
                            .filter((p) => p.status === 'completed')
                            .map((project) => (
                              <SortableProjectCard
                                key={project.id}
                                project={project}
                                onEdit={handleEdit}
                                onDelete={handleDelete}
                              />
                            ))
                        )}
                      </section>
                    </SortableContext>
                    <DragOverlay>
                      {activeProject ? (
                        <div className="drag-overlay-card">
                          <ProjectCard
                            project={activeProject}
                            onEdit={handleEdit}
                            onDelete={handleDelete}
                          />
                        </div>
                      ) : null}
                    </DragOverlay>
                  </DndContext>
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
                    <button
                      onClick={handleAddNew}
                      className="primary-button primary-small"
                    >
                      + Add project
                    </button>
                  </header>

                  <DndContext
                    sensors={sensors}
                    collisionDetection={closestCenter}
                    onDragStart={handleDragStart}
                    onDragEnd={handleDragEnd}
                    onDragCancel={handleDragCancel}
                  >
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
                        <SortableContext
                          items={orderedProjectsWithDerived.map((p) => p.id)}
                          strategy={verticalListSortingStrategy}
                        >
                          <tbody>
                            {orderedProjectsWithDerived.map((p) => (
                              <SortableTableRow
                                key={p.id}
                                project={p}
                                onEdit={handleEdit}
                                onDelete={handleDelete}
                              />
                            ))}
                          </tbody>
                        </SortableContext>
                      </table>
                    </div>
                    {orderedProjectsWithDerived.length === 0 && (
                      <p className="muted">
                        No projects yet — add your first project to get started.
                      </p>
                    )}
                  </DndContext>
                </section>
              }
            />
            <Route
              path="/projects/:id"
              element={<ProjectDetails projects={projects} onEdit={handleEdit} onDelete={handleDelete} />}
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
