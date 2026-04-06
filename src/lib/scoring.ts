import { supabase } from '@/lib/supabase';

export interface ScoreBreakdown {
  baseScore: number;
  factors: Array<{
    name: string;
    points: number;
    reason: string;
  }>;
  totalScore: number;
  temperature: 'hot' | 'warm' | 'cool' | 'cold';
  badge: string;
}

interface Lead {
  id: string;
  has_photographer: boolean | null;
  has_videographer: boolean | null;
  has_venue: boolean | null;
  service_needs: string | null;
  wedding_date: string | null;
  guest_count: number | null;
  venue_name: string | null;
  budget_range: string | null;
  referral_source: string | null;
  last_contact_date: string | null;
  created_at: string;
  contact_count: number;
}

export function calculateScore(lead: Lead): ScoreBreakdown {
  const factors: ScoreBreakdown['factors'] = [];
  let score = 50; // Base score

  // Tier 1: Booking Probability
  if (lead.has_venue === true) {
    factors.push({ name: 'Has Venue', points: 15, reason: 'Venue booked' });
    score += 15;
  } else if (lead.has_venue === false) {
    factors.push({ name: 'No Venue', points: -10, reason: 'No venue yet' });
    score -= 10;
  }

  if (lead.has_photographer === false) {
    factors.push({ name: 'No Photographer', points: 15, reason: 'Needs photographer' });
    score += 15;
  } else if (lead.has_photographer === true) {
    factors.push({ name: 'Has Photographer', points: -30, reason: 'Already has photographer' });
    score -= 30;
  }

  if (lead.service_needs === 'photo_video') {
    factors.push({ name: 'Photo + Video', points: 10, reason: 'Wants both services' });
    score += 10;
  } else if (lead.service_needs === 'video_only') {
    factors.push({ name: 'Video Only', points: -25, reason: 'Video only - not our focus' });
    score -= 25;
  }

  // Tier 2: Timing
  if (lead.wedding_date) {
    const weddingDate = new Date(lead.wedding_date);
    const today = new Date();
    const weeksOut = Math.floor((weddingDate.getTime() - today.getTime()) / (7 * 24 * 60 * 60 * 1000));
    const dayOfWeek = weddingDate.getDay();

    if (dayOfWeek === 6) { // Saturday
      factors.push({ name: 'Saturday Wedding', points: 15, reason: 'Peak day' });
      score += 15;
    } else if (dayOfWeek === 0) { // Sunday
      factors.push({ name: 'Sunday Wedding', points: 10, reason: 'Good day' });
      score += 10;
    }

    if (weeksOut >= 8 && weeksOut <= 20) {
      factors.push({ name: 'Sweet Spot Timing', points: 10, reason: '8-20 weeks out' });
      score += 10;
    } else if (weeksOut < 4) {
      factors.push({ name: 'Too Soon', points: -10, reason: 'Less than 4 weeks' });
      score -= 10;
    }
  }

  // Tier 3: Revenue Potential
  if (lead.guest_count) {
    if (lead.guest_count >= 200) {
      factors.push({ name: 'Large Wedding', points: 15, reason: '200+ guests' });
      score += 15;
    } else if (lead.guest_count >= 150) {
      factors.push({ name: 'Medium Wedding', points: 10, reason: '150-199 guests' });
      score += 10;
    }
  }

  // Tier 4: Budget
  const budgetPoints: Record<string, number> = {
    'under_2k': -5,
    '2k_3k': 0,
    '3k_4k': 3,
    '4k_5k': 5,
    '5k_7k': 8,
    '7k_10k': 12,
    'over_10k': 15,
    'flexible': 5,
  };
  if (lead.budget_range && budgetPoints[lead.budget_range]) {
    const pts = budgetPoints[lead.budget_range];
    factors.push({ name: `Budget: ${lead.budget_range}`, points: pts, reason: 'Budget range' });
    score += pts;
  }

  // Tier 5: Lead Quality
  if (lead.referral_source === 'past_client') {
    factors.push({ name: 'Past Client Referral', points: 15, reason: 'Warm referral' });
    score += 15;
  } else if (lead.referral_source === 'planner') {
    factors.push({ name: 'Planner Referral', points: 15, reason: 'Professional referral' });
    score += 15;
  }

  // Tier 6: Staleness
  if (lead.last_contact_date) {
    const lastContact = new Date(lead.last_contact_date);
    const daysSince = Math.floor((Date.now() - lastContact.getTime()) / (24 * 60 * 60 * 1000));
    if (daysSince > 14) {
      factors.push({ name: 'Stale Lead', points: -15, reason: '15+ days since contact' });
      score -= 15;
    }
  } else if (lead.contact_count === 0) {
    const created = new Date(lead.created_at);
    const daysSince = Math.floor((Date.now() - created.getTime()) / (24 * 60 * 60 * 1000));
    if (daysSince <= 2) {
      factors.push({ name: 'Fresh Lead', points: 30, reason: '0-2 days old' });
      score += 30;
    } else if (daysSince <= 7) {
      factors.push({ name: 'Recent Lead', points: 15, reason: '3-7 days old' });
      score += 15;
    }
  }

  // Clamp score to 0-100
  score = Math.max(0, Math.min(100, score));

  // Determine temperature and badge
  let temperature: ScoreBreakdown['temperature'];
  let badge: string;

  if (score >= 85) {
    temperature = 'hot';
    badge = '🔥 HOT';
  } else if (score >= 70) {
    temperature = 'warm';
    badge = '🔴 CALL NOW';
  } else if (score >= 50) {
    temperature = 'cool';
    badge = '🟡 NURTURE';
  } else {
    temperature = 'cold';
    badge = '⚫ COLD';
  }

  return {
    baseScore: 50,
    factors,
    totalScore: score,
    temperature,
    badge,
  };
}

export async function updateLeadScore(leadId: string): Promise<ScoreBreakdown | null> {
  const { data: lead, error } = await supabase
    .from('ballots')
    .select('*')
    .eq('id', leadId)
    .limit(1);

  if (error || !lead || lead.length === 0) {
    console.error('Failed to fetch lead for scoring:', error);
    return null;
  }

  const scoreResult = calculateScore(lead[0]);

  const { error: updateError } = await supabase
    .from('ballots')
    .update({
      book_score: scoreResult.totalScore,
      score_breakdown: scoreResult,
      score_updated_at: new Date().toISOString(),
      temperature: scoreResult.temperature,
    })
    .eq('id', leadId);

  if (updateError) {
    console.error('Failed to update lead score:', updateError);
  }

  return scoreResult;
}
