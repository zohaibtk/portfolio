import { useParams, useNavigate } from 'react-router-dom'
import { computeProjectDerived, isPast, getAvatarColor, getInitials } from '../utils/projectUtils.js'
import { PRIORITY_LABELS } from '../constants.js'
import StatusPill from '../components/StatusPill.jsx'
import RiskChip from '../components/RiskChip.jsx'

function formatDate(dateStr) {
  if (!dateStr) return '—'
  const [year, month, day] = dateStr.split('-').map(Number)
  const date = new Date(year, month - 1, day)
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
  return `${days[date.getDay()]}, ${months[date.getMonth()]} ${date.getDate()}`
}

export default function ProjectDetailsView({ projects, onEdit, onDelete, onMom }) {
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
            <dt>Total releases</dt>
            <dd>{project.development?.releases?.length || 0}</dd>
          </div>
        </dl>
      </section>

      {project.development?.releases?.length > 0 && (
        <section className="details-section">
          <h3 className="section-title">Development Releases</h3>
          <div className="releases-list">
            {project.development.releases.map((rel) => {
              const isLate = rel.endDate && isPast(rel.endDate) && !rel.actualEndDate
              const isComplete = !!rel.actualEndDate
              return (
                <div key={rel.id} className="release-item">
                  <div className="release-item-header">
                    <span className="release-item-name">{rel.name || 'Unnamed Release'}</span>
                    <span className={`release-item-status ${isComplete ? 'status-complete' : isLate ? 'status-late' : 'status-pending'}`}>
                      {isComplete ? 'Released' : isLate ? 'Overdue' : 'Planned'}
                    </span>
                  </div>
                  <dl className="release-item-dates">
                    <div>
                      <dt>Start</dt>
                      <dd>{rel.startDate || '—'}</dd>
                    </div>
                    <div>
                      <dt>Target</dt>
                      <dd>{rel.endDate || '—'}</dd>
                    </div>
                    <div>
                      <dt>Released</dt>
                      <dd>{rel.actualEndDate || '—'}</dd>
                    </div>
                  </dl>
                  {rel.notes && (
                    <p className="release-item-notes">{rel.notes}</p>
                  )}
                </div>
              )
            })}
          </div>
        </section>
      )}

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

      <section className="details-section">
        <h3 className="section-title">Team Members</h3>
        {project.teamMembers?.length > 0 ? (
          <div className="details-team-list">
            {project.teamMembers.map((m) => (
              <div key={m.id} className="details-team-item">
                <div className="avatar avatar-md" style={{ background: getAvatarColor(m.name) }}>
                  {getInitials(m.name)}
                </div>
                <div className="details-team-info">
                  <span className="details-team-name">{m.name}</span>
                  {m.role && <span className="details-team-role">{m.role}</span>}
                </div>
                <span className="allocation-badge">{m.allocation ?? 100}%</span>
              </div>
            ))}
          </div>
        ) : (
          <p className="muted" style={{ fontSize: '0.85rem' }}>No team members assigned.</p>
        )}
      </section>

      <section className="details-section">
        <div className="details-mom-header">
          <h3 className="section-title" style={{ margin: 0 }}>
            Meeting Minutes
            {project.meetingMinutes?.length > 0 && (
              <span className="details-mom-count">{project.meetingMinutes.length}</span>
            )}
          </h3>
          <button
            type="button"
            className="ghost-button ghost-small"
            onClick={() => onMom && onMom(project)}
          >
            Manage
          </button>
        </div>

        {project.meetingMinutes?.length > 0 ? (
          <div className="details-mom-list">
            {[...project.meetingMinutes]
              .sort((a, b) => (b.date || '').localeCompare(a.date || ''))
              .map((mom) => (
                <div key={mom.id} className="details-mom-item">
                  <span className="details-mom-item-date">{formatDate(mom.date)}</span>
                  <span className="details-mom-item-title">{mom.title}</span>
                </div>
              ))}
          </div>
        ) : (
          <p className="muted" style={{ marginTop: '0.5rem', fontSize: '0.8rem' }}>
            No meetings recorded yet.{' '}
            <button
              type="button"
              className="ghost-button ghost-small"
              style={{ padding: 0, fontSize: 'inherit' }}
              onClick={() => onMom && onMom(project)}
            >
              Add one
            </button>
          </p>
        )}
      </section>
    </div>
  )
}
