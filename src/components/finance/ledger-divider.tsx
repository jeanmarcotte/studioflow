export function LedgerDivider({ label }: { label?: string }) {
  return (
    <div className="my-6">
      {label ? (
        <div className="flex items-center gap-4">
          <div className="h-px flex-1 bg-border" />
          <span className="text-xs tracking-[0.05em] uppercase text-muted-foreground font-medium">
            {label}
          </span>
          <div className="h-px flex-1 bg-border" />
        </div>
      ) : (
        <div className="h-px bg-border" />
      )}
    </div>
  )
}
