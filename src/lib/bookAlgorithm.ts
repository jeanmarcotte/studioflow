/**
 * BridalFlow Book Algorithm v2.0
 *
 * 4 Pareto Factors:
 * 1. Venue Quality (0-40 points)
 * 2. Cultural Background (0-30 points)
 * 3. Timing Sweet Spot (0-20 points)
 * 4. Response Urgency (0-10 points, negative decay)
 *
 * Base Score: 100
 * Max Score: 200
 * Min Score: 0
 */

// Cultural rankings (based on 25 years of booking data)
const CULTURE_SCORES: Record<string, number> = {
  'portuguese': 30,
  'greek': 30,
  'italian': 30,
  'filipino': 30,
  'jewish': 25,
  'trinidadian': 24,
  'caribbean': 24,
  'ghanaian': 24,
  'jamaican': 24,
  'spanish': 16,
  'mexican': 16,
  'venezuelan': 16,
  'colombian': 16,
  'south asian': 12,
  'indian': 12,
  'pakistani': 12,
  'canadian': 10,
  'chinese': 8,
  'korean': 8,
  'japanese': 8,
  'uk': 14,
  'irish': 14,
  'british': 14,
  'russian': 14,
  'european': 14,
  'muslim': 6,
  'unknown': 10,
};

// Private residence = 5/10
const PRIVATE_RESIDENCE_KEYWORDS = [
  'home', 'house', 'condo', 'apartment', 'backyard', 'residence', 'their place'
];

export interface LeadScoreResult {
  bookScore: number;
  venueScore: number;
  cultureScore: number;
  timingScore: number;
  urgencyScore: number;
  daysSinceInquiry: number;
  monthsUntilWedding: number;
  breakdown: string;
}

export function calculateBookScore(
  venueName: string | null,
  venueRating: number | null,
  culture: string | null,
  weddingDate: Date | null,
  inquiryDate: Date,
  dayOfWeek: string | null,
  isPeakSeason: boolean,
): LeadScoreResult {

  let venueScore = 0;
  let cultureScore = 0;
  let timingScore = 0;
  let urgencyScore = 0;

  const now = new Date();
  const daysSinceInquiry = Math.floor((now.getTime() - inquiryDate.getTime()) / (1000 * 60 * 60 * 24));

  let monthsUntilWedding = 0;
  if (weddingDate) {
    monthsUntilWedding = Math.floor((weddingDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24 * 30));
  }

  // ============================================
  // FACTOR 1: VENUE QUALITY (0-40 points)
  // ============================================
  if (venueName) {
    const venueNameLower = venueName.toLowerCase();

    const isPrivateResidence = PRIVATE_RESIDENCE_KEYWORDS.some(kw => venueNameLower.includes(kw));

    if (isPrivateResidence) {
      venueScore = 20; // 5/10 * 4 = 20
    } else if (venueRating !== null) {
      venueScore = venueRating * 4; // 10/10 = 40, 8/10 = 32, etc.
    } else {
      venueScore = 10; // Unknown venue with a name
    }
  }

  // ============================================
  // FACTOR 2: CULTURAL BACKGROUND (0-30 points)
  // ============================================
  if (culture) {
    const cultureLower = culture.toLowerCase().trim();
    cultureScore = CULTURE_SCORES[cultureLower] ?? CULTURE_SCORES['unknown'];
  } else {
    cultureScore = CULTURE_SCORES['unknown'];
  }

  // ============================================
  // FACTOR 3: TIMING SWEET SPOT (0-20 points)
  // ============================================
  if (monthsUntilWedding > 0) {
    if (monthsUntilWedding >= 10 && monthsUntilWedding <= 16) {
      timingScore = 20;
    } else if (monthsUntilWedding >= 8 && monthsUntilWedding <= 18) {
      timingScore = 15;
    } else if (monthsUntilWedding >= 6 && monthsUntilWedding <= 24) {
      timingScore = 10;
    } else if (monthsUntilWedding < 3) {
      timingScore = 5;
    } else {
      timingScore = 5;
    }
  }

  // ============================================
  // FACTOR 4: RESPONSE URGENCY (0-10 points, decays)
  // ============================================
  if (daysSinceInquiry === 0) {
    urgencyScore = 10;
  } else if (daysSinceInquiry === 1) {
    urgencyScore = 9;
  } else if (daysSinceInquiry === 2) {
    urgencyScore = 7;
  } else if (daysSinceInquiry === 3) {
    urgencyScore = 5;
  } else if (daysSinceInquiry <= 5) {
    urgencyScore = 3;
  } else if (daysSinceInquiry <= 7) {
    urgencyScore = 1;
  } else {
    urgencyScore = 0;
  }

  // ============================================
  // CONTEXT OVERRIDES (Business Logic)
  // ============================================
  let contextBonus = 0;
  let contextNote = '';

  if (dayOfWeek === 'friday' || dayOfWeek === 'sunday') {
    contextBonus += 10;
    contextNote += ' +10 Fri/Sun bonus;';
  }

  if (!isPeakSeason) {
    contextBonus += 5;
    contextNote += ' +5 off-peak bonus;';
  }

  // ============================================
  // FINAL CALCULATION
  // ============================================
  const baseScore = 100;
  const bookScore = Math.max(0, Math.min(200,
    baseScore + venueScore + cultureScore + timingScore + urgencyScore + contextBonus
  ));

  const breakdown = `Base:100 + Venue:${venueScore} + Culture:${cultureScore} + Timing:${timingScore} + Urgency:${urgencyScore}${contextNote} = ${bookScore}`;

  return {
    bookScore,
    venueScore,
    cultureScore,
    timingScore,
    urgencyScore,
    daysSinceInquiry,
    monthsUntilWedding,
    breakdown,
  };
}

export function normalizeVenueName(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '')
    .trim();
}
