'use client'

import * as React from 'react'
import { cn } from '@/lib/utils'

// ── Chart Config ──────────────────────────────────────────────

export type ChartConfig = Record<
  string,
  {
    label?: React.ReactNode
    icon?: React.ComponentType
    color?: string
  }
>

// ── Chart Context ─────────────────────────────────────────────

type ChartContextProps = {
  config: ChartConfig
}

const ChartContext = React.createContext<ChartContextProps | null>(null)

function useChart() {
  const context = React.useContext(ChartContext)
  if (!context) throw new Error('useChart must be used within a <ChartContainer />')
  return context
}

// ── Chart Container ───────────────────────────────────────────

import { ResponsiveContainer } from 'recharts'

interface ChartContainerProps extends React.ComponentProps<'div'> {
  config: ChartConfig
  children: React.ComponentProps<typeof ResponsiveContainer>['children']
}

const ChartContainer = React.forwardRef<HTMLDivElement, ChartContainerProps>(
  ({ id, className, children, config, ...props }, ref) => {
    const uniqueId = React.useId()
    const chartId = `chart-${id || uniqueId.replace(/:/g, '')}`

    return (
      <ChartContext.Provider value={{ config }}>
        <div
          data-chart={chartId}
          ref={ref}
          className={cn(
            "flex aspect-video justify-center text-xs",
            "[&_.recharts-cartesian-axis-tick_text]:fill-muted-foreground",
            "[&_.recharts-cartesian-grid_line[stroke='#ccc']]:stroke-border/50",
            "[&_.recharts-curve.recharts-tooltip-cursor]:stroke-border",
            "[&_.recharts-dot[stroke='#fff']]:stroke-transparent",
            "[&_.recharts-layer]:outline-none",
            "[&_.recharts-polar-grid_[stroke='#ccc']]:stroke-border",
            "[&_.recharts-radial-bar-background-sector]:fill-muted",
            "[&_.recharts-rectangle.recharts-tooltip-cursor]:fill-muted",
            "[&_.recharts-reference-line_[stroke='#ccc']]:stroke-border",
            "[&_.recharts-sector[stroke='#fff']]:stroke-transparent",
            "[&_.recharts-sector]:outline-none",
            "[&_.recharts-surface]:outline-none",
            className
          )}
          style={
            {
              ...Object.entries(config).reduce((acc, [key, value]) => {
                if (value.color) {
                  acc[`--color-${key}` as any] = value.color
                }
                return acc
              }, {} as Record<string, string>),
            } as React.CSSProperties
          }
          {...props}
        >
          <ResponsiveContainer>{children}</ResponsiveContainer>
        </div>
      </ChartContext.Provider>
    )
  }
)
ChartContainer.displayName = 'ChartContainer'

// ── Chart Tooltip ─────────────────────────────────────────────

import * as RechartsPrimitive from 'recharts'

const ChartTooltip = RechartsPrimitive.Tooltip

interface ChartTooltipContentProps {
  active?: boolean
  payload?: any[]
  label?: string
  hideLabel?: boolean
  hideIndicator?: boolean
  indicator?: 'line' | 'dot' | 'dashed'
  nameKey?: string
  labelKey?: string
  className?: string
  formatter?: (value: any, name: string) => [React.ReactNode, React.ReactNode]
}

const ChartTooltipContent = React.forwardRef<
  HTMLDivElement,
  ChartTooltipContentProps
>(
  (
    {
      active,
      payload,
      label,
      formatter,
      hideLabel = false,
      hideIndicator = false,
      indicator = 'dot',
      className,
    },
    ref
  ) => {
    const { config } = useChart()

    if (!active || !payload?.length) return null

    return (
      <div
        ref={ref}
        className={cn(
          'grid min-w-[8rem] items-start gap-1.5 rounded-lg border border-border/50 bg-background px-2.5 py-1.5 text-xs shadow-xl',
          className
        )}
      >
        {!hideLabel && label && (
          <div className="font-medium">{label}</div>
        )}
        <div className="grid gap-1.5">
          {payload.map((item: any, index: number) => {
            const key = item.dataKey || item.name || ''
            const itemConfig = config[key]
            const indicatorColor = item.color || itemConfig?.color

            const [displayValue, displayName] = formatter
              ? formatter(item.value, key)
              : [item.value, itemConfig?.label || item.name || key]

            return (
              <div key={index} className="flex w-full flex-wrap items-stretch gap-2 [&>svg]:h-2.5 [&>svg]:w-2.5 [&>svg]:text-muted-foreground">
                {!hideIndicator && (
                  <div
                    className={cn(
                      'shrink-0 rounded-[2px] border-[--color-border] bg-[--color-bg]',
                      indicator === 'dot' && 'h-2.5 w-2.5',
                      indicator === 'line' && 'w-1',
                      indicator === 'dashed' && 'w-0 border-[1.5px] border-dashed bg-transparent'
                    )}
                    style={
                      {
                        '--color-bg': indicatorColor,
                        '--color-border': indicatorColor,
                      } as React.CSSProperties
                    }
                  />
                )}
                <div className="flex flex-1 justify-between leading-none">
                  <div className="grid gap-1.5">
                    <span className="text-muted-foreground">{displayName}</span>
                  </div>
                  {displayValue !== undefined && (
                    <span className="font-mono font-medium tabular-nums text-foreground">
                      {displayValue}
                    </span>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    )
  }
)
ChartTooltipContent.displayName = 'ChartTooltipContent'

// ── Exports ───────────────────────────────────────────────────

export {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
}
