import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

console.log('Supabase Config:', {
  url: supabaseUrl,
  keyLength: supabaseAnonKey?.length,
  keyPrefix: supabaseAnonKey?.substring(0, 20) + '...'
})

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    debug: true,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true
  }
})

// Add auth state listener for debugging
supabase.auth.onAuthStateChange((event, session) => {
  console.log('Auth state change:', event, session)
})

// Auth helpers
export const getCurrentUser = async () => {
  const { data: { user }, error } = await supabase.auth.getUser()
  return { user, error }
}

export const signOut = async () => {
  const { error } = await supabase.auth.signOut()
  return { error }
}

export const signInWithGoogle = async () => {
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: `${window.location.origin}/auth/callback`,
    },
  })
  return { data, error }
}

export const checkAuthState = async () => {
  const { data: { session }, error } = await supabase.auth.getSession()
  return { session, error }
}

export const handleAuthCallback = async () => {
  const { data: { session }, error } = await supabase.auth.getSession()
  if (error || !session?.user) {
    return { user: null, error }
  }
  return { user: session.user, error: null }
}

// StudioFlow-specific database operations
export const getCouples = async () => {
  const { data, error } = await supabase
    .from('couples')
    .select('*')
    .order('wedding_date', { ascending: true })

  return { data, error }
}

// Fetch couples for sales pipeline: new leads + lookup data for static entries
export const getCouplesWithQuotes = async () => {
  // Fetch leads (new from quote builder) and booked (to enrich static list with coupleId)
  const { data: couples, error: couplesError } = await supabase
    .from('couples')
    .select('id, couple_name, wedding_date, lead_source, status, contract_total, created_at')
    .in('status', ['lead', 'booked', 'lost'])
    .order('created_at', { ascending: true })

  if (couplesError || !couples) {
    return { data: null, error: couplesError }
  }

  const coupleIds = couples.map(c => c.id)
  if (coupleIds.length === 0) return { data: [], error: null }

  const { data: quotes, error: quotesError } = await supabase
    .from('quotes')
    .select('couple_id, total, quote_date, created_at')
    .in('couple_id', coupleIds)
    .order('created_at', { ascending: false })

  if (quotesError) console.warn('Failed to fetch quotes:', quotesError)

  // Map: couple_id → latest quote (first seen per couple since ordered desc)
  const quoteMap: Record<string, { total: number | null; quote_date: string | null }> = {}
  if (quotes) {
    for (const q of quotes) {
      if (!quoteMap[q.couple_id]) {
        quoteMap[q.couple_id] = { total: q.total, quote_date: q.quote_date }
      }
    }
  }

  const result = couples.map(c => ({
    ...c,
    quote_total: quoteMap[c.id]?.total ?? null,
    quote_date: quoteMap[c.id]?.quote_date ?? null,
  }))

  return { data: result, error: null }
}

export const getCoupleBySlug = async (slug: string) => {
  const { data, error } = await supabase
    .from('couples')
    .select('*')
    .eq('slug', slug)
    .single()

  return { data, error }
}

export const createQuote = async (quoteData: any) => {
  const { data, error } = await supabase
    .from('quotes')
    .insert(quoteData)
    .select()
    .single()

  return { data, error }
}

