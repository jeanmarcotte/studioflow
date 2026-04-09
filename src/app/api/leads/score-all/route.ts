import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';
import { calculateBookScore, normalizeVenueName } from '@/lib/bookAlgorithm';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST() {
  try {
    // Fetch all ballots
    const { data: ballots, error: ballotError } = await supabase
      .from('ballots')
      .select('*')
      .order('created_at', { ascending: false });

    if (ballotError) {
      return NextResponse.json({ error: ballotError.message }, { status: 500 });
    }

    // Fetch all venue ratings for lookup
    const { data: venues } = await supabase
      .from('venue_ratings')
      .select('venue_name_normalized, score');

    const venueMap = new Map<string, number>();
    venues?.forEach(v => venueMap.set(v.venue_name_normalized, v.score));

    let updated = 0;
    let errors = 0;

    for (const lead of ballots || []) {
      try {
        // Lookup venue rating
        let venueRating: number | null = null;
        if (lead.venue_name) {
          const normalized = normalizeVenueName(lead.venue_name);
          venueRating = venueMap.get(normalized) ?? null;
        }

        // Determine day of week and peak season
        let dayOfWeek: string | null = null;
        let isPeakSeason = false;

        if (lead.wedding_date) {
          const weddingDate = new Date(lead.wedding_date);
          const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
          dayOfWeek = days[weddingDate.getDay()];

          const month = weddingDate.getMonth();
          isPeakSeason = month >= 4 && month <= 8;
        }

        // Calculate score — use inferred_ethnicity (actual column name)
        const result = calculateBookScore(
          lead.venue_name,
          venueRating,
          lead.inferred_ethnicity,
          lead.wedding_date ? new Date(lead.wedding_date) : null,
          new Date(lead.created_at),
          dayOfWeek,
          isPeakSeason
        );

        // Update ballot
        await supabase
          .from('ballots')
          .update({
            book_score: result.bookScore,
            venue_score: result.venueScore,
            culture_score: result.cultureScore,
            timing_score: result.timingScore,
            urgency_score: result.urgencyScore,
            days_since_inquiry: result.daysSinceInquiry,
            months_until_wedding: result.monthsUntilWedding,
            score_updated_at: new Date().toISOString(),
          })
          .eq('id', lead.id);

        updated++;
      } catch (e) {
        errors++;
        console.error(`Error scoring ballot ${lead.id}:`, e);
      }
    }

    return NextResponse.json({
      success: true,
      updated,
      errors,
      total: ballots?.length || 0
    });

  } catch (error) {
    console.error('Bulk score error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
