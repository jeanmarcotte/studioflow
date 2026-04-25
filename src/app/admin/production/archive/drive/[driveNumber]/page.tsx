'use client'

import { useEffect, useState, useMemo } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { ArrowLeft } from 'lucide-react'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatBytes(bytes: number): string {
  if (!bytes) return '0 GB'
  const gb = Math.round(bytes / (1024 ** 3))
  return `${gb.toLocaleString()} GB`
}

function usagePercent(used: number, capacity: number): number {
  if (!capacity) return 0
  return Math.round((used / capacity) * 100)
}

const CATEGORY_LABELS: Record<string, string> = {
  raw_photos: 'RAW PHOTOS',
  raw_video: 'RAW VIDEO',
  high_res: 'HIGH RES',
  photo_projects: 'PHOTO PROJECT',
  video_projects: 'VIDEO PROJECT',
  eng_photos: 'ENG PHOTOS',
  digital_albums_wed: 'WEDDING ALBUM',
  digital_albums_eng: 'ENG ALBUM',
  eng_projects: 'ENG PROJECT',
  video_finals: 'VIDEO FINAL',
}

// ---------------------------------------------------------------------------
// Vault design tokens
// ---------------------------------------------------------------------------

const V = {
  bg: '#0a0c10',
  surface: '#111318',
  border: '#1e2128',
  borderBright: '#2a2f3a',
  amber: '#f59e0b',
  amberDim: '#92400e',
  text: '#e2e8f0',
  muted: '#64748b',
  green: '#10b981',
  mono: "'JetBrains Mono', 'IBM Plex Mono', 'Courier New', monospace",
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface DriveData {
  drive_number: number
  drive_name: string
  capacity_bytes: number
  used_bytes: number
  free_bytes: number
  scanned_at: string | null
}

interface FolderRow {
  bride: string
  groom: string
  wedding_year: number | null
  category: string | null
  file_count: number | null
  size_bytes: number | null
  verified_date: string | null
}

type SortKey = 'bride' | 'groom' | 'wedding_year' | 'category' | 'file_count' | 'size_bytes'
type SortDir = 'asc' | 'desc'

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function DriveDetailPage() {
  const params = useParams()
  const driveNumber = Number(params.driveNumber)

  const [drive, setDrive] = useState<DriveData | null>(null)
  const [folders, setFolders] = useState<FolderRow[]>([])
  const [loading, setLoading] = useState(true)
  const [sortKey, setSortKey] = useState<SortKey>('wedding_year')
  const [sortDir, setSortDir] = useState<SortDir>('desc')

  useEffect(() => {
    async function load() {
      const [driveRes, foldersRes] = await Promise.all([
        supabase
          .from('vault_drives')
          .select('drive_number, drive_name, capacity_bytes, used_bytes, free_bytes, scanned_at')
          .eq('drive_number', driveNumber)
          .limit(1),
        supabase
          .from('vault_archive')
          .select('bride, groom, wedding_year, category, file_count, size_bytes, verified_date, vault_drives!inner(drive_number)')
          .eq('vault_drives.drive_number', driveNumber)
          .order('wedding_year', { ascending: false })
          .order('bride', { ascending: true }),
      ])

      if (driveRes.data?.[0]) setDrive(driveRes.data[0] as DriveData)
      if (foldersRes.data) setFolders(foldersRes.data as FolderRow[])
      setLoading(false)
    }

    if (driveNumber) load()
  }, [driveNumber])

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortKey(key)
      setSortDir(key === 'wedding_year' ? 'desc' : 'asc')
    }
  }

  const sortedFolders = useMemo(() => {
    const dir = sortDir === 'asc' ? 1 : -1
    return [...folders].sort((a, b) => {
      switch (sortKey) {
        case 'bride':
          return (a.bride || '').localeCompare(b.bride || '') * dir
        case 'groom':
          return (a.groom || '').localeCompare(b.groom || '') * dir
        case 'wedding_year':
          return ((a.wedding_year || 0) - (b.wedding_year || 0)) * dir
        case 'category':
          return (a.category || '').localeCompare(b.category || '') * dir
        case 'file_count':
          return ((a.file_count || 0) - (b.file_count || 0)) * dir
        case 'size_bytes':
          return ((a.size_bytes || 0) - (b.size_bytes || 0)) * dir
        default:
          return 0
      }
    })
  }, [folders, sortKey, sortDir])

  // Totals
  const totalFiles = folders.reduce((s, f) => s + (f.file_count || 0), 0)
  const totalSize = folders.reduce((s, f) => s + (f.size_bytes || 0), 0)

  // ------------------------------- RENDER -----------------------------------

  if (loading) {
    return (
      <div
        className="flex items-center justify-center min-h-screen"
        style={{ background: V.bg, color: V.muted, fontFamily: V.mono }}
      >
        <p className="text-sm tracking-widest uppercase animate-pulse">
          Loading drive...
        </p>
      </div>
    )
  }

  if (!drive) {
    return (
      <div
        className="flex flex-col items-center justify-center min-h-screen gap-4"
        style={{ background: V.bg, color: V.muted }}
      >
        <p className="text-sm">Drive {driveNumber} not found</p>
        <Link
          href="/admin/production/archive"
          className="text-sm underline"
          style={{ color: V.amber }}
        >
          ← Archive
        </Link>
      </div>
    )
  }

  const pct = usagePercent(drive.used_bytes, drive.capacity_bytes)
  const scannedDate = drive.scanned_at
    ? new Date(drive.scanned_at).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      })
    : null

  return (
    <div className="min-h-screen p-6 md:p-10" style={{ background: V.bg, color: V.text }}>
      {/* Back link */}
      <Link
        href="/admin/production/archive"
        className="inline-flex items-center gap-1.5 text-xs tracking-widest uppercase mb-6"
        style={{ color: V.amber }}
      >
        <ArrowLeft className="w-3.5 h-3.5" />
        Archive
      </Link>

      {/* ------------------------------------------------------------------ */}
      {/* DRIVE HEADER CARD                                                  */}
      {/* ------------------------------------------------------------------ */}
      <div
        className="rounded-lg p-6 mb-10"
        style={{ background: V.surface, border: `1px solid ${V.border}` }}
      >
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-4">
          <div>
            <p
              className="text-4xl font-bold leading-none"
              style={{ fontFamily: V.mono, color: V.text }}
            >
              {String(drive.drive_number).padStart(3, '0')}
            </p>
            <p className="text-sm mt-1" style={{ color: V.muted }}>
              {drive.drive_name}
            </p>
          </div>
          <div className="flex gap-6 text-sm" style={{ color: V.muted }}>
            <div>
              <span className="text-xs tracking-[0.15em] uppercase block mb-0.5">Folders</span>
              <span style={{ fontFamily: V.mono, color: V.text }} className="font-semibold">
                {folders.length}
              </span>
            </div>
            {scannedDate && (
              <div>
                <span className="text-xs tracking-[0.15em] uppercase block mb-0.5">Scanned</span>
                <span style={{ fontFamily: V.mono, color: V.text }} className="font-semibold">
                  {scannedDate}
                </span>
              </div>
            )}
            <div>
              <span className="text-xs tracking-[0.15em] uppercase block mb-0.5">Free</span>
              <span style={{ fontFamily: V.mono, color: V.green }} className="font-semibold">
                {formatBytes(drive.free_bytes)}
              </span>
            </div>
          </div>
        </div>

        {/* Capacity bar */}
        <div>
          <div
            className="h-2.5 rounded-full overflow-hidden"
            style={{ background: V.borderBright }}
          >
            <div
              className="h-full rounded-full"
              style={{
                width: `${pct}%`,
                background: pct > 90 ? '#ef4444' : V.amber,
              }}
            />
          </div>
          <div className="flex justify-between mt-1.5">
            <span className="text-xs" style={{ fontFamily: V.mono, color: V.muted }}>
              {formatBytes(drive.used_bytes)} / {formatBytes(drive.capacity_bytes)}
            </span>
            <span className="text-xs" style={{ fontFamily: V.mono, color: V.muted }}>
              {pct}%
            </span>
          </div>
        </div>
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* FOLDERS TABLE                                                      */}
      {/* ------------------------------------------------------------------ */}
      <div>
        <h2
          className="text-xs font-semibold tracking-[0.2em] uppercase mb-4"
          style={{ color: V.muted }}
        >
          Folder Contents
        </h2>

        <div
          className="rounded-lg overflow-hidden"
          style={{ border: `1px solid ${V.border}`, background: V.surface }}
        >
          <table className="w-full text-sm">
            <thead>
              <tr style={{ borderBottom: `1px solid ${V.border}` }}>
                <SortHeader label="#" sortable={false} />
                <SortHeader label="BRIDE" sortKey="bride" currentKey={sortKey} dir={sortDir} onSort={handleSort} />
                <SortHeader label="GROOM" sortKey="groom" currentKey={sortKey} dir={sortDir} onSort={handleSort} />
                <SortHeader label="YEAR" sortKey="wedding_year" currentKey={sortKey} dir={sortDir} onSort={handleSort} />
                <SortHeader label="CATEGORY" sortKey="category" currentKey={sortKey} dir={sortDir} onSort={handleSort} />
                <SortHeader label="FILES" sortKey="file_count" currentKey={sortKey} dir={sortDir} onSort={handleSort} align="right" />
                <SortHeader label="SIZE" sortKey="size_bytes" currentKey={sortKey} dir={sortDir} onSort={handleSort} align="right" />
              </tr>
            </thead>
            <tbody>
              {sortedFolders.map((f, i) => (
                <tr
                  key={`${f.bride}-${f.groom}-${f.category}-${i}`}
                  style={{ borderBottom: `1px solid ${V.border}` }}
                >
                  <td className="px-4 py-2.5" style={{ fontFamily: V.mono, color: V.muted }}>
                    {i + 1}
                  </td>
                  <td className="px-4 py-2.5 font-medium">{f.bride}</td>
                  <td className="px-4 py-2.5">{f.groom}</td>
                  <td className="px-4 py-2.5" style={{ fontFamily: V.mono }}>
                    {f.wedding_year || '—'}
                  </td>
                  <td className="px-4 py-2.5">
                    <span
                      className="text-xs font-semibold tracking-[0.1em]"
                      style={{ color: V.amber }}
                    >
                      {f.category ? (CATEGORY_LABELS[f.category] || f.category.toUpperCase()) : '—'}
                    </span>
                  </td>
                  <td
                    className="px-4 py-2.5"
                    style={{ fontFamily: V.mono, color: V.muted, textAlign: 'right' }}
                  >
                    {f.file_count ? f.file_count.toLocaleString() : '—'}
                  </td>
                  <td
                    className="px-4 py-2.5"
                    style={{ fontFamily: V.mono, color: V.muted, textAlign: 'right' }}
                  >
                    {f.size_bytes ? formatBytes(f.size_bytes) : '—'}
                  </td>
                </tr>
              ))}
              {sortedFolders.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-6 text-center text-sm" style={{ color: V.muted }}>
                    No folders on this drive
                  </td>
                </tr>
              )}
            </tbody>
            {sortedFolders.length > 0 && (
              <tfoot>
                <tr style={{ borderTop: `2px solid ${V.borderBright}` }}>
                  <td className="px-4 py-3" style={{ color: V.muted }} />
                  <td
                    colSpan={4}
                    className="px-4 py-3 text-xs font-semibold tracking-[0.15em] uppercase"
                    style={{ color: V.muted }}
                  >
                    {sortedFolders.length} rows
                  </td>
                  <td
                    className="px-4 py-3 font-semibold"
                    style={{ fontFamily: V.mono, color: V.text, textAlign: 'right' }}
                  >
                    {totalFiles.toLocaleString()}
                  </td>
                  <td
                    className="px-4 py-3 font-semibold"
                    style={{ fontFamily: V.mono, color: V.text, textAlign: 'right' }}
                  >
                    {formatBytes(totalSize)}
                  </td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Sort header
// ---------------------------------------------------------------------------

function SortHeader({
  label,
  sortKey,
  currentKey,
  dir,
  onSort,
  sortable = true,
  align = 'left',
}: {
  label: string
  sortKey?: SortKey
  currentKey?: SortKey
  dir?: SortDir
  onSort?: (key: SortKey) => void
  sortable?: boolean
  align?: 'left' | 'right'
}) {
  const isActive = sortable && sortKey === currentKey
  return (
    <th
      className={`px-4 py-3 text-xs tracking-[0.15em] uppercase ${sortable ? 'cursor-pointer select-none' : ''}`}
      style={{ color: isActive ? V.amber : V.muted, textAlign: align }}
      onClick={() => sortable && sortKey && onSort?.(sortKey)}
    >
      {label}
      {isActive && (
        <span className="ml-1 text-[10px]">{dir === 'asc' ? '↑' : '↓'}</span>
      )}
    </th>
  )
}
