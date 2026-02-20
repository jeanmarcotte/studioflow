'use client'

import { useState, useMemo } from 'react'
import { Calendar, CheckCircle, XCircle, Clock, TrendingUp, ChevronUp, ChevronDown, FileText } from 'lucide-react'
import { supabase, getQuoteByCoupleId, updateCoupleStatus, updateQuoteStatus } from '@/lib/supabase'
import { generateContractPdf, ContractPdfData } from '@/lib/generateContractPdf'

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
}

const APPOINTMENTS: Appointment[] = [
  { num: 1, date: 'Jan 20, 2026', dateSort: '2026-01-20', couple: 'Victoria & Andrew', bridalShow: 'CBS Fall 2025', weddingDate: 'Sept 12, 2026', weddingDateSort: '2026-09-12', quoted: 3850, status: 'Booked' },
  { num: 2, date: 'Jan 21, 2026', dateSort: '2026-01-21', couple: 'Candace & Felice', bridalShow: 'CBS Winter 2026', weddingDate: 'June 20, 2026', weddingDateSort: '2026-06-20', quoted: 3300, status: 'Booked' },
  { num: 3, date: 'Jan 23, 2026', dateSort: '2026-01-23', couple: 'Sydney & Jason', bridalShow: 'CBS Winter 2026', weddingDate: 'Aug 2, 2026', weddingDateSort: '2026-08-02', quoted: 3955, status: 'Booked' },
  { num: 4, date: 'Jan 24, 2026', dateSort: '2026-01-24', couple: 'Danielle & Jesse', bridalShow: 'CBS Winter 2026', weddingDate: 'Nov 6, 2026', weddingDateSort: '2026-11-06', quoted: 4000, status: 'Failed' },
  { num: 5, date: 'Jan 26, 2026', dateSort: '2026-01-26', couple: 'Cheryl & Thomas', bridalShow: 'CBS Winter 2026', weddingDate: 'Jan 30, 2027', weddingDateSort: '2027-01-30', quoted: 3600, status: 'Failed' },
  { num: 6, date: 'Jan 26, 2026', dateSort: '2026-01-26', couple: 'Rebecca & Andrew', bridalShow: 'CBS Winter 2026', weddingDate: 'Aug 14, 2027', weddingDateSort: '2027-08-14', quoted: 3955, status: 'Failed' },
  { num: 7, date: 'Feb 3, 2026', dateSort: '2026-02-03', couple: 'Siba', bridalShow: 'CBS Winter 2026', weddingDate: 'Sept 11, 2026', weddingDateSort: '2026-09-11', quoted: 3955, status: 'Pending' },
  { num: 8, date: 'Feb 4, 2026', dateSort: '2026-02-04', couple: 'Alyssa & Pasquale', bridalShow: 'CBS Winter 2026', weddingDate: 'May 22, 2027', weddingDateSort: '2027-05-22', quoted: 3955, status: 'Booked' },
  { num: 9, date: 'Feb 5, 2026', dateSort: '2026-02-05', couple: 'Sydney & Liam', bridalShow: 'HBS Winter 2026', weddingDate: 'Oct 11, 2026', weddingDateSort: '2026-10-11', quoted: 3600, status: 'Booked' },
  { num: 10, date: 'Feb 5, 2026', dateSort: '2026-02-05', couple: 'Anu & Arun', bridalShow: 'CBS Winter 2026', weddingDate: 'June 26-27, 2027', weddingDateSort: '2027-06-26', quoted: 5000, status: 'Failed' },
  { num: 11, date: 'Feb 9, 2026', dateSort: '2026-02-09', couple: 'Emma & Noah', bridalShow: 'HBS Winter 2026', weddingDate: 'Apr 23, 2027', weddingDateSort: '2027-04-23', quoted: 3200, status: 'Failed' },
  { num: 12, date: 'Feb 13, 2026', dateSort: '2026-02-13', couple: 'Christina & Eric', bridalShow: 'HBS Winter 2026', weddingDate: 'Oct 17, 2026', weddingDateSort: '2026-10-17', quoted: 3616, status: 'Booked' },
  { num: 13, date: 'Feb 13, 2026', dateSort: '2026-02-13', couple: 'Janet/Karina & Max', bridalShow: 'HBS Winter 2026', weddingDate: 'Sept 3, 2026', weddingDateSort: '2026-09-03', quoted: 3600, status: 'Pending' },
  { num: 14, date: 'Feb 18, 2026', dateSort: '2026-02-18', couple: 'Trina & Matt', bridalShow: 'HBS Winter 2026', weddingDate: 'Oct 24, 2026', weddingDateSort: '2026-10-24', quoted: 3616, status: 'Pending' },
]

