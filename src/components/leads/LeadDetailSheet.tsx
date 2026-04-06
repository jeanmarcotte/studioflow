'use client'

import { useState, useCallback, useEffect, useRef } from 'react'
import { ArrowLeft, Skull, Calendar, X } from 'lucide-react'
import {
  Sheet, SheetContent, SheetHeader, SheetTitle,
} from '@/components/ui/sheet'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { supabase } from '@/lib/supabase'
import { toast } from 'sonner'
import type { Lead } from '@/lib/lead-utils'
import {
  coupleName, getScoreTier, getScoreColors, getTempConfig, SCORE_DOT_COLORS,
} from '@/lib/lead-utils'
import { logTouch, undoTouch } from '@/lib/chase-actions'
import { ContactSection } from './ContactSection'
import { DiscoverySection } from './DiscoverySection'
import { ChaseProgressSection } from './ChaseProgressSection'
import { ScoreBreakdown } from './ScoreBreakdown'
import { NextTouchCard } from './NextTouchCard'
import { ResurrectButton } from './ResurrectButton'
import { BookedModal } from './BookedModal'
import { LostModal } from './LostModal'

interface LeadDetailSheetProps {
  lead: Lead | null
  isOpen: boolean
  onClose: () => void
  onUpdate: (updated: Lead) => void
}

