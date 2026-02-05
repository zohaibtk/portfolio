export default function RiskChip({ risk, size = 'md' }) {
  const label = risk === 'at-risk' ? 'At Risk' : 'On Track'
  return (
    <span className={`risk-chip risk-${risk} risk-${size}`}>
      {label}
    </span>
  )
}
