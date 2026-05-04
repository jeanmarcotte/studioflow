import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params

  const [{ data: driveContents, error: driveError }, { data: archiveRows, error: archiveError }] = await Promise.all([
    supabase
      .from('drive_contents')
      .select('folder_type, drive_name, size_gb, folder_name')
      .eq('couple_id', id)
      .order('folder_type'),
    supabase
      .from('couple_archives')
      .select('on_marketing_drive, aws_verified, archive_status')
      .eq('couple_id', id)
      .limit(1),
  ])

  if (driveError || archiveError) {
    return NextResponse.json(
      { error: driveError?.message || archiveError?.message || 'Failed to load archive data' },
      { status: 500 }
    )
  }

  return NextResponse.json({
    driveContents: driveContents || [],
    archive: archiveRows?.[0] ?? null,
  })
}