interface LeadSource {
  name: string
  appointments: number
  bookings: number
  fail: number
  pending: number
  defaultShowCost: number
}

const LEAD_SOURCES: LeadSource[] = [
  { name: 'CBS Jan 2026 (Canada\'s Bridal Show)', appointments: 8, bookings: 3, fail: 4, pending: 1, defaultShowCost: 3223 },
  { name: 'HBS Jan 2026 (Hamilton Wedding Ring)', appointments: 4, bookings: 2, fail: 1, pending: 1, defaultShowCost: 695 },
  { name: 'NBS Apr 2026 (Newmarket/Uxbridge Wedding Ring)', appointments: 0, bookings: 0, fail: 0, pending: 0, defaultShowCost: 525 },
  { name: 'OBS Mar 2026 (Oakville Wedding Ring)', appointments: 0, bookings: 0, fail: 0, pending: 0, defaultShowCost: 695 },
  { name: 'MBS Feb 2026 (Modern Wedding Show)', appointments: 0, bookings: 0, fail: 0, pending: 0, defaultShowCost: 1595 },
  { name: 'META/Instagram', appointments: 0, bookings: 0, fail: 0, pending: 0, defaultShowCost: 0 },
  { name: 'Referrals', appointments: 0, bookings: 0, fail: 0, pending: 0, defaultShowCost: 0 },
]

type SortField = 'num' | 'date' | 'couple' | 'bridalShow' | 'weddingDate' | 'quoted' | 'status'
type SortDir = 'asc' | 'desc'

