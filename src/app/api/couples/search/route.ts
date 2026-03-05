import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// GET /api/couples/search?q=searchterm — search couples for dropdown
export async function GET(req: NextRequest) {
  const url = new URL(req.url)
  const q = url.searchParams.get('q') || ''

  let query = supabaseAdmin
    .from('couples')
    .select('id, couple_name, wedding_date, wedding_year')
    .order('wedding_date', { ascending: false })
    .limit(100)

  if (q.trim()) {
    query = query.ilike('couple_name', `%${q.trim()}%`)
  }

  const { data, error } = await query

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ data: data || [] })
}
