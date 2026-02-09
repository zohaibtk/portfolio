export function parseDate(value) {
  if (!value) return null
  const d = new Date(value)
  return Number.isNaN(d.getTime()) ? null : d
}

export function daysBetween(start, end) {
  if (!start || !end) return null
  const diffMs = end.getTime() - start.getTime()
  return Math.round(diffMs / (1000 * 60 * 60 * 24))
}

export function isPast(date) {
  if (!date) return false
  const today = new Date()
  // ignore time of day
  today.setHours(0, 0, 0, 0)
  const d = new Date(date)
  d.setHours(0, 0, 0, 0)
  return d.getTime() < today.getTime()
}

export function getAvatarColor(name) {
  const colors = ['#4f46e5', '#3b82f6', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981', '#ef4444', '#14b8a6']
  let hash = 0
  for (let i = 0; i < (name || '').length; i++) {
    hash = (name || '').charCodeAt(i) + ((hash << 5) - hash)
  }
  return colors[Math.abs(hash) % colors.length]
}

export function getInitials(name) {
  if (!name) return '?'
  const parts = name.trim().split(/\s+/)
  return (parts[0][0] + (parts[1]?.[0] || '')).toUpperCase()
}

export function computeProjectDerived(project) {
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

  // Check all releases for late status
  const releases = project.development?.releases || []
  const lateReleases = releases.filter((rel) => {
    const target = parseDate(rel.endDate)
    const actual = parseDate(rel.actualEndDate)
    return !actual && target && target.getTime() < now.getTime()
  })

  const devIsLate = lateReleases.length > 0

  // Get the next upcoming release (for summary display)
  const upcomingReleases = releases
    .filter((rel) => !rel.actualEndDate && rel.endDate)
    .sort((a, b) => new Date(a.endDate) - new Date(b.endDate))
  const nextRelease = upcomingReleases[0] || null

  const riskFlags = []
  if (hasLateArtifacts) riskFlags.push('Late client artifacts')
  if (discoveryIsLate) riskFlags.push('Discovery past target date')
  if (devIsLate) {
    lateReleases.forEach((rel) => {
      riskFlags.push(`Release "${rel.name || 'Unnamed'}" past target date`)
    })
  }

  const overallRisk = riskFlags.length === 0 ? 'on-track' : 'at-risk'

  // Calculate days late for the most overdue release
  const devDaysLate = lateReleases.length > 0
    ? Math.max(...lateReleases.map((rel) => daysBetween(parseDate(rel.endDate), now)))
    : null

  return {
    hasMissingArtifacts,
    hasLateArtifacts,
    discoveryIsLate,
    devIsLate,
    lateReleases,
    nextRelease,
    overallRisk,
    riskFlags,
    discoveryDaysLate:
      discoveryIsLate && discoveryTarget ? daysBetween(discoveryTarget, now) : null,
    devDaysLate,
  }
}
