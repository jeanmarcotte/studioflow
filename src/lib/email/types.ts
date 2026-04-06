export interface EmailPayload {
  to: string;
  subject: string;
  body: string;           // HTML or plain text
  replyTo?: string;
  cc?: string[];
  bcc?: string[];
}

export interface EmailResult {
  success: boolean;
  messageId?: string;     // Resend message ID
  error?: string;
}

export interface EmailTemplate {
  id: string;
  name: string;
  subject: string;
  body: string;
  variables: string[];    // ['bride_name', 'venue_name', etc.]
  category: 'chase' | 'quote' | 'reminder' | 'crew';
}

export interface TemplateContext {
  bride_name?: string;
  groom_name?: string;
  venue_name?: string;
  wedding_date?: string;
  wedding_day?: string;   // "Saturday"
  show_name?: string;
  package_name?: string;
  package_price?: string;
  [key: string]: string | undefined;  // Allow custom variables
}
