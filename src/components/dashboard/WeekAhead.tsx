'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { format, differenceInDays, parseISO, addDays } from 'date-fns'

interface UpcomingWedding {
  id: string
  bride_first_name: string | null
  groom_first_name: string | null
  wedding_date: string
  contracts: { reception_venue: string | null; ceremony_location: string | null }[] | null
}

interface UpcomingAppointment {
  id: string
  couple_id: string
  appointment_type: string
  appointment_date: string
  start_time: string | null
  location: string | null
  status: string
  couples: { bride_first_name: string | null; groom_first_name: string | null } | null
}

interface DayEvent {
  id: string
  date: string
  type: 'wedding' | 'engagement_shoot' | 'plw' | 'c2_sale' | 'consultation'
  names: string
  location: string | null
  time: string | null
}

const EVENT_STYLES: Record<string, { emoji: string; bg: string; text: string; border: string }> = {
  wedding:          { emoji: '💒', bg: 'bg-red-50',    text: 'text-red-700',    border: 'border-red-400' },
  engagement_shoot: { emoji: '📸', bg: 'bg-green-50',  text: 'text-green-700',  border: 'border-green-400' },
  plw:              { emoji: '📸', bg: 'bg-blue-50',   text: 'text-blue-700',   border: 'border-blue-400' },
  c2_sale:          { emoji: '💰', bg: 'bg-amber-50',  text: 'text-amber-700',  border: 'border-amber-400' },
  consultation:     { emoji: '🤝', bg: 'bg-purple-50', text: 'text-purple-700', border: 'border-purple-400' },
}

const TYPE_LABELS: Record<string, string> = {
  wedding: 'WEDDING',
  engagement_shoot: 'Engagement Shoot',
  plw: 'PLW',
  c2_sale: 'C2 Frame & Album Sale',
  consultation: 'Consultation',
}

