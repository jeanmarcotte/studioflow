'use client'

import { supabase } from '@/lib/supabase'
import { toast } from 'sonner'
import { formatDateCompact } from '@/lib/formatters'

interface SlideshowJob {
  id: string
  status: string
  updated_at: string
}

interface Props {
  job: SlideshowJob | null
  onRefresh: () => void
}

export function EngSlideshowCheck({ job, onRefresh }: Props) {
  const isCompleted = job?.status === 'completed'

  const handleMarkDone = async () => {
    if (!job) return
    const { error } = await supabase
      .from('jobs')
      .update({ status: 'completed', completed_date: new Date().toISOString().split('T')[0] })
      .eq('id', job.id)

    if (error) {
      toast.error('Failed to update slideshow status')
    } else {
      toast.success('Slideshow marked as done')
      onRefresh()
    }
  }

  return (
    <div className="rounded-xl border bg-card p-4">
      <h3 className="text-sm font-semibold mb-2">Engagement Slideshow</h3>
      <div className="flex items-center gap-3">
        <div className={`w-5 h-5 rounded border-2 flex items-center justify-center text-xs ${isCompleted ? 'bg-green-500 border-green-500 text-white' : 'border-gray-300 text-transparent'}`}>
          {isCompleted ? '\u2713' : ''}
        </div>
        <div className="text-sm">
          {!job && <span className="text-muted-foreground">No slideshow job created</span>}
          {job && isCompleted && (
            <span className="text-green-700">
              Slideshow created — {formatDateCompact(job.updated_at)}
            </span>
          )}
          {job && !isCompleted && (
            <span className="text-muted-foreground">
              Slideshow in progress
            </span>
          )}
        </div>
        {job && !isCompleted && (
          <button
            onClick={handleMarkDone}
            className="ml-auto text-xs rounded-lg border border-green-300 bg-green-50 text-green-700 px-3 py-1.5 hover:bg-green-100 transition-colors"
          >
            Mark Done
          </button>
        )}
      </div>
    </div>
  )
}
