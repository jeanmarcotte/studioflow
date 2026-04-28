'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { DollarSign, Calendar, Video, Camera, TrendingUp, BarChart3, Loader2, Download } from 'lucide-react'
import { toast } from 'sonner'
import { format, parseISO, differenceInDays } from 'date-fns'

const YEARS = [2025, 2026, 2027]

interface KpiData {
  revenue: number
  remaining: number
  outstanding: number
  videoBacklog: number
  photoPipeline: number
  avgPackage: number
}

const fmtCurrency = (n: number) =>
  new Intl.NumberFormat('en-CA', { style: 'currency', currency: 'CAD', maximumFractionDigits: 0 }).format(n)

function downloadCSV(filename: string, headers: string[], rows: string[][]) {
  const csvContent = [
    headers.join(','),
    ...rows.map(row => row.map(cell => `"${String(cell ?? '').replace(/"/g, '""')}"`).join(','))
  ].join('\n')

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  link.click()
  URL.revokeObjectURL(url)
}

export default function ReportsPage() {
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear())
  const [kpi, setKpi] = useState<KpiData | null>(null)
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState<string | null>(null)

  useEffect(() => {
    const fetchKpis = async () => {
      setLoading(true)
      const yearStart = `${selectedYear}-01-01`
      const yearEnd = `${selectedYear}-12-31`
      const todayStr = new Date().toISOString().split('T')[0]

      const [couplesRes, contractsRes, financialsRes, jobsRes] = await Promise.all([
        supabase.from('couples').select('id, phase, is_cancelled, wedding_date, video_stage').gte('wedding_date', yearStart).lte('wedding_date', yearEnd),
        supabase.from('contracts').select('couple_id, total'),
        supabase.from('couple_financial_summary').select('couple_id, balance_due'),
        supabase.from('jobs').select('id, couple_id, status, category'),
      ])

      const couples = couplesRes.data ?? []
      const contracts = contractsRes.data ?? []
      const financials = financialsRes.data ?? []
      const jobs = jobsRes.data ?? []

      const activeCouples = couples.filter(c => !c.is_cancelled)
      const activeIds = new Set(activeCouples.map(c => c.id))
      const yearCoupleIds = new Set(couples.map(c => c.id))

      const revenue = contracts.filter(c => activeIds.has(c.couple_id)).reduce((sum, c) => sum + (Number(c.total) ?? 0), 0)
      const remaining = activeCouples.filter(c => c.wedding_date && c.wedding_date >= todayStr).length
      const outstanding = financials.filter(f => activeIds.has(f.couple_id)).reduce((sum, f) => sum + Math.max(0, Number(f.balance_due) ?? 0), 0)
      const videoBacklog = couples.filter(c => c.video_stage === 'editing' || c.video_stage === 're_editing').length
      const photoPipeline = jobs.filter(j => yearCoupleIds.has(j.couple_id) && !['picked_up', 'completed'].includes(j.status)).length
      const activeContracts = contracts.filter(c => activeIds.has(c.couple_id))
      const avgPackage = activeContracts.length > 0 ? activeContracts.reduce((sum, c) => sum + (Number(c.total) ?? 0), 0) / activeContracts.length : 0

      setKpi({ revenue, remaining, outstanding, videoBacklog, photoPipeline, avgPackage })
      setLoading(false)
    }
    fetchKpis()
  }, [selectedYear])

  // === CSV GENERATORS ===

  async function generateProductionReport() {
    setGenerating('production')
    const yearStart = `${selectedYear}-01-01`
    const yearEnd = `${selectedYear}-12-31`
    const today = new Date()

    const [couplesRes, jobsRes] = await Promise.all([
      supabase.from('couples').select('id, couple_name, wedding_date, phase, is_cancelled, video_stage').gte('wedding_date', yearStart).lte('wedding_date', yearEnd).eq('is_cancelled', false).order('wedding_date', { ascending: true }),
      supabase.from('jobs').select('id, couple_id, status'),
    ])

    const couples = couplesRes.data ?? []
    const jobs = jobsRes.data ?? []
    if (couples.length === 0) { toast.error(`No data found for ${selectedYear}`); setGenerating(null); return }

    const jobsByCouple = new Map<string, any[]>()
    for (const j of jobs) { jobsByCouple.set(j.couple_id, [...(jobsByCouple.get(j.couple_id) ?? []), j]) }

    const headers = ['Couple', 'Wedding Date', 'Status', 'Photo Jobs', 'Active Photo Jobs', 'Video Stage', 'Days Since Wedding']
    const rows = couples.map(c => {
      const cJobs = jobsByCouple.get(c.id) ?? []
      const activeJobs = cJobs.filter(j => !['picked_up', 'completed'].includes(j.status)).length
      const daysSince = c.wedding_date ? differenceInDays(today, parseISO(c.wedding_date)) : ''
      return [c.couple_name, c.wedding_date ?? '', c.phase || 'new_client', String(cJobs.length), String(activeJobs), c.video_stage ?? '—', String(daysSince)]
    })

    downloadCSV(`sigs-production-report-${selectedYear}.csv`, headers, rows)
    toast.success('Production Report downloaded')
    setGenerating(null)
  }

  async function generateCouplesSummary() {
    setGenerating('couples')
    const yearStart = `${selectedYear}-01-01`
    const yearEnd = `${selectedYear}-12-31`

    const [couplesRes, contractsRes, financialsRes, milestonesRes, extrasRes] = await Promise.all([
      supabase.from('couples').select('id, couple_name, wedding_date, phase, is_cancelled, package_type').gte('wedding_date', yearStart).lte('wedding_date', yearEnd).order('wedding_date', { ascending: true }),
      supabase.from('contracts').select('couple_id, reception_venue, total'),
      supabase.from('couple_financial_summary').select('couple_id, total_paid, balance_due'),
      supabase.from('couple_milestones').select('couple_id, m06_eng_session_shot, m06_declined'),
      supabase.from('extras_orders').select('couple_id, status, extras_sale_amount'),
    ])

    const couples = couplesRes.data ?? []
    if (couples.length === 0) { toast.error(`No data found for ${selectedYear}`); setGenerating(null); return }

    const contractMap = new Map((contractsRes.data ?? []).map((c: any) => [c.couple_id, c]))
    const finMap = new Map((financialsRes.data ?? []).map((f: any) => [f.couple_id, f]))
    const msMap = new Map((milestonesRes.data ?? []).map((m: any) => [m.couple_id, m]))
    const extrasMap = new Map<string, string>()
    for (const e of (extrasRes.data ?? []) as any[]) {
      if (!extrasMap.has(e.couple_id) || e.status === 'signed') extrasMap.set(e.couple_id, e.status)
    }

    const headers = ['Couple', 'Wedding Date', 'Status', 'Package', 'Venue', 'Total Price', 'Amount Received', 'Balance Owing', 'Engagement', 'C2 Frames Status']
    const rows = couples.map(c => {
      const con = contractMap.get(c.id) as any
      const fin = finMap.get(c.id) as any
      const ms = msMap.get(c.id) as any
      const eng = ms?.m06_eng_session_shot ? 'Shot' : ms?.m06_declined ? 'Declined' : 'Pending'
      return [
        c.couple_name, c.wedding_date ?? '', c.phase || 'new_client', c.package_type ?? '', con?.reception_venue ?? '',
        fmtCurrency(Number(con?.total) ?? 0), fmtCurrency(Number(fin?.total_paid) ?? 0), fmtCurrency(Number(fin?.balance_due) ?? 0),
        eng, extrasMap.get(c.id) ?? '—',
      ]
    })

    downloadCSV(`sigs-couples-summary-${selectedYear}.csv`, headers, rows)
    toast.success('Couples Summary downloaded')
    setGenerating(null)
  }

  async function generateFinancialSummary() {
    setGenerating('financial')
    const yearStart = `${selectedYear}-01-01`
    const yearEnd = `${selectedYear}-12-31`

    const [couplesRes, contractsRes, financialsRes, paymentsRes, extrasRes] = await Promise.all([
      supabase.from('couples').select('id, couple_name, wedding_date, package_type').eq('is_cancelled', false).gte('wedding_date', yearStart).lte('wedding_date', yearEnd),
      supabase.from('contracts').select('couple_id, total'),
      supabase.from('couple_financial_summary').select('couple_id, total_paid, balance_due'),
      supabase.from('payments').select('couple_id'),
      supabase.from('extras_orders').select('couple_id, extras_sale_amount, status').in('status', ['signed', 'completed']),
    ])

    const couples = couplesRes.data ?? []
    if (couples.length === 0) { toast.error(`No data found for ${selectedYear}`); setGenerating(null); return }

    const contractMap = new Map((contractsRes.data ?? []).map((c: any) => [c.couple_id, c]))
    const finMap = new Map((financialsRes.data ?? []).map((f: any) => [f.couple_id, f]))
    const paymentCounts = new Map<string, number>()
    for (const p of (paymentsRes.data ?? []) as any[]) { paymentCounts.set(p.couple_id, (paymentCounts.get(p.couple_id) ?? 0) + 1) }
    const extrasMap = new Map<string, number>()
    for (const e of (extrasRes.data ?? []) as any[]) { extrasMap.set(e.couple_id, (extrasMap.get(e.couple_id) ?? 0) + (Number(e.extras_sale_amount) ?? 0)) }

    const headers = ['Couple', 'Wedding Date', 'Package', 'Total Price', 'Amount Received', 'Balance Owing', 'Payments Made', 'C2 Extras Total']
    const rows = couples
      .map(c => {
        const con = contractMap.get(c.id) as any
        const fin = finMap.get(c.id) as any
        return {
          row: [c.couple_name, c.wedding_date ?? '', c.package_type ?? '', fmtCurrency(Number(con?.total) ?? 0), fmtCurrency(Number(fin?.total_paid) ?? 0), fmtCurrency(Number(fin?.balance_due) ?? 0), String(paymentCounts.get(c.id) ?? 0), fmtCurrency(extrasMap.get(c.id) ?? 0)],
          balance: Number(fin?.balance_due) ?? 0,
        }
      })
      .sort((a, b) => b.balance - a.balance)
      .map(r => r.row)

    downloadCSV(`sigs-financial-summary-${selectedYear}.csv`, headers, rows)
    toast.success('Financial Summary downloaded')
    setGenerating(null)
  }

  async function generateWeddingCalendar() {
    setGenerating('calendar')
    const todayStr = new Date().toISOString().split('T')[0]
    const yearEnd = `${selectedYear}-12-31`

    const [couplesRes, contractsRes] = await Promise.all([
      supabase.from('couples').select('id, couple_name, wedding_date, package_type').eq('is_cancelled', false).gte('wedding_date', todayStr).lte('wedding_date', yearEnd).order('wedding_date', { ascending: true }),
      supabase.from('contracts').select('couple_id, ceremony_location, reception_venue, start_time, end_time, appointment_notes'),
    ])

    const couples = couplesRes.data ?? []
    if (couples.length === 0) { toast.error(`No data found for ${selectedYear}`); setGenerating(null); return }

    const contractMap = new Map((contractsRes.data ?? []).map((c: any) => [c.couple_id, c]))

    const headers = ['Wedding Date', 'Day of Week', 'Couple', 'Venue', 'Ceremony Location', 'Start Time', 'End Time', 'Package', 'Notes']
    const rows = couples.map(c => {
      const con = contractMap.get(c.id) as any
      const dow = c.wedding_date ? format(parseISO(c.wedding_date), 'EEEE') : ''
      return [c.wedding_date ?? '', dow, c.couple_name, con?.reception_venue ?? '', con?.ceremony_location ?? '', con?.start_time ?? '', con?.end_time ?? '', c.package_type ?? '', con?.appointment_notes ?? '']
    })

    downloadCSV(`sigs-wedding-calendar-${selectedYear}.csv`, headers, rows)
    toast.success('Wedding Calendar downloaded')
    setGenerating(null)
  }

  async function generateBridalFlowLeads() {
    setGenerating('bridalflow')
    const yearStart = `${selectedYear}-01-01`
    const yearEnd = `${selectedYear}-12-31`

    const { data } = await supabase
      .from('ballots')
      .select('bride_first_name, bride_last_name, groom_first_name, groom_last_name, wedding_date, venue_name, cell_phone, email, status, temperature, show_id, entry_method, created_at')
      .gte('wedding_date', yearStart)
      .lte('wedding_date', yearEnd)
      .neq('status', 'lost')
      .order('wedding_date', { ascending: true })

    const ballots = data ?? []
    if (ballots.length === 0) { toast.error(`No data found for ${selectedYear}`); setGenerating(null); return }

    const headers = ['Bride', 'Groom', 'Wedding Date', 'Venue', 'Phone', 'Email', 'Status', 'Temperature', 'Source', 'Entry Method', 'Created Date']
    const rows = ballots.map((b: any) => [
      [b.bride_first_name, b.bride_last_name].filter(Boolean).join(' '),
      [b.groom_first_name, b.groom_last_name].filter(Boolean).join(' '),
      b.wedding_date ?? '', b.venue_name ?? '', b.cell_phone ?? '', b.email ?? '',
      b.status ?? '', b.temperature ?? '', b.show_id ?? '', b.entry_method ?? '',
      b.created_at ? format(parseISO(b.created_at), 'yyyy-MM-dd') : '',
    ])

    downloadCSV(`sigs-bridalflow-leads-${selectedYear}.csv`, headers, rows)
    toast.success('BridalFlow Leads downloaded')
    setGenerating(null)
  }

  async function generateYearComparison() {
    setGenerating('comparison')
    const prevYear = selectedYear - 1

    async function getYearStats(year: number) {
      const yearStart = `${year}-01-01`
      const yearEnd = `${year}-12-31`

      const [couplesRes, contractsRes, milestonesRes, extrasRes] = await Promise.all([
        supabase.from('couples').select('id, phase, is_cancelled, package_type').gte('wedding_date', yearStart).lte('wedding_date', yearEnd),
        supabase.from('contracts').select('couple_id, total'),
        supabase.from('couple_milestones').select('couple_id, m06_eng_session_shot'),
        supabase.from('extras_orders').select('couple_id, status, extras_sale_amount').in('status', ['signed', 'completed']),
      ])

      const couples = couplesRes.data ?? []
      const contracts = contractsRes.data ?? []
      const milestones = milestonesRes.data ?? []
      const extras = extrasRes.data ?? []

      const active = couples.filter(c => !c.is_cancelled)
      const activeIds = new Set(active.map(c => c.id))
      const coupleIds = new Set(couples.map(c => c.id))
      const activeContracts = contracts.filter(c => activeIds.has(c.couple_id))
      const revenue = activeContracts.reduce((s, c) => s + (Number(c.total) ?? 0), 0)
      const avg = activeContracts.length > 0 ? revenue / activeContracts.length : 0
      const photoVideo = active.filter(c => c.package_type?.toLowerCase().includes('photo') && c.package_type?.toLowerCase().includes('video')).length
      const photoOnly = active.filter(c => c.package_type?.toLowerCase().includes('photo') && !c.package_type?.toLowerCase().includes('video')).length
      const engShot = milestones.filter(m => coupleIds.has(m.couple_id) && m.m06_eng_session_shot === true).length
      const c2Sold = extras.filter(e => coupleIds.has(e.couple_id)).length
      const finRes = await supabase.from('couple_financial_summary').select('couple_id, balance_due')
      const avgBalance = active.length > 0
        ? (finRes.data ?? []).filter((f: any) => activeIds.has(f.couple_id)).reduce((s: number, f: any) => s + Math.max(0, Number(f.balance_due) ?? 0), 0) / active.length
        : 0

      return { weddings: active.length, revenue, avg, photoVideo, photoOnly, engShot, c2Sold, avgBalance }
    }

    const [curr, prev] = await Promise.all([getYearStats(selectedYear), getYearStats(prevYear)])

    const pctChange = (a: number, b: number) => b === 0 ? (a > 0 ? '+100%' : '0%') : `${a >= b ? '+' : ''}${Math.round(((a - b) / b) * 100)}%`

    const headers = ['Metric', String(prevYear), String(selectedYear), 'Change']
    const rows = [
      ['Total Weddings Booked', String(prev.weddings), String(curr.weddings), pctChange(curr.weddings, prev.weddings)],
      ['Total Revenue', fmtCurrency(prev.revenue), fmtCurrency(curr.revenue), pctChange(curr.revenue, prev.revenue)],
      ['Average Package Value', fmtCurrency(prev.avg), fmtCurrency(curr.avg), pctChange(curr.avg, prev.avg)],
      ['Photo+Video Packages', String(prev.photoVideo), String(curr.photoVideo), pctChange(curr.photoVideo, prev.photoVideo)],
      ['Photo Only Packages', String(prev.photoOnly), String(curr.photoOnly), pctChange(curr.photoOnly, prev.photoOnly)],
      ['Engagement Sessions Shot', String(prev.engShot), String(curr.engShot), pctChange(curr.engShot, prev.engShot)],
      ['C2 Frames Sold', String(prev.c2Sold), String(curr.c2Sold), pctChange(curr.c2Sold, prev.c2Sold)],
      ['Average Balance Owing', fmtCurrency(prev.avgBalance), fmtCurrency(curr.avgBalance), pctChange(curr.avgBalance, prev.avgBalance)],
    ]

    downloadCSV(`sigs-year-comparison.csv`, headers, rows)
    toast.success('Year Comparison downloaded')
    setGenerating(null)
  }

  const reportConfigs = [
    { key: 'production', emoji: '📄', title: 'Production Report', description: 'Photo & video status for all active couples', generate: generateProductionReport },
    { key: 'couples', emoji: '👥', title: 'Couples Summary', description: 'Full couples list with milestones & balances', generate: generateCouplesSummary },
    { key: 'financial', emoji: '💰', title: 'Financial Summary', description: 'Revenue, payments, outstanding balances', generate: generateFinancialSummary },
    { key: 'calendar', emoji: '📅', title: 'Wedding Calendar', description: 'Upcoming weddings with crew & venues', generate: generateWeddingCalendar },
    { key: 'bridalflow', emoji: '🌸', title: 'BridalFlow Leads', description: 'Active leads with source & temperature', generate: generateBridalFlowLeads },
    { key: 'comparison', emoji: '📊', title: 'Year Comparison', description: `${selectedYear} vs ${selectedYear - 1} — bookings, revenue, packages`, generate: generateYearComparison },
  ]

  const kpiCards = [
    { label: 'Revenue This Year', value: kpi ? fmtCurrency(kpi.revenue) : '—', description: 'Contract totals for booked couples', icon: DollarSign, iconColor: 'text-green-600', iconBg: 'bg-green-50', valueColor: '' },
    { label: 'Weddings Remaining', value: kpi ? String(kpi.remaining) : '—', description: 'Booked, not yet shot', icon: Calendar, iconColor: 'text-blue-600', iconBg: 'bg-blue-50', valueColor: '' },
    { label: 'Outstanding Balance', value: kpi ? fmtCurrency(kpi.outstanding) : '—', description: 'Owed across all booked couples', icon: TrendingUp, iconColor: 'text-red-600', iconBg: 'bg-red-50', valueColor: kpi && kpi.outstanding > 0 ? 'text-red-600' : 'text-green-600' },
    { label: 'Video Backlog', value: kpi ? String(kpi.videoBacklog) : '—', description: 'Videos in editing/re-editing', icon: Video, iconColor: 'text-purple-600', iconBg: 'bg-purple-50', valueColor: kpi ? (kpi.videoBacklog > 5 ? 'text-red-600' : kpi.videoBacklog > 0 ? 'text-amber-600' : 'text-green-600') : '' },
    { label: 'Photo Pipeline', value: kpi ? String(kpi.photoPipeline) : '—', description: 'Active editing jobs', icon: Camera, iconColor: 'text-teal-600', iconBg: 'bg-teal-50', valueColor: '' },
    { label: 'Avg Package Value', value: kpi ? fmtCurrency(kpi.avgPackage) : '—', description: 'Mean contract total', icon: BarChart3, iconColor: 'text-amber-600', iconBg: 'bg-amber-50', valueColor: '' },
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
          {kpiCards.map(card => (
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
          📋 Downloadable Reports — {selectedYear}
        </h2>
        <div className="rounded-xl border bg-card divide-y">
          {reportConfigs.map(report => {
            const isGenerating = generating === report.key
            return (
              <div key={report.key} className="flex flex-col sm:flex-row sm:items-center justify-between p-4 gap-3">
                <div className="flex items-center gap-3">
                  <span className="text-lg">{report.emoji}</span>
                  <div>
                    <div className="text-sm font-medium">{report.title}</div>
                    <div className="text-xs text-muted-foreground">{report.description}</div>
                  </div>
                </div>
                <button
                  onClick={report.generate}
                  disabled={isGenerating || generating !== null}
                  className={`inline-flex items-center justify-center gap-1.5 px-4 py-2.5 text-xs font-medium rounded-md border transition-colors min-h-[44px] w-full sm:w-auto ${
                    isGenerating
                      ? 'bg-muted text-muted-foreground cursor-wait'
                      : 'bg-card hover:bg-accent text-foreground cursor-pointer'
                  }`}
                >
                  {isGenerating ? (
                    <>
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      Generating...
                    </>
                  ) : (
                    <>
                      <Download className="h-3.5 w-3.5" />
                      Generate
                    </>
                  )}
                </button>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
