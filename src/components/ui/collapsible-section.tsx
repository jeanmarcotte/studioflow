"use client"

import { useState } from "react"
import { ChevronDown, ChevronRight } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"

interface CollapsibleSectionProps {
  title: string
  count?: number
  badge?: string // Tailwind classes for badge color
  defaultOpen?: boolean
  headerRight?: React.ReactNode
  children: React.ReactNode
  className?: string
}

export function CollapsibleSection({
  title,
  count,
  badge = "bg-muted text-muted-foreground",
  defaultOpen = true,
  headerRight,
  children,
  className,
}: CollapsibleSectionProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen)

  return (
    <div className={cn("rounded-lg border bg-card", className)}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex w-full items-center justify-between p-4 text-left hover:bg-muted/50 transition-colors"
      >
        <div className="flex items-center gap-3">
          {isOpen ? (
            <ChevronDown className="h-5 w-5 text-muted-foreground" />
          ) : (
            <ChevronRight className="h-5 w-5 text-muted-foreground" />
          )}
          <span className="font-semibold">{title}</span>
          {count !== undefined && (
            <Badge variant="secondary" className={cn("font-medium", badge)}>
              {count}
            </Badge>
          )}
        </div>
        {headerRight && <div className="text-right">{headerRight}</div>}
      </button>

      {isOpen && (
        <div className="border-t px-4 pb-4">
          {children}
        </div>
      )}
    </div>
  )
}
