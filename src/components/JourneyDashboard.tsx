'use client';

interface Milestones {
  [key: string]: boolean | undefined;
}

interface MilestoneItem {
  key: string;
  label: string;
}

interface Quadrant {
  title: string;
  items: MilestoneItem[];
}

const QUADRANTS: Quadrant[] = [
  {
    title: 'Booking & Onboarding',
    items: [
      { key: 'm01_lead_captured', label: 'Lead Captured' },
      { key: 'm02_consultation_booked', label: 'Consultation Booked' },
      { key: 'm03_consultation_done', label: 'Consultation Done' },
      { key: 'm04_contract_signed', label: 'Contract Signed' },
      { key: 'm05_deposit_received', label: 'Deposit Received' },
      { key: 'm15_day_form_approved', label: 'Day Form Approved' },
      { key: 'm16_staff_confirmed', label: 'Staff Confirmed' },
    ],
  },
  {
    title: 'Engagement',
    items: [
      { key: 'm06_eng_session_shot', label: 'Engagement Shot' },
      { key: 'm07_eng_photos_edited', label: 'Photos Edited' },
      { key: 'm08_eng_proofs_to_lab', label: 'Proofs to Lab' },
      { key: 'm09_eng_prints_picked_up', label: 'Prints Picked Up' },
      { key: 'm10_frame_sale_quote', label: 'Frame Sale Quoted' },
      { key: 'm11_frame_sale_complete', label: 'Frame Sale Complete' },
      { key: 'm12_eng_order_to_lab', label: 'Order to Lab' },
      { key: 'm13_eng_items_framed', label: 'Items Framed' },
      { key: 'm14_eng_items_picked_up', label: 'Items Picked Up' },
    ],
  },
  {
    title: 'Production',
    items: [
      { key: 'm19_wedding_day', label: 'Wedding Day' },
      { key: 'm22_proofs_edited', label: 'Proofs Edited' },
      { key: 'm24_photo_order_in', label: 'Photo Order In' },
      { key: 'm25_video_order_in', label: 'Video Order In' },
      { key: 'm26_photo_order_to_lab', label: 'Photo Order to Lab' },
      { key: 'm27_video_long_form', label: 'Long Form Done' },
      { key: 'm28_recap_edited', label: 'Recap Edited' },
      { key: 'm29_lab_order_back', label: 'Lab Order Back' },
      { key: 'm30_hires_on_usb', label: 'Hi-Res on USB' },
      { key: 'm31_video_on_usb', label: 'Video on USB' },
      { key: 'm32_ready_at_studio', label: 'Ready at Studio' },
      { key: 'm20_files_backed_up', label: 'Files Backed Up' },
    ],
  },
  {
    title: 'Delivery & Close',
    items: [
      { key: 'm33_final_payment', label: 'Final Payment' },
      { key: 'm34_items_picked_up', label: 'Items Picked Up' },
      { key: 'm35_archived', label: 'Archived' },
      { key: 'm36_complete', label: 'Complete' },
    ],
  },
];

interface JourneyDashboardProps {
  milestones: Milestones | null;
}

export function JourneyDashboard({ milestones }: JourneyDashboardProps) {
  const ms = milestones || {};
  const engDeclined = !!ms.m06_declined;

  // Count totals across all quadrants
  let totalCompleted = 0;
  let totalItems = 0;

  const quadrantStats = QUADRANTS.map((q) => {
    let completed = 0;
    let total = 0;

    q.items.forEach((item) => {
      // If engagement declined, m06 counts as "resolved" (not pending)
      if (item.key === 'm06_eng_session_shot' && engDeclined) {
        completed++;
        total++;
        return;
      }
      total++;
      if (ms[item.key]) completed++;
    });

    totalCompleted += completed;
    totalItems += total;

    return { completed, total };
  });

  const percentage = totalItems > 0 ? Math.round((totalCompleted / totalItems) * 100) : 0;

  return (
    <div className="bg-white rounded-xl border border-slate-200 mb-4">
      {/* Light gray thin header */}
      <div className="px-5 py-4 border-b border-slate-200 bg-slate-50 flex justify-between items-center">
        <h3 className="text-sm font-bold">Client Journey</h3>
        <span className="text-sm text-slate-500">
          {percentage}% complete — {totalCompleted} of {totalItems} milestones
        </span>
      </div>

      <div className="p-5">
        {/* Master Progress Bar */}
        <div className="mb-5">
          <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
            <div
              className="h-full bg-teal-500 rounded-full transition-all duration-500"
              style={{ width: `${percentage}%` }}
            />
          </div>
        </div>

        {/* 2×2 Quadrant Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {QUADRANTS.map((quadrant, qi) => {
            const stats = quadrantStats[qi];
            const isComplete = stats.completed === stats.total;

            return (
              <div
                key={quadrant.title}
                className={`rounded-lg border border-slate-200 p-4 ${isComplete ? 'opacity-50' : ''}`}
              >
                {/* Quadrant Header */}
                <div className="flex justify-between items-center mb-2">
                  <h4 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">
                    {quadrant.title}
                  </h4>
                  <span className="text-xs text-gray-400">
                    {stats.completed} of {stats.total}
                  </span>
                </div>

                {/* Mini Progress Bar */}
                <div className="h-1 bg-gray-200 rounded-full overflow-hidden mb-3">
                  <div
                    className="h-full bg-teal-500 rounded-full transition-all duration-500"
                    style={{ width: stats.total > 0 ? `${(stats.completed / stats.total) * 100}%` : '0%' }}
                  />
                </div>

                {/* Checklist */}
                <div className="space-y-1.5">
                  {quadrant.items.map((item) => {
                    const isEngDeclined = item.key === 'm06_eng_session_shot' && engDeclined;
                    const isDone = isEngDeclined || !!ms[item.key];
                    const label = isEngDeclined ? 'Session Declined' : item.label;

                    return (
                      <div key={item.key} className="flex items-center gap-2">
                        {isDone ? (
                          <span className="text-teal-500 text-sm font-bold w-4 text-center">✓</span>
                        ) : (
                          <span className="text-gray-300 text-sm w-4 text-center">○</span>
                        )}
                        <span
                          className={`text-sm ${
                            isEngDeclined
                              ? 'text-gray-400 italic'
                              : isDone
                              ? 'text-gray-400 line-through'
                              : 'text-gray-700'
                          }`}
                        >
                          {label}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
