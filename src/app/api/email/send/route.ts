import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { sendEmail } from '@/lib/email/send-email';

interface SendEmailRequest {
  to: string;
  subject: string;
  body: string;
  // Optional tracking fields
  leadId?: string;
  entityId?: string;
  templateId?: string;
  touchNumber?: number;
}

export async function POST(request: NextRequest) {
  try {
    const body: SendEmailRequest = await request.json();
    const { to, subject, body: emailBody, leadId, entityId, templateId } = body;

    // Validate required fields
    if (!to || !subject || !emailBody) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields: to, subject, body' },
        { status: 400 }
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(to)) {
      return NextResponse.json(
        { success: false, error: 'Invalid email address' },
        { status: 400 }
      );
    }

    // Send the email
    const result = await sendEmail({
      to,
      subject,
      body: emailBody,
    });

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error },
        { status: 500 }
      );
    }

    // Log to lead_contacts if leadId provided
    let contactId: string | null = null;
    if (leadId) {
      // Get current contact count
      const { data: leadData } = await supabase
        .from('ballots')
        .select('contact_count')
        .eq('id', leadId)
        .limit(1);

      const currentCount = leadData?.[0]?.contact_count || 0;
      const newContactNumber = currentCount + 1;

      // Insert contact record
      const { data: contactData, error: contactError } = await supabase
        .from('lead_contacts')
        .insert({
          entity_id: entityId || leadId,
          ballot_id: leadId,
          contact_number: newContactNumber,
          contact_type: 'email',
          outcome: 'sent',
          template_used: templateId || null,
          notes: `Subject: ${subject}`,
        })
        .select('id')
        .limit(1);

      if (!contactError && contactData?.[0]) {
        contactId = contactData[0].id;
      }

      // Update ballot contact tracking
      await supabase
        .from('ballots')
        .update({
          contact_count: newContactNumber,
          last_contact_date: new Date().toISOString(),
        })
        .eq('id', leadId);
    }

    return NextResponse.json({
      success: true,
      messageId: result.messageId,
      contactId,
    });

  } catch (error) {
    console.error('Send email API error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
