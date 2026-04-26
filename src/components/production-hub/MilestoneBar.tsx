'use client'

import { HubMilestones, ALL_MILESTONE_KEYS, MILESTONE_NAMES } from './types'

interface Props {
  milestones: HubMilestones | null
}

export function MilestoneBar({ milestones }: Props) {
  if (!milestones) return null

  const entries = ALL_MILESTONE_KEYS.map(key => ({
    key,
    label: key.replace(/_/g, ' ').replace(/^m\d+\s?/, ''),
    name: MILESTONE_NAMES[key],
    value: (milestones as any)[key] === true,
    number: key.match(/m(\d+)/)?.[1] || key,
  }))

  const total = entries.length
  const done = entries.filter(e => e.value).length
  const pct = Math.round((done / total) * 100)

  return (
    <div className="rounded-xl border bg-card p-4 space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-sm font-semibold">{done}/{total} milestones</span>
        <span className="text-sm text-muted-foreground">{pct}%</span>
      </div>
      <div className="h-2.5 bg-gray-200 rounded-full overflow-hidden">
        <div className="h-full bg-teal-500 rounded-full transition-all duration-500" style={{ width: `${pct}%` }} />
      </div>
      <div className="flex flex-wrap gap-1.5">
        {entries.map(e => (
          <div
            key={e.key}
            title={e.name}
            className={`w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold cursor-default transition-colors ${
              e.value
                ? 'bg-teal-500 text-white'
                : 'bg-gray-100 text-gray-400'
            }`}
          >
            {e.number}
          </div>
        ))}
      </div>
    </div>
  )
}
