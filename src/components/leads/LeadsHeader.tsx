'use client'

import { useState, useEffect } from 'react'
import { Search, Settings, Plus, Menu, Sun, Moon, X, Phone, MessageSquare, Mail, BarChart3, RefreshCw } from 'lucide-react'
import { useTheme } from 'next-themes'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Nunito } from 'next/font/google'
import Link from 'next/link'

const nunito = Nunito({ subsets: ['latin'], weight: ['400', '600', '700'] })

interface LeadsHeaderProps {
  onMenuToggle: () => void
  onAddLead?: () => void
  searchQuery?: string
  onSearchChange?: (query: string) => void
  sourceFilter?: React.ReactNode
  onRecalculateScores?: () => void
  recalculating?: boolean
}

export function LeadsHeader({ onMenuToggle, onAddLead, searchQuery, onSearchChange, sourceFilter, onRecalculateScores, recalculating }: LeadsHeaderProps) {
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)
  const [legendOpen, setLegendOpen] = useState(false)
  useEffect(() => setMounted(true), [])

  return (
    <>
      <header className={`${nunito.className} sticky top-0 z-30 bg-white dark:bg-gray-950 border-b border-border/60 px-4 py-3 md:px-6`}>
        {/* Row 1: Menu, Source Filter, Icons, +Add (desktop only) */}
        <div className="flex items-center gap-3">
          {/* Mobile menu toggle */}
          <Button variant="ghost" size="icon" className="h-9 w-9 lg:hidden shrink-0" onClick={onMenuToggle}>
            <Menu className="h-5 w-5" />
          </Button>

          {/* Search — desktop only */}
          <div className="relative hidden sm:block">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search leads..."
              className="pl-9 w-64"
              value={searchQuery ?? ''}
              onChange={(e) => onSearchChange?.(e.target.value)}
            />
          </div>

          {/* Source Filter */}
          {sourceFilter}

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

          {/* Recalculate Scores */}
          {onRecalculateScores && (
            <Button
              variant="ghost"
              size="icon"
              className="h-9 w-9 text-muted-foreground hover:text-foreground"
              onClick={onRecalculateScores}
              disabled={recalculating}
              title="Recalculate all scores"
            >
              <RefreshCw className={`h-4 w-4 ${recalculating ? 'animate-spin' : ''}`} />
            </Button>
          )}

          {/* Analytics */}
          <Link href="/leads/analytics">
            <Button variant="ghost" size="icon" className="h-9 w-9 text-muted-foreground hover:text-foreground" title="Analytics">
              <BarChart3 className="h-4 w-4" />
            </Button>
          </Link>

          {/* Settings / Legend */}
          <Button variant="ghost" size="icon" className="h-9 w-9 text-muted-foreground hover:text-foreground" onClick={() => setLegendOpen(true)} title="Legend">
            <Settings className="h-4 w-4" />
          </Button>

          {/* Add Lead — desktop only */}
          <Button className="hidden sm:inline-flex h-9 px-3 text-sm font-semibold bg-[#0d4f4f] hover:bg-[#0d4f4f]/90 text-white rounded-lg" onClick={onAddLead}>
            <Plus className="h-4 w-4 mr-1" /> Add Lead
          </Button>

        </div>

        {/* Row 2: Search + compact +New — mobile only */}
        <div className="flex sm:hidden items-center gap-2 mt-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search leads..."
              className="pl-9 w-full h-9"
              value={searchQuery ?? ''}
              onChange={(e) => onSearchChange?.(e.target.value)}
            />
          </div>
          <Button className="h-9 px-3 text-sm font-semibold bg-[#0d4f4f] hover:bg-[#0d4f4f]/90 text-white rounded-lg shrink-0" onClick={onAddLead}>
            <Plus className="h-4 w-4" /> New
          </Button>
        </div>
      </header>

      {/* Legend Dialog */}
      <Dialog open={legendOpen} onOpenChange={setLegendOpen}>
        <DialogContent className="sm:max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold">Legend — Understanding Lead Cards</DialogTitle>
          </DialogHeader>

          <div className="space-y-5 text-sm">
            {/* Score Badges */}
            <section>
              <h3 className="font-bold text-slate-800 dark:text-slate-200 mb-2">Score Badges</h3>
              <div className="grid grid-cols-2 gap-1.5">
                {[
                  { range: '165–200', tier: 'A-TIER', color: 'bg-green-100 text-green-700', desc: 'Hot lead!' },
                  { range: '150–164', tier: 'B-TIER', color: 'bg-teal-100 text-teal-700', desc: '' },
                  { range: '135–149', tier: 'C-TIER', color: 'bg-yellow-100 text-yellow-700', desc: '' },
                  { range: '120–134', tier: 'D-TIER', color: 'bg-orange-100 text-orange-700', desc: '' },
                  { range: '105–119', tier: 'E-TIER', color: 'bg-red-100 text-red-700', desc: '' },
                  { range: '0–104', tier: 'F-TIER', color: 'bg-gray-100 text-gray-500', desc: 'Cold lead' },
                ].map(s => (
                  <div key={s.tier} className="flex items-center gap-2">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-bold ${s.color}`}>{s.range}</span>
                    <span className="text-slate-600 dark:text-slate-400">{s.tier}{s.desc ? ` — ${s.desc}` : ''}</span>
                  </div>
                ))}
              </div>
            </section>

            {/* Temperature */}
            <section>
              <h3 className="font-bold text-slate-800 dark:text-slate-200 mb-2">Temperature</h3>
              <div className="space-y-1">
                {[
                  { emoji: '🟢', label: 'HOT', desc: 'New lead OR contacted < 24 hours ago' },
                  { emoji: '🟡', label: 'WARM', desc: 'Contacted 24–48 hours ago' },
                  { emoji: '🟠', label: 'COOL', desc: 'Contacted 48–72 hours ago' },
                  { emoji: '🔴', label: 'COLD', desc: 'Contacted 72+ hours ago' },
                ].map(t => (
                  <div key={t.label} className="flex items-center gap-2">
                    <span>{t.emoji}</span>
                    <span className="font-semibold w-12">{t.label}</span>
                    <span className="text-slate-600 dark:text-slate-400">{t.desc}</span>
                  </div>
                ))}
              </div>
            </section>

            {/* Quick Actions */}
            <section>
              <h3 className="font-bold text-slate-800 dark:text-slate-200 mb-2">Quick Action Icons</h3>
              <div className="space-y-1.5">
                {[
                  { icon: <Phone className="h-4 w-4" />, label: 'Phone', desc: 'Tap to call, copies script to clipboard' },
                  { icon: <MessageSquare className="h-4 w-4" />, label: 'Text', desc: 'Tap to text, copies template to clipboard' },
                  { icon: <Mail className="h-4 w-4" />, label: 'Email', desc: 'Opens email compose' },
                ].map(a => (
                  <div key={a.label} className="flex items-center gap-2">
                    <span className="text-slate-500 dark:text-slate-400">{a.icon}</span>
                    <span className="font-semibold w-12">{a.label}</span>
                    <span className="text-slate-600 dark:text-slate-400">{a.desc}</span>
                  </div>
                ))}
              </div>
            </section>

            {/* Status Filters */}
            <section>
              <h3 className="font-bold text-slate-800 dark:text-slate-200 mb-2">Status Filters</h3>
              <div className="space-y-1">
                {[
                  { code: 'NNY', desc: 'No photographer, No videographer, Yes venue — HOT leads!' },
                  { code: 'NNN', desc: 'No photographer, No videographer, No venue — Nurture leads' },
                  { code: 'CONTACTED', desc: 'Currently being chased' },
                  { code: 'APPT', desc: 'Meeting scheduled' },
                  { code: 'QUOTED', desc: 'Quote given, waiting for decision' },
                  { code: 'BOOKED', desc: 'Won! Contract signed' },
                  { code: 'LOST', desc: 'Gone (said no, booked elsewhere, or gave up)' },
                ].map(f => (
                  <div key={f.code} className="flex items-start gap-2">
                    <span className="font-mono font-bold text-[#0d4f4f] dark:text-teal-400 w-24 shrink-0">{f.code}</span>
                    <span className="text-slate-600 dark:text-slate-400">{f.desc}</span>
                  </div>
                ))}
              </div>
            </section>
          </div>

          <div className="pt-2">
            <Button variant="outline" className="w-full" onClick={() => setLegendOpen(false)}>Close</Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
