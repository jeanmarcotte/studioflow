'use client'

import { useState, useEffect } from 'react'
import { Playfair_Display, Nunito } from 'next/font/google'
import { Download, Users, BarChart3 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { supabase } from '@/lib/supabase'
import { StatsCards } from '@/components/analytics/StatsCards'
import { LeadsBySourceChart } from '@/components/analytics/LeadsBySourceChart'
import { ConversionFunnel } from '@/components/analytics/ConversionFunnel'
import { SourcePerformanceTable } from '@/components/analytics/SourcePerformanceTable'
import { ChaseEffectivenessChart } from '@/components/analytics/ChaseEffectivenessChart'
import { LossReasonChart } from '@/components/analytics/LossReasonChart'
import Link from 'next/link'

const playfair = Playfair_Display({ subsets: ['latin'], weight: ['700'] })
const nunito = Nunito({ subsets: ['latin'], weight: ['400', '600', '700'] })

interface SourcePerf {
  source_id: string
  source_name: string
  source_cost: number
  lead_count: number
  booked_count: number
  total_revenue: number
}

export default function AnalyticsPage() {
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState({ total: 0, active: 0, booked: 0, conversionRate: 0, avgRevenue: 0 })
  const [sourceData, setSourceData] = useState<{ name: string; leads: number }[]>([])
  const [funnelData, setFunnelData] = useState<{ stage: string; count: number }[]>([])
  const [sourcePerf, setSourcePerf] = useState<SourcePerf[]>([])
  const [chaseData, setChaseData] = useState<{ touch: string; booked: number }[]>([])
  const [lossData, setLossData] = useState<{ reason: string; count: number }[]>([])

  useEffect(() => {
    async function fetchAll() {
      // ── Stats Cards ────────────────────────────────────────────
      const [totalRes, activeRes, bookedRes] = await Promise.all([
        supabase.from('ballots').select('id', { count: 'exact', head: true }),
        supabase.from('ballots').select('id', { count: 'exact', head: true }).in('status', ['new', 'contacted', 'meeting_booked', 'quoted']),
        supabase.from('sales_meetings').select('id, quoted_amount').eq('outcome', 'booked'),
      ])

      const total = totalRes.count || 0
      const active = activeRes.count || 0
      const bookedMeetings = bookedRes.data || []
      const bookedCount = bookedMeetings.length
      const totalRev = bookedMeetings.reduce((s, m: any) => s + (m.quoted_amount || 0), 0)
      const convRate = total > 0 ? (bookedCount / total * 100) : 0
      const avgRev = bookedCount > 0 ? totalRev / bookedCount : 0

      setStats({ total, active, booked: bookedCount, conversionRate: convRate, avgRevenue: avgRev })

      // ── Lead Volume by Source ──────────────────────────────────
      const { data: ballotSources } = await supabase
        .from('ballots')
        .select('lead_source_id')
        .not('lead_source_id', 'is', null)

      const { data: sources } = await supabase
        .from('lead_sources')
        .select('id, display_name')
        .eq('is_active', true)

      if (ballotSources && sources) {
        const sourceMap = new Map<string, string>()
        sources.forEach((s: any) => sourceMap.set(s.id, s.display_name))

        const counts = new Map<string, number>()
        ballotSources.forEach((b: any) => {
          const name = sourceMap.get(b.lead_source_id) || 'Unknown'
          counts.set(name, (counts.get(name) || 0) + 1)
        })

        const chartData = Array.from(counts.entries())
          .map(([name, leads]) => ({ name, leads }))
          .sort((a, b) => b.leads - a.leads)
        setSourceData(chartData)
      }

      // ── Conversion Funnel ──────────────────────────────────────
      const [contactedRes, meetingRes, quotedRes, bookedStatusRes] = await Promise.all([
        supabase.from('ballots').select('id', { count: 'exact', head: true }).in('status', ['contacted', 'meeting_booked', 'quoted', 'booked']),
        supabase.from('sales_meetings').select('id', { count: 'exact', head: true }),
        supabase.from('ballots').select('id', { count: 'exact', head: true }).in('status', ['quoted', 'booked']),
        supabase.from('ballots').select('id', { count: 'exact', head: true }).eq('status', 'booked'),
      ])

      setFunnelData([
        { stage: 'Captured', count: total },
        { stage: 'Contacted', count: contactedRes.count || 0 },
        { stage: 'Meeting', count: meetingRes.count || 0 },
        { stage: 'Quoted', count: quotedRes.count || 0 },
        { stage: 'Booked', count: bookedStatusRes.count || 0 },
      ])

      // ── Source Performance (RPC) ───────────────────────────────
      const { data: perfData } = await supabase.rpc('get_source_performance')
      if (perfData) {
        setSourcePerf(perfData as SourcePerf[])
      }

      // ── Chase Effectiveness ────────────────────────────────────
      const { data: bookedBallots } = await supabase
        .from('sales_meetings')
        .select('ballot_id, ballots(converted_at_touch)')
        .eq('outcome', 'booked')

      const touchCounts = new Map<number, number>()
      for (let i = 1; i <= 6; i++) touchCounts.set(i, 0)
      if (bookedBallots) {
        bookedBallots.forEach((b: any) => {
          const touch = b.ballots?.converted_at_touch || 1
          touchCounts.set(touch, (touchCounts.get(touch) || 0) + 1)
        })
      }
      setChaseData(Array.from(touchCounts.entries()).map(([t, c]) => ({ touch: `Touch ${t}`, booked: c })))

      // ── Loss Reasons ───────────────────────────────────────────
      const { data: lostBallots } = await supabase
        .from('ballots')
        .select('loss_reason')
        .eq('status', 'lost')
        .not('loss_reason', 'is', null)

      if (lostBallots) {
        const reasonCounts = new Map<string, number>()
        lostBallots.forEach((b: any) => {
          if (b.loss_reason) {
            reasonCounts.set(b.loss_reason, (reasonCounts.get(b.loss_reason) || 0) + 1)
          }
        })
        setLossData(Array.from(reasonCounts.entries()).map(([reason, count]) => ({ reason, count })).sort((a, b) => b.count - a.count))
      }

      setLoading(false)
    }

    fetchAll()
  }, [])

  const handleExportCSV = () => {
    if (sourcePerf.length === 0) return
    const header = 'Source,Cost,Leads,Booked,Conv%,Revenue,CPL,ROI%'
    const rows = sourcePerf.filter(r => r.lead_count > 0).map(r => {
      const conv = r.lead_count > 0 ? (r.booked_count / r.lead_count * 100).toFixed(1) : '0'
      const cpl = r.lead_count > 0 && r.source_cost > 0 ? (r.source_cost / r.lead_count).toFixed(0) : '0'
      const roi = r.source_cost > 0 ? (((r.total_revenue - r.source_cost) / r.source_cost) * 100).toFixed(0) : 'N/A'
      return `"${r.source_name}",${r.source_cost},${r.lead_count},${r.booked_count},${conv}%,$${r.total_revenue},$${cpl},${roi}%`
    })
    const csv = [header, ...rows].join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `bridalflow-analytics-${new Date().toISOString().split('T')[0]}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

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
        <div className="flex items-center justify-between mb-5">
          <div>
            <h1 className={`${playfair.className} text-2xl md:text-3xl font-bold text-[#0d4f4f]`}>
              BridalFlow Analytics
            </h1>
            <div className="flex items-center gap-4 mt-2">
              <Link href="/leads" className="text-sm text-muted-foreground hover:text-[#0d4f4f] transition-colors flex items-center gap-1">
                <Users className="h-4 w-4" /> Leads
              </Link>
              <span className="text-sm font-medium text-[#0d4f4f] flex items-center gap-1">
                <BarChart3 className="h-4 w-4" /> Analytics
              </span>
            </div>
          </div>
          <Button
            variant="outline"
            className="h-10 px-4 rounded-lg"
            onClick={handleExportCSV}
          >
            <Download className="h-4 w-4 mr-1.5" /> Export CSV
          </Button>
        </div>

        {/* Stats Cards */}
        <StatsCards {...stats} />
      </div>

      {/* Charts */}
      <div className="px-5 pb-8 md:px-8 space-y-6">
        {/* Row 1: Source chart + Funnel */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <LeadsBySourceChart data={sourceData} />
          <ConversionFunnel data={funnelData} />
        </div>

        {/* Row 2: Source Performance Table */}
        <SourcePerformanceTable data={sourcePerf} />

        {/* Row 3: Loss Reasons + Chase Effectiveness */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <LossReasonChart data={lossData} />
          <ChaseEffectivenessChart data={chaseData} />
        </div>
      </div>
    </div>
  )
}
