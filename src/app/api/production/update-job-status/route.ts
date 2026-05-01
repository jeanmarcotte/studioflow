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
  const body = await req.json().catch(() => ({}))
  const { job_id, table, status } = body || {}

  if (!job_id || !table || !status) {
    return NextResponse.json(
      { error: 'Missing job_id, table, or status' },
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

  const { data: current } = await supabaseAdmin
    .from(table)
    .select('status')
    .eq('id', job_id)
    .limit(1)

  const previousStatus = current?.[0]?.status ?? null

  const { error } = await supabaseAdmin
    .from(table)
    .update(updates)
    .eq('id', job_id)
    .select('id')
    .limit(1)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  if (previousStatus !== null && previousStatus !== status) {
    await supabaseAdmin.from('job_status_history').insert({
      job_id,
      job_table: table,
      previous_status: previousStatus,
      new_status: status,
      changed_by: 'Jean',
    })
  }

  return NextResponse.json({ updated: true })
}
