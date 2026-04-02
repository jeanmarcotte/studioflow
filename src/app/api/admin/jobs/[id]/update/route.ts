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
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()

    const allowedFields = ['photos_taken', 'edited_so_far', 'total_proofs', 'status']
    const updates: Record<string, any> = { updated_at: new Date().toISOString() }

    for (const field of allowedFields) {
      if (body[field] !== undefined) {
        updates[field] = body[field]
      }
    }

    // Auto-set at_lab_date when moving to at_lab
    if (body.status === 'at_lab') {
      updates.at_lab_date = new Date().toISOString().split('T')[0]
    }

    const supabase = getServiceClient()

    // Track status history when status is changing
    if (body.status !== undefined) {
      const { data: current } = await supabase
        .from('jobs')
        .select('status')
        .eq('id', id)
        .single()

      if (current && current.status !== body.status) {
        await supabase.from('job_status_history').insert({
          job_id: id,
          job_table: 'jobs',
          previous_status: current.status,
          new_status: body.status,
          changed_by: 'Jean',
        })
      }
    }

    const { data, error } = await supabase
      .from('jobs')
      .update(updates)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      console.error(`[PATCH /api/admin/jobs/${id}/update] Update failed:`, error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json(data)
  } catch (err) {
    console.error('[PATCH /api/admin/jobs/[id]/update] Error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
