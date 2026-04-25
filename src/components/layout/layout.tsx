'use client'

import { useState, useEffect } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import Link from 'next/link'
import { supabase, getCurrentUser } from '@/lib/supabase'
import { SidebarConfig, SidebarItem } from '@/config/sidebar'
import { cn } from '@/lib/utils'
import { Menu, Settings, LogOut, ChevronDown, ChevronRight, Home, Users, Camera, Video, MoreHorizontal, X, DollarSign, ShoppingBag, FileCheck, FileText, Wallet, UsersRound, CalendarCheck, BarChart3, ClipboardList, ExternalLink } from 'lucide-react'
import { ThemeToggle } from '@/components/ui/theme-toggle'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'

interface LayoutProps {
  children: React.ReactNode
  sidebarConfig: SidebarConfig
}

const bottomNavItems = [
  { label: 'Home', icon: Home, href: '/admin' },
  { label: 'Couples', icon: Users, href: '/admin/couples' },
  { label: 'Photo', icon: Camera, href: '/admin/production/photo' },
  { label: 'Video', icon: Video, href: '/admin/production/video' },
] as const

const moreSheetLinks = [
  { label: 'Sales', icon: DollarSign, href: '/admin/sales/quotes' },
  { label: 'Frames & Albums', icon: ShoppingBag, href: '/admin/sales/frames' },
  { label: 'Orders', icon: FileCheck, href: '/admin/orders' },
  { label: 'Documents', icon: FileText, href: '/admin/documents' },
  { label: 'Finance', icon: Wallet, href: '/admin/finance' },
  { label: 'Team', icon: UsersRound, href: '/admin/team/members' },
  { label: 'Wedding Day', icon: CalendarCheck, href: '/admin/wedding-day/forms' },
  { label: 'Marketing', icon: BarChart3, href: '/admin/marketing/sigs-seo' },
  { label: 'BridalFlow', icon: ClipboardList, href: '/leads' },
  { label: 'Settings', icon: Settings, href: '/admin/settings' },
] as const

