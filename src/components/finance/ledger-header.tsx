'use client'

interface LedgerHeaderProps {
  title: string
  subtitle?: string
  fiscalYear?: string
}

export function LedgerHeader({ title, subtitle, fiscalYear }: LedgerHeaderProps) {
  return (
    <div className="mb-8">
      <p className="text-xs tracking-[0.15em] text-muted-foreground mb-1">
        SIGS PHOTOGRAPHY LTD.
      </p>
      <div className="border-b-2 border-foreground/20 pb-3 mb-2">
        <h1 className="text-xl sm:text-2xl font-bold tracking-[0.1em] uppercase">
          {title}
        </h1>
      </div>
      {(subtitle || fiscalYear) && (
        <div className="flex flex-col sm:flex-row sm:justify-between text-xs sm:text-sm text-muted-foreground gap-0.5">
          {subtitle && <span>{subtitle}</span>}
          {fiscalYear && <span>Fiscal Year {fiscalYear}</span>}
        </div>
      )}
    </div>
  )
}
