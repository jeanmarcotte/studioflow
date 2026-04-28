'use client'

import { supabase } from '@/lib/supabase'
import { toast } from 'sonner'
import { formatDateCompact } from '@/lib/formatters'
import { PhotoJob, PHOTO_STATUSES, STATUS_COLORS } from './types'

interface Props {
  jobs: PhotoJob[]
  title: string
  onRefresh: () => void
}

export function PhotoJobsTable({ jobs, title, onRefresh }: Props) {
  if (jobs.length === 0) {
    return (
      <div className="text-sm text-muted-foreground py-3 px-1">No {title.toLowerCase()} jobs</div>
    )
  }

  const handleStatusChange = async (jobId: string, newStatus: string) => {
    const { error } = await supabase
      .from('jobs')
      .update({ status: newStatus })
      .eq('id', jobId)
    if (error) {
      toast.error(`Failed to update status: ${error.message}`)
    } else {
      toast.success(`Status updated to ${newStatus.replace(/_/g, ' ')}`)
      onRefresh()
    }
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b text-left text-xs text-muted-foreground uppercase tracking-wide">
            <th className="py-2 px-2 font-medium">Type</th>
            <th className="py-2 px-2 font-medium">Status</th>
            <th className="py-2 px-2 font-medium" style={{ textAlign: 'right' }}>Images</th>
            <th className="py-2 px-2 font-medium" style={{ textAlign: 'right' }}>Selected</th>
            <th className="py-2 px-2 font-medium">Vendor</th>
            <th className="py-2 px-2 font-medium">At Lab</th>
            <th className="py-2 px-2 font-medium">Pickup</th>
            <th className="py-2 px-2 font-medium">Action</th>
          </tr>
        </thead>
        <tbody>
          {jobs.map(job => (
            <tr key={job.id} className="border-b last:border-0 hover:bg-muted/30 transition-colors">
              <td className="py-2 px-2 font-medium">{job.job_type}</td>
              <td className="py-2 px-2">
                <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_COLORS[job.status] || 'bg-gray-100 text-gray-700'}`}>
                  {job.status.replace(/_/g, ' ')}
                </span>
              </td>
              <td className="py-2 px-2 text-muted-foreground" style={{ textAlign: 'right' }}>{job.photos_taken ?? '—'}</td>
              <td className="py-2 px-2 text-muted-foreground" style={{ textAlign: 'right' }}>{job.photos_selected ?? '—'}</td>
              <td className="py-2 px-2 text-muted-foreground">{job.vendor || '—'}</td>
              <td className="py-2 px-2 text-muted-foreground">{formatDateCompact(job.at_lab_date)}</td>
              <td className="py-2 px-2 text-muted-foreground">{formatDateCompact(job.pickup_date)}</td>
              <td className="py-2 px-2">
                <select
                  value={job.status}
                  onChange={(e) => handleStatusChange(job.id, e.target.value)}
                  className="text-xs rounded border border-input bg-background px-1.5 py-1"
                >
                  {PHOTO_STATUSES.map(s => (
                    <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>
                  ))}
                </select>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
