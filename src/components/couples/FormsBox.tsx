'use client';

export interface FormsBoxProps {
  dayFormApproved: boolean;
  photoOrderIn: boolean;
  videoOrderIn: boolean;
  packageType: string;
  coupleId: string;
}

export function FormsBox(props: FormsBoxProps) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 mb-4">
      <p className="text-slate-400 p-5">FormsBox placeholder</p>
    </div>
  );
}
