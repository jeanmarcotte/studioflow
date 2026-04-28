export interface HubCouple {
  id: string
  couple_name: string
  bride_first_name: string | null
  groom_first_name: string | null
  wedding_date: string | null
  phase: string
  is_cancelled: boolean
}

export interface HubContract {
  package_name: string | null
  reception_venue: string | null
}

export interface HubMilestones {
  m01_lead_captured: boolean
  m02_consultation_booked: boolean
  m03_consultation_done: boolean
  m04_contract_signed: boolean
  m05_deposit_received: boolean
  m06_eng_session_shot: boolean
  m06_declined: boolean
  m07_eng_photos_edited: boolean
  m08_eng_proofs_to_lab: boolean
  m09_eng_prints_picked_up: boolean
  m10_frame_sale_quote: boolean
  m11_frame_sale_complete: boolean
  m12_eng_order_to_lab: boolean
  m13_eng_items_framed: boolean
  m14_eng_items_picked_up: boolean
  m15_day_form_approved: boolean
  m16_staff_confirmed: boolean
  m19_wedding_day: boolean
  m20_files_backed_up: boolean
  m22_proofs_edited: boolean
  m24_photo_order_in: boolean
  m25_video_order_in: boolean
  m26_photo_order_to_lab: boolean
  m27_video_long_form: boolean
  m28_recap_edited: boolean
  m29_lab_order_back: boolean
  m30_hires_on_usb: boolean
  m31_video_on_usb: boolean
  m32_ready_at_studio: boolean
  m33_final_payment: boolean
  m34_items_picked_up: boolean
  m35_archived: boolean
  m36_complete: boolean
}

export interface PhotoJob {
  id: string
  couple_id: string
  job_type: string
  category: string
  description: string | null
  photos_taken: number | null
  photos_selected: number | null
  edited_so_far: number | null
  total_proofs: number | null
  status: string
  vendor: string | null
  order_date: string | null
  at_lab_date: string | null
  pickup_date: string | null
  completed_date: string | null
  assigned_to: string | null
  notes: string | null
}

export interface VideoJob {
  id: string
  couple_id: string
  job_type: string
  status: string
  hours_raw: number | null
  assigned_to: string | null
  due_date: string | null
  completed_date: string | null
  ceremony_done: boolean
  reception_done: boolean
  park_done: boolean
  prereception_done: boolean
  groom_done: boolean
  bride_done: boolean
  proxies_run: boolean
  video_form: boolean
  notes: string | null
}

export interface CommLogEntry {
  id: string
  couple_id: string
  job_id: string | null
  video_job_id: string | null
  type: string
  direction: string
  channel: string
  subject: string | null
  body: string | null
  logged_by: string
  logged_at: string
}

export const MILESTONE_NAMES: Record<string, string> = {
  m01_lead_captured: 'Lead Captured',
  m02_consultation_booked: 'Consultation Booked',
  m03_consultation_done: 'Consultation Done',
  m04_contract_signed: 'Contract Signed',
  m05_deposit_received: 'Deposit Received',
  m06_eng_session_shot: 'Eng Session Shot',
  m06_declined: 'Eng Declined',
  m07_eng_photos_edited: 'Eng Photos Edited',
  m08_eng_proofs_to_lab: 'Eng Proofs to Lab',
  m09_eng_prints_picked_up: 'Eng Prints at Studio',
  m10_frame_sale_quote: 'Frame Sale Quoted',
  m11_frame_sale_complete: 'Frame Sale Complete',
  m12_eng_order_to_lab: 'Eng Order to Lab',
  m13_eng_items_framed: 'Eng Items Framed',
  m14_eng_items_picked_up: 'Eng Items Picked Up',
  m15_day_form_approved: 'Day Form Approved',
  m16_staff_confirmed: 'Staff Confirmed',
  m19_wedding_day: 'Wedding Day',
  m20_files_backed_up: 'Files Backed Up',
  m22_proofs_edited: 'Proofs Edited',
  m24_photo_order_in: 'Photo Order In',
  m25_video_order_in: 'Video Order In',
  m26_photo_order_to_lab: 'Photo Order to Lab',
  m27_video_long_form: 'Video Long Form',
  m28_recap_edited: 'Recap Edited',
  m29_lab_order_back: 'Lab Order Back',
  m30_hires_on_usb: 'Hi-Res Delivered',
  m31_video_on_usb: 'Video Delivered',
  m32_ready_at_studio: 'Ready at Studio',
  m33_final_payment: 'Final Payment',
  m34_items_picked_up: 'Items Picked Up',
  m35_archived: 'Archived',
  m36_complete: 'Complete',
}

export const ALL_MILESTONE_KEYS = Object.keys(MILESTONE_NAMES)

export const PHOTO_STATUSES = ['in_progress', 'completed', 'waiting_approval', 'on_hold', 'at_lab', 'at_studio', 'picked_up'] as const
export const VIDEO_STATUSES = ['not_started', 'in_progress', 'video_proofs_out', 'complete'] as const

export const STATUS_COLORS: Record<string, string> = {
  ready_to_start: 'bg-gray-100 text-gray-700',
  in_progress: 'bg-blue-100 text-blue-700',
  completed: 'bg-green-100 text-green-700',
  complete: 'bg-green-100 text-green-700',
  waiting_approval: 'bg-amber-100 text-amber-700',
  on_hold: 'bg-gray-100 text-gray-700',
  at_lab: 'bg-indigo-100 text-indigo-700',
  at_studio: 'bg-teal-100 text-teal-700',
  picked_up: 'bg-green-100 text-green-700',
  not_started: 'bg-gray-100 text-gray-700',
  video_proofs_out: 'bg-amber-100 text-amber-700',
}
