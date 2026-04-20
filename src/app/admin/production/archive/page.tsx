'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatBytes(bytes: number, decimals = 2): string {
  if (!bytes) return '0 B'
  const tb = bytes / (1024 ** 4)
  if (tb >= 0.1) return `${tb.toFixed(decimals)} TB`
  const gb = bytes / (1024 ** 3)
  return `${gb.toFixed(1)} GB`
}

function formatTB(bytes: number): string {
  return (bytes / (1024 ** 4)).toFixed(2)
}

function usagePercent(used: number, capacity: number): number {
  if (!capacity) return 0
  return Math.round((used / capacity) * 100)
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

interface DriveRow {
  drive_number: number
  drive_name: string
  capacity_bytes: number
  used_bytes: number
  free_bytes: number
  scanned_at: string
  folder_count: number
}

interface YearRow {
  wedding_year: number
  couples: number
}

interface CoupleRow {
  bride: string
  groom: string
  wedding_date: string | null
  wedding_year: number
}

interface ArchiveDriveEntry {
  bride: string
  groom: string
  drive_number: number
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function ArchivePage() {
  const [driveCount, setDriveCount] = useState(0)
  const [totalUsed, setTotalUsed] = useState(0)
  const [folderCount, setFolderCount] = useState(0)
  const [coupleCount, setCoupleCount] = useState(0)
  const [drives, setDrives] = useState<DriveRow[]>([])
  const [years, setYears] = useState<YearRow[]>([])
  const [allCouples, setAllCouples] = useState<CoupleRow[]>([])
  const [allArchiveDrives, setAllArchiveDrives] = useState<ArchiveDriveEntry[]>([])
  const [selectedYear, setSelectedYear] = useState<number | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      // Fetch header stats + raw data in parallel
      const [drivesRes, foldersRes, couplesRes, allCouplesRes, archiveDrivesRes] = await Promise.all([
        supabase
          .from('vault_drives')
          .select('id, drive_number, drive_name, capacity_bytes, used_bytes, free_bytes, scanned_at')
          .order('drive_number'),
        supabase
          .from('vault_archive')
          .select('id, drive_id', { count: 'exact' }),
        supabase
          .from('vault_historical_couples')
          .select('id, wedding_year', { count: 'exact' }),
        supabase
          .from('vault_historical_couples')
          .select('bride, groom, wedding_date, wedding_year')
          .order('wedding_date', { ascending: true, nullsFirst: false })
          .order('bride', { ascending: true }),
        supabase
          .from('vault_archive')
          .select('bride, groom, drive_id, vault_drives(drive_number)')
          .order('bride'),
      ])

      // Header stats
      const rawDrives = drivesRes.data || []
      setDriveCount(rawDrives.length)
      setTotalUsed(
        rawDrives.reduce((sum: number, d: any) => sum + (d.used_bytes || 0), 0),
      )
      setFolderCount(foldersRes.count ?? foldersRes.data?.length ?? 0)
      setCoupleCount(couplesRes.count ?? couplesRes.data?.length ?? 0)

      // Drive grid — count folders per drive client-side
      const folderMap: Record<string, number> = {}
      foldersRes.data?.forEach((f: any) => {
        folderMap[f.drive_id] = (folderMap[f.drive_id] || 0) + 1
      })
      setDrives(
        rawDrives.map((d: any) => ({
          drive_number: d.drive_number,
          drive_name: d.drive_name,
          capacity_bytes: d.capacity_bytes,
          used_bytes: d.used_bytes,
          free_bytes: d.free_bytes,
          scanned_at: d.scanned_at,
          folder_count: folderMap[d.id] || 0,
        })),
      )

      // Year summary — group client-side
      const yearMap: Record<number, number> = {}
      couplesRes.data?.forEach((c: any) => {
        if (c.wedding_year) {
          yearMap[c.wedding_year] = (yearMap[c.wedding_year] || 0) + 1
        }
      })
      const sortedYears = Object.entries(yearMap)
        .map(([y, count]) => ({ wedding_year: Number(y), couples: count }))
        .sort((a, b) => b.wedding_year - a.wedding_year)
      setYears(sortedYears)

      // All couples for drill-down
      if (allCouplesRes.data) {
        setAllCouples(allCouplesRes.data as CoupleRow[])
      }

      // Archive drive mappings — flatten the join
      if (archiveDrivesRes.data) {
        const entries: ArchiveDriveEntry[] = []
        archiveDrivesRes.data.forEach((a: any) => {
          const dn = a.vault_drives?.drive_number
          if (dn != null && a.bride && a.groom) {
            entries.push({ bride: a.bride, groom: a.groom, drive_number: dn })
          }
        })
        setAllArchiveDrives(entries)
      }

      // Default selected year = most recent
      if (sortedYears.length > 0) {
        setSelectedYear(sortedYears[0].wedding_year)
      }

      setLoading(false)
    }

    load()
  }, [])

  const maxCouples = Math.max(...years.map((y) => y.couples), 1)

  // Couples for selected year
  const yearCouples = selectedYear
    ? allCouples.filter((c) => c.wedding_year === selectedYear)
    : []

  // Drive map for selected year — keyed by lowercase "bride|groom"
  const driveMap = new Map<string, number[]>()
  if (selectedYear) {
    allArchiveDrives.forEach((a) => {
      const key = `${a.bride.toLowerCase()}|${a.groom.toLowerCase()}`
      if (!driveMap.has(key)) driveMap.set(key, [])
      const arr = driveMap.get(key)!
      if (!arr.includes(a.drive_number)) arr.push(a.drive_number)
    })
  }

  // Distinct years for pills
  const distinctYears = years.map((y) => y.wedding_year)

  // ------------------------------- RENDER -----------------------------------

  if (loading) {
    return (
      <div
        className="flex items-center justify-center min-h-screen"
        style={{ background: V.bg, color: V.muted, fontFamily: V.mono }}
      >
        <p className="text-sm tracking-widest uppercase animate-pulse">
          Loading vault...
        </p>
      </div>
    )
  }

  return (
    <div className="min-h-screen p-6 md:p-10" style={{ background: V.bg, color: V.text }}>
      {/* ------------------------------------------------------------------ */}
      {/* HEADER STATS                                                       */}
      {/* ------------------------------------------------------------------ */}
      <div className="mb-10">
        <h1
          className="text-2xl font-bold tracking-widest uppercase mb-6"
          style={{ color: V.amber, fontFamily: V.mono }}
        >
          Vault Archive
        </h1>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatTile label="DRIVES" value={String(driveCount)} />
          <StatTile label="TB ARCHIVED" value={formatTB(totalUsed)} />
          <StatTile label="FOLDERS" value={folderCount.toLocaleString()} />
          <StatTile label="COUPLES CATALOGUED" value={coupleCount.toLocaleString()} />
        </div>
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* DRIVE GRID                                                         */}
      {/* ------------------------------------------------------------------ */}
      <div className="mb-10">
        <h2
          className="text-xs font-semibold tracking-[0.2em] uppercase mb-4"
          style={{ color: V.muted }}
        >
          Drive Inventory
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {drives.map((d) => (
            <DriveCard key={d.drive_number} drive={d} />
          ))}
        </div>
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* YEAR SUMMARY TABLE                                                 */}
      {/* ------------------------------------------------------------------ */}
      <div className="mb-10">
        <h2
          className="text-xs font-semibold tracking-[0.2em] uppercase mb-4"
          style={{ color: V.muted }}
        >
          Couples by Year
        </h2>

        <div
          className="rounded-lg overflow-hidden"
          style={{ border: `1px solid ${V.border}`, background: V.surface }}
        >
          <table className="w-full text-sm">
            <thead>
              <tr style={{ borderBottom: `1px solid ${V.border}` }}>
                <th
                  className="text-left px-4 py-3 text-xs tracking-[0.15em] uppercase"
                  style={{ color: V.muted }}
                >
                  Year
                </th>
                <th
                  className="px-4 py-3 text-xs tracking-[0.15em] uppercase w-24"
                  style={{ color: V.muted, textAlign: 'right' }}
                >
                  Couples
                </th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {years.map((y) => (
                <tr
                  key={y.wedding_year}
                  style={{ borderBottom: `1px solid ${V.border}` }}
                >
                  <td
                    className="px-4 py-2.5 font-semibold"
                    style={{ fontFamily: V.mono }}
                  >
                    {y.wedding_year}
                  </td>
                  <td
                    className="px-4 py-2.5 font-semibold"
                    style={{ fontFamily: V.mono, textAlign: 'right' }}
                  >
                    {y.couples}
                  </td>
                  <td className="px-4 py-2.5">
                    <div
                      className="h-3 rounded-sm"
                      style={{
                        width: `${(y.couples / maxCouples) * 100}%`,
                        background: V.amber,
                        opacity: 0.7,
                        minWidth: '4px',
                      }}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* COUPLES DRILL-DOWN                                                 */}
      {/* ------------------------------------------------------------------ */}
      <div>
        <h2
          className="text-xs font-semibold tracking-[0.2em] uppercase mb-4"
          style={{ color: V.muted }}
        >
          Couple Lookup
        </h2>

        {/* Year pills */}
        <div className="flex flex-wrap gap-2 mb-4">
          {distinctYears.map((y) => (
            <button
              key={y}
              onClick={() => setSelectedYear(y)}
              className="px-3 py-1.5 rounded text-xs font-semibold transition-all"
              style={{
                fontFamily: V.mono,
                background: selectedYear === y ? V.amber : V.surface,
                color: selectedYear === y ? V.bg : V.muted,
                border: `1px solid ${selectedYear === y ? V.amber : V.border}`,
              }}
              onMouseEnter={(e) => {
                if (selectedYear !== y) e.currentTarget.style.borderColor = V.amber
              }}
              onMouseLeave={(e) => {
                if (selectedYear !== y) e.currentTarget.style.borderColor = V.border
              }}
            >
              {y}
            </button>
          ))}
        </div>

        {/* Couples table */}
        {selectedYear && (
          <div
            className="rounded-lg overflow-hidden"
            style={{ border: `1px solid ${V.border}`, background: V.surface }}
          >
            <table className="w-full text-sm">
              <thead>
                <tr style={{ borderBottom: `1px solid ${V.border}` }}>
                  <th
                    className="text-left px-4 py-3 text-xs tracking-[0.15em] uppercase w-12"
                    style={{ color: V.muted }}
                  >
                    #
                  </th>
                  <th
                    className="text-left px-4 py-3 text-xs tracking-[0.15em] uppercase"
                    style={{ color: V.muted }}
                  >
                    Bride
                  </th>
                  <th
                    className="text-left px-4 py-3 text-xs tracking-[0.15em] uppercase"
                    style={{ color: V.muted }}
                  >
                    Groom
                  </th>
                  <th
                    className="text-left px-4 py-3 text-xs tracking-[0.15em] uppercase"
                    style={{ color: V.muted }}
                  >
                    Wedding Date
                  </th>
                  <th
                    className="text-left px-4 py-3 text-xs tracking-[0.15em] uppercase"
                    style={{ color: V.muted }}
                  >
                    Drives
                  </th>
                </tr>
              </thead>
              <tbody>
                {yearCouples.map((c, i) => {
                  const key = `${c.bride.toLowerCase()}|${c.groom.toLowerCase()}`
                  const couplesDrives = driveMap.get(key)?.sort((a, b) => a - b) || []
                  return (
                    <tr
                      key={`${c.bride}-${c.groom}-${i}`}
                      style={{ borderBottom: `1px solid ${V.border}` }}
                    >
                      <td
                        className="px-4 py-2.5"
                        style={{ fontFamily: V.mono, color: V.muted }}
                      >
                        {i + 1}
                      </td>
                      <td className="px-4 py-2.5 font-medium">{c.bride}</td>
                      <td className="px-4 py-2.5">{c.groom}</td>
                      <td
                        className="px-4 py-2.5"
                        style={{ color: V.muted }}
                      >
                        {c.wedding_date
                          ? new Date(c.wedding_date).toLocaleDateString('en-US', {
                              month: 'short',
                              day: 'numeric',
                              year: 'numeric',
                            })
                          : '—'}
                      </td>
                      <td className="px-4 py-2.5">
                        {couplesDrives.length > 0 ? (
                          <div className="flex gap-1.5 flex-wrap">
                            {couplesDrives.map((dn) => (
                              <span
                                key={dn}
                                className="inline-block px-1.5 py-0.5 rounded text-xs font-semibold"
                                style={{
                                  fontFamily: V.mono,
                                  background: V.amberDim,
                                  color: V.amber,
                                }}
                              >
                                {String(dn).padStart(3, '0')}
                              </span>
                            ))}
                          </div>
                        ) : (
                          <span style={{ color: V.muted }}>—</span>
                        )}
                      </td>
                    </tr>
                  )
                })}
                {yearCouples.length === 0 && (
                  <tr>
                    <td
                      colSpan={5}
                      className="px-4 py-6 text-center text-sm"
                      style={{ color: V.muted }}
                    >
                      No couples for {selectedYear}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function StatTile({ label, value }: { label: string; value: string }) {
  return (
    <div
      className="rounded-lg px-5 py-4"
      style={{
        background: V.surface,
        border: `1px solid ${V.border}`,
      }}
    >
      <p
        className="text-xs tracking-[0.2em] uppercase mb-1"
        style={{ color: V.muted }}
      >
        {label}
      </p>
      <p
        className="text-2xl font-bold"
        style={{ fontFamily: V.mono, color: V.text }}
      >
        {value}
      </p>
    </div>
  )
}

function DriveCard({ drive }: { drive: DriveRow }) {
  const pct = usagePercent(drive.used_bytes, drive.capacity_bytes)
  const scannedDate = drive.scanned_at
    ? new Date(drive.scanned_at).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      })
    : null

  return (
    <div
      className="rounded-lg p-5"
      style={{
        background: V.surface,
        border: `1px solid ${V.border}`,
      }}
    >
      {/* Drive number + name */}
      <div className="mb-3">
        <p
          className="text-3xl font-bold leading-none"
          style={{ fontFamily: V.mono, color: V.text }}
        >
          {String(drive.drive_number).padStart(3, '0')}
        </p>
        <p
          className="text-xs mt-1 truncate"
          style={{ color: V.muted }}
        >
          {drive.drive_name}
        </p>
      </div>

      {/* Capacity bar */}
      <div className="mb-3">
        <div
          className="h-2 rounded-full overflow-hidden"
          style={{ background: V.borderBright }}
        >
          <div
            className="h-full rounded-full transition-all"
            style={{
              width: `${pct}%`,
              background: pct > 90 ? '#ef4444' : V.amber,
            }}
          />
        </div>
        <div className="flex justify-between mt-1.5">
          <span
            className="text-xs"
            style={{ fontFamily: V.mono, color: V.muted }}
          >
            {formatBytes(drive.used_bytes)} / {formatBytes(drive.capacity_bytes)}
          </span>
          <span
            className="text-xs"
            style={{ fontFamily: V.mono, color: V.muted }}
          >
            {pct}%
          </span>
        </div>
      </div>

      {/* Meta row */}
      <div className="flex items-center justify-between text-xs" style={{ color: V.muted }}>
        <span style={{ fontFamily: V.mono, color: V.green }}>
          {formatBytes(drive.free_bytes)} free
        </span>
        <span style={{ fontFamily: V.mono }}>
          {drive.folder_count} folders
        </span>
      </div>

      {scannedDate && (
        <p className="text-xs mt-2" style={{ color: V.muted }}>
          Scanned {scannedDate}
        </p>
      )}
    </div>
  )
}
