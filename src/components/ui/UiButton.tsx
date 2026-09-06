import type { ButtonHTMLAttributes, ReactNode } from 'react'

type Variant = 'primary' | 'secondary' | 'ghost'

type UiButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant
  children: ReactNode
  fullWidth?: boolean
}

export default function UiButton({
  variant = 'primary',
  children,
  fullWidth,
  className = '',
  style,
  disabled,
  type = 'button',
  ...rest
}: UiButtonProps) {
  const base =
    variant === 'primary'
      ? 'btn-primary glow-gold-sm ui-btn'
      : variant === 'secondary'
        ? 'btn-secondary ui-btn'
        : 'ui-btn ui-btn--ghost'

  return (
    <button
      type={type}
      disabled={disabled}
      className={`${base} ${className}`.trim()}
      style={{
        padding: '12px 20px',
        fontSize: 13,
        borderRadius: 14,
        opacity: disabled ? 0.6 : 1,
        width: fullWidth ? '100%' : undefined,
        ...style,
      }}
      {...rest}
    >
      {children}
    </button>
  )
}
