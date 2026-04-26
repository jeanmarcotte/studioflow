'use client'

import { HubMilestones, MILESTONE_NAMES } from './types'

interface Props {
  milestones: HubMilestones | null
  keys: string[]
}

export function MilestoneBadges({ milestones, keys }: Props) {
  if (!milestones) return null

  return (
    <div className="flex flex-wrap gap-1.5 mb-3">
      {keys.map(key => {
        const value = (milestones as any)[key] === true
        const name = MILESTONE_NAMES[key] || key
        const num = key.match(/m(\d+)/)?.[1] || ''
        return (
          <span
            key={key}
            title={name}
            className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${
              value ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-400'
            }`}
          >
            m{num} {value ? '✓' : ''}
          </span>
        )
      })}
    </div>
  )
}
