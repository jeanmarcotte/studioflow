'use client';

import { format, parseISO } from 'date-fns';

export interface ContractPackageProps {
  signedDate: string;
  dayOfWeek: string;
  startTime: string;
  endTime: string;
  numPhotographers: number;
  numVideographers: number;
  engagementSession: boolean;
  engagementLocation: string | null;
  dronePhotography: boolean;
  parentAlbumsQty: number;
  parentAlbumsSize: string | null;
  locGroom: boolean;
  locBride: boolean;
  locCeremony: boolean;
  locPark: boolean;
  locReception: boolean;
  subtotal: number;
  tax: number;
  contractTotal: number;
  extrasTotal: number;
  c2FramesTotal: number;
  c3ExtrasTotal: number;
  totalPaid: number;
  balance: number;
  numGuests: number | null;
  ceremonyLocation: string | null;
  receptionVenue: string | null;
  isArchived: boolean;
}

export function ContractPackage({
  signedDate,
  dayOfWeek,
  startTime,
  endTime,
  numPhotographers,
  numVideographers,
  engagementSession,
  engagementLocation,
  dronePhotography,
  parentAlbumsQty,
  parentAlbumsSize,
  locGroom,
  locBride,
  locCeremony,
  locPark,
  locReception,
  subtotal,
  tax,
  contractTotal,
  extrasTotal,
  c2FramesTotal,
  c3ExtrasTotal,
  totalPaid,
  balance,
  numGuests,
  ceremonyLocation,
  receptionVenue,
  isArchived,
}: ContractPackageProps) {
  const locationCount = [locGroom, locBride, locCeremony, locPark, locReception].filter(Boolean).length;
  const grandTotal = contractTotal + extrasTotal;
  const formattedSignedDate = signedDate ? format(parseISO(signedDate), 'MMM d, yyyy') : 'Unknown';

  return (
    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden mb-4">
      {/* Header */}
      <div className="bg-gradient-to-r from-teal-700 to-teal-800 text-white px-5 py-4 flex justify-between items-center">
        <h3 className="font-semibold">📄 Contract Package — As Signed</h3>
        <div className="flex items-center gap-3">
          <span className="text-sm text-white/80">{formattedSignedDate}</span>
          <span className={`text-xs font-semibold px-2 py-1 rounded ${
            isArchived ? 'bg-slate-500' : 'bg-blue-500'
          }`}>
            {isArchived ? 'ARCHIVED' : 'ACTIVE'}
          </span>
        </div>
      </div>

      {/* 4 Column Grid */}
      <div className="grid grid-cols-4 gap-6 p-5">
        {/* Coverage */}
        <div>
          <h4 className="text-xs font-semibold text-slate-500 uppercase mb-3 pb-2 border-b-2 border-teal-500">
            Coverage
          </h4>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-slate-500">Package</span>
              <span className="font-medium">{numVideographers > 0 ? 'Photo + Video' : 'Photo Only'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Hours</span>
              <span className="font-medium">{startTime} – {endTime}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Day</span>
              <span className="font-medium capitalize">{dayOfWeek.toLowerCase()}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Locations</span>
              <span className="font-medium">{locationCount} of 5 ✓</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Drone</span>
              <span className="font-medium">{dronePhotography ? '✓ Yes' : 'No'}</span>
            </div>
            {numGuests && (
              <div className="flex justify-between">
                <span className="text-slate-500">Guests</span>
                <span className="font-medium">{numGuests}</span>
              </div>
            )}
          </div>
        </div>

        {/* Engagement */}
        <div>
          <h4 className="text-xs font-semibold text-slate-500 uppercase mb-3 pb-2 border-b-2 border-teal-500">
            Engagement
          </h4>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-slate-500">Session</span>
              <span className="font-medium">{engagementSession ? '✓ Included' : 'Not included'}</span>
            </div>
            {engagementLocation && (
              <div className="flex justify-between">
                <span className="text-slate-500">Location</span>
                <span className="font-medium">{engagementLocation}</span>
              </div>
            )}
          </div>
        </div>

        {/* Team */}
        <div>
          <h4 className="text-xs font-semibold text-slate-500 uppercase mb-3 pb-2 border-b-2 border-teal-500">
            Team
          </h4>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-slate-500">Photographers</span>
              <span className="font-medium">{numPhotographers}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Videographers</span>
              <span className="font-medium">{numVideographers}</span>
            </div>
            {parentAlbumsQty > 0 && (
              <div className="flex justify-between">
                <span className="text-slate-500">Parent Albums</span>
                <span className="font-medium">{parentAlbumsQty} × {parentAlbumsSize}</span>
              </div>
            )}
          </div>
        </div>

        {/* Financials */}
        <div>
          <h4 className="text-xs font-semibold text-slate-500 uppercase mb-3 pb-2 border-b-2 border-teal-500">
            Financials
          </h4>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-slate-500">C1 Subtotal</span>
              <span className="font-medium">${subtotal.toLocaleString()}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">C1 HST</span>
              <span className="font-medium">${tax.toLocaleString()}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">C1 Contract</span>
              <span className="font-bold">${contractTotal.toLocaleString()}</span>
            </div>
            {c2FramesTotal > 0 && (
              <div className="flex justify-between">
                <span className="text-slate-500">C2 Frames & Albums</span>
                <span className="font-medium">${c2FramesTotal.toLocaleString()}</span>
              </div>
            )}
            {c3ExtrasTotal > 0 && (
              <div className="flex justify-between">
                <span className="text-slate-500">C3 Extras</span>
                <span className="font-medium">${c3ExtrasTotal.toLocaleString()}</span>
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-slate-500">Paid</span>
              <span className="font-medium text-green-600">${totalPaid.toLocaleString()}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Balance</span>
              <span className={`font-bold ${balance > 0 ? 'text-red-600' : 'text-green-600'}`}>
                ${balance.toLocaleString()}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
