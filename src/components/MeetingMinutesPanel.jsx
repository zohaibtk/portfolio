import { useState, useEffect } from 'react'
import RichTextEditor from './RichTextEditor.jsx'

function stripHtml(html) {
  if (!html) return ''
  return html.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim()
}

function formatDate(dateStr) {
  if (!dateStr) return '—'
  const [year, month, day] = dateStr.split('-').map(Number)
  const date = new Date(year, month - 1, day)
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
  return `${days[date.getDay()]}, ${months[date.getMonth()]} ${date.getDate()}`
}

export default function MeetingMinutesPanel({ open, project, onSave, onCancel }) {
  const [minutes, setMinutes] = useState([])
  const [editingMom, setEditingMom] = useState(null)

  useEffect(() => {
    setMinutes(project?.meetingMinutes ?? [])
    setEditingMom(null)
  }, [project])

  if (!open || !project) return null

  const sorted = [...minutes].sort((a, b) => (b.date || '').localeCompare(a.date || ''))

  function handleAddNew() {
    setEditingMom({
      id: null,
      date: new Date().toISOString().split('T')[0],
      title: '',
      notes: '',
    })
  }

  function handleEditExisting(mom) {
    setEditingMom({ ...mom })
  }

  function handleFormSave() {
    if (!editingMom.title.trim()) return
    let updated
    if (editingMom.id) {
      updated = minutes.map((m) => (m.id === editingMom.id ? { ...editingMom } : m))
    } else {
      const newMom = {
        ...editingMom,
        id: `mom-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        createdAt: new Date().toISOString(),
      }
      updated = [newMom, ...minutes]
    }
    setMinutes(updated)
    onSave(project.id, updated)
  }

  function handleDeleteMom(momId) {
    if (!window.confirm('Delete this meeting record? This cannot be undone.')) return
    const updated = minutes.filter((m) => m.id !== momId)
    setMinutes(updated)
    onSave(project.id, updated)
  }

  return (
    <div className="editor-overlay">
      <div className="editor-panel mom-panel">

        {/* Panel header */}
        <header className="mom-panel-header">
          <div className="mom-panel-header-left">
            <div className="mom-panel-icon">
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                <rect x="3" y="2" width="14" height="16" rx="2" stroke="currentColor" strokeWidth="1.8" />
                <path d="M7 7h6M7 10h6M7 13h3" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
              </svg>
            </div>
            <div>
              <h2 className="mom-panel-title">Meeting Minutes</h2>
              <span className="mom-panel-project-chip">{project.name}</span>
            </div>
          </div>
          <button type="button" className="icon-button" onClick={onCancel} aria-label="Close panel">
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
              <path d="M4.5 4.5l9 9M13.5 4.5l-9 9" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
            </svg>
          </button>
        </header>

        {/* Form view */}
        {editingMom ? (
          <div className="mom-form">
            <div className="mom-form-nav">
              <button type="button" className="mom-form-back" onClick={() => setEditingMom(null)}>
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
                  <path d="M9 2L4 7l5 5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                Back to list
              </button>
            </div>
            <h3 className="mom-form-section-title">{editingMom.id ? 'Edit meeting' : 'New meeting'}</h3>
            <div className="form-grid">
              <label>
                <span>Date</span>
                <input
                  type="date"
                  value={editingMom.date}
                  onChange={(e) => setEditingMom((prev) => ({ ...prev, date: e.target.value }))}
                />
              </label>
              <label>
                <span>Title / Agenda</span>
                <input
                  type="text"
                  value={editingMom.title}
                  onChange={(e) => setEditingMom((prev) => ({ ...prev, title: e.target.value }))}
                  placeholder="e.g. Sprint planning"
                  required
                />
              </label>
            </div>
            <RichTextEditor
              label="Minutes"
              value={editingMom.notes}
              onChange={(html) => setEditingMom((prev) => ({ ...prev, notes: html }))}
              placeholder="Record the meeting notes, decisions, and action items here."
            />
            <footer className="editor-footer">
              <div className="editor-footer-left" />
              <div className="editor-footer-right">
                <button type="button" className="ghost-button" onClick={() => setEditingMom(null)}>
                  Cancel
                </button>
                <button type="button" className="primary-button" onClick={handleFormSave}>
                  {editingMom.id ? 'Save changes' : 'Save meeting'}
                </button>
              </div>
            </footer>
          </div>

        ) : (
          /* List view */
          <div className="mom-list">
            <div className="mom-list-toolbar">
              <span className="mom-list-count">
                {sorted.length} {sorted.length === 1 ? 'meeting' : 'meetings'}
              </span>
              <button type="button" className="mom-new-btn" onClick={handleAddNew}>
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
                  <path d="M7 2v10M2 7h10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                </svg>
                Add Meeting
              </button>
            </div>

            {sorted.length === 0 ? (
              <div className="mom-empty">
                <div className="mom-empty-icon">
                  <svg width="28" height="28" viewBox="0 0 28 28" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                    <rect x="4" y="3" width="20" height="22" rx="3" stroke="currentColor" strokeWidth="1.8" />
                    <path d="M9 10h10M9 14h10M9 18h6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                  </svg>
                </div>
                <p className="mom-empty-title">No meetings recorded</p>
                <p className="mom-empty-desc">Track project meetings, decisions, and action items here.</p>
                <button type="button" className="mom-new-btn" onClick={handleAddNew}>
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
                    <path d="M7 2v10M2 7h10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                  </svg>
                  Add first meeting
                </button>
              </div>
            ) : (
              <div className="mom-list-items">
                {sorted.map((mom) => {
                  const preview = stripHtml(mom.notes)
                  return (
                    <div key={mom.id} className="mom-list-item">
                      <div className="mom-item-accent" />
                      <div className="mom-item-content">
                        <div className="mom-item-header">
                          <span className="mom-item-title">{mom.title}</span>
                          <div className="mom-item-actions">
                            <button
                              type="button"
                              className="icon-button"
                              onClick={() => handleEditExisting(mom)}
                              aria-label="Edit meeting"
                              title="Edit"
                            >
                              <svg width="15" height="15" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                                <path d="M11.333 2a1.414 1.414 0 0 1 2 2L4.667 12.667 2 13.333l.667-2.667L11.333 2Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                              </svg>
                            </button>
                            <button
                              type="button"
                              className="icon-button icon-button-danger"
                              onClick={() => handleDeleteMom(mom.id)}
                              aria-label="Delete meeting"
                              title="Delete"
                            >
                              <svg width="15" height="15" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                                <path d="M2 4h12M6 4V2.667A1.333 1.333 0 0 1 7.333 2h1.334A1.333 1.333 0 0 1 10 2.667V4m2 0v9.333A1.333 1.333 0 0 1 10.667 14H5.333A1.333 1.333 0 0 1 4 13.333V4h8Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                                <path d="M6.667 7.333v4M9.333 7.333v4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                              </svg>
                            </button>
                          </div>
                        </div>
                        <span className="mom-item-date">{formatDate(mom.date)}</span>
                        {preview && (
                          <p className="mom-item-preview">{preview}</p>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
