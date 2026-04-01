'use client'

interface PipelineStageProps {
  label: string
  count: number
  amount: string
  amountLabel: string
  color: string
  bgColor: string
  borderColor: string
  active: boolean
  onClick: () => void
}

function PipelineStage({ label, count, amount, amountLabel, color, bgColor, borderColor, active, onClick }: PipelineStageProps) {
  return (
    <button
      onClick={onClick}
      className={`flex-1 min-w-[140px] rounded-xl border-2 p-4 text-center transition-all hover:shadow-md ${
        active ? `${borderColor} ${bgColor} shadow-md` : 'border-border bg-card hover:border-muted-foreground/30'
      }`}
    >
      <div className={`text-xs font-semibold uppercase tracking-wide mb-1 ${color}`}>{label}</div>
      <div className={`text-3xl font-bold ${color}`}>{count}</div>
      <div className="text-xs text-muted-foreground mt-1">{amount} {amountLabel}</div>
    </button>
  )
}

interface PipelineProps {
  stages: {
    key: string
    label: string
    count: number
    amount: number
    amountLabel: string
  }[]
  activeStage: string | null
  onStageClick: (stage: string | null) => void
}

function fmtMoney(n: number): string {
  return '$' + n.toLocaleString('en-CA', { minimumFractionDigits: 0, maximumFractionDigits: 0 })
}

const STAGE_STYLES: Record<string, { color: string; bgColor: string; borderColor: string }> = {
  not_quoted: { color: 'text-gray-500', bgColor: 'bg-gray-50', borderColor: 'border-gray-400' },
  quoted: { color: 'text-amber-600', bgColor: 'bg-amber-50', borderColor: 'border-amber-400' },
  sold: { color: 'text-green-600', bgColor: 'bg-green-50', borderColor: 'border-green-400' },
  delivered: { color: 'text-blue-600', bgColor: 'bg-blue-50', borderColor: 'border-blue-400' },
  no_sale: { color: 'text-red-500', bgColor: 'bg-red-50', borderColor: 'border-red-400' },
}

export default function Pipeline({ stages, activeStage, onStageClick }: PipelineProps) {
  return (
    <div className="flex gap-3 overflow-x-auto pb-2">
      {stages.map((stage, i) => {
        const styles = STAGE_STYLES[stage.key] || STAGE_STYLES.not_quoted
        return (
          <div key={stage.key} className="flex items-center gap-2 flex-1 min-w-0">
            {i > 0 && i < stages.length - 1 && (
              <div className="text-muted-foreground/40 text-lg shrink-0">&rarr;</div>
            )}
            {i === stages.length - 1 && stages.length > 1 && (
              <div className="text-muted-foreground/40 text-lg shrink-0">|</div>
            )}
            <PipelineStage
              label={stage.label}
              count={stage.count}
              amount={fmtMoney(stage.amount)}
              amountLabel={stage.amountLabel}
              color={styles.color}
              bgColor={styles.bgColor}
              borderColor={styles.borderColor}
              active={activeStage === stage.key}
              onClick={() => onStageClick(activeStage === stage.key ? null : stage.key)}
            />
          </div>
        )
      })}
    </div>
  )
}
