'use client'

/**
 * ProductionPageHeader
 *
 * Matches photo production page header exactly:
 * - <div className="px-6 pt-6 pb-4 flex items-center justify-between">
 *   - Left: <h1 className="text-2xl font-bold"> + <p className="text-sm text-muted-foreground">
 *   - Right: Report button (outline) + Action button (filled primary)
 * - Report button: border border-input bg-background, text-muted-foreground, hover:bg-accent/50
 * - Action button: bg-primary text-primary-foreground hover:bg-primary/90
 */

import { FileText, Plus } from 'lucide-react'

interface ProductionPageHeaderProps {
  title: string
  subtitle: string
  reportHref?: string
  actionLabel?: string
  actionHref?: string
  actionNewTab?: boolean
  actionDisabled?: boolean
}

export default function ProductionPageHeader({
  title,
  subtitle,
  reportHref = '/admin/production/report',
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
        <button
          onClick={() => window.open(reportHref, '_blank')}
          className="flex items-center gap-2 rounded-lg border border-input bg-background px-4 py-2.5 text-sm font-semibold text-muted-foreground hover:bg-accent/50 transition-colors"
        >
          <FileText className="h-4 w-4" />
          Report
        </button>
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
            {/* TODO: Link once new-sale page is built */}
          </button>
        )}
      </div>
    </div>
  )
}
