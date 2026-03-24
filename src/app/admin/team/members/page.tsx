'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { UserPlus, X, ChevronUp, ChevronDown, Phone, Mail, AlertTriangle, Edit2, Save, XCircle } from 'lucide-react'
import { Playfair_Display, Nunito } from 'next/font/google'
import { format, parseISO, differenceInCalendarYears, differenceInMonths } from 'date-fns'

const playfair = Playfair_Display({ subsets: ['latin'], weight: ['700'] })
const nunito = Nunito({ subsets: ['latin'], weight: ['400', '600', '700'] })

// ── Types ────────────────────────────────────────────────────────

interface TeamMember {
  id: string
  first_name: string
  last_name: string | null
  phone: string | null
  email: string | null
  role: string
  pay_per_wedding: number
  skills: string[]
  status: string
  date_joined: string | null
  tenure_start: string | null
  avatar_url: string | null
  notes: string | null
  emergency_contact_name: string | null
  emergency_contact_phone: string | null
  pair_constraint: string | null
}

interface WeddingAssignment {
  couple_id: string
  photo_1: string | null
  photo_2: string | null
  video_1: string | null
  couple_name: string
  wedding_date: string | null
}

// ── Constants ────────────────────────────────────────────────────

const ROLE_LABELS: Record<string, string> = {
  owner: 'Owner',
  studio_manager: 'Studio Manager',
  photographer: 'Photographer',
  videographer: 'Videographer',
  both: 'Shooter',
}

const STATUS_CONFIG: Record<string, { label: string; bg: string; text: string }> = {
  active: { label: 'Active', bg: '#e6f4f1', text: '#0d4f4f' },
  probationary: { label: 'Probationary', bg: '#fef3c7', text: '#92400e' },
  interviewing: { label: 'Interviewing', bg: '#dbeafe', text: '#1e40af' },
  inactive: { label: 'Inactive', bg: '#f3f4f6', text: '#6b7280' },
}

const SKILL_CONFIG: Record<string, { label: string; bg: string; text: string }> = {
  principal: { label: 'Principal', bg: '#dbeafe', text: '#1e40af' },
  second: { label: '2nd', bg: '#e6f4f1', text: '#0d4f4f' },
  video: { label: 'Video', bg: '#ede9fe', text: '#6d28d9' },
}

const ROLE_OPTIONS = [
  { value: 'owner', label: 'Owner' },
  { value: 'studio_manager', label: 'Studio Manager' },
  { value: 'photographer', label: 'Photographer' },
  { value: 'videographer', label: 'Videographer' },
  { value: 'both', label: 'Shooter' },
]

const STATUS_OPTIONS = [
  { value: 'active', label: 'Active' },
  { value: 'probationary', label: 'Probationary' },
  { value: 'interviewing', label: 'Interviewing' },
  { value: 'inactive', label: 'Inactive' },
]

const SKILL_OPTIONS = ['principal', 'second', 'video']

const DEFAULT_AVATAR = 'data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22%3E%3Ccircle cx=%2250%22 cy=%2250%22 r=%2250%22 fill=%22%23e7e1d8%22/%3E%3Ctext x=%2250%22 y=%2258%22 text-anchor=%22middle%22 font-size=%2236%22 fill=%22%230d4f4f%22%3E%3F%3C/text%3E%3C/svg%3E'

// ── Helpers ──────────────────────────────────────────────────────

function formatTenure(tenureStart: string | null): string {
  if (!tenureStart) return '—'
  const start = parseISO(tenureStart)
  const now = new Date()
  const years = differenceInCalendarYears(now, start)
  if (years < 1) {
    const months = differenceInMonths(now, start)
    return months < 1 ? '< 1 month' : `${months} mo`
  }
  return years === 1 ? '1 year' : `${years} years`
}

function formatTenureLong(tenureStart: string | null): string {
  if (!tenureStart) return '—'
  const start = parseISO(tenureStart)
  const now = new Date()
  const years = differenceInCalendarYears(now, start)
  if (years < 1) return 'Less than 1 year with SIGS Photography'
  return `${years} year${years !== 1 ? 's' : ''} with SIGS Photography`
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-CA', { style: 'currency', currency: 'CAD', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(amount)
}

function getPayLabel(member: TeamMember): string {
  if (member.role === 'owner') return 'Owner'
  if (member.role === 'studio_manager') return 'Studio Mgr'
  return formatCurrency(member.pay_per_wedding)
}

// ── Sort types ───────────────────────────────────────────────────

type SortKey = 'name' | 'role' | 'status' | 'phone' | 'pay' | 'skills' | 'tenure' | 'weddings2026' | 'earned2026' | 'nextWedding'
type SortDir = 'asc' | 'desc'

const STATUS_ORDER: Record<string, number> = { active: 0, probationary: 1, interviewing: 2, inactive: 3 }

// ── Component ────────────────────────────────────────────────────

