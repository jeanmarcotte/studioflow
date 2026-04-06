import { Resend } from 'resend';
import { EmailPayload, EmailResult } from './types';

// Lazy initialization to avoid build-time errors when RESEND_API_KEY is not available
let resendInstance: Resend | null = null;
function getResend(): Resend {
  if (!resendInstance) {
    resendInstance = new Resend(process.env.RESEND_API_KEY);
  }
  return resendInstance;
}

const DEFAULT_FROM = 'SIGS Photography <noreply@sigsphoto.ca>';

export async function sendEmail(payload: EmailPayload): Promise<EmailResult> {
  try {
    const { to, subject, body, replyTo, cc, bcc } = payload;

    const result = await getResend().emails.send({
      from: DEFAULT_FROM,
      to,
      subject,
      html: body,
      replyTo: replyTo || 'info@sigsphoto.ca',
      cc,
      bcc,
    });

    if (result.error) {
      console.error('Resend error:', result.error);
      return {
        success: false,
        error: result.error.message,
      };
    }

    return {
      success: true,
      messageId: result.data?.id,
    };
  } catch (error) {
    console.error('Email send error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}
