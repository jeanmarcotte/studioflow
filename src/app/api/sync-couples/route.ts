import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// Server-side Supabase client with service role key (bypasses RLS)
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

interface CoupleInput {
  coupleName: string
  weddingDate: string
  contractTotal?: number
  leadSource?: string
  bookedDate?: string
}

export async function POST(req: NextRequest) {
  const { couples } = (await req.json()) as { couples: CoupleInput[] }

  if (!couples || !Array.isArray(couples)) {
    return NextResponse.json({ error: 'Missing couples array' }, { status: 400 })
  }

  const results: { coupleName: string; id: string | null; created: boolean; error?: string }[] = []

  for (const c of couples) {
    const parts = c.coupleName.split(' & ')
    const brideFullName = (parts[0] || '').trim() || ''
    const groomFullName = parts.length > 1 ? (parts[1] || '').trim() : ''
    const brideFirst = brideFullName.split(' ')[0] || null
    const brideLast = brideFullName.split(' ').slice(1).join(' ') || null
    const groomFirst = groomFullName.split(' ')[0] || null
    const groomLast = groomFullName.split(' ').slice(1).join(' ') || null

    // Try exact match on couple_name + wedding_date
    const { data: exact } = await supabaseAdmin
      .from('couples')
      .select('id, is_cancelled')
      .eq('wedding_date', c.weddingDate)
      .ilike('couple_name', c.coupleName)
      .limit(1)

    if (exact && exact.length > 0) {
      const match = exact[0]
      if (match.is_cancelled) {
        await supabaseAdmin.from('couples')
          .update({ is_cancelled: false, booked_date: c.bookedDate, contract_total: c.contractTotal })
          .eq('id', match.id)
      }
      results.push({ coupleName: c.coupleName, id: match.id, created: false })
      continue
    }

    // Fallback: partial match on bride first name + date
    if (brideFirst) {
      const firstName = brideFirst
      const { data: partial } = await supabaseAdmin
        .from('couples')
        .select('id')
        .eq('wedding_date', c.weddingDate)
        .ilike('couple_name', `${firstName}%`)
        .limit(1)

      if (partial && partial.length > 0) {
        results.push({ coupleName: c.coupleName, id: partial[0].id, created: false })
        continue
      }
    }

    // No match — create new record
    const weddingYear = c.weddingDate ? new Date(c.weddingDate + 'T12:00:00').getFullYear() : null
    const { data: inserted, error } = await supabaseAdmin
      .from('couples')
      .insert({
        couple_name: c.coupleName,
        bride_first_name: brideFirst,
        bride_last_name: brideLast,
        groom_first_name: groomFirst,
        groom_last_name: groomLast,
        wedding_date: c.weddingDate,
        wedding_year: weddingYear,
        contract_total: c.contractTotal || null,
        booked_date: c.bookedDate || new Date().toISOString().split('T')[0],
        lead_source: c.leadSource || null,
      })
      .select('id')
      .single()

    if (error) {
      results.push({ coupleName: c.coupleName, id: null, created: false, error: error.message })
    } else {
      results.push({ coupleName: c.coupleName, id: inserted.id, created: true })
    }
  }

  return NextResponse.json({ results })
}
