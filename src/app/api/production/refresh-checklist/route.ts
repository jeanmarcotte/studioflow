import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}))
  const year = Number(body?.year)

  if (!Number.isInteger(year) || year < 2000 || year > 2100) {
    return NextResponse.json({ error: 'Missing or invalid year' }, { status: 400 })
  }

  const yearStart = `${year}-01-01`
  const yearEnd = `${year}-12-31`

  const { data: couples, error: couplesErr } = await supabaseAdmin
    .from('couples')
    .select('id')
    .gte('wedding_date', yearStart)
    .lte('wedding_date', yearEnd)

  if (couplesErr) {
    return NextResponse.json({ error: couplesErr.message }, { status: 500 })
  }

  let jobsCreated = 0
  let checklistItemsAdded = 0
  let processed = 0
  const failures: { couple_id: string; step: 'photo_jobs' | 'checklist'; error: string }[] = []

  for (const c of couples || []) {
    let stepFailed = false

    const jobsRes = await supabaseAdmin.rpc('auto_generate_photo_jobs', {
      p_couple_id: c.id,
    })
    if (jobsRes.error) {
      failures.push({ couple_id: c.id, step: 'photo_jobs', error: jobsRes.error.message })
      stepFailed = true
    } else {
      jobsCreated += Number(jobsRes.data) || 0
    }

    const checklistRes = await supabaseAdmin.rpc('populate_couple_checklist', {
      p_couple_id: c.id,
    })
    if (checklistRes.error) {
      failures.push({ couple_id: c.id, step: 'checklist', error: checklistRes.error.message })
      stepFailed = true
    } else {
      checklistItemsAdded += Number(checklistRes.data) || 0
    }

    if (!stepFailed) processed += 1
  }

  return NextResponse.json({
    couples_processed: processed,
    jobs_created: jobsCreated,
    checklist_items_added: checklistItemsAdded,
    failures,
  })
}