export default function TeamMembersPage() {
  const [members, setMembers] = useState<TeamMember[]>([])
  const [assignments, setAssignments] = useState<WeddingAssignment[]>([])
  const [loading, setLoading] = useState(true)
  const [sortKey, setSortKey] = useState<SortKey>('status')
  const [sortDir, setSortDir] = useState<SortDir>('asc')
  const [selectedMember, setSelectedMember] = useState<TeamMember | null>(null)
  const [editMode, setEditMode] = useState(false)
  const [editData, setEditData] = useState<Partial<TeamMember>>({})
  const [showAddModal, setShowAddModal] = useState(false)
  const [addData, setAddData] = useState<Partial<TeamMember>>({
    first_name: '', last_name: '', phone: '', email: '', role: 'both',
    status: 'interviewing', pay_per_wedding: 300, skills: [],
    date_joined: new Date().toISOString().split('T')[0],
    notes: '', emergency_contact_name: '', emergency_contact_phone: '',
    avatar_url: '', pair_constraint: '',
  })
  const [saving, setSaving] = useState(false)

  // ── Data fetching ────────────────────────────────────────────

  const fetchData = useCallback(async () => {
    setLoading(true)
    const [membersRes, assignmentsRes] = await Promise.all([
      supabase.from('team_members').select('id, first_name, last_name, phone, email, role, pay_per_wedding, skills, status, date_joined, tenure_start, avatar_url, notes, emergency_contact_name, emergency_contact_phone, pair_constraint'),
      supabase.from('wedding_assignments').select('couple_id, photo_1, photo_2, video_1, couples(couple_name, wedding_date)').not('couples', 'is', null),
    ])

    if (membersRes.data) setMembers(membersRes.data as TeamMember[])

    if (assignmentsRes.data) {
      const mapped = (assignmentsRes.data as any[]).map(a => ({
        couple_id: a.couple_id,
        photo_1: a.photo_1,
        photo_2: a.photo_2,
        video_1: a.video_1,
        couple_name: a.couples?.couple_name || '—',
        wedding_date: a.couples?.wedding_date || null,
      }))
      setAssignments(mapped)
    }
    setLoading(false)
  }, [])

  useEffect(() => { fetchData() }, [fetchData])

  // ── Computed: 2026 wedding stats per member ──────────────────

  const memberStats = useMemo(() => {
    const stats: Record<string, { total: number; completed: number; upcoming: number; earned: number; nextWedding: string | null; upcomingWeddings: { date: string; couple: string; role: string }[] }> = {}
    const today = new Date().toISOString().split('T')[0]

    for (const m of members) {
      stats[m.first_name] = { total: 0, completed: 0, upcoming: 0, earned: 0, nextWedding: null, upcomingWeddings: [] }
    }

    for (const a of assignments) {
      const wd = a.wedding_date
      if (!wd) continue
      const year = new Date(wd + 'T12:00:00').getFullYear()
      if (year !== 2026) continue

      const roles: { name: string; role: string }[] = []
      if (a.photo_1) roles.push({ name: a.photo_1, role: 'Photo 1' })
      if (a.photo_2) roles.push({ name: a.photo_2, role: 'Photo 2' })
      if (a.video_1) roles.push({ name: a.video_1, role: 'Video' })

      for (const r of roles) {
        const memberName = r.name
        if (!stats[memberName]) continue
        stats[memberName].total++
        if (wd < today) {
          stats[memberName].completed++
        } else {
          stats[memberName].upcoming++
          stats[memberName].upcomingWeddings.push({ date: wd, couple: a.couple_name, role: r.role })
        }
      }
    }

    // Calculate earned and next wedding
    for (const m of members) {
      const s = stats[m.first_name]
      if (!s) continue
      s.earned = s.total * m.pay_per_wedding
      s.upcomingWeddings.sort((a, b) => a.date.localeCompare(b.date))
      s.nextWedding = s.upcomingWeddings.length > 0 ? s.upcomingWeddings[0].date : null
    }

    return stats
  }, [members, assignments])

  // ── Metric tiles ─────────────────────────────────────────────

  const metrics = useMemo(() => {
    const activeCount = members.filter(m => m.status === 'active').length
    const probCount = members.filter(m => m.status === 'probationary').length
    const totalWeddings = Object.values(memberStats).reduce((sum, s) => sum + s.total, 0)
    const totalPayroll = members.reduce((sum, m) => {
      const s = memberStats[m.first_name]
      return sum + (s ? s.earned : 0)
    }, 0)
    return { activeCount, probCount, totalWeddings, totalPayroll }
  }, [members, memberStats])

  // ── Sorting ──────────────────────────────────────────────────

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    } else {
      setSortKey(key)
      setSortDir('asc')
    }
  }

  const sortedMembers = useMemo(() => {
    const sorted = [...members]
    const dir = sortDir === 'asc' ? 1 : -1

    sorted.sort((a, b) => {
      let cmp = 0
      const statsA = memberStats[a.first_name] || { total: 0, earned: 0, nextWedding: null }
      const statsB = memberStats[b.first_name] || { total: 0, earned: 0, nextWedding: null }

      switch (sortKey) {
        case 'name':
          cmp = `${a.first_name} ${a.last_name || ''}`.localeCompare(`${b.first_name} ${b.last_name || ''}`)
          break
        case 'role':
          cmp = (ROLE_LABELS[a.role] || a.role).localeCompare(ROLE_LABELS[b.role] || b.role)
          break
        case 'status':
          cmp = (STATUS_ORDER[a.status] ?? 9) - (STATUS_ORDER[b.status] ?? 9)
          if (cmp === 0) cmp = statsB.total - statsA.total
          break
        case 'phone':
          cmp = (a.phone || '').localeCompare(b.phone || '')
          break
        case 'pay':
          cmp = a.pay_per_wedding - b.pay_per_wedding
          break
        case 'skills':
          cmp = (a.skills?.length || 0) - (b.skills?.length || 0)
          break
        case 'tenure':
          cmp = (a.tenure_start || '9999').localeCompare(b.tenure_start || '9999')
          break
        case 'weddings2026':
          cmp = statsA.total - statsB.total
          break
        case 'earned2026':
          cmp = statsA.earned - statsB.earned
          break
        case 'nextWedding':
          cmp = (statsA.nextWedding || '9999').localeCompare(statsB.nextWedding || '9999')
          break
      }
      return cmp * dir
    })

    return sorted
  }, [members, sortKey, sortDir, memberStats])

  // ── Save handlers ────────────────────────────────────────────

  const handleSaveEdit = async () => {
    if (!selectedMember) return
    setSaving(true)
    const { error } = await supabase
      .from('team_members')
      .update({
        phone: editData.phone ?? selectedMember.phone,
        email: editData.email ?? selectedMember.email,
        role: editData.role ?? selectedMember.role,
        status: editData.status ?? selectedMember.status,
        pay_per_wedding: editData.pay_per_wedding ?? selectedMember.pay_per_wedding,
        skills: editData.skills ?? selectedMember.skills,
        emergency_contact_name: editData.emergency_contact_name ?? selectedMember.emergency_contact_name,
        emergency_contact_phone: editData.emergency_contact_phone ?? selectedMember.emergency_contact_phone,
        notes: editData.notes ?? selectedMember.notes,
        pair_constraint: editData.pair_constraint ?? selectedMember.pair_constraint,
      })
      .eq('id', selectedMember.id)

    if (!error) {
      await fetchData()
      const updated = { ...selectedMember, ...editData }
      setSelectedMember(updated as TeamMember)
      setEditMode(false)
    }
    setSaving(false)
  }

  const handleAddMember = async () => {
    if (!addData.first_name) return
    setSaving(true)
    const { error } = await supabase
      .from('team_members')
      .insert({
        first_name: addData.first_name,
        last_name: addData.last_name || null,
        phone: addData.phone || null,
        email: addData.email || null,
        role: addData.role || 'both',
        status: addData.status || 'interviewing',
        pay_per_wedding: addData.pay_per_wedding ?? 300,
        skills: addData.skills || [],
        date_joined: addData.date_joined || new Date().toISOString().split('T')[0],
        tenure_start: addData.date_joined || new Date().toISOString().split('T')[0],
        notes: addData.notes || null,
        emergency_contact_name: addData.emergency_contact_name || null,
        emergency_contact_phone: addData.emergency_contact_phone || null,
        avatar_url: addData.avatar_url || null,
        pair_constraint: addData.pair_constraint || null,
      })

    if (!error) {
      await fetchData()
      setShowAddModal(false)
      setAddData({
        first_name: '', last_name: '', phone: '', email: '', role: 'both',
        status: 'interviewing', pay_per_wedding: 300, skills: [],
        date_joined: new Date().toISOString().split('T')[0],
        notes: '', emergency_contact_name: '', emergency_contact_phone: '',
        avatar_url: '', pair_constraint: '',
      })
    }
    setSaving(false)
  }

  // ── Sort header component ────────────────────────────────────

  const SortHeader = ({ label, sortKeyVal, width }: { label: string; sortKeyVal: SortKey; width: string }) => (
    <th
      onClick={() => handleSort(sortKeyVal)}
      style={{
        width,
        padding: '10px 12px',
        textAlign: 'left',
        fontFamily: nunito.style.fontFamily,
        fontWeight: 700,
        fontSize: '0.75rem',
        textTransform: 'uppercase',
        letterSpacing: '0.05em',
        color: '#0d4f4f',
        cursor: 'pointer',
        userSelect: 'none',
        whiteSpace: 'nowrap',
        borderBottom: '2px solid #e7e1d8',
        background: '#faf8f5',
      }}
    >
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
        {label}
        {sortKey === sortKeyVal ? (
          sortDir === 'asc' ? <ChevronUp size={14} /> : <ChevronDown size={14} />
        ) : (
          <span style={{ opacity: 0.3 }}><ChevronDown size={14} /></span>
        )}
      </span>
    </th>
  )

  // ── Skill pills ──────────────────────────────────────────────

  const SkillPills = ({ skills }: { skills: string[] }) => (
    <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
      {(skills || []).map(skill => {
        const config = SKILL_CONFIG[skill]
        if (!config) return null
        return (
          <span key={skill} style={{
            display: 'inline-block',
            padding: '2px 8px',
            borderRadius: '9999px',
            fontSize: '0.7rem',
            fontWeight: 600,
            fontFamily: nunito.style.fontFamily,
            backgroundColor: config.bg,
            color: config.text,
          }}>
            {config.label}
          </span>
        )
      })}
    </div>
  )

  // ── Status pill ──────────────────────────────────────────────

  const StatusPill = ({ status }: { status: string }) => {
    const config = STATUS_CONFIG[status] || STATUS_CONFIG.inactive
    return (
      <span style={{
        display: 'inline-block',
        padding: '3px 10px',
        borderRadius: '9999px',
        fontSize: '0.75rem',
        fontWeight: 600,
        fontFamily: nunito.style.fontFamily,
        backgroundColor: config.bg,
        color: config.text,
      }}>
        {config.label}
      </span>
    )
  }

  // ── Loading state ────────────────────────────────────────────

  if (loading) {
    return (
      <div className={nunito.className} style={{ padding: '2rem', textAlign: 'center', color: '#6b7280' }}>
        Loading team members...
      </div>
    )
  }

  // ── Main render ──────────────────────────────────────────────

  return (
    <div className={nunito.className} style={{ padding: '1.5rem 2rem', background: '#faf8f5', minHeight: '100vh' }}>

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem' }}>
        <div>
          <h1 className={playfair.className} style={{ fontSize: '1.75rem', color: '#1a1a1a', margin: 0, lineHeight: 1.2 }}>
            Team Members
          </h1>
          <p style={{ margin: '4px 0 0', fontSize: '0.85rem', color: '#6b7280', fontWeight: 400 }}>
            SIGS Photography &middot; {metrics.activeCount} Active Members
          </p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          style={{
            display: 'inline-flex', alignItems: 'center', gap: '6px',
            padding: '8px 16px', borderRadius: '8px', border: 'none',
            background: '#0d4f4f', color: '#fff', fontWeight: 600,
            fontSize: '0.85rem', cursor: 'pointer', fontFamily: nunito.style.fontFamily,
          }}
        >
          <UserPlus size={16} /> Add Team Member
        </button>
      </div>

      {/* Metric Tiles */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem', marginBottom: '1.5rem' }}>
        {[
          { label: 'Active Members', value: String(metrics.activeCount), color: '#0d4f4f' },
          { label: '2026 Weddings Covered', value: String(metrics.totalWeddings), color: '#1e40af' },
          { label: 'Probationary', value: String(metrics.probCount), color: '#92400e' },
          { label: 'Total 2026 Payroll', value: formatCurrency(metrics.totalPayroll), color: '#6d28d9' },
        ].map((tile, i) => (
          <div key={i} style={{
            background: '#fff', borderRadius: '10px', padding: '1rem 1.25rem',
            border: '1px solid #e7e1d8',
            boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
          }}>
            <div style={{ fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#6b7280', marginBottom: '4px' }}>
              {tile.label}
            </div>
            <div style={{ fontSize: '1.5rem', fontWeight: 700, color: tile.color, fontFamily: playfair.style.fontFamily }}>
              {tile.value}
            </div>
          </div>
        ))}
      </div>

      {/* Table */}
      <div style={{ background: '#fff', borderRadius: '10px', border: '1px solid #e7e1d8', overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontFamily: nunito.style.fontFamily }}>
            <thead>
              <tr>
                <th style={{ width: '50px', padding: '10px 12px', borderBottom: '2px solid #e7e1d8', background: '#faf8f5' }}></th>
                <SortHeader label="Name" sortKeyVal="name" width="180px" />
                <SortHeader label="Role" sortKeyVal="role" width="120px" />
                <SortHeader label="Status" sortKeyVal="status" width="110px" />
                <SortHeader label="Phone" sortKeyVal="phone" width="140px" />
                <SortHeader label="Pay/Wedding" sortKeyVal="pay" width="100px" />
                <SortHeader label="Skills" sortKeyVal="skills" width="180px" />
                <SortHeader label="Tenure" sortKeyVal="tenure" width="100px" />
                <SortHeader label="2026 Wed." sortKeyVal="weddings2026" width="80px" />
                <SortHeader label="2026 Earned" sortKeyVal="earned2026" width="100px" />
                <SortHeader label="Next Wedding" sortKeyVal="nextWedding" width="120px" />
              </tr>
            </thead>
            <tbody>
              {sortedMembers.map((member, idx) => {
                const stats = memberStats[member.first_name] || { total: 0, earned: 0, nextWedding: null }
                return (
                  <tr key={member.id} style={{
                    borderBottom: '1px solid #f0ece6',
                    background: idx % 2 === 0 ? '#fff' : '#fdfcfa',
                    transition: 'background 0.15s',
                  }}
                  onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = '#f5f0eb' }}
                  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = idx % 2 === 0 ? '#fff' : '#fdfcfa' }}
                  >
                    {/* Avatar */}
                    <td style={{ padding: '8px 12px', verticalAlign: 'middle' }}>
                      <img
                        src={member.avatar_url || DEFAULT_AVATAR}
                        alt={member.first_name}
                        style={{ width: 40, height: 40, borderRadius: '50%', objectFit: 'cover', border: '2px solid #e7e1d8' }}
                        onError={e => { (e.target as HTMLImageElement).src = DEFAULT_AVATAR }}
                      />
                    </td>
                    {/* Name */}
                    <td style={{ padding: '8px 12px', verticalAlign: 'middle' }}>
                      <button
                        onClick={() => { setSelectedMember(member); setEditMode(false) }}
                        style={{
                          background: 'none', border: 'none', padding: 0, cursor: 'pointer',
                          fontWeight: 600, fontSize: '0.875rem', color: '#0d4f4f',
                          fontFamily: nunito.style.fontFamily, textAlign: 'left',
                        }}
                      >
                        {member.first_name} {member.last_name || ''}
                      </button>
                    </td>
                    {/* Role */}
                    <td style={{ padding: '8px 12px', verticalAlign: 'middle', fontSize: '0.85rem', color: '#374151' }}>
                      {ROLE_LABELS[member.role] || member.role}
                    </td>
                    {/* Status */}
                    <td style={{ padding: '8px 12px', verticalAlign: 'middle' }}>
                      <StatusPill status={member.status} />
                    </td>
                    {/* Phone */}
                    <td style={{ padding: '8px 12px', verticalAlign: 'middle', fontSize: '0.85rem', color: '#374151' }}>
                      {member.phone || '—'}
                    </td>
                    {/* Pay */}
                    <td style={{ padding: '8px 12px', verticalAlign: 'middle', fontSize: '0.85rem', color: '#374151' }}>
                      {getPayLabel(member)}
                    </td>
                    {/* Skills */}
                    <td style={{ padding: '8px 12px', verticalAlign: 'middle' }}>
                      <SkillPills skills={member.skills} />
                    </td>
                    {/* Tenure */}
                    <td style={{ padding: '8px 12px', verticalAlign: 'middle', fontSize: '0.85rem', color: '#374151' }}>
                      {formatTenure(member.tenure_start)}
                    </td>
                    {/* 2026 Weddings */}
                    <td style={{ padding: '8px 12px', verticalAlign: 'middle', fontSize: '0.85rem', fontWeight: 700, color: '#1e40af', textAlign: 'center' }}>
                      {stats.total}
                    </td>
                    {/* 2026 Earned */}
                    <td style={{ padding: '8px 12px', verticalAlign: 'middle', fontSize: '0.85rem', color: '#374151' }}>
                      {stats.earned > 0 ? formatCurrency(stats.earned) : '—'}
                    </td>
                    {/* Next Wedding */}
                    <td style={{ padding: '8px 12px', verticalAlign: 'middle', fontSize: '0.85rem', color: '#374151' }}>
                      {stats.nextWedding ? format(parseISO(stats.nextWedding), 'MMM d') : '—'}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Detail Modal ─────────────────────────────────────────── */}
      {selectedMember && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 1000,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(2px)',
        }}
        onClick={() => { setSelectedMember(null); setEditMode(false) }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{
              background: '#faf8f5', borderRadius: '16px', width: '90%', maxWidth: '640px',
              maxHeight: '85vh', overflow: 'auto', padding: '2rem',
              boxShadow: '0 25px 50px rgba(0,0,0,0.25)', border: '1px solid #e7e1d8',
            }}
          >
            {/* Close */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '0.5rem' }}>
              <button onClick={() => { setSelectedMember(null); setEditMode(false) }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#6b7280' }}>
                <X size={20} />
              </button>
            </div>

            {/* Top section */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem', marginBottom: '1.5rem' }}>
              <img
                src={selectedMember.avatar_url || DEFAULT_AVATAR}
                alt={selectedMember.first_name}
                style={{ width: 100, height: 100, borderRadius: '50%', objectFit: 'cover', border: '3px solid #e7e1d8' }}
                onError={e => { (e.target as HTMLImageElement).src = DEFAULT_AVATAR }}
              />
              <div>
                <h2 className={playfair.className} style={{ fontSize: '1.5rem', margin: 0, color: '#1a1a1a' }}>
                  {selectedMember.first_name} {selectedMember.last_name || ''}
                </h2>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginTop: '6px' }}>
                  <span style={{ fontSize: '0.85rem', color: '#374151', fontWeight: 600 }}>
                    {ROLE_LABELS[editMode ? (editData.role ?? selectedMember.role) : selectedMember.role] || selectedMember.role}
                  </span>
                  <StatusPill status={editMode ? (editData.status ?? selectedMember.status) : selectedMember.status} />
                </div>
                {selectedMember.pair_constraint && !editMode && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginTop: '6px', fontSize: '0.8rem', color: '#d97706' }}>
                    <AlertTriangle size={14} /> {selectedMember.pair_constraint}
                  </div>
                )}
              </div>
            </div>

            {/* Edit mode fields or view mode sections */}
            {editMode ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {/* Phone & Email */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                  <label style={{ fontSize: '0.8rem', fontWeight: 600, color: '#374151' }}>
                    Phone
                    <input type="tel" value={editData.phone ?? selectedMember.phone ?? ''} onChange={e => setEditData(d => ({ ...d, phone: e.target.value }))}
                      style={{ display: 'block', width: '100%', marginTop: '4px', padding: '6px 10px', borderRadius: '6px', border: '1px solid #e7e1d8', fontFamily: nunito.style.fontFamily, fontSize: '0.85rem' }} />
                  </label>
                  <label style={{ fontSize: '0.8rem', fontWeight: 600, color: '#374151' }}>
                    Email
                    <input type="email" value={editData.email ?? selectedMember.email ?? ''} onChange={e => setEditData(d => ({ ...d, email: e.target.value }))}
                      style={{ display: 'block', width: '100%', marginTop: '4px', padding: '6px 10px', borderRadius: '6px', border: '1px solid #e7e1d8', fontFamily: nunito.style.fontFamily, fontSize: '0.85rem' }} />
                  </label>
                </div>
                {/* Role & Status */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                  <label style={{ fontSize: '0.8rem', fontWeight: 600, color: '#374151' }}>
                    Role
                    <select value={editData.role ?? selectedMember.role} onChange={e => setEditData(d => ({ ...d, role: e.target.value }))}
                      style={{ display: 'block', width: '100%', marginTop: '4px', padding: '6px 10px', borderRadius: '6px', border: '1px solid #e7e1d8', fontFamily: nunito.style.fontFamily, fontSize: '0.85rem' }}>
                      {ROLE_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                    </select>
                  </label>
                  <label style={{ fontSize: '0.8rem', fontWeight: 600, color: '#374151' }}>
                    Status
                    <select value={editData.status ?? selectedMember.status} onChange={e => setEditData(d => ({ ...d, status: e.target.value }))}
                      style={{ display: 'block', width: '100%', marginTop: '4px', padding: '6px 10px', borderRadius: '6px', border: '1px solid #e7e1d8', fontFamily: nunito.style.fontFamily, fontSize: '0.85rem' }}>
                      {STATUS_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                    </select>
                  </label>
                </div>
                {/* Pay */}
                <label style={{ fontSize: '0.8rem', fontWeight: 600, color: '#374151' }}>
                  Pay Per Wedding ($)
                  <input type="number" value={editData.pay_per_wedding ?? selectedMember.pay_per_wedding} onChange={e => setEditData(d => ({ ...d, pay_per_wedding: Number(e.target.value) }))}
                    style={{ display: 'block', width: '120px', marginTop: '4px', padding: '6px 10px', borderRadius: '6px', border: '1px solid #e7e1d8', fontFamily: nunito.style.fontFamily, fontSize: '0.85rem' }} />
                </label>
                {/* Skills */}
                <div>
                  <span style={{ fontSize: '0.8rem', fontWeight: 600, color: '#374151' }}>Skills</span>
                  <div style={{ display: 'flex', gap: '1rem', marginTop: '4px' }}>
                    {SKILL_OPTIONS.map(skill => {
                      const currentSkills = editData.skills ?? selectedMember.skills ?? []
                      const checked = currentSkills.includes(skill)
                      return (
                        <label key={skill} style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.85rem', cursor: 'pointer' }}>
                          <input type="checkbox" checked={checked} onChange={() => {
                            const next = checked ? currentSkills.filter(s => s !== skill) : [...currentSkills, skill]
                            setEditData(d => ({ ...d, skills: next }))
                          }} />
                          {SKILL_CONFIG[skill]?.label || skill}
                        </label>
                      )
                    })}
                  </div>
                </div>
                {/* Emergency Contact */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                  <label style={{ fontSize: '0.8rem', fontWeight: 600, color: '#374151' }}>
                    Emergency Contact Name
                    <input value={editData.emergency_contact_name ?? selectedMember.emergency_contact_name ?? ''} onChange={e => setEditData(d => ({ ...d, emergency_contact_name: e.target.value }))}
                      style={{ display: 'block', width: '100%', marginTop: '4px', padding: '6px 10px', borderRadius: '6px', border: '1px solid #e7e1d8', fontFamily: nunito.style.fontFamily, fontSize: '0.85rem' }} />
                  </label>
                  <label style={{ fontSize: '0.8rem', fontWeight: 600, color: '#374151' }}>
                    Emergency Contact Phone
                    <input value={editData.emergency_contact_phone ?? selectedMember.emergency_contact_phone ?? ''} onChange={e => setEditData(d => ({ ...d, emergency_contact_phone: e.target.value }))}
                      style={{ display: 'block', width: '100%', marginTop: '4px', padding: '6px 10px', borderRadius: '6px', border: '1px solid #e7e1d8', fontFamily: nunito.style.fontFamily, fontSize: '0.85rem' }} />
                  </label>
                </div>
                {/* Pair Constraint */}
                <label style={{ fontSize: '0.8rem', fontWeight: 600, color: '#374151' }}>
                  Pair Constraint
                  <input value={editData.pair_constraint ?? selectedMember.pair_constraint ?? ''} onChange={e => setEditData(d => ({ ...d, pair_constraint: e.target.value }))}
                    style={{ display: 'block', width: '100%', marginTop: '4px', padding: '6px 10px', borderRadius: '6px', border: '1px solid #e7e1d8', fontFamily: nunito.style.fontFamily, fontSize: '0.85rem' }} />
                </label>
                {/* Notes */}
                <label style={{ fontSize: '0.8rem', fontWeight: 600, color: '#374151' }}>
                  Notes
                  <textarea value={editData.notes ?? selectedMember.notes ?? ''} onChange={e => setEditData(d => ({ ...d, notes: e.target.value }))} rows={3}
                    style={{ display: 'block', width: '100%', marginTop: '4px', padding: '6px 10px', borderRadius: '6px', border: '1px solid #e7e1d8', fontFamily: nunito.style.fontFamily, fontSize: '0.85rem', resize: 'vertical' }} />
                </label>
                {/* Save / Cancel */}
                <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', marginTop: '0.5rem' }}>
                  <button onClick={() => { setEditMode(false); setEditData({}) }} style={{
                    display: 'inline-flex', alignItems: 'center', gap: '4px',
                    padding: '8px 16px', borderRadius: '8px', border: '1px solid #e7e1d8',
                    background: '#fff', color: '#374151', fontWeight: 600, fontSize: '0.85rem',
                    cursor: 'pointer', fontFamily: nunito.style.fontFamily,
                  }}>
                    <XCircle size={16} /> Cancel
                  </button>
                  <button onClick={handleSaveEdit} disabled={saving} style={{
                    display: 'inline-flex', alignItems: 'center', gap: '4px',
                    padding: '8px 16px', borderRadius: '8px', border: 'none',
                    background: '#0d4f4f', color: '#fff', fontWeight: 600, fontSize: '0.85rem',
                    cursor: 'pointer', fontFamily: nunito.style.fontFamily,
                    opacity: saving ? 0.7 : 1,
                  }}>
                    <Save size={16} /> {saving ? 'Saving...' : 'Save'}
                  </button>
                </div>
              </div>
            ) : (
              <>
                {/* Contact Section */}
                <div style={{ marginBottom: '1.25rem', padding: '1rem', background: '#fff', borderRadius: '10px', border: '1px solid #e7e1d8' }}>
                  <h3 style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#6b7280', marginTop: 0, marginBottom: '10px' }}>Contact</h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '0.85rem' }}>
                    {selectedMember.phone && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <Phone size={14} color="#0d4f4f" />
                        <a href={`tel:${selectedMember.phone}`} style={{ color: '#0d4f4f', textDecoration: 'none' }}>{selectedMember.phone}</a>
                      </div>
                    )}
                    {selectedMember.email && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <Mail size={14} color="#0d4f4f" />
                        <a href={`mailto:${selectedMember.email}`} style={{ color: '#0d4f4f', textDecoration: 'none' }}>{selectedMember.email}</a>
                      </div>
                    )}
                    {selectedMember.emergency_contact_name && (
                      <div style={{ marginTop: '6px', fontSize: '0.8rem', color: '#6b7280' }}>
                        <strong>Emergency:</strong> {selectedMember.emergency_contact_name}
                        {selectedMember.emergency_contact_phone && (
                          <> &middot; <a href={`tel:${selectedMember.emergency_contact_phone}`} style={{ color: '#0d4f4f' }}>{selectedMember.emergency_contact_phone}</a></>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {/* Details Section */}
                <div style={{ marginBottom: '1.25rem', padding: '1rem', background: '#fff', borderRadius: '10px', border: '1px solid #e7e1d8' }}>
                  <h3 style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#6b7280', marginTop: 0, marginBottom: '10px' }}>Details</h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '0.85rem', color: '#374151' }}>
                    <div><strong>Joined:</strong> {selectedMember.date_joined ? format(parseISO(selectedMember.date_joined), 'MMMM yyyy') : '—'} &middot; {formatTenureLong(selectedMember.tenure_start)}</div>
                    <div><strong>Pay Rate:</strong> {getPayLabel(selectedMember)}</div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><strong>Skills:</strong> <SkillPills skills={selectedMember.skills} /></div>
                    {selectedMember.notes && (
                      <div style={{ marginTop: '6px', padding: '8px 10px', background: '#faf8f5', borderRadius: '6px', fontSize: '0.8rem', color: '#6b7280', lineHeight: 1.5 }}>
                        {selectedMember.notes}
                      </div>
                    )}
                  </div>
                </div>

                {/* 2026 Season Stats */}
                {(() => {
                  const stats = memberStats[selectedMember.first_name] || { total: 0, completed: 0, upcoming: 0, earned: 0, upcomingWeddings: [] }
                  return (
                    <>
                      <div style={{ marginBottom: '1.25rem', padding: '1rem', background: '#fff', borderRadius: '10px', border: '1px solid #e7e1d8' }}>
                        <h3 style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#6b7280', marginTop: 0, marginBottom: '10px' }}>2026 Season Stats</h3>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.75rem' }}>
                          {[
                            { label: 'Assigned', value: stats.total, color: '#1e40af' },
                            { label: 'Completed', value: stats.completed, color: '#0d4f4f' },
                            { label: 'Upcoming', value: stats.upcoming, color: '#d97706' },
                            { label: 'Earned YTD', value: formatCurrency(stats.earned), color: '#6d28d9' },
                          ].map((s, i) => (
                            <div key={i} style={{ textAlign: 'center' }}>
                              <div style={{ fontSize: '1.25rem', fontWeight: 700, color: s.color, fontFamily: playfair.style.fontFamily }}>{s.value}</div>
                              <div style={{ fontSize: '0.7rem', color: '#6b7280', fontWeight: 600, textTransform: 'uppercase' }}>{s.label}</div>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Upcoming Weddings */}
                      {stats.upcomingWeddings.length > 0 && (
                        <div style={{ marginBottom: '1.25rem', padding: '1rem', background: '#fff', borderRadius: '10px', border: '1px solid #e7e1d8' }}>
                          <h3 style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#6b7280', marginTop: 0, marginBottom: '10px' }}>Upcoming Weddings</h3>
                          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                            <thead>
                              <tr style={{ borderBottom: '1px solid #e7e1d8' }}>
                                <th style={{ textAlign: 'left', padding: '6px 0', fontSize: '0.75rem', fontWeight: 700, color: '#6b7280', textTransform: 'uppercase' }}>Date</th>
                                <th style={{ textAlign: 'left', padding: '6px 0', fontSize: '0.75rem', fontWeight: 700, color: '#6b7280', textTransform: 'uppercase' }}>Couple</th>
                                <th style={{ textAlign: 'left', padding: '6px 0', fontSize: '0.75rem', fontWeight: 700, color: '#6b7280', textTransform: 'uppercase' }}>Role</th>
                              </tr>
                            </thead>
                            <tbody>
                              {stats.upcomingWeddings.slice(0, 5).map((w, i) => (
                                <tr key={i} style={{ borderBottom: '1px solid #f0ece6' }}>
                                  <td style={{ padding: '6px 0', color: '#374151' }}>{format(parseISO(w.date), 'MMM d')}</td>
                                  <td style={{ padding: '6px 0', color: '#374151' }}>{w.couple}</td>
                                  <td style={{ padding: '6px 0', color: '#374151' }}>{w.role}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </>
                  )
                })()}

                {/* Footer buttons */}
                <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                  <button onClick={() => { setEditMode(true); setEditData({}) }} style={{
                    display: 'inline-flex', alignItems: 'center', gap: '4px',
                    padding: '8px 16px', borderRadius: '8px', border: '1px solid #e7e1d8',
                    background: '#fff', color: '#0d4f4f', fontWeight: 600, fontSize: '0.85rem',
                    cursor: 'pointer', fontFamily: nunito.style.fontFamily,
                  }}>
                    <Edit2 size={16} /> Edit
                  </button>
                  <button onClick={() => { setSelectedMember(null); setEditMode(false) }} style={{
                    padding: '8px 16px', borderRadius: '8px', border: 'none',
                    background: '#0d4f4f', color: '#fff', fontWeight: 600, fontSize: '0.85rem',
                    cursor: 'pointer', fontFamily: nunito.style.fontFamily,
                  }}>
                    Close
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* ── Add Member Modal ──────────────────────────────────────── */}
      {showAddModal && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 1000,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(2px)',
        }}
        onClick={() => setShowAddModal(false)}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{
              background: '#faf8f5', borderRadius: '16px', width: '90%', maxWidth: '560px',
              maxHeight: '85vh', overflow: 'auto', padding: '2rem',
              boxShadow: '0 25px 50px rgba(0,0,0,0.25)', border: '1px solid #e7e1d8',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <h2 className={playfair.className} style={{ fontSize: '1.25rem', margin: 0, color: '#1a1a1a' }}>Add Team Member</h2>
              <button onClick={() => setShowAddModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#6b7280' }}>
                <X size={20} />
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {/* Names */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <label style={{ fontSize: '0.8rem', fontWeight: 600, color: '#374151' }}>
                  First Name *
                  <input value={addData.first_name || ''} onChange={e => setAddData(d => ({ ...d, first_name: e.target.value }))}
                    style={{ display: 'block', width: '100%', marginTop: '4px', padding: '6px 10px', borderRadius: '6px', border: '1px solid #e7e1d8', fontFamily: nunito.style.fontFamily, fontSize: '0.85rem' }} />
                </label>
                <label style={{ fontSize: '0.8rem', fontWeight: 600, color: '#374151' }}>
                  Last Name
                  <input value={addData.last_name || ''} onChange={e => setAddData(d => ({ ...d, last_name: e.target.value }))}
                    style={{ display: 'block', width: '100%', marginTop: '4px', padding: '6px 10px', borderRadius: '6px', border: '1px solid #e7e1d8', fontFamily: nunito.style.fontFamily, fontSize: '0.85rem' }} />
                </label>
              </div>
              {/* Phone & Email */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <label style={{ fontSize: '0.8rem', fontWeight: 600, color: '#374151' }}>
                  Phone
                  <input type="tel" value={addData.phone || ''} onChange={e => setAddData(d => ({ ...d, phone: e.target.value }))}
                    style={{ display: 'block', width: '100%', marginTop: '4px', padding: '6px 10px', borderRadius: '6px', border: '1px solid #e7e1d8', fontFamily: nunito.style.fontFamily, fontSize: '0.85rem' }} />
                </label>
                <label style={{ fontSize: '0.8rem', fontWeight: 600, color: '#374151' }}>
                  Email
                  <input type="email" value={addData.email || ''} onChange={e => setAddData(d => ({ ...d, email: e.target.value }))}
                    style={{ display: 'block', width: '100%', marginTop: '4px', padding: '6px 10px', borderRadius: '6px', border: '1px solid #e7e1d8', fontFamily: nunito.style.fontFamily, fontSize: '0.85rem' }} />
                </label>
              </div>
              {/* Role & Status */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <label style={{ fontSize: '0.8rem', fontWeight: 600, color: '#374151' }}>
                  Role
                  <select value={addData.role || 'both'} onChange={e => setAddData(d => ({ ...d, role: e.target.value }))}
                    style={{ display: 'block', width: '100%', marginTop: '4px', padding: '6px 10px', borderRadius: '6px', border: '1px solid #e7e1d8', fontFamily: nunito.style.fontFamily, fontSize: '0.85rem' }}>
                    {ROLE_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </select>
                </label>
                <label style={{ fontSize: '0.8rem', fontWeight: 600, color: '#374151' }}>
                  Status
                  <select value={addData.status || 'interviewing'} onChange={e => setAddData(d => ({ ...d, status: e.target.value }))}
                    style={{ display: 'block', width: '100%', marginTop: '4px', padding: '6px 10px', borderRadius: '6px', border: '1px solid #e7e1d8', fontFamily: nunito.style.fontFamily, fontSize: '0.85rem' }}>
                    {STATUS_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </select>
                </label>
              </div>
              {/* Pay & Date Joined */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <label style={{ fontSize: '0.8rem', fontWeight: 600, color: '#374151' }}>
                  Pay Per Wedding ($)
                  <input type="number" value={addData.pay_per_wedding ?? 300} onChange={e => setAddData(d => ({ ...d, pay_per_wedding: Number(e.target.value) }))}
                    style={{ display: 'block', width: '100%', marginTop: '4px', padding: '6px 10px', borderRadius: '6px', border: '1px solid #e7e1d8', fontFamily: nunito.style.fontFamily, fontSize: '0.85rem' }} />
                </label>
                <label style={{ fontSize: '0.8rem', fontWeight: 600, color: '#374151' }}>
                  Date Joined
                  <input type="date" value={addData.date_joined || ''} onChange={e => setAddData(d => ({ ...d, date_joined: e.target.value }))}
                    style={{ display: 'block', width: '100%', marginTop: '4px', padding: '6px 10px', borderRadius: '6px', border: '1px solid #e7e1d8', fontFamily: nunito.style.fontFamily, fontSize: '0.85rem' }} />
                </label>
              </div>
              {/* Skills */}
              <div>
                <span style={{ fontSize: '0.8rem', fontWeight: 600, color: '#374151' }}>Skills</span>
                <div style={{ display: 'flex', gap: '1rem', marginTop: '4px' }}>
                  {SKILL_OPTIONS.map(skill => {
                    const currentSkills = addData.skills || []
                    const checked = currentSkills.includes(skill)
                    return (
                      <label key={skill} style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.85rem', cursor: 'pointer' }}>
                        <input type="checkbox" checked={checked} onChange={() => {
                          const next = checked ? currentSkills.filter(s => s !== skill) : [...currentSkills, skill]
                          setAddData(d => ({ ...d, skills: next }))
                        }} />
                        {SKILL_CONFIG[skill]?.label || skill}
                      </label>
                    )
                  })}
                </div>
              </div>
              {/* Emergency Contact */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <label style={{ fontSize: '0.8rem', fontWeight: 600, color: '#374151' }}>
                  Emergency Contact Name
                  <input value={addData.emergency_contact_name || ''} onChange={e => setAddData(d => ({ ...d, emergency_contact_name: e.target.value }))}
                    style={{ display: 'block', width: '100%', marginTop: '4px', padding: '6px 10px', borderRadius: '6px', border: '1px solid #e7e1d8', fontFamily: nunito.style.fontFamily, fontSize: '0.85rem' }} />
                </label>
                <label style={{ fontSize: '0.8rem', fontWeight: 600, color: '#374151' }}>
                  Emergency Contact Phone
                  <input value={addData.emergency_contact_phone || ''} onChange={e => setAddData(d => ({ ...d, emergency_contact_phone: e.target.value }))}
                    style={{ display: 'block', width: '100%', marginTop: '4px', padding: '6px 10px', borderRadius: '6px', border: '1px solid #e7e1d8', fontFamily: nunito.style.fontFamily, fontSize: '0.85rem' }} />
                </label>
              </div>
              {/* Avatar URL */}
              <label style={{ fontSize: '0.8rem', fontWeight: 600, color: '#374151' }}>
                Avatar URL (optional)
                <input value={addData.avatar_url || ''} onChange={e => setAddData(d => ({ ...d, avatar_url: e.target.value }))}
                  placeholder="https://..."
                  style={{ display: 'block', width: '100%', marginTop: '4px', padding: '6px 10px', borderRadius: '6px', border: '1px solid #e7e1d8', fontFamily: nunito.style.fontFamily, fontSize: '0.85rem' }} />
              </label>
              {/* Notes */}
              <label style={{ fontSize: '0.8rem', fontWeight: 600, color: '#374151' }}>
                Notes
                <textarea value={addData.notes || ''} onChange={e => setAddData(d => ({ ...d, notes: e.target.value }))} rows={2}
                  style={{ display: 'block', width: '100%', marginTop: '4px', padding: '6px 10px', borderRadius: '6px', border: '1px solid #e7e1d8', fontFamily: nunito.style.fontFamily, fontSize: '0.85rem', resize: 'vertical' }} />
              </label>
              {/* Save */}
              <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', marginTop: '0.5rem' }}>
                <button onClick={() => setShowAddModal(false)} style={{
                  padding: '8px 16px', borderRadius: '8px', border: '1px solid #e7e1d8',
                  background: '#fff', color: '#374151', fontWeight: 600, fontSize: '0.85rem',
                  cursor: 'pointer', fontFamily: nunito.style.fontFamily,
                }}>
                  Cancel
                </button>
                <button onClick={handleAddMember} disabled={saving || !addData.first_name} style={{
                  display: 'inline-flex', alignItems: 'center', gap: '4px',
                  padding: '8px 16px', borderRadius: '8px', border: 'none',
                  background: '#0d4f4f', color: '#fff', fontWeight: 600, fontSize: '0.85rem',
                  cursor: 'pointer', fontFamily: nunito.style.fontFamily,
                  opacity: (saving || !addData.first_name) ? 0.7 : 1,
                }}>
                  <UserPlus size={16} /> {saving ? 'Saving...' : 'Save'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
