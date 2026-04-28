'use client'

import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Camera, Plus, MoreHorizontal, X } from 'lucide-react'
import { format, parseISO } from 'date-fns'
import { formatTime12h } from '@/lib/formatters'
import { toast } from 'sonner'
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from '@/components/ui/dropdown-menu'

interface Appointment {
  id: string
  appointment_type: string
  appointment_date: string
  start_time: string | null
  end_time: string | null
  location: string | null
  notes: string | null
  status: string
}

interface MeetingPoint {
  id: string
  name: string
}

const TYPE_LABELS: Record<string, string> = {
  engagement_shoot: 'Engagement Shoot',
  plw: 'PLW',
  c2_sale: 'C2 Sale',
  consultation: 'Consultation',
  other: 'Other',
}

const STATUS_COLORS: Record<string, string> = {
  scheduled: 'bg-green-100 text-green-700',
  completed: 'bg-blue-100 text-blue-700',
  cancelled: 'bg-red-100 text-red-700',
  rescheduled: 'bg-amber-100 text-amber-700',
}

function formatTime24(t: string | null): string {
  if (!t) return ''
  return t.slice(0, 5)
}

function formatApptDate(d: string): string {
  const date = parseISO(d)
  return format(date, 'EEE').toUpperCase() + ' ' + format(date, 'MMM d, yyyy')
}

