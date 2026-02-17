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
