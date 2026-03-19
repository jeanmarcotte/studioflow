'use client';

export interface NotesSectionProps {
  coupleNotes: string | null;
  contractNotes: string | null;
  extrasNotes: string[];
  hasSocialMediaRestriction: boolean;
}

export function NotesSection({
  coupleNotes,
  contractNotes,
  extrasNotes,
  hasSocialMediaRestriction,
}: NotesSectionProps) {
  const hasAnyNotes = coupleNotes || contractNotes || extrasNotes.length > 0;

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5">
      {/* Header */}
      <h3 className="text-sm font-bold flex items-center gap-2 mb-4">
        📝 Notes
      </h3>

      {/* Social Media Warning */}
      {hasSocialMediaRestriction && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700 mb-3">
          <strong>⚠️ NO SOCIAL MEDIA</strong><br />
          Engagement & Wedding photos password protected!
        </div>
      )}

      {/* Notes Content */}
      {hasAnyNotes ? (
        <div className="space-y-3">
          {contractNotes && (
            <div className="p-3 bg-slate-50 rounded-lg text-sm text-slate-600">
              {contractNotes}
            </div>
          )}
          {coupleNotes && (
            <div className="p-3 bg-slate-50 rounded-lg text-sm text-slate-600">
              {coupleNotes}
            </div>
          )}
          {extrasNotes.map((note, idx) => (
            <div key={idx} className="p-3 bg-slate-50 rounded-lg text-sm text-slate-600">
              {note}
            </div>
          ))}
        </div>
      ) : (
        <p className="text-slate-400 text-sm">No notes</p>
      )}
    </div>
  );
}
