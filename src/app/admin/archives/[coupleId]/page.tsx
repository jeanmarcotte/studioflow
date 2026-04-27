'use client'

import { useState, useEffect, useMemo } from 'react'
import { useParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { ArrowLeft, Clipboard, AlertTriangle, Shield } from 'lucide-react'
import { formatWeddingDateShort } from '@/lib/formatters'
import { toast } from 'sonner'
import Link from 'next/link'

interface ArchiveDetail {
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
  wed_photo_project_gb: number | null
  wed_video_project_gb: number | null
  hires_photos_gb: number | null
  engagement_project_gb: number | null
  wedding_proofs_gb: number | null
  long_form_video_gb: number | null
  recap_video_gb: number | null
  album_files_gb: number | null
  on_marketing_drive: boolean
  on_aws: boolean
  archive_status: string
  archive_notes: string | null
  archived_at: string | null
  verified_at: string | null
  couple_status?: string
}

const DELIVERABLES = [
  { key: 'wed_photo_project', label: 'Final Wedding Photo Project', icon: '📷', videoOnly: false, engOnly: false },
  { key: 'wed_video_project', label: 'Final Wedding Video Project', icon: '🎥', videoOnly: true, engOnly: false },
  { key: 'hires_photos', label: 'Hi-Res Wedding Photos', icon: '💎', videoOnly: false, engOnly: false },
  { key: 'engagement_project', label: 'Engagement Photo Project', icon: '💍', videoOnly: false, engOnly: true },
  { key: 'wedding_proofs', label: 'Wedding Proofs', icon: '🖼️', videoOnly: false, engOnly: false },
  { key: 'long_form_video', label: 'Long Form Wedding Video', icon: '🎬', videoOnly: true, engOnly: false },
  { key: 'recap_video', label: 'Recap Video', icon: '✂️', videoOnly: true, engOnly: false },
  { key: 'album_files', label: 'Wedding Album Files', icon: '📖', videoOnly: false, engOnly: false },
]

function timeSinceWedding(weddingDate: string): { label: string; subtitle: string; future: boolean } {
  const wedding = new Date(weddingDate)
  const now = new Date()
  const diffMs = now.getTime() - wedding.getTime()

  if (diffMs < 0) {
    const daysAway = Math.ceil(Math.abs(diffMs) / (1000 * 60 * 60 * 24))
    return { label: `${daysAway} days away`, subtitle: 'Upcoming wedding', future: true }
  }

  const totalDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))
  const years = Math.floor(totalDays / 365)
  const months = Math.floor((totalDays % 365) / 30)
  const days = totalDays % 30

  const parts: string[] = []
  if (years > 0) parts.push(`${years}y`)
  if (months > 0) parts.push(`${months}m`)
  parts.push(`${days}d`)

  return { label: parts.join(' '), subtitle: 'since wedding day', future: false }
}

