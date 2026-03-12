import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

function getServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

export async function GET() {
  const supabase = getServiceClient()
  const { data, error } = await supabase
    .from('ballots')
    .select('id,bride_first_name,bride_last_name,groom_first_name,groom_last_name,wedding_date,venue_name,show_id,created_at,appointment_date,service_needs,has_videographer')
    .eq('status', 'appointment')
    .order('created_at', { ascending: false })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // Resolve coupleIds from the couples table for each ballot
  const enriched = await Promise.all(
    (data || []).map(async (b) => {
      const bride = `${b.bride_first_name} ${b.bride_last_name}`.trim()
      const groom = b.groom_first_name ? b.groom_first_name.trim() : ''
      const coupleName = groom ? `${bride} & ${groom}` : bride

      let coupleId: string | null = null

      // Try exact couple_name + wedding_date match
      if (b.wedding_date) {
        const { data: exact } = await supabase
          .from('couples')
          .select('id')
          .eq('wedding_date', b.wedding_date)
          .ilike('couple_name', coupleName)
          .limit(1)

        if (exact && exact.length > 0) {
          coupleId = exact[0].id
        }
      }

      // Fallback: partial match on bride first name
      if (!coupleId && b.bride_first_name) {
        const { data: partial } = await supabase
          .from('couples')
          .select('id')
          .ilike('couple_name', `${b.bride_first_name.trim()}%`)
          .limit(1)

        if (partial && partial.length > 0) {
          coupleId = partial[0].id
        }
      }

      // If no couple record exists, create one as 'lead' so we can link to quote builder
      if (!coupleId && b.wedding_date) {
        const brideFirst = b.bride_first_name?.trim() || null
        const brideLast = b.bride_last_name?.trim() || null
        const groomFirst = b.groom_first_name?.trim() || null
        const groomLast = b.groom_last_name?.trim() || null
        const weddingYear = new Date(b.wedding_date + 'T12:00:00').getFullYear()

        const { data: inserted } = await supabase
          .from('couples')
          .insert({
            couple_name: coupleName,
            bride_first_name: brideFirst,
            bride_last_name: brideLast,
            groom_first_name: groomFirst,
            groom_last_name: groomLast,
            wedding_date: b.wedding_date,
            wedding_year: weddingYear,
            status: 'lead',
            lead_source: b.show_id || null,
          })
          .select('id')
          .single()

        if (inserted) {
          coupleId = inserted.id
        }
      }

      return { ...b, coupleId }
    })
  )

  return NextResponse.json(enriched)
}
