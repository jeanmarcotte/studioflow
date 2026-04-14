import { cn } from '@/lib/utils'

interface CurrencyCellProps {
  amount: number
  showSign?: boolean
  className?: string
}

export function CurrencyCell({ amount, showSign = false, className }: CurrencyCellProps) {
  const isNegative = amount < 0
  const formatted = new Intl.NumberFormat('en-CA', {
    style: 'currency',
    currency: 'CAD',
    signDisplay: showSign ? 'always' : 'auto',
  }).format(amount)

  return (
    <span
      className={cn(
        'font-mono tabular-nums',
        isNegative ? 'text-red-500' : 'text-green-500',
        className
      )}
    >
      {formatted}
    </span>
  )
}