export default function WeekAhead() {
  const [events, setEvents] = useState<DayEvent[]>([])
  const [nextWedding, setNextWedding] = useState<{ names: string; date: string; location: string | null; daysUntil: number } | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchData = async () => {
      const today = new Date()
      const todayStr = format(today, 'yyyy-MM-dd')
      const twoWeeksStr = format(addDays(today, 14), 'yyyy-MM-dd')

      const [weddingsRes, appointmentsRes] = await Promise.all([
        supabase
          .from('couples')
          .select('id, bride_first_name, groom_first_name, wedding_date, contracts(reception_venue, ceremony_location)')
          .eq('is_cancelled', false)
          .gte('wedding_date', todayStr)
          .lte('wedding_date', twoWeeksStr)
          .order('wedding_date', { ascending: true }),
        supabase
          .from('couple_appointments')
          .select('id, couple_id, appointment_type, appointment_date, start_time, location, status, couples(bride_first_name, groom_first_name)')
          .eq('status', 'scheduled')
          .gte('appointment_date', todayStr)
          .lte('appointment_date', twoWeeksStr)
          .order('appointment_date', { ascending: true })
          .order('start_time', { ascending: true }),
      ])

      const allEvents: DayEvent[] = []

      const weddings = (weddingsRes.data ?? []) as unknown as UpcomingWedding[]
      const appointments = (appointmentsRes.data ?? []) as unknown as UpcomingAppointment[]

      // Build next wedding countdown
      if (weddings.length > 0) {
        const w = weddings[0]
        const names = [w.bride_first_name, w.groom_first_name].filter(Boolean).join(' & ')
        const contract = Array.isArray(w.contracts) ? w.contracts[0] : null
        const location = [contract?.ceremony_location, contract?.reception_venue].filter(Boolean).join(' / ') || null
        const daysUntil = differenceInDays(parseISO(w.wedding_date), today)
        setNextWedding({ names, date: w.wedding_date, location, daysUntil })
      } else {
        setNextWedding(null)
      }

      // Add weddings as events
      for (const w of weddings) {
        const names = [w.bride_first_name, w.groom_first_name].filter(Boolean).join(' & ')
        const contract = Array.isArray(w.contracts) ? w.contracts[0] : null
        const location = [contract?.ceremony_location, contract?.reception_venue].filter(Boolean).join(' / ') || null
        allEvents.push({
          id: `wedding-${w.id}`,
          date: w.wedding_date,
          type: 'wedding',
          names,
          location,
          time: null,
        })
      }

      // Add appointments as events
      for (const a of appointments) {
        const couple = a.couples as { bride_first_name: string | null; groom_first_name: string | null } | null
        const names = couple ? [couple.bride_first_name, couple.groom_first_name].filter(Boolean).join(' & ') : 'Unknown'
        const type = (['engagement_shoot', 'plw', 'c2_sale', 'consultation'].includes(a.appointment_type)
          ? a.appointment_type
          : 'consultation') as DayEvent['type']
        allEvents.push({
          id: `appt-${a.id}`,
          date: a.appointment_date,
          type,
          names,
          location: a.location,
          time: a.start_time ? a.start_time.slice(0, 5) : null,
        })
      }

      // Sort by date then time
      allEvents.sort((a, b) => {
        const dateCmp = a.date.localeCompare(b.date)
        if (dateCmp !== 0) return dateCmp
        if (a.type === 'wedding') return -1
        if (b.type === 'wedding') return 1
        return (a.time ?? '').localeCompare(b.time ?? '')
      })

      setEvents(allEvents)
      setLoading(false)
    }
    fetchData()
  }, [])

  if (loading) return null

  if (events.length === 0 && !nextWedding) return null

  const today = new Date()
  const todayStr = format(today, 'yyyy-MM-dd')
  const tomorrowStr = format(addDays(today, 1), 'yyyy-MM-dd')
  const rangeEnd = format(addDays(today, 14), 'yyyy-MM-dd')

  // Group by date
  const grouped = new Map<string, DayEvent[]>()
  for (const evt of events) {
    const existing = grouped.get(evt.date) ?? []
    existing.push(evt)
    grouped.set(evt.date, existing)
  }

  const sortedDates = Array.from(grouped.keys()).sort()

  function dayLabel(dateStr: string): string {
    if (dateStr === todayStr) return 'TODAY'
    if (dateStr === tomorrowStr) return 'TOMORROW'
    const d = parseISO(dateStr)
    return `${format(d, 'EEE').toUpperCase()} ${format(d, 'MMM d')}`
  }

  return (
    <div className="rounded-lg border border-gray-200 bg-white shadow-sm p-5">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <span className="text-lg">📅</span>
          <h2 className="font-semibold text-gray-900">The Week Ahead</h2>
        </div>
        <span className="text-xs text-gray-400">
          {format(today, 'EEE MMM d')} – {format(addDays(today, 14), 'EEE MMM d')}
        </span>
      </div>

      {/* Next wedding countdown */}
      {nextWedding && (
        <div className="flex items-center gap-3 p-3 bg-red-50 rounded-lg border border-red-100 mb-4">
          <span className="text-2xl">💒</span>
          <div>
            <div className="font-semibold text-red-900 text-sm">
              {nextWedding.daysUntil === 0 ? 'WEDDING TODAY' : nextWedding.daysUntil === 1 ? 'WEDDING TOMORROW' : `Wedding in ${nextWedding.daysUntil} days`}
            </div>
            <div className="text-red-700 text-xs">
              {nextWedding.names} — {format(parseISO(nextWedding.date), 'EEE MMM d, yyyy').replace(/^(\w)(\w+)/, (_, f, r) => f.toUpperCase() + r)}
              {nextWedding.location ? ` — ${nextWedding.location}` : ''}
            </div>
          </div>
        </div>
      )}

      {/* Day groups */}
      {sortedDates.map(dateStr => {
        const dayEvents = grouped.get(dateStr)!
        return (
          <div key={dateStr} className="mb-4 last:mb-0">
            <div className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">
              {dayLabel(dateStr)}
            </div>
            <div className="space-y-1.5">
              {dayEvents.map(evt => {
                const style = EVENT_STYLES[evt.type] ?? EVENT_STYLES.consultation
                return (
                  <div
                    key={evt.id}
                    className={`flex items-center gap-2 text-sm px-3 py-2 rounded-md border-l-2 ${style.bg} ${style.border}`}
                  >
                    <span>{style.emoji}</span>
                    <span className={`font-medium ${style.text}`}>{evt.names}</span>
                    <span className={`text-xs ${style.text} opacity-75`}>
                      {TYPE_LABELS[evt.type] ?? evt.type}
                    </span>
                    {(evt.location ?? evt.time) && (
                      <span className="text-xs text-gray-400 ml-auto">
                        {[evt.location, evt.time].filter(Boolean).join(' · ')}
                      </span>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        )
      })}
    </div>
  )
}
