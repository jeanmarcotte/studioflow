// ============================================
// SIGS PHOTOGRAPHY: Smart Paste Parser
// Extracts transactions from Interac e-Transfer text
// ============================================

export interface ParsedTransaction {
  date: Date;
  dateString: string; // Original format for display
  senderName: string;
  senderNameNormalized: string;
  amount: number;
  rawLine: string;
}

export interface MatchResult {
  transaction: ParsedTransaction;
  matchType: 'exact' | 'fuzzy' | 'none';
  matchedCoupleId: string | null;
  matchedCoupleName: string | null;
  matchedVia: 'payer_link' | 'bride_name' | 'groom_name' | null;
  confidence: number; // 0-100
  fuzzyMatches?: FuzzyMatch[]; // For yellow state - multiple possible matches
}

export interface FuzzyMatch {
  coupleId: string;
  coupleName: string;
  matchedName: string;
  similarity: number;
}

export interface PayerLink {
  id: string;
  couple_id: string;
  payer_name: string;
  payer_name_normalized: string;
  couple_name?: string;
}

export interface Couple {
  id: string;
  couple_name: string;
  bride_first_name: string | null;
  bride_last_name: string | null;
  groom_first_name: string | null;
  groom_last_name: string | null;
  wedding_date?: string | null;
}

// ============================================
// PARSER: Extract transactions from pasted text
// ============================================

/**
 * Parse raw Interac e-Transfer text from bank website
 * Handles multiple Canadian bank formats
 */
export function parseInteracText(rawText: string): ParsedTransaction[] {
  const transactions: ParsedTransaction[] = [];
  const lines = rawText.split('\n');
  
  // Patterns for different bank formats
  const patterns = [
    // TD Bank format: "Apr 15, 2026  JOHN SMITH  $500.00"
    /^([A-Za-z]{3}\s+\d{1,2},?\s+\d{4})\s+(.+?)\s+\$?([\d,]+\.?\d*)\s*$/,
    
    // RBC format: "2026-04-15  INTERAC e-Transfer from JOHN SMITH  500.00"
    /^(\d{4}-\d{2}-\d{2})\s+(?:INTERAC\s+e-Transfer\s+from\s+)?(.+?)\s+\$?([\d,]+\.?\d*)\s*$/i,
    
    // Scotiabank: "15/04/2026  e-Transfer  JOHN SMITH  $500.00"
    /^(\d{1,2}\/\d{1,2}\/\d{4})\s+(?:e-Transfer\s+)?(.+?)\s+\$?([\d,]+\.?\d*)\s*$/i,
    
    // BMO format: "April 15 2026  SMITH, JOHN  500.00 CAD"
    /^([A-Za-z]+\s+\d{1,2},?\s+\d{4})\s+(.+?)\s+\$?([\d,]+\.?\d*)\s*(?:CAD)?\s*$/i,
    
    // Generic: Date anywhere, name, amount with $ or without
    /(\d{4}-\d{2}-\d{2}|\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}|[A-Za-z]{3,9}\s+\d{1,2},?\s+\d{4})\s+(.+?)\s+\$?([\d,]+\.?\d*)$/,
    
    // Tab-separated (common in copy-paste)
    /^(.+?)\t+(.+?)\t+\$?([\d,]+\.?\d*)/,
  ];

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.length < 10) continue;
    
    // Skip header rows
    if (/^(date|transaction|description|amount|balance)/i.test(trimmed)) continue;
    
    for (const pattern of patterns) {
      const match = trimmed.match(pattern);
      if (match) {
        const [, dateStr, nameRaw, amountStr] = match;
        
        // Parse date
        const date = parseFlexibleDate(dateStr);
        if (!date) continue;
        
        // Clean amount
        const amount = parseFloat(amountStr.replace(/,/g, ''));
        if (isNaN(amount) || amount <= 0) continue;
        
        // Clean sender name
        const senderName = cleanSenderName(nameRaw);
        if (!senderName || senderName.length < 2) continue;
        
        transactions.push({
          date,
          dateString: dateStr.trim(),
          senderName,
          senderNameNormalized: normalizeName(senderName),
          amount,
          rawLine: trimmed,
        });
        
        break; // Found a match, move to next line
      }
    }
  }
  
  return transactions;
}

/**
 * Parse various date formats
 */
