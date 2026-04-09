'use client'

import { useState, useEffect, useMemo, Component, type ReactNode, type ErrorInfo } from 'react'
import { Nunito } from 'next/font/google'
import { supabase } from '@/lib/supabase'
import { LeadsHeader } from '@/components/leads/LeadsHeader'
import { AddLeadModal } from '@/components/leads/AddLeadModal'
import { FilterSidebar, type SidebarFilters } from '@/components/leads/FilterSidebar'
import { LeadGridArea } from '@/components/leads/LeadGridArea'
import { toast } from 'sonner'
import { SourceDropdown } from '@/components/leads/SourceDropdown'
import { ChaseSubFilters, type ChaseFilter } from '@/components/leads/ChaseSubFilters'
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
  status: [],
  weddingYear: null,
  location: null,
  dateRange: 'all',
  venueType: [],
  venueRating: null,
  ceremonyLocation: [],
  chaseStatus: [],
}

const PAGE_SIZE = 25

export default function LeadsPage() {
  const [leads, setLeads] = useState<Lead[]>([])
  const [loading, setLoading] = useState(true)
  const [fetchError, setFetchError] = useState<string | null>(null)
  const [filters, setFilters] = useState<SidebarFilters>(DEFAULT_FILTERS)
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [showLost, setShowLost] = useState(false)
  const [showAddModal, setShowAddModal] = useState(false)
  const [sortKey, setSortKey] = useState<'score' | 'date' | 'name' | 'temperature'>('date')
  const [currentPage, setCurrentPage] = useState(1)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedSourceId, setSelectedSourceId] = useState<string | null>(null)
  const [chaseFilter, setChaseFilter] = useState<ChaseFilter>('all')
  const [allLeads, setAllLeads] = useState<Lead[]>([])  // includes hidden, for search

  // Persist sidebar collapsed state
  useEffect(() => {
    const saved = localStorage.getItem('bridalflow-sidebar-collapsed')
    if (saved === 'true') setSidebarCollapsed(true)
  }, [])
  const handleCollapsedChange = (collapsed: boolean) => {
    setSidebarCollapsed(collapsed)
    localStorage.setItem('bridalflow-sidebar-collapsed', String(collapsed))
  }

  // Reset page when filters or search change
  useEffect(() => { setCurrentPage(1); setChaseFilter('all') }, [filters, sortKey, searchQuery, selectedSourceId])

  // Fetch leads
  useEffect(() => {
    async function doFetch() {
      try {
        const { data, error } = await supabase
          .from('ballots')
          .select('*')
          .order('book_score', { ascending: false })

        if (error) {
          setFetchError(error.message)
        } else {
          const all = (data as Lead[]) || []
          setAllLeads(all)
          setLeads(all.filter(l => !l.hidden))
        }
      } catch (err: any) {
        setFetchError(String(err))
      }
      setLoading(false)
    }
    doFetch()
  }, [])

  // Bucket helpers — each lead falls into exactly ONE bucket
  const isLost = (l: Lead) =>
    ['dead', 'lost'].includes(l.status) || l.has_photographer === true || l.has_videographer === true
  const isNNY = (l: Lead) =>
    l.status === 'new' && l.has_venue === true && !l.has_photographer && !l.has_videographer
  const isNNN = (l: Lead) =>
    l.status === 'new' && !l.has_venue && !l.has_photographer && !l.has_videographer

  // Filter logic
  const filteredLeads = useMemo(() => {
    const today = new Date()
    const todayStr = today.toISOString().split('T')[0]

    return leads.filter(l => {
      // Search filter — when active, bypasses all other filters except lost exclusion
      if (searchQuery) {
        const q = searchQuery.toLowerCase()
        const match = (
          (l.bride_first_name || '').toLowerCase().includes(q) ||
          (l.bride_last_name || '').toLowerCase().includes(q) ||
          (l.groom_first_name || '').toLowerCase().includes(q) ||
          (l.groom_last_name || '').toLowerCase().includes(q) ||
          (l.venue_name || '').toLowerCase().includes(q) ||
          (l.cell_phone || '').toLowerCase().includes(q) ||
          (l.email || '').toLowerCase().includes(q)
        )
        if (!match) return false
        // Exclude lost leads from search results
        if (isLost(l)) return false
        return true
      }

      // Filter by source
      if (selectedSourceId) {
        if (l.lead_source_id !== selectedSourceId) return false;
      }

      // Exclude lost leads unless showLost is active
      if (isLost(l) && !showLost) return false

      // If showLost is on and we're looking at lost leads, show them all (no status filter)
      if (showLost && isLost(l)) {
        // Still apply other filters below
      } else if (filters.status.length > 0) {
        // Status bucket filter (multi-select — lead must match ANY selected status)
        const matchesAny = filters.status.some(s => {
          switch (s) {
            case 'no-no-yes': return isNNY(l)
            case 'no-no-no': return isNNN(l)
            case 'contacted': return l.status === 'contacted'
            case 'meeting_booked': return l.status === 'meeting_booked'
            case 'quoted': return l.status === 'quoted'
            case 'booked': return l.status === 'booked'
            default: return false
          }
        })
        if (!matchesAny) return false
      }

      // Wedding year
      if (filters.weddingYear) {
        if (!l.wedding_date) return false
        const year = l.wedding_date.substring(0, 4)
        if (year !== filters.weddingYear) return false
      }

      // Location (single select)
      if (filters.location) {
        const city = ((l as any).inferred_city || '').toLowerCase()
        if (filters.location === 'Other') {
          if (['vaughan', 'hamilton', 'oakville', 'toronto'].includes(city)) return false
        } else {
          if (!city.includes(filters.location.toLowerCase())) return false
        }
      }

      // Date range
      if (filters.dateRange !== 'all' && l.wedding_date) {
        const wDate = new Date(l.wedding_date + 'T12:00:00')
        const monthsAway = (wDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24 * 30)
        switch (filters.dateRange) {
          case '<6m': if (monthsAway >= 6 || monthsAway < 0) return false; break
          case '6-12m': if (monthsAway < 6 || monthsAway >= 12) return false; break
          case '12-14m': if (monthsAway < 12 || monthsAway >= 14) return false; break
          case '14-18m': if (monthsAway < 14 || monthsAway >= 18) return false; break
          case '18m+': if (monthsAway < 18) return false; break
        }
      }

      // Venue type
      if (filters.venueType.length > 0) {
        const vt = (l.venue_type || '').toLowerCase().replace(/_/g, ' ')
        const matches = filters.venueType.some(t => vt.includes(t.toLowerCase()))
        if (!matches) return false
      }

      // Venue rating
      if (filters.venueRating) {
        const vr = l.venue_rating
        const starNum = parseInt(filters.venueRating)
        if (!isNaN(starNum)) {
          if (vr == null || vr !== starNum) return false
        }
      }

      // Ceremony location
      if (filters.ceremonyLocation.length > 0) {
        const cl = ((l as any).ceremony_venue || '').toLowerCase()
        const matches = filters.ceremonyLocation.some(c => cl.includes(c.toLowerCase().split('/')[0]))
        if (!matches) return false
      }

      // Chase status (contacted only)
      if (filters.status.includes('contacted') && filters.chaseStatus.length > 0) {
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

      // Chase sub-filter (only when CONTACTED)
      if (filters.status.includes('contacted') && chaseFilter !== 'all') {
        switch (chaseFilter) {
          case 'due_today':
            if (l.next_contact_due !== todayStr) return false
            break
          case 'overdue':
            if (!(l.next_contact_due && l.next_contact_due < todayStr && l.contact_status !== 'exhausted')) return false
            break
          case 'upcoming':
            if (!(l.next_contact_due && l.next_contact_due > todayStr)) return false
            break
          case 'exhausted':
            if (l.contact_status !== 'exhausted' && l.status !== 'dead') return false
            break
        }
      }

      return true
    })
  }, [leads, filters, showLost, searchQuery, selectedSourceId, chaseFilter])

  const counts = useMemo(() => ({
    'no-no-yes': leads.filter(l => isNNY(l)).length,
    'no-no-no': leads.filter(l => isNNN(l)).length,
    'contacted': leads.filter(l => l.status === 'contacted').length,
    'meeting_booked': leads.filter(l => l.status === 'meeting_booked').length,
    'quoted': leads.filter(l => l.status === 'quoted').length,
    'booked': leads.filter(l => l.status === 'booked').length,
  } as Record<FilterKey, number>), [leads])

  const lostCount = useMemo(() => leads.filter(l => isLost(l)).length, [leads])

  const chaseCounts = useMemo(() => {
    const contacted = leads.filter(l => l.status === 'contacted')
    const today = new Date().toISOString().split('T')[0]
    return {
      all: contacted.length,
      due_today: contacted.filter(l => l.next_contact_due === today).length,
      overdue: contacted.filter(l => l.next_contact_due != null && l.next_contact_due < today && l.contact_status !== 'exhausted').length,
      upcoming: contacted.filter(l => l.next_contact_due != null && l.next_contact_due > today).length,
      exhausted: contacted.filter(l => l.contact_status === 'exhausted' || l.status === 'dead').length,
    }
  }, [leads])

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
    <div className={`${nunito.className} h-[100dvh] flex bg-slate-50 dark:bg-slate-950`}>
      {/* Sidebar — full viewport height, starts at top */}
      <SafeSection name="FilterSidebar">
        <FilterSidebar
          filters={filters}
          onFiltersChange={setFilters}
          counts={counts}
          lostCount={lostCount}
          showLost={showLost}
          onShowLostChange={setShowLost}
          open={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
          collapsed={sidebarCollapsed}
          onCollapsedChange={handleCollapsedChange}
          chaseSubFilters={filters.status.includes('contacted') ? (
            <ChaseSubFilters
              activeFilter={chaseFilter}
              onFilterChange={setChaseFilter}
              counts={chaseCounts}
            />
          ) : undefined}
        />
      </SafeSection>

      {/* Right side: Header + Main content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <SafeSection name="LeadsHeader">
          <LeadsHeader
            onMenuToggle={() => setSidebarOpen(!sidebarOpen)}
            onAddLead={() => setShowAddModal(true)}
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            sourceFilter={<SourceDropdown value={selectedSourceId} onChange={setSelectedSourceId} />}
          />
        </SafeSection>

        {/* Main panel — floating card */}
        <div className="flex-1 p-3 min-h-0">
          <div className="h-full bg-white dark:bg-slate-900 rounded-2xl shadow-lg shadow-slate-200/50 dark:shadow-black/20 overflow-y-auto flex flex-col">
            <SafeSection name="LeadGridArea">
              <LeadGridArea
                leads={filteredLeads}
                sortKey={sortKey}
                onSortChange={setSortKey}
                currentPage={currentPage}
                onPageChange={setCurrentPage}
                pageSize={PAGE_SIZE}
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
        </div>
      </div>

      {/* Add Lead Modal */}
      <AddLeadModal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        onLeadAdded={(newLead) => {
          setLeads(prev => [newLead, ...prev])
          toast.success('Lead added successfully')
        }}
      />

      {/* Detail sheet lazy-loaded only when needed */}
      {selectedLead && (
        <SafeSection name="LeadDetailSheet">
          <LazyDetailSheet
            lead={selectedLead}
            onClose={() => setSelectedLead(null)}
            onUpdate={(updated) => {
              if (updated.hidden) {
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
    import('@/components/leads/LeadDetailSheet').then(mod => setSheet(() => mod.LeadDetailSheet)).catch(err => console.error('Failed to load LeadDetailSheet:', err))
  }, [])
  if (!Sheet) return null
  return <Sheet lead={lead} isOpen={true} onClose={onClose} onUpdate={onUpdate} />
}
