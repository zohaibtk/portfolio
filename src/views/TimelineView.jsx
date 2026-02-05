import { Link } from 'react-router-dom'
import { parseDate, computeProjectDerived, getAvatarColor, getInitials } from '../utils/projectUtils.js'
import { PRIORITY_LABELS } from '../constants.js'
import StatusPill from '../components/StatusPill.jsx'
import RiskChip from '../components/RiskChip.jsx'

export default function TimelineView({ projects }) {
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
    onHold: projects.filter(p => p.status === 'on_hold').length,
    completed: projects.filter(p => p.status === 'completed').length,
    atRisk: projects.filter(p => computeProjectDerived(p).overallRisk === 'at-risk').length
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
        <div className="timeline-stat-card timeline-stat-card-total">
          <div className="timeline-stat-icon timeline-stat-icon-total">
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none"><rect x="2" y="2" width="6" height="6" rx="1.5" fill="currentColor" opacity="0.7"/><rect x="10" y="2" width="6" height="6" rx="1.5" fill="currentColor" opacity="0.5"/><rect x="2" y="10" width="6" height="6" rx="1.5" fill="currentColor" opacity="0.5"/><rect x="10" y="10" width="6" height="6" rx="1.5" fill="currentColor" opacity="0.3"/></svg>
          </div>
          <div className="timeline-stat-value">{stats.total}</div>
          <div className="timeline-stat-label">Total Projects</div>
        </div>
        <div className="timeline-stat-card timeline-stat-card-discovery">
          <div className="timeline-stat-icon timeline-stat-icon-discovery">
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none"><circle cx="9" cy="9" r="6" stroke="currentColor" strokeWidth="1.8" fill="none"/><circle cx="9" cy="9" r="2.5" fill="currentColor"/></svg>
          </div>
          <div className="timeline-stat-value">{stats.inDiscovery}</div>
          <div className="timeline-stat-label">In Discovery</div>
        </div>
        <div className="timeline-stat-card timeline-stat-card-development">
          <div className="timeline-stat-icon timeline-stat-icon-development">
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none"><path d="M3 13l4-4 3 3 5-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none"/><circle cx="15" cy="6" r="2" fill="currentColor"/></svg>
          </div>
          <div className="timeline-stat-value">{stats.inDevelopment}</div>
          <div className="timeline-stat-label">In Development</div>
        </div>
        <div className="timeline-stat-card timeline-stat-card-onhold">
          <div className="timeline-stat-icon timeline-stat-icon-onhold">
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none"><rect x="4" y="3" width="3.5" height="12" rx="1.5" fill="currentColor"/><rect x="10.5" y="3" width="3.5" height="12" rx="1.5" fill="currentColor"/></svg>
          </div>
          <div className="timeline-stat-value">{stats.onHold}</div>
          <div className="timeline-stat-label">On Hold</div>
        </div>
        <div className="timeline-stat-card timeline-stat-card-completed">
          <div className="timeline-stat-icon timeline-stat-icon-completed">
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none"><circle cx="9" cy="9" r="6" stroke="currentColor" strokeWidth="1.8" fill="none"/><path d="M6 9l2 2 4-4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none"/></svg>
          </div>
          <div className="timeline-stat-value">{stats.completed}</div>
          <div className="timeline-stat-label">Completed</div>
        </div>
        <div className="timeline-stat-card timeline-stat-card-warning">
          <div className="timeline-stat-icon timeline-stat-icon-warning">
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none"><path d="M9 3L2 15h14L9 3z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" fill="none"/><path d="M9 8v3.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/><circle cx="9" cy="13" r="0.9" fill="currentColor"/></svg>
          </div>
          <div className="timeline-stat-value">{stats.atRisk}</div>
          <div className="timeline-stat-label">At Risk</div>
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
            <div className="timeline-legend-dot timeline-legend-dot-onhold"></div>
            <span>On Hold</span>
          </div>
          <div className="timeline-legend-item">
            <div className="timeline-legend-bar timeline-legend-bar-discovery"></div>
            <span>Discovery Phase</span>
          </div>
          <div className="timeline-legend-item">
            <div className="timeline-legend-bar timeline-legend-bar-dev"></div>
            <span>Dev Phase</span>
          </div>
          <div className="timeline-legend-item">
            <div className="timeline-legend-line"></div>
            <span>Today</span>
          </div>
        </div>
      </div>

      <div className="timeline-container" style={{ '--timeline-months': months.length }}>
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
              <div key={project.id} className={`timeline-row timeline-row-status-${project.status}`}>
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
                  {project.teamMembers?.length > 0 && (
                    <div className="timeline-avatars">
                      {project.teamMembers.slice(0, 3).map((m) => (
                        <div
                          key={m.id}
                          className="avatar avatar-xs"
                          style={{ background: getAvatarColor(m.name) }}
                          title={`${m.name}${m.role ? ` — ${m.role}` : ''}`}
                          data-tooltip={`${m.name}${m.role ? ` — ${m.role}` : ''}`}
                        >
                          {getInitials(m.name)}
                        </div>
                      ))}
                      {project.teamMembers.length > 3 && (
                        <div className="avatar avatar-xs avatar-overflow">
                          +{project.teamMembers.length - 3}
                        </div>
                      )}
                    </div>
                  )}
                  {project.status === 'on_hold' && project.onHoldReason && (
                    <div className="timeline-onhold-reason">{project.onHoldReason}</div>
                  )}
                </div>
                <div className="timeline-row-track">
                  <div className="timeline-track">
                    {discoveryStart !== null && discoveryEnd !== null && (() => {
                      const barStart = Math.min(discoveryStart, discoveryEnd)
                      const width = Math.abs(discoveryEnd - discoveryStart)
                      return width > 0 ? (
                        <div className="timeline-phase-bar timeline-phase-bar-discovery" style={{ left: `${barStart}%`, width: `${width}%` }} />
                      ) : null
                    })()}
                    {devStart !== null && (devTarget !== null || devActual !== null) && (() => {
                      const barEnd = devActual !== null && devTarget !== null ? Math.max(devTarget, devActual) : (devActual ?? devTarget)
                      const width = barEnd - devStart
                      return width > 0 ? (
                        <div className={`timeline-phase-bar timeline-phase-bar-dev${devActual !== null ? ' timeline-phase-bar-complete' : ''}`} style={{ left: `${devStart}%`, width: `${width}%` }} />
                      ) : null
                    })()}
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
                    {project.status === 'on_hold' && (
                      <div
                        className="timeline-milestone timeline-onhold"
                        style={{ left: `${discoveryStart ?? devTarget ?? 3}%` }}
                        title="Project is currently on hold"
                      >
                        <div className="timeline-milestone-dot" />
                        <div className="timeline-milestone-label">On Hold</div>
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