function parseFlexibleDate(dateStr: string): Date | null {
  const cleaned = dateStr.trim();
  
  // ISO format: 2026-04-15
  if (/^\d{4}-\d{2}-\d{2}$/.test(cleaned)) {
    return new Date(cleaned + 'T12:00:00');
  }
  
  // DD/MM/YYYY or MM/DD/YYYY
  const slashMatch = cleaned.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/);
  if (slashMatch) {
    let [, a, b, year] = slashMatch;
    if (year.length === 2) year = '20' + year;
    // Assume DD/MM/YYYY (Canadian format)
    const day = parseInt(a) > 12 ? parseInt(a) : parseInt(b);
    const month = parseInt(a) > 12 ? parseInt(b) : parseInt(a);
    return new Date(parseInt(year), month - 1, day, 12, 0, 0);
  }
  
  // "Apr 15, 2026" or "April 15 2026"
  const monthNameMatch = cleaned.match(/^([A-Za-z]+)\s+(\d{1,2}),?\s+(\d{4})$/);
  if (monthNameMatch) {
    const [, monthName, day, year] = monthNameMatch;
    const monthNum = parseMonthName(monthName);
    if (monthNum !== -1) {
      return new Date(parseInt(year), monthNum, parseInt(day), 12, 0, 0);
    }
  }
  
  // Try native Date parsing as fallback
  const parsed = new Date(cleaned);
  if (!isNaN(parsed.getTime())) {
    return parsed;
  }
  
  return null;
}

function parseMonthName(name: string): number {
  const months: Record<string, number> = {
    jan: 0, january: 0,
    feb: 1, february: 1,
    mar: 2, march: 2,
    apr: 3, april: 3,
    may: 4,
    jun: 5, june: 5,
    jul: 6, july: 6,
    aug: 7, august: 7,
    sep: 8, sept: 8, september: 8,
    oct: 9, october: 9,
    nov: 10, november: 10,
    dec: 11, december: 11,
  };
  return months[name.toLowerCase()] ?? -1;
}

/**
 * Clean sender name from bank text
 */