export default function CoupleArchiveDetail() {
  const params = useParams()
  const coupleId = params.coupleId as string

  const [archive, setArchive] = useState<ArchiveDetail | null>(null)
  const [loading, setLoading] = useState(true)

  // Editable state
  const [locations, setLocations] = useState<Record<string, string>>({})
  const [sizes, setSizes] = useState<Record<string, string>>({})
  const [onMarketing, setOnMarketing] = useState(false)
  const [onAws, setOnAws] = useState(false)
  const [notes, setNotes] = useState('')
  const [status, setStatus] = useState('not_started')
  const [saving, setSaving] = useState(false)
  const [editingField, setEditingField] = useState<string | null>(null)

  useEffect(() => {
    async function fetch() {
      const { data: archiveData } = await supabase
        .from('couple_archives')
        .select('*')
        .eq('couple_id', coupleId)
        .limit(1)

      if (archiveData && archiveData[0]) {
        const a = archiveData[0] as ArchiveDetail

        // Fetch couple status
        const { data: coupleData } = await supabase
          .from('couples')
          .select('status')
          .eq('id', coupleId)
          .limit(1)
        if (coupleData && coupleData[0]) a.couple_status = coupleData[0].status

        setArchive(a)

        // Init editable state
        const locs: Record<string, string> = {}
        const szs: Record<string, string> = {}
        for (const d of DELIVERABLES) {
          const val = a[d.key as keyof ArchiveDetail] as string[] | null
          locs[d.key] = val && Array.isArray(val) ? val.join(', ') : ''
          const gb = a[`${d.key}_gb` as keyof ArchiveDetail] as number | null
          szs[d.key] = gb != null ? String(gb) : ''
        }
        setLocations(locs)
        setSizes(szs)
        setOnMarketing(a.on_marketing_drive)
        setOnAws(a.on_aws)
        setNotes(a.archive_notes || '')
        setStatus(a.archive_status)
      }
      setLoading(false)
    }
    fetch()
  }, [coupleId])

  const applicableDeliverables = useMemo(() => {
    if (!archive) return []
    return DELIVERABLES.map(d => {
      const grayed = (d.videoOnly && archive.package_type === 'photo_only') || (d.engOnly && !archive.has_engagement)
      return { ...d, grayed }
    })
  }, [archive])

  const locatedCount = useMemo(() => {
    if (!archive) return { located: 0, total: 0 }
    let located = 0
    let total = 0
    for (const d of applicableDeliverables) {
      if (d.grayed) continue
      total++
      const val = locations[d.key]
      if (val && val.trim().length > 0) located++
    }
    return { located, total }
  }, [archive, applicableDeliverables, locations])

  const missingCount = locatedCount.total - locatedCount.located

  async function handleSave() {
    if (!archive) return
    setSaving(true)

    const update: Record<string, any> = {
      on_marketing_drive: onMarketing,
      on_aws: onAws,
      archive_notes: notes || null,
      archive_status: status,
      updated_at: new Date().toISOString(),
    }

    // Parse locations into JSONB arrays
    for (const d of DELIVERABLES) {
      const raw = locations[d.key]?.trim()
      if (raw) {
        update[d.key] = raw.split(',').map(s => s.trim()).filter(Boolean)
      } else {
        update[d.key] = null
      }
      const gb = sizes[d.key]?.trim()
      update[`${d.key}_gb`] = gb ? parseFloat(gb) : null
    }

    // Set timestamps on status change
    if (status === 'complete' && archive.archive_status !== 'complete') {
      update.archived_at = new Date().toISOString()
    }
    if (status === 'verified' && archive.archive_status !== 'verified') {
      update.verified_at = new Date().toISOString()
    }

    const { error } = await supabase
      .from('couple_archives')
      .update(update)
      .eq('id', archive.id)

    if (error) {
      toast.error('Failed to save: ' + error.message)
    } else {
      toast.success('Archive saved successfully')
      setArchive(prev => prev ? { ...prev, ...update, archive_status: status } : prev)
    }
    setSaving(false)
  }

  if (loading) return <div className="p-8 text-center text-muted-foreground">Loading...</div>
  if (!archive) return <div className="p-8 text-center text-red-500">Archive not found for this couple.</div>

  const time = archive.wedding_date ? timeSinceWedding(archive.wedding_date) : null
  const weddingPassed = archive.wedding_date ? new Date(archive.wedding_date) < new Date() : false
  const daysSinceWedding = archive.wedding_date ? Math.floor((Date.now() - new Date(archive.wedding_date).getTime()) / (1000 * 60 * 60 * 24)) : 0

  // Auto-suggest status
  const suggestedStatus = locatedCount.located === locatedCount.total && locatedCount.total > 0
    ? 'complete'
    : locatedCount.located > 0
    ? 'partial'
    : 'not_started'

  return (
    <div className="max-w-4xl mx-auto space-y-5">
      {/* Alert Banner */}
      {weddingPassed && missingCount > 0 && daysSinceWedding > 90 && (
        <Card className="border-l-4 border-l-red-500 p-4 flex items-start gap-3 bg-red-50">
          <AlertTriangle className="h-5 w-5 text-red-500 shrink-0 mt-0.5" />
          <div>
            <div className="font-semibold text-red-800">{missingCount} deliverable{missingCount > 1 ? 's' : ''} not yet located</div>
            <div className="text-sm text-red-600">Wedding was {daysSinceWedding} days ago</div>
          </div>
        </Card>
      )}
      {weddingPassed && missingCount === 0 && locatedCount.total > 0 && (
        <Card className="border-l-4 border-l-green-500 p-4 flex items-start gap-3 bg-green-50">
          <Shield className="h-5 w-5 text-green-600 shrink-0 mt-0.5" />
          <div>
            <div className="font-semibold text-green-800">All files secure</div>
            <div className="text-sm text-green-600">{locatedCount.total} deliverables located across drives</div>
          </div>
        </Card>
      )}

      {/* Back link */}
      <Link href="/admin/archives" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> Back to Archives
      </Link>

      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold">{archive.bride_name} & {archive.groom_name}</h1>
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mt-1">ARCHIVES</p>
      </div>

      {/* Two-column: Client Details + Time Since Wedding */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Client Details */}
        <Card className="p-5">
          <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">Client Details</h3>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Wedding Date</span>
              <span className="font-medium">{archive.wedding_date ? formatWeddingDateShort(archive.wedding_date) : '—'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Package</span>
              <span className="font-medium">{archive.package_type === 'photo_only' ? 'Photo Only' : 'Photo + Video'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Engagement</span>
              <span className="font-medium">{archive.has_engagement ? 'Shot' : 'Declined'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Couple Status</span>
              <Badge className="bg-blue-100 text-blue-700">{archive.couple_status || '—'}</Badge>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Archive Status</span>
              <Badge className={
                status === 'verified' ? 'bg-blue-100 text-blue-700' :
                status === 'complete' ? 'bg-green-100 text-green-700' :
                status === 'partial' ? 'bg-amber-100 text-amber-700' :
                'bg-gray-100 text-gray-600'
              }>{status.replace('_', ' ')}</Badge>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Located</span>
              <span className={`font-semibold ${locatedCount.located === locatedCount.total ? 'text-green-700' : 'text-amber-700'}`}>
                {locatedCount.located} / {locatedCount.total}
              </span>
            </div>
          </div>
        </Card>

        {/* Time Since Wedding */}
        <Card className="p-5" style={{ backgroundColor: '#f8fafc' }}>
          <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">Time Since Wedding</h3>
          {time ? (
            <div className="text-center py-4">
              <div className="text-4xl font-bold text-gray-800">{time.label}</div>
              <div className="text-sm text-muted-foreground mt-1">{time.subtitle}</div>
              <div className="text-xs text-muted-foreground italic mt-4">
                {time.future ? '' : '"Memories age like wine. Protect them."'}
              </div>
            </div>
          ) : (
            <div className="text-center py-4 text-muted-foreground">No wedding date</div>
          )}
        </Card>
      </div>

      {/* Archive Ledger */}
      <Card className="overflow-hidden">
        <div className="px-5 py-3 border-b">
          <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">Archive Ledger</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-gray-50/50">
                <th className="px-4 py-2 text-left font-medium text-muted-foreground w-8">#</th>
                <th className="px-2 py-2 text-center w-8"></th>
                <th className="px-4 py-2 text-left font-medium text-muted-foreground">Deliverable</th>
                <th className="px-4 py-2 text-left font-medium text-muted-foreground">Location</th>
                <th className="px-4 py-2 text-right font-medium text-muted-foreground w-24">Size</th>
                <th className="px-4 py-2 text-center font-medium text-muted-foreground w-28">Status</th>
              </tr>
            </thead>
            <tbody>
              {applicableDeliverables.map((d, i) => {
                const loc = locations[d.key] || ''
                const locArray = loc.split(',').map(s => s.trim()).filter(Boolean)
                const hasLocation = locArray.length > 0
                const sizeVal = sizes[d.key] || ''

                return (
                  <tr key={d.key} className={`border-b ${d.grayed ? 'opacity-30' : ''}`}>
                    <td className="px-4 py-3 text-muted-foreground">{i + 1}</td>
                    <td className="px-2 py-3 text-center">{d.icon}</td>
                    <td className={`px-4 py-3 font-medium ${d.grayed ? 'line-through' : ''}`}>{d.label}</td>

                    {/* Location — inline editable */}
                    <td className="px-4 py-3">
                      {d.grayed ? (
                        <span className="text-muted-foreground">N/A</span>
                      ) : editingField === d.key ? (
                        <input
                          autoFocus
                          className="w-full rounded border border-input bg-background px-2 py-1 text-sm font-mono outline-none focus:border-ring"
                          value={loc}
                          onChange={(e) => setLocations(prev => ({ ...prev, [d.key]: e.target.value }))}
                          onBlur={() => setEditingField(null)}
                          onKeyDown={(e) => { if (e.key === 'Enter') setEditingField(null) }}
                          placeholder="HD27 or HD26, HD31"
                        />
                      ) : (
                        <div
                          className="flex items-center gap-1 cursor-pointer group min-h-[28px]"
                          onClick={() => setEditingField(d.key)}
                        >
                          {hasLocation ? (
                            <>
                              <div className="flex flex-wrap gap-1">
                                {locArray.map((l, li) => (
                                  <span key={li} className="inline-flex items-center px-2 py-0.5 rounded text-xs font-mono font-medium bg-blue-50 text-blue-700 border border-blue-200">
                                    {l}
                                  </span>
                                ))}
                              </div>
                              <button
                                className="opacity-0 group-hover:opacity-100 transition-opacity ml-1 p-0.5 rounded hover:bg-gray-100"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  navigator.clipboard.writeText(locArray[0])
                                  toast.success(`Copied: ${locArray[0]}`)
                                }}
                              >
                                <Clipboard className="h-3.5 w-3.5 text-muted-foreground" />
                              </button>
                            </>
                          ) : (
                            <span className="text-muted-foreground/50 text-xs">Click to add...</span>
                          )}
                        </div>
                      )}
                    </td>

                    {/* Size */}
                    <td className="px-4 py-3 text-right">
                      {d.grayed ? (
                        <span className="text-muted-foreground">N/A</span>
                      ) : (
                        <div className="flex items-center justify-end gap-1">
                          <input
                            type="number"
                            className="w-16 rounded border border-input bg-background px-2 py-1 text-sm text-right outline-none focus:border-ring"
                            value={sizeVal}
                            onChange={(e) => setSizes(prev => ({ ...prev, [d.key]: e.target.value }))}
                            placeholder="—"
                          />
                          <span className="text-xs text-muted-foreground">GB</span>
                        </div>
                      )}
                    </td>

                    {/* Status */}
                    <td className="px-4 py-3 text-center">
                      {d.grayed ? (
                        <Badge className="bg-gray-100 text-gray-400">N/A</Badge>
                      ) : hasLocation ? (
                        <Badge className="bg-green-100 text-green-700">✓ Located</Badge>
                      ) : (
                        <Badge className="bg-amber-100 text-amber-700">⚠ Not Found</Badge>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Distribution + Notes */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="p-5">
          <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">Distribution</h3>
          <div className="space-y-3">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={onMarketing}
                onChange={(e) => setOnMarketing(e.target.checked)}
                className="rounded border-gray-300"
              />
              <span className="text-sm">On Marketing Drive</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={onAws}
                onChange={(e) => setOnAws(e.target.checked)}
                className="rounded border-gray-300"
              />
              <span className="text-sm">On AWS Glacier</span>
            </label>
          </div>
        </Card>

        <Card className="p-5">
          <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">Notes</h3>
          <textarea
            className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none resize-y min-h-[80px] focus:border-ring"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            onBlur={() => {
              // Auto-save notes on blur
              if (archive && notes !== (archive.archive_notes || '')) {
                supabase
                  .from('couple_archives')
                  .update({ archive_notes: notes || null, updated_at: new Date().toISOString() })
                  .eq('id', archive.id)
                  .then(({ error }) => {
                    if (!error) toast.success('Notes saved')
                  })
              }
            }}
            placeholder="Add notes about this archive..."
          />
        </Card>
      </div>

      {/* Bottom Bar */}
      <Card className="p-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <label className="text-sm font-medium text-muted-foreground">Archive Status:</label>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="text-sm rounded-md border border-input bg-background px-3 py-2"
          >
            <option value="not_started">Not Started</option>
            <option value="partial">Partial</option>
            <option value="complete">Complete</option>
            <option value="verified">Verified</option>
          </select>
          {suggestedStatus !== status && (
            <button
              onClick={() => setStatus(suggestedStatus)}
              className="text-xs text-blue-600 hover:underline"
            >
              Suggest: {suggestedStatus.replace('_', ' ')}
            </button>
          )}
        </div>
        <Button
          onClick={handleSave}
          disabled={saving}
          className="bg-[#0d4f4f] hover:bg-[#0d4f4f]/90 text-white"
        >
          {saving ? 'Saving...' : 'Save Changes'}
        </Button>
      </Card>
    </div>
  )
}
