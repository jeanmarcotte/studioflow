'use client'

import { useState, useEffect, useCallback, useMemo, Component, type ReactNode, type ErrorInfo } from 'react'
import { Playfair_Display, Nunito } from 'next/font/google'
import { supabase } from '@/lib/supabase'
import { FilterBar } from '@/components/leads/FilterBar'
import { LeadGrid } from '@/components/leads/LeadGrid'
import { LeadDetailSheet } from '@/components/leads/LeadDetailSheet'
import { EmailComposeModal } from '@/components/leads/EmailComposeModal'
import { useLeadsRealtime } from '@/hooks/useLeadsRealtime'
import { toast } from 'sonner'
import { Users, BarChart3 } from 'lucide-react'
import Link from 'next/link'
import type { Lead, FilterKey } from '@/lib/lead-utils'

const playfair = Playfair_Display({ subsets: ['latin'], weight: ['700'] })
const nunito = Nunito({ subsets: ['latin'], weight: ['400', '600', '700'] })

// ── Error Boundary ────────────────────────────────────────────
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

export default function LeadsPage() {
  const [leads, setLeads] = useState<Lead[]>([])
  const [loading, setLoading] = useState(true)
  const [fetchError, setFetchError] = useState<string | null>(null)
  const [activeFilter, setActiveFilter] = useState<FilterKey>('no-no-yes')
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null)
  const [emailLead, setEmailLead] = useState<Lead | null>(null)
  const [sourceFilter, setSourceFilter] = useState('all')

  // ── Fetch all non-hidden leads ────────────────────────────────
  const fetchLeads = useCallback(async () => {
    console.log('[Leads] Fetching leads...')
    try {
      const { data, error } = await supabase
        .from('ballots')
        .select(LEADS_SELECT)
        .eq('hidden', false)
        .in('status', ['new', 'contacted'])
        .order('book_score', { ascending: false })

      if (error) {
        console.error('[Leads] Supabase error:', error)
        setFetchError(error.message)
        return
      }
      console.log(`[Leads] Fetched ${data?.length || 0} leads`)
      setLeads((data as Lead[]) || [])
    } catch (err: any) {
      console.error('[Leads] Fetch exception:', err)
      setFetchError(err.message || String(err))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchLeads() }, [fetchLeads])

  // ── Realtime updates ──────────────────────────────────────────
  useLeadsRealtime(useCallback(({ eventType, new: newRow }) => {
    if (eventType === 'DELETE') {
      setLeads(prev => prev.filter(l => l.id !== (newRow as any)?.id))
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

  // ── Filter + sort logic ────────────────────────────────────────
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
    if (!lead.email) { toast.error('No email on file for this lead'); return }
    setEmailLead(lead)
  }, [])

  const handleCardClick = useCallback((lead: Lead) => {
    console.log('[Leads] Card clicked:', lead.bride_first_name)
    setSelectedLead(lead)
  }, [])

  const handleLeadUpdate = useCallback((updated: Lead) => {
    if (!['new', 'contacted'].includes(updated.status) || updated.hidden) {
      setLeads(prev => prev.filter(l => l.id !== updated.id))
      setSelectedLead(null)
    } else {
      setLeads(prev => prev.map(l => l.id === updated.id ? updated : l))
      setSelectedLead(updated)
    }
  }, [])

  // ── Loading state ─────────────────────────────────────────────
  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen" style={{ backgroundColor: '#faf8f5' }}>
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#0d4f4f]" />
      </div>
    )
  }

  // ── Error state ───────────────────────────────────────────────
  if (fetchError) {
    return (
      <div style={{ padding: 32, fontFamily: 'sans-serif', backgroundColor: '#faf8f5', minHeight: '100vh' }}>
        <h1 style={{ color: '#dc2626', fontSize: 20, marginBottom: 8 }}>Failed to load leads</h1>
        <pre style={{ background: '#fee2e2', padding: 16, borderRadius: 8, fontSize: 13 }}>{fetchError}</pre>
        <button onClick={() => { setFetchError(null); setLoading(true); fetchLeads() }}
          style={{ marginTop: 16, padding: '8px 16px', background: '#0d4f4f', color: 'white', border: 'none', borderRadius: 8, cursor: 'pointer' }}>
          Retry
        </button>
      </div>
    )
  }

  return (
    <div className={`${nunito.className} min-h-screen`} style={{ backgroundColor: '#faf8f5' }}>
      {/* Header */}
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

        <SafeSection name="FilterBar">
          <FilterBar
            activeFilter={activeFilter}
            onFilterChange={(f) => { console.log('[Leads] Filter changed to:', f); setActiveFilter(f) }}
            counts={counts}
            sourceFilter={sourceFilter}
            onSourceFilterChange={setSourceFilter}
          />
        </SafeSection>
      </div>

      {/* Card Grid */}
      <div className="px-5 pb-8 md:px-8">
        <SafeSection name="LeadGrid">
          <LeadGrid
            leads={filteredLeads}
            onHide={handleHide}
            onEmailClick={handleEmailClick}
            onCardClick={handleCardClick}
          />
        </SafeSection>
      </div>

      {/* Detail Sheet */}
      <SafeSection name="LeadDetailSheet">
        <LeadDetailSheet
          lead={selectedLead}
          isOpen={!!selectedLead}
          onClose={() => setSelectedLead(null)}
          onUpdate={handleLeadUpdate}
        />
      </SafeSection>

      {/* Email Compose Modal */}
      {emailLead && (
        <SafeSection name="EmailComposeModal">
          <EmailComposeModal
            lead={emailLead}
            open={!!emailLead}
            onClose={() => setEmailLead(null)}
            onTouchLogged={() => fetchLeads()}
          />
        </SafeSection>
      )}
    </div>
  )
}
