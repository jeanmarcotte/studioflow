'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { toast } from 'sonner'
import { differenceInDays, parseISO } from 'date-fns'
import { formatDateCompact } from '@/lib/formatters'
import { OrderJob, ProductItem, ORDER_STATUSES, ORDER_STATUS_COLORS } from './types'

interface Props {
  jobs: OrderJob[]
  productMap: Map<string, string>
  onRefresh: () => void
}

export function OrderCards({ jobs, productMap, onRefresh }: Props) {
  if (jobs.length === 0) {
    return (
      <div className="text-sm text-muted-foreground py-6 text-center">
        No orders yet. Click &ldquo;+ Add Job&rdquo; to create one.
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {jobs.map(job => (
        <OrderCard key={job.id} job={job} productMap={productMap} onRefresh={onRefresh} />
      ))}
    </div>
  )
}

function OrderCard({ job, productMap, onRefresh }: { job: OrderJob; productMap: Map<string, string>; onRefresh: () => void }) {
  const [status, setStatus] = useState(job.status)
  const [vendor, setVendor] = useState(job.vendor || '')
  const [description, setDescription] = useState(job.description || '')
  const [editingDesc, setEditingDesc] = useState(false)

  const productName = productMap.get(job.product_code || '') || job.product_code || job.job_type
  const showVendor = ['at_lab', 'at_studio', 'picked_up'].includes(status)

  const handleStatusChange = async (newStatus: string) => {
    const updates: Record<string, any> = {
      status: newStatus,
      updated_at: new Date().toISOString(),
    }

    if (newStatus === 'waiting_approval') {
      updates.sent_for_review_date = new Date().toISOString().split('T')[0]
      updates.approval_round = (job.approval_round || 0) + 1
    }

    if (newStatus === 'at_lab') {
      updates.at_lab_date = new Date().toISOString().split('T')[0]
    }

    const { error } = await supabase.from('jobs').update(updates).eq('id', job.id)
    if (error) {
      toast.error(`Failed to update status: ${error.message}`)
    } else {
      setStatus(newStatus)
      const label = ORDER_STATUSES.find(s => s.value === newStatus)?.label || newStatus
      toast.success(`Status updated to ${label}`)
      onRefresh()
    }
  }

  const handleVendorChange = async (newVendor: string) => {
    const vendorValue = newVendor === '' ? null : newVendor
    const { error } = await supabase.from('jobs').update({ vendor: vendorValue, updated_at: new Date().toISOString() }).eq('id', job.id)
    if (error) {
      toast.error('Failed to update vendor')
    } else {
      setVendor(newVendor)
      toast.success(vendorValue ? `Vendor set to ${newVendor}` : 'Vendor cleared')
    }
  }

  const handleDescSave = async () => {
    setEditingDesc(false)
    if (description === (job.description || '')) return
    const { error } = await supabase.from('jobs').update({ description: description.trim() || null }).eq('id', job.id)
    if (error) toast.error('Failed to save description')
  }

  const handleMarkApproved = async () => {
    const newStatus = vendor ? 'at_lab' : 'completed'
    await handleStatusChange(newStatus)
  }

  const handleRequestReedit = async () => {
    await handleStatusChange('in_progress')
  }

  return (
    <div className="rounded-xl border bg-card p-4 space-y-3">
      {/* Header */}
      <div>
        <div className="font-semibold text-sm">{productName}</div>
        {job.quantity && job.quantity > 1 && (
          <span className="text-xs text-muted-foreground ml-1">x{job.quantity}</span>
        )}
        <div className="text-xs text-muted-foreground">{job.product_code}</div>
      </div>

      {/* Description */}
      {editingDesc ? (
        <input
          type="text"
          value={description}
          onChange={e => setDescription(e.target.value)}
          onBlur={handleDescSave}
          onKeyDown={e => { if (e.key === 'Enter') handleDescSave(); if (e.key === 'Escape') { setDescription(job.description || ''); setEditingDesc(false) } }}
          autoFocus
          className="w-full text-sm rounded border border-input bg-background px-2 py-1 outline-none focus:border-ring"
        />
      ) : (
        <button onClick={() => setEditingDesc(true)} className="text-sm text-muted-foreground hover:text-foreground text-left w-full">
          {description || <span className="italic text-muted-foreground/50">Add description...</span>}
        </button>
      )}

      {/* Status + Vendor row */}
      <div className="flex items-center gap-3 flex-wrap">
        <div>
          <div className="text-[10px] text-muted-foreground uppercase tracking-wide mb-1">Status</div>
          <select
            value={status}
            onChange={e => handleStatusChange(e.target.value)}
            className={`text-xs rounded-lg border border-input px-2 py-1.5 outline-none cursor-pointer ${ORDER_STATUS_COLORS[status] || 'bg-background'}`}
          >
            {ORDER_STATUSES.map(s => (
              <option key={s.value} value={s.value}>{s.label}</option>
            ))}
          </select>
        </div>

        {showVendor && (
          <div>
            <div className="text-[10px] text-muted-foreground uppercase tracking-wide mb-1">Vendor</div>
            <select
              value={vendor}
              onChange={e => handleVendorChange(e.target.value)}
              className="text-xs rounded-lg border border-input bg-background px-2 py-1.5 outline-none cursor-pointer"
            >
              <option value="">—</option>
              <option value="best_canvas">Best Canvas</option>
              <option value="cci">CCI</option>
              <option value="uaf">UAF</option>
            </select>
          </div>
        )}
      </div>

      {/* Approval Loop */}
      {(job.approval_round ?? 0) > 0 && (
        <ApprovalLoop job={job} status={status} onApprove={handleMarkApproved} onReedit={handleRequestReedit} />
      )}
    </div>
  )
}

function ApprovalLoop({ job, status, onApprove, onReedit }: {
  job: OrderJob
  status: string
  onApprove: () => void
  onReedit: () => void
}) {
  const round = job.approval_round || 0
  const maxDots = Math.max(round + 1, 3)
  const displayDots = Math.min(maxDots, 10)

  const daysSinceSent = job.sent_for_review_date
    ? differenceInDays(new Date(), parseISO(job.sent_for_review_date))
    : 0

  return (
    <div className="rounded-lg border border-border bg-muted/30 p-3 space-y-2">
      <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Approval Loop</div>

      {/* Dots */}
      <div className="flex items-center gap-1.5">
        {Array.from({ length: displayDots }).map((_, i) => {
          const roundNum = i + 1
          const isCurrent = roundNum === round
          const isDone = roundNum < round
          const isFuture = roundNum > round

          return (
            <div key={i} className="flex flex-col items-center">
              <div
                className={`w-3 h-3 rounded-full ${
                  isDone ? 'bg-green-500' :
                  isCurrent ? 'bg-yellow-400 animate-pulse' :
                  'bg-gray-200 border border-gray-300'
                }`}
                title={`Round ${roundNum}`}
              />
            </div>
          )
        })}
        {maxDots > 10 && <span className="text-xs text-muted-foreground">...</span>}
      </div>

      {/* Current state */}
      <div className="text-xs text-muted-foreground">
        {status === 'waiting_approval' && (
          <span>Waiting on client ({daysSinceSent} day{daysSinceSent !== 1 ? 's' : ''})</span>
        )}
        {status === 'in_progress' && round > 0 && (
          <span>Re-editing (round {round})</span>
        )}
        {job.sent_for_review_date && (
          <span className="block">Sent for review: {formatDateCompact(job.sent_for_review_date)}</span>
        )}
        {(job.reedit_count ?? 0) > 0 && (
          <span className="block">Reedit count: {job.reedit_count}</span>
        )}
      </div>

      {/* Action buttons */}
      <div className="flex gap-2 pt-1">
        <button
          onClick={onApprove}
          className="text-xs rounded-lg border border-green-300 bg-green-50 text-green-700 px-3 py-1.5 hover:bg-green-100 transition-colors"
        >
          Mark Approved
        </button>
        <button
          onClick={onReedit}
          className="text-xs rounded-lg border border-amber-300 bg-amber-50 text-amber-700 px-3 py-1.5 hover:bg-amber-100 transition-colors"
        >
          Request Reedit
        </button>
      </div>
    </div>
  )
}