function statusBadge(status: Appointment['status']) {
  const map: Record<string, string> = {
    Booked: 'bg-green-100 text-green-700',
    Failed: 'bg-red-100 text-red-700',
    Pending: 'bg-amber-100 text-amber-700',
  }
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${map[status]}`}>
      {status}
    </span>
  )
}

function fmtMoney(n: number): string {
  return '$' + n.toLocaleString('en-CA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

export default function CoupleQuotesPage() {
  const [sortField, setSortField] = useState<SortField>('num')
  const [sortDir, setSortDir] = useState<SortDir>('asc')
  const [showCosts, setShowCosts] = useState<Record<string, number>>(() => {
    const init: Record<string, number> = {}
    LEAD_SOURCES.forEach(s => { init[s.name] = s.defaultShowCost })
    return init
  })
  const [statusOverrides, setStatusOverrides] = useState<Record<number, 'Booked'>>({})
  const [convertingNum, setConvertingNum] = useState<number | null>(null)

  // Merge overrides into appointments for stats and rendering
  const effectiveAppointments = useMemo(() => {
    return APPOINTMENTS.map(appt => {
      if (statusOverrides[appt.num]) {
        return { ...appt, status: statusOverrides[appt.num] }
      }
      return appt
    })
  }, [statusOverrides])

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

      let contractData: ContractPdfData

      if (coupleRecord) {
        // Try to get quote data for richer contract
        const { data: quoteData } = await getQuoteByCoupleId(coupleRecord.id)
        const fd = quoteData?.form_data

        if (fd) {
          // Rich contract from quote form_data
          const subtotal = fd.pricing?.subtotal || appt.quoted || 0
          const discount = fd.pricing?.discount || 0
          const hst = fd.pricing?.hst || subtotal * 0.13
          const total = fd.pricing?.total || (subtotal - discount + hst)

          contractData = {
            brideFirstName: fd.brideFirstName || brideFirst,
            brideLastName: fd.brideLastName || '',
            groomFirstName: fd.groomFirstName || groomFirst,
            groomLastName: fd.groomLastName || '',
            brideEmail: fd.brideEmail || coupleRecord.bride_email || '',
            bridePhone: fd.bridePhone || coupleRecord.bride_phone || '',
            groomEmail: fd.groomEmail || coupleRecord.groom_email || '',
            groomPhone: fd.groomPhone || coupleRecord.groom_phone || '',
            weddingDate: fd.weddingDate || coupleRecord.wedding_date || appt.weddingDateSort,
            weddingDateDisplay: appt.weddingDate,
            ceremonyVenue: fd.ceremonyVenue || coupleRecord.ceremony_venue || '',
            receptionVenue: fd.receptionVenue || coupleRecord.reception_venue || '',
            packageName: fd.packageName || 'Exclusively Photography',
            packageHours: fd.packageHours || 8,
            packageFeatures: fd.packageFeatures || [],
            pricing: { subtotal, discount, hst, total },
            installments: fd.installments || buildDefaultInstallments(total),
          }
        } else {
          // Couple in DB but no quote — use hardcoded + DB data
          contractData = buildMinimalContract(appt, brideFirst, groomFirst, coupleRecord)
        }

        // Update DB status
        const total = contractData.pricing.total
        const today = new Date().toISOString().split('T')[0]
        await updateCoupleStatus(coupleRecord.id, 'booked', today, total)
        if (quoteData?.id) {
          await updateQuoteStatus(quoteData.id, 'accepted')
        }
      } else {
        // No DB record — minimal contract from hardcoded data
        contractData = buildMinimalContract(appt, brideFirst, groomFirst)
      }

      await generateContractPdf(contractData)
      setStatusOverrides(prev => ({ ...prev, [appt.num]: 'Booked' }))
    } catch (err) {
      console.error('Contract generation failed:', err)
      alert('Failed to generate contract. Check console for details.')
    } finally {
      setConvertingNum(null)
    }
  }

  const leadSourceRows = useMemo(() => {
    return LEAD_SOURCES.map(s => {
      const cost = showCosts[s.name] || 0
      const costPerLead = s.appointments > 0 ? cost / s.appointments : null
      const costPerSale = s.bookings > 0 ? cost / s.bookings : null
      return { ...s, showCost: cost, costPerLead, costPerSale }
    })
  }, [showCosts])

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

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold">Couple Quotes</h1>
        <p className="text-muted-foreground">Winter 2026 appointments (Jan–Aug)</p>
      </div>

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
                {sorted.map((appt) => (
                  <tr
                    key={appt.num}
                    className="hover:bg-accent/50 transition-colors"
                  >
                    <td className="p-3 text-muted-foreground">{appt.num}</td>
                    <td className="p-3 whitespace-nowrap">{appt.date}</td>
                    <td className="p-3 font-medium">{appt.couple}</td>
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
                    <td className="p-3">{statusBadge(appt.status)}</td>
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
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}

// ============================================================
// HELPER: Build minimal contract from hardcoded appointment data
// ============================================================

function buildMinimalContract(
  appt: Appointment,
  brideFirst: string,
  groomFirst: string,
  coupleRecord?: Record<string, unknown>
): ContractPdfData {
  const subtotal = appt.quoted || 3000
  const hst = Math.round(subtotal * 0.13 * 100) / 100
  const total = subtotal + hst

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
    weddingDateDisplay: appt.weddingDate,
    ceremonyVenue: (coupleRecord?.ceremony_venue as string) || '',
    receptionVenue: (coupleRecord?.reception_venue as string) || '',
    packageName: 'Exclusively Photography',
    packageHours: 8,
    pricing: { subtotal, discount: 0, hst, total },
    installments: buildDefaultInstallments(total),
  }
}

function buildDefaultInstallments(total: number): ContractPdfData['installments'] {
  const deposit = Math.round(total * 0.25 * 100) / 100
  const remainder = Math.round((total - deposit) * 100) / 100
  return [
    { label: 'Deposit (due upon signing)', amount: deposit },
    { label: 'Final payment (due 30 days before wedding)', amount: remainder },
  ]
}
