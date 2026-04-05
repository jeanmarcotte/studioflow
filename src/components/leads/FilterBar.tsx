'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Plus } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import type { FilterKey } from '@/lib/lead-utils'

interface FilterBarProps {
  activeFilter: FilterKey
  onFilterChange: (filter: FilterKey) => void
  counts: Record<FilterKey, number>
  sourceFilter: string
  onSourceFilterChange: (source: string) => void
}

interface SourceOption {
  id: string
  display_name: string
  category_name: string | null
}

const FILTERS: { key: FilterKey; label: string; activeClass: string }[] = [
  { key: 'no-no-yes', label: 'NO-NO-YES', activeClass: 'bg-[#0d4f4f] text-white hover:bg-[#0d4f4f]/90 border-[#0d4f4f]' },
  { key: 'no-no-no', label: 'NO-NO-NO', activeClass: 'bg-gray-700 text-white hover:bg-gray-700/90 border-gray-700' },
  { key: 'contacted', label: 'CONTACTED', activeClass: 'bg-blue-600 text-white hover:bg-blue-600/90 border-blue-600' },
]

export function FilterBar({ activeFilter, onFilterChange, counts, sourceFilter, onSourceFilterChange }: FilterBarProps) {
  const [sources, setSources] = useState<SourceOption[]>([])
  const [categories, setCategories] = useState<string[]>([])

  useEffect(() => {
    supabase
      .from('lead_sources')
      .select('id, display_name, lead_source_categories(category_name)')
      .eq('is_active', true)
      .order('display_name')
      .then(({ data }) => {
        const mapped = (data || []).map((s: any) => ({
          id: s.id,
          display_name: s.display_name,
          category_name: s.lead_source_categories?.category_name || null,
        }))
        setSources(mapped)
        const cats = Array.from(new Set(mapped.map(s => s.category_name).filter(Boolean))) as string[]
        setCategories(cats.sort())
      })
  }, [])

  return (
    <div className="flex items-center gap-3 flex-wrap">
      {FILTERS.map(({ key, label, activeClass }) => (
        <Button
          key={key}
          variant="outline"
          onClick={() => onFilterChange(key)}
          className={`h-12 px-5 text-sm font-bold tracking-wide rounded-xl transition-all ${
            activeFilter === key
              ? activeClass
              : 'bg-white text-muted-foreground border-border hover:bg-muted/60'
          }`}
        >
          {label}
          <span className={`ml-2 text-xs font-semibold rounded-full px-2 py-0.5 ${
            activeFilter === key ? 'bg-white/20' : 'bg-muted'
          }`}>
            {counts[key]}
          </span>
        </Button>
      ))}

      {/* Source filter dropdown */}
      <select
        value={sourceFilter}
        onChange={(e) => onSourceFilterChange(e.target.value)}
        className="h-12 px-4 rounded-xl border border-border bg-white text-sm font-medium text-muted-foreground outline-none transition-all hover:border-[#0d4f4f]/40 focus:border-[#0d4f4f] focus:ring-1 focus:ring-[#0d4f4f]/20"
      >
        <option value="all">All Sources</option>
        {categories.map(cat => (
          <option key={`cat_${cat}`} value={`cat:${cat}`}>
            {cat.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
          </option>
        ))}
        <option disabled>───────────</option>
        {sources.map(s => (
          <option key={s.id} value={s.id}>{s.display_name}</option>
        ))}
      </select>

      <div className="flex-1" />
      <Button
        variant="outline"
        className="h-12 px-4 rounded-xl border-dashed border-2 text-muted-foreground hover:border-[#0d4f4f] hover:text-[#0d4f4f]"
      >
        <Plus className="h-4 w-4 mr-1.5" />
        Add Lead
      </Button>
    </div>
  )
}
