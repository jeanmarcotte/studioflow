import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

function getServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params
    const body = await request.json()

    const allowedFields = ['status', 'section']
    const updates: Record<string, any> = { updated_at: new Date().toISOString() }

    for (const field of allowedFields) {
      if (body[field] !== undefined) {
        updates[field] = body[field]
      }
    }

    const supabase = getServiceClient()

    // Track status history when status is changing
    if (body.status !== undefined) {
      const { data: current } = await supabase
        .from('video_jobs')
        .select('status')
        .eq('id', id)
        .single()

      if (current && current.status !== body.status) {
        await supabase.from('job_status_history').insert({
          job_id: id,
          job_table: 'video_jobs',
          previous_status: current.status,
          new_status: body.status,
          changed_by: 'Jean',
        })
      }
    }

    const { data, error } = await supabase
      .from('video_jobs')
      .update(updates)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      console.error(`[PATCH /api/admin/video-jobs/${id}/update] Update failed:`, error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json(data)
  } catch (err) {
    console.error('[PATCH /api/admin/video-jobs/[id]/update] Error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
