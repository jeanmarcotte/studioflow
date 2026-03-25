'use client'

import { useState, useEffect, useMemo, useCallback, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import { Send, X, ChevronDown, ChevronRight, Plus, Eye, Check, Clock, Mail, Upload, FileText, Trash2, Download, ExternalLink, ChevronUp } from 'lucide-react'
import { Playfair_Display, Nunito } from 'next/font/google'
import { format } from 'date-fns'

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

interface MeetingPoint {
  id: string
  name: string
  address: string
  maps_url: string | null
  usual_for: string | null
  is_active: boolean
}

interface CrewEntry {
  team_member_id: string
  member_name: string
  member_email: string
  role: string
  checked: boolean
  call_time: string
  meeting_point_id: string
  meeting_point: string
  meeting_point_address: string
  meeting_point_maps_url: string
  meeting_point_custom: string
  meeting_point_time: string
  equipment_pickup_location: string
  equipment_pickup_time: string
  equipment_dropoff_location: string
  equipment_dropoff_time: string
  special_notes: string
  showEquipment: boolean
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

// ── Time Helpers ──────────────────────────────────────────────────

function parseTimeStr(t: string): number | null {
  if (!t) return null
  // Format: "7:30 AM" or "10:30 PM"
  const match12 = t.match(/(\d+):(\d+)\s*(AM|PM)/i)
  if (match12) {
    let h = parseInt(match12[1])
    const m = parseInt(match12[2])
    const ampm = match12[3].toUpperCase()
    if (ampm === 'PM' && h !== 12) h += 12
    if (ampm === 'AM' && h === 12) h = 0
    return h * 60 + m
  }
  // Format: "10:30" (24h)
  const match24 = t.match(/^(\d{1,2}):(\d{2})$/)
  if (match24) {
    return parseInt(match24[1]) * 60 + parseInt(match24[2])
  }
  // Format: "10am" or "10pm"
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
  const ampm = h >= 12 ? 'PM' : 'AM'
  const h12 = h === 0 ? 12 : h > 12 ? h - 12 : h
  return `${h12}:${m.toString().padStart(2, '0')} ${ampm}`
}

function adjustTime(time: string, deltaMins: number): string {
  const mins = parseTimeStr(time)
  if (mins === null) return time
  return minutesToTimeStr(mins + deltaMins)
}

function mapsUrl(address: string): string {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`
}

// ── Digital Clock Time Picker ────────────────────────────────────

function TimePicker({ value, onChange, label }: { value: string; onChange: (v: string) => void; label: string }) {
  const hasValue = !!value && parseTimeStr(value) !== null

  return (
    <div>
      <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#6b7280', display: 'block', marginBottom: '4px' }}>{label}</span>
      <div style={{
        display: 'flex', alignItems: 'stretch', border: '1px solid #e7e1d8', borderRadius: '8px',
        overflow: 'hidden', background: '#fff', height: '38px',
      }}>
        {/* Down button */}
        <button
          onClick={() => onChange(adjustTime(value || '12:00 PM', -15))}
          style={{
            width: '32px', border: 'none', background: '#faf8f5', cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            borderRight: '1px solid #e7e1d8', color: '#0d4f4f', flexShrink: 0,
          }}
          title="-15 min"
        >
          <ChevronDown size={14} />
        </button>

        {/* Time display */}
        <div style={{
          flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontFamily: "'Courier New', Courier, monospace",
          fontSize: '1rem', fontWeight: 700,
          color: hasValue ? '#0d4f4f' : '#9ca3af',
          letterSpacing: '0.5px',
          background: hasValue ? '#f0faf9' : '#fff',
          minWidth: '90px',
          cursor: 'text',
          position: 'relative',
        }}>
          <input
            value={value}
            onChange={e => onChange(e.target.value)}
            placeholder="--:-- --"
            style={{
              width: '100%', textAlign: 'center', border: 'none', background: 'transparent',
              fontFamily: "'Courier New', Courier, monospace",
              fontSize: '1rem', fontWeight: 700,
              color: hasValue ? '#0d4f4f' : '#9ca3af',
              outline: 'none', padding: '0 4px',
            }}
          />
        </div>

        {/* Up button */}
        <button
          onClick={() => onChange(adjustTime(value || '12:00 PM', 15))}
          style={{
            width: '32px', border: 'none', background: '#faf8f5', cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            borderLeft: '1px solid #e7e1d8', color: '#0d4f4f', flexShrink: 0,
          }}
          title="+15 min"
        >
          <ChevronUp size={14} />
        </button>
      </div>
    </div>
  )
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
  const [dressCode, setDressCode] = useState('')
  const [bridesmaids, setBridesmaids] = useState('')
  const [groomsmen, setGroomsmen] = useState('')
  const [vendors, setVendors] = useState<Record<string, string>>({ dj_mc: '', florist: '', makeup: '', hair: '', planner: '', transport: '' })
  const [keyMoments, setKeyMoments] = useState('')
  const [weather, setWeather] = useState<WeatherData>({ high: null, low: null, precipitation: null, sunrise: null, sunset: null, available: false })
  const [weatherLoading, setWeatherLoading] = useState(false)
  const [uploadedDocs, setUploadedDocs] = useState<UploadedDoc[]>([])
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState('')
  const [sending, setSending] = useState(false)
  const [sentTimestamp, setSentTimestamp] = useState<string | null>(null)
  const [showPreview, setShowPreview] = useState(false)
  const [previewTab, setPreviewTab] = useState(0)
  const [history, setHistory] = useState<HistorySheet[]>([])
  const [showHistory, setShowHistory] = useState(false)
  const [showAddCrew, setShowAddCrew] = useState(false)
  const [showVendors, setShowVendors] = useState(false)
  const [showAddMeetingPoint, setShowAddMeetingPoint] = useState(false)
  const [newMpName, setNewMpName] = useState('')
  const [newMpAddress, setNewMpAddress] = useState('')
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

  const fetchWeather = useCallback(async (weddingDate: string, receptionVenue: string) => {
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
      let lat = 43.65, lng = -79.38
      if (receptionVenue) {
        const city = receptionVenue.split(',').pop()?.trim() || 'Toronto'
        try {
          const geoRes = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(city)}&count=1`)
          const geoData = await geoRes.json()
          if (geoData.results?.[0]) { lat = geoData.results[0].latitude; lng = geoData.results[0].longitude }
        } catch { /* use defaults */ }
      }

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
      .select('bridal_party_count, vendor_dj_mc, vendor_floral, vendor_makeup, vendor_hair, vendor_wedding_planner, vendor_transportation')
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
      setCrewEntries([]); setSentTimestamp(null); setHistory([])
      setDressCode(''); setBridesmaids(''); setGroomsmen('')
      setVendors({ dj_mc: '', florist: '', makeup: '', hair: '', planner: '', transport: '' })
      setKeyMoments('')
      setWeather({ high: null, low: null, precipitation: null, sunrise: null, sunset: null, available: false })
      setUploadedDocs([]); setUploadError('')
      return
    }

    const contract = contracts.find(c => c.couple_id === selectedCoupleId)
    const couple = couples.find(c => c.id === selectedCoupleId)

    // ── All times derive from contracts.start_time ──
    const startMins = contract?.start_time ? parseTimeStr(contract.start_time) : null
    const endMins = contract?.end_time ? parseTimeStr(contract.end_time) : null

    const defaultCallTime = startMins !== null ? minutesToTimeStr(startMins - 60) : ''         // start - 1hr
    const defaultMeetingTime = startMins !== null ? minutesToTimeStr(startMins) : ''            // = start_time
    const defaultEquipPickup = startMins !== null ? minutesToTimeStr(startMins - 90) : ''       // meeting - 90min
    const defaultEquipDropoff = endMins !== null ? minutesToTimeStr(endMins) : ''               // = end_time

    const entries: CrewEntry[] = []
    let isFirst = true
    const addEntry = (name: string | null, role: string) => {
      if (!name) return
      const member = teamMembers.find(m => m.first_name === name)
      if (!member) return
      const isLead = isFirst
      entries.push({
        team_member_id: member.id,
        member_name: `${member.first_name} ${member.last_name || ''}`.trim(),
        member_email: member.email || '', role, checked: true,
        call_time: defaultCallTime,
        meeting_point_id: '', meeting_point: '', meeting_point_address: '',
        meeting_point_maps_url: '', meeting_point_custom: '',
        meeting_point_time: defaultMeetingTime,
        equipment_pickup_location: isLead ? "Jean's house" : '',
        equipment_pickup_time: isLead ? defaultEquipPickup : '',
        equipment_dropoff_location: '',
        equipment_dropoff_time: isLead ? defaultEquipDropoff : '',
        special_notes: '', showEquipment: isLead,
      })
      isFirst = false
    }

    addEntry(selectedAssignment.photo_1, 'Lead Photographer')
    addEntry(selectedAssignment.photo_2, '2nd Photographer')
    addEntry(selectedAssignment.video_1, 'Videographer')
    setCrewEntries(entries)

    setSentTimestamp(null)
    fetchHistory(selectedCoupleId)
    fetchUploadedDocs(selectedCoupleId)
    fetchWeddingDayForm(selectedCoupleId)

    if (couple?.wedding_date) {
      fetchWeather(couple.wedding_date, contract?.reception_venue || '')
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

  // ── Crew entry updates ─────────────────────────────────────────

  const updateEntry = (idx: number, field: keyof CrewEntry, value: any) => {
    if (field === 'meeting_point_time') {
      // Sync meeting point time across ALL crew members
      const newPickup = (() => {
        const mins = parseTimeStr(value)
        return mins !== null ? minutesToTimeStr(mins - 90) : ''
      })()
      setCrewEntries(prev => prev.map((e, i) => ({
        ...e,
        meeting_point_time: value,
        // Recalculate equipment pickup time for lead (first entry with showEquipment)
        equipment_pickup_time: e.showEquipment ? newPickup : e.equipment_pickup_time,
      })))
    } else {
      setCrewEntries(prev => prev.map((e, i) => i === idx ? { ...e, [field]: value } : e))
    }
  }

  const handleMeetingPointChange = (idx: number, mpId: string) => {
    if (mpId === '__venue__') {
      const venue = selectedContract?.reception_venue || ''
      setCrewEntries(prev => prev.map((e, i) => i === idx ? {
        ...e, meeting_point_id: mpId, meeting_point: `The Venue — ${venue}`,
        meeting_point_address: venue, meeting_point_maps_url: venue ? mapsUrl(venue) : '', meeting_point_custom: '',
      } : e))
    } else if (mpId === '__other__') {
      setCrewEntries(prev => prev.map((e, i) => i === idx ? {
        ...e, meeting_point_id: mpId, meeting_point: '', meeting_point_address: '',
        meeting_point_maps_url: '', meeting_point_custom: '',
      } : e))
    } else if (mpId) {
      const mp = meetingPoints.find(m => m.id === mpId)
      if (mp) {
        setCrewEntries(prev => prev.map((e, i) => i === idx ? {
          ...e, meeting_point_id: mpId,
          meeting_point: mp.name + (mp.usual_for ? ` — ${mp.usual_for}` : ''),
          meeting_point_address: mp.address,
          meeting_point_maps_url: mp.maps_url || mapsUrl(mp.address), meeting_point_custom: '',
        } : e))
      }
    } else {
      setCrewEntries(prev => prev.map((e, i) => i === idx ? {
        ...e, meeting_point_id: '', meeting_point: '', meeting_point_address: '',
        meeting_point_maps_url: '', meeting_point_custom: '',
      } : e))
    }
  }

  const handleCustomMeetingPoint = (idx: number, text: string) => {
    setCrewEntries(prev => prev.map((e, i) => i === idx ? {
      ...e, meeting_point_custom: text, meeting_point: text,
      meeting_point_address: text, meeting_point_maps_url: text ? mapsUrl(text) : '',
    } : e))
  }

  const addCrewMember = (member: TeamMember) => {
    if (crewEntries.some(e => e.team_member_id === member.id)) return
    const contract = contracts.find(c => c.couple_id === selectedCoupleId)
    const startMins = contract?.start_time ? parseTimeStr(contract.start_time) : null
    const defaultCallTime = startMins !== null ? minutesToTimeStr(startMins - 60) : ''
    const defaultMeetingTime = startMins !== null ? minutesToTimeStr(startMins) : ''
    // Inherit current meeting point time from existing crew if already changed
    const existingMpTime = crewEntries[0]?.meeting_point_time || defaultMeetingTime
    setCrewEntries(prev => [...prev, {
      team_member_id: member.id,
      member_name: `${member.first_name} ${member.last_name || ''}`.trim(),
      member_email: member.email || '', role: '2nd Photographer', checked: true,
      call_time: defaultCallTime,
      meeting_point_id: '', meeting_point: '', meeting_point_address: '',
      meeting_point_maps_url: '', meeting_point_custom: '', meeting_point_time: existingMpTime,
      equipment_pickup_location: '', equipment_pickup_time: '',
      equipment_dropoff_location: '', equipment_dropoff_time: '',
      special_notes: '', showEquipment: false,
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

  // ── Add new meeting point ──────────────────────────────────────

  const handleAddMeetingPoint = async () => {
    if (!newMpName.trim() || !newMpAddress.trim()) return
    const { data, error } = await supabase.from('meeting_points')
      .insert({ name: newMpName.trim(), address: newMpAddress.trim(), maps_url: mapsUrl(newMpAddress.trim()), is_active: true })
      .select('*').limit(1)
    if (!error && data?.[0]) {
      setMeetingPoints(prev => [...prev, data[0]])
      setNewMpName(''); setNewMpAddress(''); setShowAddMeetingPoint(false)
    }
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
          dress_code: dressCode, bridesmaids, groomsmen, vendors, key_moments: keyMoments,
          weather: weatherStr,
          attachments: uploadedDocs.filter(d => d.attachToEmail).map(d => ({ filename: d.name, path: d.path })),
          crew_members: checkedCrew.map(e => ({
            team_member_id: e.team_member_id, member_name: e.member_name,
            member_email: e.member_email, role: e.role, call_time: e.call_time,
            meeting_point: e.meeting_point, meeting_point_address: e.meeting_point_address,
            meeting_point_maps_url: e.meeting_point_maps_url, meeting_point_time: e.meeting_point_time,
            equipment_pickup_location: e.equipment_pickup_location,
            equipment_pickup_time: e.equipment_pickup_time,
            equipment_dropoff_location: e.equipment_dropoff_location,
            equipment_dropoff_time: e.equipment_dropoff_time,
            special_notes: e.special_notes,
          })),
        }),
      })
      const data = await res.json()
      if (data.success) {
        setSentTimestamp(new Date().toLocaleString('en-US', { timeZone: 'America/Toronto' }))
        fetchHistory(selectedCouple.id)
      }
    } catch (err) { console.error('Send failed:', err) }
    setSending(false)
  }

  // ── Available members to add ───────────────────────────────────

  const availableMembers = useMemo(() => {
    const usedIds = new Set(crewEntries.map(e => e.team_member_id))
    return teamMembers.filter(m => !usedIds.has(m.id))
  }, [teamMembers, crewEntries])

  // ── Helpers ────────────────────────────────────────────────────

  const formatWeddingDateUpper = (d: string | null) => {
    if (!d) return '—'
    const f = format(new Date(d + 'T12:00:00'), 'EEEE, MMMM d, yyyy')
    const parts = f.split(', ')
    return parts[0].toUpperCase() + ', ' + parts.slice(1).join(', ')
  }

  const calcCoverage = () => {
    if (!selectedContract?.start_time || !selectedContract?.end_time) return null
    return `${selectedContract.start_time} to ${selectedContract.end_time}`
  }

  const teamRequired = () => {
    const p = selectedContract?.num_photographers || 0
    const v = selectedContract?.num_videographers || 0
    return `${p}P + ${v}V`
  }

  // ── Styles ─────────────────────────────────────────────────────

  const inputStyle: React.CSSProperties = {
    width: '100%', padding: '6px 10px', borderRadius: '6px',
    border: '1px solid #e7e1d8', fontFamily: nunito.style.fontFamily,
    fontSize: '0.85rem', background: '#fff',
  }

  const labelStyle: React.CSSProperties = { fontSize: '0.75rem', fontWeight: 600, color: '#6b7280', display: 'block', marginBottom: '3px' }

  const cardStyle: React.CSSProperties = {
    background: '#fff', borderRadius: '12px', border: '1px solid #e7e1d8',
    padding: '1.25rem 1.5rem', marginBottom: '1.5rem',
    boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
  }

  const sectionTitle = (text: string) => (
    <h2 className={playfair.className} style={{ fontSize: '1.1rem', color: '#0d4f4f', margin: '0 0 1rem' }}>{text}</h2>
  )

  // ── Loading ────────────────────────────────────────────────────

  if (loading) {
    return <div className={nunito.className} style={{ padding: '2rem', textAlign: 'center', color: '#6b7280' }}>Loading...</div>
  }

  // ── Render ─────────────────────────────────────────────────────

  return (
    <div className={nunito.className} style={{ padding: '1.5rem 2rem', background: '#faf8f5', minHeight: '100vh' }}>

      {/* Header */}
      <div style={{ marginBottom: '1.5rem' }}>
        <h1 className={playfair.className} style={{ fontSize: '1.75rem', color: '#1a1a1a', margin: 0 }}>Crew Call Sheet</h1>
        <p style={{ margin: '4px 0 0', fontSize: '0.85rem', color: '#6b7280' }}>Send wedding details to your team</p>
      </div>

      {/* Section 1: Wedding Selector */}
      <div style={{ marginBottom: '1.5rem' }}>
        <select
          value={selectedCoupleId}
          onChange={e => setSelectedCoupleId(e.target.value)}
          style={{
            width: '100%', maxWidth: '500px', padding: '10px 14px', borderRadius: '8px',
            border: '1px solid #e7e1d8', fontFamily: nunito.style.fontFamily, fontSize: '0.9rem',
            background: '#fff', color: '#1a1a1a', cursor: 'pointer',
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
          {/* Section 2: Wedding Summary Card */}
          <div style={cardStyle}>
            {sectionTitle('Wedding Details')}
            <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr', gap: '6px 16px', fontSize: '0.85rem' }}>
              <span style={{ color: '#6b7280', fontWeight: 600 }}>Couple</span>
              <span style={{ color: '#1a1a1a', fontWeight: 700 }}>{selectedCouple.couple_name}</span>

              <span style={{ color: '#6b7280', fontWeight: 600 }}>Date</span>
              <span style={{ color: '#1a1a1a', fontWeight: 700 }}>{formatWeddingDateUpper(selectedCouple.wedding_date)}</span>

              <span style={{ color: '#6b7280', fontWeight: 600 }}>Weather</span>
              <span style={{ color: '#374151' }}>
                {weatherLoading ? 'Loading...' : weather.available ? (
                  <>High {weather.high}°C / Low {weather.low}°C | {weather.precipitation}% rain<br />Sunrise {weather.sunrise} | Sunset {weather.sunset}</>
                ) : 'Available closer to date'}
              </span>

              {selectedContract?.reception_venue && <>
                <span style={{ color: '#6b7280', fontWeight: 600 }}>Reception</span>
                <span style={{ color: '#374151' }}>
                  {selectedContract.reception_venue}
                  <a href={mapsUrl(selectedContract.reception_venue)} target="_blank" rel="noopener noreferrer" style={{ marginLeft: '6px', textDecoration: 'none' }}>📍</a>
                </span>
              </>}

              {selectedContract?.ceremony_location && <>
                <span style={{ color: '#6b7280', fontWeight: 600 }}>Ceremony</span>
                <span style={{ color: '#374151' }}>
                  {selectedContract.ceremony_location}
                  <a href={mapsUrl(selectedContract.ceremony_location)} target="_blank" rel="noopener noreferrer" style={{ marginLeft: '6px', textDecoration: 'none' }}>📍</a>
                </span>
              </>}

              {selectedCouple.park_location && <>
                <span style={{ color: '#6b7280', fontWeight: 600 }}>Park</span>
                <span style={{ color: '#374151' }}>
                  {selectedCouple.park_location}
                  <a href={mapsUrl(selectedCouple.park_location)} target="_blank" rel="noopener noreferrer" style={{ marginLeft: '6px', textDecoration: 'none' }}>📍</a>
                </span>
              </>}

              {calcCoverage() && <>
                <span style={{ color: '#6b7280', fontWeight: 600 }}>Coverage</span>
                <span style={{ color: '#374151' }}>{calcCoverage()}</span>
              </>}

              {selectedCouple.package_type && <>
                <span style={{ color: '#6b7280', fontWeight: 600 }}>Package</span>
                <span style={{ color: '#374151' }}>{selectedCouple.package_type === 'photo_only' ? 'Photo Only' : 'Photo & Video'}</span>
              </>}

              <span style={{ color: '#6b7280', fontWeight: 600 }}>Team Required</span>
              <span style={{ color: '#374151' }}>{teamRequired()}</span>

              <span style={{ color: '#6b7280', fontWeight: 600 }}>Wedding Day Form</span>
              <span>{selectedMilestone?.m15_day_form_approved
                ? <span style={{ color: '#0d4f4f', fontWeight: 700 }}>Received ✅</span>
                : <span style={{ color: '#dc2626', fontWeight: 700 }}>Missing 🚨</span>
              }</span>
            </div>

            {/* Bridal Party */}
            <div style={{ marginTop: '12px', display: 'flex', gap: '16px', alignItems: 'center' }}>
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

          {/* Section 3: Crew Assignment Cards */}
          <div style={{ marginBottom: '1.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
              <h2 className={playfair.className} style={{ fontSize: '1.1rem', color: '#0d4f4f', margin: 0 }}>Crew Assignments</h2>
              <div style={{ position: 'relative' }}>
                <button onClick={() => setShowAddCrew(!showAddCrew)} style={{
                  display: 'inline-flex', alignItems: 'center', gap: '4px',
                  padding: '6px 12px', borderRadius: '6px', border: '1px solid #e7e1d8',
                  background: '#fff', color: '#0d4f4f', fontWeight: 600, fontSize: '0.8rem',
                  cursor: 'pointer', fontFamily: nunito.style.fontFamily,
                }}>
                  <Plus size={14} /> Add Crew Member
                </button>
                {showAddCrew && availableMembers.length > 0 && (
                  <div style={{
                    position: 'absolute', top: '100%', right: 0, zIndex: 50,
                    background: '#fff', borderRadius: '8px', border: '1px solid #e7e1d8',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.12)', padding: '4px 0',
                    minWidth: '200px', marginTop: '4px',
                  }}>
                    {availableMembers.map(m => (
                      <button key={m.id} onClick={() => addCrewMember(m)} style={{
                        display: 'block', width: '100%', textAlign: 'left',
                        padding: '8px 12px', border: 'none', cursor: 'pointer',
                        fontSize: '0.85rem', fontFamily: nunito.style.fontFamily,
                        background: 'transparent', color: '#374151',
                      }}
                        onMouseEnter={e => { (e.target as HTMLElement).style.background = '#faf8f5' }}
                        onMouseLeave={e => { (e.target as HTMLElement).style.background = 'transparent' }}
                      >{m.first_name} {m.last_name || ''}</button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {crewEntries.map((entry, idx) => (
              <div key={entry.team_member_id} style={{
                background: '#fff', borderRadius: '10px', border: '1px solid #e7e1d8',
                marginBottom: '0.75rem', overflow: 'hidden',
                boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
                opacity: entry.checked ? 1 : 0.5,
              }}>
                {/* Card header */}
                <div style={{
                  display: 'flex', alignItems: 'center', gap: '10px',
                  padding: '10px 14px', background: '#faf8f5', borderBottom: '1px solid #e7e1d8',
                }}>
                  <input type="checkbox" checked={entry.checked}
                    onChange={e => updateEntry(idx, 'checked', e.target.checked)}
                    style={{ width: 18, height: 18, cursor: 'pointer' }} />
                  <span style={{ fontWeight: 700, fontSize: '0.9rem', color: '#1a1a1a', flex: 1 }}>{entry.member_name}</span>
                  <select value={entry.role} onChange={e => updateEntry(idx, 'role', e.target.value)} style={{
                    padding: '4px 8px', borderRadius: '6px', border: '1px solid #e7e1d8',
                    fontSize: '0.8rem', fontFamily: nunito.style.fontFamily, background: '#fff',
                  }}>
                    <option>Lead Photographer</option>
                    <option>2nd Photographer</option>
                    <option>Videographer</option>
                  </select>
                  <button onClick={() => removeCrew(idx)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9ca3af', padding: '2px' }}>
                    <X size={16} />
                  </button>
                </div>

                {/* Card body */}
                {entry.checked && (
                  <div style={{ padding: '14px' }}>
                    {/* Row 1: Call Time + Meeting Point Time */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
                      <TimePicker label="Call Time" value={entry.call_time} onChange={v => updateEntry(idx, 'call_time', v)} />
                      <TimePicker label="1st Location Start" value={entry.meeting_point_time} onChange={v => updateEntry(idx, 'meeting_point_time', v)} />
                    </div>

                    {/* Meeting Point Dropdown */}
                    <div style={{ marginBottom: '10px' }}>
                      <span style={labelStyle}>Meeting Point</span>
                      <select
                        value={entry.meeting_point_id}
                        onChange={e => handleMeetingPointChange(idx, e.target.value)}
                        style={{ ...inputStyle, marginBottom: '6px' }}
                      >
                        <option value="">Select meeting point...</option>
                        {meetingPoints.map(mp => (
                          <option key={mp.id} value={mp.id}>
                            {mp.name}{mp.usual_for ? ` — ${mp.usual_for}` : ''}
                          </option>
                        ))}
                        <option value="__venue__">The Venue (reception)</option>
                        <option value="__other__">Other (custom)</option>
                      </select>

                      {/* Other — custom input */}
                      {entry.meeting_point_id === '__other__' && (
                        <input
                          value={entry.meeting_point_custom}
                          onChange={e => handleCustomMeetingPoint(idx, e.target.value)}
                          placeholder="Enter custom address..."
                          style={{ ...inputStyle, marginBottom: '6px' }}
                        />
                      )}

                      {/* ── Address Display Card ── */}
                      {entry.meeting_point_address && (
                        <div style={{
                          background: '#f0faf9', border: '2px solid #0d4f4f', borderRadius: '10px',
                          padding: '14px 16px', marginTop: '4px',
                        }}>
                          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
                            <span style={{ fontSize: '1.5rem', lineHeight: 1 }}>📍</span>
                            <div style={{ flex: 1 }}>
                              <p style={{
                                margin: 0, fontWeight: 700, fontSize: '0.95rem', color: '#0d4f4f',
                              }}>{entry.meeting_point.split(' — ')[0]}</p>
                              <p style={{
                                margin: '3px 0 0', fontSize: '0.9rem', color: '#374151', lineHeight: 1.4,
                              }}>{entry.meeting_point_address}</p>
                            </div>
                          </div>
                          {entry.meeting_point_maps_url && (
                            <a
                              href={entry.meeting_point_maps_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              style={{
                                display: 'inline-flex', alignItems: 'center', gap: '6px',
                                marginTop: '10px', padding: '8px 16px', borderRadius: '6px',
                                background: '#0d4f4f', color: '#fff', textDecoration: 'none',
                                fontWeight: 700, fontSize: '0.85rem', fontFamily: nunito.style.fontFamily,
                              }}
                            >
                              🗺️ Open in Google Maps
                            </a>
                          )}
                        </div>
                      )}
                    </div>

                    {/* + Add Meeting Point link */}
                    {!showAddMeetingPoint ? (
                      <button onClick={() => setShowAddMeetingPoint(true)} style={{
                        background: 'none', border: 'none', cursor: 'pointer',
                        fontSize: '0.75rem', color: '#0d4f4f', fontWeight: 600,
                        padding: '0 0 8px', fontFamily: nunito.style.fontFamily,
                      }}>+ Add Meeting Point</button>
                    ) : (
                      <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-end', marginBottom: '8px', padding: '8px', background: '#faf8f5', borderRadius: '6px' }}>
                        <div style={{ flex: 1 }}>
                          <span style={labelStyle}>Name</span>
                          <input value={newMpName} onChange={e => setNewMpName(e.target.value)} placeholder="Tim Hortons — Location" style={inputStyle} />
                        </div>
                        <div style={{ flex: 1 }}>
                          <span style={labelStyle}>Address</span>
                          <input value={newMpAddress} onChange={e => setNewMpAddress(e.target.value)} placeholder="123 Street, City" style={inputStyle} />
                        </div>
                        <button onClick={handleAddMeetingPoint} style={{ padding: '6px 12px', borderRadius: '6px', border: 'none', background: '#0d4f4f', color: '#fff', fontWeight: 600, fontSize: '0.8rem', cursor: 'pointer', fontFamily: nunito.style.fontFamily, whiteSpace: 'nowrap' }}>Save</button>
                        <button onClick={() => setShowAddMeetingPoint(false)} style={{ padding: '6px 10px', borderRadius: '6px', border: '1px solid #e7e1d8', background: '#fff', color: '#6b7280', fontSize: '0.8rem', cursor: 'pointer', fontFamily: nunito.style.fontFamily }}>Cancel</button>
                      </div>
                    )}

                    {/* Equipment — collapsible */}
                    <div style={{ marginBottom: '10px' }}>
                      <button onClick={() => updateEntry(idx, 'showEquipment', !entry.showEquipment)} style={{
                        display: 'flex', alignItems: 'center', gap: '4px', background: 'none',
                        border: 'none', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 600,
                        color: '#6b7280', padding: '4px 0', fontFamily: nunito.style.fontFamily,
                      }}>
                        {entry.showEquipment ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                        Equipment Instructions
                      </button>
                      {entry.showEquipment && (
                        <div style={{ marginTop: '8px', paddingLeft: '18px' }}>
                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '10px' }}>
                            <div>
                              <span style={labelStyle}>Pickup Location</span>
                              <input value={entry.equipment_pickup_location} onChange={e => updateEntry(idx, 'equipment_pickup_location', e.target.value)} placeholder="Jean's house" style={inputStyle} />
                            </div>
                            <TimePicker label="Pickup Time" value={entry.equipment_pickup_time} onChange={v => updateEntry(idx, 'equipment_pickup_time', v)} />
                          </div>
                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                            <div>
                              <span style={labelStyle}>Dropoff Location</span>
                              <input value={entry.equipment_dropoff_location} onChange={e => updateEntry(idx, 'equipment_dropoff_location', e.target.value)} placeholder="Meet at reception venue" style={inputStyle} />
                            </div>
                            <TimePicker label="Dropoff Time" value={entry.equipment_dropoff_time} onChange={v => updateEntry(idx, 'equipment_dropoff_time', v)} />
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Special notes */}
                    <div>
                      <span style={labelStyle}>Special Notes</span>
                      <textarea value={entry.special_notes} onChange={e => updateEntry(idx, 'special_notes', e.target.value)}
                        placeholder="Bring the wireless mic kit" rows={2}
                        style={{ ...inputStyle, resize: 'vertical' as const }} />
                    </div>
                  </div>
                )}
              </div>
            ))}

            {crewEntries.length === 0 && (
              <div style={{ padding: '2rem', textAlign: 'center', color: '#9ca3af', fontSize: '0.85rem', background: '#fff', borderRadius: '10px', border: '1px solid #e7e1d8' }}>
                No crew assigned to this wedding yet. Check wedding assignments or add crew members manually.
              </div>
            )}
          </div>

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
              {showVendors ? <ChevronDown size={16} style={{ color: '#0d4f4f' }} /> : <ChevronRight size={16} style={{ color: '#0d4f4f' }} />}
              <h2 className={playfair.className} style={{ fontSize: '1.1rem', color: '#0d4f4f', margin: 0 }}>Key Vendors</h2>
            </button>
            {showVendors && (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px', marginTop: '12px' }}>
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
                textAlign: 'center', cursor: 'pointer', background: '#faf8f5',
                marginBottom: (uploadedDocs.length || uploadError) ? '12px' : 0,
                transition: 'border-color 0.2s',
              }}
              onClick={() => fileInputRef.current?.click()}
              onDragOver={e => { e.preventDefault(); e.stopPropagation(); (e.currentTarget as HTMLElement).style.borderColor = '#0d4f4f' }}
              onDragLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = '#e7e1d8' }}
              onDrop={e => { e.preventDefault(); e.stopPropagation(); (e.currentTarget as HTMLElement).style.borderColor = '#e7e1d8'; handleFileUpload(e.dataTransfer.files) }}
            >
              <Upload size={24} style={{ color: '#9ca3af', marginBottom: '6px' }} />
              <p style={{ margin: 0, fontSize: '0.85rem', color: '#6b7280' }}>
                {uploading ? 'Uploading...' : 'Drag & drop PDFs here or click to upload'}
              </p>
              <input ref={fileInputRef} type="file" accept=".pdf" multiple style={{ display: 'none' }}
                onChange={e => handleFileUpload(e.target.files)} />
            </div>

            {uploadError && (
              <p style={{ margin: '0 0 8px', fontSize: '0.8rem', color: '#dc2626', fontWeight: 600 }}>{uploadError}</p>
            )}

            {uploadedDocs.length > 0 && (
              <div>
                {uploadedDocs.map(doc => (
                  <div key={doc.path} style={{
                    display: 'flex', alignItems: 'center', gap: '10px',
                    padding: '8px 0', borderBottom: '1px solid #f0ece6', fontSize: '0.85rem',
                  }}>
                    <FileText size={16} style={{ color: '#0d4f4f', flexShrink: 0 }} />
                    <span style={{ flex: 1, color: '#374151', fontWeight: 600 }}>{doc.name}</span>
                    <span style={{ color: '#9ca3af', fontSize: '0.75rem' }}>
                      {doc.uploaded_at ? format(new Date(doc.uploaded_at), 'MMM d') : ''}
                    </span>
                    <button onClick={() => handleDownloadDoc(doc)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#6b7280', padding: '2px' }} title="Download"><Download size={14} /></button>
                    <button onClick={() => handleViewDoc(doc)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#6b7280', padding: '2px' }} title="View"><ExternalLink size={14} /></button>
                    <button onClick={() => handleDeleteDoc(doc)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#dc2626', padding: '2px' }} title="Delete"><Trash2 size={14} /></button>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer', fontSize: '0.75rem', color: '#6b7280' }}>
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

          {/* Action Buttons */}
          <div style={{ display: 'flex', gap: '10px', marginBottom: '1.5rem', alignItems: 'center' }}>
            <button onClick={() => { setShowPreview(true); setPreviewTab(0) }}
              disabled={!crewEntries.some(e => e.checked)}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: '6px',
                padding: '10px 20px', borderRadius: '8px', border: '1px solid #e7e1d8',
                background: '#fff', color: '#0d4f4f', fontWeight: 600, fontSize: '0.85rem',
                cursor: 'pointer', fontFamily: nunito.style.fontFamily,
                opacity: crewEntries.some(e => e.checked) ? 1 : 0.5,
              }}>
              <Eye size={16} /> Preview Email
            </button>

            {sentTimestamp ? (
              <div style={{
                display: 'inline-flex', alignItems: 'center', gap: '6px',
                padding: '10px 20px', borderRadius: '8px', border: 'none',
                background: '#e6f4f1', color: '#0d4f4f', fontWeight: 700, fontSize: '0.85rem',
                fontFamily: nunito.style.fontFamily,
              }}>
                <Check size={16} /> Sent {sentTimestamp}
              </div>
            ) : (
              <button onClick={handleSend}
                disabled={sending || !crewEntries.some(e => e.checked)}
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: '6px',
                  padding: '10px 24px', borderRadius: '8px', border: 'none',
                  background: '#0d4f4f', color: '#fff', fontWeight: 700, fontSize: '0.9rem',
                  cursor: 'pointer', fontFamily: nunito.style.fontFamily,
                  opacity: (sending || !crewEntries.some(e => e.checked)) ? 0.6 : 1,
                }}>
                <Send size={16} /> {sending ? 'Sending...' : 'Send Call Sheet'}
              </button>
            )}
          </div>

          {/* History */}
          {history.length > 0 && (
            <div style={{
              background: '#fff', borderRadius: '12px', border: '1px solid #e7e1d8',
              overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
            }}>
              <button onClick={() => setShowHistory(!showHistory)} style={{
                display: 'flex', alignItems: 'center', gap: '6px', width: '100%',
                padding: '12px 16px', border: 'none', background: '#faf8f5',
                cursor: 'pointer', fontFamily: nunito.style.fontFamily,
                fontSize: '0.85rem', fontWeight: 700, color: '#0d4f4f',
              }}>
                {showHistory ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                Previous Call Sheets ({history.length})
              </button>
              {showHistory && (
                <div style={{ padding: '0 16px 16px' }}>
                  {history.map(h => (
                    <div key={h.id} style={{ padding: '12px', borderBottom: '1px solid #f0ece6', fontSize: '0.85rem' }}>
                      <div style={{ fontWeight: 700, color: '#1a1a1a', marginBottom: '6px' }}>
                        Sent {h.sent_at ? format(new Date(h.sent_at), 'MMM d, yyyy h:mm a') : '—'}
                      </div>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                        {h.members.map((m, i) => (
                          <span key={i} style={{
                            display: 'inline-flex', alignItems: 'center', gap: '4px',
                            padding: '3px 8px', borderRadius: '6px', fontSize: '0.8rem',
                            background: m.confirmed ? '#e6f4f1' : m.email_sent ? '#fef3c7' : '#f3f4f6',
                            color: m.confirmed ? '#0d4f4f' : m.email_sent ? '#92400e' : '#6b7280',
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
          <div onClick={e => e.stopPropagation()} style={{
            background: '#faf8f5', borderRadius: '16px', width: '90%', maxWidth: '700px',
            maxHeight: '85vh', overflow: 'auto', padding: '2rem',
            boxShadow: '0 25px 50px rgba(0,0,0,0.25)', border: '1px solid #e7e1d8',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h2 className={playfair.className} style={{ fontSize: '1.25rem', color: '#1a1a1a', margin: 0 }}>Email Preview</h2>
              <button onClick={() => setShowPreview(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#6b7280' }}><X size={20} /></button>
            </div>

            {/* Tabs */}
            <div style={{ display: 'flex', gap: '4px', marginBottom: '1rem', flexWrap: 'wrap' }}>
              {crewEntries.filter(e => e.checked).map((entry, idx) => (
                <button key={entry.team_member_id} onClick={() => setPreviewTab(idx)} style={{
                  padding: '6px 14px', borderRadius: '6px',
                  border: previewTab === idx ? '2px solid #0d4f4f' : '1px solid #e7e1d8',
                  background: previewTab === idx ? '#e6f4f1' : '#fff',
                  color: previewTab === idx ? '#0d4f4f' : '#374151',
                  fontWeight: 600, fontSize: '0.8rem', cursor: 'pointer', fontFamily: nunito.style.fontFamily,
                }}>{entry.member_name}</button>
              ))}
            </div>

            {/* Preview content */}
            {(() => {
              const checked = crewEntries.filter(e => e.checked)
              const entry = checked[previewTab]
              if (!entry) return null
              const dateStr = selectedCouple?.wedding_date ? formatWeddingDateUpper(selectedCouple.wedding_date) : '—'

              return (
                <div style={{ background: '#fff', borderRadius: '10px', border: '1px solid #e7e1d8', overflow: 'hidden' }}>
                  <div style={{ background: '#0d4f4f', padding: '20px 24px', color: '#fff' }}>
                    <p style={{ margin: 0, fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '2px', opacity: 0.7 }}>SIGS Photography</p>
                    <h3 style={{ margin: '4px 0 0', fontSize: '1.1rem', fontFamily: 'Georgia, serif' }}>Crew Call Sheet</h3>
                  </div>
                  <div style={{ padding: '20px 24px', fontSize: '0.85rem' }}>
                    {/* Jean's phone — TOP */}
                    <div style={{ background: '#e6f4f1', borderRadius: '6px', padding: '8px 14px', marginBottom: '16px', textAlign: 'center' }}>
                      <p style={{ margin: 0, fontSize: '0.85rem', fontWeight: 700, color: '#0d4f4f' }}>📞 Questions? Call Jean: (416) 731-6748</p>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '90px 1fr', gap: '4px 12px', marginBottom: '16px' }}>
                      <span style={{ color: '#6b7280' }}>Couple</span>
                      <span style={{ fontWeight: 700 }}>{selectedCouple?.couple_name}</span>
                      <span style={{ color: '#6b7280' }}>Date</span>
                      <span style={{ fontWeight: 700 }}>{dateStr}</span>
                      {weather.available && <>
                        <span style={{ color: '#6b7280' }}>Weather</span>
                        <span>High {weather.high}°C / Low {weather.low}°C | {weather.precipitation}% rain</span>
                      </>}
                      {weather.available && <>
                        <span style={{ color: '#6b7280' }}></span>
                        <span>Sunrise {weather.sunrise} | Sunset {weather.sunset}</span>
                      </>}
                      {selectedContract?.ceremony_location && <>
                        <span style={{ color: '#6b7280' }}>Ceremony</span>
                        <span>{selectedContract.ceremony_location} 📍</span>
                      </>}
                      {selectedContract?.reception_venue && <>
                        <span style={{ color: '#6b7280' }}>Reception</span>
                        <span>{selectedContract.reception_venue} 📍</span>
                      </>}
                      {selectedCouple?.park_location && <>
                        <span style={{ color: '#6b7280' }}>Park</span>
                        <span>{selectedCouple.park_location} 📍</span>
                      </>}
                      {(bridesmaids || groomsmen) && <>
                        <span style={{ color: '#6b7280' }}>Bridal Party</span>
                        <span>{bridesmaids || '0'} bridesmaids + {groomsmen || '0'} groomsmen</span>
                      </>}
                    </div>

                    {dressCode && (
                      <div style={{ background: '#faf8f5', borderRadius: '6px', padding: '10px 14px', border: '1px solid #e7e1d8', marginBottom: '16px' }}>
                        <p style={{ margin: 0, fontSize: '0.9rem', fontWeight: 700, color: '#1a1a1a' }}>👔 DRESS CODE: {dressCode}</p>
                      </div>
                    )}

                    <div style={{ borderTop: '3px solid #0d4f4f', paddingTop: '16px' }}>
                      <p style={{ fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '2px', color: '#0d4f4f', margin: '0 0 10px' }}>Your Assignment</p>
                      <div style={{ display: 'grid', gridTemplateColumns: '100px 1fr', gap: '4px 12px' }}>
                        <span style={{ color: '#6b7280' }}>Name</span><span style={{ fontWeight: 700 }}>{entry.member_name}</span>
                        <span style={{ color: '#6b7280' }}>Role</span><span style={{ fontWeight: 700 }}>{entry.role}</span>
                        {entry.call_time && <><span style={{ color: '#6b7280' }}>Call Time</span><span style={{ fontWeight: 700 }}>{entry.call_time}</span></>}
                      </div>

                      {/* Meeting point with prominent address */}
                      {entry.meeting_point && (
                        <div style={{ marginTop: '12px', background: '#f0faf9', border: '2px solid #0d4f4f', borderRadius: '8px', padding: '12px 14px' }}>
                          <p style={{ margin: 0, fontWeight: 700, fontSize: '0.9rem', color: '#0d4f4f' }}>
                            📍 {entry.meeting_point.split(' — ')[0]}
                          </p>
                          {entry.meeting_point_address && entry.meeting_point_address !== entry.meeting_point.split(' — ')[0] && (
                            <p style={{ margin: '3px 0 0', fontSize: '0.85rem', color: '#374151' }}>{entry.meeting_point_address}</p>
                          )}
                          {entry.meeting_point_time && <p style={{ margin: '4px 0 0', color: '#374151', fontWeight: 600 }}>⏰ Arrive by {entry.meeting_point_time}</p>}
                        </div>
                      )}

                      {(entry.equipment_pickup_location || entry.equipment_dropoff_location) && (
                        <div style={{ marginTop: '12px', borderTop: '1px solid #e7e1d8', paddingTop: '10px' }}>
                          <p style={{ fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', color: '#0d4f4f', margin: '0 0 6px' }}>Equipment</p>
                          {entry.equipment_pickup_location && <p style={{ margin: '2px 0', color: '#374151' }}>Pickup: {entry.equipment_pickup_location}{entry.equipment_pickup_time ? ` — ${entry.equipment_pickup_time}` : ''}</p>}
                          {entry.equipment_dropoff_location && <p style={{ margin: '2px 0', color: '#374151' }}>Dropoff: {entry.equipment_dropoff_location}{entry.equipment_dropoff_time ? ` — ${entry.equipment_dropoff_time}` : ''}</p>}
                        </div>
                      )}

                      {entry.special_notes && (
                        <div style={{ marginTop: '10px' }}><p style={{ margin: 0, color: '#374151' }}><strong>Notes:</strong> {entry.special_notes}</p></div>
                      )}

                      {Object.values(vendors).some(v => v) && (
                        <div style={{ marginTop: '12px', borderTop: '1px solid #e7e1d8', paddingTop: '10px' }}>
                          <p style={{ fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', color: '#0d4f4f', margin: '0 0 6px' }}>Key Vendors</p>
                          {vendors.dj_mc && <p style={{ margin: '2px 0', color: '#374151', fontSize: '0.85rem' }}>DJ/MC: {vendors.dj_mc}</p>}
                          {vendors.florist && <p style={{ margin: '2px 0', color: '#374151', fontSize: '0.85rem' }}>Florist: {vendors.florist}</p>}
                          {vendors.makeup && <p style={{ margin: '2px 0', color: '#374151', fontSize: '0.85rem' }}>Makeup: {vendors.makeup}</p>}
                          {vendors.hair && <p style={{ margin: '2px 0', color: '#374151', fontSize: '0.85rem' }}>Hair: {vendors.hair}</p>}
                          {vendors.planner && <p style={{ margin: '2px 0', color: '#374151', fontSize: '0.85rem' }}>Planner: {vendors.planner}</p>}
                          {vendors.transport && <p style={{ margin: '2px 0', color: '#374151', fontSize: '0.85rem' }}>Transport: {vendors.transport}</p>}
                        </div>
                      )}

                      {keyMoments && (
                        <div style={{ marginTop: '12px', background: '#fffbeb', borderRadius: '6px', padding: '10px 14px', border: '1px solid #fde68a' }}>
                          <p style={{ fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', color: '#92400e', margin: '0 0 6px' }}>📸 Must-Capture Moments</p>
                          {keyMoments.split('\n').filter(Boolean).map((line, i) => (
                            <p key={i} style={{ margin: '2px 0', color: '#374151', fontSize: '0.85rem' }}>• {line.replace(/^[-•]\s*/, '')}</p>
                          ))}
                        </div>
                      )}

                      {generalNotes && (
                        <div style={{ marginTop: '10px', borderTop: '1px solid #e7e1d8', paddingTop: '10px' }}>
                          <p style={{ margin: 0, color: '#374151' }}><strong>General Notes:</strong> {generalNotes}</p>
                        </div>
                      )}
                    </div>

                    <div style={{ textAlign: 'center', margin: '20px 0 10px' }}>
                      <span style={{ display: 'inline-block', padding: '12px 32px', background: '#0d4f4f', color: '#fff', borderRadius: '8px', fontWeight: 700 }}>
                        ✅ Click Here to Confirm
                      </span>
                    </div>

                    <p style={{ textAlign: 'center', fontSize: '0.8rem', color: '#6b7280', margin: '10px 0 0' }}>
                      📞 Questions? Call Jean: (416) 731-6748
                    </p>
                  </div>
                </div>
              )
            })()}
          </div>
        </div>
      )}
    </div>
  )
}