export function LeadDetailSheet({ lead, isOpen, onClose, onUpdate }: LeadDetailSheetProps) {
  const [bookedOpen, setBookedOpen] = useState(false)
  const [lostOpen, setLostOpen] = useState(false)
  const [chaseRefreshKey, setChaseRefreshKey] = useState(0)
  const autoLoggedRef = useRef<string | null>(null)

  // ── Auto-log touch on sheet open (WO-349) ─────────────────────
  useEffect(() => {
    if (!isOpen || !lead) return
    if (lead.status !== 'contacted') return
    // Only auto-log once per lead open
    if (autoLoggedRef.current === lead.id) return
    autoLoggedRef.current = lead.id

    logTouch(lead.id, lead.entity_id, 'view', 'Viewed lead detail').then(result => {
      if (result) {
        setChaseRefreshKey(k => k + 1)
        toast(`Logged as Touch #${result.touchNumber}`, {
          action: {
            label: 'Undo',
            onClick: async () => {
              await undoTouch(result.contactId, lead.id)
              setChaseRefreshKey(k => k + 1)
            },
          },
        })

        // Update local lead state with new contact count
        onUpdate({
          ...lead,
          contact_count: result.touchNumber,
          last_contact_date: new Date().toISOString(),
          temperature: 'hot',
          ...(result.touchNumber >= 6 ? { status: 'dead', contact_status: 'exhausted' } : {}),
        })

        if (result.touchNumber >= 6) {
          toast.info('Lead marked as dead after 6 touches')
        }
      }
    })
  }, [isOpen, lead?.id]) // eslint-disable-line react-hooks/exhaustive-deps

  // Reset auto-log ref when sheet closes
  useEffect(() => {
    if (!isOpen) autoLoggedRef.current = null
  }, [isOpen])

  const handleKill = useCallback(async () => {
    if (!lead) return
    const { error } = await supabase
      .from('ballots')
      .update({ hidden: true })
      .eq('id', lead.id)

    if (error) {
      toast.error('Failed to hide lead')
      return
    }

    onUpdate({ ...lead, hidden: true })
    onClose()

    toast('Lead hidden', {
      action: {
        label: 'Undo',
        onClick: async () => {
          await supabase.from('ballots').update({ hidden: false }).eq('id', lead.id)
        },
      },
    })
  }, [lead, onUpdate, onClose])

  const handleLeadUpdate = useCallback((updated: Lead) => {
    onUpdate(updated)
  }, [onUpdate])

  const handleTouchLogged = useCallback(() => {
    setChaseRefreshKey(k => k + 1)
  }, [])

  const handleBooked = useCallback(() => {
    setBookedOpen(false)
    if (lead) {
      onUpdate({ ...lead, status: 'meeting_booked' })
    }
    onClose()
  }, [lead, onUpdate, onClose])

  const handleLost = useCallback(() => {
    setLostOpen(false)
    if (lead) {
      onUpdate({ ...lead, status: 'lost' })
    }
    onClose()
  }, [lead, onUpdate, onClose])

  const handleResurrected = useCallback((updated: Lead) => {
    onUpdate(updated)
    setChaseRefreshKey(k => k + 1)
  }, [onUpdate])

  if (!lead) return null

  const score = lead.book_score ?? 0
  const tier = getScoreTier(score)
  const colors = getScoreColors(score)
  const temp = getTempConfig(lead.temperature)
  const dotColor = SCORE_DOT_COLORS[tier]
  const isDead = lead.status === 'dead'

  return (
    <>
      <Sheet open={isOpen} onOpenChange={(o) => { if (!o) onClose() }}>
        <SheetContent
          side="right"
          showCloseButton={false}
          className="w-full sm:max-w-[600px] overflow-y-auto p-0"
        >
          {/* Header */}
          <SheetHeader className="sticky top-0 z-10 bg-white border-b border-border/60 px-4 py-3">
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="icon" className="h-9 w-9 shrink-0" onClick={onClose}>
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <SheetTitle className="flex-1 truncate text-base font-bold">
                {coupleName(lead)}
              </SheetTitle>
              <Button variant="ghost" size="icon" className="h-9 w-9 shrink-0 text-red-500 hover:bg-red-50" onClick={handleKill}>
                <Skull className="h-5 w-5" />
              </Button>
            </div>
          </SheetHeader>

          <div className="px-4 py-4 space-y-5">
            {/* Resurrect banner for dead leads */}
            {isDead && (
              <ResurrectButton lead={lead} onResurrected={handleResurrected} />
            )}

            {/* Score summary bar */}
            <div className="flex items-center gap-3 p-3 rounded-xl bg-gray-50 border border-border/60">
              <Badge className={`${colors.bg} ${colors.text} ${colors.border} border font-bold text-base px-3 py-1`}>
                {score}
              </Badge>
              <Badge className={`${colors.bg} ${colors.text} ${colors.border} border font-bold text-xs`}>
                {tier}-TIER
              </Badge>
              <span className={`text-xs font-bold uppercase tracking-wider ${temp.color} flex items-center gap-1 ml-auto`}>
                {temp.pulse ? (
                  <span className="relative flex h-2.5 w-2.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75" style={{ backgroundColor: dotColor }} />
                    <span className="relative inline-flex rounded-full h-2.5 w-2.5" style={{ backgroundColor: dotColor }} />
                  </span>
                ) : (
                  <span className="inline-flex rounded-full h-2.5 w-2.5" style={{ backgroundColor: dotColor }} />
                )}
                {temp.label}
              </span>
            </div>

            {/* Next Touch Recommendation */}
            {!isDead && (lead.contact_count || 0) < 6 && (
              <NextTouchCard lead={lead} onTouchLogged={handleTouchLogged} />
            )}

            {/* Section 1: Contact */}
            <ContactSection lead={lead} />

            <Separator />

            {/* Section 2: Discovery */}
            <DiscoverySection lead={lead} onUpdate={handleLeadUpdate} />

            <Separator />

            {/* Section 3: Chase Progress */}
            <ChaseProgressSection ballotId={lead.id} refreshKey={chaseRefreshKey} />

            <Separator />

            {/* Section 4: Score Breakdown */}
            <ScoreBreakdown lead={lead} />

            <Separator />

            {/* Section 5: Outcome Buttons */}
            {!isDead && (
              <div className="space-y-2.5 pb-4">
                <Button
                  className="w-full h-14 text-base font-bold bg-green-600 hover:bg-green-700 text-white rounded-xl"
                  onClick={() => setBookedOpen(true)}
                >
                  <Calendar className="h-5 w-5 mr-2" />
                  BOOKED!
                </Button>
                <Button
                  variant="outline"
                  className="w-full h-14 text-base font-bold text-red-600 border-red-300 hover:bg-red-50 rounded-xl"
                  onClick={() => setLostOpen(true)}
                >
                  <X className="h-5 w-5 mr-2" />
                  NOT INTERESTED
                </Button>
              </div>
            )}
          </div>
        </SheetContent>
      </Sheet>

      {/* Modals */}
      {lead && (
        <>
          <BookedModal
            lead={lead}
            open={bookedOpen}
            onClose={() => setBookedOpen(false)}
            onBooked={handleBooked}
          />
          <LostModal
            lead={lead}
            open={lostOpen}
            onClose={() => setLostOpen(false)}
            onLost={handleLost}
          />
        </>
      )}
    </>
  )
}
