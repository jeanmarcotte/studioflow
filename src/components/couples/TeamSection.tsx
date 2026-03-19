'use client';

export interface TeamSectionProps {
  photo1: string | null;
  photo2: string | null;
  video1: string | null;
  assignmentStatus: string | null;
  numPhotographers: number;
  numVideographers: number;
}

export function TeamSection(props: TeamSectionProps) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5">
      <p className="text-slate-400">TeamSection placeholder</p>
    </div>
  );
}
