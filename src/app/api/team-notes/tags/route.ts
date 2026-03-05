import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// GET /api/team-notes/tags — list all tags sorted by usage
export async function GET() {
  const { data, error } = await supabaseAdmin
    .from('note_issue_tags')
    .select('*')
    .order('usage_count', { ascending: false })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ data: data || [] })
}

// POST /api/team-notes/tags — create a new tag
export async function POST(req: NextRequest) {
  const { tag } = await req.json()

  if (!tag || !tag.trim()) {
    return NextResponse.json({ error: 'Tag text is required' }, { status: 400 })
  }

  const trimmed = tag.trim().toLowerCase()

  // Check if exists
  const { data: existing } = await supabaseAdmin
    .from('note_issue_tags')
    .select('*')
    .eq('tag', trimmed)
    .limit(1)

  if (existing && existing.length > 0) {
    return NextResponse.json({ data: existing[0] })
  }

  const { data: newTag, error } = await supabaseAdmin
    .from('note_issue_tags')
    .insert({ tag: trimmed, usage_count: 0 })
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ data: newTag })
}
