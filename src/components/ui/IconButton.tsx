import type { ButtonHTMLAttributes, ReactNode } from 'react'

// ==========================================================================
// IconButton — bouton carré icône (profil, settings, etc.).
// ==========================================================================

type Size = 'sm' | 'md' | 'lg'

type IconButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  children: ReactNode
  size?: Size
  /** Obligatoire pour l’a11y si le contenu est purement iconique */
  'aria-label': string
}

const SIZE_CLASS: Record<Size, string> = {
  sm: 'icon-btn icon-btn--sm',
  md: 'icon-btn icon-btn--md',
  lg: 'icon-btn icon-btn--lg',
}

export default function IconButton({
  children,
  size = 'md',
  className = '',
  type = 'button',
  ...rest
}: IconButtonProps) {
  return (
    <button type={type} className={`${SIZE_CLASS[size]} ${className}`.trim()} {...rest}>
      {children}
    </button>
  )
}
