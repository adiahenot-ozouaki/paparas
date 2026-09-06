import type { ButtonHTMLAttributes } from 'react'

// ==========================================================================
// BackButton — flèche de retour standard (coin haut-gauche).
// ==========================================================================

type BackButtonProps = Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'children'> & {
  /** Position absolute (défaut true) */
  absolute?: boolean
}

export default function BackButton({
  absolute = true,
  className = '',
  type = 'button',
  'aria-label': ariaLabel = 'Retour',
  ...rest
}: BackButtonProps) {
  return (
    <button
      type={type}
      aria-label={ariaLabel}
      className={`back-btn ${absolute ? 'back-btn--absolute' : ''} ${className}`.trim()}
      {...rest}
    >
      ←
    </button>
  )
}
