'use client'

import { useState, useEffect, useRef } from 'react'
import { Search, Plus, Check } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { toast } from 'sonner'

interface Referrer {
  id: string
  name: string
  relationship_type: string | null
}

interface ReferrerSelectProps {
  value: string | null
  onChange: (referrerId: string | null) => void
}

const RELATIONSHIP_TYPES = [
  { value: 'past_client', label: 'Past Client' },
  { value: 'venue_contact', label: 'Venue Contact' },
  { value: 'planner', label: 'Planner' },
  { value: 'vendor', label: 'Vendor' },
  { value: 'friend', label: 'Friend/Family' },
]

export function ReferrerSelect({ value, onChange }: ReferrerSelectProps) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<Referrer[]>([])
  const [open, setOpen] = useState(false)
  const [selected, setSelected] = useState<Referrer | null>(null)
  const [creating, setCreating] = useState(false)
  const [newType, setNewType] = useState('past_client')
  const inputRef = useRef<HTMLInputElement>(null)

  // Load selected referrer on mount
  useEffect(() => {
    if (!value) { setSelected(null); return }
    supabase
      .from('referrers')
      .select('id, name, relationship_type')
      .eq('id', value)
      .limit(1)
      .then(({ data }) => {
        if (data?.[0]) setSelected(data[0] as Referrer)
      })
  }, [value])

  // Search referrers
  useEffect(() => {
    if (!query || query.length < 2) { setResults([]); return }
    const timer = setTimeout(async () => {
      const { data } = await supabase
        .from('referrers')
        .select('id, name, relationship_type')
        .ilike('name', `%${query}%`)
        .limit(8)
      setResults((data as Referrer[]) || [])
    }, 200)
    return () => clearTimeout(timer)
  }, [query])

  const handleSelect = (ref: Referrer) => {
    setSelected(ref)
    onChange(ref.id)
    setOpen(false)
    setQuery('')
  }

  const handleCreate = async () => {
    if (!query.trim()) return
    setCreating(true)
    const { data, error } = await supabase
      .from('referrers')
      .insert({ name: query.trim(), relationship_type: newType })
      .select('id, name, relationship_type')
      .limit(1)

    if (error || !data?.[0]) {
      toast.error('Failed to create referrer')
      setCreating(false)
      return
    }

    const newRef = data[0] as Referrer
    handleSelect(newRef)
    toast.success(`Created referrer: ${newRef.name}`)
    setCreating(false)
  }

  const handleClear = () => {
    setSelected(null)
    onChange(null)
    setQuery('')
  }

  return (
    <div className="flex items-center justify-between gap-3">
      <label className="text-sm text-muted-foreground shrink-0 w-28">Referred By</label>
      <div className="relative flex-1">
        {selected ? (
          <div className="flex items-center h-10 rounded-lg border border-green-300 bg-white px-3 text-sm gap-2">
            <Check className="h-4 w-4 text-green-500 shrink-0" />
            <span className="flex-1 truncate">{selected.name}</span>
            <button onClick={handleClear} className="text-muted-foreground hover:text-foreground text-xs">
              ✕
            </button>
          </div>
        ) : (
          <>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input
                ref={inputRef}
                value={query}
                onChange={(e) => { setQuery(e.target.value); setOpen(true) }}
                onFocus={() => setOpen(true)}
                placeholder="Search referrers..."
                className="w-full h-10 rounded-lg border border-border bg-white pl-9 pr-3 text-sm outline-none transition-all focus:border-[#0d4f4f] focus:ring-1 focus:ring-[#0d4f4f]/20"
              />
            </div>

            {open && query.length >= 2 && (
              <div className="absolute z-50 top-full mt-1 w-full rounded-lg border border-border bg-white shadow-lg overflow-hidden">
                {results.map(r => (
                  <button
                    key={r.id}
                    onClick={() => handleSelect(r)}
                    className="w-full flex items-center gap-2 px-3 py-2.5 text-sm text-left hover:bg-muted/60 transition-colors"
                  >
                    <span className="font-medium">{r.name}</span>
                    {r.relationship_type && (
                      <span className="text-xs text-muted-foreground">({r.relationship_type.replace(/_/g, ' ')})</span>
                    )}
                  </button>
                ))}

                {results.length === 0 && (
                  <div className="px-3 py-2 text-xs text-muted-foreground">No matches found</div>
                )}

                <div className="border-t border-border px-3 py-2 space-y-2">
                  <div className="flex items-center gap-2">
                    <select
                      value={newType}
                      onChange={(e) => setNewType(e.target.value)}
                      className="h-8 rounded border border-border bg-white px-2 text-xs"
                    >
                      {RELATIONSHIP_TYPES.map(t => (
                        <option key={t.value} value={t.value}>{t.label}</option>
                      ))}
                    </select>
                  </div>
                  <button
                    onClick={handleCreate}
                    disabled={creating}
                    className="w-full flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-[#0d4f4f] hover:bg-[#0d4f4f]/5 rounded transition-colors"
                  >
                    <Plus className="h-4 w-4" />
                    {creating ? 'Creating...' : `Create "${query}"`}
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
