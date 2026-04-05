'use client'

import { Phone, MessageSquare, Mail, Skull } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import { supabase } from '@/lib/supabase'
import type { Lead } from '@/lib/lead-utils'
import { getCallScript, getTextTemplate } from '@/lib/lead-utils'

interface QuickActionsProps {
  lead: Lead
  onHide: (id: string) => void
  onEmailClick: (lead: Lead) => void
}

export function QuickActions({ lead, onHide, onEmailClick }: QuickActionsProps) {
  const handleCall = async (e: React.MouseEvent) => {
    e.stopPropagation()
    const script = getCallScript(lead)
    await navigator.clipboard.writeText(script)
    toast.success('Script copied! Call from iPhone')
  }

  const handleText = async (e: React.MouseEvent) => {
    e.stopPropagation()
    const text = getTextTemplate(lead)
    await navigator.clipboard.writeText(text)
    toast.success('Text copied! Send from iPhone')
  }

  const handleEmail = (e: React.MouseEvent) => {
    e.stopPropagation()
    onEmailClick(lead)
  }

  const handleKill = async (e: React.MouseEvent) => {
    e.stopPropagation()
    const { error } = await supabase
      .from('ballots')
      .update({ hidden: true })
      .eq('id', lead.id)

    if (error) {
      toast.error('Failed to hide lead')
      return
    }

    onHide(lead.id)

    toast('Lead hidden', {
      action: {
        label: 'Undo',
        onClick: async () => {
          await supabase
            .from('ballots')
            .update({ hidden: false })
            .eq('id', lead.id)
          // Realtime will re-add the card
        },
      },
    })
  }

  return (
    <div className="flex items-center justify-between gap-1 pt-2.5 border-t border-border/60">
      <Button
        variant="ghost"
        size="icon"
        className="h-11 w-11 rounded-lg hover:bg-teal-50 active:bg-teal-100 transition-colors"
        onClick={handleCall}
        title="Copy call script"
      >
        <Phone className="h-5 w-5 text-teal-700" />
      </Button>
      <Button
        variant="ghost"
        size="icon"
        className="h-11 w-11 rounded-lg hover:bg-blue-50 active:bg-blue-100 transition-colors"
        onClick={handleText}
        title="Copy text template"
      >
        <MessageSquare className="h-5 w-5 text-blue-600" />
      </Button>
      <Button
        variant="ghost"
        size="icon"
        className="h-11 w-11 rounded-lg hover:bg-purple-50 active:bg-purple-100 transition-colors"
        onClick={handleEmail}
        title="Compose email"
      >
        <Mail className="h-5 w-5 text-purple-600" />
      </Button>
      <Button
        variant="ghost"
        size="icon"
        className="h-11 w-11 rounded-lg hover:bg-red-50 active:bg-red-100 transition-colors"
        onClick={handleKill}
        title="Hide lead"
      >
        <Skull className="h-5 w-5 text-red-500" />
      </Button>
    </div>
  )
}
