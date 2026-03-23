'use client';

interface ClientJourneyProps {
  milestones: Record<string, boolean> | null;
  weddingDate: string;
}

const MILESTONE_CONFIG = [
  // PRE-WEDDING (9 items)
  { key: 'm01_lead_captured', label: 'Lead Captured', section: 'PRE-WEDDING' },
  { key: 'm02_consultation_booked', label: 'Consultation Booked', section: 'PRE-WEDDING' },
  { key: 'm03_consultation_done', label: 'Consultation Done', section: 'PRE-WEDDING' },
  { key: 'm04_contract_signed', label: 'Contract Signed', section: 'PRE-WEDDING' },
  { key: 'm05_deposit_received', label: 'Deposit Received', section: 'PRE-WEDDING' },
  { key: 'm06_eng_session_shot', label: 'Eng Session Shot', section: 'PRE-WEDDING' },
  { key: 'm07_eng_photos_edited', label: 'Eng Photos Edited', section: 'PRE-WEDDING' },
  { key: 'm08_eng_proofs_to_lab', label: 'Eng Proofs to Lab', section: 'PRE-WEDDING' },
  { key: 'm09_eng_prints_picked_up', label: 'Eng Prints Picked Up', section: 'PRE-WEDDING' },

  // ENG SALES → WEDDING PREP (7 items)
  { key: 'm10_frame_sale_quote', label: 'Frame Sale Quote', section: 'ENG SALES → WEDDING PREP' },
  { key: 'm11_sale_results_pdf', label: 'Sale Results + PDF', section: 'ENG SALES → WEDDING PREP' },
  { key: 'm12_eng_order_to_lab', label: 'Eng Order to Lab', section: 'ENG SALES → WEDDING PREP' },
  { key: 'm13_eng_items_framed', label: 'Eng Items Framed', section: 'ENG SALES → WEDDING PREP' },
  { key: 'm14_eng_items_picked_up', label: 'Eng Items Picked Up', section: 'ENG SALES → WEDDING PREP' },
  { key: 'm15_day_form_approved', label: 'Day Form Approved', section: 'ENG SALES → WEDDING PREP', urgent: true },
  { key: 'm16_staff_confirmed', label: 'Staff Confirmed', section: 'ENG SALES → WEDDING PREP', urgent: true },

  // WEDDING → POST-PRODUCTION (7 items)
  { key: 'm19_wedding_day', label: 'Wedding Day ✓', section: 'WEDDING → POST-PRODUCTION' },
  { key: 'm20_files_backed_up', label: 'Files Backed Up', section: 'WEDDING → POST-PRODUCTION' },
  { key: 'm22_proofs_edited', label: 'Proofs Edited', section: 'WEDDING → POST-PRODUCTION' },
  { key: 'm24_photo_order_in', label: 'Photo Order In', section: 'WEDDING → POST-PRODUCTION' },
  { key: 'm25_video_order_in', label: 'Video Order In', section: 'WEDDING → POST-PRODUCTION' },
  { key: 'm26_photo_order_to_lab', label: 'Photo Order to Lab', section: 'WEDDING → POST-PRODUCTION' },
  { key: 'm27_video_long_form', label: 'Video Long Form', section: 'WEDDING → POST-PRODUCTION' },

  // DELIVERY → COMPLETE (9 items)
  { key: 'm28_recap_edited', label: 'Recap Edited', section: 'DELIVERY → COMPLETE' },
  { key: 'm29_lab_order_back', label: 'Lab Order Back', section: 'DELIVERY → COMPLETE' },
  { key: 'm30_hires_on_usb', label: 'Hi-Res on USB', section: 'DELIVERY → COMPLETE' },
  { key: 'm31_video_on_usb', label: 'Video on USB', section: 'DELIVERY → COMPLETE' },
  { key: 'm32_ready_at_studio', label: 'Ready at Studio', section: 'DELIVERY → COMPLETE' },
  { key: 'm33_final_payment', label: 'Final Payment', section: 'DELIVERY → COMPLETE' },
  { key: 'm34_items_picked_up', label: 'Items Picked Up', section: 'DELIVERY → COMPLETE' },
  { key: 'm35_archived', label: 'Archived', section: 'DELIVERY → COMPLETE' },
  { key: 'm36_complete', label: 'COMPLETE', section: 'DELIVERY → COMPLETE', isComplete: true },
];

