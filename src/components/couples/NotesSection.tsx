'use client';

export interface NotesSectionProps {
  coupleNotes: string | null;
  contractNotes: string | null;
  extrasNotes: string[];
  hasSocialMediaRestriction: boolean;
}

export function NotesSection(props: NotesSectionProps) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5">
      <p className="text-slate-400">NotesSection placeholder</p>
    </div>
  );
}
