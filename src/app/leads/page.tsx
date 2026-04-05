'use client'

import { useState, useEffect, useMemo, Component, type ReactNode, type ErrorInfo } from 'react'
import { Playfair_Display, Nunito } from 'next/font/google'
import { supabase } from '@/lib/supabase'
import { FilterBar } from '@/components/leads/FilterBar'
import { LeadGrid } from '@/components/leads/LeadGrid'
import { toast } from 'sonner'
import { Users, BarChart3 } from 'lucide-react'
import Link from 'next/link'
import type { Lead, FilterKey } from '@/lib/lead-utils'

const playfair = Playfair_Display({ subsets: ['latin'], weight: ['700'] })
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

export default function LeadsPage() {
  const [leads, setLeads] = useState<Lead[]>([])
  const [loading, setLoading] = useState(true)
  const [fetchError, setFetchError] = useState<string | null>(null)
  const [debugInfo, setDebugInfo] = useState('Initializing...')
  const [activeFilter, setActiveFilter] = useState<FilterKey>('no-no-yes')
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null)
  const [sourceFilter, setSourceFilter] = useState('all')

  // Simple useEffect — no useCallback, no dependencies
  useEffect(() => {
    async function doFetch() {
      setDebugInfo('Fetching from Supabase...')
      console.log('🔵 [Leads] Starting fetch')
      try {
        const { data, error } = await supabase
          .from('ballots')
          .select('*')
          .eq('hidden', false)
          .in('status', ['new', 'contacted'])
          .order('book_score', { ascending: false })

        console.log('🟢 [Leads] Response:', { rows: data?.length, error: error?.message })

        if (error) {
          setFetchError(error.message)
          setDebugInfo(`Error: ${error.message}`)
        } else {
          setLeads((data as Lead[]) || [])
          setDebugInfo(`Loaded ${data?.length || 0} leads`)
        }
      } catch (err: any) {
        console.error('🔴 [Leads] Exception:', err)
        setFetchError(String(err))
        setDebugInfo(`Exception: ${err}`)
      }
      setLoading(false)
    }
    doFetch()
  }, [])

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
      filtered = filtered.filter(l => l.lead_source_id === sourceFilter)
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

  // Loading
  if (loading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100vh', backgroundColor: '#faf8f5', fontFamily: 'sans-serif' }}>
        <div style={{ width: 32, height: 32, border: '3px solid #0d4f4f', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
        <p style={{ color: '#666', fontSize: 13, marginTop: 16 }}>{debugInfo}</p>
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
          <span className="text-sm text-muted-foreground ml-auto">{debugInfo}</span>
        </div>

        <SafeSection name="FilterBar">
          <FilterBar
            activeFilter={activeFilter}
            onFilterChange={setActiveFilter}
            counts={counts}
            sourceFilter={sourceFilter}
            onSourceFilterChange={setSourceFilter}
          />
        </SafeSection>
      </div>

      <div className="px-5 pb-8 md:px-8">
        <SafeSection name="LeadGrid">
          <LeadGrid
            leads={filteredLeads}
            onHide={(id) => setLeads(prev => prev.filter(l => l.id !== id))}
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

// Lazy-load the heavy detail sheet only when a card is clicked
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