export function ClientJourney({ milestones, weddingDate }: ClientJourneyProps) {
  const ms = milestones || {};

  const today = new Date();
  const wedding = weddingDate ? new Date(weddingDate) : null;
  const isPreWedding = wedding ? wedding > today : false;

  // Calculate stats
  const completed = MILESTONE_CONFIG.filter(m => ms[m.key] === true).length;
  const total = MILESTONE_CONFIG.length;
  const pending = total - completed;
  const percentage = Math.round((completed / total) * 100);

  // Count urgent items (pre-wedding milestones not done when wedding is within 14 days)
  const urgentCount = MILESTONE_CONFIG.filter(m =>
    m.urgent && !ms[m.key] && isPreWedding && wedding && (wedding.getTime() - today.getTime()) < 14 * 24 * 60 * 60 * 1000
  ).length;

  // Group milestones by section
  const sections = ['PRE-WEDDING', 'ENG SALES → WEDDING PREP', 'WEDDING → POST-PRODUCTION', 'DELIVERY → COMPLETE'];

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5 mb-4">
      {/* Header */}
      <div className="flex justify-between items-center mb-4">
        <h3 className="font-semibold text-slate-800">Client Journey</h3>
        <div className="flex items-center gap-3 text-sm">
          <span className="text-green-600">✅ {completed}</span>
          {urgentCount > 0 && <span className="text-red-500">🚨 {urgentCount} urgent</span>}
          <span className="text-slate-400">○ {pending}</span>
          <span className={`font-bold text-lg ${percentage >= 90 ? 'text-green-600' : percentage >= 50 ? 'text-amber-500' : 'text-slate-400'}`}>
            {percentage}%
          </span>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="h-2 bg-slate-100 rounded-full mb-6 overflow-hidden">
        <div
          className="h-full bg-gradient-to-r from-teal-500 to-teal-600 rounded-full transition-all duration-500"
          style={{ width: `${percentage}%` }}
        />
      </div>

      {/* Sections */}
      {sections.map(section => {
        const sectionMilestones = MILESTONE_CONFIG.filter(m => m.section === section);

        return (
          <div key={section} className="mb-6">
            <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-3">
              {section}
            </h4>
            <div className="grid grid-cols-8 gap-2">
              {sectionMilestones.map(milestone => {
                const isDone = ms[milestone.key] === true;
                const isUrgent = milestone.urgent && !isDone && isPreWedding && wedding && (wedding.getTime() - today.getTime()) < 14 * 24 * 60 * 60 * 1000;
                const isFinalComplete = milestone.isComplete && isDone;

                return (
                  <div key={milestone.key} className="flex flex-col items-center">
                    <div
                      className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-semibold transition-all ${
                        isFinalComplete
                          ? 'bg-gradient-to-br from-amber-100 to-amber-200 border-2 border-amber-400'
                          : isDone
                          ? 'bg-teal-500 text-white'
                          : isUrgent
                          ? 'bg-red-100 border-2 border-red-400 text-red-600'
                          : 'bg-slate-100 text-slate-400 border border-slate-200'
                      }`}
                    >
                      {isFinalComplete ? '🎊' : isDone ? '✓' : isUrgent ? '!' : '○'}
                    </div>
                    <span className={`text-xs mt-1.5 text-center leading-tight ${
                      isUrgent ? 'text-red-600 font-semibold' : isDone ? 'text-teal-700' : 'text-slate-500'
                    }`}>
                      {milestone.label}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
