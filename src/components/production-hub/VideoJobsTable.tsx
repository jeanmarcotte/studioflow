'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { toast } from 'sonner'
import { formatDateCompact } from '@/lib/formatters'
import { ChevronDown, ChevronRight } from 'lucide-react'
import { VideoJob, VIDEO_STATUSES, STATUS_COLORS } from './types'

const SECTION_FIELDS = [
  { key: 'ceremony_done', label: 'Ceremony' },
  { key: 'reception_done', label: 'Reception' },
  { key: 'park_done', label: 'Park' },
  { key: 'prereception_done', label: 'Pre-Reception' },
  { key: 'groom_done', label: 'Groom' },
  { key: 'bride_done', label: 'Bride' },
] as const

interface Props {
  jobs: VideoJob[]
  onRefresh: () => void
}

export function VideoJobsTable({ jobs, onRefresh }: Props) {
  const [expanded, setExpanded] = useState<Set<string>>(new Set())

  if (jobs.length === 0) {
    return <div className="text-sm text-muted-foreground py-3 px-1">No video jobs</div>
  }

  const toggle = (id: string) => {
    setExpanded(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  const handleStatusChange = async (jobId: string, newStatus: string) => {
    const { error } = await supabase
      .from('video_jobs')
      .update({ status: newStatus })
      .eq('id', jobId)
    if (error) {
      toast.error(`Failed to update status: ${error.message}`)
    } else {
      toast.success(`Status updated to ${newStatus.replace(/_/g, ' ')}`)
      onRefresh()
    }
  }

  const handleSectionToggle = async (jobId: string, field: string, current: boolean) => {
    const { error } = await supabase
      .from('video_jobs')
      .update({ [field]: !current })
      .eq('id', jobId)
    if (error) {
      toast.error(`Failed to update: ${error.message}`)
    } else {
      onRefresh()
    }
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b text-left text-xs text-muted-foreground uppercase tracking-wide">
            <th className="py-2 px-2 w-6"></th>
            <th className="py-2 px-2 font-medium">Type</th>
            <th className="py-2 px-2 font-medium">Status</th>
            <th className="py-2 px-2 font-medium">Sections</th>
            <th className="py-2 px-2 font-medium" style={{ textAlign: 'right' }}>Hours</th>
            <th className="py-2 px-2 font-medium">Assigned</th>
            <th className="py-2 px-2 font-medium">Due</th>
            <th className="py-2 px-2 font-medium">Action</th>
          </tr>
        </thead>
        <tbody>
          {jobs.map(job => {
            const sectionsDone = SECTION_FIELDS.filter(f => (job as any)[f.key]).length
            const isExpanded = expanded.has(job.id)

            return (
              <>
                <tr key={job.id} className="border-b last:border-0 hover:bg-muted/30 transition-colors">
                  <td className="py-2 px-2">
                    <button onClick={() => toggle(job.id)} className="text-muted-foreground hover:text-foreground">
                      {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                    </button>
                  </td>
                  <td className="py-2 px-2 font-medium">{job.job_type}</td>
                  <td className="py-2 px-2">
                    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_COLORS[job.status] || 'bg-gray-100 text-gray-700'}`}>
                      {job.status.replace(/_/g, ' ')}
                    </span>
                  </td>
                  <td className="py-2 px-2 text-muted-foreground">{sectionsDone}/{SECTION_FIELDS.length}</td>
                  <td className="py-2 px-2 text-muted-foreground" style={{ textAlign: 'right' }}>{job.hours_raw ?? '—'}</td>
                  <td className="py-2 px-2 text-muted-foreground">{job.assigned_to || '—'}</td>
                  <td className="py-2 px-2 text-muted-foreground">{formatDateCompact(job.due_date)}</td>
                  <td className="py-2 px-2">
                    <select
                      value={job.status}
                      onChange={(e) => handleStatusChange(job.id, e.target.value)}
                      className="text-xs rounded border border-input bg-background px-1.5 py-1"
                    >
                      {VIDEO_STATUSES.map(s => (
                        <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>
                      ))}
                    </select>
                  </td>
                </tr>
                {isExpanded && (
                  <tr key={`${job.id}-sections`} className="bg-muted/20">
                    <td colSpan={8} className="py-3 px-6">
                      <div className="flex flex-wrap gap-3">
                        {SECTION_FIELDS.map(f => {
                          const done = (job as any)[f.key] === true
                          return (
                            <label key={f.key} className="flex items-center gap-1.5 cursor-pointer text-sm">
                              <input
                                type="checkbox"
                                checked={done}
                                onChange={() => handleSectionToggle(job.id, f.key, done)}
                                className="rounded border-gray-300 text-teal-600 focus:ring-teal-500"
                              />
                              <span className={done ? 'text-foreground' : 'text-muted-foreground'}>{f.label}</span>
                            </label>
                          )
                        })}
                      </div>
                      {job.notes && <p className="mt-2 text-xs text-muted-foreground">{job.notes}</p>}
                    </td>
                  </tr>
                )}
              </>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
