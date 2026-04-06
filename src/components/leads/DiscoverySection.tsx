'use client'

import { useState, useCallback } from 'react'
import { Check } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { toast } from 'sonner'
import type { Lead } from '@/lib/lead-utils'

interface DiscoverySectionProps {
  lead: Lead
  onUpdate: (updated: Lead) => void
}

const BUDGET_OPTIONS = [
  { value: 'under_4k', label: 'Under $4K' },
  { value: '4k_6k', label: '$4K–$6K' },
  { value: '6k_8k', label: '$6K–$8K' },
  { value: '8k_10k', label: '$8K–$10K' },
  { value: 'over_10k', label: 'Over $10K' },
  { value: 'flexible', label: 'Flexible' },
]

const VENUE_TYPE_OPTIONS = [
  { value: 'banquet_hall', label: 'Banquet Hall' },
  { value: 'estate', label: 'Estate' },
  { value: 'golf_club', label: 'Golf Club' },
  { value: 'restaurant', label: 'Restaurant' },
  { value: 'hotel', label: 'Hotel' },
  { value: 'barn', label: 'Barn' },
  { value: 'winery', label: 'Winery' },
  { value: 'backyard', label: 'Backyard' },
]

function FieldSelect({ label, value, options, required, recommended, onChange }: {
  label: string
  value: string | null
  options: { value: string; label: string }[]
  required?: boolean
  recommended?: boolean
  onChange: (val: string) => void
}) {
  const isEmpty = !value
  const borderClass = isEmpty && required
    ? 'border-red-400 ring-1 ring-red-200 animate-pulse'
    : isEmpty && recommended
      ? 'border-yellow-400'
      : value
        ? 'border-green-300'
        : 'border-border'

  return (
    <div className="flex items-center gap-3">
      <label className="text-[11px] text-muted-foreground font-medium shrink-0 w-20">{label}</label>
      <div className="relative flex-1 min-w-0">
        <select
          value={value || ''}
          onChange={(e) => onChange(e.target.value)}
          className={`w-full h-8 rounded-md border bg-white px-2 pr-7 text-xs outline-none transition-all ${borderClass}`}
        >
          <option value="">Select...</option>
          {options.map(o => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
        {value && (
          <Check className="absolute right-7 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-green-500" />
        )}
      </div>
    </div>
  )
}

function FieldToggle({ label, value, onChange }: {
  label: string
  value: string | null
  recommended?: boolean
  onChange: (val: string) => void
}) {
  const opts = ['yes', 'no', 'maybe'] as const
  return (
    <div>
      <label className="text-[11px] text-muted-foreground font-medium mb-1 block">{label}</label>
      <div className="flex rounded-md border border-border overflow-hidden">
        {opts.map(o => (
          <button
            key={o}
            onClick={() => onChange(o)}
            className={`h-7 px-2.5 text-xs font-medium transition-colors capitalize ${
              value === o
                ? 'bg-[#0d4f4f] text-white'
                : 'bg-white text-muted-foreground hover:bg-muted/60'
            }`}
          >
            {o}
          </button>
        ))}
      </div>
    </div>
  )
}

function FieldCheckbox({ label, checked, onChange }: {
  label: string
  checked: boolean
  onChange: (val: boolean) => void
}) {
  return (
    <div>
      <label className="text-[11px] text-muted-foreground font-medium mb-1 block">{label}</label>
      <button
        onClick={() => onChange(!checked)}
        className={`h-7 w-7 rounded-md border flex items-center justify-center transition-colors ${
          checked ? 'bg-[#0d4f4f] border-[#0d4f4f] text-white' : 'bg-white border-border text-transparent hover:bg-muted/60'
        }`}
      >
        <Check className="h-4 w-4" />
      </button>
    </div>
  )
}

function FieldNumber({ label, value, min, max, onChange }: {
  label: string
  value: number | null
  min?: number
  max?: number
  onChange: (val: number | null) => void
}) {
  return (
    <div className="flex items-center gap-3">
      <label className="text-[11px] text-muted-foreground font-medium shrink-0 w-20">{label}</label>
      <input
        type="number"
        value={value ?? ''}
        min={min}
        max={max}
        onChange={(e) => onChange(e.target.value ? parseInt(e.target.value) : null)}
        className="h-8 w-20 rounded-md border border-border bg-white px-2 text-xs text-right outline-none transition-all focus:border-[#0d4f4f] focus:ring-1 focus:ring-[#0d4f4f]/20"
      />
    </div>
  )
}

export function DiscoverySection({ lead, onUpdate }: DiscoverySectionProps) {
  const [saving, setSaving] = useState(false)

  const saveField = useCallback(async (field: string, value: any) => {
    setSaving(true)
    const { error } = await supabase
      .from('ballots')
      .update({ [field]: value })
      .eq('id', lead.id)

    if (error) {
      toast.error(`Failed to save ${field}`)
    } else {
      toast.success('Saved', { duration: 1500 })
      onUpdate({ ...lead, [field]: value } as Lead)
    }
    setSaving(false)
  }, [lead, onUpdate])

  return (
    <div className="space-y-2">
      <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
        <span>📋</span> Discovery
        {saving && <span className="text-[10px] text-muted-foreground/60 ml-auto">Saving...</span>}
      </h3>

      <div className="space-y-2">
        {/* Row 1: Budget */}
        <FieldSelect
          label="Budget"
          value={lead.budget_range}
          options={BUDGET_OPTIONS}
          required
          onChange={(v) => saveField('budget_range', v || null)}
        />

        {/* Row 2: Album + Engagement side by side */}
        <div className="flex gap-3">
          <FieldToggle
            label="Album"
            value={lead.want_album}
            onChange={(v) => saveField('want_album', v)}
          />
          <FieldToggle
            label="Engagement"
            value={lead.want_engagement}
            onChange={(v) => saveField('want_engagement', v)}
          />
        </div>

        {/* Row 3: Bridal Party */}
        <FieldNumber
          label="Bridal Party"
          value={lead.bridal_party_size}
          min={1}
          max={20}
          onChange={(v) => saveField('bridal_party_size', v)}
        />

        {/* Row 4: Multi-Day + Planner + DJ */}
        <div className="flex items-end gap-3">
          <FieldCheckbox
            label="Multi-Day"
            checked={lead.multi_day_event === true}
            onChange={(v) => saveField('multi_day_event', v)}
          />
          <FieldCheckbox
            label="Planner"
            checked={lead.planner_involved === true}
            onChange={(v) => saveField('planner_involved', v)}
          />
          <FieldCheckbox
            label="DJ"
            checked={(lead as any).has_dj === true}
            onChange={(v) => saveField('has_dj', v)}
          />
        </div>

        {/* Row 5: Venue Type (full width) */}
        <FieldSelect
          label="Venue Type"
          value={lead.venue_type}
          options={VENUE_TYPE_OPTIONS}
          onChange={(v) => saveField('venue_type', v || null)}
        />
      </div>
    </div>
  )
}
