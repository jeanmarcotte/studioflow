'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { Loader2 } from 'lucide-react'

export default function PortalPlaceholderPage() {
  const params = useParams()
  const router = useRouter()
  const slug = params.slug as string

  const [couple, setCouple] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function verifyAccess() {
      // Get current session
      const { data: { user } } = await supabase.auth.getUser()

      if (!user?.email) {
        router.replace('/portal/login')
        return
      }

      // Look up couple by slug
      const { data: coupleData } = await supabase
        .from('couples')
        .select('id, couple_name, bride_first_name, groom_first_name, email, portal_slug')
        .eq('portal_slug', slug)
        .limit(1)

      if (!coupleData || coupleData.length === 0) {
        router.replace('/portal/login?error=no_portal')
        return
      }

      const c = coupleData[0]

      // Verify the session email matches the couple's email
      if (user.email.toLowerCase() !== (c.email || '').toLowerCase()) {
        router.replace('/portal/login?error=wrong_couple')
        return
      }

      setCouple(c)
      setLoading(false)
    }

    verifyAccess()
  }, [slug, router])

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-teal-600" />
      </div>
    )
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.replace('/portal/login')
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-lg p-8 max-w-md w-full text-center">
        <div className="w-16 h-16 bg-teal-50 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg className="w-8 h-8 text-teal-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>

        <h1 className="text-2xl font-semibold text-gray-900 mb-2">
          Hello {couple?.bride_first_name} & {couple?.groom_first_name}!
        </h1>
        <p className="text-gray-500 mb-6">
          Your couples portal is being built. Check back soon for your wedding details, documents, and more.
        </p>

        <button
          onClick={handleLogout}
          className="px-6 py-2 border border-gray-300 rounded-lg text-sm text-gray-700 hover:bg-gray-50 transition-colors"
        >
          Log out
        </button>
      </div>
    </div>
  )
}
