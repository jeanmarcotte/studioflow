import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

function getServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

// Package team sizes — must match src/app/client/new-quote/page.tsx PACKAGES
const PACKAGE_TEAM: Record<string, { photographers: number; videographers: number }> = {
  bella:    { photographers: 2, videographers: 0 },
  eleganza: { photographers: 3, videographers: 0 },
  silver:   { photographers: 1, videographers: 1 },
  gold:     { photographers: 2, videographers: 1 },
  platinum: { photographers: 2, videographers: 1 },
  diamond:  { photographers: 2, videographers: 1 },
}

function resolveTeam(packageName: string | null, serviceNeeds: string | null) {
  // Try exact match on lowercase package name
  if (packageName) {
    const key = packageName.toLowerCase()
    if (PACKAGE_TEAM[key]) return PACKAGE_TEAM[key]
  }
  // Fallback: infer from service_needs
  if (serviceNeeds === 'photo_only') return { photographers: 2, videographers: 0 }
  if (serviceNeeds === 'photo_video') return { photographers: 2, videographers: 1 }
  return { photographers: 2, videographers: 0 }
}

export async function POST(request: Request) {
  try {
    const { quote_id } = await request.json()

    if (!quote_id) {
      return NextResponse.json({ error: 'quote_id is required' }, { status: 400 })
    }

    const supabase = getServiceClient()

    // 1. Fetch the client_quotes record
    const { data: quote, error: quoteErr } = await supabase
      .from('client_quotes')
      .select('*')
      .eq('id', quote_id)
      .single()

    if (quoteErr || !quote) {
      return NextResponse.json({ error: 'Quote not found' }, { status: 404 })
    }

    // Prevent double-conversion
    if (quote.status === 'converted') {
      return NextResponse.json({ error: 'Quote already converted to contract' }, { status: 409 })
    }

    const team = resolveTeam(quote.package_name, quote.service_needs)

    // 2. Insert into contracts table
    const { data: contract, error: contractErr } = await supabase
      .from('contracts')
      .insert({
        couple_id: quote.couple_id,
        bride_first_name: quote.bride_first_name || null,
        bride_last_name: quote.bride_last_name || null,
        groom_first_name: quote.groom_first_name || null,
        groom_last_name: quote.groom_last_name || null,
        email: quote.email || null,
        phone: quote.phone || null,
        groom_email: null,
        wedding_date: quote.wedding_date || null,
        start_time: quote.start_time || null,
        end_time: quote.end_time || null,
        ceremony_location: quote.ceremony_venue || null,
        reception_venue: quote.reception_venue || null,
        num_guests: quote.guest_count || null,
        num_photographers: team.photographers,
        num_videographers: team.videographers,
        lead_source_detail: quote.lead_source || null,
        engagement_session: true,
        engagement_location: quote.engagement_location || null,
        drone_photography: true,
        subtotal: quote.subtotal || 0,
        tax: quote.hst_amount || 0,
        total: quote.total || 0,
      })
      .select('id')
      .single()

    if (contractErr) {
      console.error('[POST /api/admin/contracts/from-quote] Contract insert failed:', contractErr)
      return NextResponse.json({ error: contractErr.message }, { status: 500 })
    }

    // 3. Insert installments from JSONB
    const installments = Array.isArray(quote.installments) ? quote.installments : []
    if (installments.length > 0 && contract) {
      const rows = installments.map((inst: any, idx: number) => ({
        contract_id: contract.id,
        installment_number: idx + 1,
        due_description: inst.label || inst.due_description || `Installment ${idx + 1}`,
        amount: Number(inst.amount) || 0,
        due_date: inst.due_date || null,
      }))

      const { error: instErr } = await supabase
        .from('contract_installments')
        .insert(rows)

      if (instErr) {
        console.error('[POST /api/admin/contracts/from-quote] Installments insert failed:', instErr)
        // Non-fatal: contract was created, log but continue
      }
    }

    // 4. Update couple status to 'booked' with contract total
    if (quote.couple_id) {
      await supabase
        .from('couples')
        .update({
          status: 'booked',
          booked_date: new Date().toISOString().split('T')[0],
          contract_total: quote.total || 0,
        })
        .eq('id', quote.couple_id)
    }

    // 5. Mark quote as converted
    await supabase
      .from('client_quotes')
      .update({
        status: 'converted',
        converted_at: new Date().toISOString(),
      })
      .eq('id', quote_id)

    return NextResponse.json({
      contract_id: contract.id,
      couple_id: quote.couple_id,
      total: quote.total,
      installments_count: installments.length,
    })
  } catch (err) {
    console.error('[POST /api/admin/contracts/from-quote] Error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
