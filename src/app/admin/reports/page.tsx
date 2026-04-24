'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { DollarSign, Calendar, Video, Camera, TrendingUp, BarChart3 } from 'lucide-react'

const YEARS = [2025, 2026, 2027]

interface KpiData {
  revenue: number
  remaining: number
  outstanding: number
  videoBacklog: number
  photoPipeline: number
  avgPackage: number
}

interface ReportCard {
  emoji: string
  title: string
  description: string
}

const reportCards: ReportCard[] = [
  { emoji: '📄', title: 'Production Report', description: 'Photo & video status for all active couples' },
  { emoji: '👥', title: 'Couples Summary', description: 'Full couples list with milestones & balances' },
  { emoji: '💰', title: 'Financial Summary', description: 'Revenue, payments, outstanding balances' },
  { emoji: '📅', title: 'Wedding Calendar', description: 'Upcoming weddings with crew & venues' },
  { emoji: '🌸', title: 'BridalFlow Leads', description: 'Active leads with source & temperature' },
  { emoji: '📊', title: 'Year Comparison', description: '2026 vs 2025 — bookings, revenue, packages' },
]

const fmtCurrency = (n: number) =>
  new Intl.NumberFormat('en-CA', { style: 'currency', currency: 'CAD', maximumFractionDigits: 0 }).format(n)

