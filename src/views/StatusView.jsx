import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable'
import SortableProjectCard from '../components/SortableProjectCard.jsx'

export default function StatusView({ status, title, subtitle, emptyMessage, orderedProjectsWithDerived, onEdit, onDelete, onMom }) {
  const statusProjects = orderedProjectsWithDerived.filter((p) => p.status === status)

  return (
    <>
      <header className="app-header">
        <div>
          <h1>{title}</h1>
          <p className="subtitle">{subtitle}</p>
        </div>
      </header>
      <SortableContext
        items={statusProjects.map((p) => p.id)}
        strategy={verticalListSortingStrategy}
      >
        <section className="projects-grid">
          {statusProjects.length === 0 ? (
            <p className="muted">{emptyMessage}</p>
          ) : (
            statusProjects.map((project) => (
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
