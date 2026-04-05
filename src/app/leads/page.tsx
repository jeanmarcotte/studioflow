'use client'

import { useState, useEffect, useMemo, Component, type ReactNode, type ErrorInfo } from 'react'
import { Nunito } from 'next/font/google'
import { supabase } from '@/lib/supabase'
import { LeadsHeader } from '@/components/leads/LeadsHeader'
import { FilterSidebar, type SidebarFilters } from '@/components/leads/FilterSidebar'
import { LeadGridArea } from '@/components/leads/LeadGridArea'
import { toast } from 'sonner'
import type { Lead, FilterKey } from '@/lib/lead-utils'

const nunito = Nunito({ subsets: ['latin'], weight: ['400', '600', '700'] })

class SafeSection extends Component<{ name: string; children: ReactNode }, { error: Error | null }> {
  state = { error: null as Error | null }
  static getDerivedStateFromError(error: Error) { return { error } }
  componentDidCatch(error: Error, info: ErrorInfo) { console.error(`[SafeSection:${this.props.name}]`, error, info) }
  render() {
    if (this.state.error) {
      return (
        <div style={{ padding: 16, margin: 8, background: '#fee2e2', borderRadius: 8, fontSize: 13 }}>
          <strong style={{ color: '#dc2626' }}>{this.props.name} error:</strong>
          <pre style={{ marginTop: 4, fontSize: 11, whiteSpace: 'pre-wrap', color: '#374151' }}>{this.state.error.message}</pre>
        </div>
      )
    }
    return this.props.children
  }
}

const DEFAULT_FILTERS: SidebarFilters = {
  status: 'no-no-yes',
  locations: [],
  dateRange: 'all',
  venueRatings: [],
  backgrounds: [],
  chaseStatus: [],
}

