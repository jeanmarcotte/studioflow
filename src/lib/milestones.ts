export const MILESTONE_PHASES = [
  {
    id: 'booking',
    title: 'Booking & Onboarding',
    milestones: [
      { key: 'm01_lead_captured', label: 'Lead Captured' },
      { key: 'm02_consultation_booked', label: 'Consultation Booked' },
      { key: 'm03_consultation_done', label: 'Consultation Done' },
      { key: 'm04_contract_signed', label: 'Contract Signed' },
      { key: 'm05_deposit_received', label: 'Deposit Received' },
      { key: 'm15_day_form_approved', label: 'Day Form Approved' },
      { key: 'm16_staff_confirmed', label: 'Staff Confirmed' },
    ]
  },
  {
    id: 'engagement',
    title: 'Engagement',
    milestones: [
      { key: 'm06_eng_session_shot', label: 'Engagement Shot' },
      { key: 'm06_declined', label: 'Engagement Declined' },
      { key: 'm07_eng_photos_edited', label: 'Photos Edited' },
      { key: 'm08_eng_proofs_to_lab', label: 'Proofs to Lab' },
      { key: 'm09_eng_prints_picked_up', label: 'Prints Picked Up' },
      { key: 'm10_frame_sale_quote', label: 'Frame Sale Quoted' },
      { key: 'm11_frame_sale_complete', label: 'Frame Sale Complete' },
      { key: 'm12_eng_order_to_lab', label: 'Order to Lab' },
      { key: 'm13_eng_items_framed', label: 'Items Framed' },
      { key: 'm14_eng_items_picked_up', label: 'Items Picked Up' },
    ]
  },
  {
    id: 'production',
    title: 'Production',
    milestones: [
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
    ]
  },
  {
    id: 'delivery',
    title: 'Delivery & Close',
    milestones: [
      { key: 'm33_final_payment', label: 'Final Payment' },
      { key: 'm34_items_picked_up', label: 'Items Picked Up' },
      { key: 'm35_archived', label: 'Archived' },
      { key: 'm36_complete', label: 'Complete' },
    ]
  }
]

export function buildPhases(milestoneData: Record<string, boolean>) {
  return MILESTONE_PHASES.map(phase => ({
    ...phase,
    milestones: phase.milestones.map(m => ({
      ...m,
      completed: milestoneData[m.key] ?? false
    }))
  }))
}

export function countMilestones(milestoneData: Record<string, boolean>) {
  const total = MILESTONE_PHASES.reduce((acc, phase) => acc + phase.milestones.length, 0)
  const completed = Object.values(milestoneData).filter(Boolean).length
  return { total, completed }
}
