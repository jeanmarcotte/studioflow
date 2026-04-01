/**
 * Q06 — Forms
 *
 * @spec docs/QUADRANT-MAP-COUPLES.md
 * @status LOCKED
 * @updated 2026-04-01
 *
 * Data Sources:
 * - couple_milestones (m15, m24, m25)
 *
 * Sub-sections:
 * - Wedding Day Form row (m15_day_form_approved)
 * - Photo Order row (m24_photo_order_in)
 * - Video Order row (m25_video_order_in) — N/A for Photo Only
 *
 * Guards:
 * - Photo Only couples show Video Order as N/A
 */

'use client';

import Link from 'next/link';

export interface Q06FormsProps {
  dayFormApproved: boolean;
  photoOrderIn: boolean;
  videoOrderIn: boolean;
  packageType: string;
  coupleId: string;
}

interface FormRowProps {
  name: string;
  isComplete: boolean;
  href: string;
  isNA?: boolean;
}

function FormRow({ name, isComplete, href, isNA }: FormRowProps) {
  return (
    <div className="flex items-center px-5 py-4 border-b border-slate-200 last:border-b-0 hover:bg-slate-50 transition-colors">
      <div
        className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold mr-4 ${
          isNA
            ? 'bg-slate-100 border-2 border-slate-300 text-slate-400'
            : isComplete
            ? 'bg-green-100 border-2 border-green-500 text-green-600'
            : 'bg-slate-100 border-2 border-slate-300 text-slate-400'
        }`}
      >
        {isNA ? '\u2014' : isComplete ? '\u2713' : '\u25CB'}
      </div>
      <span className="flex-1 font-semibold text-sm">{name}</span>
      {isNA ? (
        <span className="text-xs text-slate-400">N/A</span>
      ) : isComplete ? (
        <Link
          href={href}
          className="text-sm text-teal-600 font-medium hover:bg-teal-50 px-3 py-1 rounded transition-colors"
        >
          View \u2192
        </Link>
      ) : (
        <span className="text-sm text-slate-400">Awaiting</span>
      )}
    </div>
  );
}

export function Q06Forms({ dayFormApproved, photoOrderIn, videoOrderIn, packageType, coupleId }: Q06FormsProps) {
  const isPhotoOnly = packageType === 'photo_only';

  return (
    <div className="bg-white rounded-xl border border-slate-200 mb-4">
      <div className="px-5 py-4 border-b border-slate-200 bg-slate-50">
        <h3 className="text-sm font-bold">Forms</h3>
      </div>
      <div>
        <FormRow name="Wedding Day Form" isComplete={dayFormApproved} href={`/client/wedding-day-form/${coupleId}`} />
        <FormRow name="Photo Order" isComplete={photoOrderIn} href={`/client/photo-order/${coupleId}`} />
        <FormRow name="Video Order" isComplete={videoOrderIn} href={`/client/video-order/${coupleId}`} isNA={isPhotoOnly} />
      </div>
    </div>
  );
}
