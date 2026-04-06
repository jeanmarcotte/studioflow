'use client'

import { useState, useEffect } from 'react'
import { Search, Settings, Plus, Menu, Sun, Moon, X, Phone, MessageSquare, Mail, Skull } from 'lucide-react'
import { useTheme } from 'next-themes'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Nunito } from 'next/font/google'

const nunito = Nunito({ subsets: ['latin'], weight: ['400', '600', '700'] })

interface LeadsHeaderProps {
  onMenuToggle: () => void
  onAddLead?: () => void
}

export function LeadsHeader({ onMenuToggle, onAddLead }: LeadsHeaderProps) {
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)
  const [legendOpen, setLegendOpen] = useState(false)
  useEffect(() => setMounted(true), [])

  return (
    <>
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

          {/* Settings / Legend */}
          <Button variant="ghost" size="icon" className="h-9 w-9 text-muted-foreground hover:text-foreground" onClick={() => setLegendOpen(true)} title="Legend">
            <Settings className="h-4 w-4" />
          </Button>

          {/* Add Lead */}
          <Button className="h-9 px-3 text-sm font-semibold bg-[#0d4f4f] hover:bg-[#0d4f4f]/90 text-white rounded-lg" onClick={onAddLead}>
            <Plus className="h-4 w-4 mr-1" /> Add Lead
          </Button>

          {/* User initials */}
          <div className="h-8 w-8 rounded-full bg-[#0d4f4f] text-white text-xs font-bold flex items-center justify-center shrink-0 cursor-pointer" title="Jean Marcotte">
            JM
          </div>
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
                  { range: '85–100', tier: 'A-TIER', color: 'bg-green-100 text-green-700', desc: 'Hot lead!' },
                  { range: '70–84', tier: 'B-TIER', color: 'bg-teal-100 text-teal-700', desc: '' },
                  { range: '55–69', tier: 'C-TIER', color: 'bg-yellow-100 text-yellow-700', desc: '' },
                  { range: '40–54', tier: 'D-TIER', color: 'bg-orange-100 text-orange-700', desc: '' },
                  { range: '25–39', tier: 'E-TIER', color: 'bg-red-100 text-red-700', desc: '' },
                  { range: '0–24', tier: 'F-TIER', color: 'bg-gray-100 text-gray-500', desc: 'Cold lead' },
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
                  { icon: <Skull className="h-4 w-4" />, label: 'Lost', desc: 'Move lead to LOST (removes from active queue)' },
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
