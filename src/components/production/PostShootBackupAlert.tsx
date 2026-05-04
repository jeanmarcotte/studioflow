'use client'

import { useMemo, useState } from 'react'
import { ChevronDown, ChevronRight, Check } from 'lucide-react'
import { differenceInDays, parseISO } from 'date-fns'
import { formatDateCompact } from '@/lib/formatters'
import { showSuccess, showError } from '@/lib/toast'

export interface BackupRow {
  job_id: string
  source: 'jobs' | 'video_jobs'
  kind: 'photo' | 'video'
  bride_first_name: string | null
  groom_first_name: string | null
  wedding_date: string | null
  raw_file_path: string | null
  raw_file_count: number | null
  raw_file_size_gb: number | null
}

interface Props {
  rows: BackupRow[]
  onMarkedBackedUp: (jobId: string, source: 'jobs' | 'video_jobs') => void
}

type DraftMap = Record<string, { path: string; count: string; sizeGb: string }>

function ageBucket(weddingDate: string | null): 'urgent' | 'follow_up' | 'overdue' | 'unknown' {
  if (!weddingDate) return 'unknown'
  const days = differenceInDays(new Date(), parseISO(weddingDate))
  if (days < 0) return 'unknown'
  if (days < 7) return 'urgent'
  if (days <= 30) return 'follow_up'
  return 'overdue'
}

const BUCKET_DOT: Record<string, string> = {
  urgent: 'bg-red-500',
  follow_up: 'bg-yellow-500',
  overdue: 'bg-green-500',
  unknown: 'bg-gray-400',
}

function coupleLabel(r: BackupRow): string {
  const bride = r.bride_first_name?.trim() || ''
  const groom = r.groom_first_name?.trim() || ''
  if (bride && groom) return `${bride} & ${groom}`
  return bride || groom || 'Unknown'
}

function daysAgoLabel(weddingDate: string | null): string {
  if (!weddingDate) return ''
  const days = differenceInDays(new Date(), parseISO(weddingDate))
  if (days <= 0) return ''
  if (days === 1) return '1 day ago'
  return `${days} days ago`
}

