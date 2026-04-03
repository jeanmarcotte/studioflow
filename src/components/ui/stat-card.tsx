import { Card, CardContent } from "@/components/ui/card"
import { cn } from "@/lib/utils"
import { TrendingUp, TrendingDown, Minus } from "lucide-react"

interface StatCardProps {
  label: string
  value: string | number
  previousValue?: number
  currentValue?: number
  format?: "currency" | "percent" | "number"
  icon?: React.ReactNode
  className?: string
}

export function StatCard({
  label,
  value,
  previousValue,
  currentValue,
  format = "number",
  icon,
  className,
}: StatCardProps) {
  // Calculate YoY change if both values provided
  let yoyChange: number | null = null
  let yoyDisplay: string | null = null

  if (previousValue !== undefined && currentValue !== undefined && previousValue > 0) {
    yoyChange = ((currentValue - previousValue) / previousValue) * 100
    yoyDisplay = `${yoyChange > 0 ? "+" : ""}${yoyChange.toFixed(1)}%`
  }

  return (
    <Card className={cn("", className)}>
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <p className="text-sm font-medium text-muted-foreground">{label}</p>
          {icon && <div className="text-muted-foreground">{icon}</div>}
        </div>
        <div className="mt-2">
          <p className="text-2xl font-bold">{value}</p>
          {yoyDisplay && (
            <div className={cn(
              "flex items-center gap-1 text-sm mt-1",
              yoyChange && yoyChange > 0 ? "text-green-600 dark:text-green-400" : "",
              yoyChange && yoyChange < 0 ? "text-red-600 dark:text-red-400" : "",
              yoyChange === 0 ? "text-muted-foreground" : ""
            )}>
              {yoyChange && yoyChange > 0 && <TrendingUp className="h-4 w-4" />}
              {yoyChange && yoyChange < 0 && <TrendingDown className="h-4 w-4" />}
              {yoyChange === 0 && <Minus className="h-4 w-4" />}
              <span>{yoyDisplay} vs last year</span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
