'use client';

import { Badge } from '@/components/ui/badge';

interface LeadStatusIndicatorProps {
  status: string;
  contactCount: number;
  nextContactDue?: string | null;
}

export function LeadStatusIndicator({
  status,
  contactCount,
  nextContactDue
}: LeadStatusIndicatorProps) {
  const isOverdue = nextContactDue && new Date(nextContactDue) < new Date();
  const isExhausted = contactCount >= 6 && status !== 'meeting_booked' && status !== 'booked';

  if (isExhausted) {
    return (
      <Badge variant="secondary" className="bg-gray-500 text-white">
        Exhausted
      </Badge>
    );
  }

  if (isOverdue) {
    return (
      <Badge variant="destructive">
        Overdue
      </Badge>
    );
  }

  if (nextContactDue) {
    const dueDate = new Date(nextContactDue);
    const today = new Date();
    if (dueDate.toDateString() === today.toDateString()) {
      return (
        <Badge className="bg-yellow-500 text-black">
          Due Today
        </Badge>
      );
    }
  }

  const statusBadges: Record<string, { label: string; className: string }> = {
    new: { label: 'New', className: 'bg-blue-500' },
    contacted: { label: 'Contacted', className: 'bg-cyan-500' },
    meeting_booked: { label: 'Appointment', className: 'bg-green-500' },
    quoted: { label: 'Quoted', className: 'bg-purple-500' },
    booked: { label: 'Booked', className: 'bg-green-700' },
    lost: { label: 'Lost', className: 'bg-red-500' },
    dead: { label: 'Dead', className: 'bg-gray-500' },
  };

  const badge = statusBadges[status] || { label: status, className: 'bg-gray-400' };

  return (
    <Badge className={badge.className}>
      {badge.label}
    </Badge>
  );
}