function cleanSenderName(raw: string): string {
  return raw
    .replace(/INTERAC\s+e-Transfer\s+from/gi, '')
    .replace(/e-Transfer/gi, '')
    .replace(/DEPOSIT/gi, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Normalize name for matching (uppercase, remove special chars, collapse spaces)
 */
export function normalizeName(name: string): string {
  return name
    .toUpperCase()
    .replace(/[''`]/g, '') // Remove apostrophes
    .replace(/[^A-Z0-9\s]/g, ' ') // Non-alphanumeric to space
    .replace(/\s+/g, ' ') // Collapse spaces
    .trim();
}

// ============================================
// MATCHER: Match transactions to couples
// ============================================

/**
 * Match a parsed transaction against payer_links and couples
 */
export function matchTransaction(
  transaction: ParsedTransaction,
  payerLinks: PayerLink[],
  couples: Couple[]
): MatchResult {
  const normalized = transaction.senderNameNormalized;
  
  // 1. EXACT MATCH: Check payer_links first
  const exactPayerLink = payerLinks.find(
    pl => pl.payer_name_normalized === normalized
  );
  
  if (exactPayerLink) {
    return {
      transaction,
      matchType: 'exact',
      matchedCoupleId: exactPayerLink.couple_id,
      matchedCoupleName: exactPayerLink.couple_name ?? null,
      matchedVia: 'payer_link',
      confidence: 100,
    };
  }
  
  // 2. EXACT MATCH: Check bride/groom names
  for (const couple of couples) {
    const brideFullNorm = normalizeName(
      `${couple.bride_first_name ?? ''} ${couple.bride_last_name ?? ''}`
    );
    const groomFullNorm = normalizeName(
      `${couple.groom_first_name ?? ''} ${couple.groom_last_name ?? ''}`
    );
    
    if (normalized === brideFullNorm && brideFullNorm.length > 3) {
      return {
        transaction,
        matchType: 'exact',
        matchedCoupleId: couple.id,
        matchedCoupleName: couple.couple_name,
        matchedVia: 'bride_name',
        confidence: 100,
      };
    }
    
    if (normalized === groomFullNorm && groomFullNorm.length > 3) {
      return {
        transaction,
        matchType: 'exact',
        matchedCoupleId: couple.id,
        matchedCoupleName: couple.couple_name,
        matchedVia: 'groom_name',
        confidence: 100,
      };
    }
  }
  
  // 3. FUZZY MATCH: Find similar names
  const fuzzyMatches: FuzzyMatch[] = [];
  const FUZZY_THRESHOLD = 0.75;
  
  // Check payer_links
  for (const pl of payerLinks) {
    const similarity = calculateSimilarity(normalized, pl.payer_name_normalized);
    if (similarity >= FUZZY_THRESHOLD && similarity < 1) {
      fuzzyMatches.push({
        coupleId: pl.couple_id,
        coupleName: pl.couple_name ?? 'Unknown',
        matchedName: pl.payer_name,
        similarity,
      });
    }
  }
  
  // Check bride/groom names
  for (const couple of couples) {
    const brideFullNorm = normalizeName(
      `${couple.bride_first_name ?? ''} ${couple.bride_last_name ?? ''}`
    );
    const groomFullNorm = normalizeName(
      `${couple.groom_first_name ?? ''} ${couple.groom_last_name ?? ''}`
    );
    
    if (brideFullNorm.length > 3) {
      const brideSim = calculateSimilarity(normalized, brideFullNorm);
      if (brideSim >= FUZZY_THRESHOLD && brideSim < 1) {
        fuzzyMatches.push({
          coupleId: couple.id,
          coupleName: couple.couple_name,
          matchedName: `${couple.bride_first_name} ${couple.bride_last_name}`,
          similarity: brideSim,
        });
      }
    }
    
    if (groomFullNorm.length > 3) {
      const groomSim = calculateSimilarity(normalized, groomFullNorm);
      if (groomSim >= FUZZY_THRESHOLD && groomSim < 1) {
        fuzzyMatches.push({
          coupleId: couple.id,
          coupleName: couple.couple_name,
          matchedName: `${couple.groom_first_name} ${couple.groom_last_name}`,
          similarity: groomSim,
        });
      }
    }
  }
  
  // Dedupe and sort fuzzy matches
  const uniqueFuzzy = dedupeAndSortFuzzyMatches(fuzzyMatches);
  
  if (uniqueFuzzy.length > 0) {
    const best = uniqueFuzzy[0];
    return {
      transaction,
      matchType: 'fuzzy',
      matchedCoupleId: best.coupleId,
      matchedCoupleName: best.coupleName,
      matchedVia: 'payer_link',
      confidence: Math.round(best.similarity * 100),
      fuzzyMatches: uniqueFuzzy,
    };
  }
  
  // 4. NO MATCH
  return {
    transaction,
    matchType: 'none',
    matchedCoupleId: null,
    matchedCoupleName: null,
    matchedVia: null,
    confidence: 0,
  };
}

/**
 * Calculate similarity between two strings (Levenshtein-based)
 */
function calculateSimilarity(a: string, b: string): number {
  if (a === b) return 1;
  if (a.length === 0 || b.length === 0) return 0;
  
  const distance = levenshteinDistance(a, b);
  const maxLen = Math.max(a.length, b.length);
  return 1 - distance / maxLen;
}

function levenshteinDistance(a: string, b: string): number {
  const matrix: number[][] = [];
  
  for (let i = 0; i <= b.length; i++) {
    matrix[i] = [i];
  }
  for (let j = 0; j <= a.length; j++) {
    matrix[0][j] = j;
  }
  
  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1, // substitution
          matrix[i][j - 1] + 1,     // insertion
          matrix[i - 1][j] + 1      // deletion
        );
      }
    }
  }
  
  return matrix[b.length][a.length];
}

function dedupeAndSortFuzzyMatches(matches: FuzzyMatch[]): FuzzyMatch[] {
  const seen = new Set<string>();
  const unique: FuzzyMatch[] = [];
  
  // Sort by similarity descending
  matches.sort((a, b) => b.similarity - a.similarity);
  
  for (const match of matches) {
    if (!seen.has(match.coupleId)) {
      seen.add(match.coupleId);
      unique.push(match);
    }
  }
  
  return unique.slice(0, 5); // Top 5 fuzzy matches
}

// ============================================
// BATCH PROCESSOR: Process all transactions
// ============================================

export interface BatchResult {
  total: number;
  exact: MatchResult[];
  fuzzy: MatchResult[];
  unmatched: MatchResult[];
}

export function processBatch(
  transactions: ParsedTransaction[],
  payerLinks: PayerLink[],
  couples: Couple[]
): BatchResult {
  const exact: MatchResult[] = [];
  const fuzzy: MatchResult[] = [];
  const unmatched: MatchResult[] = [];
  
  for (const txn of transactions) {
    const result = matchTransaction(txn, payerLinks, couples);
    
    switch (result.matchType) {
      case 'exact':
        exact.push(result);
        break;
      case 'fuzzy':
        fuzzy.push(result);
        break;
      case 'none':
        unmatched.push(result);
        break;
    }
  }
  
  return {
    total: transactions.length,
    exact,
    fuzzy,
    unmatched,
  };
}
