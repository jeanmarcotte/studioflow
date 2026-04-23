'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { differenceInDays, parseISO } from 'date-fns'

interface EditingJob {
  id: string
  couple_id: string
  job_type: string
  category: string | null
  status: string
  photos_taken: number | null
  edited_so_far: number | null
  couples: { couple_name: string; wedding_date: string | null } | null
}

interface PhysicalJob {
  id: string
  couple_id: string
  job_type: string
  status: string
  couples: { couple_name: string } | null
}

const JOB_TYPE_LABELS: Record<string, string> = {
  eng_proofs: 'Eng Proofs',
  wed_proofs: 'Wed Proofs',
  PARENT_BOOK: 'Parent Book',
  parent_album: 'Parent Album',
  bg_album: 'B&G Album',
  eng_album: 'Eng Album',
}

export default function ProductionFloor() {
  const [editingJobs, setEditingJobs] = useState<EditingJob[]>([])
  const [physicalJobs, setPhysicalJobs] = useState<PhysicalJob[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchData = async () => {
      const [editingRes, physicalRes] = await Promise.all([
        supabase
          .from('jobs')
          .select('id, couple_id, job_type, category, status, photos_taken, edited_so_far, couples(couple_name, wedding_date)')
          .in('status', ['not_started', 'in_progress']),
        supabase
          .from('jobs')
          .select('id, couple_id, job_type, status, couples(couple_name)')
          .in('status', ['at_lab', 'at_studio', 'waiting_approval']),
      ])

      const editing = (editingRes.data ?? []) as unknown as EditingJob[]
      const today = new Date()
      editing.sort((a, b) => {
        const dateA = a.couples?.wedding_date ?? '9999-12-31'
        const dateB = b.couples?.wedding_date ?? '9999-12-31'
        return dateA.localeCompare(dateB)
      })

      setEditingJobs(editing)
      setPhysicalJobs((physicalRes.data ?? []) as unknown as PhysicalJob[])
      setLoading(false)
    }
    fetchData()
  }, [])

  if (loading) return null

  const today = new Date()

  // Group physical jobs by status
  const physicalGroups = new Map<string, PhysicalJob[]>()
  for (const j of physicalJobs) {
    const existing = physicalGroups.get(j.status) ?? []
    existing.push(j)
    physicalGroups.set(j.status, existing)
  }

  const STATUS_ORDER = ['at_lab', 'at_studio', 'waiting_approval']
  const STATUS_LABELS: Record<string, string> = {
    at_lab: 'AT LAB',
    at_studio: 'AT STUDIO',
    waiting_approval: 'WAITING APPROVAL',
  }

  return (
    <div className="rounded-lg border border-gray-200 bg-white shadow-sm p-5">
      <div className="flex items-center gap-2 mb-4">
        <span className="text-lg">🎬</span>
        <h2 className="text-base font-semibold text-gray-900">The Production Floor</h2>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Column A: Editing Queue */}
        <div>
          <h3 className="text-base font-semibold text-gray-900 mb-4 flex items-center gap-2">
            🎬 Editing Queue
          </h3>
          {editingJobs.length === 0 ? (
            <p className="text-sm text-green-600 font-medium">✅ Editing queue is clear</p>
          ) : (
            <div>
              {editingJobs.map(j => {
                const wDate = j.couples?.wedding_date ? parseISO(j.couples.wedding_date) : null
                const daysWaiting = wDate ? differenceInDays(today, wDate) : null
                const isWedding = j.category === 'wedding' || j.job_type.startsWith('wed_') || j.job_type === 'PARENT_BOOK' || j.job_type === 'parent_album' || j.job_type === 'bg_album'
                const catLabel = isWedding ? 'WED' : 'ENG'
                const catColor = isWedding ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'

                let urgencyColor = 'text-gray-400'
                if (daysWaiting !== null && daysWaiting >= 0) {
                  if (daysWaiting < 14) urgencyColor = 'text-red-600 font-bold'
                  else if (daysWaiting <= 30) urgencyColor = 'text-orange-500'
                }

                return (
                  <div key={j.id} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
                    <div className="flex items-center gap-2">
                      <span className={`text-xs px-2 py-0.5 rounded font-medium ${catColor}`}>
                        {catLabel}
                      </span>
                      <span className="text-sm font-medium text-gray-900">{j.couples?.couple_name ?? 'Unknown'}</span>
                    </div>
                    <div className="text-right">
                      <div className="text-xs text-gray-500">{JOB_TYPE_LABELS[j.job_type] ?? j.job_type.replace(/_/g, ' ')}</div>
                      {daysWaiting !== null && daysWaiting >= 0 && (
                        <div className={`text-xs font-medium ${urgencyColor}`}>{daysWaiting} days</div>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Column B: Physical Orders */}
        <div>
          <h3 className="text-base font-semibold text-gray-900 mb-4 flex items-center gap-2">
            📦 Physical Orders
          </h3>
          {physicalJobs.length === 0 ? (
            <p className="text-sm text-muted-foreground italic">No physical items in motion</p>
          ) : (
            <div>
              {STATUS_ORDER.map(status => {
                const jobs = physicalGroups.get(status)
                if (!jobs || jobs.length === 0) return null
                return (
                  <div key={status}>
                    <div className="text-xs font-semibold text-gray-400 uppercase tracking-wide mt-3 mb-1">
                      {STATUS_LABELS[status]} ({jobs.length})
                    </div>
                    {jobs.map(j => (
                      <div key={j.id} className="text-sm text-gray-700 py-0.5">
                        {j.couples?.couple_name ?? 'Unknown'} — {JOB_TYPE_LABELS[j.job_type] ?? j.job_type}
                      </div>
                    ))}
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
