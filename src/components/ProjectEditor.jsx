import { useState, useEffect } from 'react'
import RichTextEditor from './RichTextEditor.jsx'
import { getAvatarColor, getInitials } from '../utils/projectUtils.js'

function CollapsibleSection({ title, isCollapsed, onToggle, children }) {
  return (
    <section className="editor-section">
      <button
        type="button"
        className="editor-section-toggle"
        onClick={onToggle}
        aria-expanded={!isCollapsed}
      >
        <span className="editor-section-toggle__title">{title}</span>
        <svg
          className={`editor-section-toggle__chevron ${isCollapsed ? 'editor-section-toggle__chevron--collapsed' : ''}`}
          width="14"
          height="14"
          viewBox="0 0 14 14"
          fill="none"
          aria-hidden="true"
        >
          <path d="M3.5 5.25L7 8.75l3.5-3.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>
      {!isCollapsed && <div className="editor-section-body">{children}</div>}
    </section>
  )
}

export default function ProjectEditor({ open, initialProject, onSave, onCancel, onDelete }) {
  const isEditing = Boolean(initialProject?.id)
  const [collapsed, setCollapsed] = useState({
    basicInfo: false,
    discovery: true,
    development: true,
    team: true,
    notes: true,
  })
  const [validationErrors, setValidationErrors] = useState({})
  const [submitAttempted, setSubmitAttempted] = useState(false)

  const toggle = (key) => setCollapsed((prev) => ({ ...prev, [key]: !prev[key] }))

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
    devReleases: initialProject?.development?.releases ?? [],
    onHoldReason: initialProject?.onHoldReason ?? '',
    notes: initialProject?.notes ?? '',
    teamMembers: initialProject?.teamMembers ?? [],
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
      devReleases: initialProject?.development?.releases ?? [],
      onHoldReason: initialProject?.onHoldReason ?? '',
      notes: initialProject?.notes ?? '',
      teamMembers: initialProject?.teamMembers ?? [],
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
          fileUrl: '',
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

  function handleAddTeamMember() {
    setForm((prev) => ({
      ...prev,
      teamMembers: [
        ...(prev.teamMembers || []),
        {
          id: `tm-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
          name: '',
          role: '',
          allocation: 100,
        },
      ],
    }))
  }

  function handleTeamMemberChange(index, field, value) {
    setForm((prev) => {
      const members = [...(prev.teamMembers || [])]
      members[index] = { ...members[index], [field]: value }
      return { ...prev, teamMembers: members }
    })
  }

  function handleRemoveTeamMember(index) {
    setForm((prev) => {
      const members = [...(prev.teamMembers || [])]
      members.splice(index, 1)
      return { ...prev, teamMembers: members }
    })
  }

  function handleAddRelease() {
    setForm((prev) => ({
      ...prev,
      devReleases: [
        ...(prev.devReleases || []),
        {
          id: `rel-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
          name: '',
          startDate: '',
          endDate: '',
          actualEndDate: null,
          notes: '',
        },
      ],
    }))
  }

  function handleReleaseChange(index, field, value) {
    setForm((prev) => {
      const releases = [...(prev.devReleases || [])]
      releases[index] = { ...releases[index], [field]: value }
      return { ...prev, devReleases: releases }
    })
  }

  function handleRemoveRelease(index) {
    setForm((prev) => {
      const releases = [...(prev.devReleases || [])]
      releases.splice(index, 1)
      return { ...prev, devReleases: releases }
    })
  }

  function validateForm() {
    const errors = {}

    if (!form.name.trim()) {
      errors.name = 'Project name is required'
    }

    if (form.status === 'on_hold' && !form.onHoldReason.trim()) {
      errors.onHoldReason = 'Please provide a reason for the hold status'
    }

    return errors
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setSubmitAttempted(true)

    const errors = validateForm()
    setValidationErrors(errors)

    const hasBlockingErrors = !form.name.trim() ||
      (form.status === 'on_hold' && !form.onHoldReason.trim())

    if (hasBlockingErrors) {
      if (!form.name.trim()) {
        setCollapsed((prev) => ({ ...prev, basicInfo: false }))
      }
      return
    }
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
            fileUrl: a.fileUrl?.trim() || null,
          })),
      },
      development: {
        startDate: form.devStartDate || null,
        releases: (form.devReleases || [])
          .filter((r) => r.name?.trim() || r.endDate)
          .map((r) => ({
            ...r,
            name: r.name?.trim() || '',
            startDate: r.startDate || null,
            endDate: r.endDate || null,
            actualEndDate: r.actualEndDate || null,
            notes: r.notes?.trim() || '',
          })),
      },
      teamMembers: (form.teamMembers || [])
        .filter((m) => m.name?.trim())
        .map((m) => ({
          ...m,
          name: m.name.trim(),
          role: m.role?.trim() || '',
          allocation: m.allocation ?? 100,
        })),
    }
    await onSave(result)
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
          <button
            type="button"
            className="icon-button"
            onClick={onCancel}
            aria-label="Close"
            title="Close"
          >
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
              <path d="M15 5L5 15M5 5l10 10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        </header>

        <form className="editor-form" onSubmit={handleSubmit}>
          {/* Basic Info Section */}
          <CollapsibleSection title="Basic Information" isCollapsed={collapsed.basicInfo} onToggle={() => toggle('basicInfo')}>
            <div className="form-grid">
              <label className={validationErrors.name ? 'form-field-error' : ''}>
                <span>
                  Project name
                  <span className="required-indicator">*</span>
                </span>
                <input
                  name="name"
                  value={form.name}
                  onChange={handleChange}
                  required
                />
                {validationErrors.name && (
                  <span className="field-error-message">{validationErrors.name}</span>
                )}
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
            </div>
            {form.status === 'on_hold' && (
              <div className="form-grid" style={{ marginTop: '0.75rem' }}>
                <label className={validationErrors.onHoldReason ? 'form-field-error' : ''} style={{ gridColumn: '1 / -1' }}>
                  <span>
                    On hold reason
                    <span className="required-indicator">*</span>
                  </span>
                  <input
                    name="onHoldReason"
                    value={form.onHoldReason}
                    onChange={handleChange}
                    placeholder="Waiting for client prioritisation"
                    required
                  />
                  {validationErrors.onHoldReason && (
                    <span className="field-error-message">{validationErrors.onHoldReason}</span>
                  )}
                </label>
              </div>
            )}
          </CollapsibleSection>

          {/* Discovery Section */}
          <CollapsibleSection title="Discovery" isCollapsed={collapsed.discovery} onToggle={() => toggle('discovery')}>
            <div className="form-grid">
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
            <div style={{ marginTop: '0.75rem' }}>
              <RichTextEditor
                label="Discovery notes"
                value={form.discoveryNotes}
                onChange={(html) => setForm((prev) => ({ ...prev, discoveryNotes: html }))}
                placeholder="Add notes about discovery phase, requirements, findings, etc."
              />
            </div>
            <div style={{ marginTop: '0.75rem' }}>
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: '0.75rem',
                }}
              >
                <span className="section-title">Required artifacts</span>
                <button
                  type="button"
                  className="ghost-button ghost-small"
                  onClick={handleAddArtifact}
                >
                  + Add artifact
                </button>
              </div>
              {form.discoveryRequiredArtifacts?.length ? (
                <div className="artifacts-editor-list">
                  {form.discoveryRequiredArtifacts.map((a, index) => (
                    <div key={a.id} className="artifact-editor-card">
                      <div className="artifact-editor-header">
                        <input
                          className="artifact-editor-name-input"
                          value={a.name || ''}
                          onChange={(e) =>
                            handleArtifactChange(index, 'name', e.target.value)
                          }
                          placeholder="Artifact name (e.g. Requirements doc)"
                        />
                        <button
                          type="button"
                          className="link-button link-danger"
                          onClick={() => handleRemoveArtifact(index)}
                        >
                          Remove
                        </button>
                      </div>
                      <div className="artifact-editor-grid">
                        <div className="artifact-editor-field">
                          <span className="artifact-editor-field-label">Owner</span>
                          <input
                            value={a.owner || ''}
                            onChange={(e) =>
                              handleArtifactChange(index, 'owner', e.target.value)
                            }
                            placeholder="e.g. Client"
                          />
                        </div>
                        <div className="artifact-editor-field">
                          <span className="artifact-editor-field-label">Due date</span>
                          <input
                            type="date"
                            value={a.dueDate || ''}
                            onChange={(e) =>
                              handleArtifactChange(index, 'dueDate', e.target.value)
                            }
                          />
                        </div>
                        <div className="artifact-editor-field">
                          <span className="artifact-editor-field-label">Received date</span>
                          <input
                            type="date"
                            value={a.receivedDate || ''}
                            onChange={(e) =>
                              handleArtifactChange(index, 'receivedDate', e.target.value)
                            }
                          />
                        </div>
                        <div className="artifact-editor-field artifact-editor-field-full">
                          <span className="artifact-editor-field-label">File link</span>
                          <input
                            value={a.fileUrl || ''}
                            onChange={(e) =>
                              handleArtifactChange(index, 'fileUrl', e.target.value)
                            }
                            placeholder="https://... (optional)"
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="artifacts-empty-state">
                  <h4 className="artifacts-empty-state-title">No artifacts yet</h4>
                  <p className="artifacts-empty-state-text">Add required artifacts for the discovery phase</p>
                </div>
              )}
            </div>
          </CollapsibleSection>
          {/* Development Section */}
          <CollapsibleSection title="Development" isCollapsed={collapsed.development} onToggle={() => toggle('development')}>
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
            </div>

            {/* Releases section */}
            <div style={{ marginTop: '0.75rem' }}>
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: '0.75rem',
                }}
              >
                <span className="section-title">Releases</span>
                <button
                  type="button"
                  className="ghost-button ghost-small"
                  onClick={handleAddRelease}
                >
                  + Add release
                </button>
              </div>
              {form.devReleases?.length ? (
                <div className="releases-editor-list">
                  {form.devReleases.map((rel, index) => (
                    <div key={rel.id} className="release-editor-card">
                      <div className="release-editor-header">
                        <input
                          className="release-editor-name-input"
                          value={rel.name || ''}
                          onChange={(e) => handleReleaseChange(index, 'name', e.target.value)}
                          placeholder="Release name (e.g. v1.0 - MVP)"
                        />
                        <button
                          type="button"
                          className="link-button link-danger"
                          onClick={() => handleRemoveRelease(index)}
                        >
                          Remove
                        </button>
                      </div>
                      <div className="release-editor-grid">
                        <div className="release-editor-field">
                          <span className="release-editor-field-label">Start date</span>
                          <input
                            type="date"
                            value={rel.startDate || ''}
                            onChange={(e) => handleReleaseChange(index, 'startDate', e.target.value)}
                          />
                        </div>
                        <div className="release-editor-field">
                          <span className="release-editor-field-label">Target end date</span>
                          <input
                            type="date"
                            value={rel.endDate || ''}
                            onChange={(e) => handleReleaseChange(index, 'endDate', e.target.value)}
                          />
                        </div>
                        <div className="release-editor-field">
                          <span className="release-editor-field-label">Actual end date</span>
                          <input
                            type="date"
                            value={rel.actualEndDate || ''}
                            onChange={(e) => handleReleaseChange(index, 'actualEndDate', e.target.value)}
                          />
                        </div>
                        <div className="release-editor-field release-editor-field-full">
                          <span className="release-editor-field-label">Notes</span>
                          <input
                            value={rel.notes || ''}
                            onChange={(e) => handleReleaseChange(index, 'notes', e.target.value)}
                            placeholder="Release notes or description"
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="releases-empty-state">
                  <h4 className="releases-empty-state-title">No releases planned</h4>
                  <p className="releases-empty-state-text">Add development releases to track milestones</p>
                </div>
              )}
            </div>
          </CollapsibleSection>

          {/* Team Section */}
          <CollapsibleSection title="Team Members" isCollapsed={collapsed.team} onToggle={() => toggle('team')}>
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '0.75rem',
              }}
            >
              <span className="section-title">Team members</span>
              <button
                type="button"
                className="ghost-button ghost-small"
                onClick={handleAddTeamMember}
              >
                + Add member
              </button>
            </div>
            {form.teamMembers?.length ? (
              <div className="team-members-editor-list">
                {form.teamMembers.map((m, index) => (
                  <div key={m.id} className="team-member-editor-row">
                    <div
                      className="avatar avatar-md"
                      style={{ background: m.name?.trim() ? getAvatarColor(m.name) : '#cbd5e1' }}
                    >
                      {m.name?.trim() ? getInitials(m.name) : '?'}
                    </div>
                    <div className="team-member-editor-fields">
                      <label className="team-member-editor-label">
                        <span>Name</span>
                        <input
                          value={m.name || ''}
                          onChange={(e) => handleTeamMemberChange(index, 'name', e.target.value)}
                          placeholder="Full name"
                        />
                      </label>
                      <label className="team-member-editor-label">
                        <span>Role</span>
                        <input
                          value={m.role || ''}
                          onChange={(e) => handleTeamMemberChange(index, 'role', e.target.value)}
                          placeholder="e.g. Developer, Designer, PM"
                        />
                      </label>
                      <label className="team-member-editor-label team-member-editor-label--allocation">
                        <span>Allocation</span>
                        <div className="allocation-input-wrapper">
                          <input
                            type="number"
                            min="0"
                            max="100"
                            value={m.allocation ?? 100}
                            onChange={(e) => handleTeamMemberChange(index, 'allocation', Math.max(0, Math.min(100, parseInt(e.target.value) || 0)))}
                          />
                          <span className="allocation-suffix">%</span>
                        </div>
                      </label>
                    </div>
                    <button
                      type="button"
                      className="icon-button icon-button-danger"
                      onClick={() => handleRemoveTeamMember(index)}
                      aria-label="Remove team member"
                      title="Remove"
                    >
                      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                        <path d="M2 4h12M6 4V2.667A1.333 1.333 0 0 1 7.333 2h1.334A1.333 1.333 0 0 1 10 2.667V4m2 0v9.333A1.333 1.333 0 0 1 10.667 14H5.333A1.333 1.333 0 0 1 4 13.333V4h8Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                        <path d="M6.667 7.333v4M9.333 7.333v4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                      </svg>
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <p className="muted">No team members added yet.</p>
            )}
          </CollapsibleSection>

          {/* Notes Section */}
          <CollapsibleSection title="Notes" isCollapsed={collapsed.notes} onToggle={() => toggle('notes')}>
            <RichTextEditor
              label="General notes"
              value={form.notes}
              onChange={(html) => setForm((prev) => ({ ...prev, notes: html }))}
              placeholder="General project notes, decisions, blockers, context, etc."
            />
          </CollapsibleSection>

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