export default function LeadsPage() {
  const [leads, setLeads] = useState<Lead[]>([])
  const [loading, setLoading] = useState(true)
  const [fetchError, setFetchError] = useState<string | null>(null)
  const [filters, setFilters] = useState<SidebarFilters>(DEFAULT_FILTERS)
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null)
  const [sidebarOpen, setSidebarOpen] = useState(false)

  // Fetch leads
  useEffect(() => {
    async function doFetch() {
      try {
        const { data, error } = await supabase
          .from('ballots')
          .select('*')
          .eq('hidden', false)
          .in('status', ['new', 'contacted'])
          .order('book_score', { ascending: false })

        if (error) {
          setFetchError(error.message)
        } else {
          setLeads((data as Lead[]) || [])
        }
      } catch (err: any) {
        setFetchError(String(err))
      }
      setLoading(false)
    }
    doFetch()
  }, [])

  // Filter logic
  const filteredLeads = useMemo(() => {
    const today = new Date()
    const todayStr = today.toISOString().split('T')[0]

    return leads.filter(l => {
      // Status filter
      switch (filters.status) {
        case 'no-no-yes':
          if (!(l.status === 'new' && !l.has_photographer && !l.has_videographer && l.has_venue === true)) return false
          break
        case 'no-no-no':
          if (!(l.status === 'new' && !l.has_photographer && !l.has_videographer && !l.has_venue)) return false
          break
        case 'contacted':
          if (l.status !== 'contacted') return false
          break
      }

      // Location filter
      if (filters.locations.length > 0) {
        const city = ((l as any).inferred_city || '').toLowerCase()
        const matchesLocation = filters.locations.some(loc => {
          if (loc === 'Other') return !['vaughan', 'hamilton', 'oakville', 'toronto'].includes(city)
          return city.includes(loc.toLowerCase())
        })
        if (!matchesLocation) return false
      }

      // Date range filter
      if (filters.dateRange !== 'all' && l.wedding_date) {
        const wDate = new Date(l.wedding_date + 'T12:00:00')
        const monthsAway = (wDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24 * 30)
        switch (filters.dateRange) {
          case '3m': if (monthsAway > 3 || monthsAway < 0) return false; break
          case '3-6m': if (monthsAway < 3 || monthsAway > 6) return false; break
          case '6-12m': if (monthsAway < 6 || monthsAway > 12) return false; break
          case '12m+': if (monthsAway < 12) return false; break
        }
      }

      // Venue rating filter
      if (filters.venueRatings.length > 0) {
        const vr = l.venue_rating
        const matches = filters.venueRatings.some(r => {
          if (r === '8+') return vr != null && vr >= 8
          if (r === '6-7') return vr != null && vr >= 6 && vr <= 7
          if (r === '<6') return vr != null && vr < 6
          if (r === 'Unknown') return vr == null
          return false
        })
        if (!matches) return false
      }

      // Background filter
      if (filters.backgrounds.length > 0) {
        const eth = (l.inferred_ethnicity || '').toLowerCase()
        const matches = filters.backgrounds.some(bg => {
          if (bg === 'Other') return !['italian', 'greek', 'south_asian', 'filipino'].includes(eth)
          if (bg === 'South Asian') return eth === 'south_asian'
          return eth === bg.toLowerCase()
        })
        if (!matches) return false
      }

      // Chase status filter (only for contacted)
      if (filters.status === 'contacted' && filters.chaseStatus.length > 0) {
        const matches = filters.chaseStatus.some(cs => {
          switch (cs) {
            case 'Due Today': return l.next_contact_due === todayStr
            case 'Overdue': return l.next_contact_due != null && l.next_contact_due < todayStr && l.contact_status !== 'exhausted'
            case 'Upcoming': return l.next_contact_due != null && l.next_contact_due > todayStr
            case 'Exhausted': return l.contact_status === 'exhausted'
            default: return false
          }
        })
        if (!matches) return false
      }

      return true
    })
  }, [leads, filters])

  // Counts for status buttons
  const counts = useMemo(() => ({
    'no-no-yes': leads.filter(l => l.status === 'new' && !l.has_photographer && !l.has_videographer && l.has_venue === true).length,
    'no-no-no': leads.filter(l => l.status === 'new' && !l.has_photographer && !l.has_videographer && !l.has_venue).length,
    'contacted': leads.filter(l => l.status === 'contacted').length,
  } as Record<FilterKey, number>), [leads])

  // Loading
  if (loading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100vh', backgroundColor: '#faf8f5', fontFamily: 'sans-serif' }}>
        <div style={{ width: 32, height: 32, border: '3px solid #0d4f4f', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
        <p style={{ color: '#666', fontSize: 13, marginTop: 16 }}>Loading leads...</p>
        <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
      </div>
    )
  }

  // Error
  if (fetchError) {
    return (
      <div style={{ padding: 32, fontFamily: 'sans-serif', backgroundColor: '#faf8f5', minHeight: '100vh' }}>
        <h1 style={{ color: '#dc2626', fontSize: 20, marginBottom: 8 }}>Failed to load leads</h1>
        <pre style={{ background: '#fee2e2', padding: 16, borderRadius: 8, fontSize: 13, whiteSpace: 'pre-wrap' }}>{fetchError}</pre>
        <button onClick={() => window.location.reload()}
          style={{ marginTop: 16, padding: '8px 16px', background: '#0d4f4f', color: 'white', border: 'none', borderRadius: 8, cursor: 'pointer' }}>
          Reload Page
        </button>
      </div>
    )
  }

  return (
    <div className={`${nunito.className} min-h-screen flex flex-col`} style={{ backgroundColor: '#faf8f5' }}>
      {/* Header */}
      <SafeSection name="LeadsHeader">
        <LeadsHeader onMenuToggle={() => setSidebarOpen(!sidebarOpen)} />
      </SafeSection>

      {/* Body: Sidebar + Grid */}
      <div className="flex flex-1 min-h-0">
        <SafeSection name="FilterSidebar">
          <FilterSidebar
            filters={filters}
            onFiltersChange={setFilters}
            counts={counts}
            open={sidebarOpen}
            onClose={() => setSidebarOpen(false)}
          />
        </SafeSection>

        <SafeSection name="LeadGridArea">
          <LeadGridArea
            leads={filteredLeads}
            onHide={(id) => {
              supabase.from('ballots').update({ hidden: true }).eq('id', id).then(() => {})
              setLeads(prev => prev.filter(l => l.id !== id))
              toast('Lead hidden', {
                action: { label: 'Undo', onClick: () => { supabase.from('ballots').update({ hidden: false }).eq('id', id).then(() => {}) } },
              })
            }}
            onEmailClick={(lead) => {
              if (lead.email) window.open(`mailto:${lead.email}?subject=SIGS Photography`, '_blank')
              else toast.error('No email on file')
            }}
            onCardClick={(lead) => setSelectedLead(lead)}
          />
        </SafeSection>
      </div>

      {/* Detail sheet lazy-loaded only when needed */}
      {selectedLead && (
        <SafeSection name="LeadDetailSheet">
          <LazyDetailSheet
            lead={selectedLead}
            onClose={() => setSelectedLead(null)}
            onUpdate={(updated) => {
              if (!['new', 'contacted'].includes(updated.status) || updated.hidden) {
                setLeads(prev => prev.filter(l => l.id !== updated.id))
                setSelectedLead(null)
              } else {
                setLeads(prev => prev.map(l => l.id === updated.id ? updated : l))
                setSelectedLead(updated)
              }
            }}
          />
        </SafeSection>
      )}
    </div>
  )
}

function LazyDetailSheet({ lead, onClose, onUpdate }: { lead: Lead; onClose: () => void; onUpdate: (l: Lead) => void }) {
  const [Sheet, setSheet] = useState<any>(null)

  useEffect(() => {
    import('@/components/leads/LeadDetailSheet').then(mod => {
      setSheet(() => mod.LeadDetailSheet)
    }).catch(err => {
      console.error('Failed to load LeadDetailSheet:', err)
    })
  }, [])

  if (!Sheet) return null
  return <Sheet lead={lead} isOpen={true} onClose={onClose} onUpdate={onUpdate} />
}
