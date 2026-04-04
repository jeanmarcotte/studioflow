'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { UserPlus, X, Phone, Mail, AlertTriangle, Edit2, Save, XCircle, Search, ChevronDown, ChevronRight } from 'lucide-react'
import { Playfair_Display, Nunito } from 'next/font/google'
import { format, parseISO, differenceInCalendarYears, differenceInMonths } from 'date-fns'
import { formatCurrency as fmtCurrency, formatTimelineDate, formatDate as fmtDate } from '@/lib/formatters'
import { ProductionPageHeader, ProductionPills, ProductionSidebar } from '@/components/shared'
import { ColumnDef } from '@tanstack/react-table'
import { DataTable } from '@/components/ui/data-table/data-table'
import { DataTableColumnHeader } from '@/components/ui/data-table/data-table-column-header'

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
  is_active: boolean | null
  team_tier: string | null
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
  return fmtCurrency(amount)
}

function getPayLabel(member: TeamMember): string {
  if (member.first_name === 'Jean') return 'Kisses 💋'
  if (member.first_name === 'Marianna') return '$1,000,000'
  return formatCurrency(member.pay_per_wedding)
}

// ── Component ────────────────────────────────────────────────────

export default function TeamMembersPage() {
  const [members, setMembers] = useState<TeamMember[]>([])
  const [assignments, setAssignments] = useState<WeddingAssignment[]>([])
  const [loading, setLoading] = useState(true)
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
  const [statusDropdownId, setStatusDropdownId] = useState<string | null>(null)
  const [collapsedLanes, setCollapsedLanes] = useState<Set<string>>(new Set())
  const [search, setSearch] = useState('')

  // ── Data fetching ────────────────────────────────────────────

  const fetchData = useCallback(async () => {
    setLoading(true)
    const [membersRes, assignmentsRes] = await Promise.all([
      supabase.from('team_members').select('id, first_name, last_name, phone, email, role, pay_per_wedding, skills, status, is_active, team_tier, date_joined, tenure_start, avatar_url, notes, emergency_contact_name, emergency_contact_phone, pair_constraint'),
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

    for (const m of members) {
      const s = stats[m.first_name]
      if (!s) continue
      s.earned = s.total * m.pay_per_wedding
      s.upcomingWeddings.sort((a, b) => a.date.localeCompare(b.date))
      s.nextWedding = s.upcomingWeddings.length > 0 ? s.upcomingWeddings[0].date : null
    }

    return stats
  }, [members, assignments])

  // ── Counts ───────────────────────────────────────────────────

  const counts = useMemo(() => {
    const activeCount = members.filter(m => m.status === 'active').length
    const probationaryCount = members.filter(m => m.status === 'probationary').length
    const inactiveCount = members.filter(m => m.status === 'inactive').length
    const totalCount = members.length

    // Core = team_tier 'core' AND active; fallback: active members with no team_tier
    const coreCount = members.filter(m =>
      m.status === 'active' && (m.team_tier === 'core' || m.team_tier == null)
    ).length
    // Backup = team_tier 'backup' AND active
    const backupCount = members.filter(m =>
      m.status === 'active' && m.team_tier === 'backup'
    ).length

    return { activeCount, probationaryCount, inactiveCount, totalCount, coreCount, backupCount }
  }, [members])

  // ── Toggle lanes ─────────────────────────────────────────────

  const toggleLane = (id: string) => {
    setCollapsedLanes(prev => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }

  // ── Filtered + sectioned members ─────────────────────────────

  const filteredMembers = useMemo(() => {
    if (!search.trim()) return members
    const q = search.toLowerCase()
    return members.filter(m =>
      `${m.first_name} ${m.last_name || ''}`.toLowerCase().includes(q) ||
      (m.role && ROLE_LABELS[m.role]?.toLowerCase().includes(q)) ||
      (m.status && m.status.toLowerCase().includes(q))
    )
  }, [members, search])

  const coreMembers = useMemo(() =>
    filteredMembers.filter(m => m.status === 'active' && (m.team_tier === 'core' || m.team_tier == null)),
    [filteredMembers]
  )
  const backupMembers = useMemo(() =>
    filteredMembers.filter(m => m.status === 'active' && m.team_tier === 'backup'),
    [filteredMembers]
  )
  const probationaryMembers = useMemo(() =>
    filteredMembers.filter(m => m.status === 'probationary'),
    [filteredMembers]
  )
  const inactiveMembers = useMemo(() =>
    filteredMembers.filter(m => m.status === 'inactive' || m.is_active === false),
    [filteredMembers]
  )

  // ── Quick status toggle ───────────────────────────────────────

  const handleStatusChange = async (memberId: string, newStatus: string) => {
    setStatusDropdownId(null)
    await supabase.from('team_members').update({ status: newStatus }).eq('id', memberId)
    setMembers(prev => prev.map(m => m.id === memberId ? { ...m, status: newStatus } : m))
    if (selectedMember?.id === memberId) setSelectedMember(prev => prev ? { ...prev, status: newStatus } : null)
  }

  useEffect(() => {
    if (!statusDropdownId) return
    const handler = () => setStatusDropdownId(null)
    document.addEventListener('click', handler)
    return () => document.removeEventListener('click', handler)
  }, [statusDropdownId])

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

  // ── Inline sub-components ────────────────────────────────────

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
            backgroundColor: config.bg,
            color: config.text,
          }}>
            {config.label}
          </span>
        )
      })}
    </div>
  )

  const StatusBadge = ({ status }: { status: string }) => {
    const config = STATUS_CONFIG[status] || STATUS_CONFIG.inactive
    return (
      <span style={{
        display: 'inline-block',
        padding: '3px 10px',
        borderRadius: '9999px',
        fontSize: '0.75rem',
        fontWeight: 600,
        backgroundColor: config.bg,
        color: config.text,
      }}>
        {config.label}
      </span>
    )
  }

  // ── DataTable columns ────────────────────────────────────────

  const memberColumns: ColumnDef<TeamMember>[] = useMemo(() => [
    {
      id: 'name',
      accessorFn: (row) => `${row.first_name} ${row.last_name || ''}`.trim(),
      header: ({ column }) => <DataTableColumnHeader column={column} title="Name" />,
      cell: ({ row }) => (
        <button
          onClick={() => { setSelectedMember(row.original); setEditMode(false) }}
          className="text-primary font-semibold text-sm hover:underline text-left"
        >
          {row.original.first_name}{row.original.last_name ? ` ${row.original.last_name}` : ''}
        </button>
      ),
    },
    {
      id: 'role',
      accessorFn: (row) => ROLE_LABELS[row.role] || row.role,
      header: ({ column }) => <DataTableColumnHeader column={column} title="Role" />,
      cell: ({ row }) => (
        <span className="text-sm">{ROLE_LABELS[row.original.role] || row.original.role}</span>
      ),
    },
    {
      id: 'status',
      accessorKey: 'status',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Status" />,
      cell: ({ row }) => <StatusBadge status={row.original.status} />,
    },
    {
      id: 'pay_rate_photo',
      accessorKey: 'pay_per_wedding',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Pay Rate" />,
      cell: ({ row }) => (
        <span className="text-sm">{getPayLabel(row.original)}</span>
      ),
    },
    {
      id: 'hire_date',
      accessorFn: (row) => row.tenure_start || row.date_joined || '',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Hire Date" />,
      cell: ({ row }) => {
        const date = row.original.tenure_start || row.original.date_joined
        return <span className="text-sm">{date ? fmtDate(date) : '—'}</span>
      },
    },
    {
      id: 'tenure',
      accessorFn: (row) => row.tenure_start || '',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Tenure" />,
      cell: ({ row }) => (
        <span className="text-sm text-muted-foreground">{formatTenure(row.original.tenure_start)}</span>
      ),
    },
  ], [])

  // ── Collapsible section renderer ─────────────────────────────

  const renderSection = (
    id: string,
    label: string,
    data: TeamMember[],
    badgeClass: string
  ) => {
    const isCollapsed = collapsedLanes.has(id)
    return (
      <div id={id} className="mb-6">
        <button
          onClick={() => toggleLane(id)}
          className="flex items-center gap-3 py-3 hover:opacity-80 transition-opacity"
        >
          {isCollapsed
            ? <ChevronRight className="h-4 w-4 text-muted-foreground" />
            : <ChevronDown className="h-4 w-4 text-muted-foreground" />
          }
          <span className={`inline-flex items-center gap-2 px-3 py-0.5 rounded-full text-sm font-semibold ${badgeClass}`}>
            {label}
          </span>
          <span className="text-sm text-muted-foreground">
            {data.length} member{data.length !== 1 ? 's' : ''}
          </span>
        </button>
        {!isCollapsed && (
          <DataTable
            columns={memberColumns}
            data={data}
            showPagination={false}
            emptyMessage="No members"
          />
        )}
      </div>
    )
  }

  // ── Loading state ────────────────────────────────────────────

  if (loading) {
    return (
      <div className={`${nunito.className} text-muted-foreground`} style={{ padding: '2rem', textAlign: 'center' }}>
        Loading team members...
      </div>
    )
  }

  // ── Main render ──────────────────────────────────────────────

  return (
    <div className={nunito.className}>

      {/* Header */}
      <ProductionPageHeader
        title="Team Members"
        subtitle="SIGS Photography crew"
        actionLabel="+ Add Member"
        actionDisabled={true}
      />
      {/* TODO WO-320: Link + Add Member once member form is built */}

      {/* Pills */}
      <ProductionPills pills={[
        { label: 'Active', count: counts.activeCount, color: 'green' },
        { label: 'Probationary', count: counts.probationaryCount, color: 'yellow' },
        { label: 'Inactive', count: counts.inactiveCount, color: 'gray' },
      ]} />

      {/* Two-column layout */}
      <div className="flex">

        {/* Main panel */}
        <div className="flex-1 overflow-y-auto p-6 border-r border-border">

          {/* Search */}
          <div className="relative mb-6">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search members..."
              className="w-full pl-9 pr-4 py-2 text-sm border border-input rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>

          {/* Core Team section */}
          {renderSection(
            'section-core',
            'Core Team',
            coreMembers,
            'bg-teal-100 text-teal-700'
          )}

          {/* Backup section */}
          {renderSection(
            'section-backup',
            'Backup',
            backupMembers,
            'bg-blue-100 text-blue-700'
          )}

          {/* Probationary section */}
          {renderSection(
            'section-probationary',
            'Probationary',
            probationaryMembers,
            'bg-yellow-100 text-yellow-700'
          )}

          {/* Inactive section */}
          {renderSection(
            'section-inactive',
            'Inactive',
            inactiveMembers,
            'bg-gray-100 text-gray-700'
          )}

        </div>

        {/* Sidebar */}
        <ProductionSidebar boxes={[
          { label: 'TOTAL CREW', value: counts.totalCount, scrollToId: 'section-core', color: 'default' },
          { label: 'CORE TEAM', value: counts.coreCount, scrollToId: 'section-core', color: 'teal' },
          { label: 'BACKUP', value: counts.backupCount, scrollToId: 'section-backup', color: 'default' },
          { label: 'PROBATIONARY', value: counts.probationaryCount, scrollToId: 'section-probationary', color: 'yellow' },
          { label: 'INACTIVE', value: counts.inactiveCount, scrollToId: 'section-inactive', color: 'gray' },
        ]} />

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
            className="bg-muted border-border"
            style={{
              borderRadius: '16px', width: '90%', maxWidth: '640px',
              maxHeight: '85vh', overflow: 'auto', padding: '2rem',
              boxShadow: '0 25px 50px rgba(0,0,0,0.25)', border: '1px solid',
            }}
          >
            {/* Close */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '0.5rem' }}>
              <button onClick={() => { setSelectedMember(null); setEditMode(false) }} className="text-muted-foreground" style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
                <X size={20} />
              </button>
            </div>

            {/* Top section */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem', marginBottom: '1.5rem' }}>
              <img
                src={selectedMember.avatar_url || DEFAULT_AVATAR}
                alt={selectedMember.first_name}
                style={{ width: 100, height: 100, borderRadius: '50%', objectFit: 'cover', border: '3px solid var(--border)' }}
                onError={e => { (e.target as HTMLImageElement).src = DEFAULT_AVATAR }}
              />
              <div>
                <h2 className={`${playfair.className} text-foreground`} style={{ fontSize: '1.5rem', margin: 0 }}>
                  {selectedMember.first_name} {selectedMember.last_name || ''}
                </h2>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginTop: '6px' }}>
                  <span className="text-foreground" style={{ fontSize: '0.85rem', fontWeight: 600 }}>
                    {ROLE_LABELS[editMode ? (editData.role ?? selectedMember.role) : selectedMember.role] || selectedMember.role}
                  </span>
                  <StatusBadge status={editMode ? (editData.status ?? selectedMember.status) : selectedMember.status} />
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
                  <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--foreground)' }}>
                    Phone
                    <input type="tel" value={editData.phone ?? selectedMember.phone ?? ''} onChange={e => setEditData(d => ({ ...d, phone: e.target.value }))}
                      style={{ display: 'block', width: '100%', marginTop: '4px', padding: '6px 10px', borderRadius: '6px', border: '1px solid var(--border)', fontFamily: nunito.style.fontFamily, fontSize: '0.85rem' }} />
                  </label>
                  <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--foreground)' }}>
                    Email
                    <input type="email" value={editData.email ?? selectedMember.email ?? ''} onChange={e => setEditData(d => ({ ...d, email: e.target.value }))}
                      style={{ display: 'block', width: '100%', marginTop: '4px', padding: '6px 10px', borderRadius: '6px', border: '1px solid var(--border)', fontFamily: nunito.style.fontFamily, fontSize: '0.85rem' }} />
                  </label>
                </div>
                {/* Role & Status */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                  <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--foreground)' }}>
                    Role
                    <select value={editData.role ?? selectedMember.role} onChange={e => setEditData(d => ({ ...d, role: e.target.value }))}
                      style={{ display: 'block', width: '100%', marginTop: '4px', padding: '6px 10px', borderRadius: '6px', border: '1px solid var(--border)', fontFamily: nunito.style.fontFamily, fontSize: '0.85rem' }}>
                      {ROLE_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                    </select>
                  </label>
                  <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--foreground)' }}>
                    Status
                    <select value={editData.status ?? selectedMember.status} onChange={e => setEditData(d => ({ ...d, status: e.target.value }))}
                      style={{ display: 'block', width: '100%', marginTop: '4px', padding: '6px 10px', borderRadius: '6px', border: '1px solid var(--border)', fontFamily: nunito.style.fontFamily, fontSize: '0.85rem' }}>
                      {STATUS_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                    </select>
                  </label>
                </div>
                {/* Pay */}
                <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--foreground)' }}>
                  Pay Per Wedding ($)
                  <input type="number" value={editData.pay_per_wedding ?? selectedMember.pay_per_wedding} onChange={e => setEditData(d => ({ ...d, pay_per_wedding: Number(e.target.value) }))}
                    style={{ display: 'block', width: '120px', marginTop: '4px', padding: '6px 10px', borderRadius: '6px', border: '1px solid var(--border)', fontFamily: nunito.style.fontFamily, fontSize: '0.85rem' }} />
                </label>
                {/* Skills */}
                <div>
                  <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--foreground)' }}>Skills</span>
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
                  <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--foreground)' }}>
                    Emergency Contact Name
                    <input value={editData.emergency_contact_name ?? selectedMember.emergency_contact_name ?? ''} onChange={e => setEditData(d => ({ ...d, emergency_contact_name: e.target.value }))}
                      style={{ display: 'block', width: '100%', marginTop: '4px', padding: '6px 10px', borderRadius: '6px', border: '1px solid var(--border)', fontFamily: nunito.style.fontFamily, fontSize: '0.85rem' }} />
                  </label>
                  <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--foreground)' }}>
                    Emergency Contact Phone
                    <input value={editData.emergency_contact_phone ?? selectedMember.emergency_contact_phone ?? ''} onChange={e => setEditData(d => ({ ...d, emergency_contact_phone: e.target.value }))}
                      style={{ display: 'block', width: '100%', marginTop: '4px', padding: '6px 10px', borderRadius: '6px', border: '1px solid var(--border)', fontFamily: nunito.style.fontFamily, fontSize: '0.85rem' }} />
                  </label>
                </div>
                {/* Pair Constraint */}
                <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--foreground)' }}>
                  Pair Constraint
                  <input value={editData.pair_constraint ?? selectedMember.pair_constraint ?? ''} onChange={e => setEditData(d => ({ ...d, pair_constraint: e.target.value }))}
                    style={{ display: 'block', width: '100%', marginTop: '4px', padding: '6px 10px', borderRadius: '6px', border: '1px solid var(--border)', fontFamily: nunito.style.fontFamily, fontSize: '0.85rem' }} />
                </label>
                {/* Notes */}
                <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--foreground)' }}>
                  Notes
                  <textarea value={editData.notes ?? selectedMember.notes ?? ''} onChange={e => setEditData(d => ({ ...d, notes: e.target.value }))} rows={3}
                    style={{ display: 'block', width: '100%', marginTop: '4px', padding: '6px 10px', borderRadius: '6px', border: '1px solid var(--border)', fontFamily: nunito.style.fontFamily, fontSize: '0.85rem', resize: 'vertical' }} />
                </label>
                {/* Save / Cancel */}
                <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', marginTop: '0.5rem' }}>
                  <button onClick={() => { setEditMode(false); setEditData({}) }} style={{
                    display: 'inline-flex', alignItems: 'center', gap: '4px',
                    padding: '8px 16px', borderRadius: '8px', border: '1px solid var(--border)',
                    background: 'var(--background)', color: 'var(--foreground)', fontWeight: 600, fontSize: '0.85rem',
                    cursor: 'pointer', fontFamily: nunito.style.fontFamily,
                  }}>
                    <XCircle size={16} /> Cancel
                  </button>
                  <button onClick={handleSaveEdit} disabled={saving} style={{
                    display: 'inline-flex', alignItems: 'center', gap: '4px',
                    padding: '8px 16px', borderRadius: '8px', border: 'none',
                    background: 'var(--primary)', color: 'var(--primary-foreground)', fontWeight: 600, fontSize: '0.85rem',
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
                <div style={{ marginBottom: '1.25rem', padding: '1rem', background: 'var(--background)', borderRadius: '10px', border: '1px solid var(--border)' }}>
                  <h3 style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--muted-foreground)', marginTop: 0, marginBottom: '10px' }}>Contact</h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '0.85rem' }}>
                    {selectedMember.phone && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <Phone size={14} className="text-primary" />
                        <a href={`tel:${selectedMember.phone}`} style={{ color: 'var(--primary)', textDecoration: 'none' }}>{selectedMember.phone}</a>
                      </div>
                    )}
                    {selectedMember.email && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <Mail size={14} className="text-primary" />
                        <a href={`mailto:${selectedMember.email}`} style={{ color: 'var(--primary)', textDecoration: 'none' }}>{selectedMember.email}</a>
                      </div>
                    )}
                    {selectedMember.emergency_contact_name && (
                      <div style={{ marginTop: '6px', fontSize: '0.8rem', color: 'var(--muted-foreground)' }}>
                        <strong>Emergency:</strong> {selectedMember.emergency_contact_name}
                        {selectedMember.emergency_contact_phone && (
                          <> &middot; <a href={`tel:${selectedMember.emergency_contact_phone}`} style={{ color: 'var(--primary)' }}>{selectedMember.emergency_contact_phone}</a></>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {/* Details Section */}
                <div style={{ marginBottom: '1.25rem', padding: '1rem', background: 'var(--background)', borderRadius: '10px', border: '1px solid var(--border)' }}>
                  <h3 style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--muted-foreground)', marginTop: 0, marginBottom: '10px' }}>Details</h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '0.85rem', color: 'var(--foreground)' }}>
                    <div><strong>Joined:</strong> {selectedMember.date_joined ? fmtDate(selectedMember.date_joined) : '—'} &middot; {formatTenureLong(selectedMember.tenure_start)}</div>
                    <div><strong>Pay Rate:</strong> {getPayLabel(selectedMember)}</div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><strong>Skills:</strong> <SkillPills skills={selectedMember.skills} /></div>
                    {selectedMember.notes && (
                      <div style={{ marginTop: '6px', padding: '8px 10px', background: 'var(--muted)', borderRadius: '6px', fontSize: '0.8rem', color: 'var(--muted-foreground)', lineHeight: 1.5 }}>
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
                      <div style={{ marginBottom: '1.25rem', padding: '1rem', background: 'var(--background)', borderRadius: '10px', border: '1px solid var(--border)' }}>
                        <h3 style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--muted-foreground)', marginTop: 0, marginBottom: '10px' }}>2026 Season Stats</h3>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.75rem' }}>
                          {[
                            { label: 'Assigned', value: stats.total, color: '#1e40af' },
                            { label: 'Completed', value: stats.completed, color: 'var(--primary)' },
                            { label: 'Upcoming', value: stats.upcoming, color: '#d97706' },
                            { label: 'Est. YTD', value: formatCurrency(stats.earned), color: '#6d28d9' },
                          ].map((s, i) => (
                            <div key={i} style={{ textAlign: 'center' }}>
                              <div style={{ fontSize: '1.25rem', fontWeight: 700, color: s.color, fontFamily: playfair.style.fontFamily }}>{s.value}</div>
                              <div style={{ fontSize: '0.7rem', color: 'var(--muted-foreground)', fontWeight: 600, textTransform: 'uppercase' }}>{s.label}</div>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Upcoming Weddings */}
                      {stats.upcomingWeddings.length > 0 && (
                        <div style={{ marginBottom: '1.25rem', padding: '1rem', background: 'var(--background)', borderRadius: '10px', border: '1px solid var(--border)' }}>
                          <h3 style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--muted-foreground)', marginTop: 0, marginBottom: '10px' }}>Upcoming Weddings</h3>
                          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                            <thead>
                              <tr style={{ borderBottom: '1px solid var(--border)' }}>
                                <th style={{ textAlign: 'left', padding: '6px 0', fontSize: '0.75rem', fontWeight: 700, color: 'var(--muted-foreground)', textTransform: 'uppercase' }}>Date</th>
                                <th style={{ textAlign: 'left', padding: '6px 0', fontSize: '0.75rem', fontWeight: 700, color: 'var(--muted-foreground)', textTransform: 'uppercase' }}>Couple</th>
                                <th style={{ textAlign: 'left', padding: '6px 0', fontSize: '0.75rem', fontWeight: 700, color: 'var(--muted-foreground)', textTransform: 'uppercase' }}>Role</th>
                              </tr>
                            </thead>
                            <tbody>
                              {stats.upcomingWeddings.slice(0, 5).map((w, i) => (
                                <tr key={i} style={{ borderBottom: '1px solid var(--border)' }}>
                                  <td style={{ padding: '6px 0', color: 'var(--foreground)' }}>{formatTimelineDate(w.date)}</td>
                                  <td style={{ padding: '6px 0', color: 'var(--foreground)' }}>{w.couple}</td>
                                  <td style={{ padding: '6px 0', color: 'var(--foreground)' }}>{w.role}</td>
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
                    padding: '8px 16px', borderRadius: '8px', border: '1px solid var(--border)',
                    background: 'var(--background)', color: 'var(--primary)', fontWeight: 600, fontSize: '0.85rem',
                    cursor: 'pointer', fontFamily: nunito.style.fontFamily,
                  }}>
                    <Edit2 size={16} /> Edit
                  </button>
                  <button onClick={() => { setSelectedMember(null); setEditMode(false) }} style={{
                    padding: '8px 16px', borderRadius: '8px', border: 'none',
                    background: 'var(--primary)', color: 'var(--primary-foreground)', fontWeight: 600, fontSize: '0.85rem',
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
              background: 'var(--muted)', borderRadius: '16px', width: '90%', maxWidth: '560px',
              maxHeight: '85vh', overflow: 'auto', padding: '2rem',
              boxShadow: '0 25px 50px rgba(0,0,0,0.25)', border: '1px solid var(--border)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <h2 className={playfair.className} style={{ fontSize: '1.25rem', margin: 0, color: 'var(--foreground)' }}>Add Team Member</h2>
              <button onClick={() => setShowAddModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted-foreground)' }}>
                <X size={20} />
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {/* Names */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--foreground)' }}>
                  First Name *
                  <input value={addData.first_name || ''} onChange={e => setAddData(d => ({ ...d, first_name: e.target.value }))}
                    style={{ display: 'block', width: '100%', marginTop: '4px', padding: '6px 10px', borderRadius: '6px', border: '1px solid var(--border)', fontFamily: nunito.style.fontFamily, fontSize: '0.85rem' }} />
                </label>
                <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--foreground)' }}>
                  Last Name
                  <input value={addData.last_name || ''} onChange={e => setAddData(d => ({ ...d, last_name: e.target.value }))}
                    style={{ display: 'block', width: '100%', marginTop: '4px', padding: '6px 10px', borderRadius: '6px', border: '1px solid var(--border)', fontFamily: nunito.style.fontFamily, fontSize: '0.85rem' }} />
                </label>
              </div>
              {/* Phone & Email */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--foreground)' }}>
                  Phone
                  <input type="tel" value={addData.phone || ''} onChange={e => setAddData(d => ({ ...d, phone: e.target.value }))}
                    style={{ display: 'block', width: '100%', marginTop: '4px', padding: '6px 10px', borderRadius: '6px', border: '1px solid var(--border)', fontFamily: nunito.style.fontFamily, fontSize: '0.85rem' }} />
                </label>
                <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--foreground)' }}>
                  Email
                  <input type="email" value={addData.email || ''} onChange={e => setAddData(d => ({ ...d, email: e.target.value }))}
                    style={{ display: 'block', width: '100%', marginTop: '4px', padding: '6px 10px', borderRadius: '6px', border: '1px solid var(--border)', fontFamily: nunito.style.fontFamily, fontSize: '0.85rem' }} />
                </label>
              </div>
              {/* Role & Status */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--foreground)' }}>
                  Role
                  <select value={addData.role || 'both'} onChange={e => setAddData(d => ({ ...d, role: e.target.value }))}
                    style={{ display: 'block', width: '100%', marginTop: '4px', padding: '6px 10px', borderRadius: '6px', border: '1px solid var(--border)', fontFamily: nunito.style.fontFamily, fontSize: '0.85rem' }}>
                    {ROLE_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </select>
                </label>
                <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--foreground)' }}>
                  Status
                  <select value={addData.status || 'interviewing'} onChange={e => setAddData(d => ({ ...d, status: e.target.value }))}
                    style={{ display: 'block', width: '100%', marginTop: '4px', padding: '6px 10px', borderRadius: '6px', border: '1px solid var(--border)', fontFamily: nunito.style.fontFamily, fontSize: '0.85rem' }}>
                    {STATUS_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </select>
                </label>
              </div>
              {/* Pay & Date Joined */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--foreground)' }}>
                  Pay Per Wedding ($)
                  <input type="number" value={addData.pay_per_wedding ?? 300} onChange={e => setAddData(d => ({ ...d, pay_per_wedding: Number(e.target.value) }))}
                    style={{ display: 'block', width: '100%', marginTop: '4px', padding: '6px 10px', borderRadius: '6px', border: '1px solid var(--border)', fontFamily: nunito.style.fontFamily, fontSize: '0.85rem' }} />
                </label>
                <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--foreground)' }}>
                  Date Joined
                  <input type="date" value={addData.date_joined || ''} onChange={e => setAddData(d => ({ ...d, date_joined: e.target.value }))}
                    style={{ display: 'block', width: '100%', marginTop: '4px', padding: '6px 10px', borderRadius: '6px', border: '1px solid var(--border)', fontFamily: nunito.style.fontFamily, fontSize: '0.85rem' }} />
                </label>
              </div>
              {/* Skills */}
              <div>
                <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--foreground)' }}>Skills</span>
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
                <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--foreground)' }}>
                  Emergency Contact Name
                  <input value={addData.emergency_contact_name || ''} onChange={e => setAddData(d => ({ ...d, emergency_contact_name: e.target.value }))}
                    style={{ display: 'block', width: '100%', marginTop: '4px', padding: '6px 10px', borderRadius: '6px', border: '1px solid var(--border)', fontFamily: nunito.style.fontFamily, fontSize: '0.85rem' }} />
                </label>
                <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--foreground)' }}>
                  Emergency Contact Phone
                  <input value={addData.emergency_contact_phone || ''} onChange={e => setAddData(d => ({ ...d, emergency_contact_phone: e.target.value }))}
                    style={{ display: 'block', width: '100%', marginTop: '4px', padding: '6px 10px', borderRadius: '6px', border: '1px solid var(--border)', fontFamily: nunito.style.fontFamily, fontSize: '0.85rem' }} />
                </label>
              </div>
              {/* Avatar URL */}
              <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--foreground)' }}>
                Avatar URL (optional)
                <input value={addData.avatar_url || ''} onChange={e => setAddData(d => ({ ...d, avatar_url: e.target.value }))}
                  placeholder="https://..."
                  style={{ display: 'block', width: '100%', marginTop: '4px', padding: '6px 10px', borderRadius: '6px', border: '1px solid var(--border)', fontFamily: nunito.style.fontFamily, fontSize: '0.85rem' }} />
              </label>
              {/* Notes */}
              <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--foreground)' }}>
                Notes
                <textarea value={addData.notes || ''} onChange={e => setAddData(d => ({ ...d, notes: e.target.value }))} rows={2}
                  style={{ display: 'block', width: '100%', marginTop: '4px', padding: '6px 10px', borderRadius: '6px', border: '1px solid var(--border)', fontFamily: nunito.style.fontFamily, fontSize: '0.85rem', resize: 'vertical' }} />
              </label>
              {/* Save */}
              <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', marginTop: '0.5rem' }}>
                <button onClick={() => setShowAddModal(false)} style={{
                  padding: '8px 16px', borderRadius: '8px', border: '1px solid var(--border)',
                  background: 'var(--background)', color: 'var(--foreground)', fontWeight: 600, fontSize: '0.85rem',
                  cursor: 'pointer', fontFamily: nunito.style.fontFamily,
                }}>
                  Cancel
                </button>
                <button onClick={handleAddMember} disabled={saving || !addData.first_name} style={{
                  display: 'inline-flex', alignItems: 'center', gap: '4px',
                  padding: '8px 16px', borderRadius: '8px', border: 'none',
                  background: 'var(--primary)', color: 'var(--primary-foreground)', fontWeight: 600, fontSize: '0.85rem',
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
