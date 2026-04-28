'use client'

import { useState, useEffect, useMemo, useCallback, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import { buildCrewEmailHtml } from '@/lib/crew-email-html'
import { Send, X, ChevronDown, ChevronRight, Plus, Eye, Check, Clock, Mail, Upload, FileText, Trash2, Download, ExternalLink } from 'lucide-react'
import { Playfair_Display, Nunito } from 'next/font/google'
import { format } from 'date-fns'
import { formatPackage, formatMilitaryTime } from '@/lib/formatters'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectSeparator, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'

const playfair = Playfair_Display({ subsets: ['latin'], weight: ['700'] })
const nunito = Nunito({ subsets: ['latin'], weight: ['400', '600', '700'] })

// ── Types ────────────────────────────────────────────────────────

interface Couple {
  id: string
  couple_name: string
  wedding_date: string | null
  park_location: string | null
  package_type: string | null
}

interface Contract {
  couple_id: string
  ceremony_location: string | null
  reception_venue: string | null
  start_time: string | null
  end_time: string | null
  num_photographers: number | null
  num_videographers: number | null
  day_of_week: string | null
}

interface Assignment {
  couple_id: string
  photo_1: string | null
  photo_2: string | null
  video_1: string | null
}

interface TeamMember {
  id: string
  first_name: string
  last_name: string | null
  email: string | null
  status: string
}

interface Milestone {
  couple_id: string
  m15_day_form_approved: boolean | null
}

interface CrewEntry {
  team_member_id: string
  member_name: string
  member_email: string
  role: string
  checked: boolean
  call_time: string
  meeting_location: string
  special_notes: string
}

interface HistorySheet {
  id: string
  sent_at: string
  notes: string | null
  members: { member_name: string; role: string; confirmed: boolean; email_sent: boolean }[]
}

interface UploadedDoc {
  name: string
  path: string
  uploaded_at: string
  attachToEmail: boolean
}

interface WeatherData {
  high: number | null
  low: number | null
  precipitation: number | null
  sunrise: string | null
  sunset: string | null
  available: boolean
}

interface ScheduleEvent {
  time: string
  label: string
  address: string
  maps_url: string
}

interface WeddingLocation {
  label: string
  venue: string
  time: string
}

interface ConfirmationStatus {
  team_member_id: string
  confirmed: boolean
  confirmed_at: string | null
  email_sent: boolean
  email_sent_at: string | null
}

interface MeetingPoint {
  id: string
  name: string
  address: string
  maps_url: string | null
  usual_for: string | null
  is_active: boolean
}

// ── Time Helpers ──────────────────────────────────────────────────

function parseTimeStr(t: string): number | null {
  if (!t) return null
  const match12 = t.match(/(\d+):(\d+)\s*(AM|PM)/i)
  if (match12) {
    let h = parseInt(match12[1])
    const m = parseInt(match12[2])
    const ampm = match12[3].toUpperCase()
    if (ampm === 'PM' && h !== 12) h += 12
    if (ampm === 'AM' && h === 12) h = 0
    return h * 60 + m
  }
  const match24 = t.match(/^(\d{1,2}):(\d{2})$/)
  if (match24) {
    return parseInt(match24[1]) * 60 + parseInt(match24[2])
  }
  const matchShort = t.match(/^(\d{1,2})\s*(am|pm)$/i)
  if (matchShort) {
    let h = parseInt(matchShort[1])
    const ampm = matchShort[2].toUpperCase()
    if (ampm === 'PM' && h !== 12) h += 12
    if (ampm === 'AM' && h === 12) h = 0
    return h * 60
  }
  return null
}

function minutesToTimeStr(mins: number): string {
  while (mins < 0) mins += 24 * 60
  const h = Math.floor(mins / 60) % 24
  const m = mins % 60
  if (h === 0 && m === 0) return '00:00 (Midnight)'
  if (h === 12 && m === 0) return '12:00 (Noon)'
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`
}

/** Convert any time string to HH:MM format for <input type="time"> */
function toHHMM(t: string): string {
  const mins = parseTimeStr(t)
  if (mins === null) return ''
  const h = Math.floor(mins / 60) % 24
  const m = mins % 60
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`
}

/** Convert HH:MM from <input type="time"> back to display format */
function fromHHMM(hhmm: string): string {
  if (!hhmm) return ''
  const [h, m] = hhmm.split(':').map(Number)
  if (isNaN(h) || isNaN(m)) return ''
  return minutesToTimeStr(h * 60 + m)
}

function mapsUrl(address: string): string {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`
}

// ── Component ────────────────────────────────────────────────────

export default function CrewCallSheetPage() {
  const [couples, setCouples] = useState<Couple[]>([])
  const [contracts, setContracts] = useState<Contract[]>([])
  const [assignments, setAssignments] = useState<Assignment[]>([])
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([])
  const [milestones, setMilestones] = useState<Milestone[]>([])
  const [meetingPoints, setMeetingPoints] = useState<MeetingPoint[]>([])
  const [selectedCoupleId, setSelectedCoupleId] = useState<string>('')
  const [crewEntries, setCrewEntries] = useState<CrewEntry[]>([])
  const [generalNotes, setGeneralNotes] = useState('')
  const [equipmentNotes, setEquipmentNotes] = useState('')
  const [dressCode, setDressCode] = useState('')
  const [bridesmaids, setBridesmaids] = useState('')
  const [groomsmen, setGroomsmen] = useState('')
  const [vendors, setVendors] = useState<Record<string, string>>({ dj_mc: '', florist: '', makeup: '', hair: '', planner: '', transport: '' })
  const [keyMoments, setKeyMoments] = useState('')
  const [weather, setWeather] = useState<WeatherData>({ high: null, low: null, precipitation: null, sunrise: null, sunset: null, available: false })
  const [weatherLoading, setWeatherLoading] = useState(false)
  const [schedule, setSchedule] = useState<ScheduleEvent[]>([])
  const [weddingLocations, setWeddingLocations] = useState<WeddingLocation[]>([])
  const [uploadedDocs, setUploadedDocs] = useState<UploadedDoc[]>([])
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState('')
  const [sending, setSending] = useState(false)
  const [sentTimestamp, setSentTimestamp] = useState<string | null>(null)
  const [showPreview, setShowPreview] = useState(false)
  const [previewTab, setPreviewTab] = useState(0)
  const [history, setHistory] = useState<HistorySheet[]>([])
  const [showHistory, setShowHistory] = useState(false)
  const [otherLocationMode, setOtherLocationMode] = useState<Set<string>>(new Set())
  const [showAddCrew, setShowAddCrew] = useState(false)
  const [showVendors, setShowVendors] = useState(false)
  const [sendError, setSendError] = useState('')
  const [confirmationStatuses, setConfirmationStatuses] = useState<ConfirmationStatus[]>([])
  const [loading, setLoading] = useState(true)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // ── Fetch data ─────────────────────────────────────────────────

  const fetchData = useCallback(async () => {
    setLoading(true)
    const today = new Date().toISOString().split('T')[0]

    const [couplesRes, contractsRes, assignmentsRes, membersRes, milestonesRes, mpRes] = await Promise.all([
      supabase.from('couples').select('id, couple_name, wedding_date, park_location, package_type')
        .gte('wedding_date', today).order('wedding_date', { ascending: true }),
      supabase.from('contracts').select('couple_id, ceremony_location, reception_venue, start_time, end_time, num_photographers, num_videographers, day_of_week'),
      supabase.from('wedding_assignments').select('couple_id, photo_1, photo_2, video_1'),
      supabase.from('team_members').select('id, first_name, last_name, email, status').in('status', ['active', 'probationary']),
      supabase.from('couple_milestones').select('couple_id, m15_day_form_approved'),
      supabase.from('meeting_points').select('*').eq('is_active', true).order('name'),
    ])

    if (couplesRes.data) setCouples(couplesRes.data)
    if (contractsRes.data) setContracts(contractsRes.data)
    if (assignmentsRes.data) setAssignments(assignmentsRes.data)
    if (membersRes.data) setTeamMembers(membersRes.data)
    if (milestonesRes.data) setMilestones(milestonesRes.data)
    if (mpRes.data) setMeetingPoints(mpRes.data)
    setLoading(false)
  }, [])

  useEffect(() => { fetchData() }, [fetchData])

  // ── Derived data for selected couple ───────────────────────────

  const selectedCouple = useMemo(() => couples.find(c => c.id === selectedCoupleId) || null, [couples, selectedCoupleId])
  const selectedContract = useMemo(() => contracts.find(c => c.couple_id === selectedCoupleId) || null, [contracts, selectedCoupleId])
  const selectedAssignment = useMemo(() => assignments.find(a => a.couple_id === selectedCoupleId) || null, [assignments, selectedCoupleId])
  const selectedMilestone = useMemo(() => milestones.find(m => m.couple_id === selectedCoupleId) || null, [milestones, selectedCoupleId])

  // ── Fetch weather for selected couple ──────────────────────────

  const fetchWeather = useCallback(async (weddingDate: string) => {
    setWeatherLoading(true)
    setWeather({ high: null, low: null, precipitation: null, sunrise: null, sunset: null, available: false })

    const wDate = new Date(weddingDate + 'T12:00:00')
    const now = new Date()
    const diffDays = Math.ceil((wDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
    if (diffDays > 7 || diffDays < 0) {
      setWeatherLoading(false)
      return
    }

    try {
      const lat = 43.6532, lng = -79.3832

      const weatherRes = await fetch(
        `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&daily=temperature_2m_max,temperature_2m_min,precipitation_probability_max,sunrise,sunset&timezone=America/Toronto&start_date=${weddingDate}&end_date=${weddingDate}`
      )
      const weatherData = await weatherRes.json()
      if (weatherData.daily) {
        const d = weatherData.daily
        setWeather({
          high: d.temperature_2m_max?.[0] ?? null, low: d.temperature_2m_min?.[0] ?? null,
          precipitation: d.precipitation_probability_max?.[0] ?? null,
          sunrise: d.sunrise?.[0] ? format(new Date(d.sunrise[0]), 'h:mm a') : null,
          sunset: d.sunset?.[0] ? format(new Date(d.sunset[0]), 'h:mm a') : null,
          available: true,
        })
      }
    } catch { /* weather unavailable */ }
    setWeatherLoading(false)
  }, [])

  // ── Fetch wedding day form data ────────────────────────────────

  const fetchWeddingDayForm = useCallback(async (coupleId: string) => {
    const { data } = await supabase
      .from('wedding_day_forms')
      .select('bridal_party_count, vendor_dj_mc, vendor_floral, vendor_makeup, vendor_hair, vendor_wedding_planner, vendor_transportation, groom_start_time, groom_address, bride_start_time, bride_address, ceremony_start_time, ceremony_address, ceremony_location_name, park_start_time, park_address, park_name, reception_start_time, reception_address, reception_venue_name, photo_video_end_time, first_look_time, first_look_address, has_first_look')
      .eq('couple_id', coupleId)
      .limit(1)

    if (data?.[0]) {
      const form = data[0]
      if (form.bridal_party_count) {
        const bpc = String(form.bridal_party_count)
        const parts = bpc.split('+')
        if (parts.length === 2) { setBridesmaids(parts[0].trim()); setGroomsmen(parts[1].trim()) }
      }
      setVendors({
        dj_mc: form.vendor_dj_mc || '', florist: form.vendor_floral || '',
        makeup: form.vendor_makeup || '', hair: form.vendor_hair || '',
        planner: form.vendor_wedding_planner || '', transport: form.vendor_transportation || '',
      })

      // Build schedule events — order depends on First Look
      const fmtTime = (t: string) => { const m = parseTimeStr(t); return m !== null ? minutesToTimeStr(m) : t }

      const groomEvt = (form.groom_start_time && form.groom_address)
        ? { time: fmtTime(form.groom_start_time), label: 'Groom Prep', address: form.groom_address, maps_url: mapsUrl(form.groom_address) } : null
      const brideEvt = (form.bride_start_time && form.bride_address)
        ? { time: fmtTime(form.bride_start_time), label: 'Bride Prep', address: form.bride_address, maps_url: mapsUrl(form.bride_address) } : null
      const firstLookEvt = (form.has_first_look && form.first_look_time && form.first_look_address)
        ? { time: fmtTime(form.first_look_time), label: 'First Look', address: form.first_look_address, maps_url: mapsUrl(form.first_look_address) } : null
      const ceremonyEvt = form.ceremony_start_time
        ? { time: fmtTime(form.ceremony_start_time), label: 'Ceremony', address: [form.ceremony_location_name, form.ceremony_address].filter(Boolean).join(', '), maps_url: mapsUrl(form.ceremony_address || form.ceremony_location_name || '') } : null
      const parkEvt = form.park_start_time
        ? { time: fmtTime(form.park_start_time), label: 'Park Photos', address: [form.park_name, form.park_address].filter(Boolean).join(', '), maps_url: mapsUrl(form.park_address || form.park_name || '') } : null
      const receptionEvt = form.reception_start_time
        ? { time: fmtTime(form.reception_start_time), label: 'Reception', address: [form.reception_venue_name, form.reception_address].filter(Boolean).join(', '), maps_url: mapsUrl(form.reception_address || form.reception_venue_name || '') } : null
      const endEvt = form.photo_video_end_time
        ? { time: fmtTime(form.photo_video_end_time), label: 'Photo/Video Concludes', address: '', maps_url: '' } : null

      const events: ScheduleEvent[] = []
      if (groomEvt) events.push(groomEvt)
      if (brideEvt) events.push(brideEvt)

      if (form.has_first_look) {
        // First Look order: First Look → Park → Ceremony
        if (firstLookEvt) events.push(firstLookEvt)
        if (parkEvt) events.push(parkEvt)
        if (ceremonyEvt) events.push(ceremonyEvt)
      } else {
        // Default order: Ceremony → Park
        if (ceremonyEvt) events.push(ceremonyEvt)
        if (parkEvt) events.push(parkEvt)
      }

      if (receptionEvt) events.push(receptionEvt)
      if (endEvt) events.push(endEvt)

      setSchedule(events)

      // Build locations list — always show all entries with TBD fallback
      const to24 = (t: string | null) => {
        if (!t) return 'TBD'
        const mins = parseTimeStr(t)
        if (mins === null) return 'TBD'
        const h = Math.floor(mins / 60) % 24
        const m = mins % 60
        return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`
      }
      const locs: WeddingLocation[] = [
        { label: 'Groom Prep', venue: form.groom_address || 'TBD', time: to24(form.groom_start_time) },
        { label: 'Bride Prep', venue: form.bride_address || 'TBD', time: to24(form.bride_start_time) },
      ]
      if (form.has_first_look) {
        locs.push({ label: 'First Look', venue: form.first_look_address || 'TBD', time: to24(form.first_look_time) })
        locs.push({ label: 'Park/Formals', venue: [form.park_name, form.park_address].filter(Boolean).join(', ') || 'TBD', time: to24(form.park_start_time) })
        locs.push({ label: 'Ceremony', venue: [form.ceremony_location_name, form.ceremony_address].filter(Boolean).join(', ') || 'TBD', time: to24(form.ceremony_start_time) })
      } else {
        locs.push({ label: 'Ceremony', venue: [form.ceremony_location_name, form.ceremony_address].filter(Boolean).join(', ') || 'TBD', time: to24(form.ceremony_start_time) })
        locs.push({ label: 'Park/Formals', venue: [form.park_name, form.park_address].filter(Boolean).join(', ') || 'TBD', time: to24(form.park_start_time) })
      }
      locs.push({ label: 'Reception', venue: [form.reception_venue_name, form.reception_address].filter(Boolean).join(', ') || 'TBD', time: to24(form.reception_start_time) })
      setWeddingLocations(locs)
    } else {
      setSchedule([])
      setWeddingLocations([])
    }
  }, [])

  // ── Fetch uploaded docs for couple ─────────────────────────────

  const fetchUploadedDocs = useCallback(async (coupleId: string) => {
    try {
      const { data: files, error } = await supabase.storage.from('wedding-documents').list(coupleId)
      if (error) { setUploadedDocs([]); return }
      if (files?.length) {
        setUploadedDocs(files.filter(f => f.name !== '.emptyFolderPlaceholder').map(f => ({
          name: f.name, path: `${coupleId}/${f.name}`,
          uploaded_at: f.created_at || '', attachToEmail: true,
        })))
      } else {
        setUploadedDocs([])
      }
    } catch { setUploadedDocs([]) }
  }, [])

  // ── Build crew entries when couple changes ─────────────────────

  useEffect(() => {
    if (!selectedCoupleId || !selectedAssignment) {
      setCrewEntries([]); setSentTimestamp(null); setHistory([]); setConfirmationStatuses([]); setSendError('')
      setDressCode(''); setBridesmaids(''); setGroomsmen('')
      setVendors({ dj_mc: '', florist: '', makeup: '', hair: '', planner: '', transport: '' })
      setKeyMoments(''); setEquipmentNotes('')
      setWeather({ high: null, low: null, precipitation: null, sunrise: null, sunset: null, available: false })
      setSchedule([]); setWeddingLocations([])
      setUploadedDocs([]); setUploadError('')
      return
    }

    const contract = contracts.find(c => c.couple_id === selectedCoupleId)
    const couple = couples.find(c => c.id === selectedCoupleId)

    const startMins = contract?.start_time ? parseTimeStr(contract.start_time) : null
    const defaultCallTime = startMins !== null ? minutesToTimeStr(startMins - 60) : ''

    const entries: CrewEntry[] = []
    const addEntry = (name: string | null, role: string) => {
      if (!name) return
      const member = teamMembers.find(m => m.first_name === name)
      if (!member) return
      // Auto-select meeting point if usual_for matches crew member's first name
      const usualMp = meetingPoints.find(mp => mp.usual_for && mp.usual_for.toLowerCase() === name.toLowerCase())
      entries.push({
        team_member_id: member.id,
        member_name: `${member.first_name} ${member.last_name || ''}`.trim(),
        member_email: member.email || '', role, checked: true,
        call_time: defaultCallTime,
        meeting_location: usualMp ? usualMp.name : '',
        special_notes: '',
      })
    }

    addEntry(selectedAssignment.photo_1, 'Lead Photographer')
    addEntry(selectedAssignment.photo_2, '2nd Photographer')
    addEntry(selectedAssignment.video_1, 'Videographer')
    setCrewEntries(entries)

    setSentTimestamp(null); setSendError('')
    fetchHistory(selectedCoupleId)
    fetchConfirmationStatuses(selectedCoupleId)
    fetchUploadedDocs(selectedCoupleId)
    fetchWeddingDayForm(selectedCoupleId)

    if (couple?.wedding_date) {
      fetchWeather(couple.wedding_date)
    }

  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedCoupleId, selectedAssignment, teamMembers])

  const fetchHistory = async (coupleId: string) => {
    const { data: sheets } = await supabase.from('crew_call_sheets')
      .select('id, sent_at, notes').eq('couple_id', coupleId).order('sent_at', { ascending: false })
    if (!sheets?.length) { setHistory([]); return }
    const sheetIds = sheets.map(s => s.id)
    const { data: members } = await supabase.from('crew_call_sheet_members')
      .select('call_sheet_id, member_name, role, confirmed, email_sent').in('call_sheet_id', sheetIds)
    setHistory(sheets.map(s => ({
      id: s.id, sent_at: s.sent_at, notes: s.notes,
      members: (members || []).filter(m => m.call_sheet_id === s.id).map(m => ({
        member_name: m.member_name, role: m.role, confirmed: m.confirmed, email_sent: m.email_sent,
      })),
    })))
  }

  const fetchConfirmationStatuses = async (coupleId: string) => {
    // Get the most recent call sheet for this couple
    const { data: sheets } = await supabase.from('crew_call_sheets')
      .select('id').eq('couple_id', coupleId).order('sent_at', { ascending: false }).limit(1)
    if (!sheets?.length) { setConfirmationStatuses([]); return }
    const { data: members } = await supabase.from('crew_call_sheet_members')
      .select('team_member_id, confirmed, confirmed_at, email_sent, email_sent_at')
      .eq('call_sheet_id', sheets[0].id)
    setConfirmationStatuses((members || []).map(m => ({
      team_member_id: m.team_member_id,
      confirmed: m.confirmed || false,
      confirmed_at: m.confirmed_at,
      email_sent: m.email_sent || false,
      email_sent_at: m.email_sent_at,
    })))
  }

  // ── Crew entry updates ─────────────────────────────────────────

  const updateEntry = (idx: number, field: keyof CrewEntry, value: any) => {
    setCrewEntries(prev => prev.map((e, i) => i === idx ? { ...e, [field]: value } : e))
  }

  const addCrewMember = (member: TeamMember) => {
    if (crewEntries.some(e => e.team_member_id === member.id)) return
    const contract = contracts.find(c => c.couple_id === selectedCoupleId)
    const startMins = contract?.start_time ? parseTimeStr(contract.start_time) : null
    const defaultCallTime = startMins !== null ? minutesToTimeStr(startMins - 60) : ''
    const usualMp = meetingPoints.find(mp => mp.usual_for && mp.usual_for.toLowerCase() === member.first_name.toLowerCase())
    setCrewEntries(prev => [...prev, {
      team_member_id: member.id,
      member_name: `${member.first_name} ${member.last_name || ''}`.trim(),
      member_email: member.email || '', role: '2nd Photographer', checked: true,
      call_time: defaultCallTime,
      meeting_location: usualMp ? usualMp.name : '',
      special_notes: '',
    }])
    setShowAddCrew(false)
  }

  const removeCrew = (idx: number) => {
    setCrewEntries(prev => prev.filter((_, i) => i !== idx))
  }

  // ── File upload handler ────────────────────────────────────────

  const handleFileUpload = async (files: FileList | null) => {
    if (!files?.length || !selectedCoupleId) return
    setUploading(true)
    setUploadError('')

    for (const file of Array.from(files)) {
      const path = `${selectedCoupleId}/${file.name}`
      const { error } = await supabase.storage.from('wedding-documents').upload(path, file, { upsert: true })
      if (error) {
        console.error('Upload error:', error)
        setUploadError(`Upload failed: ${error.message}`)
      } else {
        setUploadedDocs(prev => {
          const exists = prev.some(d => d.name === file.name)
          if (exists) return prev
          return [...prev, { name: file.name, path, uploaded_at: new Date().toISOString(), attachToEmail: true }]
        })
      }
    }
    setUploading(false)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const handleDeleteDoc = async (doc: UploadedDoc) => {
    await supabase.storage.from('wedding-documents').remove([doc.path])
    setUploadedDocs(prev => prev.filter(d => d.path !== doc.path))
  }

  const handleDownloadDoc = async (doc: UploadedDoc) => {
    const { data } = await supabase.storage.from('wedding-documents').download(doc.path)
    if (data) {
      const url = URL.createObjectURL(data)
      const a = document.createElement('a')
      a.href = url; a.download = doc.name; a.click(); URL.revokeObjectURL(url)
    }
  }

  const handleViewDoc = async (doc: UploadedDoc) => {
    const { data } = await supabase.storage.from('wedding-documents').createSignedUrl(doc.path, 3600)
    if (data?.signedUrl) window.open(data.signedUrl, '_blank')
  }

  // ── Send handler ───────────────────────────────────────────────

  const handleSend = async () => {
    if (!selectedCouple) return
    const checkedCrew = crewEntries.filter(e => e.checked)
    if (!checkedCrew.length) return

    const weatherStr = weather.available
      ? `High ${weather.high}°C / Low ${weather.low}°C | ${weather.precipitation}% rain | Sunrise ${weather.sunrise} | Sunset ${weather.sunset}`
      : ''

    setSending(true)
    setSendError('')
    try {
      const res = await fetch('/api/admin/crew-call-sheet', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          couple_id: selectedCouple.id, couple_name: selectedCouple.couple_name,
          wedding_date: selectedCouple.wedding_date,
          day_of_week: selectedContract?.day_of_week || (selectedCouple.wedding_date ? format(new Date(selectedCouple.wedding_date + 'T12:00:00'), 'EEEE') : ''),
          ceremony_location: selectedContract?.ceremony_location || '',
          reception_venue: selectedContract?.reception_venue || '',
          park_location: selectedCouple.park_location || '',
          start_time: selectedContract?.start_time || '', end_time: selectedContract?.end_time || '',
          package_type: selectedCouple.package_type || '', notes: generalNotes,
          equipment_notes: equipmentNotes,
          dress_code: dressCode, bridesmaids, groomsmen, vendors, key_moments: keyMoments,
          weather: weatherStr,
          schedule: schedule.length > 0 ? schedule : (selectedContract ? (() => {
            const minimal: ScheduleEvent[] = []
            if (selectedContract.start_time) minimal.push({ time: formatMilitaryTime(selectedContract.start_time), label: 'Coverage Begins', address: '', maps_url: '' })
            if (selectedContract.ceremony_location) minimal.push({ time: '', label: 'Ceremony', address: selectedContract.ceremony_location, maps_url: mapsUrl(selectedContract.ceremony_location) })
            if (selectedContract.reception_venue) minimal.push({ time: '', label: 'Reception', address: selectedContract.reception_venue, maps_url: mapsUrl(selectedContract.reception_venue) })
            if (selectedContract.end_time) minimal.push({ time: formatMilitaryTime(selectedContract.end_time), label: 'Coverage Ends', address: '', maps_url: '' })
            return minimal
          })() : []),
          attachments: uploadedDocs.filter(d => d.attachToEmail).map(d => ({ filename: d.name, path: d.path })),
          crew_members: checkedCrew.map(e => {
            const mp = meetingPoints.find(p => p.name === e.meeting_location)
            return {
            team_member_id: e.team_member_id, member_name: e.member_name,
            member_email: e.member_email, role: e.role, call_time: e.call_time,
            meeting_point: e.meeting_location,
            meeting_point_address: mp?.address || e.meeting_location,
            meeting_point_maps_url: mp?.maps_url || (e.meeting_location ? mapsUrl(e.meeting_location) : ''),
            meeting_point_time: '',
            equipment_pickup_location: '',
            equipment_pickup_time: '',
            equipment_dropoff_location: '',
            equipment_dropoff_time: '',
            special_notes: e.special_notes,
          }}),
        }),
      })
      const data = await res.json()
      if (data.success) {
        setSentTimestamp(new Date().toLocaleString('en-US', { timeZone: 'America/Toronto' }))
        fetchHistory(selectedCouple.id)
        fetchConfirmationStatuses(selectedCouple.id)
      } else {
        setSendError(data.error || 'Failed to send call sheet')
      }
    } catch (err) {
      console.error('Send failed:', err)
      setSendError('Network error — check your connection and try again')
    }
    setSending(false)
  }

  // ── Available members to add ───────────────────────────────────

  const availableMembers = useMemo(() => {
    const usedIds = new Set(crewEntries.map(e => e.team_member_id))
    return teamMembers.filter(m => !usedIds.has(m.id))
  }, [teamMembers, crewEntries])

  // ── Meeting point dropdown options (3 sections) ────────────────

  const mpOptions = useMemo(() => meetingPoints.map(mp => ({
    value: mp.name,
    label: mp.name,
    address: mp.address,
    usualFor: mp.usual_for,
  })), [meetingPoints])

  // All non-__other__ values for matching
  const allOptionValues = useMemo(() => {
    const vals = new Set<string>()
    mpOptions.forEach(o => vals.add(o.value))
    return vals
  }, [mpOptions])

  // ── Helpers ────────────────────────────────────────────────────

  const formatWeddingDateUpper = (d: string | null) => {
    if (!d) return '—'
    const f = format(new Date(d + 'T12:00:00'), 'EEEE, MMMM d, yyyy')
    const parts = f.split(', ')
    return parts[0].toUpperCase() + ', ' + parts.slice(1).join(', ')
  }

  const calcCoverage = () => {
    if (!selectedContract?.start_time || !selectedContract?.end_time) return null
    return `${formatMilitaryTime(selectedContract.start_time)} to ${formatMilitaryTime(selectedContract.end_time)}`
  }

  const teamRequired = () => {
    const p = selectedContract?.num_photographers || 0
    const v = selectedContract?.num_videographers || 0
    return `${p}P + ${v}V`
  }

  // ── Styles ─────────────────────────────────────────────────────

  const inputStyle: React.CSSProperties = {
    width: '100%', padding: '6px 10px', borderRadius: '6px',
    border: '1px solid var(--border)', fontFamily: nunito.style.fontFamily,
    fontSize: '0.85rem', background: 'var(--background)',
  }

  const labelStyle: React.CSSProperties = { fontSize: '0.75rem', fontWeight: 600, color: 'var(--muted-foreground)', display: 'block', marginBottom: '3px' }

  const cardStyle: React.CSSProperties = {
    background: 'var(--background)', borderRadius: '12px', border: '1px solid var(--border)',
    padding: '1.25rem 1.5rem', marginBottom: '1.5rem',
    boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
  }

  const sectionTitle = (text: string) => (
    <h2 className={playfair.className} style={{ fontSize: '1.1rem', color: 'var(--primary)', margin: '0 0 1rem' }}>{text}</h2>
  )

  // ── Loading ────────────────────────────────────────────────────

  if (loading) {
    return <div className={nunito.className} style={{ padding: '2rem', textAlign: 'center', color: 'var(--muted-foreground)' }}>Loading...</div>
  }

  // ── Render ─────────────────────────────────────────────────────

  return (
    <div className={`${nunito.className} max-w-4xl mx-auto px-4 md:px-8`} style={{ paddingTop: '1.5rem', paddingBottom: '1.5rem', background: 'var(--background)', minHeight: '100vh' }}>

      {/* Header */}
      <div style={{ marginBottom: '1.5rem' }}>
        <h1 className={`${playfair.className} text-xl md:text-[1.75rem]`} style={{ color: 'var(--foreground)', margin: 0 }}>Crew Call Sheet</h1>
        <p style={{ margin: '4px 0 0', fontSize: '0.85rem', color: 'var(--muted-foreground)' }}>Send wedding details to your team</p>
      </div>

      {/* Section 1: Wedding Selector */}
      <div style={{ marginBottom: '1.5rem' }}>
        <select
          value={selectedCoupleId}
          onChange={e => setSelectedCoupleId(e.target.value)}
          style={{
            width: '100%', maxWidth: '500px', padding: '10px 14px', borderRadius: '8px',
            border: '1px solid var(--border)', fontFamily: nunito.style.fontFamily, fontSize: '0.9rem',
            background: 'var(--background)', color: 'var(--foreground)', cursor: 'pointer',
          }}
        >
          <option value="">Select an upcoming wedding...</option>
          {couples.map(c => (
            <option key={c.id} value={c.id}>
              {c.wedding_date ? format(new Date(c.wedding_date + 'T12:00:00'), 'MMM d') : '—'} — {c.couple_name}
              {contracts.find(ct => ct.couple_id === c.id)?.reception_venue
                ? ` (${contracts.find(ct => ct.couple_id === c.id)?.reception_venue})`
                : ''}
            </option>
          ))}
        </select>
      </div>

      {selectedCouple && (
        <>
          {/* Section 2: Wedding Details Card with Locations */}
          <div style={cardStyle}>
            {sectionTitle('Wedding Details')}
            <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr', gap: '6px 16px', fontSize: '0.85rem' }}>
              <span style={{ color: 'var(--muted-foreground)', fontWeight: 600 }}>Couple</span>
              <span style={{ color: 'var(--foreground)', fontWeight: 700 }}>{selectedCouple.couple_name}</span>

              <span style={{ color: 'var(--muted-foreground)', fontWeight: 600 }}>Date</span>
              <span style={{ color: 'var(--foreground)', fontWeight: 700 }}>{formatWeddingDateUpper(selectedCouple.wedding_date)}</span>

              <span style={{ color: 'var(--muted-foreground)', fontWeight: 600 }}>Weather</span>
              <span style={{ color: 'var(--foreground)' }}>
                {weatherLoading ? 'Loading...' : weather.available ? (
                  <>High {weather.high}°C / Low {weather.low}°C | {weather.precipitation}% rain<br />Sunrise {weather.sunrise} | Sunset {weather.sunset}</>
                ) : 'Available closer to date'}
              </span>

              {calcCoverage() && <>
                <span style={{ color: 'var(--muted-foreground)', fontWeight: 600 }}>Coverage</span>
                <span style={{ color: 'var(--foreground)' }}>{calcCoverage()}</span>
              </>}

              {selectedCouple.package_type && <>
                <span style={{ color: 'var(--muted-foreground)', fontWeight: 600 }}>Package</span>
                <span style={{ color: 'var(--foreground)' }}>{formatPackage(selectedCouple.package_type)}</span>
              </>}

              <span style={{ color: 'var(--muted-foreground)', fontWeight: 600 }}>Team Required</span>
              <span style={{ color: 'var(--foreground)' }}>{teamRequired()}</span>

              <span style={{ color: 'var(--muted-foreground)', fontWeight: 600 }}>Wedding Day Form</span>
              <span>{selectedMilestone?.m15_day_form_approved
                ? <span style={{ color: 'var(--primary)', fontWeight: 700 }}>Received</span>
                : <span style={{ color: 'var(--destructive)', fontWeight: 700 }}>Missing</span>
              }</span>
            </div>

            {/* Key Locations — all locations with TBD fallback */}
            {weddingLocations.length > 0 && (
              <div style={{ marginTop: '16px', paddingTop: '14px', borderTop: '1px solid var(--border)' }}>
                <h3 className={playfair.className} style={{ fontSize: '0.9rem', color: 'var(--primary)', margin: '0 0 10px' }}>Key Locations</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  {weddingLocations.map((loc, i) => (
                    <div key={i} className="grid grid-cols-[auto_1fr] md:grid-cols-[50px_100px_1fr] items-baseline gap-x-2 gap-y-1 md:gap-2" style={{
                      fontSize: '0.85rem',
                      padding: '8px 12px', background: 'var(--muted)', borderRadius: '6px',
                    }}>
                      <span style={{ fontFamily: "'Courier New', Courier, monospace", fontWeight: 700, color: loc.time === 'TBD' ? 'var(--muted-foreground)' : 'var(--primary)' }}>{loc.time}</span>
                      <span style={{ fontWeight: 700, color: 'var(--foreground)' }}>{loc.label}</span>
                      <span style={{ color: loc.venue === 'TBD' ? 'var(--muted-foreground)' : 'var(--foreground)' }}>
                        {loc.venue}
                        {loc.venue !== 'TBD' && (
                          <a href={mapsUrl(loc.venue)} target="_blank" rel="noopener noreferrer" style={{ marginLeft: '8px', color: 'var(--primary)', textDecoration: 'underline', fontSize: '0.8rem', fontWeight: 600 }}>Maps</a>
                        )}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Fallback locations from contract when no wedding day form */}
            {weddingLocations.length === 0 && (selectedContract?.ceremony_location || selectedContract?.reception_venue || selectedCouple.park_location) && (
              <div style={{ marginTop: '16px', paddingTop: '14px', borderTop: '1px solid var(--border)' }}>
                <h3 className={playfair.className} style={{ fontSize: '0.9rem', color: 'var(--primary)', margin: '0 0 10px' }}>Key Locations</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  {selectedContract?.ceremony_location && (
                    <div style={{ display: 'grid', gridTemplateColumns: '50px 100px 1fr', alignItems: 'baseline', gap: '8px', fontSize: '0.85rem', padding: '8px 12px', background: 'var(--muted)', borderRadius: '6px' }}>
                      <span style={{ fontFamily: "'Courier New', Courier, monospace", fontWeight: 700, color: 'var(--muted-foreground)' }}>TBD</span>
                      <span style={{ fontWeight: 700, color: 'var(--foreground)' }}>Ceremony</span>
                      <span style={{ color: 'var(--foreground)' }}>
                        {selectedContract.ceremony_location}
                        <a href={mapsUrl(selectedContract.ceremony_location)} target="_blank" rel="noopener noreferrer" style={{ marginLeft: '8px', color: 'var(--primary)', textDecoration: 'underline', fontSize: '0.8rem', fontWeight: 600 }}>Maps</a>
                      </span>
                    </div>
                  )}
                  {selectedCouple.park_location && (
                    <div style={{ display: 'grid', gridTemplateColumns: '50px 100px 1fr', alignItems: 'baseline', gap: '8px', fontSize: '0.85rem', padding: '8px 12px', background: 'var(--muted)', borderRadius: '6px' }}>
                      <span style={{ fontFamily: "'Courier New', Courier, monospace", fontWeight: 700, color: 'var(--muted-foreground)' }}>TBD</span>
                      <span style={{ fontWeight: 700, color: 'var(--foreground)' }}>Park</span>
                      <span style={{ color: 'var(--foreground)' }}>
                        {selectedCouple.park_location}
                        <a href={mapsUrl(selectedCouple.park_location)} target="_blank" rel="noopener noreferrer" style={{ marginLeft: '8px', color: 'var(--primary)', textDecoration: 'underline', fontSize: '0.8rem', fontWeight: 600 }}>Maps</a>
                      </span>
                    </div>
                  )}
                  {selectedContract?.reception_venue && (
                    <div style={{ display: 'grid', gridTemplateColumns: '50px 100px 1fr', alignItems: 'baseline', gap: '8px', fontSize: '0.85rem', padding: '8px 12px', background: 'var(--muted)', borderRadius: '6px' }}>
                      <span style={{ fontFamily: "'Courier New', Courier, monospace", fontWeight: 700, color: 'var(--muted-foreground)' }}>TBD</span>
                      <span style={{ fontWeight: 700, color: 'var(--foreground)' }}>Reception</span>
                      <span style={{ color: 'var(--foreground)' }}>
                        {selectedContract.reception_venue}
                        <a href={mapsUrl(selectedContract.reception_venue)} target="_blank" rel="noopener noreferrer" style={{ marginLeft: '8px', color: 'var(--primary)', textDecoration: 'underline', fontSize: '0.8rem', fontWeight: 600 }}>Maps</a>
                      </span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Bridal Party */}
            <div className="flex flex-wrap gap-4 items-center mt-3">
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={labelStyle}>Bridesmaids</span>
                <input value={bridesmaids} onChange={e => setBridesmaids(e.target.value)} placeholder="0" style={{ ...inputStyle, width: '60px', textAlign: 'center' }} />
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={labelStyle}>Groomsmen</span>
                <input value={groomsmen} onChange={e => setGroomsmen(e.target.value)} placeholder="0" style={{ ...inputStyle, width: '60px', textAlign: 'center' }} />
              </div>
            </div>
          </div>

          {/* Section: Wedding Day Schedule */}
          <div style={cardStyle}>
            {sectionTitle('Wedding Day Schedule')}
            {schedule.length > 0 ? (
              <div style={{ position: 'relative', paddingLeft: '24px' }}>
                <div style={{ position: 'absolute', left: '8px', top: '4px', bottom: '4px', width: '2px', background: 'var(--primary)', borderRadius: '1px' }} />
                {schedule.map((evt, i) => (
                  <div key={i} style={{ position: 'relative', marginBottom: i < schedule.length - 1 ? '16px' : 0, paddingLeft: '16px' }}>
                    <div style={{ position: 'absolute', left: '-20px', top: '4px', width: '10px', height: '10px', borderRadius: '50%', background: 'var(--primary)', border: '2px solid var(--background)', boxShadow: '0 0 0 1px var(--primary)' }} />
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', marginBottom: '2px' }}>
                      <span style={{ fontFamily: "'Courier New', Courier, monospace", fontWeight: 700, fontSize: '0.9rem', color: 'var(--primary)', minWidth: '80px' }}>{evt.time}</span>
                      <span style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--foreground)' }}>{evt.label}</span>
                    </div>
                    {evt.address && (
                      <p style={{ margin: '2px 0 0', fontSize: '0.85rem', color: 'var(--foreground)' }}>
                        {evt.address}
                        {evt.maps_url && (
                          <a href={evt.maps_url} target="_blank" rel="noopener noreferrer" style={{ marginLeft: '8px', color: 'var(--primary)', textDecoration: 'underline', fontSize: '0.8rem', fontWeight: 600 }}>Open in Google Maps</a>
                        )}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            ) : selectedContract ? (
              <div style={{ position: 'relative', paddingLeft: '24px' }}>
                <div style={{ position: 'absolute', left: '8px', top: '4px', bottom: '4px', width: '2px', background: 'var(--primary)', borderRadius: '1px' }} />
                {selectedContract.start_time && (
                  <div style={{ position: 'relative', marginBottom: '16px', paddingLeft: '16px' }}>
                    <div style={{ position: 'absolute', left: '-20px', top: '4px', width: '10px', height: '10px', borderRadius: '50%', background: 'var(--primary)', border: '2px solid var(--background)', boxShadow: '0 0 0 1px var(--primary)' }} />
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
                      <span style={{ fontFamily: "'Courier New', Courier, monospace", fontWeight: 700, fontSize: '0.9rem', color: 'var(--primary)', minWidth: '80px' }}>{formatMilitaryTime(selectedContract.start_time)}</span>
                      <span style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--foreground)' }}>Coverage Begins</span>
                    </div>
                  </div>
                )}
                {selectedContract.ceremony_location && (
                  <div style={{ position: 'relative', marginBottom: '16px', paddingLeft: '16px' }}>
                    <div style={{ position: 'absolute', left: '-20px', top: '4px', width: '10px', height: '10px', borderRadius: '50%', background: 'var(--primary)', border: '2px solid var(--background)', boxShadow: '0 0 0 1px var(--primary)' }} />
                    <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--foreground)' }}>
                      Ceremony: {selectedContract.ceremony_location}
                      <a href={mapsUrl(selectedContract.ceremony_location)} target="_blank" rel="noopener noreferrer" style={{ marginLeft: '8px', color: 'var(--primary)', textDecoration: 'underline', fontSize: '0.8rem', fontWeight: 600 }}>Open in Google Maps</a>
                    </p>
                  </div>
                )}
                {selectedContract.reception_venue && (
                  <div style={{ position: 'relative', marginBottom: '16px', paddingLeft: '16px' }}>
                    <div style={{ position: 'absolute', left: '-20px', top: '4px', width: '10px', height: '10px', borderRadius: '50%', background: 'var(--primary)', border: '2px solid var(--background)', boxShadow: '0 0 0 1px var(--primary)' }} />
                    <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--foreground)' }}>
                      Reception: {selectedContract.reception_venue}
                      <a href={mapsUrl(selectedContract.reception_venue)} target="_blank" rel="noopener noreferrer" style={{ marginLeft: '8px', color: 'var(--primary)', textDecoration: 'underline', fontSize: '0.8rem', fontWeight: 600 }}>Open in Google Maps</a>
                    </p>
                  </div>
                )}
                {selectedContract.end_time && (
                  <div style={{ position: 'relative', paddingLeft: '16px' }}>
                    <div style={{ position: 'absolute', left: '-20px', top: '4px', width: '10px', height: '10px', borderRadius: '50%', background: 'var(--primary)', border: '2px solid var(--background)', boxShadow: '0 0 0 1px var(--primary)' }} />
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
                      <span style={{ fontFamily: "'Courier New', Courier, monospace", fontWeight: 700, fontSize: '0.9rem', color: 'var(--primary)', minWidth: '80px' }}>{formatMilitaryTime(selectedContract.end_time)}</span>
                      <span style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--foreground)' }}>Coverage Ends</span>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--muted-foreground)' }}>No schedule data available</p>
            )}
          </div>

          {/* Section 3: Crew Assignment Cards — Simplified */}
          <div style={{ marginBottom: '1.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
              <h2 className={playfair.className} style={{ fontSize: '1.1rem', color: 'var(--primary)', margin: 0 }}>Crew Assignments</h2>
              <div style={{ position: 'relative' }}>
                <button onClick={() => setShowAddCrew(!showAddCrew)} style={{
                  display: 'inline-flex', alignItems: 'center', gap: '4px',
                  padding: '6px 12px', borderRadius: '6px', border: '1px solid var(--border)',
                  background: 'var(--background)', color: 'var(--primary)', fontWeight: 600, fontSize: '0.8rem',
                  cursor: 'pointer', fontFamily: nunito.style.fontFamily,
                }}>
                  <Plus size={14} /> Add Crew Member
                </button>
                {showAddCrew && availableMembers.length > 0 && (
                  <div style={{
                    position: 'absolute', top: '100%', right: 0, zIndex: 50,
                    background: 'var(--background)', borderRadius: '8px', border: '1px solid var(--border)',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.12)', padding: '4px 0',
                    minWidth: '200px', marginTop: '4px',
                  }}>
                    {availableMembers.map(m => (
                      <button key={m.id} onClick={() => addCrewMember(m)} style={{
                        display: 'block', width: '100%', textAlign: 'left',
                        padding: '8px 12px', border: 'none', cursor: 'pointer',
                        fontSize: '0.85rem', fontFamily: nunito.style.fontFamily,
                        background: 'transparent', color: 'var(--foreground)',
                      }}
                        onMouseEnter={e => { (e.target as HTMLElement).style.background = 'var(--muted)' }}
                        onMouseLeave={e => { (e.target as HTMLElement).style.background = 'transparent' }}
                      >{m.first_name} {m.last_name || ''}</button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {crewEntries.map((entry, idx) => (
              <div key={entry.team_member_id} style={{
                background: 'var(--background)', borderRadius: '10px', border: '1px solid var(--border)',
                marginBottom: '0.75rem', overflow: 'hidden',
                boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
                opacity: entry.checked ? 1 : 0.5,
              }}>
                {/* Card header: checkbox + name + confirmation badge + role dropdown + remove */}
                <div className="flex flex-wrap items-center gap-2 md:gap-[10px]" style={{
                  padding: '10px 14px', background: 'var(--muted)', borderBottom: '1px solid var(--border)',
                }}>
                  <input type="checkbox" checked={entry.checked}
                    onChange={e => updateEntry(idx, 'checked', e.target.checked)}
                    style={{ width: 18, height: 18, cursor: 'pointer' }} />
                  <span style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--foreground)' }}>{entry.member_name}</span>
                  {/* Confirmation status badge */}
                  {(() => {
                    const status = confirmationStatuses.find(s => s.team_member_id === entry.team_member_id)
                    if (!status) return null
                    if (status.confirmed) {
                      return (
                        <span style={{
                          display: 'inline-flex', alignItems: 'center', gap: '4px',
                          padding: '2px 8px', borderRadius: '9999px', fontSize: '0.7rem', fontWeight: 600,
                          background: '#dcfce7', color: '#166534',
                        }}>
                          <Check size={10} /> Confirmed
                          {status.confirmed_at && (
                            <span style={{ fontWeight: 400, marginLeft: '2px' }}>
                              {format(new Date(status.confirmed_at), 'MMM d, h:mm a')}
                            </span>
                          )}
                        </span>
                      )
                    }
                    if (status.email_sent) {
                      return (
                        <span style={{
                          display: 'inline-flex', alignItems: 'center', gap: '4px',
                          padding: '2px 8px', borderRadius: '9999px', fontSize: '0.7rem', fontWeight: 600,
                          background: '#fef3c7', color: '#92400e',
                        }}>
                          <Clock size={10} /> Awaiting confirmation
                        </span>
                      )
                    }
                    return (
                      <span style={{
                        display: 'inline-flex', alignItems: 'center', gap: '4px',
                        padding: '2px 8px', borderRadius: '9999px', fontSize: '0.7rem', fontWeight: 600,
                        background: 'var(--muted)', color: 'var(--muted-foreground)',
                        border: '1px solid var(--border)',
                      }}>
                        <Mail size={10} /> Not sent
                      </span>
                    )
                  })()}
                  <div style={{ flex: 1 }} />
                  <select value={entry.role} onChange={e => updateEntry(idx, 'role', e.target.value)} style={{
                    padding: '4px 8px', borderRadius: '6px', border: '1px solid var(--border)',
                    fontSize: '0.8rem', fontFamily: nunito.style.fontFamily, background: 'var(--background)',
                  }}>
                    <option>Lead Photographer</option>
                    <option>2nd Photographer</option>
                    <option>Videographer</option>
                  </select>
                  <button onClick={() => removeCrew(idx)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted-foreground)', padding: '2px' }}>
                    <X size={16} />
                  </button>
                </div>

                {/* Card body — simplified: Call Time, Meeting Location, Special Notes */}
                {entry.checked && (
                  <div style={{ padding: '14px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {/* Call Time — native time input */}
                    <div>
                      <Label className={nunito.className} style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--muted-foreground)', display: 'block', marginBottom: '4px' }}>Call Time</Label>
                      <input
                        type="time"
                        value={toHHMM(entry.call_time)}
                        onChange={e => updateEntry(idx, 'call_time', fromHHMM(e.target.value))}
                        className="w-full md:w-[160px]"
                        style={{
                          ...inputStyle,
                          width: undefined,
                          fontFamily: "'Courier New', Courier, monospace",
                          fontWeight: 700,
                          color: 'var(--primary)',
                        }}
                      />
                    </div>

                    {/* Meeting Location — dropdown with meeting points + wedding venues */}
                    <div>
                      <Label className={nunito.className} style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--muted-foreground)', display: 'block', marginBottom: '4px' }}>Meeting Location</Label>
                      {(() => {
                        const isOther = otherLocationMode.has(entry.team_member_id)
                        const matchesOption = allOptionValues.has(entry.meeting_location)
                        const showCustomInput = isOther || (entry.meeting_location !== '' && !matchesOption)
                        const selectValue = matchesOption ? entry.meeting_location : (showCustomInput ? '__other__' : undefined)

                        return (
                          <>
                            <Select
                              value={selectValue}
                              onValueChange={(v) => {
                                if (v === '__other__') {
                                  setOtherLocationMode(prev => new Set(prev).add(entry.team_member_id))
                                  updateEntry(idx, 'meeting_location', '')
                                } else if (v) {
                                  setOtherLocationMode(prev => { const next = new Set(prev); next.delete(entry.team_member_id); return next })
                                  updateEntry(idx, 'meeting_location', v)
                                }
                              }}
                            >
                              <SelectTrigger className="w-full">
                                <SelectValue placeholder="Select meeting location..." />
                              </SelectTrigger>
                              <SelectContent>
                                {mpOptions.length > 0 && (
                                  <SelectGroup>
                                    <SelectLabel>Crew Meeting Points</SelectLabel>
                                    {mpOptions.map(opt => (
                                      <SelectItem key={opt.value} value={opt.value}>
                                        {opt.label}{opt.usualFor ? ` (${opt.usualFor}'s usual)` : ''}
                                      </SelectItem>
                                    ))}
                                  </SelectGroup>
                                )}
                                <SelectSeparator />
                                <SelectItem value="__other__">Other (type below)</SelectItem>
                              </SelectContent>
                            </Select>
                            {showCustomInput && (
                              <input
                                value={entry.meeting_location}
                                onChange={e => updateEntry(idx, 'meeting_location', e.target.value)}
                                placeholder="Tim Hortons on Keele, Bride's house, Church parking lot..."
                                style={{ ...inputStyle, marginTop: '6px' }}
                                autoFocus
                              />
                            )}
                          </>
                        )
                      })()}
                    </div>

                    {/* Special Notes */}
                    <div>
                      <Label className={nunito.className} style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--muted-foreground)', display: 'block', marginBottom: '4px' }}>Special Notes</Label>
                      <textarea value={entry.special_notes} onChange={e => updateEntry(idx, 'special_notes', e.target.value)}
                        placeholder="Any notes for this crew member..."
                        rows={2} style={{ ...inputStyle, resize: 'vertical' as const }} />
                    </div>
                  </div>
                )}
              </div>
            ))}

            {crewEntries.length === 0 && (
              <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--muted-foreground)', fontSize: '0.85rem', background: 'var(--background)', borderRadius: '10px', border: '1px solid var(--border)' }}>
                No crew assigned to this wedding yet. Check wedding assignments or add crew members manually.
              </div>
            )}
          </div>

          {/* Section: Equipment & Notes — shared across all crew */}
          <Card className={nunito.className} style={{ marginBottom: '1.5rem' }}>
            <CardHeader>
              <CardTitle className={playfair.className} style={{ fontSize: '1.1rem', color: 'var(--primary)' }}>Equipment & Notes</CardTitle>
            </CardHeader>
            <CardContent>
              <Textarea
                className={nunito.className}
                value={equipmentNotes}
                onChange={e => setEquipmentNotes(e.target.value)}
                placeholder="Bring wireless mic kit, extra batteries, 2nd body, drone..."
                rows={3}
              />
            </CardContent>
          </Card>

          {/* Dress Code */}
          <div style={cardStyle}>
            {sectionTitle('Dress Code')}
            <input value={dressCode} onChange={e => setDressCode(e.target.value)} placeholder="All black" style={inputStyle} />
          </div>

          {/* Key Vendors — collapsible */}
          <div style={cardStyle}>
            <button onClick={() => setShowVendors(!showVendors)} style={{
              display: 'flex', alignItems: 'center', gap: '6px', background: 'none',
              border: 'none', cursor: 'pointer', padding: 0, width: '100%',
            }}>
              {showVendors ? <ChevronDown size={16} style={{ color: 'var(--primary)' }} /> : <ChevronRight size={16} style={{ color: 'var(--primary)' }} />}
              <h2 className={playfair.className} style={{ fontSize: '1.1rem', color: 'var(--primary)', margin: 0 }}>Key Vendors</h2>
            </button>
            {showVendors && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-[10px] mt-3">
                {[
                  { key: 'dj_mc', label: 'DJ/MC' }, { key: 'florist', label: 'Florist' },
                  { key: 'makeup', label: 'Makeup' }, { key: 'hair', label: 'Hair' },
                  { key: 'planner', label: 'Planner' }, { key: 'transport', label: 'Transport/Limo' },
                ].map(v => (
                  <div key={v.key}>
                    <span style={labelStyle}>{v.label}</span>
                    <input value={vendors[v.key] || ''} onChange={e => setVendors(prev => ({ ...prev, [v.key]: e.target.value }))} placeholder={v.label} style={inputStyle} />
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Must-Capture Moments */}
          <div style={cardStyle}>
            {sectionTitle('Must-Capture Moments')}
            <textarea value={keyMoments} onChange={e => setKeyMoments(e.target.value)}
              placeholder="Sparklers at first dance, drone shot outside church, glow sticks at 10 PM..."
              rows={3} style={{ ...inputStyle, width: '100%', resize: 'vertical' as const }} />
          </div>

          {/* Additional Notes */}
          <div style={cardStyle}>
            {sectionTitle('Additional Notes')}
            <textarea value={generalNotes} onChange={e => setGeneralNotes(e.target.value)}
              placeholder="Parking is free at venue."
              rows={3} style={{ ...inputStyle, width: '100%', resize: 'vertical' as const }} />
          </div>

          {/* Wedding Documents Upload */}
          <div style={cardStyle}>
            {sectionTitle('Wedding Documents')}
            <div
              style={{
                border: '2px dashed #e7e1d8', borderRadius: '8px', padding: '1.5rem',
                textAlign: 'center', cursor: 'pointer', background: 'var(--muted)',
                marginBottom: (uploadedDocs.length || uploadError) ? '12px' : 0,
                transition: 'border-color 0.2s',
              }}
              onClick={() => fileInputRef.current?.click()}
              onDragOver={e => { e.preventDefault(); e.stopPropagation(); (e.currentTarget as HTMLElement).style.borderColor = 'var(--primary)' }}
              onDragLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = 'var(--border)' }}
              onDrop={e => { e.preventDefault(); e.stopPropagation(); (e.currentTarget as HTMLElement).style.borderColor = 'var(--border)'; handleFileUpload(e.dataTransfer.files) }}
            >
              <Upload size={24} style={{ color: 'var(--muted-foreground)', marginBottom: '6px' }} />
              <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--muted-foreground)' }}>
                {uploading ? 'Uploading...' : 'Drag & drop PDFs here or click to upload'}
              </p>
              <input ref={fileInputRef} type="file" accept=".pdf" multiple style={{ display: 'none' }}
                onChange={e => handleFileUpload(e.target.files)} />
            </div>

            {uploadError && (
              <p style={{ margin: '0 0 8px', fontSize: '0.8rem', color: 'var(--destructive)', fontWeight: 600 }}>{uploadError}</p>
            )}

            {uploadedDocs.length > 0 && (
              <div>
                {uploadedDocs.map(doc => (
                  <div key={doc.path} className="flex flex-wrap items-center gap-2 md:gap-[10px]" style={{
                    padding: '8px 0', borderBottom: '1px solid #f0ece6', fontSize: '0.85rem',
                  }}>
                    <FileText size={16} style={{ color: 'var(--primary)', flexShrink: 0 }} />
                    <span style={{ flex: 1, color: 'var(--foreground)', fontWeight: 600 }}>{doc.name}</span>
                    <span style={{ color: 'var(--muted-foreground)', fontSize: '0.75rem' }}>
                      {doc.uploaded_at ? format(new Date(doc.uploaded_at), 'MMM d') : ''}
                    </span>
                    <button onClick={() => handleDownloadDoc(doc)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted-foreground)', padding: '2px' }} title="Download"><Download size={14} /></button>
                    <button onClick={() => handleViewDoc(doc)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted-foreground)', padding: '2px' }} title="View"><ExternalLink size={14} /></button>
                    <button onClick={() => handleDeleteDoc(doc)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--destructive)', padding: '2px' }} title="Delete"><Trash2 size={14} /></button>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer', fontSize: '0.75rem', color: 'var(--muted-foreground)' }}>
                      <input type="checkbox" checked={doc.attachToEmail}
                        onChange={e => setUploadedDocs(prev => prev.map(d => d.path === doc.path ? { ...d, attachToEmail: e.target.checked } : d))}
                        style={{ width: 14, height: 14 }} />
                      Attach
                    </label>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Send Error */}
          {sendError && (
            <div style={{
              padding: '10px 14px', marginBottom: '1rem', borderRadius: '8px',
              background: '#fef2f2', border: '1px solid #fecaca', color: '#991b1b',
              fontSize: '0.85rem', fontWeight: 600,
            }}>
              {sendError}
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex flex-col md:flex-row gap-[10px] mb-6 items-stretch md:items-center">
            <button onClick={() => { setShowPreview(true); setPreviewTab(0) }}
              disabled={!crewEntries.some(e => e.checked)}
              style={{
                display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
                padding: '10px 20px', borderRadius: '8px', border: '1px solid var(--border)',
                background: 'var(--background)', color: 'var(--primary)', fontWeight: 600, fontSize: '0.85rem',
                cursor: 'pointer', fontFamily: nunito.style.fontFamily, minHeight: '44px',
                opacity: crewEntries.some(e => e.checked) ? 1 : 0.5,
              }}>
              <Eye size={16} /> Preview Email
            </button>

            {sentTimestamp ? (
              <div style={{
                display: 'inline-flex', alignItems: 'center', gap: '6px',
                padding: '10px 20px', borderRadius: '8px', border: 'none',
                background: '#16a34a', color: '#ffffff', fontWeight: 700, fontSize: '0.85rem',
                fontFamily: nunito.style.fontFamily,
              }}>
                <Check size={16} /> ✓ Emails Sent — {sentTimestamp}
              </div>
            ) : (
              <button onClick={handleSend}
                disabled={sending || !crewEntries.some(e => e.checked)}
                style={{
                  display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
                  padding: '10px 24px', borderRadius: '8px', border: 'none',
                  background: 'var(--primary)', color: 'var(--primary-foreground)', fontWeight: 700, fontSize: '0.9rem',
                  cursor: 'pointer', fontFamily: nunito.style.fontFamily, minHeight: '44px',
                  opacity: (sending || !crewEntries.some(e => e.checked)) ? 0.6 : 1,
                }}>
                <Send size={16} /> {sending ? 'Sending...' : 'Send Call Sheet'}
              </button>
            )}
          </div>

          {/* History */}
          {history.length > 0 && (
            <div style={{
              background: 'var(--background)', borderRadius: '12px', border: '1px solid var(--border)',
              overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
            }}>
              <button onClick={() => setShowHistory(!showHistory)} style={{
                display: 'flex', alignItems: 'center', gap: '6px', width: '100%',
                padding: '12px 16px', border: 'none', background: 'var(--muted)',
                cursor: 'pointer', fontFamily: nunito.style.fontFamily,
                fontSize: '0.85rem', fontWeight: 700, color: 'var(--primary)',
              }}>
                {showHistory ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                Previous Call Sheets ({history.length})
              </button>
              {showHistory && (
                <div style={{ padding: '0 16px 16px' }}>
                  {history.map(h => (
                    <div key={h.id} style={{ padding: '12px', borderBottom: '1px solid #f0ece6', fontSize: '0.85rem' }}>
                      <div style={{ fontWeight: 700, color: 'var(--foreground)', marginBottom: '6px' }}>
                        Sent {h.sent_at ? format(new Date(h.sent_at), 'MMM d, yyyy h:mm a') : '—'}
                      </div>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                        {h.members.map((m, i) => (
                          <span key={i} style={{
                            display: 'inline-flex', alignItems: 'center', gap: '4px',
                            padding: '3px 8px', borderRadius: '6px', fontSize: '0.8rem',
                            background: m.confirmed ? 'var(--accent)' : m.email_sent ? '#fef3c7' : 'var(--muted)',
                            color: m.confirmed ? 'var(--primary)' : m.email_sent ? '#92400e' : 'var(--muted-foreground)',
                            fontWeight: 600,
                          }}>
                            {m.confirmed ? <Check size={12} /> : m.email_sent ? <Clock size={12} /> : <Mail size={12} />}
                            {m.member_name} ({m.role})
                          </span>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </>
      )}

      {/* ── Preview Modal ─────────────────────────────────────────── */}
      {showPreview && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 1000,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(2px)',
        }} onClick={() => setShowPreview(false)}>
          <div onClick={e => e.stopPropagation()} className="w-[95%] md:w-[90%]" style={{
            background: 'var(--muted)', borderRadius: '16px', maxWidth: '700px',
            maxHeight: '85vh', overflow: 'auto', padding: '1.25rem',
            boxShadow: '0 25px 50px rgba(0,0,0,0.25)', border: '1px solid var(--border)',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h2 className={playfair.className} style={{ fontSize: '1.25rem', color: 'var(--foreground)', margin: 0 }}>Email Preview</h2>
              <button onClick={() => setShowPreview(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted-foreground)' }}><X size={20} /></button>
            </div>

            {/* Tabs */}
            <div style={{ display: 'flex', gap: '4px', marginBottom: '1rem', flexWrap: 'wrap' }}>
              {crewEntries.filter(e => e.checked).map((entry, idx) => (
                <button key={entry.team_member_id} onClick={() => setPreviewTab(idx)} style={{
                  padding: '6px 14px', borderRadius: '6px',
                  border: previewTab === idx ? '2px solid var(--primary)' : '1px solid var(--border)',
                  background: previewTab === idx ? 'var(--accent)' : 'var(--background)',
                  color: previewTab === idx ? 'var(--primary)' : 'var(--foreground)',
                  fontWeight: 600, fontSize: '0.8rem', cursor: 'pointer', fontFamily: nunito.style.fontFamily,
                }}>{entry.member_name}</button>
              ))}
            </div>

            {/* Preview content — uses same HTML builder as the send API */}
            {(() => {
              const checked = crewEntries.filter(e => e.checked)
              const entry = checked[previewTab]
              if (!entry) return null

              const dateFormatted = selectedCouple?.wedding_date
                ? format(new Date(selectedCouple.wedding_date + 'T12:00:00'), 'MMMM d, yyyy')
                : ''
              const dayUpper = selectedCouple?.wedding_date
                ? format(new Date(selectedCouple.wedding_date + 'T12:00:00'), 'EEEE').toUpperCase()
                : ''

              const weatherStr = weather.available
                ? `High ${weather.high}°C / Low ${weather.low}°C | ${weather.precipitation}% rain | Sunrise ${weather.sunrise} | Sunset ${weather.sunset}`
                : ''

              let coverageText = ''
              if (selectedContract?.start_time && selectedContract?.end_time) {
                coverageText = `${formatMilitaryTime(selectedContract.start_time)} – ${formatMilitaryTime(selectedContract.end_time)}`
                const parseT = (t: string) => {
                  const m = t.match(/(\d+):(\d+)\s*(AM|PM)/i)
                  if (!m) return null
                  let h = parseInt(m[1])
                  const mi = parseInt(m[2])
                  const ap = m[3].toUpperCase()
                  if (ap === 'PM' && h !== 12) h += 12
                  if (ap === 'AM' && h === 12) h = 0
                  return h * 60 + mi
                }
                const s = parseT(selectedContract.start_time)
                const e = parseT(selectedContract.end_time)
                if (s !== null && e !== null && e - s > 0) coverageText += ` (${Math.round((e - s) / 60)} hours)`
              }

              const bridalPartyText = (bridesmaids || groomsmen)
                ? `${bridesmaids || '0'} bridesmaids + ${groomsmen || '0'} groomsmen`
                : ''

              const vendorLabels: Record<string, string> = { dj_mc: 'DJ/MC', florist: 'Florist', makeup: 'Makeup', hair: 'Hair', planner: 'Planner', transport: 'Transport' }
              const vendorList = Object.entries(vendors)
                .filter(([, v]) => v)
                .map(([k, v]) => ({ key: vendorLabels[k] || k, value: v }))

              const previewSchedule = schedule.length > 0 ? schedule : [
                ...(selectedContract?.start_time ? [{ time: formatMilitaryTime(selectedContract.start_time), label: 'Coverage Begins', address: '', maps_url: '' }] : []),
                ...(selectedContract?.ceremony_location ? [{ time: '', label: 'Ceremony', address: selectedContract.ceremony_location, maps_url: mapsUrl(selectedContract.ceremony_location) }] : []),
                ...(selectedContract?.reception_venue ? [{ time: '', label: 'Reception', address: selectedContract.reception_venue, maps_url: mapsUrl(selectedContract.reception_venue) }] : []),
                ...(selectedContract?.end_time ? [{ time: formatMilitaryTime(selectedContract.end_time), label: 'Coverage Ends', address: '', maps_url: '' }] : []),
              ]

              const mp = meetingPoints.find(p => p.name === entry.meeting_location)
              const mpUrl = mp?.maps_url || (entry.meeting_location ? mapsUrl(entry.meeting_location) : '')

              const previewHtml = buildCrewEmailHtml({
                coupleName: selectedCouple?.couple_name || '',
                dateFormatted,
                dayUpper,
                weather: weatherStr,
                ceremonyLocation: selectedContract?.ceremony_location || '',
                receptionVenue: selectedContract?.reception_venue || '',
                parkLocation: selectedCouple?.park_location || '',
                coverageText,
                bridalPartyText,
                dressCode,
                generalNotes,
                keyMoments,
                schedule: previewSchedule,
                vendors: vendorList,
                member: {
                  name: entry.member_name,
                  role: entry.role,
                  callTime: entry.call_time,
                  meetingPoint: entry.meeting_location,
                  meetingPointMapsUrl: mpUrl,
                  specialNotes: entry.special_notes,
                  equipmentPickup: '',
                  equipmentPickupTime: '',
                  equipmentDropoff: '',
                  equipmentDropoffTime: '',
                },
                confirmUrl: null,
              })

              return <div dangerouslySetInnerHTML={{ __html: previewHtml }} />
            })()}
          </div>
        </div>
      )}
    </div>
  )
}
