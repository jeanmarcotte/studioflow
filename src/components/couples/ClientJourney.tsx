'use client';

import { parseISO, differenceInDays } from 'date-fns';

export interface MilestoneData {
  m01_lead_captured: boolean;
  m02_consultation_booked: boolean;
  m03_consultation_done: boolean;
  m04_contract_signed: boolean;
  m05_deposit_received: boolean;
  m06_eng_session_shot: boolean;
  m07_eng_photos_edited: boolean;
  m08_eng_proofs_to_lab: boolean;
  m09_eng_prints_picked_up: boolean;
  m10_frame_sale_quote: boolean;
  m11_sale_results_pdf: boolean;
  m12_eng_order_to_lab: boolean;
  m13_eng_items_framed: boolean;
  m14_eng_items_picked_up: boolean;
  m15_day_form_approved: boolean;
  m16_staff_confirmed: boolean;
  m19_wedding_day: boolean;
  m20_files_backed_up: boolean;
  m22_proofs_edited: boolean;
  m24_photo_order_in: boolean;
  m25_video_order_in: boolean;
  m26_photo_order_to_lab: boolean;
  m27_video_long_form: boolean;
  m28_recap_edited: boolean;
  m29_lab_order_back: boolean;
  m30_hires_on_usb: boolean;
  m31_video_on_usb: boolean;
  m32_ready_at_studio: boolean;
  m33_final_payment: boolean;
  m34_items_picked_up: boolean;
  m35_archived: boolean;
  m36_complete: boolean;
}

export interface ClientJourneyProps {
  milestones: MilestoneData | null;
  weddingDate: string;
}

type MilestoneKey = keyof MilestoneData;

interface MilestoneRow {
  label: string;
  keys: MilestoneKey[];
}

const ROWS: MilestoneRow[] = [
  {
    label: 'PRE-WEDDING (M01–M09)',
    keys: [
      'm01_lead_captured', 'm02_consultation_booked', 'm03_consultation_done',
      'm04_contract_signed', 'm05_deposit_received', 'm06_eng_session_shot',
      'm07_eng_photos_edited', 'm08_eng_proofs_to_lab', 'm09_eng_prints_picked_up',
    ],
  },
  {
    label: 'ENG SALES → PREP (M10–M16)',
    keys: [
      'm10_frame_sale_quote', 'm11_sale_results_pdf', 'm12_eng_order_to_lab',
      'm13_eng_items_framed', 'm14_eng_items_picked_up', 'm15_day_form_approved',
      'm16_staff_confirmed',
    ],
  },
  {
    label: 'WEDDING → POST (M19–M28)',
    keys: [
      'm19_wedding_day', 'm20_files_backed_up', 'm22_proofs_edited',
      'm24_photo_order_in', 'm25_video_order_in', 'm26_photo_order_to_lab',
      'm27_video_long_form', 'm28_recap_edited',
    ],
  },
  {
    label: 'DELIVERY → COMPLETE (M29–M36)',
    keys: [
      'm29_lab_order_back', 'm30_hires_on_usb', 'm31_video_on_usb',
      'm32_ready_at_studio', 'm33_final_payment', 'm34_items_picked_up',
      'm35_archived', 'm36_complete',
    ],
  },
];

const ALL_KEYS: MilestoneKey[] = ROWS.flatMap((r) => r.keys);

function extractNumber(key: string): string {
  const match = key.match(/^m(\d+)/);
  return match ? match[1] : '?';
}

function getUrgentCount(milestones: MilestoneData, weddingDate: string): number {
  if (!weddingDate) return 0;
  const daysUntil = differenceInDays(parseISO(weddingDate), new Date());
  let urgent = 0;

  // Pre-wedding milestones become urgent within 30 days of wedding
  if (daysUntil <= 30 && daysUntil > 0) {
    if (!milestones.m15_day_form_approved) urgent++;
    if (!milestones.m16_staff_confirmed) urgent++;
  }

  // Post-wedding milestones become urgent 60+ days after wedding
  if (daysUntil < -60) {
    if (!milestones.m22_proofs_edited) urgent++;
    if (!milestones.m24_photo_order_in) urgent++;
  }

  return urgent;
}

export function ClientJourney({ milestones, weddingDate }: ClientJourneyProps) {
  if (!milestones) {
    return (
      <div className="bg-white rounded-xl border border-slate-200 p-5 mb-4">
        <p className="text-slate-400">No milestone data available</p>
      </div>
    );
  }

  const completed = ALL_KEYS.filter((k) => milestones[k]).length;
  const total = ALL_KEYS.length;
  const remaining = total - completed;
  const pct = Math.round((completed / total) * 100);
  const urgent = getUrgentCount(milestones, weddingDate);

  const pctColor = pct > 90 ? 'bg-green-100 text-green-700' : pct > 50 ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-600';

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5 mb-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-lg font-semibold text-slate-800">🎯 Client Journey</h2>
        <span className={`px-3 py-1 rounded-full text-xs font-semibold ${pctColor}`}>
          {pct}%
        </span>
      </div>

      {/* Stats Row */}
      <div className="text-sm text-slate-500 mb-3">
        ✅ {completed} complete · 🚨 {urgent} urgent · ○ {remaining} remaining
      </div>

      {/* Progress Bar */}
      <div className="h-2 bg-slate-100 rounded-full mb-5 overflow-hidden">
        <div
          className="h-full bg-gradient-to-r from-green-500 to-teal-500 rounded-full transition-all duration-500"
          style={{ width: `${pct}%` }}
        />
      </div>

      {/* Milestone Rows */}
      <div className="flex flex-col gap-4">
        {ROWS.map((row) => (
          <div key={row.label}>
            <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
              {row.label}
            </div>
            <div className="flex flex-wrap gap-2">
              {row.keys.map((key) => {
                const done = milestones[key];
                const num = extractNumber(key);
                const isComplete = key === 'm36_complete' && done;

                return (
                  <div
                    key={key}
                    title={key.replace(/^m\d+_/, '').replace(/_/g, ' ')}
                    className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold transition-colors ${
                      done
                        ? 'bg-green-500 text-white'
                        : 'bg-slate-100 border border-slate-300 text-slate-400'
                    }`}
                  >
                    {isComplete ? '🎊' : done ? '✓' : num}
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
