'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { crewSupabase } from '@/lib/supabase-crew'
import { ArrowLeft, MapPin, Clock, Building2, PartyPopper, Package, StickyNote, ExternalLink } from 'lucide-react'

interface WeddingDetail {
  brideName: string
  groomName: string
  weddingDate: string
  role: string | null
  callTime: string | null
  meetingPoint: string | null
  meetingPointTime: string | null
  equipmentPickupLocation: string | null
  equipmentPickupTime: string | null
  equipmentDropoffLocation: string | null
  equipmentDropoffTime: string | null
  specialNotes: string | null
  confirmed: boolean
  ceremonyLocation: string | null
  receptionVenue: string | null
  startTime: string | null
  endTime: string | null
  coupleId: string
}

function formatWeddingDate(dateStr: string): string {
  const d = new Date(dateStr + 'T12:00:00')
  const days = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT']
  const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
  return `${days[d.getDay()]} ${months[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`
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

function mapsLink(location: string): string {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(location)}`
}

export default function CrewWeddingDetail() {
  const params = useParams()
  const coupleId = params.coupleId as string
  const [detail, setDetail] = useState<WeddingDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [notAssigned, setNotAssigned] = useState(false)

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await crewSupabase.auth.getUser()
      if (!user?.email) return

      // Find assignment for this crew member + this couple
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
        setNotAssigned(true)
        setLoading(false)
        return
      }

      // Find the assignment matching this coupleId
      const match = assignments.find((a: any) =>
        a.crew_call_sheets?.couples?.id === coupleId
      )

      if (!match) {
        setNotAssigned(true)
        setLoading(false)
        return
      }

      const couple = (match as any).crew_call_sheets.couples

      // Fetch contract info
      const { data: contracts } = await crewSupabase
        .from('contracts')
        .select('ceremony_location, reception_venue, start_time, end_time')
        .eq('couple_id', coupleId)
        .limit(1)

      const contract = contracts?.[0] ?? {}

      setDetail({
        brideName: couple.bride_first_name ?? '',
        groomName: couple.groom_first_name ?? '',
        weddingDate: couple.wedding_date,
        role: match.role,
        callTime: match.call_time,
        meetingPoint: match.meeting_point,
        meetingPointTime: match.meeting_point_time,
        equipmentPickupLocation: match.equipment_pickup_location,
        equipmentPickupTime: match.equipment_pickup_time,
        equipmentDropoffLocation: match.equipment_dropoff_location,
        equipmentDropoffTime: match.equipment_dropoff_time,
        specialNotes: match.special_notes,
        confirmed: match.confirmed ?? false,
        ceremonyLocation: (contract as any).ceremony_location ?? null,
        receptionVenue: (contract as any).reception_venue ?? null,
        startTime: (contract as any).start_time ?? null,
        endTime: (contract as any).end_time ?? null,
        coupleId,
      })

      setLoading(false)
    }

    load()
  }, [coupleId])

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-teal-600 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (notAssigned || !detail) {
    return (
      <div className="px-4 pt-6">
        <Link href="/crew/dashboard" className="flex items-center gap-1.5 text-sm text-teal-700 mb-6">
          <ArrowLeft className="h-4 w-4" /> Back to Dashboard
        </Link>
        <div className="text-center py-12">
          <p className="text-stone-500">You're not assigned to this wedding.</p>
        </div>
      </div>
    )
  }

  const hasEquipment = detail.equipmentPickupLocation ?? detail.equipmentDropoffLocation
  const hasVenues = detail.ceremonyLocation ?? detail.receptionVenue

  return (
    <div className="pb-8">
      {/* Back link */}
      <div className="px-4 pt-4 pb-2">
        <Link href="/crew/dashboard" className="flex items-center gap-1.5 text-sm text-teal-700 font-medium">
          <ArrowLeft className="h-4 w-4" /> Back to Dashboard
        </Link>
      </div>

      {/* Header */}
      <div className="px-4 pb-4">
        <h1
          className="text-2xl text-stone-900"
          style={{ fontFamily: "'Playfair Display', serif", fontWeight: 700 }}
        >
          {detail.brideName} & {detail.groomName}
        </h1>
        <p className="text-sm text-stone-500 mt-0.5">{formatWeddingDate(detail.weddingDate)}</p>
      </div>

      <div className="px-4 space-y-3">
        {/* YOUR ASSIGNMENT */}
        <Section icon={<Clock className="h-4 w-4" />} title="Your Assignment">
          <div className="space-y-3">
            {detail.role && (
              <InfoRow label="Role">
                <span className="inline-block text-xs font-semibold text-teal-800 bg-teal-100 rounded-full px-2.5 py-0.5">
                  {detail.role}
                </span>
              </InfoRow>
            )}
            {detail.callTime && (
              <InfoRow label="Call Time">
                <span className="text-lg font-bold text-stone-900">{formatTime(detail.callTime)}</span>
              </InfoRow>
            )}
            {detail.meetingPoint && (
              <div>
                <div className="flex items-center gap-1.5 mb-0.5">
                  <MapPin className="h-3.5 w-3.5 text-teal-600" />
                  <span className="text-xs font-medium text-stone-500 uppercase">Meeting Point</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold text-stone-800">{detail.meetingPoint}</span>
                  <a
                    href={mapsLink(detail.meetingPoint)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 text-xs font-medium text-teal-700"
                  >
                    Open Maps <ExternalLink className="h-3 w-3" />
                  </a>
                </div>
                {detail.meetingPointTime && (
                  <p className="text-xs text-stone-500 mt-0.5">Meet at: {formatTime(detail.meetingPointTime)}</p>
                )}
              </div>
            )}
          </div>
        </Section>

        {/* VENUES */}
        {hasVenues && (
          <Section icon={<Building2 className="h-4 w-4" />} title="Venues">
            <div className="space-y-3">
              {detail.ceremonyLocation && (
                <VenueRow
                  label="Ceremony"
                  name={detail.ceremonyLocation}
                  time={detail.startTime}
                />
              )}
              {detail.receptionVenue && (
                <VenueRow
                  label="Reception"
                  name={detail.receptionVenue}
                  time={detail.endTime ? `Ends ${formatTime(detail.endTime)}` : null}
                />
              )}
            </div>
          </Section>
        )}

        {/* EQUIPMENT */}
        {hasEquipment && (
          <Section icon={<Package className="h-4 w-4" />} title="Equipment">
            <div className="space-y-3">
              {detail.equipmentPickupLocation && (
                <div>
                  <span className="text-xs font-medium text-stone-500 uppercase">Pickup</span>
                  <div className="flex items-center justify-between mt-0.5">
                    <span className="text-sm font-semibold text-stone-800">
                      {detail.equipmentPickupTime ? `${formatTime(detail.equipmentPickupTime)} — ` : ''}
                      {detail.equipmentPickupLocation}
                    </span>
                    <a
                      href={mapsLink(detail.equipmentPickupLocation)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1 text-xs font-medium text-teal-700"
                    >
                      Maps <ExternalLink className="h-3 w-3" />
                    </a>
                  </div>
                </div>
              )}
              {detail.equipmentDropoffLocation && (
                <div>
                  <span className="text-xs font-medium text-stone-500 uppercase">Dropoff</span>
                  <div className="flex items-center justify-between mt-0.5">
                    <span className="text-sm font-semibold text-stone-800">
                      {detail.equipmentDropoffTime ? `${formatTime(detail.equipmentDropoffTime)} — ` : ''}
                      {detail.equipmentDropoffLocation}
                    </span>
                    <a
                      href={mapsLink(detail.equipmentDropoffLocation)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1 text-xs font-medium text-teal-700"
                    >
                      Maps <ExternalLink className="h-3 w-3" />
                    </a>
                  </div>
                </div>
              )}
            </div>
          </Section>
        )}

        {/* NOTES */}
        {detail.specialNotes && (
          <Section icon={<StickyNote className="h-4 w-4" />} title="Notes">
            <p className="text-sm text-stone-700 whitespace-pre-wrap">{detail.specialNotes}</p>
          </Section>
        )}

        {/* Wedding Day Form Button */}
        <div className="pt-2">
          <a
            href={`/client/wedding-day-form/${detail.coupleId}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 w-full bg-teal-700 text-white text-sm font-semibold rounded-xl py-3 hover:bg-teal-800 transition-colors"
          >
            📋 Wedding Day Form
          </a>
        </div>
      </div>
    </div>
  )
}

function Section({ icon, title, children }: { icon: React.ReactNode; title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-xl border border-stone-200 shadow-sm overflow-hidden">
      <div className="flex items-center gap-2 px-4 py-2.5 border-b border-stone-100 bg-stone-50">
        <span className="text-teal-700">{icon}</span>
        <h2 className="text-xs font-bold text-stone-600 uppercase tracking-wider">{title}</h2>
      </div>
      <div className="px-4 py-3">{children}</div>
    </div>
  )
}

function InfoRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <span className="text-xs font-medium text-stone-500 uppercase">{label}</span>
      <div className="mt-0.5">{children}</div>
    </div>
  )
}

function VenueRow({ label, name, time }: { label: string; name: string; time: string | null }) {
  return (
    <div>
      <span className="text-xs font-medium text-stone-500 uppercase">{label}</span>
      <div className="flex items-center justify-between mt-0.5">
        <span className="text-sm font-semibold text-stone-800">{name}</span>
        <a
          href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(name)}`}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1 text-xs font-medium text-teal-700"
        >
          Open Maps <ExternalLink className="h-3 w-3" />
        </a>
      </div>
      {time && <p className="text-xs text-stone-500 mt-0.5">{time}</p>}
    </div>
  )
}
