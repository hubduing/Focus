import { Link } from 'react-router-dom'
import type { ReactNode } from 'react'

interface EmptyStateProps {
  icon?: string
  title: string
  description?: string
  action?: { label: string; to: string }
  children?: ReactNode
}

export default function EmptyState({ icon = '·', title, description, action, children }: EmptyStateProps) {
  return (
    <div className="empty">
      <div className="empty-icon" aria-hidden="true">
        {icon}
      </div>
      <h3>{title}</h3>
      {description && <p>{description}</p>}
      {action && (
        <Link to={action.to} className="btn btn-primary">
          {action.label}
        </Link>
      )}
      {children}
    </div>
  )
}