export function EngagementAppointments({ coupleId }: { coupleId: string }) {
  const [appointments, setAppointments] = useState<Appointment[]>([])
  const [meetingPoints, setMeetingPoints] = useState<MeetingPoint[]>([])
  const [showForm, setShowForm] = useState(false)
  const [saving, setSaving] = useState(false)

  // Form fields
  const [formType, setFormType] = useState('engagement_shoot')
  const [formDate, setFormDate] = useState('')
  const [formStartTime, setFormStartTime] = useState('')
  const [formEndTime, setFormEndTime] = useState('')
  const [formLocation, setFormLocation] = useState('')
  const [formCustomLocation, setFormCustomLocation] = useState('')
  const [formNotes, setFormNotes] = useState('')

  const fetchAppointments = useCallback(async () => {
    const { data } = await supabase
      .from('couple_appointments')
      .select('id, appointment_type, appointment_date, start_time, end_time, location, notes, status')
      .eq('couple_id', coupleId)
      .order('appointment_date', { ascending: true })
    if (data) setAppointments(data)
  }, [coupleId])

  useEffect(() => {
    fetchAppointments()
    supabase.from('meeting_points').select('id, name').eq('is_active', true).order('name').then(({ data }) => {
      if (data) setMeetingPoints(data)
    })
  }, [fetchAppointments])

  const resetForm = () => {
    setFormType('engagement_shoot')
    setFormDate('')
    setFormStartTime('')
    setFormEndTime('')
    setFormLocation('')
    setFormCustomLocation('')
    setFormNotes('')
  }

  const handleSave = async () => {
    if (!formDate) return
    setSaving(true)
    const location = formLocation === '__custom__' ? formCustomLocation : formLocation
    const { error } = await supabase.from('couple_appointments').insert({
      couple_id: coupleId,
      appointment_type: formType,
      appointment_date: formDate,
      start_time: formStartTime || null,
      end_time: formEndTime || null,
      location: location || null,
      notes: formNotes || null,
      status: 'scheduled',
    })
    setSaving(false)
    if (error) {
      toast.error('Failed to save appointment')
    } else {
      toast.success('Appointment scheduled')
      resetForm()
      setShowForm(false)
      fetchAppointments()
    }
  }

  const handleCancel = () => {
    resetForm()
    setShowForm(false)
  }

  const updateStatus = async (id: string, status: string) => {
    const { error } = await supabase
      .from('couple_appointments')
      .update({ status, updated_at: new Date().toISOString() })
      .eq('id', id)
    if (error) {
      toast.error('Failed to update appointment')
    } else {
      toast.success(status === 'completed' ? 'Marked as completed' : 'Appointment cancelled')
      fetchAppointments()
    }
  }

  const inputStyle = 'w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary'
  const labelStyle = 'block text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1'

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Camera className="h-4 w-4 text-teal-600" />
          Appointments
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Existing appointments */}
        {appointments.length > 0 ? (
          <div className="space-y-2">
            {appointments.map(a => (
              <div key={a.id} className="flex items-center justify-between rounded-lg border px-3 py-2 text-sm">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-medium">{TYPE_LABELS[a.appointment_type] ?? a.appointment_type}</span>
                  <span className="text-muted-foreground">—</span>
                  <span>{formatApptDate(a.appointment_date)}</span>
                  {(a.start_time || a.end_time) && (
                    <span className="text-muted-foreground">
                      {formatTime12h(a.start_time)}{a.end_time ? `–${formatTime12h(a.end_time)}` : ''}
                    </span>
                  )}
                  {a.location && <span className="text-muted-foreground">— {a.location}</span>}
                  <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_COLORS[a.status] ?? 'bg-gray-100 text-gray-700'}`}>
                    {a.status}
                  </span>
                </div>
                {a.status === 'scheduled' && (
                  <DropdownMenu>
                    <DropdownMenuTrigger render={<button className="rounded p-1 hover:bg-accent" />}>
                      <MoreHorizontal className="h-4 w-4 text-muted-foreground" />
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => updateStatus(a.id, 'completed')}>
                        Mark Completed
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => updateStatus(a.id, 'cancelled')} className="text-red-600">
                        Cancel
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground italic">No appointments scheduled</p>
        )}

        {/* Schedule button / form */}
        {!showForm ? (
          <button
            onClick={() => setShowForm(true)}
            className="flex items-center gap-1.5 text-sm font-medium text-primary hover:underline"
          >
            <Plus className="h-4 w-4" />
            Schedule Appointment
          </button>
        ) : (
          <div className="rounded-lg border p-4 space-y-3 bg-muted/30">
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold">New Appointment</span>
              <button onClick={handleCancel} className="rounded p-1 hover:bg-accent">
                <X className="h-4 w-4 text-muted-foreground" />
              </button>
            </div>

            {/* Type */}
            <div>
              <label className={labelStyle}>Type</label>
              <select value={formType} onChange={e => setFormType(e.target.value)} className={inputStyle}>
                <option value="engagement_shoot">Engagement Shoot</option>
                <option value="plw">PLW</option>
                <option value="c2_sale">C2 Sale</option>
                <option value="consultation">Consultation</option>
                <option value="other">Other</option>
              </select>
            </div>

            {/* Date + Times */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div>
                <label className={labelStyle}>Date *</label>
                <input type="date" value={formDate} onChange={e => setFormDate(e.target.value)} className={inputStyle} />
              </div>
              <div>
                <label className={labelStyle}>Start Time</label>
                <input type="time" value={formStartTime} onChange={e => setFormStartTime(e.target.value)} className={inputStyle} />
              </div>
              <div>
                <label className={labelStyle}>End Time</label>
                <input type="time" value={formEndTime} onChange={e => setFormEndTime(e.target.value)} className={inputStyle} />
              </div>
            </div>

            {/* Location */}
            <div>
              <label className={labelStyle}>Location</label>
              <select
                value={formLocation}
                onChange={e => { setFormLocation(e.target.value); if (e.target.value !== '__custom__') setFormCustomLocation('') }}
                className={inputStyle}
              >
                <option value="">— Select —</option>
                {meetingPoints.map(mp => (
                  <option key={mp.id} value={mp.name}>{mp.name}</option>
                ))}
                <option value="__custom__">Other (type below)</option>
              </select>
              {formLocation === '__custom__' && (
                <input
                  type="text"
                  value={formCustomLocation}
                  onChange={e => setFormCustomLocation(e.target.value)}
                  placeholder="Enter location..."
                  className={`${inputStyle} mt-2`}
                  autoFocus
                />
              )}
            </div>

            {/* Notes */}
            <div>
              <label className={labelStyle}>Notes</label>
              <textarea
                value={formNotes}
                onChange={e => setFormNotes(e.target.value)}
                rows={2}
                className={inputStyle}
                placeholder="Optional notes..."
              />
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2 pt-1">
              <button
                onClick={handleSave}
                disabled={!formDate || saving}
                className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
              >
                {saving ? 'Saving...' : 'Save'}
              </button>
              <button
                onClick={handleCancel}
                className="rounded-md border px-4 py-2 text-sm font-medium hover:bg-accent"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
