'use client'

/**
 * ProductionPageHeader
 *
 * Matches photo production page header exactly:
 * - <div className="px-6 pt-6 pb-4 flex items-center justify-between">
 *   - Left: <h1 className="text-2xl font-bold"> + <p className="text-sm text-muted-foreground">
 *   - Right: Action button (filled primary)
 * - Action button: bg-primary text-primary-foreground hover:bg-primary/90
 */

import { Plus } from 'lucide-react'

interface ProductionPageHeaderProps {
  title: string
  subtitle: string
  actionLabel?: string
  actionHref?: string
  actionNewTab?: boolean
  actionDisabled?: boolean
}

export default function ProductionPageHeader({
  title,
  subtitle,
  actionLabel,
  actionHref,
  actionNewTab = false,
  actionDisabled = false,
}: ProductionPageHeaderProps) {
  return (
    <div className="px-6 pt-6 pb-4 flex items-center justify-between">
      <div>
        <h1 className="text-2xl font-bold">{title}</h1>
        <p className="text-sm text-muted-foreground">{subtitle}</p>
      </div>
      <div className="flex items-center gap-2">
        {actionLabel && (
          <button
            onClick={() => {
              if (actionDisabled || !actionHref) return
              if (actionNewTab) {
                window.open(actionHref, '_blank')
              } else {
                window.location.href = actionHref
              }
            }}
            disabled={actionDisabled}
            className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Plus className="h-4 w-4" />
            {actionLabel}
          </button>
        )}
      </div>
    </div>
  )
}
