'use client';

import { format, parseISO, differenceInDays } from 'date-fns';

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

export function ClientCard({
  coupleName,
  weddingDate,
  receptionVenue,
  ceremonyVenue,
  leadSource,
  bookedDate,
  signedDate,
  packageType,
  hasExtras,
  balance,
  isArchived,
  isComplete,
}: ClientCardProps) {
  const today = new Date();
  const wedding = weddingDate ? parseISO(weddingDate) : null;
  const daysUntil = wedding ? differenceInDays(wedding, today) : 0;
  const weddingPassed = daysUntil < 0;
  const isPaid = balance <= 0.05;

  // Format dates
  const formattedWeddingDate = wedding ? format(wedding, 'EEEE, MMMM d, yyyy') : 'Date TBD';
  const formattedSignedDate = signedDate ? format(parseISO(signedDate), 'MMM d, yyyy') : null;
  const formattedBookedDate = bookedDate ? format(parseISO(bookedDate), 'MMM d, yyyy') : null;

  // Build venue string
  const venueString = [
    ceremonyVenue ? `⛪ ${ceremonyVenue}` : null,
    receptionVenue ? `🏰 ${receptionVenue}` : null,
  ].filter(Boolean).join(' → ');

  return (
    <div className="bg-gradient-to-r from-teal-600 to-teal-700 text-white rounded-2xl p-6 mb-5 relative">
      {/* Badges */}
      <div className="flex flex-wrap gap-2 mb-3">
        <span className="bg-white/20 px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wide">
          Booked
        </span>
        <span className="bg-white/20 px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wide">
          {packageType === 'photo_video' ? '📷🎥 Photo + Video' : '📷 Photo Only'}
        </span>
        {isArchived && (
          <span className="bg-blue-500 px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wide">
            Archived
          </span>
        )}
        {!isArchived && weddingPassed && !isComplete && (
          <span className="bg-amber-500 px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wide">
            🔥 In Production
          </span>
        )}
        {hasExtras && (
          <span className="bg-orange-500 px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wide">
            💰 Extras
          </span>
        )}
        {isPaid ? (
          <span className="bg-green-500 px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wide">
            ✓ Paid
          </span>
        ) : (
          <span className="bg-red-500 px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wide">
            ${balance.toLocaleString()} Owing
          </span>
        )}
      </div>

      {/* Couple Name */}
      <h1 className="text-3xl font-bold mb-2">{coupleName}</h1>

      {/* Meta Info */}
      <div className="flex flex-col gap-1 text-white/90 text-sm">
        <span>
          {weddingPassed
            ? `📅 ${Math.abs(daysUntil)} days since wedding`
            : `🎊 ${daysUntil} days until wedding`
          }
        </span>
        <span>📅 {formattedWeddingDate}</span>
        {venueString && <span>{venueString}</span>}
        <span className="mt-2 text-xs text-white/70">
          📍 Source: {leadSource || 'Not recorded'} · Booked: {formattedBookedDate || 'Unknown'}
        </span>
      </div>

      {/* Signed Date - Top Right */}
      {formattedSignedDate && (
        <div className="absolute top-6 right-6 text-sm text-white/80 text-right">
          Signed {formattedSignedDate}
        </div>
      )}
    </div>
  );
}