export function PostShootBackupAlert({ rows, onMarkedBackedUp }: Props) {
  const [open, setOpen] = useState(rows.length > 0)
  const [drafts, setDrafts] = useState<DraftMap>({})
  const [savingId, setSavingId] = useState<string | null>(null)

  const sorted = useMemo(() => {
    return [...rows].sort((a, b) => {
      const ad = a.wedding_date || ''
      const bd = b.wedding_date || ''
      return bd.localeCompare(ad)
    })
  }, [rows])

  const counts = useMemo(() => ({
    photo: rows.filter(r => r.kind === 'photo').length,
    video: rows.filter(r => r.kind === 'video').length,
  }), [rows])

  const total = rows.length

  function getDraft(r: BackupRow) {
    const d = drafts[r.job_id]
    if (d) return d
    return {
      path: r.raw_file_path ?? '',
      count: r.raw_file_count != null ? String(r.raw_file_count) : '',
      sizeGb: r.raw_file_size_gb != null ? String(r.raw_file_size_gb) : '',
    }
  }

  function setDraft(jobId: string, patch: Partial<{ path: string; count: string; sizeGb: string }>) {
    setDrafts(prev => {
      const current = prev[jobId] ?? { path: '', count: '', sizeGb: '' }
      return { ...prev, [jobId]: { ...current, ...patch } }
    })
  }

  async function markBackedUp(r: BackupRow) {
    const draft = getDraft(r)
    const path = draft.path.trim()
    if (!path) {
      showError('Enter a file path before marking backed up')
      return
    }
    const count = parseInt(draft.count.replace(/,/g, ''), 10)
    if (!Number.isFinite(count) || count < 0) {
      showError('Enter a valid file count')
      return
    }
    const sizeGb = parseFloat(draft.sizeGb)
    if (!Number.isFinite(sizeGb) || sizeGb < 0) {
      showError('Enter a valid size in GB')
      return
    }

    setSavingId(r.job_id)
    try {
      const res = await fetch('/api/production/backup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jobId: r.job_id,
          table: r.source,
          raw_file_path: path,
          raw_file_count: count,
          raw_file_size_gb: sizeGb,
        }),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) {
        showError(json?.error || `Save failed (${res.status})`)
        return
      }
      showSuccess(`Backup confirmed for ${coupleLabel(r)}`)
      onMarkedBackedUp(r.job_id, r.source)
    } catch (e: any) {
      showError(e?.message || 'Network error')
    } finally {
      setSavingId(null)
    }
  }

  return (
    <div className="px-6 pb-4">
      <div className={`rounded-lg border ${total > 0 ? 'border-amber-200 bg-amber-50' : 'border-emerald-200 bg-emerald-50'}`}>
        <button
          onClick={() => setOpen(o => !o)}
          className="w-full px-4 py-3 flex items-center gap-2 text-left"
        >
          {open
            ? <ChevronDown className={`h-4 w-4 shrink-0 ${total > 0 ? 'text-amber-700' : 'text-emerald-700'}`} />
            : <ChevronRight className={`h-4 w-4 shrink-0 ${total > 0 ? 'text-amber-700' : 'text-emerald-700'}`} />
          }
          <span className={`text-sm font-semibold ${total > 0 ? 'text-amber-800' : 'text-emerald-800'}`}>
            📦 Post-Shoot Backup{' '}
            {total > 0
              ? <>({counts.photo} photo, {counts.video} video)</>
              : <>(0 pending) <Check className="inline h-3.5 w-3.5 ml-1 -mt-0.5" /></>
            }
          </span>
        </button>

        {open && total > 0 && (
          <div className="px-4 pb-4 space-y-3">
            {sorted.map(r => {
              const draft = getDraft(r)
              const bucket = ageBucket(r.wedding_date)
              const isSaving = savingId === r.job_id
              return (
                <div key={`${r.source}_${r.job_id}`} className="rounded-md border border-border bg-background p-3">
                  <div className="flex items-center gap-2 mb-2">
                    <span className={`inline-block h-2.5 w-2.5 rounded-full ${BUCKET_DOT[bucket]}`} />
                    <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      {r.kind === 'photo' ? '📷 Photo' : '🎥 Video'}
                    </span>
                    <span className="text-sm font-semibold text-foreground">{coupleLabel(r)}</span>
                    {r.wedding_date && (
                      <span className="text-xs text-muted-foreground">
                        — {formatDateCompact(r.wedding_date)}
                        {daysAgoLabel(r.wedding_date) && <> ({daysAgoLabel(r.wedding_date)})</>}
                      </span>
                    )}
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <input
                      type="text"
                      value={draft.path}
                      onChange={e => setDraft(r.job_id, { path: e.target.value })}
                      placeholder="/Volumes/.../Couple_Folder"
                      className="flex-1 min-w-[280px] rounded-md border border-input bg-background px-2 py-1.5 text-sm outline-none focus:border-ring"
                    />
                    <input
                      type="text"
                      inputMode="numeric"
                      value={draft.count}
                      onChange={e => setDraft(r.job_id, { count: e.target.value })}
                      placeholder="files"
                      className="w-[90px] rounded-md border border-input bg-background px-2 py-1.5 text-sm text-right outline-none focus:border-ring"
                    />
                    <span className="text-xs text-muted-foreground">files</span>
                    <input
                      type="text"
                      inputMode="decimal"
                      value={draft.sizeGb}
                      onChange={e => setDraft(r.job_id, { sizeGb: e.target.value })}
                      placeholder="size"
                      className="w-[80px] rounded-md border border-input bg-background px-2 py-1.5 text-sm text-right outline-none focus:border-ring"
                    />
                    <span className="text-xs text-muted-foreground">GB</span>
                    <button
                      onClick={() => markBackedUp(r)}
                      disabled={isSaving}
                      className="ml-auto inline-flex items-center gap-1 rounded-md bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 px-3 py-1.5 text-xs font-semibold text-white transition-colors"
                    >
                      <Check className="h-3.5 w-3.5" />
                      {isSaving ? 'Saving…' : 'Mark Backed Up'}
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