export default function ReportsPage() {
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear())
  const [kpi, setKpi] = useState<KpiData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchKpis = async () => {
      setLoading(true)
      const yearStart = `${selectedYear}-01-01`
      const yearEnd = `${selectedYear}-12-31`
      const todayStr = new Date().toISOString().split('T')[0]

      // Fetch all data in parallel
      const [couplesRes, contractsRes, financialsRes, jobsRes] = await Promise.all([
        supabase
          .from('couples')
          .select('id, status, wedding_date, video_stage')
          .gte('wedding_date', yearStart)
          .lte('wedding_date', yearEnd),
        supabase
          .from('contracts')
          .select('couple_id, total'),
        supabase
          .from('couple_financial_summary')
          .select('couple_id, balance_due'),
        supabase
          .from('jobs')
          .select('id, couple_id, status, category'),
      ])

      const couples = couplesRes.data ?? []
      const contracts = contractsRes.data ?? []
      const financials = financialsRes.data ?? []
      const jobs = jobsRes.data ?? []

      const bookedCouples = couples.filter(c => c.status === 'booked')
      const bookedIds = new Set(bookedCouples.map(c => c.id))
      const yearCoupleIds = new Set(couples.map(c => c.id))

      // Card 1: Revenue — sum of contracts.total for booked couples in year
      const revenue = contracts
        .filter(c => bookedIds.has(c.couple_id))
        .reduce((sum, c) => sum + (Number(c.total) ?? 0), 0)

      // Card 2: Weddings remaining — booked, wedding_date >= today, in year
      const remaining = bookedCouples.filter(c => c.wedding_date && c.wedding_date >= todayStr).length

      // Card 3: Outstanding balance — from financial summary for booked couples in year
      const outstanding = financials
        .filter(f => bookedIds.has(f.couple_id))
        .reduce((sum, f) => sum + Math.max(0, Number(f.balance_due) ?? 0), 0)

      // Card 4: Video backlog — couples with video_stage in editing/re_editing in year
      const videoBacklog = couples.filter(c =>
        c.video_stage === 'editing' || c.video_stage === 're_editing'
      ).length

      // Card 5: Photo pipeline — active jobs for couples in year
      const photoPipeline = jobs.filter(j =>
        yearCoupleIds.has(j.couple_id) &&
        !['picked_up', 'completed'].includes(j.status)
      ).length

      // Card 6: Avg package value — avg contracts.total for booked couples in year
      const bookedContracts = contracts.filter(c => bookedIds.has(c.couple_id))
      const avgPackage = bookedContracts.length > 0
        ? bookedContracts.reduce((sum, c) => sum + (Number(c.total) ?? 0), 0) / bookedContracts.length
        : 0

      setKpi({ revenue, remaining, outstanding, videoBacklog, photoPipeline, avgPackage })
      setLoading(false)
    }
    fetchKpis()
  }, [selectedYear])

  const cards = [
    {
      label: 'Revenue This Year',
      value: kpi ? fmtCurrency(kpi.revenue) : '—',
      description: 'Contract totals for booked couples',
      icon: DollarSign,
      iconColor: 'text-green-600',
      iconBg: 'bg-green-50',
      valueColor: '',
    },
    {
      label: 'Weddings Remaining',
      value: kpi ? String(kpi.remaining) : '—',
      description: 'Booked, not yet shot',
      icon: Calendar,
      iconColor: 'text-blue-600',
      iconBg: 'bg-blue-50',
      valueColor: '',
    },
    {
      label: 'Outstanding Balance',
      value: kpi ? fmtCurrency(kpi.outstanding) : '—',
      description: 'Owed across all booked couples',
      icon: TrendingUp,
      iconColor: 'text-red-600',
      iconBg: 'bg-red-50',
      valueColor: kpi && kpi.outstanding > 0 ? 'text-red-600' : 'text-green-600',
    },
    {
      label: 'Video Backlog',
      value: kpi ? String(kpi.videoBacklog) : '—',
      description: 'Videos in editing/re-editing',
      icon: Video,
      iconColor: 'text-purple-600',
      iconBg: 'bg-purple-50',
      valueColor: kpi ? (kpi.videoBacklog > 5 ? 'text-red-600' : kpi.videoBacklog > 0 ? 'text-amber-600' : 'text-green-600') : '',
    },
    {
      label: 'Photo Pipeline',
      value: kpi ? String(kpi.photoPipeline) : '—',
      description: 'Active editing jobs',
      icon: Camera,
      iconColor: 'text-teal-600',
      iconBg: 'bg-teal-50',
      valueColor: '',
    },
    {
      label: 'Avg Package Value',
      value: kpi ? fmtCurrency(kpi.avgPackage) : '—',
      description: 'Mean contract total',
      icon: BarChart3,
      iconColor: 'text-amber-600',
      iconBg: 'bg-amber-50',
      valueColor: '',
    },
  ]

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Reports</h1>
          <p className="text-muted-foreground">SIGS Photography — Business Intelligence</p>
        </div>
        <div className="flex gap-1 rounded-lg border bg-card p-1">
          {YEARS.map(year => (
            <button
              key={year}
              onClick={() => setSelectedYear(year)}
              className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                selectedYear === year
                  ? 'bg-primary text-primary-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground hover:bg-accent'
              }`}
            >
              {year}
            </button>
          ))}
        </div>
      </div>

      {/* Business Snapshot */}
      <div>
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3 flex items-center gap-2">
          📊 Business Snapshot — {selectedYear}
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {cards.map(card => (
            <div key={card.label} className="rounded-xl border bg-card p-4">
              <div className="flex items-center gap-2 mb-2">
                <div className={`rounded-lg p-1.5 ${card.iconBg}`}>
                  <card.icon className={`h-4 w-4 ${card.iconColor}`} />
                </div>
              </div>
              {loading ? (
                <div className="h-8 w-20 bg-muted animate-pulse rounded mt-1" />
              ) : (
                <div className={`text-2xl font-bold ${card.valueColor}`}>{card.value}</div>
              )}
              <div className="text-sm font-medium mt-1">{card.label}</div>
              <div className="text-xs text-muted-foreground mt-0.5">{card.description}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Downloadable Reports */}
      <div>
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3 flex items-center gap-2">
          📋 Downloadable Reports
        </h2>
        <div className="rounded-xl border bg-card divide-y">
          {reportCards.map(report => (
            <div key={report.title} className="flex items-center justify-between p-4">
              <div className="flex items-center gap-3">
                <span className="text-lg">{report.emoji}</span>
                <div>
                  <div className="text-sm font-medium">{report.title}</div>
                  <div className="text-xs text-muted-foreground">{report.description}</div>
                </div>
              </div>
              <button
                disabled
                title="Coming soon"
                className="px-3 py-1.5 text-xs font-medium rounded-md border bg-muted text-muted-foreground cursor-not-allowed"
              >
                Generate
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
