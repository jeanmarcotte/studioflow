'use client'

import { useState } from 'react'
import { Calendar } from 'lucide-react'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { supabase } from '@/lib/supabase'
import { toast } from 'sonner'
import type { Lead } from '@/lib/lead-utils'
import { coupleName } from '@/lib/lead-utils'

interface BookedModalProps {
  lead: Lead
  open: boolean
  onClose: () => void
  onBooked: () => void
}

const MEETING_TYPES = [
  { value: 'zoom', label: 'Zoom' },
  { value: 'in_person', label: 'In-Person' },
  { value: 'phone', label: 'Phone' },
]

export function BookedModal({ lead, open, onClose, onBooked }: BookedModalProps) {
  const [apptDate, setApptDate] = useState('')
  const [apptTime, setApptTime] = useState('14:00')
  const [meetingType, setMeetingType] = useState('zoom')
  const [notes, setNotes] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const handleSubmit = async () => {
    if (!apptDate) {
      toast.error('Please select an appointment date')
      return
    }

    setSubmitting(true)

    // 1. Update ballot status
    const { error: ballotError } = await supabase
      .from('ballots')
      .update({ status: 'meeting_booked' })
      .eq('id', lead.id)

    if (ballotError) {
      toast.error('Failed to update lead status')
      setSubmitting(false)
      return
    }

    // 2. Create sales_meetings row (use actual table schema)
    const { error: meetingError } = await supabase
      .from('sales_meetings')
      .insert({
        ballot_id: lead.id,
        bride_name: lead.bride_first_name || '',
        groom_name: lead.groom_first_name || '',
        wedding_date: lead.wedding_date,
        service_needs: lead.service_needs || 'photo_video',
        lead_source: lead.show_id || null,
        appt_date: apptDate,
        status: 'scheduled',
      })

    if (meetingError) {
      console.error('Sales meeting insert error:', meetingError)
      // Non-fatal — ballot already updated
      toast.error('Meeting created but sales_meetings insert had an issue')
    }

    // 3. Log entity event
    if (lead.entity_id) {
      await supabase.from('entity_events').insert({
        entity_id: lead.entity_id,
        event_type: 'meeting_booked',
        event_data: {
          ballot_id: lead.id,
          appt_date: apptDate,
          appt_time: apptTime,
          meeting_type: meetingType,
          notes,
        },
        created_by: 'marianna',
      })
    }

    // 4. Send email notification with ALL info
    try {
      await fetch('/api/leads/notify-appointment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bride: lead.bride_first_name,
          groom: lead.groom_first_name,
          phone: lead.cell_phone,
          email: lead.email,
          weddingDate: lead.wedding_date,
          venue: lead.venue_name,
          source: lead.show_id,
          budget: lead.budget_range,
          apptDate,
          apptTime,
          meetingType,
          notes,
          album: lead.want_album,
          engagement: lead.want_engagement,
          dj: (lead as any).has_dj,
          planner: lead.planner_involved,
          multiDay: lead.multi_day_event,
          firstLook: (lead as any).first_look,
          bridalParty: lead.bridal_party_size,
        }),
      })
    } catch (e) {
      console.error('Email notification failed:', e)
    }

    toast.success(`Appointment created! Email sent.`)
    setSubmitting(false)
    onBooked()
  }

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose() }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <span>📅</span> Make Appointment: {coupleName(lead)}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Appointment Date */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Appointment Date</label>
            <input
              type="date"
              value={apptDate}
              onChange={(e) => setApptDate(e.target.value)}
              className="w-full h-11 rounded-lg border border-border bg-white px-3 text-sm outline-none focus:border-[#0d4f4f] focus:ring-1 focus:ring-[#0d4f4f]/20"
            />
          </div>

          {/* Appointment Time (24h) */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Appointment Time</label>
            <input
              type="time"
              value={apptTime}
              onChange={(e) => setApptTime(e.target.value)}
              className="w-full h-11 rounded-lg border border-border bg-white px-3 text-sm outline-none focus:border-[#0d4f4f] focus:ring-1 focus:ring-[#0d4f4f]/20"
            />
          </div>

          {/* Meeting Type */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Meeting Type</label>
            <div className="flex rounded-lg border border-border overflow-hidden">
              {MEETING_TYPES.map(t => (
                <button
                  key={t.value}
                  onClick={() => setMeetingType(t.value)}
                  className={`flex-1 h-11 text-sm font-medium transition-colors ${
                    meetingType === t.value
                      ? 'bg-[#0d4f4f] text-white'
                      : 'bg-white text-muted-foreground hover:bg-muted/60'
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          {/* Notes */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Notes</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              className="w-full rounded-lg border border-border bg-white px-3 py-2 text-sm outline-none resize-none focus:border-[#0d4f4f] focus:ring-1 focus:ring-[#0d4f4f]/20"
              placeholder="Optional notes..."
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={submitting}>Cancel</Button>
          <Button
            onClick={handleSubmit}
            disabled={submitting}
            className="bg-green-600 hover:bg-green-700 text-white"
          >
            <Calendar className="h-4 w-4 mr-1.5" />
            {submitting ? 'Booking...' : 'Book Meeting'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
