'use client'

import { useState, useMemo, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { ChevronDown, ChevronRight, FileText, Eye, Search, Clock } from 'lucide-react'
import { motion } from 'framer-motion'
import { supabase } from '@/lib/supabase'
import { ColumnDef } from '@tanstack/react-table'
import { DataTable, DataTableColumnHeader } from '@/components/ui/data-table'
import { ProductionPageHeader, ProductionPills, ProductionSidebar } from '@/components/shared'
import { BridalShowHistoryChart } from '@/components/sales/BridalShowHistoryChart'
import { formatCurrency, formatDateCompact } from '@/lib/formatters'
import jsPDF from 'jspdf'

interface SalesMeeting {
  id: number
  meeting_num: number
  bride_name: string
  groom_name: string | null
  wedding_date: string | null
  service_needs: string | null
  lead_source: string | null
  appt_date: string | null
  quoted_amount: number | null
  status: string | null
  client_quote_id: string | null
}

// For PDF report compatibility
interface Appointment {
  num: number
  date: string
  dateSort: string
  couple: string
  bridalShow: string | null
  weddingDate: string
  weddingDateSort: string
  quoted: number | null
  status: 'Booked' | 'Failed' | 'Pending'
  coupleId?: string
}

interface LeadSourceConfig {
  name: string
  slug: string
  defaultShowCost: number
}

interface LeadSourceRow {
  id: string
  slug: string
  display_name: string
  show_cost: number
  is_active: boolean
}

const LEAD_SOURCES_CONFIG: LeadSourceConfig[] = [
  { name: 'CBS Jan 2026 (Canada\'s Bridal Show)', slug: 'cbs-jan-2026', defaultShowCost: 3223 },
  { name: 'HBS Jan 2026 (Hamilton Wedding Ring)', slug: 'hbs-jan-2026', defaultShowCost: 695 },
  { name: 'NBS Apr 2026 (Newmarket/Uxbridge Wedding Ring)', slug: 'nbs-apr-2026', defaultShowCost: 525 },
  { name: 'OBS Mar 2026 (Oakville Wedding Ring)', slug: 'obs-mar-2026', defaultShowCost: 695 },
  { name: 'MBS Feb 2026 (Modern Wedding Show)', slug: 'mbs-feb-2026', defaultShowCost: 1595 },
  { name: 'META/Instagram', slug: 'meta-instagram', defaultShowCost: 0 },
  { name: 'Referrals', slug: 'referrals', defaultShowCost: 0 },
]

// Map lead_source values from sales_meetings to display names for lead source grouping
const LEAD_SOURCE_TO_DISPLAY: Record<string, string> = {
  'CBS Fall 2025': 'CBS Jan 2026 (Canada\'s Bridal Show)',
  'CBS Winter 2026': 'CBS Jan 2026 (Canada\'s Bridal Show)',
  'HBS Winter 2026': 'HBS Jan 2026 (Hamilton Wedding Ring)',
  'NBS Winter 2026': 'NBS Apr 2026 (Newmarket/Uxbridge Wedding Ring)',
  'OBS Winter 2026': 'OBS Mar 2026 (Oakville Wedding Ring)',
  'MBS Winter 2026': 'MBS Feb 2026 (Modern Wedding Show)',
  'MBS Feb 2026': 'MBS Feb 2026 (Modern Wedding Show)',
  'Wedding Ring Mar 2026': 'OBS Mar 2026 (Oakville Wedding Ring)',
  'META/Instagram': 'META/Instagram',
  'Referrals': 'Referrals',
}

function fmtMoney(n: number): string {
  return formatCurrency(n)
}

function fmtDate(dateStr: string | null): string {
  return formatDateCompact(dateStr)
}

const REPORT_COLORS = {
  dark: [41, 37, 36] as [number, number, number],
  body: [87, 83, 78] as [number, number, number],
  muted: [120, 113, 108] as [number, number, number],
  border: [214, 211, 209] as [number, number, number],
  bgLight: [245, 245, 244] as [number, number, number],
  green: [16, 185, 129] as [number, number, number],
}

export default function CoupleQuotesPage() {
  const router = useRouter()
  const [meetings, setMeetings] = useState<SalesMeeting[]>([])
  const [meetingsLoading, setMeetingsLoading] = useState(true)
  const [collapsedLanes, setCollapsedLanes] = useState<Set<string>>(new Set())
  const [searchQuery, setSearchQuery] = useState('')
  const [seasonData, setSeasonData] = useState<any[]>([])
  const [showCosts, setShowCosts] = useState<Record<string, number>>(() => {
    const init: Record<string, number> = {}
    LEAD_SOURCES_CONFIG.forEach(s => { init[s.name] = s.defaultShowCost })
    return init
  })
  const [slugByName, setSlugByName] = useState<Record<string, string>>(() => {
    const init: Record<string, string> = {}
    LEAD_SOURCES_CONFIG.forEach(s => { init[s.name] = s.slug })
    return init
  })

  // Load sales meetings and lead sources from database
  useEffect(() => {
    const loadMeetings = async () => {
      try {
        const res = await fetch('/api/admin/sales-meetings')
        if (!res.ok) return
        const data: SalesMeeting[] = await res.json()
        setMeetings(data)
      } catch (err) {
        console.error('[loadMeetings] Failed:', err)
      } finally {
        setMeetingsLoading(false)
      }
    }

    const loadLeadSources = async () => {
      try {
        const res = await fetch('/api/sales/lead-sources')
        if (!res.ok) return
        const data: LeadSourceRow[] = await res.json()
        const costs: Record<string, number> = {}
        const slugMap: Record<string, string> = {}
        data.forEach(row => {
          costs[row.display_name] = Number(row.show_cost) || 0
          slugMap[row.display_name] = row.slug
        })
        // Merge with defaults (in case DB has new sources not in config)
        setShowCosts(prev => ({ ...prev, ...costs }))
        setSlugByName(prev => ({ ...prev, ...slugMap }))
      } catch (err) {
        console.error('[loadLeadSources] Failed:', err)
      }
    }

    loadMeetings()
    loadLeadSources()

    // Fetch bridal show seasons for chart
    supabase
      .from('bridal_show_seasons')
      .select('season_name, year, season, appts, booked, failed, new_cust_revenue, frame_revenue, conversion_rate, total_show_cost, cost_per_sale')
      .order('year', { ascending: true })
      .then(({ data }) => { if (data) setSeasonData(data) })
  }, [])

  const handleStatusChange = async (meeting: SalesMeeting, newStatus: string) => {
    if (newStatus === meeting.status) return

    // Optimistic update
    setMeetings(prev => prev.map(m => m.id === meeting.id ? { ...m, status: newStatus } : m))

    try {
      await fetch('/api/admin/sales-meetings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: meeting.id, status: newStatus }),
      })
    } catch (err) {
      console.error('[handleStatusChange] Failed:', err)
      // Revert on failure
      setMeetings(prev => prev.map(m => m.id === meeting.id ? { ...m, status: meeting.status } : m))
    }
  }

  // Map meetings to Appointment shape for stats/report compatibility
  const effectiveAppointments: Appointment[] = useMemo(() => {
    return meetings.map(m => {
      const couple = m.groom_name ? `${m.bride_name} & ${m.groom_name}` : m.bride_name
      const status = (m.status === 'Booked' ? 'Booked' : m.status === 'Failed' ? 'Failed' : 'Pending') as Appointment['status']
      return {
        num: m.meeting_num,
        date: fmtDate(m.appt_date),
        dateSort: m.appt_date || '',
        couple,
        bridalShow: m.lead_source,
        weddingDate: fmtDate(m.wedding_date),
        weddingDateSort: m.wedding_date || '',
        quoted: m.quoted_amount ? Number(m.quoted_amount) : null,
        status,
      }
    })
  }, [meetings])

  const stats = useMemo(() => {
    const total = effectiveAppointments.length
    const booked = effectiveAppointments.filter(a => a.status === 'Booked').length
    const failed = effectiveAppointments.filter(a => a.status === 'Failed').length
    const pending = effectiveAppointments.filter(a => a.status === 'Pending').length
    const decided = booked + failed
    const conversion = decided > 0 ? Math.round((booked / decided * 100)) : 0
    return { total, booked, failed, pending, conversion }
  }, [effectiveAppointments])

  const leadSourceRows = useMemo(() => {
    const countsBySource: Record<string, { appointments: number; bookings: number; fail: number; pending: number }> = {}
    LEAD_SOURCES_CONFIG.forEach(s => { countsBySource[s.name] = { appointments: 0, bookings: 0, fail: 0, pending: 0 } })

    meetings.forEach(m => {
      const sourceName = m.lead_source ? (LEAD_SOURCE_TO_DISPLAY[m.lead_source] || m.lead_source) : null
      if (!sourceName) return
      if (!countsBySource[sourceName]) {
        countsBySource[sourceName] = { appointments: 0, bookings: 0, fail: 0, pending: 0 }
      }
      countsBySource[sourceName].appointments++
      if (m.status === 'Booked') countsBySource[sourceName].bookings++
      else if (m.status === 'Failed') countsBySource[sourceName].fail++
      else countsBySource[sourceName].pending++
    })

    return LEAD_SOURCES_CONFIG.map(s => {
      const counts = countsBySource[s.name] || { appointments: 0, bookings: 0, fail: 0, pending: 0 }
      const cost = showCosts[s.name] || 0
      const costPerLead = counts.appointments > 0 ? cost / counts.appointments : null
      const costPerSale = counts.bookings > 0 ? cost / counts.bookings : null
      return { ...s, ...counts, showCost: cost, costPerLead, costPerSale }
    })
  }, [showCosts, meetings])

  const leadTotals = useMemo(() => {
    const t = leadSourceRows.reduce(
      (acc, r) => ({
        appointments: acc.appointments + r.appointments,
        bookings: acc.bookings + r.bookings,
        fail: acc.fail + r.fail,
        pending: acc.pending + r.pending,
        showCost: acc.showCost + r.showCost,
      }),
      { appointments: 0, bookings: 0, fail: 0, pending: 0, showCost: 0 }
    )
    return {
      ...t,
      costPerLead: t.appointments > 0 ? t.showCost / t.appointments : null,
      costPerSale: t.bookings > 0 ? t.showCost / t.bookings : null,
    }
  }, [leadSourceRows])

  const generatePipelineReport = async () => {
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'letter' })
    const pageWidth = doc.internal.pageSize.getWidth()
    const pageHeight = doc.internal.pageSize.getHeight()
    const margin = 20
    const contentWidth = pageWidth - margin * 2
    const rightEdge = pageWidth - margin
    let y = 15

    const checkPageBreak = (needed: number) => {
      if (y + needed > pageHeight - 20) {
        doc.addPage()
        y = 20
      }
    }

    const drawSectionBanner = (title: string) => {
      doc.setFillColor(...REPORT_COLORS.bgLight)
      doc.rect(margin, y - 4.5, contentWidth, 7.5, 'F')
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(9)
      doc.setTextColor(...REPORT_COLORS.dark)
      doc.text(title, margin + 3, y + 0.5)
      y += 8
    }

    // ── Logo ──
    let logoBase64: string | null = null
    try {
      const response = await fetch('/images/sigslogo.png')
      const blob = await response.blob()
      logoBase64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader()
        reader.onloadend = () => resolve(reader.result as string)
        reader.onerror = reject
        reader.readAsDataURL(blob)
      })
    } catch { /* logo optional */ }

    if (logoBase64) {
      try {
        const logoSize = 28
        doc.addImage(logoBase64, 'JPEG', (pageWidth - logoSize) / 2, y, logoSize, logoSize)
        y += logoSize + 4
      } catch { /* skip logo */ }
    }

    // ── Title ──
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(16)
    doc.setTextColor(...REPORT_COLORS.dark)
    doc.text('SIGS Photography', pageWidth / 2, y, { align: 'center' })
    y += 7
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(11)
    doc.setTextColor(...REPORT_COLORS.body)
    doc.text('Sales Pipeline Report', pageWidth / 2, y, { align: 'center' })
    y += 6
    const generated = new Date().toLocaleString('en-CA', { timeZone: 'America/Toronto' })
    doc.setFontSize(8)
    doc.setTextColor(...REPORT_COLORS.muted)
    doc.text(`Generated: ${generated}`, pageWidth / 2, y, { align: 'center' })
    y += 4
    doc.setDrawColor(...REPORT_COLORS.border)
    doc.setLineWidth(0.3)
    doc.line(margin, y, rightEdge, y)
    y += 8

    // ── Summary Stats ──
    drawSectionBanner('SUMMARY STATISTICS')
    const statPairs: [string, string][] = [
      ['Total Meetings', `${stats.total}`],
      ['Booked', `${stats.booked}`],
      ['Pending', `${stats.pending}`],
      ['Failed', `${stats.failed}`],
      ['Conversion Rate', `${stats.conversion}%`],
    ]
    doc.setFontSize(9)
    for (const [label, value] of statPairs) {
      doc.setFont('helvetica', 'bold')
      doc.setTextColor(...REPORT_COLORS.muted)
      doc.text(`${label}:`, margin + 5, y)
      doc.setFont('helvetica', 'normal')
      doc.setTextColor(...REPORT_COLORS.dark)
      doc.text(value, margin + 55, y)
      y += 5.5
    }
    y += 4

    // ── Revenue Summary ──
    drawSectionBanner('REVENUE SUMMARY')
    const totalQuoted = effectiveAppointments.reduce((sum, a) => sum + (a.quoted || 0), 0)
    const bookedValue = effectiveAppointments.filter(a => a.status === 'Booked').reduce((sum, a) => sum + (a.quoted || 0), 0)
    const pendingValue = effectiveAppointments.filter(a => a.status === 'Pending').reduce((sum, a) => sum + (a.quoted || 0), 0)
    const revPairs: [string, string][] = [
      ['Total Quoted', fmtMoney(totalQuoted)],
      ['Booked Value', fmtMoney(bookedValue)],
      ['Pending (Potential)', fmtMoney(pendingValue)],
    ]
    doc.setFontSize(9)
    for (const [label, value] of revPairs) {
      doc.setFont('helvetica', 'bold')
      doc.setTextColor(...REPORT_COLORS.muted)
      doc.text(`${label}:`, margin + 5, y)
      doc.setFont('helvetica', 'normal')
      doc.setTextColor(...REPORT_COLORS.dark)
      doc.text(value, margin + 55, y)
      y += 5.5
    }
    y += 4

    // ── Lead Source Breakdown ──
    checkPageBreak(30)
    drawSectionBanner('LEAD SOURCE BREAKDOWN')
    const rowH = 6
    const lsAppts = rightEdge - 70
    const lsBooked = rightEdge - 55
    const lsFailed = rightEdge - 40
    const lsPending = rightEdge - 25
    const lsClose = rightEdge

    doc.setFillColor(...REPORT_COLORS.bgLight)
    doc.rect(margin, y - 3.5, contentWidth, rowH, 'F')
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(7)
    doc.setTextColor(...REPORT_COLORS.dark)
    doc.text('Source', margin + 2, y + 0.5)
    doc.text('Appts', lsAppts, y + 0.5, { align: 'right' })
    doc.text('Booked', lsBooked, y + 0.5, { align: 'right' })
    doc.text('Failed', lsFailed, y + 0.5, { align: 'right' })
    doc.text('Pending', lsPending, y + 0.5, { align: 'right' })
    doc.text('Close %', lsClose, y + 0.5, { align: 'right' })
    y += rowH
    doc.setDrawColor(...REPORT_COLORS.border)
    doc.line(margin, y - 2, rightEdge, y - 2)

    doc.setFont('helvetica', 'normal')
    doc.setFontSize(7)
    for (const row of leadSourceRows.filter(r => r.appointments > 0)) {
      checkPageBreak(rowH)
      doc.setTextColor(...REPORT_COLORS.body)
      doc.text(row.name, margin + 2, y + 0.5)
      doc.text(`${row.appointments}`, lsAppts, y + 0.5, { align: 'right' })
      doc.text(`${row.bookings}`, lsBooked, y + 0.5, { align: 'right' })
      doc.text(`${row.fail}`, lsFailed, y + 0.5, { align: 'right' })
      doc.text(`${row.pending}`, lsPending, y + 0.5, { align: 'right' })
      const decided = row.bookings + row.fail
      doc.text(decided > 0 ? `${Math.round(row.bookings / decided * 100)}%` : '\u2014', lsClose, y + 0.5, { align: 'right' })
      y += rowH
    }

    doc.setDrawColor(...REPORT_COLORS.border)
    doc.line(margin, y - 2, rightEdge, y - 2)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(...REPORT_COLORS.dark)
    doc.text('TOTALS', margin + 2, y + 0.5)
    doc.text(`${leadTotals.appointments}`, lsAppts, y + 0.5, { align: 'right' })
    doc.text(`${leadTotals.bookings}`, lsBooked, y + 0.5, { align: 'right' })
    doc.text(`${leadTotals.fail}`, lsFailed, y + 0.5, { align: 'right' })
    doc.text(`${leadTotals.pending}`, lsPending, y + 0.5, { align: 'right' })
    const totalDecided = leadTotals.bookings + leadTotals.fail
    doc.text(totalDecided > 0 ? `${Math.round(leadTotals.bookings / totalDecided * 100)}%` : '\u2014', lsClose, y + 0.5, { align: 'right' })
    y += rowH + 6

    // ── Pending Leads ──
    const pendingAppts = effectiveAppointments.filter(a => a.status === 'Pending')
    if (pendingAppts.length > 0) {
      checkPageBreak(20)
      drawSectionBanner('ACTION REQUIRED \u2014 PENDING LEADS')
      const pCouple = margin + 2
      const pWedding = margin + 55
      const pSource = margin + 90
      const pQuoted = rightEdge - 20
      const pDays = rightEdge

      doc.setFillColor(...REPORT_COLORS.bgLight)
      doc.rect(margin, y - 3.5, contentWidth, rowH, 'F')
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(7)
      doc.setTextColor(...REPORT_COLORS.dark)
      doc.text('Couple', pCouple, y + 0.5)
      doc.text('Wedding Date', pWedding, y + 0.5)
      doc.text('Lead Source', pSource, y + 0.5)
      doc.text('Quoted', pQuoted, y + 0.5, { align: 'right' })
      doc.text('Days', pDays, y + 0.5, { align: 'right' })
      y += rowH
      doc.setDrawColor(...REPORT_COLORS.border)
      doc.line(margin, y - 2, rightEdge, y - 2)

      doc.setFont('helvetica', 'normal')
      doc.setFontSize(7)
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      for (const appt of pendingAppts) {
        checkPageBreak(rowH)
        doc.setTextColor(...REPORT_COLORS.body)
        doc.text(appt.couple.length > 28 ? appt.couple.substring(0, 26) + '...' : appt.couple, pCouple, y + 0.5)
        doc.text(appt.weddingDate, pWedding, y + 0.5)
        doc.text(appt.bridalShow || '\u2014', pSource, y + 0.5)
        doc.text(appt.quoted ? fmtMoney(appt.quoted) : '\u2014', pQuoted, y + 0.5, { align: 'right' })
        let daysSince = '\u2014'
        if (appt.dateSort) {
          const diff = Math.floor((today.getTime() - new Date(appt.dateSort + 'T12:00:00').getTime()) / 86400000)
          daysSince = `${diff}`
        }
        doc.text(daysSince, pDays, y + 0.5, { align: 'right' })
        y += rowH
      }
      y += 6
    }

    // ── Booked Summary ──
    const bookedAppts = effectiveAppointments.filter(a => a.status === 'Booked')
    if (bookedAppts.length > 0) {
      checkPageBreak(20)
      drawSectionBanner('BOOKED SUMMARY')
      doc.setFillColor(...REPORT_COLORS.bgLight)
      doc.rect(margin, y - 3.5, contentWidth, rowH, 'F')
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(7)
      doc.setTextColor(...REPORT_COLORS.dark)
      doc.text('Couple', margin + 2, y + 0.5)
      doc.text('Wedding Date', margin + 65, y + 0.5)
      doc.text('Amount', rightEdge, y + 0.5, { align: 'right' })
      y += rowH
      doc.setDrawColor(...REPORT_COLORS.border)
      doc.line(margin, y - 2, rightEdge, y - 2)

      doc.setFont('helvetica', 'normal')
      doc.setFontSize(7)
      for (const appt of bookedAppts) {
        checkPageBreak(rowH)
        doc.setTextColor(...REPORT_COLORS.body)
        doc.text(appt.couple, margin + 2, y + 0.5)
        doc.text(appt.weddingDate, margin + 65, y + 0.5)
        doc.text(appt.quoted ? fmtMoney(appt.quoted) : '\u2014', rightEdge, y + 0.5, { align: 'right' })
        y += rowH
      }
      doc.setDrawColor(...REPORT_COLORS.border)
      doc.line(margin, y - 2, rightEdge, y - 2)
      doc.setFont('helvetica', 'bold')
      doc.setTextColor(...REPORT_COLORS.dark)
      doc.text('Total Booked Value', margin + 2, y + 0.5)
      doc.text(fmtMoney(bookedValue), rightEdge, y + 0.5, { align: 'right' })
      y += rowH + 6
    }

    // ── Failed/Lost ──
    const failedAppts = effectiveAppointments.filter(a => a.status === 'Failed')
    if (failedAppts.length > 0) {
      checkPageBreak(15)
      drawSectionBanner('FAILED / LOST')
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(8)
      doc.setTextColor(...REPORT_COLORS.body)
      for (const appt of failedAppts) {
        checkPageBreak(5)
        doc.text(`\u2022 ${appt.couple}`, margin + 5, y)
        y += 5
      }
    }

    // ── Footers on all pages ──
    const totalPages = doc.getNumberOfPages()
    for (let i = 1; i <= totalPages; i++) {
      doc.setPage(i)
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(7)
      doc.setTextColor(...REPORT_COLORS.muted)
      doc.text('SIGS Photography \u2014 Confidential', margin, pageHeight - 10)
      doc.text(`Page ${i} of ${totalPages}`, rightEdge, pageHeight - 10, { align: 'right' })
    }

    // ── Save ──
    const d = new Date()
    const stamp = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
    doc.save(`SIGS_Sales_Pipeline_Report_${stamp}.pdf`)
  }

  const toggleLane = (key: string) => {
    setCollapsedLanes(prev => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

  // Filter meetings by search
  const filteredMeetings = useMemo(() => {
    if (!searchQuery) return meetings
    const q = searchQuery.toLowerCase()
    return meetings.filter(m => {
      const couple = m.groom_name ? `${m.bride_name} & ${m.groom_name}` : m.bride_name
      return couple.toLowerCase().includes(q) || (m.lead_source || '').toLowerCase().includes(q)
    })
  }, [meetings, searchQuery])

  const bookedMeetings = useMemo(() => filteredMeetings.filter(m => m.status === 'Booked'), [filteredMeetings])
  const failedMeetings = useMemo(() => filteredMeetings.filter(m => m.status === 'Failed'), [filteredMeetings])
  const pendingMeetings = useMemo(() => filteredMeetings.filter(m => m.status === 'Pending'), [filteredMeetings])

  // DataTable column definitions
  const meetingColumns: ColumnDef<SalesMeeting>[] = useMemo(() => [
    {
      id: 'meeting_num',
      accessorKey: 'meeting_num',
      header: ({ column }) => <DataTableColumnHeader column={column} title="#" />,
      cell: ({ row }) => <span className="text-muted-foreground">{row.original.meeting_num}</span>,
    },
    {
      id: 'couple',
      accessorFn: (row) => row.groom_name ? `${row.bride_name} & ${row.groom_name}` : row.bride_name,
      header: ({ column }) => <DataTableColumnHeader column={column} title="Couple" />,
      cell: ({ row }) => {
        const m = row.original
        return <span className="font-medium">{m.groom_name ? `${m.bride_name} & ${m.groom_name}` : m.bride_name}</span>
      },
    },
    {
      id: 'wedding_date',
      accessorKey: 'wedding_date',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Wedding Date" />,
      cell: ({ row }) => <span className="whitespace-nowrap">{fmtDate(row.original.wedding_date)}</span>,
    },
    {
      id: 'appt_date',
      accessorKey: 'appt_date',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Appt Date" />,
      cell: ({ row }) => <span className="whitespace-nowrap">{fmtDate(row.original.appt_date)}</span>,
    },
    {
      id: 'lead_source',
      accessorKey: 'lead_source',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Lead Source" />,
      cell: ({ row }) => <span className="text-muted-foreground">{row.original.lead_source || '—'}</span>,
    },
    {
      id: 'quoted_amount',
      accessorFn: (row) => Number(row.quoted_amount) || 0,
      header: ({ column }) => <DataTableColumnHeader column={column} title="Quoted $" />,
      cell: ({ row }) => {
        const amt = row.original.quoted_amount
        return amt && Number(amt) > 0
          ? <span className="font-medium">{fmtMoney(Number(amt))}</span>
          : <span className="text-muted-foreground">—</span>
      },
    },
    {
      id: 'status',
      accessorKey: 'status',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Status" />,
      cell: ({ row }) => {
        const m = row.original
        return (
          <select
            value={m.status || 'Pending'}
            onChange={(e) => handleStatusChange(m, e.target.value)}
            className={`rounded-full px-2.5 py-0.5 text-xs font-medium border-0 cursor-pointer focus:outline-none focus:ring-1 focus:ring-primary ${
              m.status === 'Booked' ? 'bg-green-100 text-green-700' :
              m.status === 'Failed' ? 'bg-red-100 text-red-700' :
              'bg-amber-100 text-amber-700'
            }`}
          >
            <option value="Booked">Booked</option>
            <option value="Pending">Pending</option>
            <option value="Failed">Failed</option>
          </select>
        )
      },
      enableSorting: false,
    },
    {
      id: 'actions',
      header: 'Actions',
      cell: ({ row }) => {
        const m = row.original
        if (!m.client_quote_id) return null
        return (
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => router.push(`/client/new-quote?id=${m.client_quote_id}`)}
              className="inline-flex items-center gap-1 rounded-md bg-blue-50 border border-blue-200 px-2 py-1.5 text-xs font-medium text-blue-700 hover:bg-blue-100 transition-colors"
              title="View Quote"
            >
              <Eye className="h-3 w-3" />
              View
            </button>
            <button
              onClick={() => router.push(`/admin/contracts/generate?quote_id=${m.client_quote_id}`)}
              className="inline-flex items-center gap-1 rounded-md bg-muted border border-border px-2 py-1.5 text-xs font-medium text-foreground hover:bg-muted/80 transition-colors"
              title="Contract"
            >
              <FileText className="h-3 w-3" />
              Contract
            </button>
          </div>
        )
      },
      enableSorting: false,
    },
  ], [handleStatusChange, router])

  // Days pending helper
  const getDaysPending = (apptDate: string | null) => {
    if (!apptDate) return 0
    return Math.floor((Date.now() - new Date(apptDate).getTime()) / (1000 * 60 * 60 * 24))
  }

  // Pending-specific columns with Days Pending badge
  const pendingColumns: ColumnDef<SalesMeeting>[] = useMemo(() => {
    // Insert Days Pending column before Actions (last column)
    const cols = [...meetingColumns]
    const actionsIdx = cols.findIndex(c => c.id === 'actions')
    const daysPendingCol: ColumnDef<SalesMeeting> = {
      id: 'days_pending',
      accessorFn: (row) => getDaysPending(row.appt_date),
      header: ({ column }) => <DataTableColumnHeader column={column} title="Days Pending" />,
      cell: ({ row }) => {
        const days = getDaysPending(row.original.appt_date)
        const badgeClass = days >= 15
          ? 'bg-red-100 text-red-700 font-semibold'
          : days >= 8
            ? 'bg-amber-100 text-amber-700'
            : 'bg-green-100 text-green-700'
        return (
          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${badgeClass}`}>
            {days}d
          </span>
        )
      },
    }
    if (actionsIdx >= 0) {
      cols.splice(actionsIdx, 0, daysPendingCol)
    } else {
      cols.push(daysPendingCol)
    }
    return cols
  }, [meetingColumns])

  // Pending hero card data
  const oldestPendingDays = useMemo(() => {
    if (pendingMeetings.length === 0) return 0
    return Math.max(...pendingMeetings.map(m => getDaysPending(m.appt_date)))
  }, [pendingMeetings])

  const pendingHeroLabel = useMemo(() => {
    if (pendingMeetings.length === 0) return ''
    if (pendingMeetings.length === 1) {
      const m = pendingMeetings[0]
      const couple = m.groom_name ? `${m.bride_name} & ${m.groom_name}` : m.bride_name
      return `${couple} needs a decision — ${getDaysPending(m.appt_date)}d waiting`
    }
    return `${pendingMeetings.length} couples waiting`
  }, [pendingMeetings])

  // Collapsible section helper
  const renderSection = (id: string, label: string, data: SalesMeeting[], badgeClass: string) => {
    const isCollapsed = collapsedLanes.has(id)
    return (
      <div id={id} className="mb-6">
        <button
          onClick={() => toggleLane(id)}
          className="flex items-center gap-3 py-3 hover:opacity-80"
        >
          {isCollapsed
            ? <ChevronRight className="h-4 w-4 text-muted-foreground" />
            : <ChevronDown className="h-4 w-4 text-muted-foreground" />
          }
          <span className={`inline-flex items-center gap-2 px-3 py-0.5 rounded-full text-sm font-semibold ${badgeClass}`}>
            {label}
          </span>
          <span className="text-sm text-muted-foreground">
            {data.length} meeting{data.length !== 1 ? 's' : ''}
          </span>
        </button>
        {!isCollapsed && (
          <DataTable
            columns={meetingColumns}
            data={data}
            showPagination={false}
            emptyMessage="No meetings"
          />
        )}
      </div>
    )
  }

  if (meetingsLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    )
  }

  return (
    <div className="space-y-0">
      <ProductionPageHeader
        title="Couple Quotes"
        subtitle="2026 sales meetings"
        reportHref="/api/sales-report?manual=true"
        actionLabel="New Sale"
        actionHref="/client/new-quote"
      />

      <ProductionPills pills={[
        { label: 'Booked', count: stats.booked, color: 'green' },
        { label: 'Failed', count: stats.failed, color: 'red' },
        { label: 'Pending', count: stats.pending, color: 'yellow' },
      ]} />

      {/* Content area: main panel + stats sidebar */}
      <div className="flex">
        {/* Main Panel */}
        <div className="flex-1 overflow-y-auto p-6 border-r border-border">
          {/* Search */}
          <div className="flex flex-wrap gap-3 mb-6">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Search couples or lead sources..."
                className="w-full rounded-lg border border-input bg-background pl-9 pr-3 py-2.5 text-sm outline-none transition-colors focus:border-ring"
                style={{ paddingLeft: '2.25rem' }}
              />
            </div>
          </div>

          {seasonData.length > 0 && (
            <BridalShowHistoryChart seasons={seasonData} />
          )}

          {/* Pending Hero Card */}
          {pendingMeetings.length > 0 && (
            <motion.div
              animate={{ scale: [1, 1.015, 1] }}
              transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut' }}
              className="mb-6 rounded-xl border-2 border-amber-400 bg-amber-50 p-5"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Clock className="h-6 w-6 text-amber-600" />
                  <div>
                    <h3 className="text-lg font-bold text-amber-900">PENDING SALES</h3>
                    <p className="text-sm text-amber-700">{pendingHeroLabel}</p>
                  </div>
                </div>
                <span className="text-2xl font-bold text-amber-900">
                  {pendingMeetings.length} meeting{pendingMeetings.length !== 1 ? 's' : ''}
                </span>
              </div>
            </motion.div>
          )}

          {/* Pending Table */}
          <div id="section-pending" className="mb-6">
            <button
              onClick={() => toggleLane('section-pending')}
              className="flex items-center gap-3 py-3 hover:opacity-80"
            >
              {collapsedLanes.has('section-pending')
                ? <ChevronRight className="h-4 w-4 text-muted-foreground" />
                : <ChevronDown className="h-4 w-4 text-muted-foreground" />
              }
              <span className="inline-flex items-center gap-2 px-3 py-0.5 rounded-full text-sm font-semibold bg-amber-100 text-amber-700">
                PENDING
              </span>
              <span className="text-sm text-muted-foreground">
                {pendingMeetings.length} meeting{pendingMeetings.length !== 1 ? 's' : ''}
              </span>
            </button>
            {!collapsedLanes.has('section-pending') && (
              <DataTable
                columns={pendingColumns}
                data={pendingMeetings}
                showPagination={false}
                emptyMessage="No meetings"
              />
            )}
          </div>
          {renderSection('section-all', 'ALL MEETINGS', filteredMeetings, 'bg-gray-100 text-gray-700')}
          {renderSection('section-booked', 'BOOKED', bookedMeetings, 'bg-green-100 text-green-700')}
          {renderSection('section-failed', 'FAILED', failedMeetings, 'bg-red-100 text-red-700')}

          {/* Lead Source Breakdown */}
          <div id="section-lead-sources" className="mb-6">
            <button
              onClick={() => toggleLane('section-lead-sources')}
              className="flex items-center gap-3 py-3 hover:opacity-80"
            >
              {collapsedLanes.has('section-lead-sources')
                ? <ChevronRight className="h-4 w-4 text-muted-foreground" />
                : <ChevronDown className="h-4 w-4 text-muted-foreground" />
              }
              <span className="inline-flex items-center gap-2 px-3 py-0.5 rounded-full text-sm font-semibold bg-blue-100 text-blue-700">
                LEAD SOURCE BREAKDOWN
              </span>
            </button>
            {!collapsedLanes.has('section-lead-sources') && (
              <div className="rounded-xl border bg-card overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b bg-muted/50">
                        <th className="text-left p-3 font-medium">Source</th>
                        <th className="text-right p-3 font-medium">Appts</th>
                        <th className="text-right p-3 font-medium">Bookings</th>
                        <th className="text-right p-3 font-medium">Fail</th>
                        <th className="text-right p-3 font-medium">Pending</th>
                        <th className="text-right p-3 font-medium">Show Cost</th>
                        <th className="text-right p-3 font-medium">Cost/Lead</th>
                        <th className="text-right p-3 font-medium">Cost/Sale</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {leadSourceRows.map((row) => (
                        <tr key={row.name} className="hover:bg-accent/50 transition-colors">
                          <td className="p-3 font-medium">{row.name}</td>
                          <td className="p-3 text-right">{row.appointments}</td>
                          <td className="p-3 text-right">{row.bookings}</td>
                          <td className="p-3 text-right">{row.fail}</td>
                          <td className="p-3 text-right">{row.pending}</td>
                          <td className="p-3 text-right">
                            <div className="flex items-center justify-end gap-1">
                              <span className="text-muted-foreground">$</span>
                              <input
                                type="number"
                                min="0"
                                step="0.01"
                                value={row.showCost || ''}
                                onChange={(e) => {
                                  const val = parseFloat(e.target.value) || 0
                                  setShowCosts(prev => ({ ...prev, [row.name]: val }))
                                }}
                                onBlur={(e) => {
                                  const val = parseFloat(e.target.value) || 0
                                  const slug = slugByName[row.name]
                                  if (slug) {
                                    fetch('/api/sales/lead-sources', {
                                      method: 'PATCH',
                                      headers: { 'Content-Type': 'application/json' },
                                      body: JSON.stringify({ slug, show_cost: val }),
                                    }).catch(err => console.error('[saveShowCost] Failed:', err))
                                  }
                                }}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') (e.target as HTMLInputElement).blur()
                                }}
                                className="w-24 text-right bg-transparent border border-border rounded px-2 py-0.5 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                                placeholder="0.00"
                              />
                            </div>
                          </td>
                          <td className="p-3 text-right text-muted-foreground">
                            {row.costPerLead !== null ? fmtMoney(row.costPerLead) : '—'}
                          </td>
                          <td className="p-3 text-right text-muted-foreground">
                            {row.costPerSale !== null ? fmtMoney(row.costPerSale) : '—'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr className="border-t-2 bg-muted/30 font-semibold">
                        <td className="p-3">TOTALS</td>
                        <td className="p-3 text-right">{leadTotals.appointments}</td>
                        <td className="p-3 text-right">{leadTotals.bookings}</td>
                        <td className="p-3 text-right">{leadTotals.fail}</td>
                        <td className="p-3 text-right">{leadTotals.pending}</td>
                        <td className="p-3 text-right">{fmtMoney(leadTotals.showCost)}</td>
                        <td className="p-3 text-right">{leadTotals.costPerLead !== null ? fmtMoney(leadTotals.costPerLead) : '—'}</td>
                        <td className="p-3 text-right">{leadTotals.costPerSale !== null ? fmtMoney(leadTotals.costPerSale) : '—'}</td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>
            )}
          </div>
        </div>

        <ProductionSidebar boxes={[
          { label: 'MEETINGS', value: stats.total, scrollToId: 'section-all', color: 'default' },
          { label: 'BOOKED', value: stats.booked, scrollToId: 'section-booked', color: 'green' },
          { label: 'FAILED', value: stats.failed, scrollToId: 'section-failed', color: 'red' },
          { label: 'PENDING', value: stats.pending, scrollToId: 'section-pending', color: 'yellow' },
          { label: 'CONVERSION', value: `${stats.conversion}%`, scrollToId: 'section-booked', color: 'teal' },
        ]} />
      </div>
    </div>
  )
}
