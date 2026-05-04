'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Loader2 } from 'lucide-react'
import { format, parseISO, differenceInDays } from 'date-fns'
import { DigitalArchiveCard } from './DigitalArchiveCard'

interface HistoricalProfile {
  id: string
  bride_first_name: string | null
  bride_last_name: string | null
  groom_first_name: string | null
  groom_last_name: string | null
  bride_email: string | null
  groom_email: string | null
  phone_1: string | null
  phone_2: string | null
  wedding_date: string | null
  wedding_year: number | null
  ceremony_venue: string | null
  reception_venue: string | null
  glacier_archived: boolean | null
}

function notSpecified() {
  return <span className="italic text-slate-400">Not specified</span>
}

function valueOr(v: string | null | undefined): React.ReactNode {
  if (v && v.trim().length > 0) return v
  return notSpecified()
}

function companyFor(p: Pick<HistoricalProfile, 'wedding_date' | 'wedding_year'>): 'SIGS' | 'Excellence' {
  if (p.wedding_date) return p.wedding_date < '2016-05-01' ? 'Excellence' : 'SIGS'
  if (p.wedding_year != null) return p.wedding_year < 2016 ? 'Excellence' : 'SIGS'
  return 'SIGS'
}

export function HistoricalArchiveDetail({ profile }: { profile: HistoricalProfile }) {
  const bride = [profile.bride_first_name, profile.bride_last_name].filter(Boolean).join(' ').trim()
  const groom = [profile.groom_first_name, profile.groom_last_name].filter(Boolean).join(' ').trim()
  const coupleName = [bride || profile.bride_first_name || '', groom || profile.groom_first_name || '']
    .filter(Boolean)
    .join(' & ')
    .trim() || 'Historical Couple'

  const weddingDate = profile.wedding_date ? parseISO(profile.wedding_date) : null
  const weddingDateFormatted = weddingDate
    ? format(weddingDate, 'MMMM d, yyyy')
    : profile.wedding_year != null
      ? String(profile.wedding_year)
      : '—'
  const daysAgo = weddingDate ? differenceInDays(new Date(), weddingDate) : null
  const daysText =
    daysAgo == null ? '' : daysAgo > 0 ? `${daysAgo} days ago` : daysAgo === 0 ? 'Today' : `${Math.abs(daysAgo)} days from now`

  const verified = profile.glacier_archived === true
  const archiveBadgeCls = verified ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'
  const archiveBadgeLabel = verified ? 'Verified' : 'Not Verified'

  const company = companyFor(profile)
  const companyLabel = company === 'SIGS' ? 'SIGS Photography' : 'Excellence Photography'
  const companyBadgeCls = company === 'SIGS' ? 'bg-teal-100 text-teal-700' : 'bg-green-100 text-green-700'

  return (
    <div className="p-4 md:p-6 space-y-4 md:space-y-6 max-w-7xl mx-auto">
      {/* Back link */}
      <Link href="/admin/couples" className="text-sm text-gray-500 hover:text-gray-700">
        ← Back to Couples
      </Link>

      {/* Section A: Header */}
      <div className="bg-gradient-to-r from-teal-700 to-teal-900 rounded-xl p-6 md:p-8 text-white relative">
        <div className="flex flex-col md:flex-row md:justify-between md:items-start gap-3 md:gap-0">
          <div>
            <h1 className="text-xl md:text-2xl font-bold">
              {coupleName}{' '}
              <span className="text-teal-100 text-lg font-normal">— Photo + Video</span>
            </h1>
            <p className="mt-2 text-teal-100 text-sm md:text-base">{weddingDateFormatted}</p>
            {daysText && <p className="text-sm text-teal-200">{daysText}</p>}
          </div>
          <div className="flex items-center gap-2">
            <span
              className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${archiveBadgeCls}`}
            >
              {archiveBadgeLabel}
            </span>
          </div>
        </div>
      </div>

      {/* Info grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-white border border-slate-200 rounded-xl shadow-sm p-5">
        {/* Couple */}
        <div>
          <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">Couple</h3>
          <div className="space-y-1.5 text-sm">
            <div>
              <div className="text-xs text-muted-foreground">Bride</div>
              <div>{valueOr(bride || null)}</div>
              <div className="text-muted-foreground text-xs">{valueOr(profile.phone_1)}</div>
              <div className="text-muted-foreground text-xs">{valueOr(profile.bride_email)}</div>
            </div>
            <div className="pt-2">
              <div className="text-xs text-muted-foreground">Groom</div>
              <div>{valueOr(groom || null)}</div>
              <div className="text-muted-foreground text-xs">{valueOr(profile.phone_2)}</div>
              <div className="text-muted-foreground text-xs">{valueOr(profile.groom_email)}</div>
            </div>
          </div>
        </div>

        {/* Venues */}
        <div>
          <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">Venues</h3>
          <div className="space-y-2 text-sm">
            <div>
              <div className="text-xs text-muted-foreground">Ceremony</div>
              <div>{valueOr(profile.ceremony_venue)}</div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground">Reception</div>
              <div>{valueOr(profile.reception_venue)}</div>
            </div>
          </div>
        </div>

        {/* Coverage */}
        <div>
          <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">Coverage</h3>
          <div className="space-y-2 text-sm">
            <div>
              <div className="text-xs text-muted-foreground">Package</div>
              <div>Photo + Video</div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground">Company</div>
              <div>
                <span
                  className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${companyBadgeCls}`}
                >
                  {companyLabel}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Section B: Digital Archive */}
      <DigitalArchiveCard historicalProfileId={profile.id} />
    </div>
  )
}

export function HistoricalArchiveDetailLoader({ id }: { id: string }) {
  const [loading, setLoading] = useState(true)
  const [profile, setProfile] = useState<HistoricalProfile | null>(null)
  const [notFound, setNotFound] = useState(false)

  useEffect(() => {
    let cancelled = false
    async function load() {
      setLoading(true)
      try {
        const res = await fetch(`/api/archives/${id}`)
        if (res.status === 404) {
          if (!cancelled) {
            setNotFound(true)
          }
          return
        }
        if (!res.ok) throw new Error('Failed to load')
        const json = (await res.json()) as HistoricalProfile
        if (!cancelled) setProfile(json)
      } catch {
        if (!cancelled) setNotFound(true)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => {
      cancelled = true
    }
  }, [id])

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[40vh]">
        <Loader2 className="w-6 h-6 animate-spin text-teal-600" />
      </div>
    )
  }

  if (notFound || !profile) {
    return (
      <div className="p-8 max-w-3xl mx-auto">
        <Link href="/admin/couples" className="text-sm text-gray-500 hover:text-gray-700">
          ← Back to Couples
        </Link>
        <p className="mt-4 text-red-600">Historical archive not found.</p>
      </div>
    )
  }

  return <HistoricalArchiveDetail profile={profile} />
}
