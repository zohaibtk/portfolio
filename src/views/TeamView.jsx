import { useState } from 'react'
import { getAvatarColor, getInitials } from '../utils/projectUtils.js'

function TeamMemberEditor({ open, initialMember, onSave, onCancel, onDelete }) {
  const isEditing = Boolean(initialMember?.id)
  const [form, setForm] = useState({
    id: initialMember?.id ?? null,
    name: initialMember?.name ?? '',
    email: initialMember?.email ?? '',
    role: initialMember?.role ?? '',
    department: initialMember?.department ?? '',
  })

  if (!open) return null

  function handleChange(e) {
    const { name, value } = e.target
    setForm((prev) => ({ ...prev, [name]: value }))
  }

  function handleSubmit(e) {
    e.preventDefault()
    if (!form.name.trim()) {
      alert('Name is required')
      return
    }
    onSave(form)
  }

  return (
    <div className="editor-overlay">
      <div className="editor-panel" style={{ maxWidth: '500px' }}>
        <header className="editor-header">
          <div>
            <h2>{isEditing ? 'Edit team member' : 'Add team member'}</h2>
            <p className="editor-subtitle">
              Manage your team members for assignment to projects.
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
          <div className="form-grid">
            <label style={{ gridColumn: '1 / -1' }}>
              <span>
                Name
                <span className="required-indicator">*</span>
              </span>
              <input
                name="name"
                value={form.name}
                onChange={handleChange}
                placeholder="Full name"
                required
              />
            </label>
            <label style={{ gridColumn: '1 / -1' }}>
              <span>Email</span>
              <input
                type="email"
                name="email"
                value={form.email}
                onChange={handleChange}
                placeholder="email@example.com"
              />
            </label>
            <label>
              <span>Role</span>
              <input
                name="role"
                value={form.role}
                onChange={handleChange}
                placeholder="e.g. Developer, Designer"
              />
            </label>
            <label>
              <span>Department</span>
              <input
                name="department"
                value={form.department}
                onChange={handleChange}
                placeholder="e.g. Engineering, Design"
              />
            </label>
          </div>

          <footer className="editor-footer">
            <div className="editor-footer-left">
              {isEditing && (
                <button
                  type="button"
                  className="danger-button"
                  onClick={() => onDelete(initialMember)}
                >
                  Delete member
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
                {isEditing ? 'Save changes' : 'Add member'}
              </button>
            </div>
          </footer>
        </form>
      </div>
    </div>
  )
}

export default function TeamView({ teamMembers, onCreateMember, onUpdateMember, onDeleteMember }) {
  const [editorOpen, setEditorOpen] = useState(false)
  const [editingMember, setEditingMember] = useState(null)

  function handleAddNew() {
    setEditingMember(null)
    setEditorOpen(true)
  }

  function handleEdit(member) {
    setEditingMember(member)
    setEditorOpen(true)
  }

  function handleDelete(member) {
    if (!window.confirm(`Delete team member "${member.name}"? This action cannot be undone.`)) {
      return
    }
    try {
      onDeleteMember(member.id)
      setEditorOpen(false)
    } catch (error) {
      console.error('Delete failed:', error)
      alert(`Failed to delete team member: ${error.message}`)
    }
  }

  async function handleSave(memberInput) {
    try {
      if (memberInput.id) {
        // Update existing member
        await onUpdateMember(memberInput.id, memberInput)
      } else {
        // Create new member
        await onCreateMember(memberInput)
      }
      setEditorOpen(false)
      setEditingMember(null)
    } catch (error) {
      console.error('Save failed:', error)
      alert(`Failed to save team member: ${error.message}`)
    }
  }

  // Group team members by department
  const membersByDepartment = teamMembers.reduce((acc, member) => {
    const dept = member.department || 'Unassigned'
    if (!acc[dept]) {
      acc[dept] = []
    }
    acc[dept].push(member)
    return acc
  }, {})

  const departments = Object.keys(membersByDepartment).sort()

  return (
    <div className="view-container">
      <header className="view-header">
        <div>
          <h1 className="view-title">Team Members</h1>
          <p className="view-subtitle">
            Manage your team members for assignment to projects.
          </p>
        </div>
        <button
          type="button"
          className="primary-button"
          onClick={handleAddNew}
        >
          + Add team member
        </button>
      </header>

      <div className="view-content">
        {teamMembers.length === 0 ? (
          <div className="team-empty-state">
            <div className="team-empty-state-icon">
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <h3 className="team-empty-state-title">No team members yet</h3>
            <p className="team-empty-state-text">
              Add team members to assign them to projects and track their workload.
            </p>
          </div>
        ) : (
          <div className="team-departments-list">
            {departments.map((dept) => (
              <div key={dept} className="team-department-section">
                <h2 className="team-department-title">
                  {dept}
                  <span className="team-department-count">
                    ({membersByDepartment[dept].length})
                  </span>
                </h2>
                <div className="team-members-grid">
                  {membersByDepartment[dept].map((member) => (
                    <div key={member.id} className="team-member-card">
                      <div className="team-member-card__header">
                        <div
                          className="avatar avatar-lg"
                          style={{ background: getAvatarColor(member.name) }}
                        >
                          {getInitials(member.name)}
                        </div>
                        <button
                          type="button"
                          className="icon-button"
                          onClick={() => handleEdit(member)}
                          aria-label="Edit team member"
                          title="Edit"
                        >
                          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                            <path d="M11.333 2A1.886 1.886 0 0 1 14 4.667l-9 9-3.667 1L2.667 11l9-9z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                          </svg>
                        </button>
                      </div>
                      <div className="team-member-card__body">
                        <h3 className="team-member-card__name">{member.name}</h3>
                        {member.role && (
                          <p className="team-member-card__role">{member.role}</p>
                        )}
                        {member.email && (
                          <a href={`mailto:${member.email}`} className="team-member-card__email">
                            {member.email}
                          </a>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <TeamMemberEditor
        open={editorOpen}
        initialMember={editingMember}
        onSave={handleSave}
        onCancel={() => setEditorOpen(false)}
        onDelete={handleDelete}
      />
    </div>
  )
}
