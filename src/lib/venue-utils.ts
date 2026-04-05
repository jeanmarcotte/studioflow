import { supabase } from '@/lib/supabase'

interface Venue {
  id: string
  venue_name: string
  city: string | null
  region: string | null
  jean_score: number | null
  c2_likelihood: string | null
  venue_type: string | null
}

export async function lookupVenue(venueName: string): Promise<Venue[]> {
  if (!venueName || venueName.length < 2) return []

  const { data } = await supabase
    .from('venues')
    .select('id, venue_name, city, region, jean_score, c2_likelihood, venue_type')
    .or(`venue_name.ilike.%${venueName}%,venue_name.ilike.${venueName}%`)
    .limit(5)

  return (data as Venue[]) || []
}

export async function autoRateVenue(ballotId: string, venue: Venue): Promise<void> {
  const updates: Record<string, any> = {}
  if (venue.jean_score != null) updates.venue_rating = venue.jean_score
  if (venue.venue_type) updates.venue_type = venue.venue_type

  if (Object.keys(updates).length > 0) {
    await supabase
      .from('ballots')
      .update(updates)
      .eq('id', ballotId)
  }
}
