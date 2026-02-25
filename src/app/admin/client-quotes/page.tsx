'use client'

import { useState, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { Calendar, CheckCircle, XCircle, Clock, TrendingUp, ChevronUp, ChevronDown, FileText } from 'lucide-react'
import { supabase, getQuoteByCoupleId, updateCoupleStatus, updateQuoteStatus, getCouplesWithQuotes } from '@/lib/supabase'
import { format, parseISO } from 'date-fns'
import { generateQuotePdf, QuotePdfData } from '@/lib/generateQuotePdf'

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

const STATIC_APPOINTMENTS: Appointment[] = [
  { num: 1, date: 'Jan 20, 2026', dateSort: '2026-01-20', couple: 'Victoria & Andrew', bridalShow: 'CBS Fall 2025', weddingDate: 'Sept 12, 2026', weddingDateSort: '2026-09-12', quoted: 3850, status: 'Booked' },
  { num: 2, date: 'Jan 21, 2026', dateSort: '2026-01-21', couple: 'Candace & Felice', bridalShow: 'CBS Winter 2026', weddingDate: 'June 20, 2026', weddingDateSort: '2026-06-20', quoted: 3300, status: 'Booked' },
  { num: 3, date: 'Jan 23, 2026', dateSort: '2026-01-23', couple: 'Sydney & Jason', bridalShow: 'CBS Winter 2026', weddingDate: 'Aug 2, 2026', weddingDateSort: '2026-08-02', quoted: 3955, status: 'Booked' },
  { num: 4, date: 'Jan 24, 2026', dateSort: '2026-01-24', couple: 'Danielle & Jesse', bridalShow: 'CBS Winter 2026', weddingDate: 'Nov 6, 2026', weddingDateSort: '2026-11-06', quoted: 4000, status: 'Failed' },
  { num: 5, date: 'Jan 26, 2026', dateSort: '2026-01-26', couple: 'Cheryl & Thomas', bridalShow: 'CBS Winter 2026', weddingDate: 'Jan 30, 2027', weddingDateSort: '2027-01-30', quoted: 3600, status: 'Pending' },
  { num: 6, date: 'Jan 26, 2026', dateSort: '2026-01-26', couple: 'Rebecca & Andrew', bridalShow: 'CBS Winter 2026', weddingDate: 'Aug 14, 2027', weddingDateSort: '2027-08-14', quoted: 3955, status: 'Failed' },
  { num: 7, date: 'Feb 3, 2026', dateSort: '2026-02-03', couple: 'Siba', bridalShow: 'CBS Winter 2026', weddingDate: 'Sept 11, 2026', weddingDateSort: '2026-09-11', quoted: 3955, status: 'Failed' },
  { num: 8, date: 'Feb 4, 2026', dateSort: '2026-02-04', couple: 'Alyssa & Pasquale', bridalShow: 'CBS Winter 2026', weddingDate: 'May 22, 2027', weddingDateSort: '2027-05-22', quoted: 3955, status: 'Booked' },
  { num: 9, date: 'Feb 5, 2026', dateSort: '2026-02-05', couple: 'Sydney & Liam', bridalShow: 'HBS Winter 2026', weddingDate: 'Oct 11, 2026', weddingDateSort: '2026-10-11', quoted: 3600, status: 'Booked' },
  { num: 10, date: 'Feb 5, 2026', dateSort: '2026-02-05', couple: 'Anu & Arun', bridalShow: 'CBS Winter 2026', weddingDate: 'June 26-27, 2027', weddingDateSort: '2027-06-26', quoted: 5000, status: 'Failed' },
  { num: 11, date: 'Feb 9, 2026', dateSort: '2026-02-09', couple: 'Emma & Noah', bridalShow: 'HBS Winter 2026', weddingDate: 'Apr 23, 2027', weddingDateSort: '2027-04-23', quoted: 3200, status: 'Failed' },
  { num: 12, date: 'Feb 13, 2026', dateSort: '2026-02-13', couple: 'Christina & Eric', bridalShow: 'HBS Winter 2026', weddingDate: 'Oct 17, 2026', weddingDateSort: '2026-10-17', quoted: 3616, status: 'Booked' },
  { num: 13, date: 'Feb 13, 2026', dateSort: '2026-02-13', couple: 'Janet/Karina & Max', bridalShow: 'HBS Winter 2026', weddingDate: 'Sept 3, 2026', weddingDateSort: '2026-09-03', quoted: 3600, status: 'Pending' },
  { num: 14, date: 'Feb 18, 2026', dateSort: '2026-02-18', couple: 'Trina & Matt', bridalShow: 'HBS Winter 2026', weddingDate: 'Oct 24, 2026', weddingDateSort: '2026-10-24', quoted: 3616, status: 'Pending', coupleId: 'f4b8efeb-43e6-4b99-8402-04df57233736' },
  { num: 15, date: 'Feb 24, 2026', dateSort: '2026-02-24', couple: 'Nicole & Cory', bridalShow: 'HBS Winter 2026', weddingDate: 'July 25, 2026', weddingDateSort: '2026-07-25', quoted: 3955, status: 'Pending' },
]

// Normalize freeform DB lead_source values to abbreviated bridalShow display names
function normalizeLeadSource(leadSource: string): string {
  const s = leadSource.toLowerCase()
  // CBS patterns
  if ((s.includes('canada') || s.includes('cbs')) && s.includes('2026')) return 'CBS Winter 2026'
  if ((s.includes('canada') || s.includes('cbs')) && s.includes('fall 2025')) return 'CBS Fall 2025'
  // HBS / Hamilton patterns
  if ((s.includes('hamilton') || s.includes('hbs') || s.includes('ham-')) && s.includes('2026')) return 'HBS Winter 2026'
  // MBS / Modern patterns
  if ((s.includes('modern') || s.includes('mbs')) && s.includes('2026')) return 'MBS Winter 2026'
  // OBS / Oakville patterns
  if ((s.includes('oakville') || s.includes('obs')) && s.includes('2026')) return 'OBS Winter 2026'
  // NBS / Newmarket patterns
  if ((s.includes('newmarket') || s.includes('nbs')) && s.includes('2026')) return 'NBS Winter 2026'
  // Online
  if (s.includes('instagram') || s.includes('facebook') || s.includes('meta')) return 'META/Instagram'
  if (s.includes('referral') || s.includes('ref ') || s.startsWith('ref-')) return 'Referrals'
  return leadSource // pass through as-is
}

// Map bridalShow abbreviations → lead source display names for stats grouping
const BRIDAL_SHOW_TO_SOURCE: Record<string, string> = {
  'CBS Fall 2025': 'CBS Jan 2026 (Canada\'s Bridal Show)',
  'CBS Winter 2026': 'CBS Jan 2026 (Canada\'s Bridal Show)',
  'HBS Winter 2026': 'HBS Jan 2026 (Hamilton Wedding Ring)',
  'NBS Winter 2026': 'NBS Apr 2026 (Newmarket/Uxbridge Wedding Ring)',
  'OBS Winter 2026': 'OBS Mar 2026 (Oakville Wedding Ring)',
  'MBS Winter 2026': 'MBS Feb 2026 (Modern Wedding Show)',
  'META/Instagram': 'META/Instagram',
  'Referrals': 'Referrals',
}

interface LeadSourceConfig {
  name: string
  defaultShowCost: number
}

const LEAD_SOURCES_CONFIG: LeadSourceConfig[] = [
  { name: 'CBS Jan 2026 (Canada\'s Bridal Show)', defaultShowCost: 3223 },
  { name: 'HBS Jan 2026 (Hamilton Wedding Ring)', defaultShowCost: 695 },
  { name: 'NBS Apr 2026 (Newmarket/Uxbridge Wedding Ring)', defaultShowCost: 525 },
  { name: 'OBS Mar 2026 (Oakville Wedding Ring)', defaultShowCost: 695 },
  { name: 'MBS Feb 2026 (Modern Wedding Show)', defaultShowCost: 1595 },
  { name: 'META/Instagram', defaultShowCost: 0 },
  { name: 'Referrals', defaultShowCost: 0 },
]

// Convert a DB couple record to an Appointment
function dbCoupleToAppointment(
  couple: { id: string; couple_name: string; wedding_date: string | null; lead_source: string | null; status: string | null; contract_total: number | null; created_at: string | null; quote_total: number | null; quote_date: string | null },
  num: number
): Appointment {
  const appointmentDateRaw = couple.quote_date || couple.created_at?.split('T')[0] || ''
  let dateDisplay = appointmentDateRaw
  const dateSort = appointmentDateRaw
  if (appointmentDateRaw) {
    try { dateDisplay = format(parseISO(appointmentDateRaw), 'MMM d, yyyy') } catch { /* keep raw */ }
  }

  let weddingDateDisplay = 'TBD'
  let weddingDateSort = '9999-12-31'
  if (couple.wedding_date) {
    try {
      weddingDateDisplay = format(parseISO(couple.wedding_date), 'MMM d, yyyy')
      weddingDateSort = couple.wedding_date
    } catch {
      weddingDateDisplay = couple.wedding_date
      weddingDateSort = couple.wedding_date
    }
  }

  const statusMap: Record<string, Appointment['status']> = { booked: 'Booked', lost: 'Failed', lead: 'Pending' }
  const status = statusMap[couple.status || 'lead'] || 'Pending'
  const quoted = couple.quote_total ?? couple.contract_total ?? null
  const bridalShow = couple.lead_source ? normalizeLeadSource(couple.lead_source) : null

  return { num, date: dateDisplay, dateSort, couple: couple.couple_name, bridalShow, weddingDate: weddingDateDisplay, weddingDateSort, quoted, status, coupleId: couple.id }
}

type SortField = 'num' | 'date' | 'couple' | 'bridalShow' | 'weddingDate' | 'quoted' | 'status'
type SortDir = 'asc' | 'desc'

function fmtMoney(n: number): string {
  return '$' + n.toLocaleString('en-CA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

export default function CoupleQuotesPage() {
  const router = useRouter()
  const [sortField, setSortField] = useState<SortField>('num')
  const [sortDir, setSortDir] = useState<SortDir>('asc')
  const [showCosts, setShowCosts] = useState<Record<string, number>>(() => {
    const init: Record<string, number> = {}
    LEAD_SOURCES_CONFIG.forEach(s => { init[s.name] = s.defaultShowCost })
    return init
  })
  const [statusOverrides, setStatusOverrides] = useState<Record<number, Appointment['status']>>({})
  const [convertingNum, setConvertingNum] = useState<number | null>(null)
  const [dbAppointments, setDbAppointments] = useState<Appointment[]>([])
  const [loading, setLoading] = useState(true)
  const [dbError, setDbError] = useState(false)

  // Fetch couples from database on mount
  useEffect(() => {
    let cancelled = false
    const fetchDbAppointments = async () => {
      try {
        const { data, error } = await getCouplesWithQuotes()
        if (cancelled) return
        if (error || !data) {
          console.error('Failed to fetch couples:', error)
          setDbError(true)
          setLoading(false)
          return
        }
        setDbAppointments(data.map((c, i) => dbCoupleToAppointment(c, 1000 + i)))
      } catch (err) {
        console.error('DB fetch error:', err)
        if (!cancelled) setDbError(true)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    fetchDbAppointments()
    return () => { cancelled = true }
  }, [])

  // Merge static + DB appointments, deduplicating by couple name
  const mergedAppointments = useMemo(() => {
    const staticEntries = [...STATIC_APPOINTMENTS]
    const staticNames = new Set(staticEntries.map(a => a.couple.toLowerCase().trim()))

    // DB entries not already in static list
    const newFromDb = dbAppointments.filter(a => !staticNames.has(a.couple.toLowerCase().trim()))

    // Enrich static entries with coupleId from DB matches
    const dbNameMap = new Map(dbAppointments.map(a => [a.couple.toLowerCase().trim(), a]))
    const enrichedStatic = staticEntries.map(appt => {
      const dbMatch = dbNameMap.get(appt.couple.toLowerCase().trim())
      if (dbMatch) {
        return { ...appt, coupleId: appt.coupleId || dbMatch.coupleId, quoted: appt.quoted ?? dbMatch.quoted }
      }
      return appt
    })

    const combined = [...enrichedStatic, ...newFromDb]
    combined.forEach((appt, i) => { appt.num = i + 1 })
    return combined
  }, [dbAppointments])

  // Apply status overrides on top of merged data
  const effectiveAppointments = useMemo(() => {
    return mergedAppointments.map(appt => {
      if (statusOverrides[appt.num]) {
        return { ...appt, status: statusOverrides[appt.num] }
      }
      return appt
    })
  }, [mergedAppointments, statusOverrides])

  const stats = useMemo(() => {
    const total = effectiveAppointments.length
    const booked = effectiveAppointments.filter(a => a.status === 'Booked').length
    const failed = effectiveAppointments.filter(a => a.status === 'Failed').length
    const pending = effectiveAppointments.filter(a => a.status === 'Pending').length
    const decided = booked + failed
    const conversion = decided > 0 ? Math.round((booked / decided * 100)) : 0
    return { total, booked, failed, pending, conversion }
  }, [effectiveAppointments])

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortDir('asc')
    }
  }

  const sorted = useMemo(() => {
    const result = [...effectiveAppointments]
    result.sort((a, b) => {
      let cmp = 0
      switch (sortField) {
        case 'num': cmp = a.num - b.num; break
        case 'date': cmp = a.dateSort.localeCompare(b.dateSort); break
        case 'couple': cmp = a.couple.localeCompare(b.couple); break
        case 'bridalShow': cmp = (a.bridalShow || '').localeCompare(b.bridalShow || ''); break
        case 'weddingDate': cmp = a.weddingDateSort.localeCompare(b.weddingDateSort); break
        case 'quoted': cmp = (a.quoted || 0) - (b.quoted || 0); break
        case 'status': cmp = a.status.localeCompare(b.status); break
      }
      return sortDir === 'asc' ? cmp : -cmp
    })
    return result
  }, [sortField, sortDir, effectiveAppointments])

  const handleConvertToContract = async (appt: Appointment) => {
    if (!window.confirm(`Convert "${appt.couple}" to a booked contract? This will generate a contract PDF.`)) return

    setConvertingNum(appt.num)
    try {
      // Parse couple name into bride/groom parts
      const parts = appt.couple.split(' & ')
      const brideFirst = (parts[0] || '').trim()
      const groomFirst = (parts[1] || '').trim()

      // Try to find couple in database
      const { data: coupleRows } = await supabase
        .from('couples')
        .select('*')
        .or(`couple_name.ilike.%${brideFirst}%,bride_name.ilike.%${brideFirst}%`)
        .limit(5)

      // Find best match
      const coupleRecord = coupleRows?.find(c => {
        const name = (c.couple_name || '').toLowerCase()
        return name.includes(brideFirst.toLowerCase()) && (!groomFirst || name.includes(groomFirst.toLowerCase()))
      })

      let pdfData: QuotePdfData

      if (coupleRecord) {
        // Try to get quote data for richer contract
        const { data: quoteData } = await getQuoteByCoupleId(coupleRecord.id)
        const fd = quoteData?.form_data

        if (fd) {
          // form_data nests form fields under formValues — flatten for QuotePdfData
          pdfData = {
            ...fd.formValues,
            pricing: fd.pricing,
            installments: fd.installments,
            printOrders: fd.printOrders || {},
            freeParentAlbums: fd.parentAlbumsIncluded === 'free',
            freePrints: fd.printsIncluded === 'free',
            printsTotal: 0,
            timeline: [],
            packageName: ({ exclusively_photo: 'Exclusively Photography', package_c: 'Photography & Video Package C', package_b: 'Photography & Video Package B', package_a: 'Photography & Video Package A' } as Record<string, string>)[fd.formValues?.selectedPackage] || 'Photography Package',
            packageHours: ({ exclusively_photo: 8, package_c: 8, package_b: 10, package_a: 12 } as Record<string, number>)[fd.formValues?.selectedPackage] || 8,
            packageFeatures: buildPackageFeatures(fd),
            contractMode: true,
          }
        } else {
          // Couple in DB but no quote — build minimal QuotePdfData
          pdfData = buildMinimalQuoteData(appt, brideFirst, groomFirst, coupleRecord)
        }

        // Update DB status
        const total = pdfData.pricing.total
        const today = new Date().toISOString().split('T')[0]
        await updateCoupleStatus(coupleRecord.id, 'booked', today, total)
        if (quoteData?.id) {
          await updateQuoteStatus(quoteData.id, 'accepted')
        }
      } else {
        // No DB record — minimal contract from hardcoded data
        pdfData = buildMinimalQuoteData(appt, brideFirst, groomFirst)
      }

      await generateQuotePdf(pdfData)
      setStatusOverrides(prev => ({ ...prev, [appt.num]: 'Booked' }))
    } catch (err) {
      console.error('Contract generation failed:', err)
      const msg = err instanceof Error ? err.message : String(err)
      alert(`Failed to generate contract:\n\n${msg}`)
    } finally {
      setConvertingNum(null)
    }
  }

  const handleStatusChange = async (appt: Appointment, newStatus: Appointment['status']) => {
    if (newStatus === appt.status) return
    setStatusOverrides(prev => ({ ...prev, [appt.num]: newStatus }))

    // Try to update DB if couple exists
    if (appt.coupleId) {
      const dbStatus = newStatus === 'Booked' ? 'booked' : newStatus === 'Failed' ? 'lost' : 'lead'
      const today = new Date().toISOString().split('T')[0]
      const bookedDate = newStatus === 'Booked' ? today : undefined
      await updateCoupleStatus(appt.coupleId, dbStatus, bookedDate, appt.quoted || undefined).catch(console.error)
    }
  }

  const leadSourceRows = useMemo(() => {
    // Dynamically compute counts from actual appointments
    const countsBySource: Record<string, { appointments: number; bookings: number; fail: number; pending: number }> = {}
    LEAD_SOURCES_CONFIG.forEach(s => { countsBySource[s.name] = { appointments: 0, bookings: 0, fail: 0, pending: 0 } })

    effectiveAppointments.forEach(appt => {
      const sourceName = appt.bridalShow ? (BRIDAL_SHOW_TO_SOURCE[appt.bridalShow] || appt.bridalShow) : null
      if (!sourceName) return
      if (!countsBySource[sourceName]) {
        countsBySource[sourceName] = { appointments: 0, bookings: 0, fail: 0, pending: 0 }
      }
      countsBySource[sourceName].appointments++
      if (appt.status === 'Booked') countsBySource[sourceName].bookings++
      else if (appt.status === 'Failed') countsBySource[sourceName].fail++
      else countsBySource[sourceName].pending++
    })

    return LEAD_SOURCES_CONFIG.map(s => {
      const counts = countsBySource[s.name] || { appointments: 0, bookings: 0, fail: 0, pending: 0 }
      const cost = showCosts[s.name] || 0
      const costPerLead = counts.appointments > 0 ? cost / counts.appointments : null
      const costPerSale = counts.bookings > 0 ? cost / counts.bookings : null
      return { ...s, ...counts, showCost: cost, costPerLead, costPerSale }
    })
  }, [showCosts, effectiveAppointments])

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

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return <ChevronUp className="h-3 w-3 opacity-0 group-hover:opacity-30" />
    return sortDir === 'asc'
      ? <ChevronUp className="h-3 w-3" />
      : <ChevronDown className="h-3 w-3" />
  }

  const SortHeader = ({ field, label, className }: { field: SortField; label: string; className?: string }) => (
    <th className={`p-3 font-medium ${className || ''}`}>
      <button onClick={() => handleSort(field)} className="group flex items-center gap-1 hover:text-foreground">
        {label} <SortIcon field={field} />
      </button>
    </th>
  )

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold">Couple Quotes</h1>
        <p className="text-muted-foreground">Winter 2026 appointments (Jan–Aug)</p>
      </div>

      {dbError && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
          Could not load database records. Showing cached appointments only.
        </div>
      )}

      {/* Summary Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
        <div className="rounded-xl border bg-card p-4">
          <div className="flex items-center gap-2 text-muted-foreground text-sm mb-1">
            <Calendar className="h-4 w-4" />
            Appointments
          </div>
          <div className="text-2xl font-bold">{stats.total}</div>
        </div>
        <div className="rounded-xl border bg-card p-4">
          <div className="flex items-center gap-2 text-green-600 text-sm mb-1">
            <CheckCircle className="h-4 w-4" />
            Booked
          </div>
          <div className="text-2xl font-bold text-green-600">{stats.booked}</div>
        </div>
        <div className="rounded-xl border bg-card p-4">
          <div className="flex items-center gap-2 text-red-600 text-sm mb-1">
            <XCircle className="h-4 w-4" />
            Failed
          </div>
          <div className="text-2xl font-bold text-red-600">{stats.failed}</div>
        </div>
        <div className="rounded-xl border bg-card p-4">
          <div className="flex items-center gap-2 text-amber-600 text-sm mb-1">
            <Clock className="h-4 w-4" />
            Pending
          </div>
          <div className="text-2xl font-bold text-amber-600">{stats.pending}</div>
        </div>
        <div className="rounded-xl border bg-card p-4 col-span-2 sm:col-span-1">
          <div className="flex items-center gap-2 text-muted-foreground text-sm mb-1">
            <TrendingUp className="h-4 w-4" />
            Conversion
          </div>
          <div className="text-2xl font-bold">{stats.conversion}%</div>
        </div>
      </div>

      {/* Lead Source Breakdown */}
      <div>
        <h2 className="text-lg font-semibold mb-3">Lead Source Breakdown</h2>
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
      </div>

      {/* Appointments Table */}
      <div>
        <h2 className="text-lg font-semibold mb-3">Appointments</h2>
        <div className="rounded-xl border bg-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/50">
                  <SortHeader field="num" label="#" className="text-left w-10" />
                  <SortHeader field="date" label="Date" className="text-left" />
                  <SortHeader field="couple" label="Couple" className="text-left" />
                  <SortHeader field="bridalShow" label="Bridal Show" className="text-left hidden md:table-cell" />
                  <SortHeader field="weddingDate" label="Wedding Date" className="text-left hidden sm:table-cell" />
                  <SortHeader field="quoted" label="Quoted $" className="text-right" />
                  <SortHeader field="status" label="Status" className="text-left" />
                  <th className="p-3 font-medium text-left">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {sorted.map((appt) => {
                  const rowBg = appt.status === 'Booked' ? 'bg-green-50' : appt.status === 'Pending' ? 'bg-teal-50' : ''
                  return (
                  <tr
                    key={appt.num}
                    className={`hover:bg-accent/50 transition-colors ${rowBg}`}
                  >
                    <td className="p-3 text-muted-foreground">{appt.num}</td>
                    <td className="p-3 whitespace-nowrap">{appt.date}</td>
                    <td className="p-3 font-medium">
                      {appt.coupleId ? (
                        <button
                          onClick={() => router.push(`/client/new-quote?couple_id=${appt.coupleId}`)}
                          className="text-blue-600 hover:text-blue-800 hover:underline"
                        >
                          {appt.couple}
                        </button>
                      ) : appt.couple}
                    </td>
                    <td className="p-3 hidden md:table-cell text-muted-foreground">
                      {appt.bridalShow || <span className="text-muted-foreground">—</span>}
                    </td>
                    <td className="p-3 hidden sm:table-cell whitespace-nowrap">{appt.weddingDate}</td>
                    <td className="p-3 text-right">
                      {appt.quoted
                        ? <span className="font-medium">${appt.quoted.toLocaleString()}</span>
                        : <span className="text-muted-foreground">—</span>
                      }
                    </td>
                    <td className="p-3">
                      <select
                        value={appt.status}
                        onChange={(e) => handleStatusChange(appt, e.target.value as Appointment['status'])}
                        className={`rounded-full px-2.5 py-0.5 text-xs font-medium border-0 cursor-pointer focus:outline-none focus:ring-1 focus:ring-primary ${
                          appt.status === 'Booked' ? 'bg-green-100 text-green-700' :
                          appt.status === 'Failed' ? 'bg-red-100 text-red-700' :
                          'bg-amber-100 text-amber-700'
                        }`}
                      >
                        <option value="Booked">Booked</option>
                        <option value="Pending">Pending</option>
                        <option value="Failed">Failed</option>
                      </select>
                    </td>
                    <td className="p-3">
                      {appt.status === 'Pending' && (
                        <button
                          onClick={() => handleConvertToContract(appt)}
                          disabled={convertingNum !== null}
                          className="inline-flex items-center gap-1.5 rounded-md bg-green-600 px-2.5 py-1.5 text-xs font-medium text-white hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                          {convertingNum === appt.num ? (
                            <>
                              <span className="h-3 w-3 animate-spin rounded-full border-2 border-white border-t-transparent" />
                              Converting...
                            </>
                          ) : (
                            <>
                              <FileText className="h-3 w-3" />
                              Convert to Contract
                            </>
                          )}
                        </button>
                      )}
                    </td>
                  </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}

// ============================================================
// HELPER: Build minimal QuotePdfData from hardcoded appointment data
// ============================================================

function buildMinimalQuoteData(
  appt: Appointment,
  brideFirst: string,
  groomFirst: string,
  coupleRecord?: Record<string, unknown>
): QuotePdfData {
  const basePrice = appt.quoted || 3000
  const hst = Math.round(basePrice * 0.13 * 100) / 100
  const total = basePrice + hst
  const deposit = Math.round(total * 0.25 * 100) / 100
  const remainder = Math.round((total - deposit) * 100) / 100

  return {
    brideFirstName: brideFirst,
    brideLastName: '',
    groomFirstName: groomFirst,
    groomLastName: '',
    brideEmail: (coupleRecord?.bride_email as string) || '',
    bridePhone: (coupleRecord?.bride_phone as string) || '',
    groomEmail: (coupleRecord?.groom_email as string) || '',
    groomPhone: (coupleRecord?.groom_phone as string) || '',
    weddingDate: appt.weddingDateSort,
    ceremonyVenue: (coupleRecord?.ceremony_venue as string) || '',
    receptionVenue: (coupleRecord?.reception_venue as string) || '',
    selectedPackage: 'exclusively_photo',
    packageName: 'Exclusively Photography',
    packageHours: 8,
    packageFeatures: [
      'Lead Photographer',
      'Online Gallery',
      'Edited Digital Files',
      'Print Release',
    ],
    extraPhotographer: false,
    extraHours: 0,
    engagementLocation: 'mill_pond',
    engagementLocationLabel: 'Mill Pond',
    albumType: 'none',
    albumSize: '10x8',
    acrylicCover: false,
    parentAlbumQty: 0,
    firstLook: false,
    pricing: {
      basePrice,
      extraPhotographerPrice: 0,
      extraHoursPrice: 0,
      albumPrice: 0,
      acrylicCoverPrice: 0,
      parentAlbumsPrice: 0,
      locationFee: 0,
      printsPrice: 0,
      subtotal: basePrice,
      discount: 0,
      hst,
      total,
    },
    freeParentAlbums: false,
    freePrints: false,
    printsTotal: 0,
    printOrders: {},
    timeline: [],
    installments: [
      { label: 'Deposit (due upon signing)', amount: deposit },
      { label: 'Final payment (due 30 days before wedding)', amount: remainder },
    ],
    discountType: 'none',
    contractMode: true,
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function buildPackageFeatures(fd: any): string[] {
  const features: string[] = []
  const photo = fd.photoInclusions || {}
  const video = fd.videoInclusions || {}
  const web = fd.webInclusions || {}

  if (photo.digitalImages) features.push('Edited Digital Images')
  if (photo.usbDropbox) features.push('USB / Dropbox Delivery')
  if (photo.engagementShoot) features.push('Engagement Photo Session')
  if (photo.postProduction) features.push('Professional Post-Production')
  if (photo.dronePhoto) features.push('Drone Photography')
  if (photo.weddingPrints) features.push('Wedding Prints')
  if (photo.thankYouCards) features.push('Thank You Cards')
  if (video.hdVideo) features.push('HD Video')
  if (video.highlightClips) features.push('Highlight Clips')
  if (video.droneVideo) features.push('Drone Video')
  if (video.slideshow) features.push('Slideshow')
  if (video.endCredits) features.push('End Credits')
  if (video.instagramVideo) features.push('Instagram Video')
  if (web.weddingGallery) features.push('Online Wedding Gallery')
  if (web.personalWebPage) features.push('Personal Web Page')
  if (fd.parentAlbumsIncluded === 'free') features.push('Complimentary Parent Albums')
  if (fd.printsIncluded === 'free') features.push('Complimentary Prints')

  return features
}
