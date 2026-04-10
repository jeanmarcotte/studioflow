import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

const PERSONAL_CATEGORIES = ['housing', 'vehicles', 'insurance', 'kids', 'entertainment', 'telecom', 'utilities', 'credit'];
const BUSINESS_CATEGORIES = ['rent', 'software', 'banking', 'payroll', 'taxes', 'workers'];

function getPersonalSupabase() {
  return createClient(
    process.env.PERSONAL_SUPABASE_URL!,
    process.env.PERSONAL_SUPABASE_ANON_KEY!
  );
}

export async function GET() {
  try {
    const supabase = getPersonalSupabase();

    const { data, error } = await supabase
      .from('obligations')
      .select('*')
      .eq('is_active', true)
      .order('category', { ascending: true })
      .order('amount', { ascending: false });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const obligations = data || [];

    // Group by type, then by category
    const personal = obligations.filter((o: any) => o.type === 'personal');
    const business = obligations.filter((o: any) => o.type === 'business');

    const groupByCategory = (items: any[]) => {
      const groups: Record<string, any[]> = {};
      items.forEach(item => {
        const cat = item.category || 'other';
        if (!groups[cat]) groups[cat] = [];
        groups[cat].push(item);
      });
      return groups;
    };

    // Sort categories by predefined order
    const sortCategories = (groups: Record<string, any[]>, order: string[]) => {
      const sorted: { category: string; items: any[]; subtotal: number }[] = [];
      order.forEach(cat => {
        if (groups[cat]) {
          sorted.push({
            category: cat,
            items: groups[cat],
            subtotal: groups[cat].reduce((sum: number, o: any) => sum + parseFloat(o.amount || 0), 0),
          });
        }
      });
      // Add any categories not in the predefined order
      Object.keys(groups).forEach(cat => {
        if (!order.includes(cat)) {
          sorted.push({
            category: cat,
            items: groups[cat],
            subtotal: groups[cat].reduce((sum: number, o: any) => sum + parseFloat(o.amount || 0), 0),
          });
        }
      });
      return sorted;
    };

    const personalGroups = sortCategories(groupByCategory(personal), PERSONAL_CATEGORIES);
    const businessGroups = sortCategories(groupByCategory(business), BUSINESS_CATEGORIES);

    const personalTotal = personal.reduce((sum: number, o: any) => sum + parseFloat(o.amount || 0), 0);
    const businessTotal = business.reduce((sum: number, o: any) => sum + parseFloat(o.amount || 0), 0);
    const autoPayItems = obligations.filter((o: any) => o.auto_pay);
    const manualItems = obligations.filter((o: any) => !o.auto_pay);

    return NextResponse.json({
      personal: personalGroups,
      business: businessGroups,
      summary: {
        total: personalTotal + businessTotal,
        totalCount: obligations.length,
        personal: personalTotal,
        personalCount: personal.length,
        business: businessTotal,
        businessCount: business.length,
        autoPay: autoPayItems.reduce((sum: number, o: any) => sum + parseFloat(o.amount || 0), 0),
        autoPayCount: autoPayItems.length,
        manual: manualItems.reduce((sum: number, o: any) => sum + parseFloat(o.amount || 0), 0),
        manualCount: manualItems.length,
      },
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
