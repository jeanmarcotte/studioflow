'use client'

import { useState, useCallback } from 'react'
import { Check } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { toast } from 'sonner'
import type { Lead } from '@/lib/lead-utils'
import { LeadSourceSelect } from './LeadSourceSelect'
import { ReferrerSelect } from './ReferrerSelect'
import { lookupVenue, autoRateVenue } from '@/lib/venue-utils'

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

const ETHNICITY_OPTIONS = [
  { value: 'italian', label: 'Italian' },
  { value: 'portuguese', label: 'Portuguese' },
  { value: 'greek', label: 'Greek' },
  { value: 'middle_eastern', label: 'Middle Eastern' },
  { value: 'south_asian', label: 'South Asian' },
  { value: 'filipino', label: 'Filipino' },
  { value: 'chinese', label: 'Chinese' },
  { value: 'korean', label: 'Korean' },
  { value: 'caribbean', label: 'Caribbean' },
  { value: 'other', label: 'Other' },
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
    <div className="flex items-center justify-between gap-3">
      <label className="text-sm text-muted-foreground shrink-0 w-28">{label}</label>
      <div className="relative flex-1">
        <select
          value={value || ''}
          onChange={(e) => onChange(e.target.value)}
          className={`w-full h-10 rounded-lg border bg-white px-3 text-sm outline-none transition-all ${borderClass}`}
        >
          <option value="">Select...</option>
          {options.map(o => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
        {value && (
          <Check className="absolute right-8 top-1/2 -translate-y-1/2 h-4 w-4 text-green-500" />
        )}
      </div>
    </div>
  )
}

function FieldToggle({ label, value, recommended, onChange }: {
  label: string
  value: string | null
  recommended?: boolean
  onChange: (val: string) => void
}) {
  const opts = ['yes', 'no', 'maybe'] as const
  const isEmpty = !value
  const borderClass = isEmpty && recommended ? 'border-yellow-400' : 'border-border'

  return (
    <div className="flex items-center justify-between gap-3">
      <label className="text-sm text-muted-foreground shrink-0 w-28">{label}</label>
      <div className={`flex rounded-lg border overflow-hidden ${borderClass}`}>
        {opts.map(o => (
          <button
            key={o}
            onClick={() => onChange(o)}
            className={`h-10 px-4 text-sm font-medium transition-colors capitalize ${
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
    <div className="flex items-center justify-between gap-3">
      <label className="text-sm text-muted-foreground shrink-0 w-28">{label}</label>
      <button
        onClick={() => onChange(!checked)}
        className={`h-10 w-10 rounded-lg border flex items-center justify-center transition-colors ${
          checked ? 'bg-[#0d4f4f] border-[#0d4f4f] text-white' : 'bg-white border-border text-transparent hover:bg-muted/60'
        }`}
      >
        <Check className="h-5 w-5" />
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
    <div className="flex items-center justify-between gap-3">
      <label className="text-sm text-muted-foreground shrink-0 w-28">{label}</label>
      <input
        type="number"
        value={value ?? ''}
        min={min}
        max={max}
        onChange={(e) => onChange(e.target.value ? parseInt(e.target.value) : null)}
        className="h-10 w-24 rounded-lg border border-border bg-white px-3 text-sm text-right outline-none transition-all focus:border-[#0d4f4f] focus:ring-1 focus:ring-[#0d4f4f]/20"
      />
    </div>
  )
}

export function DiscoverySection({ lead, onUpdate }: DiscoverySectionProps) {
  const [saving, setSaving] = useState(false)
  const [venueQuery, setVenueQuery] = useState('')
  const [venueResults, setVenueResults] = useState<any[]>([])
  const [venueOpen, setVenueOpen] = useState(false)
  const [sourceType, setSourceType] = useState<string | null>(null)

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

  const handleVenueSearch = useCallback(async (q: string) => {
    setVenueQuery(q)
    if (q.length >= 2) {
      const results = await lookupVenue(q)
      setVenueResults(results)
      setVenueOpen(results.length > 0)
    } else {
      setVenueResults([])
      setVenueOpen(false)
    }
  }, [])

  const handleVenueSelect = useCallback(async (venue: any) => {
    setVenueOpen(false)
    setVenueQuery('')
    await saveField('venue_name', venue.venue_name)
    await autoRateVenue(lead.id, venue)
    // Update local state with venue info
    const updates: Partial<Lead> = { venue_name: venue.venue_name }
    if (venue.jean_score != null) updates.venue_rating = venue.jean_score
    if (venue.venue_type) updates.venue_type = venue.venue_type
    onUpdate({ ...lead, ...updates } as Lead)
    toast.success(`Venue rated: ${venue.jean_score}/10`)
  }, [lead, onUpdate, saveField])

  const isReferralSource = sourceType === 'past_client' || sourceType === 'venue' || sourceType === 'planner' || sourceType === 'vendor' || sourceType === 'referral' || lead.referrer_id != null

  return (
    <div className="space-y-3">
      <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
        <span>📋</span> Discovery
        {saving && <span className="text-[10px] text-muted-foreground/60 ml-auto">Saving...</span>}
      </h3>

      <div className="space-y-2.5">
        {/* Lead Source */}
        <LeadSourceSelect
          value={lead.lead_source_id}
          onChange={(sourceId, srcType) => {
            saveField('lead_source_id', sourceId)
            setSourceType(srcType)
          }}
        />

        {/* Referrer — only for referral sources */}
        {isReferralSource && (
          <ReferrerSelect
            value={lead.referrer_id}
            onChange={(referrerId) => saveField('referrer_id', referrerId)}
          />
        )}

        {/* Venue autocomplete */}
        <div className="flex items-center justify-between gap-3">
          <label className="text-sm text-muted-foreground shrink-0 w-28">Venue</label>
          <div className="relative flex-1">
            <input
              value={venueQuery || lead.venue_name || ''}
              onChange={(e) => handleVenueSearch(e.target.value)}
              onFocus={() => { if (venueResults.length > 0) setVenueOpen(true) }}
              placeholder="Type venue name..."
              className={`w-full h-10 rounded-lg border bg-white px-3 text-sm outline-none transition-all focus:border-[#0d4f4f] focus:ring-1 focus:ring-[#0d4f4f]/20 ${
                lead.venue_rating ? 'border-green-300' : 'border-border'
              }`}
            />
            {lead.venue_rating != null && (
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-green-600">
                {lead.venue_rating}/10
              </span>
            )}
            {venueOpen && venueResults.length > 0 && (
              <div className="absolute z-50 top-full mt-1 w-full rounded-lg border border-border bg-white shadow-lg overflow-hidden">
                {venueResults.map((v: any) => (
                  <button
                    key={v.id}
                    onClick={() => handleVenueSelect(v)}
                    className="w-full flex items-center justify-between px-3 py-2 text-sm text-left hover:bg-muted/60 transition-colors"
                  >
                    <span className="font-medium">{v.venue_name}</span>
                    <span className="text-xs text-muted-foreground">
                      {v.jean_score != null ? `${v.jean_score}/10` : ''} {v.city || ''}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        <FieldSelect
          label="Budget"
          value={lead.budget_range}
          options={BUDGET_OPTIONS}
          required
          onChange={(v) => saveField('budget_range', v || null)}
        />
        <FieldSelect
          label="Ethnicity"
          value={lead.inferred_ethnicity}
          options={ETHNICITY_OPTIONS}
          required
          onChange={(v) => saveField('inferred_ethnicity', v || null)}
        />
        <FieldToggle
          label="Album"
          value={lead.want_album}
          recommended
          onChange={(v) => saveField('want_album', v)}
        />
        <FieldToggle
          label="Engagement"
          value={lead.want_engagement}
          recommended
          onChange={(v) => saveField('want_engagement', v)}
        />
        <FieldNumber
          label="Bridal Party"
          value={lead.bridal_party_size}
          min={1}
          max={20}
          onChange={(v) => saveField('bridal_party_size', v)}
        />
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
