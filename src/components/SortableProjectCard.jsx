import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import ProjectCard from './ProjectCard.jsx'

export default function SortableProjectCard({ project, onEdit, onDelete, onMom, isDragging: externalIsDragging }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging: isSortableDragging,
    isOver,
  } = useSortable({
    id: project.id,
  })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition: isSortableDragging ? 'none' : transition,
    opacity: isSortableDragging ? 0.3 : isOver ? 0.8 : 1,
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`sortable-item ${isSortableDragging ? 'sortable-item-dragging' : ''} ${isOver ? 'sortable-item-over' : ''}`}
    >
      <ProjectCard
        project={project}
        onEdit={onEdit}
        onDelete={onDelete}
        onMom={onMom}
        dragHandleProps={{ ...attributes, ...listeners }}
        isDragging={isSortableDragging}
      />
    </div>
  )
}
