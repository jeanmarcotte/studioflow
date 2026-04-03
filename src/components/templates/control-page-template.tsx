"use client"

import { ReactNode } from "react"
import { StatsSidebar } from "@/components/ui/stats-sidebar"
import { FilterBar } from "@/components/ui/filter-bar"
import { Button } from "@/components/ui/button"
import { Plus } from "lucide-react"
import { cn } from "@/lib/utils"

interface FilterConfig {
  key: string
  label: string
  options: { value: string; label: string }[]
  value: string | null
  onChange: (value: string | null) => void
}

interface ControlPageTemplateProps {
  // Header
  title: string
  subtitle?: string

  // Actions
  primaryAction?: {
    label: string
    onClick: () => void
    icon?: ReactNode
  }
  secondaryActions?: ReactNode

  // Sidebar Stats
  sidebar?: ReactNode
  sidebarWidth?: string

  // Filters
  searchValue?: string
  onSearchChange?: (value: string) => void
  searchPlaceholder?: string
  filters?: FilterConfig[]
  onClearFilters?: () => void
  filterBarActions?: ReactNode

  // Pipeline (optional - for SALES CONTROL variant)
  pipeline?: ReactNode

  // Content (CollapsibleSections)
  children: ReactNode

  // Loading/Error states
  isLoading?: boolean
  error?: string | null

  className?: string
}

export function ControlPageTemplate({
  title,
  subtitle,
  primaryAction,
  secondaryActions,
  sidebar,
  sidebarWidth = "280px",
  searchValue,
  onSearchChange,
  searchPlaceholder,
  filters,
  onClearFilters,
  filterBarActions,
  pipeline,
  children,
  isLoading,
  error,
  className,
}: ControlPageTemplateProps) {
  return (
    <div className={cn("space-y-6", className)}>
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
          {subtitle && (
            <p className="text-muted-foreground mt-1">{subtitle}</p>
          )}
        </div>
        <div className="flex items-center gap-2">
          {secondaryActions}
          {primaryAction && (
            <Button onClick={primaryAction.onClick}>
              {primaryAction.icon || <Plus className="h-4 w-4 mr-2" />}
              {primaryAction.label}
            </Button>
          )}
        </div>
      </div>

      {/* Pipeline (SALES CONTROL variant) */}
      {pipeline}

      {/* Filter Bar */}
      {(onSearchChange || filters?.length) && (
        <FilterBar
          searchValue={searchValue}
          onSearchChange={onSearchChange}
          searchPlaceholder={searchPlaceholder}
          filters={filters}
          onClearAll={onClearFilters}
        >
          {filterBarActions}
        </FilterBar>
      )}

      {/* Error State */}
      {error && (
        <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4 text-destructive">
          {error}
        </div>
      )}

      {/* Loading State */}
      {isLoading && (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      )}

      {/* Main Content with Sidebar */}
      {!isLoading && !error && (
        <div className="flex gap-6">
          {/* Main Panel */}
          <div className="flex-1 space-y-4">
            {children}
          </div>

          {/* Stats Sidebar */}
          {sidebar && (
            <StatsSidebar width={sidebarWidth}>
              {sidebar}
            </StatsSidebar>
          )}
        </div>
      )}
    </div>
  )
}
