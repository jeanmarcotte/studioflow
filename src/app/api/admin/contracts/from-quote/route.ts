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
  if (packageName) {
    const key = packageName.toLowerCase()
    if (PACKAGE_TEAM[key]) return PACKAGE_TEAM[key]
    // Legacy package names: "2P" = 2 photographers, "1P" = 1
    if (key.includes('2p')) return { photographers: 2, videographers: serviceNeeds === 'photo_video' ? 1 : 0 }
    if (key.includes('1p')) return { photographers: 1, videographers: serviceNeeds === 'photo_video' ? 1 : 0 }
  }
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

    // ─── 1. Fetch the client_quotes record ─────────────────────────
    const { data: quote, error: quoteErr } = await supabase
      .from('client_quotes')
      .select('*')
      .eq('id', quote_id)
      .single()

    if (quoteErr || !quote) {
      return NextResponse.json({ error: 'Quote not found' }, { status: 404 })
    }

    if (quote.status === 'converted') {
      return NextResponse.json({ error: 'Quote already converted to contract' }, { status: 409 })
    }

    const team = resolveTeam(quote.package_name, quote.service_needs)
    const now = new Date().toISOString()
    const today = now.split('T')[0]

    // ─── STEP 1: Create or link couple ─────────────────────────────
    let coupleId = quote.couple_id

    if (!coupleId) {
      // No couple linked — create one from quote data
      const coupleName = [quote.bride_first_name, quote.groom_first_name]
        .filter(Boolean)
        .join(' & ')
      const weddingYear = quote.wedding_date
        ? new Date(quote.wedding_date + 'T12:00:00').getFullYear()
        : null

      const { data: newCouple, error: coupleErr } = await supabase
        .from('couples')
        .insert({
          couple_name: coupleName || 'Unnamed Couple',
          bride_first_name: quote.bride_first_name || null,
          bride_last_name: quote.bride_last_name || null,
          groom_first_name: quote.groom_first_name || null,
          groom_last_name: quote.groom_last_name || null,
          email: quote.email || null,
          phone: quote.phone || null,
          wedding_date: quote.wedding_date || null,
          wedding_year: weddingYear,
          ceremony_venue: quote.ceremony_venue || null,
          lead_source: quote.lead_source || null,
          package_type: quote.service_needs || null,
          coverage_hours: quote.coverage_hours || null,
          contract_total: quote.total || 0,
          balance_owing: quote.total || 0,
          booked_date: today,
          status: 'booked',
        })
        .select('id')
        .single()

      if (coupleErr || !newCouple) {
        console.error('[from-quote] Couple insert failed:', coupleErr)
        return NextResponse.json(
          { error: 'Failed to create couple record: ' + (coupleErr?.message || 'unknown') },
          { status: 500 }
        )
      }

      coupleId = newCouple.id
      console.log('[from-quote] Created couple:', coupleId, coupleName)
    } else {
      // Couple already exists — update with booking data
      const weddingYear = quote.wedding_date
        ? new Date(quote.wedding_date + 'T12:00:00').getFullYear()
        : null

      const { error: updateErr } = await supabase
        .from('couples')
        .update({
          status: 'booked',
          booked_date: today,
          contract_total: quote.total || 0,
          balance_owing: quote.total || 0,
          package_type: quote.service_needs || null,
          coverage_hours: quote.coverage_hours || null,
          wedding_year: weddingYear,
        })
        .eq('id', coupleId)

      if (updateErr) {
        console.error('[from-quote] Couple update failed:', updateErr)
        // Non-fatal for existing couples — continue
      }
    }

    // ─── STEP 2: Create contract ────────────────────────────────────
    const printsIncluded = quote.prints_included === 'free'

    const { data: contract, error: contractErr } = await supabase
      .from('contracts')
      .insert({
        couple_id: coupleId,
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
        signed_date: today,
        prints_postcard_thankyou: printsIncluded ? 1 : 0,
        prints_5x7: printsIncluded ? 1 : 0,
        prints_8x10: printsIncluded ? 1 : 0,
      })
      .select('id')
      .single()

    if (contractErr || !contract) {
      console.error('[from-quote] Contract insert failed:', contractErr)
      return NextResponse.json(
        { error: 'Failed to create contract: ' + (contractErr?.message || 'unknown') },
        { status: 500 }
      )
    }

    console.log('[from-quote] Created contract:', contract.id, 'total:', quote.total)

    // ─── STEP 3: Create installments from JSONB ─────────────────────
    const installments = Array.isArray(quote.installments) ? quote.installments : []
    if (installments.length > 0) {
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
        console.error('[from-quote] Installments insert failed:', instErr)
        // Non-fatal: contract was created, log but continue
      } else {
        console.log('[from-quote] Created', rows.length, 'installments for contract', contract.id)
      }
    }

    // ─── STEP 4: Create milestones row ──────────────────────────────
    const { error: msErr } = await supabase
      .from('couple_milestones')
      .insert({
        couple_id: coupleId,
        m01_lead_captured: true,
        m02_consultation_booked: true,
        m03_consultation_done: true,
        m04_contract_signed: true,
      })

    if (msErr) {
      console.error('[from-quote] Milestones insert failed:', msErr)
      // Non-fatal: couple and contract already exist
    }

    // ─── STEP 5: Update the quote with couple_id + converted status ─
    const { error: quoteUpdateErr } = await supabase
      .from('client_quotes')
      .update({
        couple_id: coupleId,
        status: 'converted',
        converted_at: now,
      })
      .eq('id', quote_id)

    if (quoteUpdateErr) {
      console.error('[from-quote] Quote update failed:', quoteUpdateErr)
    }

    return NextResponse.json({
      contract_id: contract.id,
      couple_id: coupleId,
      total: quote.total,
      installments_count: installments.length,
    })
  } catch (err) {
    console.error('[from-quote] Unexpected error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
