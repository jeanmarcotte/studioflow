'use client'

import { useState, useEffect, useMemo } from 'react'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'
import { Eye, ChevronUp, ChevronDown, Pencil } from 'lucide-react'
import { formatWeddingDate, formatDateCompact } from '@/lib/formatters'

interface PortalCouple {
  id: string
  bride_first_name: string
  groom_first_name: string
  wedding_date: string | null
  wedding_year: number | null
  portal_slug: string | null
  portal_invite_sent_at: string | null
  portal_first_login_at: string | null
  portal_last_login_at: string | null
  hero_image_url: string | null
}

type SortKey = 'couple' | 'wedding_date' | 'invite' | 'login' | 'hero'
type SortDir = 'asc' | 'desc'

export default function PortalAdminPage() {
  const [couples, setCouples] = useState<PortalCouple[]>([])
  const [loading, setLoading] = useState(true)
  const [sortKey, setSortKey] = useState<SortKey>('wedding_date')
  const [sortDir, setSortDir] = useState<SortDir>('asc')

  useEffect(() => {
    async function fetch() {
      const { data } = await supabase
        .from('couples')
        .select(`
          id, bride_first_name, groom_first_name, wedding_date, wedding_year,
          portal_invite_sent_at, portal_first_login_at, portal_last_login_at,
          hero_image_url, portal_slug,
          contracts!inner(id)
        `)
        .gte('wedding_year', 2026)
        .order('wedding_date', { ascending: true })
      setCouples((data ?? []).map((c: any) => ({
        id: c.id,
        bride_first_name: c.bride_first_name,
        groom_first_name: c.groom_first_name,
        wedding_date: c.wedding_date,
        wedding_year: c.wedding_year,
        portal_slug: c.portal_slug,
        portal_invite_sent_at: c.portal_invite_sent_at,
        portal_first_login_at: c.portal_first_login_at,
        portal_last_login_at: c.portal_last_login_at,
        hero_image_url: c.hero_image_url,
      })))
      setLoading(false)
    }
    fetch()
  }, [])

  /* ─── Stats ─── */
  const totalCouples = couples.length
  const invitesSent = couples.filter(c => c.portal_invite_sent_at).length
  const loggedIn = couples.filter(c => c.portal_first_login_at).length
  const heroReady = couples.filter(c => c.hero_image_url).length

  /* ─── Sorting ─── */
  function toggleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    } else {
      setSortKey(key)
      setSortDir('asc')
    }
  }

  const sorted = useMemo(() => {
    const arr = [...couples]
    const dir = sortDir === 'asc' ? 1 : -1
    arr.sort((a, b) => {
      switch (sortKey) {
        case 'couple': {
          const an = `${a.bride_first_name} ${a.groom_first_name}`.toLowerCase()
          const bn = `${b.bride_first_name} ${b.groom_first_name}`.toLowerCase()
          return an < bn ? -dir : an > bn ? dir : 0
        }
        case 'wedding_date':
          return ((a.wedding_date ?? '') < (b.wedding_date ?? '') ? -dir : dir)
        case 'invite':
          return ((a.portal_invite_sent_at ?? '') < (b.portal_invite_sent_at ?? '') ? -dir : dir)
        case 'login':
          return ((a.portal_first_login_at ?? '') < (b.portal_first_login_at ?? '') ? -dir : dir)
        case 'hero':
          return ((a.hero_image_url ? 1 : 0) - (b.hero_image_url ? 1 : 0)) * dir
        default:
          return 0
      }
    })
    return arr
  }, [couples, sortKey, sortDir])

  function SortIcon({ col }: { col: SortKey }) {
    if (sortKey !== col) return <ChevronDown className="w-3 h-3 text-gray-300" />
    return sortDir === 'asc'
      ? <ChevronUp className="w-3 h-3 text-gray-600" />
      : <ChevronDown className="w-3 h-3 text-gray-600" />
  }

  if (loading) {
    return <div className="p-8 text-center text-muted-foreground">Loading portals...</div>
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl md:text-2xl font-bold">Portal Admin</h1>
        <span className="text-sm text-muted-foreground">{totalCouples} couples</span>
      </div>

      {/* ─── 4 Stat Cards ─── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white border rounded-lg p-4 text-center">
          <div className="text-sm text-gray-500 mb-1">Couples</div>
          <div className="text-2xl font-bold">{totalCouples}</div>
          <div className="text-xs text-gray-400">2026 booked</div>
        </div>
        <div className={`bg-white border rounded-lg p-4 text-center ${invitesSent === 0 ? 'border-yellow-300' : ''}`}>
          <div className="text-sm text-gray-500 mb-1">Invited</div>
          <div className="text-2xl font-bold">{invitesSent}</div>
          <div className="text-xs text-gray-400">invites out</div>
        </div>
        <div className="bg-white border rounded-lg p-4 text-center">
          <div className="text-sm text-gray-500 mb-1">Logged In</div>
          <div className="text-2xl font-bold">{invitesSent > 0 ? `${loggedIn}/${invitesSent}` : loggedIn}</div>
          <div className="text-xs text-gray-400">first login</div>
        </div>
        <div className="bg-white border rounded-lg p-4 text-center">
          <div className="text-sm text-gray-500 mb-1">Hero Set</div>
          <div className="text-2xl font-bold">{heroReady}/{totalCouples}</div>
          <div className="text-xs text-gray-400">image ready</div>
        </div>
      </div>

      {/* ─── Table ─── */}
      <div className="bg-white border rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-gray-50">
              <th className="px-3 py-2 text-left text-xs font-semibold text-gray-500 w-10">#</th>
              <th className="px-3 py-2 text-left text-xs font-semibold text-gray-500 cursor-pointer select-none" onClick={() => toggleSort('couple')}>
                <span className="inline-flex items-center gap-1">Couple <SortIcon col="couple" /></span>
              </th>
              <th className="px-3 py-2 text-left text-xs font-semibold text-gray-500 cursor-pointer select-none" onClick={() => toggleSort('wedding_date')}>
                <span className="inline-flex items-center gap-1">Wedding Date <SortIcon col="wedding_date" /></span>
              </th>
              <th className="px-3 py-2 text-center text-xs font-semibold text-gray-500 cursor-pointer select-none" onClick={() => toggleSort('invite')}>
                <span className="inline-flex items-center gap-1">Invite Sent <SortIcon col="invite" /></span>
              </th>
              <th className="px-3 py-2 text-center text-xs font-semibold text-gray-500 cursor-pointer select-none" onClick={() => toggleSort('login')}>
                <span className="inline-flex items-center gap-1">First Login <SortIcon col="login" /></span>
              </th>
              <th className="px-3 py-2 text-center text-xs font-semibold text-gray-500 cursor-pointer select-none" onClick={() => toggleSort('hero')}>
                <span className="inline-flex items-center gap-1">Hero <SortIcon col="hero" /></span>
              </th>
              <th className="px-3 py-2 text-right text-xs font-semibold text-gray-500">Actions</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((c, i) => (
              <tr key={c.id} className="border-b last:border-0 hover:bg-gray-50">
                <td className="px-3 py-2 text-xs text-gray-400">{i + 1}</td>
                <td className="px-3 py-2">
                  <Link href={`/admin/portal/${c.id}`} className="font-medium hover:underline">
                    {c.bride_first_name} & {c.groom_first_name}
                  </Link>
                </td>
                <td className="px-3 py-2 text-gray-600">{formatWeddingDate(c.wedding_date)}</td>
                <td className="px-3 py-2 text-center">
                  {c.portal_invite_sent_at ? (
                    <span className="inline-flex items-center text-xs font-medium px-2 py-0.5 rounded-full" style={{ backgroundColor: '#e6f5f0', color: '#0F6E56' }}>✓</span>
                  ) : (
                    <span className="inline-flex items-center text-xs font-medium px-2 py-0.5 rounded-full bg-gray-100 text-gray-400">—</span>
                  )}
                </td>
                <td className="px-3 py-2 text-center">
                  {c.portal_first_login_at ? (
                    <span className="inline-flex items-center text-xs font-medium px-2 py-0.5 rounded-full" style={{ backgroundColor: '#e6f5f0', color: '#0F6E56' }}>
                      ✓ {formatDateCompact(c.portal_first_login_at)}
                    </span>
                  ) : (
                    <span className="inline-flex items-center text-xs font-medium px-2 py-0.5 rounded-full bg-gray-100 text-gray-400">—</span>
                  )}
                </td>
                <td className="px-3 py-2 text-center">
                  {c.hero_image_url ? (
                    <span className="inline-flex items-center text-xs font-medium px-2 py-0.5 rounded-full" style={{ backgroundColor: '#e6f5f0', color: '#0F6E56' }}>🖼️</span>
                  ) : (
                    <span className="inline-flex items-center text-xs font-medium px-2 py-0.5 rounded-full bg-gray-100 text-gray-400">—</span>
                  )}
                </td>
                <td className="px-3 py-2 text-right">
                  <Link href={`/admin/portal/${c.id}`} className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
                    <Pencil className="w-3.5 h-3.5" /> Edit
                  </Link>
                </td>
              </tr>
            ))}
            {couples.length === 0 && (
              <tr>
                <td colSpan={7} className="text-center text-muted-foreground py-8">No couples with contracts found for 2026+.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
