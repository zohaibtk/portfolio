import { STATUS_LABELS } from '../constants.js'

export default function StatusPill({ status }) {
  return <span className={`status-pill status-${status}`}>{STATUS_LABELS[status]}</span>
}
