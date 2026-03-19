'use client';

export interface TeamSectionProps {
  photo1: string | null;
  photo2: string | null;
  video1: string | null;
  assignmentStatus: string | null;
  numPhotographers: number;
  numVideographers: number;
}

export function TeamSection({
  photo1,
  photo2,
  video1,
  assignmentStatus,
  numPhotographers,
  numVideographers,
}: TeamSectionProps) {
  const isConfirmed = assignmentStatus === 'confirmed';

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5">
      {/* Header */}
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-sm font-bold flex items-center gap-2">
          👥 Team
        </h3>
        {isConfirmed && (
          <span className="text-xs font-semibold px-2 py-1 rounded bg-green-100 text-green-700">
            CONFIRMED
          </span>
        )}
      </div>

      {/* Team Grid */}
      <div className="space-y-3">
        <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg">
          <span className="text-xs text-slate-500 uppercase font-semibold w-24">Photographer</span>
          <span className="font-semibold">{photo1 || 'Not assigned'}</span>
        </div>

        {photo2 && (
          <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg">
            <span className="text-xs text-slate-500 uppercase font-semibold w-24">Photo 2</span>
            <span className="font-semibold">{photo2}</span>
          </div>
        )}

        {numVideographers > 0 && (
          <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg">
            <span className="text-xs text-slate-500 uppercase font-semibold w-24">Videographer</span>
            <span className="font-semibold">{video1 || 'Not assigned'}</span>
          </div>
        )}
      </div>

      {/* Footer Note */}
      <div className="mt-4 p-3 bg-blue-50 rounded-lg text-xs text-blue-700">
        Contract: {numPhotographers} photographer{numPhotographers !== 1 ? 's' : ''} + {numVideographers} videographer{numVideographers !== 1 ? 's' : ''}
      </div>
    </div>
  );
}
