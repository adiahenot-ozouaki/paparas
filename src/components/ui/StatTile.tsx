import type { ButtonHTMLAttributes, ReactNode } from 'react'

// ==========================================================================
// StatTile — tuile mini-stat (icône + valeur + label).
// Cliquable si onClick est fourni.
// ==========================================================================

type StatTileProps = {
  icon?: ReactNode
  value: ReactNode
  label: string
  className?: string
  onClick?: () => void
} & Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'children' | 'onClick' | 'value'>

export default function StatTile({
  icon,
  value,
  label,
  className = '',
  onClick,
  type = 'button',
  ...rest
}: StatTileProps) {
  const classes = `stat-tile section-card ${onClick ? 'stat-tile--clickable' : ''} ${className}`.trim()

  if (onClick) {
    return (
      <button type={type} className={classes} onClick={onClick} {...rest}>
        {icon != null ? <span className="stat-tile-icon">{icon}</span> : null}
        <p className="font-display stat-tile-value">{value}</p>
        <p className="stat-tile-label">{label}</p>
      </button>
    )
  }

  return (
    <div className={classes}>
      {icon != null ? <span className="stat-tile-icon">{icon}</span> : null}
      <p className="font-display stat-tile-value">{value}</p>
      <p className="stat-tile-label">{label}</p>
    </div>
  )
}
