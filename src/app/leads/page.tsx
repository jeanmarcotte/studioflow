'use client'

import { useState, useEffect, useCallback, useMemo, lazy, Suspense } from 'react'
import { Playfair_Display, Nunito } from 'next/font/google'
import { supabase } from '@/lib/supabase'
import { toast } from 'sonner'
import { Users, BarChart3 } from 'lucide-react'
import Link from 'next/link'
import type { Lead, FilterKey } from '@/lib/lead-utils'

// Lazy-load all leads components to isolate crashes
const FilterBar = lazy(() => import('@/components/leads/FilterBar').then(m => ({ default: m.FilterBar })))
const LeadGrid = lazy(() => import('@/components/leads/LeadGrid').then(m => ({ default: m.LeadGrid })))
const LeadDetailSheet = lazy(() => import('@/components/leads/LeadDetailSheet').then(m => ({ default: m.LeadDetailSheet })))
const EmailComposeModal = lazy(() => import('@/components/leads/EmailComposeModal').then(m => ({ default: m.EmailComposeModal })))

// Lazy-load realtime hook wrapper
function useLeadsRealtimeSafe(cb: any) {
  useEffect(() => {
    let cleanup: (() => void) | undefined
    import('@/hooks/useLeadsRealtime').then(mod => {
      // Hook can't be called dynamically — use channel directly
      const channel = supabase
        .channel('leads-changes')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'ballots' }, (payload) => {
          cb({
            eventType: payload.eventType,
            new: payload.new || null,
            old: payload.old || null,
          })
        })
        .subscribe()
      cleanup = () => { supabase.removeChannel(channel) }
    }).catch(err => console.error('Realtime import failed:', err))
    return () => { cleanup?.() }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps
}

const playfair = Playfair_Display({ subsets: ['latin'], weight: ['700'] })
const nunito = Nunito({ subsets: ['latin'], weight: ['400', '600', '700'] })

const LEADS_SELECT = `
  id,
  entity_id,
  bride_first_name,
  bride_last_name,
  groom_first_name,
  groom_last_name,
  venue_name,
  wedding_date,
  cell_phone,
  email,
  status,
  book_score,
  temperature,
  has_photographer,
  has_videographer,
  has_venue,
  show_id,
  contact_count,
  last_contact_date,
  hidden,
  service_needs,
  budget_range,
  inferred_ethnicity,
  want_album,
  want_engagement,
  bridal_party_size,
  multi_day_event,
  planner_involved,
  venue_type,
  venue_rating,
  referral_source,
  inquiry_depth_score,
  response_speed_hours,
  score_breakdown,
  next_contact_due,
  contact_status,
  reactivation_count,
  reactivated_at,
  lead_source_id,
  inbound_channel,
  referrer_id
`

function LazyFallback() {
  return <div style={{ padding: 8, color: '#999', fontSize: 12 }}>Loading component...</div>
}

function ComponentError({ name, error }: { name: string; error: Error }) {
  return (
    <div style={{ padding: 16, margin: 8, background: '#fee2e2', borderRadius: 8, fontSize: 13 }}>
      <strong style={{ color: '#dc2626' }}>{name} crashed:</strong>
      <pre style={{ marginTop: 4, fontSize: 11, whiteSpace: 'pre-wrap' }}>{error.message}</pre>
    </div>
  )
}

// Simple error boundary as a component
import { Component, type ReactNode, type ErrorInfo } from 'react'

class SafeWrapper extends Component<{ name: string; children: ReactNode }, { error: Error | null }> {
  state = { error: null as Error | null }
  static getDerivedStateFromError(error: Error) { return { error } }
  componentDidCatch(error: Error, info: ErrorInfo) { console.error(`[${this.props.name}]`, error, info) }
  render() {
    if (this.state.error) return <ComponentError name={this.props.name} error={this.state.error} />
    return this.props.children
  }
}

