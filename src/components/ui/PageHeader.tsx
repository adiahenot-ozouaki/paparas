import type { ReactNode } from 'react'

type PageHeaderProps = {
  title: string
  subtitle?: string
  right?: ReactNode
}

export default function PageHeader({ title, subtitle, right }: PageHeaderProps) {
  return (
    <div className="page-header">
      <div className="page-header-text">
        <h1 className="font-display page-header-title">{title}</h1>
        {subtitle ? <p className="page-header-subtitle">{subtitle}</p> : null}
      </div>
      {right ? <div className="page-header-right">{right}</div> : null}
    </div>
  )
}
