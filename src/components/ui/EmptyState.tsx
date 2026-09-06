import type { ReactNode } from 'react'

type EmptyStateProps = {
  title: string
  description?: string
  action?: ReactNode
  dashed?: boolean
}

export default function EmptyState({ title, description, action, dashed = true }: EmptyStateProps) {
  return (
    <div className={dashed ? 'empty-state empty-state--dashed' : 'empty-state'}>
      <p className="empty-state-title">{title}</p>
      {description ? <p className="empty-state-desc">{description}</p> : null}
      {action ? <div className="empty-state-action">{action}</div> : null}
    </div>
  )
}
