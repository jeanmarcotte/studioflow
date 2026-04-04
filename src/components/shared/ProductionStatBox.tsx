'use client'

/**
 * ProductionStatBox
 *
 * Matches photo page sidebar stat box exactly:
 * - <div className="rounded-xl border bg-card p-4 mb-4 cursor-pointer hover:border-ring transition-colors">
 *   - <div className="text-xs font-bold text-muted-foreground uppercase tracking-wide mb-2">LABEL</div>
 *   - <div className="text-3xl font-bold" style={{ color }}>VALUE</div>
 */

const COLOR_MAP: Record<string, string> = {
  default: '#0d9488',
  teal: '#0d9488',
  red: '#dc2626',
  yellow: '#d97706',
  blue: '#2563eb',
  green: '#16a34a',
  gray: '#1c1917',
}

interface ProductionStatBoxProps {
  label: string
  value: string | number
  scrollToId?: string
  color?: 'default' | 'teal' | 'red' | 'yellow' | 'blue' | 'green' | 'gray'
}

export default function ProductionStatBox({
  label,
  value,
  scrollToId,
  color = 'default',
}: ProductionStatBoxProps) {
  const clickable = !!scrollToId

  return (
    <div
      className={`rounded-xl border bg-card p-4 mb-4 ${clickable ? 'cursor-pointer hover:border-ring' : ''} transition-colors`}
      onClick={clickable ? () => document.getElementById(scrollToId!)?.scrollIntoView({ behavior: 'smooth' }) : undefined}
    >
      <div className="text-xs font-bold text-muted-foreground uppercase tracking-wide mb-2">{label}</div>
      <div className="text-3xl font-bold" style={{ color: COLOR_MAP[color] || COLOR_MAP.default }}>{value}</div>
    </div>
  )
}
