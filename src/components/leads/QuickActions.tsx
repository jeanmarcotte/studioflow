'use client'

import { Phone, MessageSquare, Mail } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import type { Lead } from '@/lib/lead-utils'
import { getMessageTemplate } from '@/lib/lead-utils'
import { getTemplateForTouch, renderTemplate, getTemplateVariables } from '@/lib/template-utils'
import { logTouch, undoTouch } from '@/lib/chase-actions'

interface QuickActionsProps {
  lead: Lead
  onHide?: (id: string) => void
  onEmailClick: (lead: Lead) => void
}

export function QuickActions({ lead, onEmailClick }: QuickActionsProps) {
  const isProtectedLead = ['meeting_booked', 'quoted', 'booked'].includes(lead.status) || !!lead.appointment_date

  const handleCall = async (e: React.MouseEvent) => {
    e.stopPropagation()

    const touchNum = (lead.contact_count || 0) + 1
    const vars = getTemplateVariables(lead)
    if (isProtectedLead) {
      toast.info('This lead is already in the pipeline — no script copied')
      return
    }

    const tmpl = await getTemplateForTouch(touchNum, 'call')
    const script = tmpl
      ? renderTemplate(tmpl.body, vars)
      : await getMessageTemplate(1, lead)

    await navigator.clipboard.writeText(script)
    toast.success(`Copied: "${script.slice(0, 60)}..."`)

    // Log touch
    const result = await logTouch(lead.id, lead.entity_id, 'call', `Call touch ${touchNum}`)
    if (result) {
      toast(`Logged as Touch #${result.touchNumber}`, {
        action: { label: 'Undo', onClick: () => undoTouch(result.contactId, lead.id) },
      })
    }
  }

  const handleText = async (e: React.MouseEvent) => {
    e.stopPropagation()

    const touchNum = (lead.contact_count || 0) + 1
    const vars = getTemplateVariables(lead)
    if (isProtectedLead) {
      toast.info('This lead is already in the pipeline — no script copied')
      return
    }

    const tmpl = await getTemplateForTouch(touchNum, 'text')
    const text = tmpl
      ? renderTemplate(tmpl.body, vars)
      : await getMessageTemplate(1, lead)

    await navigator.clipboard.writeText(text)
    toast.success(`Copied: "${text.slice(0, 60)}..."`)

    // Log touch
    const result = await logTouch(lead.id, lead.entity_id, 'text', `Text touch ${touchNum}`)
    if (result) {
      toast(`Logged as Touch #${result.touchNumber}`, {
        action: { label: 'Undo', onClick: () => undoTouch(result.contactId, lead.id) },
      })
    }
  }

  const handleEmail = (e: React.MouseEvent) => {
    e.stopPropagation()
    onEmailClick(lead)
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
    </div>
  )
}
