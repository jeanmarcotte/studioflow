import { supabase } from '@/lib/supabase'

interface ChaseTemplate {
  id: string
  touch_number: number
  contact_type: string
  template_name: string
  subject: string | null
  body: string
}

interface TemplateVariables {
  bride_name: string
  groom_name: string
  venue_name: string
  wedding_date: string
  show_name: string
}

export async function getTemplateForTouch(
  touchNumber: number,
  contactType?: 'text' | 'call' | 'email'
): Promise<ChaseTemplate | null> {
  let query = supabase
    .from('chase_templates')
    .select('id, touch_number, contact_type, template_name, subject, body')
    .eq('touch_number', touchNumber)
    .eq('is_active', true)

  if (contactType) {
    query = query.eq('contact_type', contactType)
  }

  const { data } = await query.limit(1)
  return (data?.[0] as ChaseTemplate) || null
}

export function renderTemplate(template: string, variables: TemplateVariables): string {
  return template
    .replace(/\{\{bride_name\}\}/g, variables.bride_name || 'there')
    .replace(/\{\{groom_name\}\}/g, variables.groom_name || 'your partner')
    .replace(/\{\{venue_name\}\}/g, variables.venue_name || 'your venue')
    .replace(/\{\{wedding_date\}\}/g, variables.wedding_date || 'your wedding')
    .replace(/\{\{show_name\}\}/g, variables.show_name || 'the bridal show')
    .replace(/\\n/g, '\n')
}

export function getTemplateVariables(lead: {
  bride_first_name: string | null
  groom_first_name: string | null
  venue_name: string | null
  wedding_date: string | null
  show_id: string | null
}): TemplateVariables {
  const SHOW_LABELS: Record<string, string> = {
    'modern-feb-2026': 'Modern Bridal Show',
    'weddingring-oakville-mar-2026': 'Wedding Ring Oakville Show',
    'hamilton-ring-mar-2026': 'Hamilton Ring Show',
  }

  return {
    bride_name: lead.bride_first_name || 'there',
    groom_name: lead.groom_first_name || 'your partner',
    venue_name: lead.venue_name || 'your venue',
    wedding_date: lead.wedding_date || 'your wedding',
    show_name: lead.show_id ? (SHOW_LABELS[lead.show_id] || 'the bridal show') : 'the bridal show',
  }
}
