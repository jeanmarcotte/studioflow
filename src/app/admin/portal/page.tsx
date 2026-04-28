'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'
import { Eye } from 'lucide-react'
import { formatWeddingDate } from '@/lib/formatters'

interface PortalCouple {
  id: string
  bride_first_name: string
  groom_first_name: string
  wedding_date: string | null
  portal_slug: string | null
  portal_invite_sent_at: string | null
  portal_first_login_at: string | null
  portal_last_login_at: string | null
}

export default function PortalAdminPage() {
  const [couples, setCouples] = useState<PortalCouple[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetch() {
      const { data } = await supabase
        .from('couples')
        .select('id, bride_first_name, groom_first_name, wedding_date, portal_slug, portal_invite_sent_at, portal_first_login_at, portal_last_login_at')
        .not('portal_slug', 'is', null)
        .order('wedding_date', { ascending: false })
      setCouples(data ?? [])
      setLoading(false)
    }
    fetch()
  }, [])

  function getStatus(c: PortalCouple): { label: string; color: string; bg: string } {
    if (c.portal_first_login_at) return { label: 'Active', color: '#0F6E56', bg: '#e6f5f0' }
    if (c.portal_invite_sent_at) return { label: 'Invited', color: '#D85A30', bg: '#fef3ee' }
    return { label: 'Never invited', color: '#999', bg: '#f5f5f5' }
  }

  if (loading) {
    return <div className="p-8 text-center text-muted-foreground">Loading portals...</div>
  }

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl md:text-2xl font-bold">Portal Admin</h1>
        <span className="text-sm text-muted-foreground">{couples.length} portals</span>
      </div>

      <div className="space-y-2">
        {couples.map(c => {
          const status = getStatus(c)
          return (
            <div key={c.id} className="flex items-center justify-between bg-white rounded-lg border px-4 py-3">
              <div className="flex items-center gap-3 flex-wrap">
                <Link href={`/admin/portal/${c.id}`} className="font-medium hover:underline">
                  {c.bride_first_name} & {c.groom_first_name}
                </Link>
                <span className="text-xs text-muted-foreground">{formatWeddingDate(c.wedding_date)}</span>
                <span
                  className="text-xs font-medium px-2 py-0.5 rounded-full"
                  style={{ backgroundColor: status.bg, color: status.color }}
                >
                  {status.label}
                </span>
              </div>
              <div className="flex items-center gap-3 shrink-0">
                {c.portal_slug && (
                  <a
                    href={`/portal/${c.portal_slug}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    Preview
                  </a>
                )}
                <Link href={`/admin/portal/${c.id}`} className="text-xs text-muted-foreground hover:text-foreground">
                  Edit →
                </Link>
              </div>
            </div>
          )
        })}
        {couples.length === 0 && (
          <p className="text-center text-muted-foreground py-8">No couples have portal slugs yet.</p>
        )}
      </div>
    </div>
  )
}
