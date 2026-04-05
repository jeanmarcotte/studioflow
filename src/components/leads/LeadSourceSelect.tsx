'use client'

import { useState, useEffect } from 'react'
import { Check } from 'lucide-react'
import { supabase } from '@/lib/supabase'

interface LeadSource {
  id: string
  slug: string
  display_name: string
  source_type: string
  category_name: string | null
}

interface LeadSourceSelectProps {
  value: string | null
  onChange: (sourceId: string | null, sourceType: string | null) => void
  required?: boolean
}

const CATEGORY_ICONS: Record<string, string> = {
  bridal_shows: '📅',
  digital: '💻',
  referrals: '🤝',
  organic: '🌱',
}

export function LeadSourceSelect({ value, onChange, required }: LeadSourceSelectProps) {
  const [sources, setSources] = useState<LeadSource[]>([])

  useEffect(() => {
    supabase
      .from('lead_sources')
      .select('id, slug, display_name, source_type, lead_source_categories(category_name)')
      .eq('is_active', true)
      .order('display_name')
      .then(({ data }) => {
        const mapped = (data || []).map((s: any) => ({
          id: s.id,
          slug: s.slug,
          display_name: s.display_name,
          source_type: s.source_type,
          category_name: s.lead_source_categories?.category_name || null,
        }))
        setSources(mapped)
      })
  }, [])

  // Group by category
  const groups = sources.reduce<Record<string, LeadSource[]>>((acc, s) => {
    const cat = s.category_name || 'other'
    if (!acc[cat]) acc[cat] = []
    acc[cat].push(s)
    return acc
  }, {})

  const isEmpty = !value
  const borderClass = isEmpty && required
    ? 'border-red-400 ring-1 ring-red-200 animate-pulse'
    : value
      ? 'border-green-300'
      : 'border-border'

  const handleChange = (sourceId: string) => {
    if (!sourceId) {
      onChange(null, null)
      return
    }
    const source = sources.find(s => s.id === sourceId)
    onChange(sourceId, source?.source_type || null)
  }

  return (
    <div className="flex items-center justify-between gap-3">
      <label className="text-sm text-muted-foreground shrink-0 w-28">Lead Source</label>
      <div className="relative flex-1">
        <select
          value={value || ''}
          onChange={(e) => handleChange(e.target.value)}
          className={`w-full h-10 rounded-lg border bg-white px-3 text-sm outline-none transition-all ${borderClass}`}
        >
          <option value="">Select source...</option>
          {Object.entries(groups).map(([cat, items]) => (
            <optgroup key={cat} label={`${CATEGORY_ICONS[cat] || '📌'} ${cat.replace(/_/g, ' ').toUpperCase()}`}>
              {items.map(s => (
                <option key={s.id} value={s.id}>{s.display_name}</option>
              ))}
            </optgroup>
          ))}
        </select>
        {value && (
          <Check className="absolute right-8 top-1/2 -translate-y-1/2 h-4 w-4 text-green-500" />
        )}
      </div>
    </div>
  )
}
