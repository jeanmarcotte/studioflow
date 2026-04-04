'use client'

/**
 * ProductionPills
 *
 * Matches photo page status badges row exactly:
 * - <div className="px-6 pb-4 flex flex-wrap gap-2">
 *   - <span className="text-xs rounded-full px-2.5 py-1 font-medium {colorClasses}">
 *       {label}: {count}
 *     </span>
 */

const PILL_COLORS: Record<string, string> = {
  default: 'bg-gray-100 text-gray-700',
  blue: 'bg-blue-100 text-blue-700',
  green: 'bg-green-100 text-green-700',
  yellow: 'bg-yellow-100 text-yellow-700',
  red: 'bg-red-100 text-red-700',
  gray: 'bg-gray-100 text-gray-700',
  teal: 'bg-teal-100 text-teal-700',
}

interface ProductionPillsProps {
  pills: Array<{
    label: string
    count: number
    color?: 'default' | 'blue' | 'green' | 'yellow' | 'red' | 'gray' | 'teal'
  }>
}

export default function ProductionPills({ pills }: ProductionPillsProps) {
  return (
    <div className="px-6 pb-4 flex flex-wrap gap-2">
      {pills.map(pill => (
        <span
          key={pill.label}
          className={`text-xs rounded-full px-2.5 py-1 font-medium ${PILL_COLORS[pill.color || 'default']}`}
        >
          {pill.label}: {pill.count}
        </span>
      ))}
    </div>
  )
}
