// src/components/leads/BookedModal.tsx

'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

// Generate time slots from 9 AM to 8 PM in 15-min increments
const timeSlots = (() => {
  const slots: { value: string; label: string }[] = [];
  for (let hour = 9; hour <= 20; hour++) {
    for (let min = 0; min < 60; min += 15) {
      const h = hour % 12 || 12;
      const ampm = hour < 12 ? 'AM' : 'PM';
      const label = `${h}:${min.toString().padStart(2, '0')} ${ampm}`;
      const value = `${hour.toString().padStart(2, '0')}:${min.toString().padStart(2, '0')}`;
      slots.push({ value, label });
    }
  }
  return slots;
})();
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { Calendar, Loader2 } from 'lucide-react';

interface BookedModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  lead: {
    id: string;
    bride_name: string;
    groom_name?: string;
    email?: string;
  };
  onSuccess?: () => void;
}

export function BookedModal({ open, onOpenChange, lead, onSuccess }: BookedModalProps) {
  const [appointmentDate, setAppointmentDate] = useState('');
  const [appointmentTime, setAppointmentTime] = useState('18:00');
  const [saving, setSaving] = useState(false);

  const handleBook = async () => {
    if (!appointmentDate) {
      toast.error('Please select an appointment date');
      return;
    }

    setSaving(true);
    try {
      const appointmentDateTime = `${appointmentDate}T${appointmentTime}:00`;

      // Update lead status
      const { error } = await supabase
        .from('ballots')
        .update({
          status: 'meeting_booked',
          zoom_invite_sent_at: new Date().toISOString(),
          notes: `Appointment booked for ${appointmentDateTime}`,
        })
        .eq('id', lead.id);

      if (error) throw error;

      toast.success(`Appointment booked for ${lead.bride_name}!`);
      onOpenChange(false);
      onSuccess?.();
    } catch (error) {
      console.error('Error booking appointment:', error);
      toast.error('Failed to book appointment');
    } finally {
      setSaving(false);
    }
  };

  const coupleName = lead.groom_name
    ? `${lead.bride_name} & ${lead.groom_name}`
    : lead.bride_name;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Book Appointment</DialogTitle>
          <DialogDescription>
            Schedule a consultation with {coupleName}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="date">Appointment Date</Label>
            <Input
              id="date"
              type="date"
              value={appointmentDate}
              onChange={(e) => setAppointmentDate(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label>Time</Label>
            <Select value={appointmentTime} onValueChange={(v) => setAppointmentTime(v || '14:00')}>
              <SelectTrigger className="bg-white border-gray-200">
                <SelectValue placeholder="Select time" />
              </SelectTrigger>
              <SelectContent className="bg-white border border-gray-200 shadow-lg max-h-60">
                {timeSlots.map((slot) => (
                  <SelectItem key={slot.value} value={slot.value} className="text-gray-900 cursor-pointer">
                    {slot.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleBook} disabled={saving}>
            {saving ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Calendar className="w-4 h-4 mr-2" />
            )}
            Make Appt!
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
