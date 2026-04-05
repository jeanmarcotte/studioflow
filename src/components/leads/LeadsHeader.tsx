'use client'

import { Search, Download, Settings, Plus, Menu } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Nunito } from 'next/font/google'

const nunito = Nunito({ subsets: ['latin'], weight: ['400', '600', '700'] })

interface LeadsHeaderProps {
  onMenuToggle: () => void
}

export function LeadsHeader({ onMenuToggle }: LeadsHeaderProps) {
  return (
    <header className={`${nunito.className} sticky top-0 z-30 bg-white dark:bg-gray-950 border-b border-border/60 px-4 py-3 md:px-6 rounded-t-lg`}>
      <div className="flex items-center gap-3">
        {/* Mobile menu toggle */}
        <Button variant="ghost" size="icon" className="h-9 w-9 lg:hidden shrink-0" onClick={onMenuToggle}>
          <Menu className="h-5 w-5" />
        </Button>

        {/* Logo */}
        <span className="text-base font-bold text-[#0d4f4f] dark:text-teal-400 tracking-tight shrink-0">SIGS BridalFlow</span>

        {/* Search */}
        <div className="relative flex-1 max-w-xs hidden sm:block">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
          <input
            type="text"
            placeholder="Search..."
            className="w-full h-9 rounded-lg border border-border bg-muted/30 dark:bg-gray-900 pl-9 pr-3 text-sm outline-none focus:border-[#0d4f4f] focus:ring-1 focus:ring-[#0d4f4f]/20"
          />
        </div>

        <div className="flex-1" />

        {/* Right-side icons */}
        <Button variant="ghost" size="icon" className="h-9 w-9 hidden md:flex text-muted-foreground hover:text-foreground">
          <Download className="h-4 w-4" />
        </Button>
        <Button variant="ghost" size="icon" className="h-9 w-9 hidden md:flex text-muted-foreground hover:text-foreground">
          <Settings className="h-4 w-4" />
        </Button>
        <Button className="h-9 px-3 text-sm font-semibold bg-[#0d4f4f] hover:bg-[#0d4f4f]/90 text-white rounded-lg">
          <Plus className="h-4 w-4 mr-1" /> Add Lead
        </Button>
      </div>
    </header>
  )
}
