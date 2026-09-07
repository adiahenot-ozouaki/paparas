import type { ButtonHTMLAttributes } from 'react'
import { ArrowLeft } from 'lucide-react'

type BackButtonProps = Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'children'> & {
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
      <ArrowLeft size={20} strokeWidth={2} className="kora-icon" aria-hidden />
    </button>
  )
}
