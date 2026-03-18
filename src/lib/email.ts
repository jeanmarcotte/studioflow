import { Resend } from 'resend'

function getResend() {
  return new Resend(process.env.RESEND_API_KEY)
}

type FormType = 'wedding-day' | 'photo-order' | 'video-order'

export async function sendFormNotification({
  formType,
  coupleName,
  weddingDate,
}: {
  formType: FormType
  coupleName: string
  weddingDate: string
}) {
  const subjects: Record<FormType, string> = {
    'wedding-day': `📋 Wedding Day Form: ${coupleName}`,
    'photo-order': `📷 Photo Order: ${coupleName}`,
    'video-order': `🎬 Video Order: ${coupleName}`,
  }

  const formNames: Record<FormType, string> = {
    'wedding-day': 'Wedding Day Information',
    'photo-order': 'Photo Order',
    'video-order': 'Video Order',
  }

  try {
    const resend = getResend()
    const { data, error } = await resend.emails.send({
      from: 'SIGS Photography <noreply@sigsphoto.ca>',
      to: ['info@sigsphoto.ca'],
      subject: subjects[formType],
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: #0d9488; color: white; padding: 20px; border-radius: 8px 8px 0 0;">
            <h2 style="margin: 0;">${formNames[formType]} Submitted</h2>
          </div>
          <div style="background: #f9fafb; padding: 20px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 8px 8px;">
            <p><strong>Couple:</strong> ${coupleName}</p>
            <p><strong>Wedding Date:</strong> ${weddingDate}</p>
            <p><strong>Submitted:</strong> ${new Date().toLocaleString('en-US', { timeZone: 'America/Toronto' })}</p>
            <hr style="margin: 20px 0; border: none; border-top: 1px solid #e5e7eb;" />
            <p><a href="https://studioflow-zeta.vercel.app/admin/couples" style="color: #0d9488; text-decoration: none;">View in StudioFlow →</a></p>
          </div>
        </div>
      `,
    })

    if (error) {
      console.error('Resend error:', error)
      return { success: false, error }
    }

    return { success: true, id: data?.id }
  } catch (err) {
    console.error('Email send failed:', err)
    return { success: false, error: err }
  }
}
