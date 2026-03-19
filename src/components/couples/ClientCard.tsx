'use client';

export interface ClientCardProps {
  coupleName: string;
  weddingDate: string;
  receptionVenue: string | null;
  ceremonyVenue: string | null;
  leadSource: string | null;
  bookedDate: string | null;
  signedDate: string | null;
  packageType: string;
  hasExtras: boolean;
  balance: number;
  isArchived: boolean;
  isComplete: boolean;
}

export function ClientCard(props: ClientCardProps) {
  return (
    <div className="bg-teal-600 text-white rounded-2xl p-6 mb-5">
      <p className="opacity-50">ClientCard — {props.coupleName}</p>
    </div>
  );
}
