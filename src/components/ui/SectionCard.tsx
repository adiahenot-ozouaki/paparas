import type { CSSProperties, ReactNode } from 'react'

// ==========================================================================
// SectionCard — carte de contenu réutilisable.
// ==========================================================================

export type SectionCardVariant = 'default' | 'gold' | 'green' | 'danger' | 'success' | 'dashed'
export type SectionCardPadding = 'sm' | 'md' | 'lg'

type SectionCardProps = {
  children: ReactNode
  variant?: SectionCardVariant
  className?: string
  style?: CSSProperties
  /** Padding preset (CSS classes). Prefer over inline padding. */
  padding?: SectionCardPadding | number | string
  onClick?: () => void
}

const VARIANT_CLASS: Record<SectionCardVariant, string> = {
  default: 'section-card',
  gold: 'section-card section-card--gold',
  green: 'section-card section-card--green',
  danger: 'section-card section-card--danger',
  success: 'section-card section-card--success',
  dashed: 'section-card section-card--dashed',
}

const PAD_CLASS: Record<SectionCardPadding, string> = {
  sm: 'section-card--pad-sm',
  md: 'section-card--pad-md',
  lg: 'section-card--pad-lg',
}

function isPadPreset(p: unknown): p is SectionCardPadding {
  return p === 'sm' || p === 'md' || p === 'lg'
}

export default function SectionCard({
  children,
  variant = 'default',
  className = '',
  style,
  padding,
  onClick,
}: SectionCardProps) {
  const Tag = onClick ? 'button' : 'div'
  const padClass = isPadPreset(padding) ? PAD_CLASS[padding] : ''
  const inlinePad =
    padding !== undefined && !isPadPreset(padding)
      ? { padding: typeof padding === 'number' ? `${padding}px` : padding }
      : null

  return (
    <Tag
      type={onClick ? 'button' : undefined}
      className={`${VARIANT_CLASS[variant]} ${onClick ? 'section-card--clickable' : ''} ${padClass} ${className}`.trim().replace(/\s+/g, ' ')}
      style={{
        ...inlinePad,
        ...style,
      }}
      onClick={onClick}
    >
      {children}
    </Tag>
  )
}
