import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { getAvatarColor, getInitials } from '../utils/projectUtils.js'
import { STATUS_LABELS } from '../constants.js'

export default function TeamAllocationView({ projects }) {
  const [searchTerm, setSearchTerm] = useState('')

  // Build project-wise allocation data
  const { projectGroups, memberTotals } = useMemo(() => {
    const groups = []
    const totals = new Map() // memberName (lowercase) -> { name, role, total }

    for (const project of projects) {
      if (!project.teamMembers?.length) continue

      const members = project.teamMembers.filter((m) => m.name?.trim())
      if (!members.length) continue

      // Track per-member totals across all projects
      for (const m of members) {
        const key = m.name.trim().toLowerCase()
        if (!totals.has(key)) {
          totals.set(key, { name: m.name.trim(), role: m.role || '', total: 0 })
        }
        const entry = totals.get(key)
        if (!entry.role && m.role) entry.role = m.role
        entry.total += m.allocation ?? 100
      }

      groups.push({
        projectId: project.id,
        projectName: project.name,
        projectStatus: project.status,
        members: members.map((m) => ({
          name: m.name.trim(),
          role: m.role || '',
          allocation: m.allocation ?? 100,
        })),
      })
    }

    // Sort projects alphabetically
    groups.sort((a, b) => a.projectName.localeCompare(b.projectName))

    return { projectGroups: groups, memberTotals: totals }
  }, [projects])

  // Summary stats
  const stats = useMemo(() => {
    const totalMembers = memberTotals.size
    let overAllocated = 0
    let underAllocated = 0
    let totalAlloc = 0

    for (const [, entry] of memberTotals) {
      totalAlloc += entry.total
      if (entry.total > 100) overAllocated++
      if (entry.total < 100) underAllocated++
    }

    return {
      totalMembers,
      overAllocated,
      underAllocated,
      avgAllocation: totalMembers > 0 ? Math.round(totalAlloc / totalMembers) : 0,
    }
  }, [memberTotals])

  // Filter by search
  const filteredGroups = useMemo(() => {
    if (!searchTerm.trim()) return projectGroups
    const term = searchTerm.toLowerCase()
    return projectGroups
      .map((group) => {
        const projectMatch = group.projectName.toLowerCase().includes(term)
        const matchingMembers = group.members.filter(
          (m) => m.name.toLowerCase().includes(term) || m.role.toLowerCase().includes(term)
        )
        if (projectMatch) return group
        if (matchingMembers.length) return { ...group, members: matchingMembers }
        return null
      })
      .filter(Boolean)
  }, [projectGroups, searchTerm])

  function getAllocationClass(total) {
    if (total > 100) return 'allocation-over'
    if (total === 100) return 'allocation-full'
    return 'allocation-under'
  }

  function getMemberTotal(name) {
    const entry = memberTotals.get(name.toLowerCase())
    return entry ? entry.total : 0
  }

  return (
    <div className="team-allocation-view">
      <header className="view-header">
        <div>
          <h2 className="view-title">Team Allocation</h2>
          <p className="view-subtitle">Resource allocation across all projects</p>
        </div>
      </header>

      {/* Summary cards */}
      <div className="allocation-summary-cards">
        <div className="allocation-summary-card">
          <span className="allocation-summary-value">{stats.totalMembers}</span>
          <span className="allocation-summary-label">Total Members</span>
        </div>
        <div className="allocation-summary-card allocation-summary-card--over">
          <span className="allocation-summary-value">{stats.overAllocated}</span>
          <span className="allocation-summary-label">Over-allocated</span>
        </div>
        <div className="allocation-summary-card allocation-summary-card--under">
          <span className="allocation-summary-value">{stats.underAllocated}</span>
          <span className="allocation-summary-label">Under-allocated</span>
        </div>
        <div className="allocation-summary-card">
          <span className="allocation-summary-value">{stats.avgAllocation}%</span>
          <span className="allocation-summary-label">Avg. Allocation</span>
        </div>
      </div>

      {/* Search */}
      <div className="allocation-search">
        <input
          type="text"
          placeholder="Search by project, name, or role..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="allocation-search-input"
        />
      </div>

      {/* Table */}
      {filteredGroups.length > 0 ? (
        <div className="allocation-table-wrapper">
          <table className="allocation-table">
            <thead>
              <tr>
                <th>Project</th>
                <th>Status</th>
                <th>Team Member</th>
                <th>Role</th>
                <th>Allocation</th>
                <th>Overall</th>
              </tr>
            </thead>
            <tbody>
              {filteredGroups.map((group) =>
                group.members.map((member, i) => (
                  <tr key={`${group.projectId}-${member.name}-${i}`} className={i === 0 ? 'allocation-group-first' : ''}>
                    {i === 0 ? (
                      <>
                        <td rowSpan={group.members.length} className="allocation-project-cell">
                          <Link to={`/projects/${group.projectId}`} className="allocation-project-link">
                            {group.projectName}
                          </Link>
                        </td>
                        <td rowSpan={group.members.length} className="allocation-status-cell">
                          <span className={`status-pill status-${group.projectStatus}`}>
                            {STATUS_LABELS[group.projectStatus] || group.projectStatus}
                          </span>
                        </td>
                      </>
                    ) : null}
                    <td>
                      <div className="allocation-member">
                        <div
                          className="avatar avatar-sm"
                          style={{ background: getAvatarColor(member.name) }}
                        >
                          {getInitials(member.name)}
                        </div>
                        <span className="allocation-member-name">{member.name}</span>
                      </div>
                    </td>
                    <td>{member.role || '—'}</td>
                    <td>
                      <span className="allocation-badge">{member.allocation}%</span>
                    </td>
                    <td>
                      <span className={`allocation-total ${getAllocationClass(getMemberTotal(member.name))}`}>
                        {getMemberTotal(member.name)}%
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="allocation-empty">
          <p>{searchTerm ? 'No matching results found.' : 'No team members assigned to any project yet.'}</p>
        </div>
      )}
    </div>
  )
}
