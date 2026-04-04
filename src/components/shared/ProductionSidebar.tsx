'use client'

/**
 * ProductionSidebar
 *
 * Matches photo page right sidebar container exactly:
 * - <aside className="w-[280px] shrink-0 p-6 bg-secondary/50 hidden lg:block">
 *   - Contains a list of ProductionStatBox components
 */

import ProductionStatBox from './ProductionStatBox'

interface ProductionSidebarProps {
  boxes: Array<{
    label: string
    value: string | number
    scrollToId?: string
    color?: 'default' | 'teal' | 'red' | 'yellow' | 'blue' | 'green' | 'gray'
  }>
}

export default function ProductionSidebar({ boxes }: ProductionSidebarProps) {
  return (
    <aside className="w-[280px] shrink-0 p-6 bg-secondary/50 hidden lg:block">
      {boxes.map((box, i) => (
        <ProductionStatBox
          key={box.label}
          label={box.label}
          value={box.value}
          scrollToId={box.scrollToId}
          color={box.color}
        />
      ))}
    </aside>
  )
}
