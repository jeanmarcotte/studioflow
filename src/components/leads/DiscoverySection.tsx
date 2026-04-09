'use client'

import { useState, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { toast } from 'sonner'
import type { Lead } from '@/lib/lead-utils'

interface DiscoverySectionProps {
  lead: Lead
  onUpdate: (updated: Lead) => void
}

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

const CULTURE_OPTIONS = [
  { value: '', label: 'Unknown' },
  { value: 'portuguese', label: 'Portuguese' },
  { value: 'greek', label: 'Greek' },
  { value: 'italian', label: 'Italian' },
  { value: 'filipino', label: 'Filipino' },
  { value: 'trinidadian', label: 'Trinidadian' },
  { value: 'ghanaian', label: 'Ghanaian' },
  { value: 'caribbean', label: 'Caribbean' },
  { value: 'spanish', label: 'Spanish' },
  { value: 'mexican', label: 'Mexican' },
  { value: 'venezuelan', label: 'Venezuelan' },
  { value: 'colombian', label: 'Colombian' },
  { value: 'jewish', label: 'Jewish' },
  { value: 'south asian', label: 'South Asian' },
  { value: 'canadian', label: 'Canadian' },
  { value: 'chinese', label: 'Chinese' },
  { value: 'vietnamese', label: 'Vietnamese' },
  { value: 'korean', label: 'Korean' },
  { value: 'japanese', label: 'Japanese' },
  { value: 'irish', label: 'Irish' },
  { value: 'scottish', label: 'Scottish' },
  { value: 'ukrainian', label: 'Ukrainian' },
  { value: 'croatian', label: 'Croatian' },
  { value: 'french canadian', label: 'French Canadian' },
  { value: 'middle eastern', label: 'Middle Eastern' },
  { value: 'muslim', label: 'Muslim' },
]

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

  const saveCulture = useCallback(async (value: string) => {
    setSaving(true)
    const ethnicity = value || null
    const { error } = await supabase
      .from('ballots')
      .update({ inferred_ethnicity: ethnicity, culture_confirmed: !!ethnicity })
      .eq('id', lead.id)

    if (error) {
      toast.error('Failed to save culture')
    } else {
      toast.success('Culture saved', { duration: 1500 })
      onUpdate({ ...lead, inferred_ethnicity: ethnicity, culture_confirmed: !!ethnicity } as Lead)
    }
    setSaving(false)
  }, [lead, onUpdate])

  const getRadioValue = (field: string): string | null => {
    const v = (lead as any)[field]
    if (v === true) return 'yes'
    if (v === false) return 'no'
    if (typeof v === 'string') return v
    return null
  }

  const setRadioValue = (field: string, val: string) => {
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

      {/* Culture dropdown */}
      <div className="flex items-center gap-3">
        <label className="text-sm text-slate-700 dark:text-slate-300 shrink-0 w-32">Culture</label>
        <select
          value={lead.inferred_ethnicity || ''}
          onChange={(e) => saveCulture(e.target.value)}
          className="h-8 flex-1 rounded-lg border border-border bg-white dark:bg-slate-800 px-2 text-sm outline-none transition-all focus:border-[#0d4f4f] focus:ring-1 focus:ring-[#0d4f4f]/20"
        >
          {CULTURE_OPTIONS.map(o => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
        {lead.inferred_ethnicity && !lead.culture_confirmed && (
          <span className="text-[10px] text-slate-400">(auto)</span>
        )}
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

      {/* Guest Count + Bridal Party + Flower Girl/Ring Bearer */}
      <div className="space-y-2">
        <div className="flex items-center gap-3">
          <label className="text-sm text-slate-700 dark:text-slate-300 shrink-0 w-32"># of Guests</label>
          <input
            type="number"
            value={(lead as any).guest_count ?? ''}
            min={1}
            max={1000}
            onChange={(e) => saveField('guest_count', e.target.value ? parseInt(e.target.value) : null)}
            className="h-8 w-20 rounded-lg border border-border bg-white dark:bg-slate-800 px-2 text-sm text-right outline-none transition-all focus:border-[#0d4f4f] focus:ring-1 focus:ring-[#0d4f4f]/20"
          />
        </div>
        <div className="flex items-center gap-3">
          <label className="text-sm text-slate-700 dark:text-slate-300 shrink-0 w-32"># in Bridal Party</label>
          <input
            type="number"
            value={lead.bridal_party_size ?? ''}
            min={1}
            max={20}
            onChange={(e) => saveField('bridal_party_size', e.target.value ? parseInt(e.target.value) : null)}
            className="h-8 w-20 rounded-lg border border-border bg-white dark:bg-slate-800 px-2 text-sm text-right outline-none transition-all focus:border-[#0d4f4f] focus:ring-1 focus:ring-[#0d4f4f]/20"
          />
        </div>
        <div className="flex items-center gap-3">
          <label className="text-sm text-slate-700 dark:text-slate-300 shrink-0 w-32">Flower Girl / Ring Bearer</label>
          <button
            onClick={() => saveField('has_flower_girl', !(lead as any).has_flower_girl)}
            className={`h-8 px-3 rounded-lg border text-sm font-medium transition-all ${
              (lead as any).has_flower_girl
                ? 'border-[#0d4f4f] bg-[#0d4f4f] text-white'
                : 'border-border bg-white dark:bg-slate-800 text-slate-500'
            }`}
          >
            {(lead as any).has_flower_girl ? 'Yes' : 'No'}
          </button>
        </div>
      </div>
    </div>
  )
}
