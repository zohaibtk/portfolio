import { useMemo } from 'react'
import { STATUS_LABELS } from '../constants.js'

export default function Filters({ filter, onChange, projects, projectsWithDerived, filteredCount }) {
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
            {['all', 'on-track', 'at-risk'].map((key) => {
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
                    {key === 'all' ? 'All' : key === 'on-track' ? 'On Track' : 'At Risk'}
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