export default function LeadsPage() {
  const [leads, setLeads] = useState<Lead[]>([])
  const [loading, setLoading] = useState(true)
  const [activeFilter, setActiveFilter] = useState<FilterKey>('no-no-yes')
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null)
  const [emailLead, setEmailLead] = useState<Lead | null>(null)
  const [sourceFilter, setSourceFilter] = useState('all')

  const fetchLeads = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('ballots')
        .select(LEADS_SELECT)
        .eq('hidden', false)
        .in('status', ['new', 'contacted'])
        .order('book_score', { ascending: false })

      if (error) {
        console.error('Failed to fetch leads:', error)
        toast.error('Failed to load leads')
        return
      }
      setLeads((data as Lead[]) || [])
    } catch (err) {
      console.error('Leads fetch exception:', err)
      toast.error('Failed to load leads')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchLeads() }, [fetchLeads])

  // Inline realtime (safe — no hook import)
  useLeadsRealtimeSafe(useCallback(({ eventType, new: newRow }: any) => {
    if (eventType === 'DELETE') {
      setLeads(prev => prev.filter(l => l.id !== newRow?.id))
      return
    }
    if (!newRow) return
    if (newRow.hidden || !['new', 'contacted'].includes(newRow.status)) {
      setLeads(prev => prev.filter(l => l.id !== newRow.id))
      return
    }
    setLeads(prev => {
      const idx = prev.findIndex(l => l.id === newRow.id)
      let updated: Lead[]
      if (idx >= 0) { updated = [...prev]; updated[idx] = newRow }
      else { updated = [...prev, newRow] }
      return updated.sort((a, b) => (b.book_score ?? 0) - (a.book_score ?? 0))
    })
  }, []))

  const filteredLeads = useMemo(() => {
    const today = new Date().toISOString().split('T')[0]
    let filtered = leads.filter(l => {
      switch (activeFilter) {
        case 'no-no-yes': return l.status === 'new' && !l.has_photographer && !l.has_videographer && l.has_venue === true
        case 'no-no-no': return l.status === 'new' && !l.has_photographer && !l.has_videographer && !l.has_venue
        case 'contacted': return l.status === 'contacted'
        default: return true
      }
    })
    if (sourceFilter !== 'all') {
      if (sourceFilter.startsWith('cat:')) {
        filtered = filtered.filter(l => l.lead_source_id != null)
      } else {
        filtered = filtered.filter(l => l.lead_source_id === sourceFilter)
      }
    }
    return filtered.sort((a, b) => {
      const aOverdue = a.next_contact_due && a.next_contact_due < today ? 2 : a.next_contact_due === today ? 1 : 0
      const bOverdue = b.next_contact_due && b.next_contact_due < today ? 2 : b.next_contact_due === today ? 1 : 0
      if (aOverdue !== bOverdue) return bOverdue - aOverdue
      return (b.book_score ?? 0) - (a.book_score ?? 0)
    })
  }, [leads, activeFilter, sourceFilter])

  const counts = useMemo(() => ({
    'no-no-yes': leads.filter(l => l.status === 'new' && !l.has_photographer && !l.has_videographer && l.has_venue === true).length,
    'no-no-no': leads.filter(l => l.status === 'new' && !l.has_photographer && !l.has_videographer && !l.has_venue).length,
    'contacted': leads.filter(l => l.status === 'contacted').length,
  }), [leads])

  const handleHide = useCallback((id: string) => { setLeads(prev => prev.filter(l => l.id !== id)) }, [])
  const handleEmailClick = useCallback((lead: Lead) => {
    if (!lead.email) { toast.error('No email on file'); return }
    setEmailLead(lead)
  }, [])
  const handleCardClick = useCallback((lead: Lead) => { setSelectedLead(lead) }, [])
  const handleLeadUpdate = useCallback((updated: Lead) => {
    if (!['new', 'contacted'].includes(updated.status) || updated.hidden) {
      setLeads(prev => prev.filter(l => l.id !== updated.id))
      setSelectedLead(null)
    } else {
      setLeads(prev => prev.map(l => l.id === updated.id ? updated : l))
      setSelectedLead(updated)
    }
  }, [])

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', backgroundColor: '#faf8f5', fontFamily: 'sans-serif' }}>
        <div>
          <div style={{ width: 32, height: 32, border: '3px solid #0d4f4f', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 1s linear infinite', margin: '0 auto' }} />
          <p style={{ color: '#666', fontSize: 13, marginTop: 12 }}>Loading leads...</p>
          <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
        </div>
      </div>
    )
  }

  return (
    <div className={`${nunito.className} min-h-screen`} style={{ backgroundColor: '#faf8f5' }}>
      <div className="px-5 pt-6 pb-4 md:px-8">
        <h1 className={`${playfair.className} text-2xl md:text-3xl font-bold text-[#0d4f4f] mb-1`}>
          Lead Command Center
        </h1>
        <div className="flex items-center gap-4 mb-5">
          <span className="text-sm font-medium text-[#0d4f4f] flex items-center gap-1">
            <Users className="h-4 w-4" /> Leads
          </span>
          <Link href="/analytics" className="text-sm text-muted-foreground hover:text-[#0d4f4f] transition-colors flex items-center gap-1">
            <BarChart3 className="h-4 w-4" /> Analytics
          </Link>
          <span className="text-sm text-muted-foreground ml-auto">{leads.length} active — sorted by score</span>
        </div>

        <SafeWrapper name="FilterBar">
          <Suspense fallback={<LazyFallback />}>
            <FilterBar
              activeFilter={activeFilter}
              onFilterChange={setActiveFilter}
              counts={counts}
              sourceFilter={sourceFilter}
              onSourceFilterChange={setSourceFilter}
            />
          </Suspense>
        </SafeWrapper>
      </div>

      <div className="px-5 pb-8 md:px-8">
        <SafeWrapper name="LeadGrid">
          <Suspense fallback={<LazyFallback />}>
            <LeadGrid
              leads={filteredLeads}
              onHide={handleHide}
              onEmailClick={handleEmailClick}
              onCardClick={handleCardClick}
            />
          </Suspense>
        </SafeWrapper>
      </div>

      <SafeWrapper name="LeadDetailSheet">
        <Suspense fallback={null}>
          <LeadDetailSheet
            lead={selectedLead}
            isOpen={!!selectedLead}
            onClose={() => setSelectedLead(null)}
            onUpdate={handleLeadUpdate}
          />
        </Suspense>
      </SafeWrapper>

      {emailLead && (
        <SafeWrapper name="EmailComposeModal">
          <Suspense fallback={null}>
            <EmailComposeModal
              lead={emailLead}
              open={!!emailLead}
              onClose={() => setEmailLead(null)}
              onTouchLogged={() => fetchLeads()}
            />
          </Suspense>
        </SafeWrapper>
      )}
    </div>
  )
}
