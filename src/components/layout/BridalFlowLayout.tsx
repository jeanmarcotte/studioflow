'use client'

import { usePathname } from 'next/navigation'
import Link from 'next/link'
import { ClipboardList, Camera, Ticket, Users, MoreHorizontal, ExternalLink, Home, BarChart3, FileText } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { useState, useEffect } from 'react'

const bottomNavItems = [
  { label: 'Leads', icon: ClipboardList, href: '/leads' },
  { label: 'Scanner', icon: Camera, href: '/scanner' },
  { label: 'Ballot', icon: Ticket, href: '/ballot' },
  { label: 'Couples', icon: Users, href: '/admin/couples' },
] as const

const moreSheetLinks = [
  { label: 'StudioFlow', icon: Home, href: '/admin' },
  { label: 'Dashboard', icon: Home, href: '/admin' },
  { label: 'Reports', icon: BarChart3, href: '/admin/production/report' },
  { label: 'Scripts', icon: FileText, href: '/leads/settings' },
] as const

export function BridalFlowLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const [moreOpen, setMoreOpen] = useState(false)

  useEffect(() => {
    setMoreOpen(false)
  }, [pathname])

  const isActive = (href: string) => {
    if (href === '/leads') return pathname === '/leads' || pathname.startsWith('/leads/')
    return pathname === href || pathname.startsWith(href + '/')
  }

  const isMoreActive = moreSheetLinks.some(link => isActive(link.href))

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-30 h-12 flex items-center justify-between border-b bg-background px-4 print:hidden">
        <span className="text-lg font-semibold text-teal-700">BridalFlow</span>
      </header>

      {/* Page Content */}
      <main className="px-4 pb-20">
        {children}
      </main>

      {/* Bottom Nav — always visible (phone-first app) */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 h-16 bg-background border-t print:hidden">
        <div className="flex items-center justify-around h-full">
          {bottomNavItems.map(item => {
            const active = isActive(item.href)
            return (
              <Link
                key={item.href}
                href={item.href}
                className="flex flex-col items-center justify-center flex-1 h-full"
              >
                <item.icon className={cn("h-5 w-5", active ? "text-teal-600" : "text-gray-400")} />
                <span className={cn("text-[10px] mt-0.5", active ? "text-teal-600 font-semibold" : "text-gray-400")}>{item.label}</span>
              </Link>
            )
          })}
          <button
            onClick={() => setMoreOpen(true)}
            className="flex flex-col items-center justify-center flex-1 h-full"
          >
            <MoreHorizontal className={cn("h-5 w-5", isMoreActive ? "text-teal-600" : "text-gray-400")} />
            <span className={cn("text-[10px] mt-0.5", isMoreActive ? "text-teal-600 font-semibold" : "text-gray-400")}>More</span>
          </button>
        </div>
      </nav>

      {/* More Sheet */}
      <Sheet open={moreOpen} onOpenChange={setMoreOpen}>
        <SheetContent side="bottom" showCloseButton={false}>
          <SheetHeader>
            <SheetTitle>More</SheetTitle>
          </SheetHeader>
          <div className="grid grid-cols-3 gap-2 px-4 pb-6">
            {moreSheetLinks.map(link => (
              <Link
                key={link.href + link.label}
                href={link.href}
                onClick={() => setMoreOpen(false)}
                className="flex flex-col items-center gap-1.5 rounded-lg p-3 transition-colors hover:bg-accent"
              >
                <div className="relative">
                  <link.icon className="h-5 w-5 text-muted-foreground" />
                  {link.label === 'StudioFlow' && <ExternalLink className="h-2.5 w-2.5 absolute -top-1 -right-1.5 text-muted-foreground" />}
                </div>
                <span className="text-xs text-center text-muted-foreground">{link.label}</span>
              </Link>
            ))}
          </div>
        </SheetContent>
      </Sheet>
    </div>
  )
}
