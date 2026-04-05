'use client'

import { useState, useEffect } from 'react'
import { Search, Settings, Plus, Menu, Sun, Moon } from 'lucide-react'
import { useTheme } from 'next-themes'
import { Button } from '@/components/ui/button'
import { Nunito } from 'next/font/google'

const nunito = Nunito({ subsets: ['latin'], weight: ['400', '600', '700'] })

interface LeadsHeaderProps {
  onMenuToggle: () => void
}

export function LeadsHeader({ onMenuToggle }: LeadsHeaderProps) {
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])

  return (
    <header className={`${nunito.className} sticky top-0 z-30 bg-white dark:bg-gray-950 border-b border-border/60 px-4 py-3 md:px-6`}>
      <div className="flex items-center gap-3">
        {/* Mobile menu toggle */}
        <Button variant="ghost" size="icon" className="h-9 w-9 lg:hidden shrink-0" onClick={onMenuToggle}>
          <Menu className="h-5 w-5" />
        </Button>

        {/* Logo */}
        <span className="text-base font-bold text-[#0d4f4f] dark:text-teal-400 tracking-tight shrink-0">SIGS BridalFlow</span>

        {/* Search — pl-9 ensures text clears icon */}
        <div className="relative flex-1 max-w-xs hidden sm:block">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
          <input
            type="text"
            placeholder="Search..."
            className="w-full h-9 rounded-lg border border-border bg-muted/30 dark:bg-gray-900 text-sm outline-none focus:border-[#0d4f4f] focus:ring-1 focus:ring-[#0d4f4f]/20"
            style={{ paddingLeft: '2.25rem', paddingRight: '0.75rem' }}
          />
        </div>

        <div className="flex-1" />

        {/* Dark mode toggle */}
        {mounted && (
          <Button
            variant="ghost"
            size="icon"
            className="h-9 w-9 text-muted-foreground hover:text-foreground"
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
          >
            {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </Button>
        )}

        {/* Settings */}
        <Button variant="ghost" size="icon" className="h-9 w-9 hidden md:flex text-muted-foreground hover:text-foreground">
          <Settings className="h-4 w-4" />
        </Button>

        {/* Add Lead */}
        <Button className="h-9 px-3 text-sm font-semibold bg-[#0d4f4f] hover:bg-[#0d4f4f]/90 text-white rounded-lg">
          <Plus className="h-4 w-4 mr-1" /> Add Lead
        </Button>

        {/* User initials */}
        <div className="h-8 w-8 rounded-full bg-[#0d4f4f] text-white text-xs font-bold flex items-center justify-center shrink-0 cursor-pointer" title="Jean Marcotte">
          JM
        </div>
      </div>
    </header>
  )
}
