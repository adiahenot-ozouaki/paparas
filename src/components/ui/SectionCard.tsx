import type { CSSProperties, ReactNode } from 'react'

// ==========================================================================
// SectionCard — carte de contenu réutilisable.
// ==========================================================================

export type SectionCardVariant = 'default' | 'gold' | 'green' | 'danger' | 'success' | 'dashed'

type SectionCardProps = {
  children: ReactNode
  variant?: SectionCardVariant
  className?: string
  style?: CSSProperties
  padding?: number | string
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

export default function SectionCard({
  children,
  variant = 'default',
  className = '',
  style,
  padding,
  onClick,
}: SectionCardProps) {
  const Tag = onClick ? 'button' : 'div'
  return (
    <Tag
      type={onClick ? 'button' : undefined}
      className={`${VARIANT_CLASS[variant]} ${className}`.trim()}
      style={{
        ...(padding !== undefined ? { padding } : null),
        ...(onClick ? { cursor: 'pointer', width: '100%', textAlign: 'left' as const } : null),
        ...style,
      }}
      onClick={onClick}
    >
      {children}
    </Tag>
  )
}
