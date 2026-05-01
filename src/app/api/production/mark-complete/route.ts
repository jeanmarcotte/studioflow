import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const today = () => new Date().toISOString().slice(0, 10)

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}))
  const { item_id, couple_id, mark_all } = body || {}

  if (mark_all === true && couple_id) {
    const { data, error } = await supabaseAdmin
      .from('couple_checklist_items')
      .update({ is_complete: true, completed_date: today() })
      .eq('couple_id', couple_id)
      .eq('is_complete', false)
      .select('id')

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ updated: (data || []).length })
  }

  if (item_id) {
    const { data, error } = await supabaseAdmin
      .from('couple_checklist_items')
      .update({ is_complete: true, completed_date: today() })
      .eq('id', item_id)
      .eq('is_complete', false)
      .select('id')

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ updated: (data || []).length })
  }

  return NextResponse.json(
    { error: 'Provide either { item_id } or { couple_id, mark_all: true }' },
    { status: 400 }
  )
}

export async function PATCH(req: NextRequest) {
  const body = await req.json().catch(() => ({}))
  const { item_id } = body || {}

  if (!item_id) {
    return NextResponse.json({ error: 'Missing item_id' }, { status: 400 })
  }

  const { data, error } = await supabaseAdmin
    .from('couple_checklist_items')
    .update({ is_complete: false, completed_date: null })
    .eq('id', item_id)
    .eq('is_complete', true)
    .select('id')

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ updated: (data || []).length })
}
