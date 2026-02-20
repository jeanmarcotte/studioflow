'use client'

import { useMemo } from 'react'
import { Calendar, CheckCircle, XCircle, Clock, TrendingUp } from 'lucide-react'

interface Appointment {
  num: number
  date: string
  couple: string
  bridalShow: string | null
  weddingDate: string
  quoted: number | null
  status: 'Booked' | 'Failed' | 'Pending'
}

const APPOINTMENTS: Appointment[] = [
  { num: 1, date: 'Jan 20, 2026', couple: 'Victoria & Andrew', bridalShow: 'CBS Fall 2025', weddingDate: 'Sept 12, 2026', quoted: 3850, status: 'Booked' },
  { num: 2, date: 'Jan 21, 2026', couple: 'Candace & Felice', bridalShow: 'CBS Winter 2026', weddingDate: 'June 20, 2026', quoted: 3300, status: 'Booked' },
  { num: 3, date: 'Jan 23, 2026', couple: 'Sydney & Jason', bridalShow: 'CBS Winter 2026', weddingDate: 'Aug 2, 2026', quoted: 3955, status: 'Booked' },
  { num: 4, date: 'Jan 24, 2026', couple: 'Danielle & Jesse', bridalShow: 'CBS Winter 2026', weddingDate: 'Nov 6, 2026', quoted: 4000, status: 'Failed' },
  { num: 5, date: 'Jan 26, 2026', couple: 'Cheryl & Thomas', bridalShow: 'CBS Winter 2026', weddingDate: 'Jan 30, 2027', quoted: 3600, status: 'Failed' },
  { num: 6, date: 'Jan 26, 2026', couple: 'Rebecca & Andrew', bridalShow: 'CBS Winter 2026', weddingDate: 'Aug 14, 2027', quoted: 3955, status: 'Failed' },
  { num: 7, date: 'Feb 3, 2026', couple: 'Siba', bridalShow: 'CBS Winter 2026', weddingDate: 'Sept 11, 2026', quoted: 3955, status: 'Pending' },
  { num: 8, date: 'Feb 4, 2026', couple: 'Alyssa & Pasquale', bridalShow: 'CBS Winter 2026', weddingDate: 'May 22, 2027', quoted: 3955, status: 'Booked' },
  { num: 9, date: 'Feb 5, 2026', couple: 'Sydney & Liam', bridalShow: 'HBS Winter 2026', weddingDate: 'Oct 11, 2026', quoted: 3600, status: 'Booked' },
  { num: 10, date: 'Feb 5, 2026', couple: 'Anu & Arun', bridalShow: 'CBS Winter 2026', weddingDate: 'June 26-27, 2027', quoted: 5000, status: 'Failed' },
  { num: 11, date: 'Feb 9, 2026', couple: 'Emma & Noah', bridalShow: 'HBS Winter 2026', weddingDate: 'Apr 23, 2027', quoted: 3200, status: 'Failed' },
  { num: 12, date: 'Feb 13, 2026', couple: 'Christina & Eric', bridalShow: 'HBS Winter 2026', weddingDate: 'Oct 17, 2026', quoted: 3616, status: 'Booked' },
  { num: 13, date: 'Feb 13, 2026', couple: 'Janet/Karina & Max', bridalShow: 'HBS Winter 2026', weddingDate: 'Sept 3, 2026', quoted: 3600, status: 'Pending' },
  { num: 14, date: 'Feb 18, 2026', couple: 'Trina & Matt', bridalShow: 'HBS Winter 2026', weddingDate: 'Oct 24, 2026', quoted: 3616, status: 'Pending' },
]

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

export default function CoupleQuotesPage() {
  const stats = useMemo(() => {
    const total = APPOINTMENTS.length
    const booked = APPOINTMENTS.filter(a => a.status === 'Booked').length
    const failed = APPOINTMENTS.filter(a => a.status === 'Failed').length
    const pending = APPOINTMENTS.filter(a => a.status === 'Pending').length
    // Conversion % = booked / (booked + failed) — excludes pending and existing
    const decided = booked + failed
    const conversion = decided > 0 ? Math.round((booked / decided * 100)) : 0
    return { total, booked, failed, pending, conversion }
  }, [])

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold">Couple Quotes</h1>
        <p className="text-muted-foreground">Winter 2026 appointments (Jan–Aug)</p>
      </div>

      {/* Stats */}
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

      {/* Table */}
      <div className="rounded-xl border bg-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="text-left p-3 font-medium w-10">#</th>
                <th className="text-left p-3 font-medium">Date</th>
                <th className="text-left p-3 font-medium">Couple</th>
                <th className="text-left p-3 font-medium hidden md:table-cell">Bridal Show</th>
                <th className="text-left p-3 font-medium hidden sm:table-cell">Wedding Date</th>
                <th className="text-right p-3 font-medium">Quoted $</th>
                <th className="text-left p-3 font-medium">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {APPOINTMENTS.map((appt) => (
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
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
