/**
 * Q10 — Your Package (Contract As Signed)
 *
 * @spec docs/QUADRANT-MAP-COUPLES.md
 * @status LOCKED
 * @updated 2026-04-01
 *
 * Data Sources:
 * - contracts table — all fields printed as-is
 *
 * Sub-sections:
 * - 4-column grid: COVERAGE | ENGAGEMENT | TEAM | FINANCIALS
 * - FINANCIALS shows C1/C2/C3 prefixes
 *
 * Critical Rules:
 * - All data directly from contracts table — no calculation
 *
 * Guards:
 * - Null check on numGuests, engagementLocation
 */

'use client';

import { format, parseISO } from 'date-fns';

export interface Q10ContractPackageProps {
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

export function Q10ContractPackage({
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
}: Q10ContractPackageProps) {
  const locationCount = [locGroom, locBride, locCeremony, locPark, locReception].filter(Boolean).length;
  const grandTotal = contractTotal + extrasTotal;
  const formattedSignedDate = signedDate ? format(parseISO(signedDate), 'MMM d, yyyy') : 'Unknown';

  return (
    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden mb-4">
      {/* Header */}
      <div className="bg-gradient-to-r from-teal-700 to-teal-800 text-white px-5 py-4 flex justify-between items-center">
        <h3 className="font-semibold">Contract Package — As Signed</h3>
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
              <span className="font-medium">{dronePhotography ? '\u2713 Yes' : 'No'}</span>
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
              <span className="font-medium">{engagementSession ? '\u2713 Included' : 'Not included'}</span>
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
              <span className="text-slate-500">C1 Contract</span>
              <span className="font-medium">${contractTotal.toLocaleString()}</span>
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
            <div className="flex justify-between border-t border-slate-200 pt-2 mt-2">
              <span className="text-slate-500">Total</span>
              <span className="font-bold">${(contractTotal + c2FramesTotal + c3ExtrasTotal).toLocaleString()}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
