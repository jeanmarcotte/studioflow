'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { getCurrentUser } from '@/lib/supabase'

export default function HomePage() {
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    const checkUserAndRedirect = async () => {
      const { user, error } = await getCurrentUser()

      if (error || !user) {
        router.push('/login')
        return
      }

      // Check user preference or default to New Client Quote
      const preference = localStorage.getItem('studioflow-mode')

      if (preference === 'admin') {
        router.push('/admin/dashboard')
      } else {
        // Default: Go to primary StudioFlow feature
        router.push('/client/new-quote')
      }
    }

    checkUserAndRedirect()
  }, [router])

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-center space-y-4">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
        <div className="space-y-2">
          <h2 className="text-2xl font-semibold">StudioFlow</h2>
          <p className="text-muted-foreground">Loading your dashboard...</p>
          <p className="text-sm text-muted-foreground mt-4">Isaac is a BUTT!</p>
        </div>
      </div>
    </div>
  )
}
