"use client"

import { ReactNode } from "react"
import { StatsRow } from "@/components/ui/stats-row"
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

interface InfoPageTemplateProps {
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

  // Stats Row (optional)
  statsRow?: ReactNode

  // Filters
  searchValue?: string
  onSearchChange?: (value: string) => void
  searchPlaceholder?: string
  filters?: FilterConfig[]
  onClearFilters?: () => void
  filterBarActions?: ReactNode // e.g., Export CSV button

  // Content
  children: ReactNode

  // Loading/Error states
  isLoading?: boolean
  error?: string | null

  className?: string
}

export function InfoPageTemplate({
  title,
  subtitle,
  primaryAction,
  secondaryActions,
  statsRow,
  searchValue,
  onSearchChange,
  searchPlaceholder,
  filters,
  onClearFilters,
  filterBarActions,
  children,
  isLoading,
  error,
  className,
}: InfoPageTemplateProps) {
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

      {/* Stats Row */}
      {statsRow && <StatsRow>{statsRow}</StatsRow>}

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

      {/* Content */}
      {!isLoading && !error && children}
    </div>
  )
}
