import { useRef } from 'react'
import dataService from '../services/dataService.js'

export default function SettingsView() {
  const fileInputRef = useRef(null)

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

  return (
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
          <strong>Data persistence:</strong> All data is stored in Firestore and synced
          in real-time. Sign in with Google to access your projects from any device.
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
            onClick={() => fileInputRef.current?.click()}
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
  )
}
