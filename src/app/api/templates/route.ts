import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const category = searchParams.get('category') || 'chase';

  try {
    let tableName = 'chase_templates';
    if (category !== 'chase') {
      tableName = 'message_templates';
    }

    const { data, error } = await supabase
      .from(tableName)
      .select('*')
      .eq('is_active', true)
      .order('touch_number', { ascending: true });

    if (error) {
      console.error('Error fetching templates:', error);
      return NextResponse.json({ templates: [] });
    }

    const templates = (data || []).map((t: any) => ({
      id: t.id,
      name: t.template_name,
      subject: t.subject || '',
      body: t.body,
      variables: t.variables || [],
      category,
    }));

    return NextResponse.json({ templates });
  } catch (error) {
    console.error('Templates API error:', error);
    return NextResponse.json({ templates: [] });
  }
}
