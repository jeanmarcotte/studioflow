import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { Resend } from 'resend'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

function getResend() {
  return new Resend(process.env.RESEND_API_KEY)
}

function escHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

const SEV_COLORS: Record<string, { bg: string; text: string; label: string }> = {
  high: { bg: '#fef2f2', text: '#dc2626', label: 'High' },
  medium: { bg: '#fffbeb', text: '#d97706', label: 'Medium' },
  low: { bg: '#f0fdf4', text: '#16a34a', label: 'Low' },
}

export async function POST(req: NextRequest) {
  const body = await req.json()
  const { noteId, recipientEmails } = body as { noteId: string; recipientEmails: string[] }

  if (!noteId || !recipientEmails || recipientEmails.length === 0) {
    return NextResponse.json({ error: 'Missing noteId or recipientEmails' }, { status: 400 })
  }

  // Fetch the note
  const { data: notes, error: noteError } = await supabaseAdmin
    .from('team_notes')
    .select('*')
    .eq('id', noteId)
    .limit(1)

  if (noteError || !notes || notes.length === 0) {
    return NextResponse.json({ error: 'Note not found' }, { status: 404 })
  }

  const note = notes[0]
  const sev = SEV_COLORS[note.severity] || SEV_COLORS.medium

  // Build images HTML
  let imagesHtml = ''
  if (note.image_urls && note.image_urls.length > 0) {
    const imgs = note.image_urls.map((url: string) =>
      `<img src="${escHtml(url)}" style="max-width:280px;max-height:200px;border-radius:8px;border:1px solid #e5e7eb;margin-right:8px;margin-bottom:8px;" />`
    ).join('')
    imagesHtml = `
      <div style="margin-top:16px;">
        ${imgs}
      </div>`
  }

  // Build phases
  const phasesText = note.wedding_phase && note.wedding_phase.length > 0
    ? note.wedding_phase.join(', ')
    : 'N/A'

  const html = `
    <div style="font-family:Arial,Helvetica,sans-serif;max-width:600px;margin:0 auto;background:#ffffff;">
      <div style="background:#1e3a5f;color:white;padding:20px 24px;border-radius:8px 8px 0 0;">
        <h2 style="margin:0;font-size:18px;">Team Note from SIGS Photography</h2>
      </div>
      <div style="padding:20px 24px;border:1px solid #e5e7eb;border-top:none;border-radius:0 0 8px 8px;">
        <p style="margin:0 0 4px;font-size:15px;"><strong>Couple:</strong> ${escHtml(note.couple_name || 'Unknown')}</p>
        <p style="margin:0 0 4px;font-size:14px;color:#6b7280;"><strong>Wedding Phase:</strong> ${escHtml(phasesText)}</p>
        <p style="margin:0 0 16px;font-size:14px;">
          <strong>Severity:</strong>
          <span style="display:inline-block;padding:2px 10px;border-radius:4px;background:${sev.bg};color:${sev.text};font-weight:600;font-size:13px;">
            ${sev.label}
          </span>
        </p>
        <div style="padding:16px;background:#f9fafb;border-radius:8px;border:1px solid #e5e7eb;">
          <p style="margin:0;font-size:14px;line-height:1.6;color:#111827;white-space:pre-wrap;">${escHtml(note.note)}</p>
        </div>
        ${imagesHtml}
        <hr style="margin:20px 0;border:none;border-top:1px solid #e5e7eb;" />
        <p style="margin:0;font-size:12px;color:#9ca3af;">This note was sent from StudioFlow</p>
      </div>
    </div>
  `

  const subject = `SIGS Team Note — ${note.couple_name || 'Unknown'} (${sev.label})`

  try {
    const resend = getResend()
    const results: { email: string; success: boolean; error?: string }[] = []

    for (const email of recipientEmails) {
      const { error } = await resend.emails.send({
        from: 'SIGS Photography <noreply@sigsphoto.ca>',
        to: [email],
        subject,
        html,
      })
      results.push({ email, success: !error, error: error?.message })
    }

    const allSuccess = results.every(r => r.success)
    return NextResponse.json({ success: allSuccess, results })
  } catch (err) {
    console.error('[Team note email] Send failed:', err)
    return NextResponse.json({ error: 'Email send failed' }, { status: 500 })
  }
}
