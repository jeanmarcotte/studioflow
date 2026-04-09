import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';
import { calculateBookScore, normalizeVenueName } from '@/lib/bookAlgorithm';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: Request) {
  try {
    const { ballotId } = await request.json();

    // Fetch ballot
    const { data: ballot, error: ballotError } = await supabase
      .from('ballots')
      .select('*')
      .eq('id', ballotId)
      .limit(1);

    if (ballotError || !ballot || ballot.length === 0) {
      return NextResponse.json({ error: 'Ballot not found' }, { status: 404 });
    }

    const lead = ballot[0];

    // Lookup venue rating
    let venueRating: number | null = null;
    if (lead.venue_name) {
      const normalized = normalizeVenueName(lead.venue_name);
      const { data: venueData } = await supabase
        .from('venue_ratings')
        .select('score')
        .eq('venue_name_normalized', normalized)
        .limit(1);

      if (venueData && venueData.length > 0) {
        venueRating = venueData[0].score;
      }
    }

    // Determine day of week and peak season
    let dayOfWeek: string | null = null;
    let isPeakSeason = false;

    if (lead.wedding_date) {
      const weddingDate = new Date(lead.wedding_date);
      const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
      dayOfWeek = days[weddingDate.getDay()];

      const month = weddingDate.getMonth();
      isPeakSeason = month >= 4 && month <= 8; // May-September
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

    // Update ballot with scores
    const { error: updateError } = await supabase
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
      .eq('id', ballotId);

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      ...result
    });

  } catch (error) {
    console.error('Score calculation error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
