// src/components/leads/LostModal.tsx

'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { Loader2, XCircle } from 'lucide-react';

interface LostModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  lead: {
    id: string;
    bride_name: string;
    groom_name?: string;
  };
  onSuccess?: () => void;
}

const LOSS_REASONS = [
  { value: 'booked_elsewhere', label: 'Booked another photographer' },
  { value: 'too_expensive', label: 'Price too high' },
  { value: 'not_responsive', label: 'Not responding / Ghost' },
  { value: 'wedding_cancelled', label: 'Wedding cancelled' },
  { value: 'wrong_fit', label: 'Not the right fit' },
  { value: 'date_unavailable', label: 'Our date was not available' },
  { value: 'other', label: 'Other' },
];

export function LostModal({ open, onOpenChange, lead, onSuccess }: LostModalProps) {
  const [lossReason, setLossReason] = useState('');
  const [lossNotes, setLossNotes] = useState('');
  const [saving, setSaving] = useState(false);

  const handleMarkLost = async () => {
    if (!lossReason) {
      toast.error('Please select a reason');
      return;
    }

    setSaving(true);
    try {
      const { error } = await supabase
        .from('ballots')
        .update({
          status: 'lost',
          loss_reason: lossReason,
          loss_notes: lossNotes || null,
        })
        .eq('id', lead.id);

      if (error) throw error;

      toast.success('Lead marked as lost');
      onOpenChange(false);
      onSuccess?.();
    } catch (error) {
      console.error('Error marking lead as lost:', error);
      toast.error('Failed to update lead');
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
          <DialogTitle>Mark as Not Interested</DialogTitle>
          <DialogDescription>
            We hate to see {coupleName} go. Help us understand why.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>Reason</Label>
            <Select value={lossReason} onValueChange={(v) => setLossReason(v || '')}>
              <SelectTrigger>
                <SelectValue placeholder="Select a reason" />
              </SelectTrigger>
              <SelectContent>
                {LOSS_REASONS.map((reason) => (
                  <SelectItem key={reason.value} value={reason.value}>
                    {reason.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Additional Notes (Optional)</Label>
            <Textarea
              id="notes"
              value={lossNotes}
              onChange={(e) => setLossNotes(e.target.value)}
              placeholder="Any additional context..."
              rows={3}
            />
          </div>
        </div>

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button variant="destructive" onClick={handleMarkLost} disabled={saving}>
            {saving ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <XCircle className="w-4 h-4 mr-2" />
            )}
            Mark as Lost
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
