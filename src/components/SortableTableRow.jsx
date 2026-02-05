import { Link } from 'react-router-dom'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { STATUS_LABELS, PRIORITY_LABELS } from '../constants.js'
import RiskChip from './RiskChip.jsx'

export default function SortableTableRow({ project, onEdit, onDelete }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: project.id,
  })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

  return (
    <tr ref={setNodeRef} style={style}>
      <td>
        <div
          {...attributes}
          {...listeners}
          style={{
            cursor: 'grab',
            display: 'inline-flex',
            alignItems: 'center',
            padding: '0.2rem 0.4rem',
            marginRight: '0.5rem',
            color: '#94a3b8',
            borderRadius: '0.3rem',
            transition: 'background 0.15s ease, color 0.15s ease',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'rgba(79, 70, 229, 0.1)'
            e.currentTarget.style.color = '#4f46e5'
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'transparent'
            e.currentTarget.style.color = '#94a3b8'
          }}
          title="Drag to reorder"
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 20 20"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            aria-hidden="true"
          >
            <circle cx="5" cy="5" r="1.5" fill="currentColor" />
            <circle cx="10" cy="5" r="1.5" fill="currentColor" />
            <circle cx="15" cy="5" r="1.5" fill="currentColor" />
            <circle cx="5" cy="10" r="1.5" fill="currentColor" />
            <circle cx="10" cy="10" r="1.5" fill="currentColor" />
            <circle cx="15" cy="10" r="1.5" fill="currentColor" />
            <circle cx="5" cy="15" r="1.5" fill="currentColor" />
            <circle cx="10" cy="15" r="1.5" fill="currentColor" />
            <circle cx="15" cy="15" r="1.5" fill="currentColor" />
          </svg>
        </div>
        <Link to={`/projects/${project.id}`}>{project.name}</Link>
      </td>
      <td>{project.client}</td>
      <td>{STATUS_LABELS[project.status]}</td>
      <td>{PRIORITY_LABELS[project.priority]}</td>
      <td>{project.development?.targetReleaseDate || '—'}</td>
      <td>
        <RiskChip risk={project.derived.overallRisk} size="md" />
      </td>
      <td className="manage-actions">
        <button
          type="button"
          className="icon-button"
          onClick={() => onEdit(project)}
          aria-label="Edit project"
          title="Edit project"
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 16 16"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            aria-hidden="true"
          >
            <path
              d="M11.333 2a1.414 1.414 0 0 1 2 2L4.667 12.667 2 13.333l.667-2.667L11.333 2Z"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>
        <button
          type="button"
          className="icon-button icon-button-danger"
          onClick={() => onDelete(project)}
          aria-label="Delete project"
          title="Delete project"
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 16 16"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            aria-hidden="true"
          >
            <path
              d="M2 4h12M6 4V2.667A1.333 1.333 0 0 1 7.333 2h1.334A1.333 1.333 0 0 1 10 2.667V4m2 0v9.333A1.333 1.333 0 0 1 10.667 14H5.333A1.333 1.333 0 0 1 4 13.333V4h8Z"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <path
              d="M6.667 7.333v4M9.333 7.333v4"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
            />
          </svg>
        </button>
      </td>
    </tr>
  )
}
