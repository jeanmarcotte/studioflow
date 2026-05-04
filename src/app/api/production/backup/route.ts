import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const ALLOWED_TABLES = new Set(['jobs', 'video_jobs'])

export async function POST(req: NextRequest) {
  let body: any
  try {
    body = await req.json()
  } catch (e: any) {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const { jobId, table, raw_file_path, raw_file_count, raw_file_size_gb } = body || {}

  if (!jobId || !table) {
    return NextResponse.json({ error: 'Missing jobId or table' }, { status: 400 })
  }
  if (!ALLOWED_TABLES.has(table)) {
    return NextResponse.json({ error: `Invalid table: ${table}` }, { status: 400 })
  }

  const trimmedPath = typeof raw_file_path === 'string' ? raw_file_path.trim() : ''
  if (!trimmedPath) {
    return NextResponse.json({ error: 'raw_file_path is required' }, { status: 400 })
  }

  const count = Number(raw_file_count)
  if (!Number.isFinite(count) || count < 0 || !Number.isInteger(count)) {
    return NextResponse.json({ error: 'raw_file_count must be a non-negative integer' }, { status: 400 })
  }

  const sizeGb = Number(raw_file_size_gb)
  if (!Number.isFinite(sizeGb) || sizeGb < 0) {
    return NextResponse.json({ error: 'raw_file_size_gb must be a non-negative number' }, { status: 400 })
  }

  const { data, error } = await supabaseAdmin
    .from(table)
    .update({
      raw_file_path: trimmedPath,
      raw_file_count: count,
      raw_file_size_gb: Math.round(sizeGb * 100) / 100,
      backed_up: true,
    })
    .eq('id', jobId)
    .select('id')

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
  if (!data || data.length === 0) {
    return NextResponse.json({ error: `No ${table} row with id ${jobId}` }, { status: 404 })
  }

  return NextResponse.json({ updated: true })
}
