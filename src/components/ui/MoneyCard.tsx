import type { ReactNode } from 'react'

// ==========================================================================
// MoneyCard — carte capital / wallet (label + montant + unité + icône).
// ==========================================================================

export type MoneyCardVariant = 'green' | 'gold' | 'default'

type MoneyCardProps = {
  label: string
  amount: number | string
  unit?: string
  /** Ligne secondaire sous le montant (ex. net gain) */
  subtitle?: ReactNode
  icon?: ReactNode
  variant?: MoneyCardVariant
  className?: string
  /** Anime le montant (ex. bounce après un gain) */
  animateAmount?: boolean
  onClick?: () => void
}

const VARIANT_CLASS: Record<MoneyCardVariant, string> = {
  default: 'section-card money-card',
  green: 'section-card section-card--green money-card',
  gold: 'section-card section-card--gold money-card',
}

function formatAmount(amount: number | string): string {
  if (typeof amount === 'number') return amount.toLocaleString('fr-FR')
  return amount
}

export default function MoneyCard({
  label,
  amount,
  unit = 'FCFA',
  subtitle,
  icon,
  variant = 'green',
  className = '',
  animateAmount = false,
  onClick,
}: MoneyCardProps) {
  const classes = `${VARIANT_CLASS[variant]} ${onClick ? 'money-card--clickable' : ''} ${className}`.trim()

  const body = (
    <>
      <div className="money-card-body">
        <p className="money-card-label">{label}</p>
        <div className="money-card-row">
          <span
            className={`font-display text-gold money-card-amount${animateAmount ? ' anim-scale-bounce' : ''}`}
          >
            {formatAmount(amount)}
          </span>
          {unit ? <span className="money-card-unit">{unit}</span> : null}
        </div>
        {subtitle != null ? <div className="money-card-subtitle">{subtitle}</div> : null}
      </div>
      {icon != null ? <div className="money-card-icon">{icon}</div> : null}
    </>
  )

  if (onClick) {
    return (
      <button type="button" className={classes} onClick={onClick}>
        {body}
      </button>
    )
  }

  return <div className={classes}>{body}</div>
}
