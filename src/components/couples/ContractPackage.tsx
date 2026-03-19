'use client';

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
  totalPaid: number;
  balance: number;
  numGuests: number | null;
  ceremonyLocation: string | null;
  receptionVenue: string | null;
  isArchived: boolean;
}

export function ContractPackage(props: ContractPackageProps) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 mb-4">
      <p className="text-slate-400 p-5">ContractPackage placeholder — Signed: {props.signedDate}</p>
    </div>
  );
}
