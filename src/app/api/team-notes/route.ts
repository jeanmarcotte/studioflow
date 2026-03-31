import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// GET /api/team-notes — list notes with tags
export async function GET(req: NextRequest) {
  const url = new URL(req.url)
  const shooter = url.searchParams.get('shooter')
  const phase = url.searchParams.get('phase')
  const severity = url.searchParams.get('severity')
  const tag = url.searchParams.get('tag')
  const search = url.searchParams.get('search')
  const limit = parseInt(url.searchParams.get('limit') || '50')

  let query = supabaseAdmin
    .from('team_notes')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit)

  if (severity) {
    query = query.eq('severity', severity)
  }
  if (shooter) {
    query = query.contains('shooters', [shooter])
  }
  if (phase) {
    query = query.contains('wedding_phase', [phase])
  }
  if (search) {
    query = query.ilike('note', `%${search}%`)
  }

  const { data: notes, error } = await query

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // Fetch tags for all notes
  const noteIds = (notes || []).map(n => n.id)
  let tagMap: Record<string, { id: string; tag: string; usage_count: number }[]> = {}

  if (noteIds.length > 0) {
    const { data: links } = await supabaseAdmin
      .from('note_tag_links')
      .select('note_id, tag_id, note_issue_tags(id, tag, usage_count)')
      .in('note_id', noteIds)

    if (links) {
      for (const link of links) {
        const noteId = link.note_id
        if (!tagMap[noteId]) tagMap[noteId] = []
        const tagData = link.note_issue_tags as unknown as { id: string; tag: string; usage_count: number }
        if (tagData) {
          tagMap[noteId].push(tagData)
        }
      }
    }
  }

  // If filtering by tag, filter client-side after join
  let result = (notes || []).map(note => ({
    ...note,
    tags: tagMap[note.id] || []
  }))

  if (tag) {
    result = result.filter(note =>
      note.tags.some((t: { tag: string }) => t.tag === tag)
    )
  }

  return NextResponse.json({ data: result })
}

// POST /api/team-notes — create a note
export async function POST(req: NextRequest) {
  const body = await req.json()
  const { couple_id, couple_name, shooters, wedding_phase, severity, note, is_lesson, tag_ids, new_tags, image_urls } = body

  if (!note || !note.trim()) {
    return NextResponse.json({ error: 'Note text is required' }, { status: 400 })
  }
  if (!couple_id) {
    return NextResponse.json({ error: 'Couple is required' }, { status: 400 })
  }

  // 1. Insert the note
  const { data: newNote, error: noteError } = await supabaseAdmin
    .from('team_notes')
    .insert({
      couple_id,
      couple_name: couple_name || null,
      shooters: shooters || [],
      wedding_phase: wedding_phase || [],
      severity: severity || 'medium',
      note: note.trim(),
      is_lesson: is_lesson || false,
      image_urls: image_urls && image_urls.length > 0 ? image_urls : null,
    })
    .select()
    .single()

  if (noteError) {
    return NextResponse.json({ error: noteError.message }, { status: 500 })
  }

  // 2. Create any new tags
  const allTagIds: string[] = [...(tag_ids || [])]

  if (new_tags && new_tags.length > 0) {
    for (const tagText of new_tags) {
      const trimmed = tagText.trim().toLowerCase()
      if (!trimmed) continue

      // Try insert, on conflict get existing
      const { data: existing } = await supabaseAdmin
        .from('note_issue_tags')
        .select('id')
        .eq('tag', trimmed)
        .limit(1)

      if (existing && existing.length > 0) {
        allTagIds.push(existing[0].id)
        // Increment usage count
        const { data: tagRow } = await supabaseAdmin
          .from('note_issue_tags')
          .select('usage_count')
          .eq('id', existing[0].id)
          .single()
        if (tagRow) {
          await supabaseAdmin
            .from('note_issue_tags')
            .update({ usage_count: tagRow.usage_count + 1 })
            .eq('id', existing[0].id)
        }
      } else {
        const { data: newTag } = await supabaseAdmin
          .from('note_issue_tags')
          .insert({ tag: trimmed, usage_count: 1 })
          .select('id')
          .single()

        if (newTag) allTagIds.push(newTag.id)
      }
    }
  }

  // 3. Link tags to note + increment usage for existing tags
  if (allTagIds.length > 0) {
    const links = allTagIds.map(tagId => ({
      note_id: newNote.id,
      tag_id: tagId,
    }))
    await supabaseAdmin.from('note_tag_links').insert(links)

    // Increment usage_count for pre-existing tags (tag_ids, not new_tags)
    if (tag_ids && tag_ids.length > 0) {
      for (const tagId of tag_ids) {
        const { data: tagRow } = await supabaseAdmin
          .from('note_issue_tags')
          .select('usage_count')
          .eq('id', tagId)
          .single()

        if (tagRow) {
          await supabaseAdmin
            .from('note_issue_tags')
            .update({ usage_count: tagRow.usage_count + 1 })
            .eq('id', tagId)
        }
      }
    }
  }

  return NextResponse.json({ data: newNote })
}

// DELETE /api/team-notes?id=xxx
export async function DELETE(req: NextRequest) {
  const url = new URL(req.url)
  const id = url.searchParams.get('id')

  if (!id) {
    return NextResponse.json({ error: 'Missing note id' }, { status: 400 })
  }

  const { error } = await supabaseAdmin
    .from('team_notes')
    .delete()
    .eq('id', id)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
