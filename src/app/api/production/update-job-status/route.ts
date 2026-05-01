import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const today = () => new Date().toISOString().slice(0, 10)

const PHOTO_STATUSES = new Set([
  'not_started',
  'in_progress',
  'waiting_approval',
  'at_lab',
  'at_studio',
  'completed',
  'picked_up',
  'on_hold',
])

const VIDEO_STATUSES = new Set([
  'not_started',
  'in_progress',
  'waiting_for_bride',
  'complete',
])

export async function PATCH(req: NextRequest) {
  let body: any
  try {
    body = await req.json()
  } catch (e: any) {
    console.error('[update-job-status] body parse failed:', e?.message)
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const { job_id, table, status } = body || {}
  console.log('[update-job-status] received:', { job_id, table, status })

  if (!job_id || !table || !status) {
    return NextResponse.json(
      { error: 'Missing job_id, table, or status', received: { job_id, table, status } },
      { status: 400 }
    )
  }

  if (table !== 'jobs' && table !== 'video_jobs') {
    return NextResponse.json(
      { error: `Invalid table: ${table}` },
      { status: 400 }
    )
  }

  const allowed = table === 'jobs' ? PHOTO_STATUSES : VIDEO_STATUSES
  if (!allowed.has(status)) {
    return NextResponse.json(
      { error: `Invalid status "${status}" for ${table}` },
      { status: 400 }
    )
  }

  const updates: Record<string, any> = { status }

  if (table === 'jobs') {
    if (status === 'completed' || status === 'picked_up') {
      updates.completed_date = today()
    }
    if (status === 'at_lab') {
      updates.at_lab_date = today()
    }
    updates.updated_at = new Date().toISOString()
  } else {
    if (status === 'complete') {
      updates.completed_date = today()
    }
  }

  const { data: currentRows, error: currentErr } = await supabaseAdmin
    .from(table)
    .select('status')
    .eq('id', job_id)
    .limit(1)

  if (currentErr) {
    console.error('[update-job-status] read previous failed:', currentErr.message)
    return NextResponse.json({ error: currentErr.message }, { status: 500 })
  }

  if (!currentRows || currentRows.length === 0) {
    console.error('[update-job-status] no row found for', { table, job_id })
    return NextResponse.json(
      { error: `No ${table} row found with id ${job_id}` },
      { status: 404 }
    )
  }

  const previousStatus = currentRows[0]?.status ?? null

  const { data: updatedRows, error } = await supabaseAdmin
    .from(table)
    .update(updates)
    .eq('id', job_id)
    .select('id, status')

  if (error) {
    console.error('[update-job-status] update failed:', error.message)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  if (!updatedRows || updatedRows.length === 0) {
    console.error('[update-job-status] update affected 0 rows', { table, job_id, updates })
    return NextResponse.json(
      { error: `Update affected 0 rows for ${table} id ${job_id}` },
      { status: 500 }
    )
  }

  if (previousStatus !== null && previousStatus !== status) {
    const { error: historyErr } = await supabaseAdmin
      .from('job_status_history')
      .insert({
        job_id,
        job_table: table,
        previous_status: previousStatus,
        new_status: status,
        changed_by: 'Jean',
      })
    if (historyErr) {
      // Non-fatal — the actual status update succeeded.
      console.error('[update-job-status] history insert failed:', historyErr.message)
    }
  }

  console.log('[update-job-status] OK', {
    table, job_id, previous: previousStatus, next: status,
  })
  return NextResponse.json({
    updated: true,
    previous_status: previousStatus,
    new_status: status,
    rows_affected: updatedRows.length,
  })
}