export function Layout({ children, sidebarConfig }: LayoutProps) {
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [moreSheetOpen, setMoreSheetOpen] = useState(false)
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false)
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set())
  const router = useRouter()
  const pathname = usePathname()

  // Auto-expand sidebar section that contains the current page
  useEffect(() => {
    const expanded = new Set<string>()
    for (const section of sidebarConfig.sections) {
      for (const item of section.items) {
        if (item.children) {
          for (const child of item.children) {
            if (child.href && pathname === child.href) {
              expanded.add(item.title)
            }
          }
        }
      }
    }
    if (expanded.size > 0) {
      setExpandedSections(prev => {
        const next = new Set(prev)
        expanded.forEach(s => next.add(s))
        return next
      })
    }
  }, [pathname, sidebarConfig])

  // Close mobile menu on route change
  useEffect(() => {
    setMobileMenuOpen(false)
    setMoreSheetOpen(false)
  }, [pathname])

  useEffect(() => {
    const checkUser = async () => {
      const { user, error } = await getCurrentUser()
      if (error || !user) {
        router.push('/login')
        return
      }
      setUser(user)
      setLoading(false)
    }

    checkUser()

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_OUT' || !session) {
        router.push('/login')
      } else if (session) {
        setUser(session.user)
        setLoading(false)
      }
    })

    return () => subscription.unsubscribe()
  }, [router])

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    router.push('/login')
  }

  const toggleSection = (title: string) => {
    setExpandedSections(prev => {
      const next = new Set(prev)
      if (next.has(title)) next.delete(title)
      else next.add(title)
      return next
    })
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <div className="space-y-2">
            <h2 className="text-2xl font-semibold">StudioFlow</h2>
            <p className="text-muted-foreground">Loading your dashboard...</p>
          </div>
        </div>
      </div>
    )
  }

  const userName = user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'User'
  const userEmail = user?.email
  const userAvatar = user?.user_metadata?.avatar_url || '/default-avatar.png'

  const isActive = (href?: string) => {
    if (!href) return false
    if (href === '/admin') return pathname === '/admin'
    return pathname === href || pathname.startsWith(href + '/')
  }

  // Check if any bottom nav item is active (for "More" highlight)
  const isMoreActive = moreSheetLinks.some(link => isActive(link.href))

  const renderSidebarItem = (item: SidebarItem, itemIndex: number, onNavigate?: () => void) => {
    // Collapsible parent with children
    if (item.children && item.children.length > 0) {
      const isExpanded = expandedSections.has(item.title)
      const hasActiveChild = item.children.some(c => isActive(c.href))

      return (
        <li key={itemIndex}>
          <button
            onClick={() => toggleSection(item.title)}
            className={cn(
              "flex items-center w-full rounded-lg px-3 py-2 text-sm transition-colors",
              "hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
              hasActiveChild && "text-sidebar-accent-foreground font-medium"
            )}
          >
            <item.icon className="h-4 w-4 flex-shrink-0" />
            {!sidebarCollapsed && (
              <>
                <span className="flex-1 text-left ml-3">{item.title}</span>
                <ChevronRight className={cn(
                  "h-3.5 w-3.5 transition-transform duration-200",
                  isExpanded && "rotate-90"
                )} />
              </>
            )}
          </button>
          {isExpanded && !sidebarCollapsed && (
            <ul className="mt-1 ml-4 space-y-0.5 border-l border-border pl-3">
              {item.children.map((child, childIndex) => (
                <li key={childIndex}>
                  <Link
                    href={child.href || '#'}
                    onClick={onNavigate}
                    className={cn(
                      "flex items-center space-x-3 rounded-lg px-3 py-1.5 text-sm transition-colors",
                      isActive(child.href)
                        ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium"
                        : "hover:bg-sidebar-accent hover:text-sidebar-accent-foreground text-muted-foreground"
                    )}
                  >
                    <child.icon className="h-3.5 w-3.5 flex-shrink-0" />
                    <span>{child.title}</span>
                    {child.badge && (
                      <span className="rounded-full bg-primary px-2 py-0.5 text-xs text-primary-foreground">
                        {child.badge}
                      </span>
                    )}
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </li>
      )
    }

    // Direct link (no children)
    if (item.external) {
      return (
        <li key={itemIndex}>
          <a
            href={item.href}
            target="_blank"
            rel="noopener noreferrer"
            onClick={onNavigate}
            className="flex items-center space-x-3 rounded-lg px-3 py-2 text-sm transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
          >
            <item.icon className="h-4 w-4 flex-shrink-0" />
            {!sidebarCollapsed && <span className="flex-1">{item.title}</span>}
          </a>
        </li>
      )
    }

    return (
      <li key={itemIndex}>
        <Link
          href={item.href || '#'}
          onClick={onNavigate}
          className={cn(
            "flex items-center space-x-3 rounded-lg px-3 py-2 text-sm transition-colors",
            item.disabled
              ? "text-muted-foreground cursor-not-allowed opacity-50"
              : isActive(item.href)
                ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium"
                : "hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
          )}
        >
          <item.icon className="h-4 w-4 flex-shrink-0" />
          {!sidebarCollapsed && (
            <>
              <span className="flex-1">{item.title}</span>
              {item.badge && (
                <span className="rounded-full bg-primary px-2 py-0.5 text-xs text-primary-foreground">
                  {item.badge}
                </span>
              )}
            </>
          )}
        </Link>
      </li>
    )
  }

  // Sidebar navigation content — shared between desktop sidebar and mobile overlay
  const sidebarNav = (onNavigate?: () => void) => (
    <nav className="flex-1 overflow-y-auto p-4">
      {sidebarConfig.sections.map((section, sectionIndex) => (
        <div key={sectionIndex} className="mb-6">
          {section.title && !sidebarCollapsed && (
            <h3 className="mb-2 px-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              {section.title}
            </h3>
          )}
          <ul className="space-y-1">
            {section.items.map((item, itemIndex) => renderSidebarItem(item, itemIndex, onNavigate))}
          </ul>
        </div>
      ))}
    </nav>
  )

  return (
    <div className="min-h-screen bg-background">
      {/* Desktop Sidebar — hidden on mobile */}
      <aside className={cn(
        "fixed left-0 top-0 z-40 h-screen bg-card border-r transition-all duration-300 print:hidden hidden md:block",
        sidebarCollapsed ? "w-16" : "w-64"
      )}>
        {/* Logo */}
        <div className="flex items-center h-16 px-4 border-b">
          <Link href={sidebarConfig.logo.href} className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-primary rounded flex items-center justify-center">
              <span className="text-primary-foreground font-bold text-sm">SF</span>
            </div>
            {!sidebarCollapsed && sidebarConfig.logo.text && (
              <span className="font-semibold">{sidebarConfig.logo.text}</span>
            )}
          </Link>
        </div>

        {sidebarNav()}
      </aside>

      {/* Mobile Sidebar Overlay */}
      <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
        <SheetContent side="left" className="w-64 p-0 md:hidden" showCloseButton={false}>
          {/* Logo + Close */}
          <div className="flex items-center justify-between h-16 px-4 border-b">
            <Link href={sidebarConfig.logo.href} className="flex items-center space-x-2" onClick={() => setMobileMenuOpen(false)}>
              <div className="w-8 h-8 bg-primary rounded flex items-center justify-center">
                <span className="text-primary-foreground font-bold text-sm">SF</span>
              </div>
              {sidebarConfig.logo.text && (
                <span className="font-semibold">{sidebarConfig.logo.text}</span>
              )}
            </Link>
            <button onClick={() => setMobileMenuOpen(false)} className="rounded-lg p-2 hover:bg-accent">
              <X className="h-4 w-4" />
            </button>
          </div>

          {sidebarNav(() => setMobileMenuOpen(false))}
        </SheetContent>
      </Sheet>

      {/* Main Content */}
      <div className={cn(
        "transition-all duration-300 print:ml-0",
        sidebarCollapsed ? "md:ml-16" : "md:ml-64"
      )}>
        {/* Header */}
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b bg-background px-6 print:hidden">
          <div className="flex items-center space-x-4">
            <button
              onClick={() => {
                // Mobile: toggle overlay sidebar. Desktop: toggle collapse
                if (window.innerWidth < 768) {
                  setMobileMenuOpen(!mobileMenuOpen)
                } else {
                  setSidebarCollapsed(!sidebarCollapsed)
                }
              }}
              className="rounded-lg p-2 hover:bg-accent"
            >
              <Menu className="h-4 w-4" />
            </button>
          </div>

          {/* User Actions */}
          <div className="flex items-center gap-2">
          <ThemeToggle />

          {/* User Profile Dropdown */}
          <div className="relative">
            <button
              onClick={() => setProfileDropdownOpen(!profileDropdownOpen)}
              className="flex items-center space-x-3 rounded-lg p-2 hover:bg-accent transition-colors"
            >
              <img
                src={userAvatar}
                alt={userName}
                className="h-8 w-8 rounded-full"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = '/default-avatar.png'
                }}
              />
              <div className="hidden md:block text-left">
                <div className="text-sm font-medium">{userName}</div>
                <div className="text-xs text-muted-foreground">{userEmail}</div>
              </div>
              <ChevronDown className="h-4 w-4" />
            </button>

            {profileDropdownOpen && (
              <>
                <div
                  className="fixed inset-0 z-10"
                  onClick={() => setProfileDropdownOpen(false)}
                />
                <div className="absolute right-0 top-full z-20 mt-2 w-64 rounded-lg border bg-popover p-2 shadow-lg">
                  {/* User Info */}
                  <div className="border-b border-border pb-2 mb-2">
                    <div className="flex items-center space-x-3 p-2">
                      <img
                        src={userAvatar}
                        alt={userName}
                        className="h-10 w-10 rounded-full"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = '/default-avatar.png'
                        }}
                      />
                      <div>
                        <div className="font-medium">{userName}</div>
                        <div className="text-sm text-muted-foreground">{userEmail}</div>
                      </div>
                    </div>
                  </div>

                  {/* Menu Items */}
                  <div className="space-y-1">
                    <Link
                      href="/admin/settings"
                      onClick={() => setProfileDropdownOpen(false)}
                      className="flex w-full items-center space-x-3 rounded-lg p-2 text-left hover:bg-accent transition-colors"
                    >
                      <Settings className="h-4 w-4" />
                      <span>Settings</span>
                    </Link>

                    <button
                      onClick={handleSignOut}
                      className="flex w-full items-center space-x-3 rounded-lg p-2 text-left hover:bg-accent transition-colors text-red-600"
                    >
                      <LogOut className="h-4 w-4" />
                      <span>Log out</span>
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
          </div>
        </header>

        {/* Page Content — pb-20 on mobile for bottom nav clearance */}
        <main className="p-6 pb-20 md:pb-6">
          {children}
        </main>
      </div>

      {/* Mobile Bottom Nav — hidden on md+ */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 h-16 bg-background border-t md:hidden print:hidden">
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
            onClick={() => setMoreSheetOpen(true)}
            className="flex flex-col items-center justify-center flex-1 h-full"
          >
            <MoreHorizontal className={cn("h-5 w-5", isMoreActive ? "text-teal-600" : "text-gray-400")} />
            <span className={cn("text-[10px] mt-0.5", isMoreActive ? "text-teal-600 font-semibold" : "text-gray-400")}>More</span>
          </button>
        </div>
      </nav>

      {/* More Sheet — slide up from bottom */}
      <Sheet open={moreSheetOpen} onOpenChange={setMoreSheetOpen}>
        <SheetContent side="bottom" className="md:hidden" showCloseButton={false}>
          <SheetHeader>
            <SheetTitle>More</SheetTitle>
          </SheetHeader>
          <div className="grid grid-cols-3 gap-2 px-4 pb-6">
            {moreSheetLinks.map(link => {
              const active = isActive(link.href)
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setMoreSheetOpen(false)}
                  className={cn(
                    "flex flex-col items-center gap-1.5 rounded-lg p-3 transition-colors",
                    active ? "bg-teal-50 dark:bg-teal-950" : "hover:bg-accent"
                  )}
                >
                  <div className="relative">
                    <link.icon className={cn("h-5 w-5", active ? "text-teal-600" : "text-muted-foreground")} />
                    {link.label === 'BridalFlow' && <ExternalLink className="h-2.5 w-2.5 absolute -top-1 -right-1.5 text-muted-foreground" />}
                  </div>
                  <span className={cn("text-xs text-center", active ? "text-teal-600 font-semibold" : "text-muted-foreground")}>{link.label}</span>
                </Link>
              )
            })}
          </div>
        </SheetContent>
      </Sheet>
    </div>
  )
}
