import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable'
import SortableTableRow from '../components/SortableTableRow.jsx'

export default function ProjectListView({ orderedProjectsWithDerived, onEdit, onDelete, onAddNew }) {
  return (
    <section className="manage-view">
      <header className="app-header">
        <div>
          <h1>All projects</h1>
          <p className="subtitle">
            Structured list for quick edits, clean-up, and navigation to details.
          </p>
        </div>
        <button
          onClick={onAddNew}
          className="primary-button primary-small"
        >
          + Add project
        </button>
      </header>

      <div className="manage-table-wrapper">
        <table className="manage-table">
          <thead>
            <tr>
              <th>Project</th>
              <th>Client</th>
              <th>Status</th>
              <th>Priority</th>
              <th>Dev target</th>
              <th>Risk</th>
              <th />
            </tr>
          </thead>
          <SortableContext
            items={orderedProjectsWithDerived.map((p) => p.id)}
            strategy={verticalListSortingStrategy}
          >
            <tbody>
              {orderedProjectsWithDerived.map((p) => (
                <SortableTableRow
                  key={p.id}
                  project={p}
                  onEdit={onEdit}
                  onDelete={onDelete}
                />
              ))}
            </tbody>
          </SortableContext>
        </table>
      </div>
      {orderedProjectsWithDerived.length === 0 && (
        <p className="muted">
          No projects yet — add your first project to get started.
        </p>
      )}
    </section>
  )
}
