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

const RADIO_FIELDS: { label: string; field: string }[] = [
  { label: 'Album', field: 'want_album' },
  { label: 'Engagement', field: 'want_engagement' },
  { label: 'DJ', field: 'has_dj' },
  { label: 'Planner', field: 'planner_involved' },
  { label: 'Multi-Day', field: 'multi_day_event' },
  { label: 'First Look', field: 'first_look' },
]

function RadioRow({ label, value, onChange }: {
  label: string
  value: string | null
  onChange: (val: string) => void
}) {
  const opts = ['yes', 'no', 'maybe'] as const
  return (
    <div className="flex items-center justify-between py-1.5">
      <span className="text-sm text-slate-700 dark:text-slate-300">{label}</span>
      <div className="flex gap-4">
        {opts.map(o => (
          <button
            key={o}
            onClick={() => onChange(o)}
            className="flex items-center gap-1 group"
          >
            <span className={`h-4 w-4 rounded-full border-2 flex items-center justify-center transition-colors ${
              value === o
                ? 'border-[#0d4f4f] bg-[#0d4f4f]'
                : 'border-slate-300 dark:border-slate-600 group-hover:border-slate-400'
            }`}>
              {value === o && <span className="h-1.5 w-1.5 rounded-full bg-white" />}
            </span>
          </button>
        ))}
      </div>
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

  // Normalize boolean fields to yes/no/maybe strings for radio display
  const getRadioValue = (field: string): string | null => {
    const v = (lead as any)[field]
    if (v === true) return 'yes'
    if (v === false) return 'no'
    if (typeof v === 'string') return v
    return null
  }

  const setRadioValue = (field: string, val: string) => {
    // For boolean columns, store as boolean; for text columns, store as string
    if (field === 'multi_day_event' || field === 'planner_involved') {
      saveField(field, val === 'yes' ? true : val === 'no' ? false : null)
    } else {
      saveField(field, val)
    }
  }

  return (
    <div className="space-y-2">
      <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
        <span>📋</span> Discovery
        {saving && <span className="text-[10px] text-muted-foreground/60 ml-auto">Saving...</span>}
      </h3>

      {/* Budget dropdown — full width */}
      <div>
        <select
          value={lead.budget_range || ''}
          onChange={(e) => saveField('budget_range', e.target.value || null)}
          className={`w-full h-9 rounded-lg border bg-white dark:bg-slate-800 px-3 text-sm outline-none transition-all ${
            !lead.budget_range ? 'border-red-400 ring-1 ring-red-200' : 'border-green-300'
          }`}
        >
          <option value="">Select budget...</option>
          {BUDGET_OPTIONS.map(o => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
      </div>

      {/* Radio button grid */}
      <div className="rounded-lg border border-border/60 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-3 py-1.5 bg-slate-50 dark:bg-slate-800/50 border-b border-border/60">
          <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">Field</span>
          <div className="flex gap-4">
            <span className="text-[10px] font-bold text-muted-foreground uppercase w-4 text-center">Y</span>
            <span className="text-[10px] font-bold text-muted-foreground uppercase w-4 text-center">N</span>
            <span className="text-[10px] font-bold text-muted-foreground uppercase w-4 text-center">?</span>
          </div>
        </div>
        {/* Rows */}
        <div className="px-3 divide-y divide-border/40">
          {RADIO_FIELDS.map(rf => (
            <RadioRow
              key={rf.field}
              label={rf.label}
              value={getRadioValue(rf.field)}
              onChange={(val) => setRadioValue(rf.field, val)}
            />
          ))}
        </div>
      </div>

      {/* Bridal Party */}
      <div className="flex items-center gap-3">
        <label className="text-sm text-slate-700 dark:text-slate-300 shrink-0">Bridal Party</label>
        <input
          type="number"
          value={lead.bridal_party_size ?? ''}
          min={1}
          max={20}
          onChange={(e) => saveField('bridal_party_size', e.target.value ? parseInt(e.target.value) : null)}
          className="h-8 w-20 rounded-lg border border-border bg-white dark:bg-slate-800 px-2 text-sm text-right outline-none transition-all focus:border-[#0d4f4f] focus:ring-1 focus:ring-[#0d4f4f]/20"
        />
      </div>
    </div>
  )
}
