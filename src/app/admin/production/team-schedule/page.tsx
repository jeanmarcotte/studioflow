'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
import {
  CalendarDays, Users, AlertTriangle, Calendar, ChevronUp, ChevronDown,
  X, Search, Camera, Video, Check, XCircle, Download,
} from 'lucide-react'
import { supabase } from '@/lib/supabase'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'

// ── Types ──────────────────────────────────────────────────────────

interface TeamMember {
  id: string
  name: string
  role: string        // 'photographer' | 'videographer'
  color: string
  is_active: boolean
}

interface Assignment {
  id: string
  couple_id: string
  photo_1: string | null
  photo_2: string | null
  video_1: string | null
  status: string      // 'confirmed' | 'missing_crew' | 'pending'
  couple_name: string
  wedding_date: string
  num_photographers: number
  num_videographers: number
}

type SortField = 'wedding_date' | 'day' | 'couple_name' | 'crew' | 'photo_1' | 'photo_2' | 'video_1' | 'status'
type SortDir = 'asc' | 'desc'

// ── Helpers ────────────────────────────────────────────────────────

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

function formatDate(iso: string) {
  const d = new Date(iso + 'T12:00:00')
  return d.toLocaleDateString('en-CA', { month: 'short', day: 'numeric', year: 'numeric' })
}

function getDayName(iso: string) {
  const d = new Date(iso + 'T12:00:00')
  return DAY_NAMES[d.getDay()]
}

function isDoubleWedding(date: string, all: Assignment[]) {
  return all.filter(a => a.wedding_date === date).length > 1
}

function getConsecutiveDayWeddings(assignments: Assignment[]) {
  const dates = Array.from(new Set(assignments.map(a => a.wedding_date))).sort()
  const backToBack: Set<string> = new Set()
  for (let i = 1; i < dates.length; i++) {
    const prev = new Date(dates[i - 1] + 'T12:00:00')
    const curr = new Date(dates[i] + 'T12:00:00')
    const diff = (curr.getTime() - prev.getTime()) / (1000 * 60 * 60 * 24)
    if (diff === 1) {
      backToBack.add(dates[i - 1])
      backToBack.add(dates[i])
    }
  }
  return backToBack
}

// ══════════════════════════════════════════════════════════════════
// STAT MODAL
// ══════════════════════════════════════════════════════════════════

