import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';
import { inferCultureFromCouple } from '@/lib/cultureInference';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST() {
  try {
    const { data: ballots, error } = await supabase
      .from('ballots')
      .select('id, bride_last_name, groom_last_name, inferred_ethnicity')
      .is('inferred_ethnicity', null);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    let updated = 0;
    let skipped = 0;

    for (const ballot of ballots || []) {
      const culture = inferCultureFromCouple(
        ballot.bride_last_name,
        ballot.groom_last_name
      );

      if (culture) {
        await supabase
          .from('ballots')
          .update({
            inferred_ethnicity: culture,
            culture_confirmed: false,
          })
          .eq('id', ballot.id);
        updated++;
      } else {
        skipped++;
      }
    }

    return NextResponse.json({
      success: true,
      updated,
      skipped,
      total: ballots?.length || 0,
    });
  } catch (error) {
    console.error('Backfill error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
