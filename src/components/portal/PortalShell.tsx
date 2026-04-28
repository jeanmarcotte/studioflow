'use client'

import { usePathname } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { Home, CalendarDays, Wallet } from 'lucide-react'
import { Playfair_Display, DM_Sans } from 'next/font/google'
import { differenceInDays, parseISO } from 'date-fns'
import { formatWeddingDate } from '@/lib/formatters'

const playfair = Playfair_Display({ subsets: ['latin'], weight: ['700'] })
const dmSans = DM_Sans({ subsets: ['latin'], weight: ['400', '500', '600'] })

const GOLD = '#C9A84C'
const BG = '#FAFAF7'

interface PortalCouple {
  bride_first_name: string | null
  groom_first_name: string | null
  wedding_date: string | null
  portal_slug: string
}

interface Props {
  couple: PortalCouple
  children: React.ReactNode
}

export function PortalShell({ couple, children }: Props) {
  const pathname = usePathname()
  const slug = couple.portal_slug

  const weddingDate = couple.wedding_date ? parseISO(couple.wedding_date) : null
  const today = new Date()
  const daysUntil = weddingDate ? differenceInDays(weddingDate, today) : null

  const tabs = [
    { label: 'Home', href: `/portal/${slug}`, icon: Home },
    { label: 'Wedding Day', href: `/portal/${slug}/wedding-day`, icon: CalendarDays },
    { label: 'Payments', href: `/portal/${slug}/payments`, icon: Wallet },
  ]

  const isActive = (href: string) => {
    if (href === `/portal/${slug}`) return pathname === `/portal/${slug}`
    return pathname.startsWith(href)
  }

  const isHome = pathname === `/portal/${slug}`

  // Home page gets a full-width, scroll-snap layout — no header/tabs
  if (isHome) {
    return (
      <div className={dmSans.className} style={{ height: '100vh', overflow: 'hidden' }}>
        {children}
        {/* Mobile Bottom Nav */}
        <nav className="fixed bottom-0 left-0 right-0 bg-white border-t flex justify-around py-3 sm:hidden z-50" style={{ borderColor: '#e8e5df' }}>
          {tabs.map(tab => {
            const active = isActive(tab.href)
            return (
              <Link key={tab.href} href={tab.href} className="flex flex-col items-center gap-0.5">
                <tab.icon size={22} color={active ? '#0d9488' : '#aaa'} />
                <span className="text-[10px] font-medium" style={{ color: active ? '#0d9488' : '#aaa' }}>{tab.label}</span>
              </Link>
            )
          })}
        </nav>
      </div>
    )
  }

  return (
    <div className={dmSans.className} style={{ backgroundColor: BG, minHeight: '100vh' }}>
      {/* Header */}
      <header className="border-b" style={{ borderColor: '#e8e5df' }}>
        <div className="mx-auto px-4 py-4" style={{ maxWidth: 720 }}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Image src="/images/sigslogo.png" alt="SIGS Photography" width={100} height={33} priority />
            </div>
            <div className="text-right">
              <p className={`${playfair.className} text-base sm:text-lg`} style={{ color: '#1A1A1A' }}>
                {couple.bride_first_name} & {couple.groom_first_name}
              </p>
              <p className="text-xs" style={{ color: '#888' }}>{formatWeddingDate(couple.wedding_date)}</p>
            </div>
          </div>

          {/* Countdown */}
          {daysUntil !== null && (
            <div className="text-center mt-3">
              <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium" style={{ backgroundColor: '#f0f9f7', color: '#0d9488' }}>
                {daysUntil > 0 ? `${daysUntil} days to go` : daysUntil === 0 ? 'Today is the day!' : `Married ${Math.abs(daysUntil)} days`}
              </span>
            </div>
          )}

          {/* Desktop Tabs */}
          <nav className="hidden sm:flex justify-center gap-6 mt-4" role="tablist">
            {tabs.map(tab => {
              const active = isActive(tab.href)
              return (
                <Link
                  key={tab.href}
                  href={tab.href}
                  className="pb-2 text-sm font-medium transition-colors"
                  style={{
                    color: active ? '#0d9488' : '#999',
                    borderBottom: active ? '2px solid #0d9488' : '2px solid transparent',
                  }}
                >
                  {tab.label}
                </Link>
              )
            })}
          </nav>
        </div>
      </header>

      {/* Content */}
      <main className="mx-auto px-4 py-8 pb-24 sm:pb-8" style={{ maxWidth: 720 }}>
        {children}
      </main>

      {/* Mobile Bottom Nav */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t flex justify-around py-3 sm:hidden z-50" style={{ borderColor: '#e8e5df' }}>
        {tabs.map(tab => {
          const active = isActive(tab.href)
          return (
            <Link key={tab.href} href={tab.href} className="flex flex-col items-center gap-0.5">
              <tab.icon size={22} color={active ? '#0d9488' : '#aaa'} />
              <span className="text-[10px] font-medium" style={{ color: active ? '#0d9488' : '#aaa' }}>{tab.label}</span>
            </Link>
          )
        })}
      </nav>
    </div>
  )
}
