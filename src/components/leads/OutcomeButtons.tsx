'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Calendar, XCircle } from 'lucide-react';
import { BookedModal } from './BookedModal';
import { LostModal } from './LostModal';
import type { Lead } from '@/lib/lead-utils';

interface OutcomeButtonsProps {
  lead: Lead;
  onUpdate?: () => void;
}

export function OutcomeButtons({ lead, onUpdate }: OutcomeButtonsProps) {
  const [showBookedModal, setShowBookedModal] = useState(false);
  const [showLostModal, setShowLostModal] = useState(false);

  return (
    <>
      <div className="flex gap-2">
        <Button
          className="flex-1 bg-green-600 hover:bg-green-700 text-white"
          onClick={() => setShowBookedModal(true)}
        >
          <Calendar className="w-4 h-4 mr-2" />
          Booked!
        </Button>
        <Button
          variant="destructive"
          className="flex-1"
          onClick={() => setShowLostModal(true)}
        >
          <XCircle className="w-4 h-4 mr-2" />
          Not Interested
        </Button>
      </div>

      <BookedModal
        lead={lead}
        open={showBookedModal}
        onClose={() => setShowBookedModal(false)}
        onBooked={() => {
          setShowBookedModal(false);
          onUpdate?.();
        }}
      />

      <LostModal
        lead={lead}
        open={showLostModal}
        onClose={() => setShowLostModal(false)}
        onLost={() => {
          setShowLostModal(false);
          onUpdate?.();
        }}
      />
    </>
  );
}
