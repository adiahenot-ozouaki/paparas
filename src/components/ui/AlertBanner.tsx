import type { ReactNode } from 'react'

type Tone = 'error' | 'info' | 'success'

type AlertBannerProps = {
  tone?: Tone
  children: ReactNode
  role?: 'alert' | 'status'
}

const TONE_CLASS: Record<Tone, string> = {
  error: 'alert-banner alert-banner--error',
  info: 'alert-banner alert-banner--info',
  success: 'alert-banner alert-banner--success',
}

export default function AlertBanner({ tone = 'error', children, role }: AlertBannerProps) {
  return (
    <div className={TONE_CLASS[tone]} role={role ?? (tone === 'error' ? 'alert' : 'status')}>
      {children}
    </div>
  )
}
