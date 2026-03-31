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
    .from('lead_sources')
    .select('*')
    .eq('is_active', true)
    .order('display_name')

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data || [])
}

export async function PATCH(request: Request) {
  const supabase = getServiceClient()
  const { slug, show_cost } = await request.json()

  if (!slug || show_cost === undefined) {
    return NextResponse.json({ error: 'slug and show_cost required' }, { status: 400 })
  }

  const { data, error } = await supabase
    .from('lead_sources')
    .update({ show_cost })
    .eq('slug', slug)
    .select()
    .limit(1)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data?.[0])
}
