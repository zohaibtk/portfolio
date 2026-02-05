import { useState, useEffect } from 'react'
import RichTextEditor from './RichTextEditor.jsx'
import { getAvatarColor, getInitials } from '../utils/projectUtils.js'

export default function ProjectEditor({ open, initialProject, onSave, onCancel, onDelete }) {
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
      devTargetReleaseDate: initialProject?.development?.targetReleaseDate ?? '',
      devActualReleaseDate: initialProject?.development?.actualReleaseDate ?? '',
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
            fileUrl: a.fileUrl?.trim() || null,
          })),
      },
      development: {
        ...(initialProject?.development || {}),
        startDate: form.devStartDate || null,
        targetReleaseDate: form.devTargetReleaseDate || null,
        actualReleaseDate: form.devActualReleaseDate || null,
      },
      teamMembers: (form.teamMembers || [])
        .filter((m) => m.name?.trim())
        .map((m) => ({
          ...m,
          name: m.name.trim(),
          role: m.role?.trim() || '',
        })),
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
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', marginBottom: '0.25rem' }}>
                      <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true" style={{ color: '#94a3b8', flexShrink: 0 }}>
                        <path d="M6.5 9.5l3-3M5 11L2.5 13.5a1.06 1.06 0 0 0 1.5 1.5L6.5 12.5M10.5 5l2.5-2.5a1.06 1.06 0 0 0-1.5-1.5L9 3.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                      </svg>
                      <input
                        value={a.fileUrl || ''}
                        onChange={(e) =>
                          handleArtifactChange(index, 'fileUrl', e.target.value)
                        }
                        placeholder="File link (optional)"
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

          <div style={{ marginTop: '1rem' }}>
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '0.3rem',
              }}
            >
              <span className="section-title">Team Members</span>
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
          </div>

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
