'use client'

import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

interface ButtonWithBadgeProps {
  label: string
  count: number
  active: boolean
  onClick: () => void
  className?: string
}

export function ButtonWithBadge({ label, count, active, onClick, className }: ButtonWithBadgeProps) {
  return (
    <Button
      variant={active ? 'default' : 'outline'}
      className={cn('relative w-full', className)}
      onClick={onClick}
    >
      {label}
      <Badge variant="destructive" className="absolute -top-2.5 -right-2.5 h-5 min-w-5 px-1 tabular-nums">
        {count}
      </Badge>
    </Button>
  )
}
