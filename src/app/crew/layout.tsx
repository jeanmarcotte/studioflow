'use client'

import { useEffect, useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { crewSupabase } from '@/lib/supabase-crew'
import { LogOut } from 'lucide-react'

const publicRoutes = ['/crew/login', '/crew/auth/callback']

export default function CrewLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const [checking, setChecking] = useState(true)
  const [authenticated, setAuthenticated] = useState(false)

  const isPublicRoute = publicRoutes.some((route) => pathname.startsWith(route))

  useEffect(() => {
    if (isPublicRoute) {
      setChecking(false)
      return
    }

    const checkAuth = async () => {
      const { data: { user } } = await crewSupabase.auth.getUser()
      if (!user) {
        router.push('/crew/login')
      } else {
        setAuthenticated(true)
      }
      setChecking(false)
    }

    checkAuth()
  }, [pathname, isPublicRoute, router])

  const handleSignOut = async () => {
    await crewSupabase.auth.signOut()
    router.push('/crew/login')
  }

  // Public routes render immediately without chrome
  if (isPublicRoute) {
    return <>{children}</>
  }

  // Show nothing while checking auth
  if (checking) {
    return (
      <div className="min-h-screen bg-stone-50 flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-teal-600 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (!authenticated) return null

  return (
    <div className="min-h-screen bg-stone-50">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-white border-b border-stone-200">
        <div className="flex items-center justify-between px-4 h-14">
          <div className="flex items-baseline gap-2">
            <span
              className="text-base text-stone-900"
              style={{ fontFamily: "'Playfair Display', serif", fontWeight: 700 }}
            >
              SIGS Photography
            </span>
            <span className="text-xs font-medium text-teal-700 uppercase tracking-wider">
              Crew
            </span>
          </div>
          <button
            onClick={handleSignOut}
            className="flex items-center gap-1.5 text-sm text-stone-500 hover:text-stone-700 transition-colors"
          >
            <LogOut className="h-4 w-4" />
            <span className="hidden sm:inline">Sign out</span>
          </button>
        </div>
      </header>

      {/* Content */}
      <main>{children}</main>
    </div>
  )
}
