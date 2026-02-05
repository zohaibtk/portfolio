import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable'
import Filters from '../components/Filters.jsx'
import SortableProjectCard from '../components/SortableProjectCard.jsx'

export default function OverviewView({ filter, onFilterChange, projects, orderedProjectsWithDerived, filteredOrdered, onEdit, onDelete, onMom }) {
  return (
    <>
      <header className="app-header">
        <div>
          <h1>Portfolio overview</h1>
          <p className="subtitle">
            Live view of discovery, development, and on-hold work with risks
            highlighted. Use the drag handle to reorder projects.
          </p>
        </div>
      </header>

      <Filters
        filter={filter}
        onChange={onFilterChange}
        projects={projects}
        projectsWithDerived={orderedProjectsWithDerived}
        filteredCount={filteredOrdered.length}
      />

      <SortableContext
        items={filteredOrdered.map((p) => p.id)}
        strategy={verticalListSortingStrategy}
      >
        <section className="projects-grid">
          {filteredOrdered.length === 0 ? (
            <p className="muted">No projects match the current filters.</p>
          ) : (
            filteredOrdered.map((project) => (
              <SortableProjectCard
                key={project.id}
                project={project}
                onEdit={onEdit}
                onDelete={onDelete}
                onMom={onMom}
              />
            ))
          )}
        </section>
      </SortableContext>
    </>
  )
}
