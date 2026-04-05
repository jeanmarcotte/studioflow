'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
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
  const [activeFilter, setActiveFilter] = useState<FilterKey>('no-no-yes')
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null)
  const [emailLead, setEmailLead] = useState<Lead | null>(null)
  const [sourceFilter, setSourceFilter] = useState('all')

  // ── Fetch all non-hidden leads ────────────────────────────────
  const fetchLeads = useCallback(async () => {
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
    setLoading(false)
  }, [])

  useEffect(() => { fetchLeads() }, [fetchLeads])

  // ── Realtime updates ──────────────────────────────────────────
  useLeadsRealtime(useCallback(({ eventType, new: newRow }) => {
    if (eventType === 'DELETE') {
      setLeads(prev => prev.filter(l => l.id !== (newRow as any)?.id))
      return
    }
    if (!newRow) return

    // Hidden or irrelevant status → remove from list
    if (newRow.hidden || !['new', 'contacted'].includes(newRow.status)) {
      setLeads(prev => prev.filter(l => l.id !== newRow.id))
      return
    }

    setLeads(prev => {
      const idx = prev.findIndex(l => l.id === newRow.id)
      let updated: Lead[]
      if (idx >= 0) {
        updated = [...prev]
        updated[idx] = newRow
      } else {
        updated = [...prev, newRow]
      }
      return updated.sort((a, b) => (b.book_score ?? 0) - (a.book_score ?? 0))
    })
  }, []))

  // ── Filter + sort logic ────────────────────────────────────────
  const filteredLeads = useMemo(() => {
    const today = new Date().toISOString().split('T')[0]

    let filtered = leads.filter(l => {
      switch (activeFilter) {
        case 'no-no-yes':
          return l.status === 'new' && !l.has_photographer && !l.has_videographer && l.has_venue === true
        case 'no-no-no':
          return l.status === 'new' && !l.has_photographer && !l.has_videographer && !l.has_venue
        case 'contacted':
          return l.status === 'contacted'
        default:
          return true
      }
    })

    // Apply source filter
    if (sourceFilter !== 'all') {
      if (sourceFilter.startsWith('cat:')) {
        // Category filter — need to match by source category (fetched sources handle this client-side)
        // For now, filter by lead_source_id matching sources in that category
        // This is handled at the DB level via lead_source_id
        filtered = filtered.filter(l => l.lead_source_id != null)
      } else {
        filtered = filtered.filter(l => l.lead_source_id === sourceFilter)
      }
    }

    // Sort: overdue first, then due today, then by score
    return filtered.sort((a, b) => {
      const aOverdue = a.next_contact_due && a.next_contact_due < today ? 2 : a.next_contact_due === today ? 1 : 0
      const bOverdue = b.next_contact_due && b.next_contact_due < today ? 2 : b.next_contact_due === today ? 1 : 0
      if (aOverdue !== bOverdue) return bOverdue - aOverdue
      return (b.book_score ?? 0) - (a.book_score ?? 0)
    })
  }, [leads, activeFilter, sourceFilter])

  // ── Counts for filter badges ──────────────────────────────────
  const counts = useMemo(() => ({
    'no-no-yes': leads.filter(l => l.status === 'new' && !l.has_photographer && !l.has_videographer && l.has_venue === true).length,
    'no-no-no': leads.filter(l => l.status === 'new' && !l.has_photographer && !l.has_videographer && !l.has_venue).length,
    'contacted': leads.filter(l => l.status === 'contacted').length,
  }), [leads])

  // ── Hide lead (optimistic) ────────────────────────────────────
  const handleHide = useCallback((id: string) => {
    setLeads(prev => prev.filter(l => l.id !== id))
  }, [])

  // ── Email compose modal ────────────────────────────────────────
  const handleEmailClick = useCallback((lead: Lead) => {
    if (!lead.email) {
      toast.error('No email on file for this lead')
      return
    }
    setEmailLead(lead)
  }, [])

  // ── Card tap → open detail sheet ────────────────────────────────
  const handleCardClick = useCallback((lead: Lead) => {
    setSelectedLead(lead)
  }, [])

  // ── Detail sheet update handler ───────────────────────────────
  const handleLeadUpdate = useCallback((updated: Lead) => {
    // If status changed to something outside our filters, remove from list
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

        <FilterBar
          activeFilter={activeFilter}
          onFilterChange={setActiveFilter}
          counts={counts}
          sourceFilter={sourceFilter}
          onSourceFilterChange={setSourceFilter}
        />
      </div>

      {/* Card Grid */}
      <div className="px-5 pb-8 md:px-8">
        <LeadGrid
          leads={filteredLeads}
          onHide={handleHide}
          onEmailClick={handleEmailClick}
          onCardClick={handleCardClick}
        />
      </div>

      {/* Detail Sheet */}
      <LeadDetailSheet
        lead={selectedLead}
        isOpen={!!selectedLead}
        onClose={() => setSelectedLead(null)}
        onUpdate={handleLeadUpdate}
      />

      {/* Email Compose Modal */}
      {emailLead && (
        <EmailComposeModal
          lead={emailLead}
          open={!!emailLead}
          onClose={() => setEmailLead(null)}
          onTouchLogged={() => fetchLeads()}
        />
      )}
    </div>
  )
}
