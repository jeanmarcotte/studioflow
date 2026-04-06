'use client'

import { useState, useCallback, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Skull, Calendar, X, Video, PhoneForwarded, Mail } from 'lucide-react'
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
  coupleName, getScoreTier, getScoreColors, getTempConfig, SCORE_DOT_COLORS, formatShowName, formatWeddingDate,
} from '@/lib/lead-utils'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { logTouch } from '@/lib/chase-actions'
import { ContactSection } from './ContactSection'
import { DiscoverySection } from './DiscoverySection'
import { ChaseProgressSection } from './ChaseProgressSection'
import { ScoreBreakdown } from './ScoreBreakdown'
import { NextTouchCard } from './NextTouchCard'
import { ResurrectButton } from './ResurrectButton'
import { BookedModal } from './BookedModal'
import { LostModal } from './LostModal'
import { ChaseProgress } from './ChaseProgress'
import { ContactHistory } from './ContactHistory'
import { LeadStatusIndicator } from './LeadStatusIndicator'

interface LeadDetailSheetProps {
  lead: Lead | null
  isOpen: boolean
  onClose: () => void
  onUpdate: (updated: Lead) => void
}

export function LeadDetailSheet({ lead, isOpen, onClose, onUpdate }: LeadDetailSheetProps) {
  const router = useRouter()
  const [bookedOpen, setBookedOpen] = useState(false)
  const [lostOpen, setLostOpen] = useState(false)
  const [zoomConfirmOpen, setZoomConfirmOpen] = useState(false)
  const [chaseRefreshKey, setChaseRefreshKey] = useState(0)

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

  const handleLost = useCallback(async () => {
    setLostOpen(false)
    if (lead) {
      await supabase.from('ballots').update({ status: 'lost' }).eq('id', lead.id)
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
              <LeadStatusIndicator
                status={lead.status}
                contactCount={lead.contact_count || 0}
                nextContactDue={lead.next_contact_due}
              />
              <Button variant="ghost" size="icon" className="h-9 w-9 shrink-0 text-red-500 hover:bg-red-50" onClick={handleKill}>
                <Skull className="h-5 w-5" />
              </Button>
            </div>
          </SheetHeader>

          <div className="px-4 py-3 space-y-3">
            {/* Resurrect banner for dead leads */}
            {isDead && (
              <ResurrectButton lead={lead} onResurrected={handleResurrected} />
            )}

            {/* 1. Score summary bar */}
            <div className="flex items-center gap-3 p-2.5 rounded-xl bg-gray-50 border border-border/60">
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

            {/* 2. Next Touch Recommendation */}
            {!isDead && (lead.contact_count || 0) < 6 && (
              <NextTouchCard lead={lead} onTouchLogged={handleTouchLogged} />
            )}

            {/* 3. Contact Info */}
            <ContactSection lead={lead} onUpdate={handleLeadUpdate} />

            <Separator />

            {/* 4. Chase Progress */}
            <ChaseProgress touchCount={lead.contact_count || 0} />
            <ChaseProgressSection ballotId={lead.id} refreshKey={chaseRefreshKey} />

            {/* 4b. Contact History */}
            <ContactHistory leadId={lead.id} />

            <Separator />

            {/* 5. Score Breakdown (moved up) */}
            <ScoreBreakdown breakdown={lead.score_breakdown} />

            <Separator />

            {/* 6. Discovery (moved down) */}
            <DiscoverySection lead={lead} onUpdate={handleLeadUpdate} />

            <Separator />

            {/* 7. Action buttons */}
            {!isDead && (
              <div className="space-y-2 pb-3">
                <div className="grid grid-cols-4 gap-1.5">
                  <Button
                    className="h-10 text-[11px] font-bold bg-green-600 hover:bg-green-700 text-white rounded-lg flex flex-col items-center gap-0.5 px-1"
                    onClick={() => setBookedOpen(true)}
                  >
                    <Calendar className="h-3.5 w-3.5" />
                    Appt
                  </Button>
                  <Button
                    className="h-10 text-[11px] font-bold bg-blue-600 hover:bg-blue-700 text-white rounded-lg flex flex-col items-center gap-0.5 px-1"
                    onClick={() => {
                      if (!lead.email) { toast.error('No email on file'); return }
                      setZoomConfirmOpen(true)
                    }}
                  >
                    <Video className="h-3.5 w-3.5" />
                    Zoom
                  </Button>
                  <Button
                    className="h-10 text-[11px] font-bold bg-teal-600 hover:bg-teal-700 text-white rounded-lg flex flex-col items-center gap-0.5 px-1"
                    onClick={async () => {
                      const result = await logTouch(lead.id, lead.entity_id, 'call', 'Follow up')
                      if (!result) {
                        toast.error('Failed to log follow up')
                        return
                      }
                      if (result.cooldownHoursLeft) {
                        toast.info(`Cooldown active — try again in ~${result.cooldownHoursLeft}h`)
                        return
                      }
                      toast.success('Follow up logged')
                      onUpdate({
                        ...lead,
                        contact_count: result.touchNumber,
                        last_contact_date: new Date().toISOString(),
                        temperature: 'hot',
                      })
                    }}
                  >
                    <PhoneForwarded className="h-3.5 w-3.5" />
                    Follow Up
                  </Button>
                  <Button
                    className="h-10 text-[11px] font-bold bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg flex flex-col items-center gap-0.5 px-1"
                    onClick={() => {
                      if (!lead.email) { toast.error('No email on file'); return }
                      router.push(`/leads/${lead.id}/compose`)
                    }}
                  >
                    <Mail className="h-3.5 w-3.5" />
                    Email
                  </Button>
                </div>
                <Button
                  variant="outline"
                  className="w-full h-9 text-sm font-bold text-red-600 border-red-300 hover:bg-red-50 dark:hover:bg-red-950/20 rounded-lg"
                  onClick={() => setLostOpen(true)}
                >
                  <X className="h-4 w-4 mr-1.5" />
                  Not Interested
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
          {/* Zoom confirmation */}
          <Dialog open={zoomConfirmOpen} onOpenChange={setZoomConfirmOpen}>
            <DialogContent className="sm:max-w-sm">
              <DialogHeader>
                <DialogTitle>Send Zoom Invite</DialogTitle>
              </DialogHeader>
              <p className="text-sm text-muted-foreground">
                Send Zoom invite to <strong>{coupleName(lead)}</strong> at <strong>{lead.email}</strong>?
              </p>
              <DialogFooter>
                <Button variant="outline" onClick={() => setZoomConfirmOpen(false)}>Cancel</Button>
                <Button
                  className="bg-blue-600 hover:bg-blue-700 text-white"
                  onClick={async () => {
                    setZoomConfirmOpen(false)
                    try {
                      await fetch('/api/leads/send-zoom-invite', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                          leadId: lead.id,
                          email: lead.email,
                          bride: lead.bride_first_name,
                          groom: lead.groom_first_name,
                        }),
                      })
                      await supabase.from('ballots').update({ zoom_invite_sent_at: new Date().toISOString() }).eq('id', lead.id)
                      toast.success('Zoom invite sent!')
                    } catch (e) {
                      toast.error('Failed to send invite')
                    }
                  }}
                >
                  Send
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </>
      )}
    </>
  )
}