function StatModal({ title, items, onClose }: {
  title: string
  items: { label: string; sub?: string }[]
  onClose: () => void
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-card border rounded-xl shadow-xl w-full max-w-md mx-4 max-h-[70vh] flex flex-col" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between p-4 border-b">
          <h3 className="font-semibold text-lg">{title}</h3>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-muted transition-colors"><X className="h-4 w-4" /></button>
        </div>
        <div className="p-4 overflow-y-auto space-y-2">
          {items.length === 0 && <p className="text-muted-foreground text-sm">None found.</p>}
          {items.map((item, i) => (
            <div key={i} className="flex items-center justify-between rounded-lg bg-muted/50 px-3 py-2">
              <span className="font-medium text-sm">{item.label}</span>
              {item.sub && <span className="text-xs text-muted-foreground">{item.sub}</span>}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// ══════════════════════════════════════════════════════════════════
// STAFF DROPDOWN
// ══════════════════════════════════════════════════════════════════

function StaffDropdown({ value, role, members, onSelect }: {
  value: string | null
  role: 'photographer' | 'videographer'
  members: TeamMember[]
  onSelect: (name: string | null) => void
}) {
  const [open, setOpen] = useState(false)
  const filtered = members.filter(m => (m.role === role || m.role === 'both') && m.is_active)
  const member = members.find(m => m.name === value)

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1.5 rounded-md px-2 py-1 text-xs font-medium transition-colors hover:bg-muted/80 border border-transparent hover:border-border"
      >
        {value ? (
          <span
            className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold text-white"
            style={{ backgroundColor: member?.color || '#6b7280' }}
          >
            {value}
          </span>
        ) : (
          <span className="text-muted-foreground">—</span>
        )}
        <ChevronDown className="h-3 w-3 text-muted-foreground" />
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute z-50 mt-1 w-44 rounded-lg border bg-popover shadow-xl overflow-hidden">
            <button
              onClick={() => { onSelect(null); setOpen(false) }}
              className="w-full text-left px-3 py-2 text-xs hover:bg-muted/50 text-muted-foreground"
            >
              Unassign
            </button>
            {filtered.map(m => (
              <button
                key={m.id}
                onClick={() => { onSelect(m.name); setOpen(false) }}
                className="w-full text-left px-3 py-2 text-xs hover:bg-muted/50 flex items-center gap-2"
              >
                <span className="h-2.5 w-2.5 rounded-full shrink-0" style={{ backgroundColor: m.color }} />
                <span className="font-medium">{m.name}</span>
                <span className="text-muted-foreground ml-auto capitalize">{m.role}</span>
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  )
}

// ══════════════════════════════════════════════════════════════════
// PAGE
// ══════════════════════════════════════════════════════════════════

export default function TeamSchedulePage() {
  const [assignments, setAssignments] = useState<Assignment[]>([])
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [sortField, setSortField] = useState<SortField>('wedding_date')
  const [sortDir, setSortDir] = useState<SortDir>('asc')
  const [activeModal, setActiveModal] = useState<string | null>(null)

  // ── Fetch data ─────────────────────────────────────────────────

  const fetchData = useCallback(async () => {
    const [assignRes, teamRes, contractsRes] = await Promise.all([
      supabase
        .from('wedding_assignments')
        .select(`
          id, couple_id, photo_1, photo_2, video_1, status,
          couples!inner(couple_name, wedding_date)
        `)
        .gte('couples.wedding_date', '2026-01-01')
        .lt('couples.wedding_date', '2027-01-01'),
      supabase
        .from('team_members')
        .select('*')
        .eq('is_active', true)
        .order('name'),
      supabase
        .from('contracts')
        .select('couple_id, num_photographers, num_videographers'),
    ])

    if (teamRes.data) setTeamMembers(teamRes.data as TeamMember[])

    if (assignRes.error) {
      console.error('Failed to fetch assignments:', assignRes.error)
    }

    // Build contract lookup by couple_id
    const contractMap = new Map<string, { num_photographers: number; num_videographers: number }>()
    if (contractsRes.data) {
      for (const c of contractsRes.data as any[]) {
        contractMap.set(c.couple_id, {
          num_photographers: c.num_photographers ?? 1,
          num_videographers: c.num_videographers ?? 0,
        })
      }
    }

    if (assignRes.data) {
      const mapped: Assignment[] = (assignRes.data as any[])
        .map(a => {
          const contract = contractMap.get(a.couple_id)
          return {
            id: a.id,
            couple_id: a.couple_id,
            photo_1: a.photo_1,
            photo_2: a.photo_2,
            video_1: a.video_1,
            status: a.status,
            couple_name: a.couples.couple_name,
            wedding_date: a.couples.wedding_date,
            num_photographers: contract?.num_photographers ?? 1,
            num_videographers: contract?.num_videographers ?? 0,
          }
        })
      setAssignments(mapped)
    }

    setLoading(false)
  }, [])

  useEffect(() => { fetchData() }, [fetchData])

  // ── Update assignment ──────────────────────────────────────────

  const updateStaff = async (id: string, field: 'photo_1' | 'photo_2' | 'video_1', value: string | null) => {
    const { error } = await supabase
      .from('wedding_assignments')
      .update({ [field]: value })
      .eq('id', id)

    if (error) return

    // Compute new status based on contract requirements
    const current = assignments.find(a => a.id === id)
    if (!current) return

    const updated = { ...current, [field]: value }
    const photoCount = (updated.photo_1 ? 1 : 0) + (updated.photo_2 ? 1 : 0)
    const videoCount = updated.video_1 ? 1 : 0
    const photoMet = photoCount >= updated.num_photographers
    const videoMet = updated.num_videographers === 0 || videoCount >= updated.num_videographers
    const newStatus = photoMet && videoMet ? 'confirmed' : 'missing_crew'

    if (newStatus !== current.status) {
      await supabase
        .from('wedding_assignments')
        .update({ status: newStatus })
        .eq('id', id)
    }

    setAssignments(prev =>
      prev.map(a => a.id === id ? { ...a, [field]: value, status: newStatus } : a)
    )
  }

  // ── PDF Export ────────────────────────────────────────────────

  const exportPDF = () => {
    const doc = new jsPDF({ orientation: 'landscape' })

    doc.setFontSize(16)
    doc.text('SIGS Photography — 2026 Wedding Schedule', 14, 18)
    doc.setFontSize(9)
    doc.setTextColor(120)
    doc.text(`${filtered.length} weddings`, 14, 24)

    const rows = filtered.map(a => {
      const crew = [a.num_photographers > 0 ? `${a.num_photographers}P` : '', a.num_videographers > 0 ? `${a.num_videographers}V` : ''].filter(Boolean).join(' ') || '0'
      return [
        formatDate(a.wedding_date),
        getDayName(a.wedding_date),
        a.couple_name,
        crew,
        a.photo_1 || '—',
        a.photo_2 || '—',
        a.video_1 || '—',
        a.status.replace('_', ' ').replace(/\b\w/g, c => c.toUpperCase()),
      ]
    })

    autoTable(doc, {
      startY: 28,
      head: [['Date', 'Day', 'Couple', 'Crew', 'Photo 1', 'Photo 2', 'Video 1', 'Status']],
      body: rows,
      styles: { fontSize: 8, cellPadding: 2 },
      headStyles: { fillColor: [30, 64, 175], textColor: 255, fontStyle: 'bold' },
      alternateRowStyles: { fillColor: [245, 247, 250] },
    })

    const pageCount = doc.getNumberOfPages()
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i)
      doc.setFontSize(7)
      doc.setTextColor(160)
      doc.text(
        `Generated ${new Date().toLocaleDateString('en-CA')} — Page ${i} of ${pageCount}`,
        doc.internal.pageSize.width / 2, doc.internal.pageSize.height - 8,
        { align: 'center' }
      )
    }

    doc.save('SIGS-2026-Wedding-Schedule.pdf')
  }

  // ── Computed data ──────────────────────────────────────────────

  const missingCrew = useMemo(() =>
    assignments.filter(a => a.status === 'missing_crew'), [assignments])

  const doubleWeddings = useMemo(() => {
    const dateCounts: Record<string, Assignment[]> = {}
    assignments.forEach(a => {
      if (!dateCounts[a.wedding_date]) dateCounts[a.wedding_date] = []
      dateCounts[a.wedding_date].push(a)
    })
    return Object.entries(dateCounts).filter(([, v]) => v.length > 1)
  }, [assignments])

  const backToBackDates = useMemo(() => getConsecutiveDayWeddings(assignments), [assignments])

  const backToBackWeddings = useMemo(() =>
    assignments.filter(a => backToBackDates.has(a.wedding_date)), [assignments, backToBackDates])

  const nextNeedingCoverage = useMemo(() => {
    const today = new Date().toISOString().split('T')[0]
    return assignments
      .filter(a => a.wedding_date >= today && a.status === 'missing_crew')
      .sort((a, b) => a.wedding_date.localeCompare(b.wedding_date))[0] || null
  }, [assignments])

  const memberCounts = useMemo(() => {
    return teamMembers.map(m => {
      const count = assignments.filter(a =>
        a.photo_1 === m.name || a.photo_2 === m.name || a.video_1 === m.name
      ).length
      return { ...m, count }
    })
  }, [assignments, teamMembers])

  // ── Filtered + sorted ──────────────────────────────────────────

  const filtered = useMemo(() => {
    let result = [...assignments]

    if (search.trim()) {
      const q = search.toLowerCase()
      result = result.filter(a =>
        a.couple_name.toLowerCase().includes(q) ||
        (a.photo_1 || '').toLowerCase().includes(q) ||
        (a.photo_2 || '').toLowerCase().includes(q) ||
        (a.video_1 || '').toLowerCase().includes(q)
      )
    }

    result.sort((a, b) => {
      let cmp = 0
      const crewCount = (r: Assignment) => r.num_photographers + r.num_videographers
      const dayIndex = (r: Assignment) => new Date(r.wedding_date + 'T12:00:00').getDay()
      const statusOrder: Record<string, number> = { confirmed: 0, pending: 1, missing_crew: 2 }
      switch (sortField) {
        case 'wedding_date':
          cmp = a.wedding_date.localeCompare(b.wedding_date)
          break
        case 'day':
          cmp = dayIndex(a) - dayIndex(b)
          break
        case 'couple_name':
          cmp = a.couple_name.localeCompare(b.couple_name)
          break
        case 'crew':
          cmp = crewCount(a) - crewCount(b)
          break
        case 'photo_1':
          cmp = (a.photo_1 || '').localeCompare(b.photo_1 || '')
          break
        case 'photo_2':
          cmp = (a.photo_2 || '').localeCompare(b.photo_2 || '')
          break
        case 'video_1':
          cmp = (a.video_1 || '').localeCompare(b.video_1 || '')
          break
        case 'status':
          cmp = (statusOrder[a.status] ?? 9) - (statusOrder[b.status] ?? 9)
          break
      }
      return sortDir === 'asc' ? cmp : -cmp
    })

    return result
  }, [assignments, search, sortField, sortDir])

  // ── Sort handler ───────────────────────────────────────────────

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortDir('asc')
    }
  }

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return <ChevronDown className="h-3 w-3 opacity-30" />
    return sortDir === 'asc'
      ? <ChevronUp className="h-3 w-3" />
      : <ChevronDown className="h-3 w-3" />
  }

  // ── Modal data ─────────────────────────────────────────────────

  const modalData = useMemo(() => {
    switch (activeModal) {
      case 'missing':
        return {
          title: 'Missing Crew',
          items: missingCrew.map(a => ({ label: a.couple_name, sub: formatDate(a.wedding_date) })),
        }
      case 'double':
        return {
          title: 'Double Weddings',
          items: doubleWeddings.flatMap(([date, weddings]) =>
            weddings.map(a => ({ label: a.couple_name, sub: formatDate(date) }))
          ),
        }
      case 'backtoback':
        return {
          title: 'Back-to-Back Weddings',
          items: backToBackWeddings.map(a => ({ label: a.couple_name, sub: formatDate(a.wedding_date) })),
        }
      case 'next':
        return {
          title: 'Next Wedding Needing Coverage',
          items: nextNeedingCoverage
            ? [{ label: nextNeedingCoverage.couple_name, sub: formatDate(nextNeedingCoverage.wedding_date) }]
            : [],
        }
      default:
        return null
    }
  }, [activeModal, missingCrew, doubleWeddings, backToBackWeddings, nextNeedingCoverage])

  // ── Row styling ────────────────────────────────────────────────

  function getRowClasses(a: Assignment) {
    const isDouble = isDoubleWedding(a.wedding_date, assignments)
    const isBackToBack = backToBackDates.has(a.wedding_date)
    const isMissing = a.status === 'missing_crew'

    if (isMissing) return 'bg-red-50 hover:bg-red-100/70 border-l-2 border-l-red-400 transition-colors'
    if (isDouble) return 'bg-orange-50/60 hover:bg-orange-50 border-l-2 border-l-orange-400 transition-colors'
    if (isBackToBack) return 'bg-amber-50/50 hover:bg-amber-50 border-l-2 border-l-amber-400 transition-colors'
    return 'hover:bg-accent/50 transition-colors'
  }

  // ── Crew indicator ─────────────────────────────────────────────

  function CrewBadge({ a }: { a: Assignment }) {
    const p = a.num_photographers
    const v = a.num_videographers
    const total = p + v
    const tooltip = `Contract: ${p} photographer${p !== 1 ? 's' : ''}${v > 0 ? `, ${v} videographer${v !== 1 ? 's' : ''}` : ''}`
    const bg = total === 0 ? 'bg-gray-100 text-gray-500' : v > 0 ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'

    return (
      <span title={tooltip} className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold ${bg}`}>
        {p > 0 && <><span>{p}</span><Camera className="h-3 w-3" /></>}
        {v > 0 && <><span>{v}</span><Video className="h-3 w-3" /></>}
        {total === 0 && <span>0</span>}
      </span>
    )
  }

  function StatusBadge({ status }: { status: string }) {
    if (status === 'confirmed') {
      return (
        <span className="inline-flex items-center gap-1 rounded-full bg-green-100 text-green-700 px-2.5 py-0.5 text-xs font-medium">
          <Check className="h-3 w-3" /> Confirmed
        </span>
      )
    }
    if (status === 'missing_crew') {
      return (
        <span className="inline-flex items-center gap-1 rounded-full bg-red-100 text-red-600 px-2.5 py-0.5 text-xs font-semibold">
          <XCircle className="h-3.5 w-3.5" /> Missing Crew
        </span>
      )
    }
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 text-amber-700 px-2.5 py-0.5 text-xs font-medium">
        Pending
      </span>
    )
  }

  // ══════════════════════════════════════════════════════════════
  // RENDER
  // ══════════════════════════════════════════════════════════════

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 border-2 border-t-transparent border-primary rounded-full animate-spin" />
          <p className="text-sm text-muted-foreground">Loading schedule...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* ── Header ──────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <CalendarDays className="h-6 w-6 text-indigo-600" />
            Team Schedule
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            2026 Season &middot; {assignments.length} wedding{assignments.length !== 1 ? 's' : ''}
          </p>
        </div>
        <button
          onClick={exportPDF}
          className="inline-flex items-center gap-2 rounded-lg border bg-card px-4 py-2 text-sm font-medium hover:bg-muted transition-colors shadow-sm"
        >
          <Download className="h-4 w-4" />
          Download PDF
        </button>
      </div>

      {/* ── Team Member Badges ──────────────────────────────────── */}
      {teamMembers.length > 0 && (
        <div className="rounded-xl border bg-card p-4">
          <h3 className="text-xs font-semibold uppercase text-muted-foreground mb-3">Active Team</h3>
          <div className="flex flex-wrap gap-2">
            {teamMembers.filter(m => m.is_active).map(m => (
              <span
                key={m.id}
                className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold text-white shadow-sm"
                style={{ backgroundColor: m.color }}
              >
                {m.role === 'videographer' ? <Video className="h-3 w-3" /> : <Camera className="h-3 w-3" />}
                {m.name}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* ── Stat Boxes ──────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <button
          onClick={() => setActiveModal('missing')}
          className="rounded-xl border bg-card p-4 text-left hover:border-primary hover:shadow-md transition-all"
        >
          <div className="flex items-center justify-between mb-2">
            <div className="rounded-lg p-2 bg-red-50">
              <AlertTriangle className="h-4 w-4 text-red-600" />
            </div>
            <span className="text-2xl font-bold">{missingCrew.length}</span>
          </div>
          <div className="text-sm font-medium">Missing Crew</div>
          <p className="text-xs text-muted-foreground mt-0.5">weddings needing staff</p>
        </button>

        <button
          onClick={() => setActiveModal('double')}
          className="rounded-xl border bg-card p-4 text-left hover:border-primary hover:shadow-md transition-all"
        >
          <div className="flex items-center justify-between mb-2">
            <div className="rounded-lg p-2 bg-orange-50">
              <Users className="h-4 w-4 text-orange-600" />
            </div>
            <span className="text-2xl font-bold">{doubleWeddings.length}</span>
          </div>
          <div className="text-sm font-medium">Double Weddings</div>
          <p className="text-xs text-muted-foreground mt-0.5">dates with 2+ weddings</p>
        </button>

        <button
          onClick={() => setActiveModal('backtoback')}
          className="rounded-xl border bg-card p-4 text-left hover:border-primary hover:shadow-md transition-all"
        >
          <div className="flex items-center justify-between mb-2">
            <div className="rounded-lg p-2 bg-amber-50">
              <Calendar className="h-4 w-4 text-amber-600" />
            </div>
            <span className="text-2xl font-bold">{backToBackWeddings.length}</span>
          </div>
          <div className="text-sm font-medium">Back-to-Backs</div>
          <p className="text-xs text-muted-foreground mt-0.5">consecutive day weddings</p>
        </button>

        <button
          onClick={() => setActiveModal('next')}
          className="rounded-xl border bg-card p-4 text-left hover:border-primary hover:shadow-md transition-all"
        >
          <div className="flex items-center justify-between mb-2">
            <div className="rounded-lg p-2 bg-indigo-50">
              <CalendarDays className="h-4 w-4 text-indigo-600" />
            </div>
          </div>
          <div className="text-sm font-medium truncate">
            {nextNeedingCoverage ? nextNeedingCoverage.couple_name : 'All Covered'}
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            {nextNeedingCoverage ? `Next: ${formatDate(nextNeedingCoverage.wedding_date)}` : 'No coverage gaps'}
          </p>
        </button>
      </div>

      {/* ── Team Workload ────────────────────────────────────────── */}
      {memberCounts.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-4 gap-4">
          {memberCounts.map(m => (
            <div key={m.id} className="rounded-xl border bg-card p-4 transition-all hover:border-primary hover:shadow-md">
              <div className="flex items-center justify-between mb-2">
                <div className="rounded-lg p-2" style={{ backgroundColor: m.color + '18' }}>
                  {m.role === 'videographer'
                    ? <Video className="h-4 w-4" style={{ color: m.color }} />
                    : m.role === 'both'
                      ? <Users className="h-4 w-4" style={{ color: m.color }} />
                      : <Camera className="h-4 w-4" style={{ color: m.color }} />}
                </div>
                <span className="text-2xl font-bold">{m.count}</span>
              </div>
              <div className="text-sm font-medium">{m.name}</div>
              <p className="text-xs text-muted-foreground mt-0.5 capitalize">{m.role}</p>
            </div>
          ))}
        </div>
      )}

      {/* ── Legend ───────────────────────────────────────────────── */}
      <div className="rounded-xl border bg-card px-4 py-3">
        <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-muted-foreground">
          <span className="flex items-center gap-1.5"><span className="h-3.5 w-1 rounded-full bg-red-400" /> Missing Crew</span>
          <span className="flex items-center gap-1.5"><span className="h-3.5 w-1 rounded-full bg-orange-400" /> Double Wedding</span>
          <span className="flex items-center gap-1.5"><span className="h-3.5 w-1 rounded-full bg-amber-400" /> Back-to-Back</span>
          <span className="flex items-center gap-1.5">
            <span className="inline-flex items-center rounded-full bg-blue-100 text-blue-700 px-1.5 py-px text-[9px] font-semibold"><Camera className="h-2.5 w-2.5" /></span> Photo Only
          </span>
          <span className="flex items-center gap-1.5">
            <span className="inline-flex items-center rounded-full bg-green-100 text-green-700 px-1.5 py-px text-[9px] font-semibold"><Camera className="h-2.5 w-2.5" /></span> Photo + Video
          </span>
        </div>
      </div>

      {/* ── Search ──────────────────────────────────────────────── */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <input
          type="text"
          placeholder="Search couples or staff..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-full rounded-lg border bg-background pl-10 pr-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
        />
      </div>

      {/* ── Table ───────────────────────────────────────────────── */}
      <div className="rounded-xl border bg-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/50 text-xs uppercase text-muted-foreground">
                {([
                  ['wedding_date', 'Date', 'px-4', 'text-left'],
                  ['day', 'Day', 'px-3', 'text-left'],
                  ['couple_name', 'Couple', 'px-4', 'text-left'],
                  ['crew', 'Crew', 'px-3', 'text-center'],
                  ['photo_1', 'Photo 1', 'px-4', 'text-left'],
                  ['photo_2', 'Photo 2', 'px-4', 'text-left'],
                  ['video_1', 'Video 1', 'px-4', 'text-left'],
                  ['status', 'Status', 'px-4', 'text-left'],
                ] as [SortField, string, string, string][]).map(([field, label, px, align]) => (
                  <th
                    key={field}
                    className={`${px} py-3 ${align} cursor-pointer hover:text-foreground transition-colors select-none`}
                    onClick={() => handleSort(field)}
                  >
                    <span className="inline-flex items-center gap-1">{label} <SortIcon field={field} /></span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y">
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-4 py-12 text-center text-muted-foreground">
                    {search ? 'No weddings match your search.' : 'No weddings scheduled for 2026.'}
                  </td>
                </tr>
              )}
              {filtered.map(a => {
                return (
                  <tr key={a.id} className={getRowClasses(a)}>
                    {/* Date */}
                    <td className="px-4 py-3 font-medium whitespace-nowrap">
                      {formatDate(a.wedding_date)}
                    </td>

                    {/* Day */}
                    <td className="px-3 py-3 text-muted-foreground whitespace-nowrap">
                      {getDayName(a.wedding_date)}
                    </td>

                    {/* Couple */}
                    <td className="px-4 py-3 font-medium">
                      {a.couple_name}
                    </td>

                    {/* Crew badge */}
                    <td className="px-3 py-3 text-center">
                      <CrewBadge a={a} />
                    </td>

                    {/* Photo 1 */}
                    <td className="px-4 py-3">
                      <StaffDropdown
                        value={a.photo_1}
                        role="photographer"
                        members={teamMembers}
                        onSelect={v => updateStaff(a.id, 'photo_1', v)}
                      />
                    </td>

                    {/* Photo 2 */}
                    <td className="px-4 py-3">
                      <StaffDropdown
                        value={a.photo_2}
                        role="photographer"
                        members={teamMembers}
                        onSelect={v => updateStaff(a.id, 'photo_2', v)}
                      />
                    </td>

                    {/* Video 1 */}
                    <td className="px-4 py-3">
                      <StaffDropdown
                        value={a.video_1}
                        role="videographer"
                        members={teamMembers}
                        onSelect={v => updateStaff(a.id, 'video_1', v)}
                      />
                    </td>

                    {/* Status */}
                    <td className="px-4 py-3">
                      <StatusBadge status={a.status} />
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Modal ───────────────────────────────────────────────── */}
      {activeModal && modalData && (
        <StatModal
          title={modalData.title}
          items={modalData.items}
          onClose={() => setActiveModal(null)}
        />
      )}
    </div>
  )
}
