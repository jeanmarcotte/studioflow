'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { Building2, Clock } from 'lucide-react'
import { formatMilitaryTime } from '@/lib/formatters'

interface TodayWedding {
  coupleId: string
  brideName: string
  groomName: string
  ceremonyLocation: string | null
  receptionVenue: string | null
  startTime: string | null
}

function formatTime(timeStr: string | null): string {
  if (!timeStr) return ''
  const match = timeStr.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)?$/i)
  if (!match) return timeStr
  let hours = parseInt(match[1])
  const minutes = match[2]
  const period = match[3]
  if (period) {
    if (period.toUpperCase() === 'PM' && hours !== 12) hours += 12
    if (period.toUpperCase() === 'AM' && hours === 12) hours = 0
  }
  return `${hours.toString().padStart(2, '0')}:${minutes}`
}

export default function WeddingDayBanner() {
  const [weddings, setWeddings] = useState<TodayWedding[]>([])

  useEffect(() => {
    const load = async () => {
      const today = new Date().toISOString().split('T')[0]

      const { data: couples } = await supabase
        .from('couples')
        .select('id, bride_first_name, groom_first_name, wedding_date')
        .eq('wedding_date', today)
        .eq('status', 'booked')

      if (!couples || couples.length === 0) return

      const coupleIds = couples.map((c) => c.id)
      const { data: contracts } = await supabase
        .from('contracts')
        .select('couple_id, ceremony_location, reception_venue, start_time')
        .in('couple_id', coupleIds)

      const contractMap: Record<string, any> = {}
      if (contracts) {
        contracts.forEach((ct) => {
          contractMap[ct.couple_id] = ct
        })
      }

      const results: TodayWedding[] = couples.map((c) => {
        const ct = contractMap[c.id] ?? {}
        return {
          coupleId: c.id,
          brideName: c.bride_first_name ?? '',
          groomName: c.groom_first_name ?? '',
          ceremonyLocation: ct.ceremony_location ?? null,
          receptionVenue: ct.reception_venue ?? null,
          startTime: ct.start_time ?? null,
        }
      })

      // Sort by start time
      results.sort((a, b) => (a.startTime ?? '').localeCompare(b.startTime ?? ''))
      setWeddings(results)
    }

    load()
  }, [])

  if (weddings.length === 0) return null

  return (
    <div className="rounded-2xl border-2 border-teal-600 bg-gradient-to-br from-teal-50 to-amber-50 overflow-hidden">
      {/* Header */}
      <div className="bg-teal-700 px-5 py-2.5 flex items-center gap-2">
        <span className="text-lg">📸</span>
        <span className="text-sm font-bold text-white uppercase tracking-wider">
          Today's Wedding{weddings.length > 1 ? `s (${weddings.length})` : ''}
        </span>
      </div>

      <div className="divide-y divide-teal-200">
        {weddings.map((w) => {
          const venues = [w.ceremonyLocation, w.receptionVenue].filter(Boolean)
          const venueText =
            venues.length === 2 && venues[0] !== venues[1]
              ? `${venues[0]} → ${venues[1]}`
              : venues[0] ?? null

          return (
            <div key={w.coupleId} className="px-5 py-4">
              <h2
                className="text-xl text-stone-900"
                style={{ fontFamily: "'Playfair Display', serif", fontWeight: 700 }}
              >
                {w.brideName} & {w.groomName}
              </h2>

              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-1.5 text-sm text-stone-600">
                {venueText && (
                  <span className="flex items-center gap-1">
                    <Building2 className="h-3.5 w-3.5 text-teal-700" />
                    {venueText}
                  </span>
                )}
                {w.startTime && (
                  <span className="flex items-center gap-1">
                    <Clock className="h-3.5 w-3.5 text-teal-700" />
                    Start: {formatMilitaryTime(w.startTime)}
                  </span>
                )}
              </div>

              <a
                href={`/client/wedding-day-form/${w.coupleId}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center gap-2 mt-3 bg-teal-700 text-white text-sm font-semibold rounded-xl px-5 py-2.5 hover:bg-teal-800 transition-colors"
              >
                📋 Wedding Day Form
              </a>
            </div>
          )
        })}
      </div>
    </div>
  )
}
