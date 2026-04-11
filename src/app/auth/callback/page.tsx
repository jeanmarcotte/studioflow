'use client'

import { useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

export default function AuthCallbackPage() {
  const router = useRouter()
  const handled = useRef(false)

  useEffect(() => {
    const allowedEmails = ['jeanmarcotte@gmail.com', 'marianna@sigsphoto.ca', 'mariannakogan@gmail.com']

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (handled.current) return
      if (event === 'SIGNED_IN' && session?.user) {
        handled.current = true
        const user = session.user

        if (user.email && allowedEmails.includes(user.email)) {
          console.log('User authorized:', user.email)
          router.push('/leads')
        } else {
          console.log('Unauthorized email:', user.email)
          await supabase.auth.signOut()
          router.push('/login?error=unauthorized')
        }
      }
    })

    // Fallback: if auth state doesn't fire within 5s, redirect to login
    const timeout = setTimeout(() => {
      if (!handled.current) {
        handled.current = true
        console.log('Auth callback timeout — redirecting to login')
        router.push('/login')
      }
    }, 5000)

    return () => {
      subscription.unsubscribe()
      clearTimeout(timeout)
    }
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
