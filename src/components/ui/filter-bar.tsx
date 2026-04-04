"use client"

import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Button } from "@/components/ui/button"
import { Search, X } from "lucide-react"
import { cn } from "@/lib/utils"

interface FilterOption {
  value: string
  label: string
}

interface FilterConfig {
  key: string
  label: string
  options: FilterOption[]
  value: string | null
  onChange: (value: string | null) => void
}

interface FilterBarProps {
  searchValue?: string
  onSearchChange?: (value: string) => void
  searchPlaceholder?: string
  filters?: FilterConfig[]
  onClearAll?: () => void
  className?: string
  children?: React.ReactNode // For custom actions like export button
}

export function FilterBar({
  searchValue = "",
  onSearchChange,
  searchPlaceholder = "Search...",
  filters = [],
  onClearAll,
  className,
  children,
}: FilterBarProps) {
  const hasActiveFilters = searchValue || filters.some(f => f.value)

  return (
    <div className={cn("flex flex-wrap items-center gap-3", className)}>
      {/* Search Input */}
      {onSearchChange && (
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={searchValue}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder={searchPlaceholder}
            className="pl-9"
            style={{ paddingLeft: '2.25rem' }}
          />
        </div>
      )}

      {/* Filter Dropdowns */}
      {filters.map((filter) => (
        <Select
          key={filter.key}
          value={filter.value || "all"}
          onValueChange={(v) => filter.onChange(v === "all" ? null : v)}
        >
          <SelectTrigger className="w-[150px]">
            <SelectValue placeholder={filter.label} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All {filter.label}</SelectItem>
            {filter.options.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      ))}

      {/* Clear All Button */}
      {hasActiveFilters && onClearAll && (
        <Button variant="ghost" size="sm" onClick={onClearAll}>
          <X className="h-4 w-4 mr-1" />
          Clear
        </Button>
      )}

      {/* Custom Actions Slot */}
      {children && <div className="ml-auto flex items-center gap-2">{children}</div>}
    </div>
  )
}
