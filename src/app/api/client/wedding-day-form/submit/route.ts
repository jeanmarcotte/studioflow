import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { sendFormNotification, sendTeamWeddingDayNotification } from '@/lib/email'

function getServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const supabase = getServiceClient()

    if (!body.couple_id) {
      return NextResponse.json({ success: false, error: 'couple_id is required' }, { status: 400 })
    }

    // Check if form already exists for this couple
    const { data: existing } = await supabase
      .from('wedding_day_forms')
      .select('id')
      .eq('couple_id', body.couple_id)
      .single()

    const formData = {
      couple_id: body.couple_id,
      // Emergency Contacts
      emergency_contact_1_name: body.emergency_contact_1_name || null,
      emergency_contact_1_phone: body.emergency_contact_1_phone || null,
      emergency_contact_2_name: body.emergency_contact_2_name || null,
      emergency_contact_2_phone: body.emergency_contact_2_phone || null,
      // Groom Prep
      groom_start_time: body.groom_start_time || null,
      groom_finish_time: body.groom_finish_time || null,
      groom_address: body.groom_address || null,
      groom_city: body.groom_city || null,
      groom_intersection: body.groom_intersection || null,
      groom_phone: body.groom_phone || null,
      groom_directions: body.groom_directions || null,
      // Bride Prep
      bride_start_time: body.bride_start_time || null,
      bride_finish_time: body.bride_finish_time || null,
      bride_address: body.bride_address || null,
      bride_city: body.bride_city || null,
      bride_intersection: body.bride_intersection || null,
      bride_phone: body.bride_phone || null,
      bride_directions: body.bride_directions || null,
      // Ceremony
      ceremony_location_name: body.ceremony_location_name || null,
      ceremony_first_look: body.ceremony_first_look ?? false,
      ceremony_photo_arrival_time: body.ceremony_photo_arrival_time || null,
      ceremony_start_time: body.ceremony_start_time || null,
      ceremony_finish_time: body.ceremony_finish_time || null,
      ceremony_address: body.ceremony_address || null,
      ceremony_city: body.ceremony_city || null,
      ceremony_intersection: body.ceremony_intersection || null,
      ceremony_directions: body.ceremony_directions || null,
      // Park/Photos
      park_name: body.park_name || null,
      park_permit_obtained: body.park_permit_obtained ?? false,
      park_start_time: body.park_start_time || null,
      park_finish_time: body.park_finish_time || null,
      park_address: body.park_address || null,
      park_city: body.park_city || null,
      park_intersection: body.park_intersection || null,
      park_directions: body.park_directions || null,
      // Extra Location
      extra_location_name: body.extra_location_name || null,
      extra_start_time: body.extra_start_time || null,
      extra_finish_time: body.extra_finish_time || null,
      extra_address: body.extra_address || null,
      extra_city: body.extra_city || null,
      extra_intersection: body.extra_intersection || null,
      extra_directions: body.extra_directions || null,
      extra_location_notes: body.extra_location_notes || null,
      // First Look Location
      first_look_location_name: body.first_look_location_name || null,
      first_look_time: body.first_look_time || null,
      first_look_address: body.first_look_address || null,
      first_look_city: body.first_look_city || null,
      // Reception
      reception_venue_name: body.reception_venue_name || null,
      reception_start_time: body.reception_start_time || null,
      reception_finish_time: body.reception_finish_time || null,
      reception_address: body.reception_address || null,
      reception_city: body.reception_city || null,
      reception_intersection: body.reception_intersection || null,
      reception_directions: body.reception_directions || null,
      // Drive Times
      drive_time_groom_to_bride: body.drive_time_groom_to_bride ?? null,
      drive_time_bride_to_ceremony: body.drive_time_bride_to_ceremony ?? null,
      drive_time_ceremony_to_park: body.drive_time_ceremony_to_park ?? null,
      drive_time_park_to_reception: body.drive_time_park_to_reception ?? null,
      drive_time_bride_to_first_look: body.drive_time_bride_to_first_look ?? null,
      drive_time_first_look_to_park: body.drive_time_first_look_to_park ?? null,
      drive_time_park_to_ceremony: body.drive_time_park_to_ceremony ?? null,
      drive_time_ceremony_to_reception: body.drive_time_ceremony_to_reception ?? null,
      // Contract Info
      ceremony_begins_at: body.ceremony_begins_at || null,
      hours_in_contract: body.hours_in_contract ?? null,
      photo_video_end_time: body.photo_video_end_time || null,
      venue_arrival_time: body.venue_arrival_time || null,
      // Vendors
      vendor_wedding_planner: body.vendor_wedding_planner || null,
      vendor_wedding_planner_instagram: body.vendor_wedding_planner_instagram || null,
      vendor_officiant: body.vendor_officiant || null,
      vendor_officiant_instagram: body.vendor_officiant_instagram || null,
      vendor_makeup: body.vendor_makeup || null,
      vendor_makeup_instagram: body.vendor_makeup_instagram || null,
      vendor_hair: body.vendor_hair || null,
      vendor_hair_instagram: body.vendor_hair_instagram || null,
      vendor_floral: body.vendor_floral || null,
      vendor_floral_instagram: body.vendor_floral_instagram || null,
      vendor_event_design: body.vendor_event_design || null,
      vendor_event_design_instagram: body.vendor_event_design_instagram || null,
      vendor_dj_mc: body.vendor_dj_mc || null,
      vendor_dj_mc_instagram: body.vendor_dj_mc_instagram || null,
      vendor_transportation: body.vendor_transportation || null,
      vendor_transportation_instagram: body.vendor_transportation_instagram || null,
      // Venue Contact
      venue_contact_name: body.venue_contact_name || null,
      venue_contact_phone: body.venue_contact_phone || null,
      venue_contact_email: body.venue_contact_email || null,
      // Couple Social
      couple_instagram: body.couple_instagram || null,
      wedding_hashtag: body.wedding_hashtag || null,
      // Inspiration
      inspiration_link_1: body.inspiration_link_1 || null,
      inspiration_link_2: body.inspiration_link_2 || null,
      inspiration_link_3: body.inspiration_link_3 || null,
      inspiration_link_4: body.inspiration_link_4 || null,
      inspiration_link_5: body.inspiration_link_5 || null,
      // First Look
      has_first_look: body.has_first_look ?? null,
      park_same_as_first_look: body.park_same_as_first_look ?? false,
      reception_same_as_first_look: body.reception_same_as_first_look ?? false,
      // General Info
      bridal_party_count: body.bridal_party_count ?? null,
      parent_info: body.parent_info || null,
      honeymoon_details: body.honeymoon_details || null,
      additional_notes: body.additional_notes || null,
      final_notes: body.final_notes || null,
    }

    if (existing) {
      // Update existing form
      const { data, error } = await supabase
        .from('wedding_day_forms')
        .update(formData)
        .eq('id', existing.id)
        .select('id')
        .single()

      if (error) {
        console.error('[POST /api/client/wedding-day-form/submit] Update failed:', error)
        return NextResponse.json({ success: false, error: error.message }, { status: 500 })
      }

      // Send email notification (non-blocking)
      const [{ data: couple }, { data: contract }] = await Promise.all([
        supabase.from('couples').select('couple_name, wedding_date, package_type').eq('id', body.couple_id).single(),
        supabase.from('contracts').select('start_time, end_time').eq('couple_id', body.couple_id).single(),
      ])

      if (couple) {
        sendFormNotification({
          formType: 'wedding-day',
          coupleName: couple.couple_name,
          weddingDate: couple.wedding_date,
        }).catch(err => console.error('Email notification failed:', err))

        // Send team notification with full schedule (non-blocking)
        sendTeamWeddingDayNotification({
          coupleId: body.couple_id,
          coupleName: couple.couple_name,
          weddingDate: couple.wedding_date,
          packageType: couple.package_type ?? null,
          form: formData,
          contract: contract ?? null,
        }).catch(err => console.error('Team notification failed:', err))
      }

      return NextResponse.json({ success: true, id: data.id })
    } else {
      // Insert new form (trigger will set m15_day_form_approved)
      const { data, error } = await supabase
        .from('wedding_day_forms')
        .insert(formData)
        .select('id')
        .single()

      if (error) {
        console.error('[POST /api/client/wedding-day-form/submit] Insert failed:', error)
        return NextResponse.json({ success: false, error: error.message }, { status: 500 })
      }

      // Send email notification (non-blocking)
      const [{ data: couple }, { data: contract }] = await Promise.all([
        supabase.from('couples').select('couple_name, wedding_date, package_type').eq('id', body.couple_id).single(),
        supabase.from('contracts').select('start_time, end_time').eq('couple_id', body.couple_id).single(),
      ])

      if (couple) {
        sendFormNotification({
          formType: 'wedding-day',
          coupleName: couple.couple_name,
          weddingDate: couple.wedding_date,
        }).catch(err => console.error('Email notification failed:', err))

        // Send team notification with full schedule (non-blocking)
        sendTeamWeddingDayNotification({
          coupleId: body.couple_id,
          coupleName: couple.couple_name,
          weddingDate: couple.wedding_date,
          packageType: couple.package_type ?? null,
          form: formData,
          contract: contract ?? null,
        }).catch(err => console.error('Team notification failed:', err))
      }

      return NextResponse.json({ success: true, id: data.id })
    }
  } catch (err) {
    console.error('[POST /api/client/wedding-day-form/submit] Error:', err)
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 })
  }
}
