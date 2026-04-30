'use client'

import { motion } from 'framer-motion'

export type YearValue = number | 'all'

interface YearSelectorProps {
  years: number[]
  value: YearValue
  onChange: (value: YearValue) => void
}

export function YearSelector({ years, value, onChange }: YearSelectorProps) {
  const cells: { label: string; value: YearValue }[] = [
    ...years.map(y => ({ label: String(y), value: y as YearValue })),
    { label: 'ALL', value: 'all' as YearValue },
  ]

  return (
    <div className="flex flex-wrap gap-2">
      {cells.map(cell => {
        const active = value === cell.value
        return (
          <motion.button
            key={String(cell.value)}
            type="button"
            onClick={() => onChange(cell.value)}
            whileTap={{ scale: 0.94 }}
            transition={{ type: 'spring', stiffness: 500, damping: 28 }}
            className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
              active
                ? 'bg-teal-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
            style={{ minHeight: '36px', minWidth: '52px' }}
          >
            {cell.label}
          </motion.button>
        )
      })}
    </div>
  )
}
