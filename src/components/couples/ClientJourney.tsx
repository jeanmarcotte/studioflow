'use client';

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

export function ClientJourney({ milestones, weddingDate }: ClientJourneyProps) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5 mb-4">
      <p className="text-slate-400">ClientJourney placeholder</p>
    </div>
  );
}
