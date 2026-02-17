'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase, handleAuthCallback } from '@/lib/supabase'

export default function AuthCallbackPage() {
  const router = useRouter()

  useEffect(() => {
    const processCallback = async () => {
      const { user, error } = await handleAuthCallback()

      if (error || !user) {
        console.log('Auth failed:', error)
        router.push('/login')
        return
      }

      const allowedEmails = ['jeanmarcotte@gmail.com', 'marianna@sigsphoto.ca']

      if (user.email && allowedEmails.includes(user.email)) {
        console.log('User authorized:', user.email)
        router.push('/client/new-quote')
      } else {
        console.log('Unauthorized email:', user.email)
        await supabase.auth.signOut()
        router.push('/login?error=unauthorized')
      }
    }

    const timer = setTimeout(processCallback, 100)
    return () => clearTimeout(timer)
  }, [router])

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-center space-y-4">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
        <p className="text-sm text-muted-foreground">Processing authentication...</p>
      </div>
    </div>
  )
}
