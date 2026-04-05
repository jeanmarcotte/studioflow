'use client'

import { useState } from 'react'
import { X } from 'lucide-react'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { supabase } from '@/lib/supabase'
import { toast } from 'sonner'
import type { Lead } from '@/lib/lead-utils'
import { coupleName } from '@/lib/lead-utils'

interface LostModalProps {
  lead: Lead
  open: boolean
  onClose: () => void
  onLost: () => void
}

const LOSS_REASONS = [
  { value: 'booked_competitor', label: 'Booked someone else' },
  { value: 'too_expensive', label: 'Too expensive' },
  { value: 'date_unavailable', label: 'Date not available' },
  { value: 'plans_changed', label: 'Changed wedding plans' },
  { value: 'no_response', label: 'No response after 6 touches' },
  { value: 'other', label: 'Other' },
]

export function LostModal({ lead, open, onClose, onLost }: LostModalProps) {
  const [reason, setReason] = useState('')
  const [notes, setNotes] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const handleSubmit = async () => {
    if (!reason) {
      toast.error('Please select a reason')
      return
    }

    setSubmitting(true)

    // 1. Update ballot
    const { error } = await supabase
      .from('ballots')
      .update({
        status: 'lost',
        loss_reason: reason,
        loss_notes: notes || null,
      })
      .eq('id', lead.id)

    if (error) {
      toast.error('Failed to update lead')
      setSubmitting(false)
      return
    }

    // 2. Log entity event
    if (lead.entity_id) {
      await supabase.from('entity_events').insert({
        entity_id: lead.entity_id,
        event_type: 'lead_lost',
        event_data: {
          ballot_id: lead.id,
          loss_reason: reason,
          loss_notes: notes,
        },
        created_by: 'marianna',
      })
    }

    toast.success('Lead marked as lost')
    setSubmitting(false)
    onLost()
  }

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose() }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>We hate to see you go...</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Reason radio group */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Reason</label>
            <div className="space-y-2">
              {LOSS_REASONS.map(r => (
                <button
                  key={r.value}
                  onClick={() => setReason(r.value)}
                  className={`w-full flex items-center gap-3 h-11 px-4 rounded-lg border text-sm text-left transition-colors ${
                    reason === r.value
                      ? 'border-red-400 bg-red-50 text-red-700 font-medium'
                      : 'border-border bg-white text-muted-foreground hover:bg-muted/60'
                  }`}
                >
                  <div className={`h-4 w-4 rounded-full border-2 flex items-center justify-center shrink-0 ${
                    reason === r.value ? 'border-red-500' : 'border-gray-300'
                  }`}>
                    {reason === r.value && <div className="h-2 w-2 rounded-full bg-red-500" />}
                  </div>
                  {r.label}
                </button>
              ))}
            </div>
          </div>

          {/* Notes */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Notes (optional)</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              className="w-full rounded-lg border border-border bg-white px-3 py-2 text-sm outline-none resize-none focus:border-red-400 focus:ring-1 focus:ring-red-200"
              placeholder="Any additional details..."
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={submitting}>Cancel</Button>
          <Button
            onClick={handleSubmit}
            disabled={submitting || !reason}
            className="bg-red-600 hover:bg-red-700 text-white"
          >
            <X className="h-4 w-4 mr-1.5" />
            {submitting ? 'Saving...' : 'Confirm Loss'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
