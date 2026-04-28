'use client'

import { useState, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { ColumnDef } from '@tanstack/react-table'
import { supabase } from '@/lib/supabase'
import { DataTable, DataTableColumnHeader } from '@/components/ui/data-table'
import { Badge } from '@/components/ui/badge'
import { Search, ExternalLink } from 'lucide-react'
import { formatWeddingDateShort } from '@/lib/formatters'
import { motion } from 'framer-motion'

interface ArchiveRow {
  id: string
  couple_id: string
  bride_name: string | null
  groom_name: string | null
  wedding_date: string | null
  package_type: string
  has_engagement: boolean
  wed_photo_project: string[] | null
  wed_video_project: string[] | null
  hires_photos: string[] | null
  engagement_project: string[] | null
  wedding_proofs: string[] | null
  long_form_video: string[] | null
  recap_video: string[] | null
  album_files: string[] | null
  on_marketing_drive: boolean
  on_aws: boolean
  archive_status: string
  couple_phase: string
}

const PHASE_LABELS: Record<string, string> = {
  'new_client': 'New Client',
  'pre_engagement': 'Pre-Engagement',
  'post_engagement': 'Post-Engagement',
  'pre_wedding': 'Pre-Wedding',
  'post_wedding': 'Post-Wedding',
  'post_production': 'Post-Production',
  'completed': 'Completed',
}

const PHASE_COLORS: Record<string, string> = {
  'new_client': 'bg-gray-100 text-gray-700',
  'pre_engagement': 'bg-yellow-100 text-yellow-700',
  'post_engagement': 'bg-blue-100 text-blue-700',
  'pre_wedding': 'bg-green-100 text-green-700',
  'post_wedding': 'bg-yellow-100 text-yellow-700',
  'post_production': 'bg-blue-100 text-blue-700',
  'completed': 'bg-green-100 text-green-700',
}

const PHASE_FILTER_OPTIONS = [
  { value: 'all', label: 'All Phases' },
  { value: 'post_production', label: 'Post-Production (archive queue)' },
  { value: 'post_wedding', label: 'Post-Wedding' },
  { value: 'pre_wedding', label: 'Pre-Wedding' },
  { value: 'completed', label: 'Completed' },
]

const DELIVERABLES = [
  { key: 'wed_photo_project', videoOnly: false, engOnly: false },
  { key: 'wed_video_project', videoOnly: true, engOnly: false },
  { key: 'hires_photos', videoOnly: false, engOnly: false },
  { key: 'engagement_project', videoOnly: false, engOnly: true },
  { key: 'wedding_proofs', videoOnly: false, engOnly: false },
  { key: 'long_form_video', videoOnly: true, engOnly: false },
  { key: 'recap_video', videoOnly: true, engOnly: false },
  { key: 'album_files', videoOnly: false, engOnly: false },
]

function getLocatedCount(row: ArchiveRow): { located: number; total: number } {
  let located = 0
  let total = 0
  for (const d of DELIVERABLES) {
    if (d.videoOnly && row.package_type === 'photo_only') continue
    if (d.engOnly && !row.has_engagement) continue
    total++
    const val = row[d.key as keyof ArchiveRow] as string[] | null
    if (val && Array.isArray(val) && val.length > 0) located++
  }
  return { located, total }
}

function getEngStatus(row: ArchiveRow): 'shot' | 'declined' | 'pending' {
  if (row.has_engagement) return 'shot'
  if (!row.wedding_date) return 'pending'
  const weddingPassed = new Date(row.wedding_date) < new Date()
  return weddingPassed ? 'declined' : 'pending'
}

const STATUS_OPTIONS = ['all', 'not_started', 'partial', 'complete', 'verified'] as const

const RESEARCH_LINKS = [
  { label: 'PPA: Selling old files', url: 'https://www.ppa.com/ppmag/articles/ask-the-experts-what-to-do-with-old-image-files' },
  { label: 'Folio: Anniversary albums', url: 'https://www.folioalbums.com/regenerate-album-sales-from-past-clients/' },
  { label: 'Zookbinders: Past clients', url: 'https://zookbinders.com/wedding-album-sales-strategies/' },
  { label: 'Benj Haisch: Backup flow', url: 'https://benjhaisch.com/backup-archive-workflow/' },
]

export default function ArchiveDashboard() {
  const router = useRouter()
  const [archives, setArchives] = useState<ArchiveRow[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [phaseFilter, setPhaseFilter] = useState<string>('all')
  const [yearFilter, setYearFilter] = useState<number | 'all'>('all')

  useEffect(() => {
    async function fetch() {
      const { data } = await supabase
        .from('couple_archives')
        .select('*, couples(phase)')
        .order('wedding_date', { ascending: false })
      if (data) {
        setArchives(data.map((a: any) => ({
          ...a,
          couple_phase: a.couples?.phase || 'new_client',
        })) as ArchiveRow[])
      }
      setLoading(false)
    }
    fetch()
  }, [])

  const years = useMemo(() => {
    const yrs = new Set<number>()
    archives.forEach(a => {
      if (a.wedding_date) yrs.add(parseInt(a.wedding_date.substring(0, 4)))
    })
    return Array.from(yrs).sort((a, b) => b - a)
  }, [archives])

  const stats = useMemo(() => {
    const archived = archives.filter(a => ['complete', 'verified'].includes(a.archive_status)).length
    const partial = archives.filter(a => a.archive_status === 'partial').length
    const notStarted = archives.filter(a => a.archive_status === 'not_started').length
    const onMarketing = archives.filter(a => a.on_marketing_drive).length
    const onAws = archives.filter(a => a.on_aws).length
    const readyToArchive = archives.filter(a => a.couple_phase === 'post_production').length
    return { archived, partial, notStarted, onMarketing, onAws, readyToArchive, total: archives.length }
  }, [archives])

  const filtered = useMemo(() => {
    return archives.filter(a => {
      if (search) {
        const q = search.toLowerCase()
        const name = `${a.bride_name || ''} ${a.groom_name || ''}`.toLowerCase()
        if (!name.includes(q)) return false
      }
      if (phaseFilter !== 'all' && a.couple_phase !== phaseFilter) return false
      if (statusFilter !== 'all' && a.archive_status !== statusFilter) return false
      if (yearFilter !== 'all' && a.wedding_date) {
        const yr = parseInt(a.wedding_date.substring(0, 4))
        if (yr !== yearFilter) return false
      }
      return true
    })
  }, [archives, search, statusFilter, phaseFilter, yearFilter])

  const filteredStats = useMemo(() => {
    const remaining = filtered.filter(a => !['complete', 'verified'].includes(a.archive_status)).length
    const partial = filtered.filter(a => a.archive_status === 'partial').length
    return { total: filtered.length, remaining, partial }
  }, [filtered])

  const pct = stats.total > 0 ? Math.round((stats.archived / stats.total) * 100) : 0

  const columns = useMemo<ColumnDef<ArchiveRow, any>[]>(() => [
    {
      accessorKey: 'bride_name',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Couple" />,
      cell: ({ row }) => {
        const a = row.original
        return (
          <div className="flex items-center gap-2">
            <span className="font-medium text-blue-700 dark:text-blue-400">
              {a.bride_name} & {a.groom_name}
            </span>
            <span className={`inline-flex items-center rounded-full px-1.5 py-0.5 text-[10px] font-medium ${PHASE_COLORS[a.couple_phase] || 'bg-gray-100 text-gray-700'}`}>
              {PHASE_LABELS[a.couple_phase] || a.couple_phase}
            </span>
          </div>
        )
      },
      sortingFn: (rowA, rowB) => {
        const a = `${rowA.original.bride_name || ''}`.toLowerCase()
        const b = `${rowB.original.bride_name || ''}`.toLowerCase()
        return a.localeCompare(b)
      },
    },
    {
      accessorKey: 'wedding_date',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Date" />,
      cell: ({ row }) => {
        const d = row.original.wedding_date
        return d ? formatWeddingDateShort(d) : '—'
      },
    },
    {
      accessorKey: 'package_type',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Package" className="justify-center" />,
      cell: ({ row }) => {
        const pkg = row.original.package_type
        return (
          <div className="text-center">
            <Badge className={pkg === 'photo_only' ? 'bg-green-100 text-green-700 border-green-300' : 'bg-blue-100 text-blue-700 border-blue-300'}>
              {pkg === 'photo_only' ? 'PHOTO' : 'P+V'}
            </Badge>
          </div>
        )
      },
    },
    {
      id: 'engagement',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Eng" className="justify-center" />,
      cell: ({ row }) => {
        const status = getEngStatus(row.original)
        const colors = status === 'shot' ? 'bg-green-100 text-green-700' : status === 'declined' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'
        const label = status === 'shot' ? 'Shot' : status === 'declined' ? 'Declined' : 'Pending'
        return <div className="text-center"><Badge className={colors}>{label}</Badge></div>
      },
      sortingFn: (rowA, rowB) => {
        const order = { shot: 0, pending: 1, declined: 2 }
        return (order[getEngStatus(rowA.original)] || 0) - (order[getEngStatus(rowB.original)] || 0)
      },
    },
    {
      id: 'located',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Located" className="justify-center" />,
      cell: ({ row }) => {
        const { located, total } = getLocatedCount(row.original)
        const color = located === total ? 'text-green-700' : located > 0 ? 'text-amber-700' : 'text-gray-400'
        return <div className={`text-center font-semibold ${color}`}>{located}/{total}</div>
      },
      sortingFn: (rowA, rowB) => {
        const a = getLocatedCount(rowA.original)
        const b = getLocatedCount(rowB.original)
        return (a.located / (a.total || 1)) - (b.located / (b.total || 1))
      },
    },
    {
      accessorKey: 'archive_status',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Status" className="justify-center" />,
      cell: ({ row }) => {
        const s = row.original.archive_status
        const cfg: Record<string, { dot: string; bg: string; text: string; label: string }> = {
          not_started: { dot: 'bg-gray-400', bg: 'bg-gray-100', text: 'text-gray-600', label: 'Not Started' },
          partial: { dot: 'bg-amber-500', bg: 'bg-amber-100', text: 'text-amber-700', label: 'Partial' },
          complete: { dot: 'bg-green-500', bg: 'bg-green-100', text: 'text-green-700', label: 'Complete' },
          verified: { dot: 'bg-blue-500', bg: 'bg-blue-100', text: 'text-blue-700', label: 'Verified' },
        }
        const c = cfg[s] || cfg.not_started
        return (
          <div className="flex items-center justify-center gap-1.5">
            <span className={`inline-block h-2 w-2 rounded-full ${c.dot}`} />
            <Badge className={`${c.bg} ${c.text}`}>{c.label}</Badge>
          </div>
        )
      },
      sortingFn: (rowA, rowB) => {
        const order: Record<string, number> = { not_started: 0, partial: 1, complete: 2, verified: 3 }
        return (order[rowA.original.archive_status] || 0) - (order[rowB.original.archive_status] || 0)
      },
    },
    {
      id: 'mkt',
      header: 'MKT',
      cell: ({ row }) => <div className="text-center">{row.original.on_marketing_drive ? '✓' : '—'}</div>,
      enableSorting: false,
    },
    {
      id: 'aws',
      header: 'AWS',
      cell: ({ row }) => <div className="text-center">{row.original.on_aws ? '✓' : '—'}</div>,
      enableSorting: false,
    },
  ], [])

  if (loading) {
    return <div className="p-8 text-center text-muted-foreground">Loading archives...</div>
  }

  return (
    <div className="flex gap-6">
      {/* Main Content */}
      <div className="flex-1 min-w-0 space-y-5">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold">Archives</h1>
          <p className="text-muted-foreground">{stats.total} couples in database</p>
        </div>

        {/* Top Row — Stat Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
          {/* Archive Progress — spans 2 */}
          <div className="col-span-2 rounded-xl border bg-white p-4" style={{ borderTop: '3px solid #f59e0b' }}>
            <div className="flex items-center justify-between mb-3">
              <div>
                <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">Archive Progress</div>
                <div className="text-2xl font-bold">{stats.archived} of {stats.total} couples</div>
                <div className="text-xs text-muted-foreground">couples archived</div>
              </div>
              <div className="text-4xl font-bold" style={{ color: '#f59e0b' }}>{pct}%</div>
            </div>
            <div className="w-full bg-gray-100 rounded-full h-1.5 overflow-hidden">
              <motion.div
                className="h-full rounded-full"
                style={{ background: 'linear-gradient(90deg, #f59e0b, #fbbf24)' }}
                initial={{ width: 0 }}
                animate={{ width: `${pct}%` }}
                transition={{ duration: 1, ease: 'easeOut' }}
              />
            </div>
          </div>

          {/* Partial */}
          <div className="rounded-xl border bg-white p-4" style={{ borderTop: '3px solid #f59e0b' }}>
            <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">Partial</div>
            <div className="text-3xl font-bold text-amber-600">{stats.partial}</div>
          </div>

          {/* Not Started */}
          <div className="rounded-xl border bg-white p-4" style={{ borderTop: '3px solid #9ca3af' }}>
            <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">Not Started</div>
            <div className="text-3xl font-bold text-gray-500">{stats.notStarted}</div>
          </div>

          {/* Ready to Archive */}
          <div className="rounded-xl border bg-white p-4" style={{ borderTop: '3px solid #3b82f6' }}>
            <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">Ready to Archive</div>
            <div className="text-3xl font-bold text-blue-600">{stats.readyToArchive}</div>
            <div className="text-xs text-muted-foreground">post-production</div>
          </div>
        </div>

        {/* Search + Filter */}
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search by name..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full rounded-lg border border-input bg-background pl-9 pr-3 py-2 text-sm outline-none transition-colors focus:border-ring"
                style={{ paddingLeft: '2.25rem' }}
              />
            </div>
            <select
              value={phaseFilter}
              onChange={(e) => setPhaseFilter(e.target.value)}
              className="text-sm rounded-md border border-input bg-background px-3 py-2"
            >
              {PHASE_FILTER_OPTIONS.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="text-sm rounded-md border border-input bg-background px-3 py-2"
            >
              <option value="all">All Statuses</option>
              <option value="not_started">Not Started</option>
              <option value="partial">Partial</option>
              <option value="complete">Complete</option>
              <option value="verified">Verified</option>
            </select>
          </div>
        </div>

        {/* Count line + Table */}
        <div className="rounded-xl border bg-card overflow-hidden">
          <div className="px-4 py-3 border-b flex flex-wrap items-center gap-4 text-sm">
            <span className="font-semibold">{filteredStats.total} couples</span>
            <span className="text-muted-foreground">{filteredStats.remaining} remaining</span>
            <span className="text-muted-foreground/60">{filteredStats.partial} partial</span>
          </div>

          <DataTable
            columns={columns}
            data={filtered}
            emptyMessage="No archives found matching your filters."
            pageSize={20}
            initialSorting={[{ id: 'wedding_date', desc: false }]}
            onRowClick={(row) => router.push(`/admin/archives/${row.couple_id}`)}
            rowClassName={(row) =>
              ['complete', 'verified'].includes(row.archive_status)
                ? 'opacity-45 bg-gray-50'
                : 'hover:bg-[#f8fafc] cursor-pointer'
            }
          />
        </div>
      </div>

      {/* Right Sidebar */}
      <div className="hidden lg:block w-[200px] flex-shrink-0 space-y-4">
        {/* Year Filter */}
        <div className="rounded-xl border bg-card p-4">
          <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">Filter by Year</h3>
          <div className="space-y-1">
            <button
              onClick={() => setYearFilter('all')}
              className={`w-full flex items-center justify-between text-sm px-2 py-1.5 rounded transition-colors ${
                yearFilter === 'all' ? 'bg-blue-50 text-blue-700 font-semibold border border-blue-300' : 'hover:bg-gray-100 text-muted-foreground'
              }`}
            >
              <span>All</span>
              <span className="font-semibold">{archives.length}</span>
            </button>
            {years.map(yr => {
              const count = archives.filter(a => a.wedding_date && parseInt(a.wedding_date.substring(0, 4)) === yr).length
              return (
                <button
                  key={yr}
                  onClick={() => setYearFilter(yearFilter === yr ? 'all' : yr)}
                  className={`w-full flex items-center justify-between text-sm px-2 py-1.5 rounded transition-colors ${
                    yearFilter === yr ? 'bg-blue-50 text-blue-700 font-semibold border border-blue-300' : 'hover:bg-gray-100 text-muted-foreground'
                  }`}
                >
                  <span>{yr}</span>
                  <span className="font-semibold">{count}</span>
                </button>
              )
            })}
          </div>
        </div>

        {/* On Marketing */}
        <div className="rounded-xl border bg-card p-4" style={{ borderTop: '3px solid #7c3aed' }}>
          <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">On Marketing</div>
          <div className="text-3xl font-bold" style={{ color: '#7c3aed' }}>{stats.onMarketing}</div>
        </div>

        {/* On AWS */}
        <div className="rounded-xl border bg-card p-4" style={{ borderTop: '3px solid #0891b2' }}>
          <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">On AWS</div>
          <div className="text-3xl font-bold" style={{ color: '#0891b2' }}>{stats.onAws}</div>
        </div>

        {/* Research Links */}
        <div className="rounded-xl border bg-card p-4" style={{ borderTop: '3px solid #f59e0b' }}>
          <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Research</div>
          <div className="space-y-2">
            {RESEARCH_LINKS.map(link => (
              <a
                key={link.label}
                href={link.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 text-xs text-blue-600 hover:text-blue-800 hover:underline"
              >
                <ExternalLink className="h-3 w-3 shrink-0" />
                <span>{link.label}</span>
              </a>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