// Find an existing couple by bride+groom names and wedding date, or create a new one
export const findOrCreateCouple = async (coupleInfo: {
  brideFirstName?: string
  brideLastName?: string
  groomFirstName?: string
  groomLastName?: string
  brideEmail?: string
  bridePhone?: string
  groomEmail?: string
  groomPhone?: string
  weddingDate: string
  ceremonyVenue?: string
  receptionVenue?: string
  leadSource?: string
}) => {
  const brideName = [coupleInfo.brideFirstName, coupleInfo.brideLastName].filter(Boolean).join(' ')
  const groomName = [coupleInfo.groomFirstName, coupleInfo.groomLastName].filter(Boolean).join(' ')
  const coupleName = [brideName, groomName].filter(Boolean).join(' & ')

  // Try to match existing couple by names + wedding date
  let query = supabase.from('couples').select('*')

  if (brideName) query = query.ilike('bride_name', brideName)
  if (groomName) query = query.ilike('groom_name', groomName)
  if (coupleInfo.weddingDate) query = query.eq('wedding_date', coupleInfo.weddingDate)

  const { data: existing } = await query.limit(1)

  if (existing && existing.length > 0) {
    return { data: existing[0], error: null, created: false }
  }

  // Create new couple record
  const weddingYear = coupleInfo.weddingDate ? new Date(coupleInfo.weddingDate).getFullYear() : null
  const { data, error } = await supabase
    .from('couples')
    .insert({
      couple_name: coupleName || 'Unnamed Couple',
      bride_name: brideName || null,
      groom_name: groomName || null,
      bride_email: coupleInfo.brideEmail || null,
      bride_phone: coupleInfo.bridePhone || null,
      groom_email: coupleInfo.groomEmail || null,
      groom_phone: coupleInfo.groomPhone || null,
      wedding_date: coupleInfo.weddingDate || null,
      wedding_year: weddingYear,
      ceremony_venue: coupleInfo.ceremonyVenue || null,
      reception_venue: coupleInfo.receptionVenue || null,
      lead_source: coupleInfo.leadSource || null,
      status: 'lead',
    })
    .select()
    .single()

  return { data, error, created: true }
}

// Upsert a quote with version tracking: inserts new or updates existing by couple_id
export const upsertQuote = async (coupleId: string, quotePayload: {
  quote_type: string
  items: any
  subtotal: number
  tax: number
  discount_type: string | null
  discount_value: number
  total: number
  form_data: any
  notes?: string
}) => {
  // Check for existing quote for this couple
  const { data: existing } = await supabase
    .from('quotes')
    .select('*')
    .eq('couple_id', coupleId)
    .order('created_at', { ascending: false })
    .limit(1)

  if (existing && existing.length > 0) {
    const current = existing[0]
    const newVersion = (current.version || 1) + 1

    // Build history entry from current state
    const historyEntry = {
      version: current.version || 1,
      saved_at: new Date().toISOString(),
      total: current.total,
      items: current.items,
      form_data: current.form_data,
    }
    const versionHistory = [...(current.version_history || []), historyEntry]

    const { data, error } = await supabase
      .from('quotes')
      .update({
        ...quotePayload,
        version: newVersion,
        version_history: versionHistory,
        quote_date: new Date().toISOString().split('T')[0],
      })
      .eq('id', current.id)
      .select()
      .single()

    return { data, error, isUpdate: true, version: newVersion }
  }

  // Insert new quote
  const { data, error } = await supabase
    .from('quotes')
    .insert({
      couple_id: coupleId,
      ...quotePayload,
      version: 1,
      version_history: [],
      quote_date: new Date().toISOString().split('T')[0],
      status: 'draft',
    })
    .select()
    .single()

  return { data, error, isUpdate: false, version: 1 }
}

// Get the latest quote for a couple (with full form_data for restoration)
export const getQuoteByCoupleId = async (coupleId: string) => {
  const { data, error } = await supabase
    .from('quotes')
    .select('*, couples(couple_name, bride_name, groom_name, wedding_date)')
    .eq('couple_id', coupleId)
    .order('created_at', { ascending: false })
    .limit(1)
    .single()

  return { data, error }
}

// Update couple status (used by Convert to Contract)
export const updateCoupleStatus = async (coupleId: string, status: string, booked_date?: string, contract_total?: number) => {
  const updates: Record<string, unknown> = { status }
  if (booked_date) updates.booked_date = booked_date
  if (contract_total !== undefined) updates.contract_total = contract_total

  const { data, error } = await supabase
    .from('couples')
    .update(updates)
    .eq('id', coupleId)
    .select()
    .single()

  return { data, error }
}

// Update quote status (used by Convert to Contract)
export const updateQuoteStatus = async (quoteId: string, status: string) => {
  const { data, error } = await supabase
    .from('quotes')
    .update({ status })
    .eq('id', quoteId)
    .select()
    .single()

  return { data, error }
}

// BridalFlow integration - search leads
export const searchLeadByCouple = async (brideName: string, groomName: string) => {
  const { data, error } = await supabase
    .from('ballots')
    .select('*')
    .ilike('bride_first_name', `%${brideName}%`)
    .ilike('groom_first_name', `%${groomName}%`)
    .limit(5)

  return { data, error }
}
