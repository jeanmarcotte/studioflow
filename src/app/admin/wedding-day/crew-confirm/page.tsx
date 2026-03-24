'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { Send, X, ChevronDown, ChevronRight, Plus, Eye, UserPlus, Check, Clock, Mail } from 'lucide-react'
import { Playfair_Display, Nunito } from 'next/font/google'
import { format, parseISO } from 'date-fns'

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
  meeting_point: string
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

// ── Component ────────────────────────────────────────────────────

export default function CrewCallSheetPage() {
  const [couples, setCouples] = useState<Couple[]>([])
  const [contracts, setContracts] = useState<Contract[]>([])
  const [assignments, setAssignments] = useState<Assignment[]>([])
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([])
  const [milestones, setMilestones] = useState<Milestone[]>([])
  const [selectedCoupleId, setSelectedCoupleId] = useState<string>('')
  const [crewEntries, setCrewEntries] = useState<CrewEntry[]>([])
  const [generalNotes, setGeneralNotes] = useState('')
  const [sending, setSending] = useState(false)
  const [sentTimestamp, setSentTimestamp] = useState<string | null>(null)
  const [showPreview, setShowPreview] = useState(false)
  const [previewTab, setPreviewTab] = useState(0)
  const [history, setHistory] = useState<HistorySheet[]>([])
  const [showHistory, setShowHistory] = useState(false)
  const [showAddCrew, setShowAddCrew] = useState(false)
  const [loading, setLoading] = useState(true)

  // ── Fetch data ─────────────────────────────────────────────────

  const fetchData = useCallback(async () => {
    setLoading(true)
    const today = new Date().toISOString().split('T')[0]

    const [couplesRes, contractsRes, assignmentsRes, membersRes, milestonesRes] = await Promise.all([
      supabase.from('couples').select('id, couple_name, wedding_date, park_location, package_type')
        .gte('wedding_date', today).order('wedding_date', { ascending: true }),
      supabase.from('contracts').select('couple_id, ceremony_location, reception_venue, start_time, end_time, num_photographers, num_videographers, day_of_week'),
      supabase.from('wedding_assignments').select('couple_id, photo_1, photo_2, video_1'),
      supabase.from('team_members').select('id, first_name, last_name, email, status').in('status', ['active', 'probationary']),
      supabase.from('couple_milestones').select('couple_id, m15_day_form_approved'),
    ])

    if (couplesRes.data) setCouples(couplesRes.data)
    if (contractsRes.data) setContracts(contractsRes.data)
    if (assignmentsRes.data) setAssignments(assignmentsRes.data)
    if (membersRes.data) setTeamMembers(membersRes.data)
    if (milestonesRes.data) setMilestones(milestonesRes.data)
    setLoading(false)
  }, [])

  useEffect(() => { fetchData() }, [fetchData])

  // ── Derived data for selected couple ───────────────────────────

  const selectedCouple = useMemo(() => couples.find(c => c.id === selectedCoupleId) || null, [couples, selectedCoupleId])
  const selectedContract = useMemo(() => contracts.find(c => c.couple_id === selectedCoupleId) || null, [contracts, selectedCoupleId])
  const selectedAssignment = useMemo(() => assignments.find(a => a.couple_id === selectedCoupleId) || null, [assignments, selectedCoupleId])
  const selectedMilestone = useMemo(() => milestones.find(m => m.couple_id === selectedCoupleId) || null, [milestones, selectedCoupleId])

  // ── Build crew entries when couple changes ─────────────────────

  useEffect(() => {
    if (!selectedCoupleId || !selectedAssignment) {
      setCrewEntries([])
      setSentTimestamp(null)
      setHistory([])
      return
    }

    const entries: CrewEntry[] = []
    const addEntry = (name: string | null, role: string) => {
      if (!name) return
      const member = teamMembers.find(m => m.first_name === name)
      if (!member) return
      entries.push({
        team_member_id: member.id,
        member_name: `${member.first_name} ${member.last_name || ''}`.trim(),
        member_email: member.email || '',
        role,
        checked: true,
        call_time: '',
        meeting_point: '',
        meeting_point_time: '',
        equipment_pickup_location: '',
        equipment_pickup_time: '',
        equipment_dropoff_location: '',
        equipment_dropoff_time: '',
        special_notes: '',
        showEquipment: false,
      })
    }

    addEntry(selectedAssignment.photo_1, 'Lead Photographer')
    addEntry(selectedAssignment.photo_2, '2nd Photographer')
    addEntry(selectedAssignment.video_1, 'Videographer')

    setCrewEntries(entries)
    setSentTimestamp(null)

    // Fetch history for this couple
    fetchHistory(selectedCoupleId)
  }, [selectedCoupleId, selectedAssignment, teamMembers])

  const fetchHistory = async (coupleId: string) => {
    const { data: sheets } = await supabase
      .from('crew_call_sheets')
      .select('id, sent_at, notes')
      .eq('couple_id', coupleId)
      .order('sent_at', { ascending: false })

    if (!sheets?.length) { setHistory([]); return }

    const sheetIds = sheets.map(s => s.id)
    const { data: members } = await supabase
      .from('crew_call_sheet_members')
      .select('call_sheet_id, member_name, role, confirmed, email_sent')
      .in('call_sheet_id', sheetIds)

    const mapped: HistorySheet[] = sheets.map(s => ({
      id: s.id,
      sent_at: s.sent_at,
      notes: s.notes,
      members: (members || []).filter(m => m.call_sheet_id === s.id).map(m => ({
        member_name: m.member_name, role: m.role, confirmed: m.confirmed, email_sent: m.email_sent,
      })),
    }))

    setHistory(mapped)
  }

  // ── Crew entry updates ─────────────────────────────────────────

  const updateEntry = (idx: number, field: keyof CrewEntry, value: any) => {
    setCrewEntries(prev => prev.map((e, i) => i === idx ? { ...e, [field]: value } : e))
  }

  const addCrewMember = (member: TeamMember) => {
    if (crewEntries.some(e => e.team_member_id === member.id)) return
    setCrewEntries(prev => [...prev, {
      team_member_id: member.id,
      member_name: `${member.first_name} ${member.last_name || ''}`.trim(),
      member_email: member.email || '',
      role: '2nd Photographer',
      checked: true,
      call_time: '', meeting_point: '', meeting_point_time: '',
      equipment_pickup_location: '', equipment_pickup_time: '',
      equipment_dropoff_location: '', equipment_dropoff_time: '',
      special_notes: '', showEquipment: false,
    }])
    setShowAddCrew(false)
  }

  const removeCrew = (idx: number) => {
    setCrewEntries(prev => prev.filter((_, i) => i !== idx))
  }

  // ── Send handler ───────────────────────────────────────────────

  const handleSend = async () => {
    if (!selectedCouple) return
    const checkedCrew = crewEntries.filter(e => e.checked)
    if (!checkedCrew.length) return

    setSending(true)
    try {
      const res = await fetch('/api/admin/crew-call-sheet', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          couple_id: selectedCouple.id,
          couple_name: selectedCouple.couple_name,
          wedding_date: selectedCouple.wedding_date,
          day_of_week: selectedContract?.day_of_week || (selectedCouple.wedding_date ? format(new Date(selectedCouple.wedding_date + 'T12:00:00'), 'EEEE') : ''),
          ceremony_location: selectedContract?.ceremony_location || '',
          reception_venue: selectedContract?.reception_venue || '',
          park_location: selectedCouple.park_location || '',
          start_time: selectedContract?.start_time || '',
          end_time: selectedContract?.end_time || '',
          package_type: selectedCouple.package_type || '',
          notes: generalNotes,
          crew_members: checkedCrew.map(e => ({
            team_member_id: e.team_member_id,
            member_name: e.member_name,
            member_email: e.member_email,
            role: e.role,
            call_time: e.call_time,
            meeting_point: e.meeting_point,
            meeting_point_time: e.meeting_point_time,
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
    } catch (err) {
      console.error('Send failed:', err)
    }
    setSending(false)
  }

  // ── Available members to add ───────────────────────────────────

  const availableMembers = useMemo(() => {
    const usedIds = new Set(crewEntries.map(e => e.team_member_id))
    return teamMembers.filter(m => !usedIds.has(m.id))
  }, [teamMembers, crewEntries])

  // ── Helpers ────────────────────────────────────────────────────

  const formatWeddingDate = (d: string | null) => {
    if (!d) return '—'
    return format(new Date(d + 'T12:00:00'), 'EEEE, MMMM d, yyyy').replace(/^(\w)/, (_, c) => c.toUpperCase())
  }

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

  // ── Input component ────────────────────────────────────────────

  const inputStyle = {
    width: '100%', padding: '6px 10px', borderRadius: '6px',
    border: '1px solid #e7e1d8', fontFamily: nunito.style.fontFamily,
    fontSize: '0.85rem', background: '#fff',
  }

  const labelStyle = { fontSize: '0.75rem', fontWeight: 600 as const, color: '#6b7280', display: 'block', marginBottom: '3px' }

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
              {selectedContract && contracts.find(ct => ct.couple_id === c.id)?.reception_venue
                ? ` (${contracts.find(ct => ct.couple_id === c.id)?.reception_venue})`
                : ''}
            </option>
          ))}
        </select>
      </div>

      {selectedCouple && (
        <>
          {/* Section 2: Wedding Summary Card */}
          <div style={{
            background: '#fff', borderRadius: '12px', border: '1px solid #e7e1d8',
            padding: '1.25rem 1.5rem', marginBottom: '1.5rem',
            boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
          }}>
            <h2 className={playfair.className} style={{ fontSize: '1.1rem', color: '#0d4f4f', margin: '0 0 1rem' }}>Wedding Details</h2>
            <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr', gap: '6px 16px', fontSize: '0.85rem' }}>
              <span style={{ color: '#6b7280', fontWeight: 600 }}>Couple</span>
              <span style={{ color: '#1a1a1a', fontWeight: 700 }}>{selectedCouple.couple_name}</span>

              <span style={{ color: '#6b7280', fontWeight: 600 }}>Date</span>
              <span style={{ color: '#1a1a1a', fontWeight: 700 }}>{formatWeddingDateUpper(selectedCouple.wedding_date)}</span>

              {selectedContract?.reception_venue && <>
                <span style={{ color: '#6b7280', fontWeight: 600 }}>Reception</span>
                <span style={{ color: '#374151' }}>{selectedContract.reception_venue}</span>
              </>}

              {selectedContract?.ceremony_location && <>
                <span style={{ color: '#6b7280', fontWeight: 600 }}>Ceremony</span>
                <span style={{ color: '#374151' }}>{selectedContract.ceremony_location}</span>
              </>}

              {selectedCouple.park_location && <>
                <span style={{ color: '#6b7280', fontWeight: 600 }}>Park</span>
                <span style={{ color: '#374151' }}>{selectedCouple.park_location}</span>
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
          </div>

          {/* Section 3: Crew Assignment Cards */}
          <div style={{ marginBottom: '1.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
              <h2 className={playfair.className} style={{ fontSize: '1.1rem', color: '#0d4f4f', margin: 0 }}>Crew Assignments</h2>
              <div style={{ position: 'relative' }}>
                <button
                  onClick={() => setShowAddCrew(!showAddCrew)}
                  style={{
                    display: 'inline-flex', alignItems: 'center', gap: '4px',
                    padding: '6px 12px', borderRadius: '6px', border: '1px solid #e7e1d8',
                    background: '#fff', color: '#0d4f4f', fontWeight: 600, fontSize: '0.8rem',
                    cursor: 'pointer', fontFamily: nunito.style.fontFamily,
                  }}
                >
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
                      <button
                        key={m.id}
                        onClick={() => addCrewMember(m)}
                        style={{
                          display: 'block', width: '100%', textAlign: 'left',
                          padding: '8px 12px', border: 'none', cursor: 'pointer',
                          fontSize: '0.85rem', fontFamily: nunito.style.fontFamily,
                          background: 'transparent', color: '#374151',
                        }}
                        onMouseEnter={e => { (e.target as HTMLElement).style.background = '#faf8f5' }}
                        onMouseLeave={e => { (e.target as HTMLElement).style.background = 'transparent' }}
                      >
                        {m.first_name} {m.last_name || ''}
                      </button>
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
                  <input
                    type="checkbox" checked={entry.checked}
                    onChange={e => updateEntry(idx, 'checked', e.target.checked)}
                    style={{ width: 18, height: 18, cursor: 'pointer' }}
                  />
                  <span style={{ fontWeight: 700, fontSize: '0.9rem', color: '#1a1a1a', flex: 1 }}>
                    {entry.member_name}
                  </span>
                  <select
                    value={entry.role}
                    onChange={e => updateEntry(idx, 'role', e.target.value)}
                    style={{
                      padding: '4px 8px', borderRadius: '6px', border: '1px solid #e7e1d8',
                      fontSize: '0.8rem', fontFamily: nunito.style.fontFamily, background: '#fff',
                    }}
                  >
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
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px', marginBottom: '10px' }}>
                      <div>
                        <span style={labelStyle}>Call Time</span>
                        <input value={entry.call_time} onChange={e => updateEntry(idx, 'call_time', e.target.value)} placeholder="8:30 AM" style={inputStyle} />
                      </div>
                      <div>
                        <span style={labelStyle}>Meeting Point</span>
                        <input value={entry.meeting_point} onChange={e => updateEntry(idx, 'meeting_point', e.target.value)} placeholder="Tim Hortons, Jane & Rutherford" style={inputStyle} />
                      </div>
                      <div>
                        <span style={labelStyle}>Meeting Point Time</span>
                        <input value={entry.meeting_point_time} onChange={e => updateEntry(idx, 'meeting_point_time', e.target.value)} placeholder="9:30 AM" style={inputStyle} />
                      </div>
                    </div>

                    {/* Equipment — collapsible */}
                    <div style={{ marginBottom: '10px' }}>
                      <button
                        onClick={() => updateEntry(idx, 'showEquipment', !entry.showEquipment)}
                        style={{
                          display: 'flex', alignItems: 'center', gap: '4px', background: 'none',
                          border: 'none', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 600,
                          color: '#6b7280', padding: '4px 0', fontFamily: nunito.style.fontFamily,
                        }}
                      >
                        {entry.showEquipment ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                        Equipment Instructions
                      </button>
                      {entry.showEquipment && (
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginTop: '8px', paddingLeft: '18px' }}>
                          <div>
                            <span style={labelStyle}>Pickup Location</span>
                            <input value={entry.equipment_pickup_location} onChange={e => updateEntry(idx, 'equipment_pickup_location', e.target.value)} placeholder="Jean's house" style={inputStyle} />
                          </div>
                          <div>
                            <span style={labelStyle}>Pickup Time</span>
                            <input value={entry.equipment_pickup_time} onChange={e => updateEntry(idx, 'equipment_pickup_time', e.target.value)} placeholder="8:00 AM" style={inputStyle} />
                          </div>
                          <div>
                            <span style={labelStyle}>Dropoff Location</span>
                            <input value={entry.equipment_dropoff_location} onChange={e => updateEntry(idx, 'equipment_dropoff_location', e.target.value)} placeholder="Meet at reception venue" style={inputStyle} />
                          </div>
                          <div>
                            <span style={labelStyle}>Dropoff Time</span>
                            <input value={entry.equipment_dropoff_time} onChange={e => updateEntry(idx, 'equipment_dropoff_time', e.target.value)} placeholder="11:30 PM" style={inputStyle} />
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

          {/* Section 4: Additional Notes */}
          <div style={{
            background: '#fff', borderRadius: '12px', border: '1px solid #e7e1d8',
            padding: '1.25rem 1.5rem', marginBottom: '1.5rem',
            boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
          }}>
            <h2 className={playfair.className} style={{ fontSize: '1.1rem', color: '#0d4f4f', margin: '0 0 0.75rem' }}>Additional Notes</h2>
            <textarea
              value={generalNotes}
              onChange={e => setGeneralNotes(e.target.value)}
              placeholder="Parking is free at venue. Dress code: all black."
              rows={3}
              style={{ ...inputStyle, width: '100%', resize: 'vertical' as const }}
            />
          </div>

          {/* Section 5: Action Buttons */}
          <div style={{ display: 'flex', gap: '10px', marginBottom: '1.5rem', alignItems: 'center' }}>
            <button
              onClick={() => { setShowPreview(true); setPreviewTab(0) }}
              disabled={!crewEntries.some(e => e.checked)}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: '6px',
                padding: '10px 20px', borderRadius: '8px', border: '1px solid #e7e1d8',
                background: '#fff', color: '#0d4f4f', fontWeight: 600, fontSize: '0.85rem',
                cursor: 'pointer', fontFamily: nunito.style.fontFamily,
                opacity: crewEntries.some(e => e.checked) ? 1 : 0.5,
              }}
            >
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
              <button
                onClick={handleSend}
                disabled={sending || !crewEntries.some(e => e.checked)}
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: '6px',
                  padding: '10px 24px', borderRadius: '8px', border: 'none',
                  background: '#0d4f4f', color: '#fff', fontWeight: 700, fontSize: '0.9rem',
                  cursor: 'pointer', fontFamily: nunito.style.fontFamily,
                  opacity: (sending || !crewEntries.some(e => e.checked)) ? 0.6 : 1,
                }}
              >
                <Send size={16} /> {sending ? 'Sending...' : 'Send Call Sheet'}
              </button>
            )}
          </div>

          {/* Section 6: History */}
          {history.length > 0 && (
            <div style={{
              background: '#fff', borderRadius: '12px', border: '1px solid #e7e1d8',
              overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
            }}>
              <button
                onClick={() => setShowHistory(!showHistory)}
                style={{
                  display: 'flex', alignItems: 'center', gap: '6px', width: '100%',
                  padding: '12px 16px', border: 'none', background: '#faf8f5',
                  cursor: 'pointer', fontFamily: nunito.style.fontFamily,
                  fontSize: '0.85rem', fontWeight: 700, color: '#0d4f4f',
                }}
              >
                {showHistory ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                Previous Call Sheets ({history.length})
              </button>
              {showHistory && (
                <div style={{ padding: '0 16px 16px' }}>
                  {history.map(h => (
                    <div key={h.id} style={{
                      padding: '12px', borderBottom: '1px solid #f0ece6',
                      fontSize: '0.85rem',
                    }}>
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
        <div
          style={{
            position: 'fixed', inset: 0, zIndex: 1000,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(2px)',
          }}
          onClick={() => setShowPreview(false)}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{
              background: '#faf8f5', borderRadius: '16px', width: '90%', maxWidth: '700px',
              maxHeight: '85vh', overflow: 'auto', padding: '2rem',
              boxShadow: '0 25px 50px rgba(0,0,0,0.25)', border: '1px solid #e7e1d8',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h2 className={playfair.className} style={{ fontSize: '1.25rem', color: '#1a1a1a', margin: 0 }}>Email Preview</h2>
              <button onClick={() => setShowPreview(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#6b7280' }}><X size={20} /></button>
            </div>

            {/* Tabs */}
            <div style={{ display: 'flex', gap: '4px', marginBottom: '1rem', flexWrap: 'wrap' }}>
              {crewEntries.filter(e => e.checked).map((entry, idx) => (
                <button
                  key={entry.team_member_id}
                  onClick={() => setPreviewTab(idx)}
                  style={{
                    padding: '6px 14px', borderRadius: '6px',
                    border: previewTab === idx ? '2px solid #0d4f4f' : '1px solid #e7e1d8',
                    background: previewTab === idx ? '#e6f4f1' : '#fff',
                    color: previewTab === idx ? '#0d4f4f' : '#374151',
                    fontWeight: 600, fontSize: '0.8rem', cursor: 'pointer',
                    fontFamily: nunito.style.fontFamily,
                  }}
                >
                  {entry.member_name}
                </button>
              ))}
            </div>

            {/* Preview content */}
            {(() => {
              const checked = crewEntries.filter(e => e.checked)
              const entry = checked[previewTab]
              if (!entry) return null
              const dateStr = selectedCouple?.wedding_date ? formatWeddingDateUpper(selectedCouple.wedding_date) : '—'

              return (
                <div style={{
                  background: '#fff', borderRadius: '10px', border: '1px solid #e7e1d8',
                  overflow: 'hidden',
                }}>
                  {/* Email header preview */}
                  <div style={{ background: '#0d4f4f', padding: '20px 24px', color: '#fff' }}>
                    <p style={{ margin: 0, fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '2px', opacity: 0.7 }}>SIGS Photography</p>
                    <h3 style={{ margin: '4px 0 0', fontSize: '1.1rem', fontFamily: 'Georgia, serif' }}>Crew Call Sheet</h3>
                  </div>
                  <div style={{ padding: '20px 24px', fontSize: '0.85rem' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '90px 1fr', gap: '4px 12px', marginBottom: '16px' }}>
                      <span style={{ color: '#6b7280' }}>Couple</span>
                      <span style={{ fontWeight: 700 }}>{selectedCouple?.couple_name}</span>
                      <span style={{ color: '#6b7280' }}>Date</span>
                      <span style={{ fontWeight: 700 }}>{dateStr}</span>
                      {selectedContract?.ceremony_location && <>
                        <span style={{ color: '#6b7280' }}>Ceremony</span><span>{selectedContract.ceremony_location}</span>
                      </>}
                      {selectedContract?.reception_venue && <>
                        <span style={{ color: '#6b7280' }}>Reception</span><span>{selectedContract.reception_venue}</span>
                      </>}
                    </div>

                    <div style={{ borderTop: '3px solid #0d4f4f', paddingTop: '16px' }}>
                      <p style={{ fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '2px', color: '#0d4f4f', margin: '0 0 10px' }}>Your Assignment</p>
                      <div style={{ display: 'grid', gridTemplateColumns: '100px 1fr', gap: '4px 12px' }}>
                        <span style={{ color: '#6b7280' }}>Name</span><span style={{ fontWeight: 700 }}>{entry.member_name}</span>
                        <span style={{ color: '#6b7280' }}>Role</span><span style={{ fontWeight: 700 }}>{entry.role}</span>
                        {entry.call_time && <><span style={{ color: '#6b7280' }}>Call Time</span><span style={{ fontWeight: 700 }}>{entry.call_time}</span></>}
                      </div>

                      {entry.meeting_point && (
                        <div style={{ marginTop: '12px' }}>
                          <p style={{ margin: 0, color: '#374151' }}>📍 {entry.meeting_point}</p>
                          {entry.meeting_point_time && <p style={{ margin: '2px 0 0', color: '#374151' }}>⏰ Arrive by {entry.meeting_point_time}</p>}
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
                      Questions? Call Jean: (416) 731-6748
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
