// src/components/leads/OutcomeButtons.tsx

'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Calendar, XCircle } from 'lucide-react';
import { BookedModal } from './BookedModal';
import { LostModal } from './LostModal';

interface OutcomeButtonsProps {
  lead: {
    id: string;
    bride_name: string;
    groom_name?: string;
    email?: string;
  };
  onUpdate?: () => void;
}

export function OutcomeButtons({ lead, onUpdate }: OutcomeButtonsProps) {
  const [showBookedModal, setShowBookedModal] = useState(false);
  const [showLostModal, setShowLostModal] = useState(false);

  return (
    <>
      <div className="flex gap-2">
        <Button
          className="flex-1 bg-green-600 hover:bg-green-700"
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
        open={showBookedModal}
        onOpenChange={setShowBookedModal}
        lead={lead}
        onSuccess={onUpdate}
      />

      <LostModal
        open={showLostModal}
        onOpenChange={setShowLostModal}
        lead={lead}
        onSuccess={onUpdate}
      />
    </>
  );
}
