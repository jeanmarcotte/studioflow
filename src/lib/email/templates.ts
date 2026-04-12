import { supabase } from '@/lib/supabase';
import { EmailTemplate, TemplateContext } from './types';

/**
 * Fetch templates by category
 */
export async function getTemplates(category: 'chase' | 'quote' | 'reminder' | 'crew'): Promise<EmailTemplate[]> {
  let tableName: string;
  switch (category) {
    case 'chase':
      tableName = 'chase_templates';
      break;
    default:
      tableName = 'message_templates';
  }

  const { data, error } = await supabase
    .from(tableName)
    .select('*')
    .eq('is_active', true)
    .order('touch_number', { ascending: true });

  if (error) {
    console.error('Error fetching templates:', error);
    return [];
  }

  return (data || []).map((t: any) => ({
    id: t.id,
    name: t.template_name,
    subject: t.subject || '',
    body: t.body,
    variables: t.variables || [],
    category,
  }));
}

/**
 * Get a single template by ID
 */
export async function getTemplateById(id: string, category: 'chase' | 'quote' | 'reminder' | 'crew'): Promise<EmailTemplate | null> {
  const tableName = category === 'chase' ? 'chase_templates' : 'message_templates';

  const { data, error } = await supabase
    .from(tableName)
    .select('*')
    .eq('id', id)
    .limit(1);

  if (error || !data || data.length === 0) {
    return null;
  }

  const t = data[0];
  return {
    id: t.id,
    name: t.template_name,
    subject: t.subject || '',
    body: t.body,
    variables: t.variables || [],
    category,
  };
}

/**
 * Replace template variables with actual values
 * Variables are in format: {{variable_name}}
 */
export function replaceVariables(template: string, context: TemplateContext): string {
  let result = template;

  for (const [key, value] of Object.entries(context)) {
    if (value !== undefined) {
      const regex = new RegExp(`\\{\\{${key}\\}\\}`, 'g');
      result = result.replace(regex, value);
    }
  }

  // Remove any unreplaced variables
  result = result.replace(/\{\{[^}]+\}\}/g, '');

  // Convert literal \n sequences to actual newlines
  result = result.replace(/\\n/g, '\n');

  return result;
}

/**
 * Prepare email content from template and context
 */
export function prepareEmailFromTemplate(
  template: EmailTemplate,
  context: TemplateContext
): { subject: string; body: string } {
  return {
    subject: replaceVariables(template.subject, context),
    body: replaceVariables(template.body, context),
  };
}
