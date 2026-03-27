import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { Resend } from 'resend'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export async function GET(request: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params

  // Look up the crew member by confirmation token
  const { data: members, error } = await supabase
    .from('crew_call_sheet_members')
    .select('id, member_name, role, confirmed, confirmed_at, call_sheet_id')
    .eq('confirmation_token', token)
    .limit(1)

  if (error || !members || members.length === 0) {
    return new NextResponse(htmlPage('Invalid Confirmation', 'This confirmation link is invalid or has expired.', '#dc2626'), {
      status: 404,
      headers: { 'Content-Type': 'text/html' },
    })
  }

  const member = members[0]

  // Get wedding date from the call sheet → couple
  const { data: sheets } = await supabase
    .from('crew_call_sheets')
    .select('couple_id, couples(couple_name, wedding_date)')
    .eq('id', member.call_sheet_id)
    .limit(1)

  const couple = (sheets?.[0] as any)?.couples
  const weddingDate = couple?.wedding_date
    ? new Date(couple.wedding_date + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })
    : 'the wedding day'

  if (member.confirmed) {
    return new NextResponse(
      htmlPage('Already Confirmed', `You've already confirmed, ${member.member_name}! See you on ${weddingDate}!`, '#0d4f4f'),
      { headers: { 'Content-Type': 'text/html' } }
    )
  }

  // Mark as confirmed
  const confirmedAt = new Date()
  await supabase
    .from('crew_call_sheet_members')
    .update({ confirmed: true, confirmed_at: confirmedAt.toISOString() })
    .eq('id', member.id)

  // Send notification email to Jean + info
  try {
    const resend = new Resend(process.env.RESEND_API_KEY)
    const coupleName = couple?.couple_name || 'Unknown Couple'
    const confirmedAtToronto = confirmedAt.toLocaleString('en-US', {
      timeZone: 'America/Toronto',
      weekday: 'short',
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    })

    await resend.emails.send({
      from: 'SIGS Photography <noreply@sigsphoto.ca>',
      to: ['jeanmarcotte@gmail.com', 'info@sigsphoto.ca'],
      subject: `✅ ${member.member_name} confirmed — ${coupleName} | ${weddingDate}`,
      html: `
        <div style="font-family:Arial,sans-serif;max-width:520px;margin:0 auto;">
          <div style="background:#0d4f4f;color:white;padding:20px 24px;border-radius:8px 8px 0 0;">
            <h2 style="margin:0;font-size:18px;">✅ Crew Confirmation</h2>
          </div>
          <div style="padding:20px 24px;background:#f9fafb;border:1px solid #e5e7eb;border-top:none;border-radius:0 0 8px 8px;">
            <p style="margin:0 0 12px;font-size:15px;color:#111827;"><strong>${member.member_name}</strong> just confirmed for <strong>${coupleName}</strong>'s wedding on <strong>${weddingDate}</strong>.</p>
            <p style="margin:0 0 4px;font-size:14px;color:#374151;"><strong>Role:</strong> ${member.role || 'Not specified'}</p>
            <p style="margin:0 0 16px;font-size:14px;color:#374151;"><strong>Confirmed at:</strong> ${confirmedAtToronto}</p>
            <hr style="border:none;border-top:1px solid #e5e7eb;margin:16px 0;" />
            <p style="margin:0;"><a href="https://studioflow-zeta.vercel.app/admin/wedding-day/crew-confirm" style="color:#0d9488;text-decoration:none;font-weight:600;">View Crew Call Sheet →</a></p>
          </div>
        </div>
      `,
    })
  } catch (emailErr) {
    console.error('[Crew confirm] Notification email failed:', emailErr)
  }

  return new NextResponse(
    htmlPage('Confirmed!', `Thanks ${member.member_name}! You're all set. See you on ${weddingDate}.`, '#0d4f4f'),
    { headers: { 'Content-Type': 'text/html' } }
  )
}

function htmlPage(title: string, message: string, color: string): string {
  return `<!DOCTYPE html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${title} — SIGS Photography</title>
<link href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700&family=Nunito:wght@400;600;700&display=swap" rel="stylesheet">
</head><body style="margin:0;padding:0;background:#faf8f5;font-family:'Nunito',sans-serif;">
<div style="max-width:480px;margin:80px auto;text-align:center;padding:2rem;">
  <div style="background:#fff;border-radius:16px;padding:3rem 2rem;border:1px solid #e7e1d8;box-shadow:0 4px 12px rgba(0,0,0,0.06);">
    <div style="font-size:3rem;margin-bottom:1rem;">${title.includes('Invalid') ? '❌' : '✅'}</div>
    <h1 style="font-family:'Playfair Display',serif;font-size:1.5rem;color:${color};margin:0 0 1rem;">${title}</h1>
    <p style="font-size:1rem;color:#374151;line-height:1.6;margin:0;">${message}</p>
    <div style="margin-top:2rem;padding-top:1.5rem;border-top:1px solid #e7e1d8;">
      <p style="font-size:0.8rem;color:#9ca3af;margin:0;">SIGS Photography</p>
    </div>
  </div>
</div>
</body></html>`
}
