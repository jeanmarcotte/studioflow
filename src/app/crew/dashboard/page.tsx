'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { crewSupabase } from '@/lib/supabase-crew'
import { Calendar, MapPin, Clock, Building2, PartyPopper, Truck, StickyNote, CheckCircle2, Camera } from 'lucide-react'

interface WeddingJob {
  assignmentId: string
  coupleId: string
  brideName: string
  groomName: string
  weddingDate: string
  callTime: string | null
  meetingPoint: string | null
  meetingPointTime: string | null
  equipmentPickupLocation: string | null
  equipmentPickupTime: string | null
  equipmentDropoffLocation: string | null
  equipmentDropoffTime: string | null
  specialNotes: string | null
  role: string | null
  confirmed: boolean
  ceremonyLocation: string | null
  receptionVenue: string | null
  startTime: string | null
  endTime: string | null
}

function formatWeddingDate(dateStr: string): string {
  const d = new Date(dateStr + 'T12:00:00')
  const days = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT']
  const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
  return `${days[d.getDay()]} ${months[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`
}

function formatCallTime(timeStr: string | null): string {
  if (!timeStr) return ''
  // Convert "9:30 AM" → "09:30", "2:00 PM" → "14:00"
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

function daysUntil(dateStr: string): number {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const target = new Date(dateStr + 'T12:00:00')
  target.setHours(0, 0, 0, 0)
  return Math.round((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
}

function mapsLink(location: string): string {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(location)}`
}

export default function CrewDashboard() {
  const [firstName, setFirstName] = useState<string>('')
  const [todayJobs, setTodayJobs] = useState<WeddingJob[]>([])
  const [upcomingJobs, setUpcomingJobs] = useState<WeddingJob[]>([])
  const [pastJobs, setPastJobs] = useState<WeddingJob[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const loadData = async () => {
      const { data: { user } } = await crewSupabase.auth.getUser()
      if (!user?.email) return

      // Get team member record
      const { data: members } = await crewSupabase
        .from('team_members')
        .select('id, first_name')
        .eq('email', user.email)
        .eq('is_active', true)
        .limit(1)

      if (!members || members.length === 0) return
      const member = members[0]
      setFirstName(member.first_name ?? '')

      // Get all assignments for this member with joined data
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      const past30 = new Date(today)
      past30.setDate(past30.getDate() - 30)
      const future30 = new Date(today)
      future30.setDate(future30.getDate() + 30)

      const { data: assignments } = await crewSupabase
        .from('crew_call_sheet_members')
        .select(`
          id, call_time, meeting_point, meeting_point_time,
          equipment_pickup_location, equipment_pickup_time,
          equipment_dropoff_location, equipment_dropoff_time,
          special_notes, role, confirmed,
          crew_call_sheets (
            couple_id,
            couples (
              id, bride_first_name, groom_first_name, wedding_date
            )
          )
        `)
        .eq('member_email', user.email)

      if (!assignments) {
        setLoading(false)
        return
      }

      // Get couple IDs to fetch contract info
      const coupleIds = assignments
        .map((a: any) => a.crew_call_sheets?.couples?.id)
        .filter(Boolean)

      let contractMap: Record<string, any> = {}
      if (coupleIds.length > 0) {
        const { data: contracts } = await crewSupabase
          .from('contracts')
          .select('couple_id, ceremony_location, reception_venue, start_time, end_time')
          .in('couple_id', coupleIds)

        if (contracts) {
          contracts.forEach((ct: any) => {
            contractMap[ct.couple_id] = ct
          })
        }
      }

      // Build wedding jobs
      const jobs: WeddingJob[] = assignments
        .filter((a: any) => a.crew_call_sheets?.couples?.wedding_date)
        .map((a: any) => {
          const couple = a.crew_call_sheets.couples
          const contract = contractMap[couple.id] ?? {}
          return {
            assignmentId: a.id,
            coupleId: couple.id,
            brideName: couple.bride_first_name ?? '',
            groomName: couple.groom_first_name ?? '',
            weddingDate: couple.wedding_date,
            callTime: a.call_time,
            meetingPoint: a.meeting_point,
            meetingPointTime: a.meeting_point_time,
            equipmentPickupLocation: a.equipment_pickup_location,
            equipmentPickupTime: a.equipment_pickup_time,
            equipmentDropoffLocation: a.equipment_dropoff_location,
            equipmentDropoffTime: a.equipment_dropoff_time,
            specialNotes: a.special_notes,
            role: a.role,
            confirmed: a.confirmed ?? false,
            ceremonyLocation: contract.ceremony_location ?? null,
            receptionVenue: contract.reception_venue ?? null,
            startTime: contract.start_time ?? null,
            endTime: contract.end_time ?? null,
          }
        })

      const todayStr = today.toISOString().split('T')[0]
      const past30Str = past30.toISOString().split('T')[0]
      const future30Str = future30.toISOString().split('T')[0]

      setTodayJobs(jobs.filter(j => j.weddingDate === todayStr))
      setUpcomingJobs(
        jobs
          .filter(j => j.weddingDate > todayStr && j.weddingDate <= future30Str)
          .sort((a, b) => a.weddingDate.localeCompare(b.weddingDate))
      )
      setPastJobs(
        jobs
          .filter(j => j.weddingDate < todayStr && j.weddingDate >= past30Str)
          .sort((a, b) => b.weddingDate.localeCompare(a.weddingDate))
      )

      setLoading(false)
    }

    loadData()
  }, [])

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-teal-600 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  const hasNothing = todayJobs.length === 0 && upcomingJobs.length === 0

  return (
    <div className="pb-8">
      {/* Greeting */}
      <div className="px-4 pt-5 pb-3">
        <h1 className="text-xl font-bold text-stone-900">
          Welcome back{firstName ? `, ${firstName}` : ''}
        </h1>
      </div>

      {/* Today's Wedding Banner(s) */}
      {todayJobs.map((job) => (
        <TodayBanner key={job.assignmentId} job={job} />
      ))}

      {/* Upcoming Weddings */}
      {upcomingJobs.length > 0 && (
        <div className="px-4 mt-6">
          <h2 className="text-sm font-semibold text-stone-500 uppercase tracking-wider mb-3">
            Upcoming Weddings
          </h2>
          <div className="space-y-3">
            {upcomingJobs.map((job) => (
              <UpcomingCard key={job.assignmentId} job={job} />
            ))}
          </div>
        </div>
      )}

      {/* Empty state */}
      {hasNothing && (
        <div className="px-4 mt-8 text-center">
          <Camera className="h-10 w-10 text-stone-300 mx-auto mb-3" />
          <p className="text-stone-500">No weddings scheduled. Enjoy your time off!</p>
        </div>
      )}

      {/* Past Weddings */}
      {pastJobs.length > 0 && (
        <div className="px-4 mt-8">
          <h2 className="text-sm font-semibold text-stone-500 uppercase tracking-wider mb-3">
            Past Weddings
          </h2>
          <div className="space-y-1">
            {pastJobs.map((job) => (
              <div key={job.assignmentId} className="flex items-center justify-between py-2 px-3 rounded-lg">
                <span className="text-sm text-stone-600">
                  {job.brideName} & {job.groomName} — {formatWeddingDate(job.weddingDate)}
                </span>
                <CheckCircle2 className="h-4 w-4 text-teal-600 flex-shrink-0" />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function TodayBanner({ job }: { job: WeddingJob }) {
  return (
    <div className="mx-4 mt-2 rounded-2xl border-2 border-teal-600 bg-gradient-to-br from-teal-50 to-amber-50 overflow-hidden">
      {/* Header */}
      <div className="bg-teal-700 px-5 py-3 flex items-center gap-2">
        <span className="text-lg">📸</span>
        <span className="text-sm font-bold text-white uppercase tracking-wider">Today's Wedding</span>
      </div>

      <div className="px-5 py-4 space-y-4">
        {/* Couple Name + Date */}
        <div>
          <h2
            className="text-2xl text-stone-900"
            style={{ fontFamily: "'Playfair Display', serif", fontWeight: 700 }}
          >
            {job.brideName} & {job.groomName}
          </h2>
          <p className="text-sm text-stone-600 mt-0.5">{formatWeddingDate(job.weddingDate)}</p>
          {job.role && (
            <span className="inline-block mt-1.5 text-xs font-semibold text-teal-800 bg-teal-100 rounded-full px-2.5 py-0.5">
              {job.role}
            </span>
          )}
        </div>

        {/* Key Info Grid */}
        <div className="space-y-2.5">
          {job.callTime && (
            <div className="flex items-start gap-3">
              <Clock className="h-4 w-4 text-teal-700 mt-0.5 flex-shrink-0" />
              <div>
                <span className="text-xs font-medium text-stone-500 uppercase">Your Call Time</span>
                <p className="text-base font-bold text-stone-900">{formatCallTime(job.callTime)}</p>
              </div>
            </div>
          )}

          {job.meetingPoint && (
            <div className="flex items-start gap-3">
              <MapPin className="h-4 w-4 text-teal-700 mt-0.5 flex-shrink-0" />
              <div>
                <span className="text-xs font-medium text-stone-500 uppercase">Meeting Point</span>
                <a
                  href={mapsLink(job.meetingPoint)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block text-sm font-semibold text-teal-700 underline underline-offset-2"
                >
                  {job.meetingPoint}
                  {job.meetingPointTime ? ` at ${formatCallTime(job.meetingPointTime)}` : ''}
                </a>
              </div>
            </div>
          )}

          {job.ceremonyLocation && (
            <div className="flex items-start gap-3">
              <Building2 className="h-4 w-4 text-teal-700 mt-0.5 flex-shrink-0" />
              <div>
                <span className="text-xs font-medium text-stone-500 uppercase">Ceremony</span>
                <a
                  href={mapsLink(job.ceremonyLocation)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block text-sm font-semibold text-teal-700 underline underline-offset-2"
                >
                  {job.ceremonyLocation}
                </a>
              </div>
            </div>
          )}

          {job.receptionVenue && (
            <div className="flex items-start gap-3">
              <PartyPopper className="h-4 w-4 text-teal-700 mt-0.5 flex-shrink-0" />
              <div>
                <span className="text-xs font-medium text-stone-500 uppercase">Reception</span>
                <a
                  href={mapsLink(job.receptionVenue)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block text-sm font-semibold text-teal-700 underline underline-offset-2"
                >
                  {job.receptionVenue}
                </a>
              </div>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex gap-2 pt-1">
          <a
            href={`/client/wedding-day-form/${job.coupleId}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex-1 flex items-center justify-center gap-2 bg-teal-700 text-white text-sm font-semibold rounded-xl py-2.5 hover:bg-teal-800 transition-colors"
          >
            📋 Wedding Day Form
          </a>
        </div>

        {/* Equipment Pickup */}
        {job.equipmentPickupLocation && (
          <div className="bg-white/60 rounded-xl p-3 border border-stone-200">
            <div className="flex items-start gap-2">
              <Truck className="h-4 w-4 text-stone-500 mt-0.5 flex-shrink-0" />
              <div>
                <span className="text-xs font-medium text-stone-500 uppercase">Equipment Pickup</span>
                <p className="text-sm font-semibold text-stone-800">
                  {job.equipmentPickupTime ? `${formatCallTime(job.equipmentPickupTime)} at ` : ''}
                  <a
                    href={mapsLink(job.equipmentPickupLocation)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-teal-700 underline underline-offset-2"
                  >
                    {job.equipmentPickupLocation}
                  </a>
                </p>
              </div>
            </div>
            {job.equipmentDropoffLocation && (
              <div className="flex items-start gap-2 mt-2">
                <Truck className="h-4 w-4 text-stone-500 mt-0.5 flex-shrink-0 rotate-180" />
                <div>
                  <span className="text-xs font-medium text-stone-500 uppercase">Equipment Dropoff</span>
                  <p className="text-sm font-semibold text-stone-800">
                    {job.equipmentDropoffTime ? `${formatCallTime(job.equipmentDropoffTime)} at ` : ''}
                    <a
                      href={mapsLink(job.equipmentDropoffLocation)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-teal-700 underline underline-offset-2"
                    >
                      {job.equipmentDropoffLocation}
                    </a>
                  </p>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Special Notes */}
        {job.specialNotes && (
          <div className="bg-amber-50 rounded-xl p-3 border border-amber-200">
            <div className="flex items-start gap-2">
              <StickyNote className="h-4 w-4 text-amber-600 mt-0.5 flex-shrink-0" />
              <div>
                <span className="text-xs font-medium text-amber-700 uppercase">Notes</span>
                <p className="text-sm text-stone-800">{job.specialNotes}</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function UpcomingCard({ job }: { job: WeddingJob }) {
  const days = daysUntil(job.weddingDate)

  return (
    <Link href={`/crew/wedding/${job.coupleId}`} className="block bg-white rounded-xl border border-stone-200 shadow-sm p-4 cursor-pointer hover:border-teal-300 hover:shadow-md transition-all">
      {/* Top row: Names + countdown */}
      <div className="flex items-start justify-between mb-1">
        <h3 className="font-bold text-stone-900">
          {job.brideName} & {job.groomName}
        </h3>
        <span className="text-xs font-semibold text-teal-700 bg-teal-50 rounded-full px-2 py-0.5 flex-shrink-0 ml-2">
          in {days} day{days !== 1 ? 's' : ''}
        </span>
      </div>

      {/* Date */}
      <p className="text-sm text-stone-500 mb-2">{formatWeddingDate(job.weddingDate)}</p>

      {/* Info row */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-stone-600">
        {job.callTime && (
          <span className="flex items-center gap-1">
            <Clock className="h-3.5 w-3.5 text-teal-600" />
            {formatCallTime(job.callTime)}
          </span>
        )}
        {job.meetingPoint && (
          <a
            href={mapsLink(job.meetingPoint)}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 text-teal-700 underline underline-offset-2"
            onClick={(e) => e.stopPropagation()}
          >
            <MapPin className="h-3.5 w-3.5" />
            {job.meetingPoint}
          </a>
        )}
      </div>

      {/* Venues */}
      {(job.ceremonyLocation ?? job.receptionVenue) && (
        <p className="text-xs text-stone-400 mt-1.5 flex items-center gap-1">
          <Building2 className="h-3 w-3" />
          {job.ceremonyLocation}
          {job.ceremonyLocation && job.receptionVenue && job.ceremonyLocation !== job.receptionVenue
            ? ` → ${job.receptionVenue}`
            : ''
          }
          {!job.ceremonyLocation && job.receptionVenue ? job.receptionVenue : ''}
        </p>
      )}
    </Link>
  )
}
