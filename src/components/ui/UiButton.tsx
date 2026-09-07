import type { ButtonHTMLAttributes, ReactNode } from 'react'

type Variant = 'primary' | 'secondary' | 'ghost'
type Size = 'sm' | 'md' | 'lg'

type UiButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant
  size?: Size
  children: ReactNode
  fullWidth?: boolean
}

export default function UiButton({
  variant = 'primary',
  size = 'md',
  children,
  fullWidth,
  className = '',
  disabled,
  type = 'button',
  ...rest
}: UiButtonProps) {
  const variantClass =
    variant === 'primary'
      ? 'btn-primary glow-gold-sm'
      : variant === 'secondary'
        ? 'btn-secondary'
        : 'ui-btn--ghost'

  const sizeClass = size === 'md' ? '' : size === 'sm' ? 'ui-btn--sm' : 'ui-btn--lg'

  return (
    <button
      type={type}
      disabled={disabled}
      className={`ui-btn ${variantClass} ${sizeClass} ${fullWidth ? 'ui-btn--full' : ''} ${disabled ? 'is-disabled' : ''} ${className}`.trim().replace(/\s+/g, ' ')}
      {...rest}
    >
      {children}
    </button>
  )
}
