'use client'

import { useState, useEffect } from 'react'
import { Copy, Send } from 'lucide-react'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import type { Lead } from '@/lib/lead-utils'
import { coupleName, getMessageTemplate } from '@/lib/lead-utils'
import { getTemplateForTouch, renderTemplate, getTemplateVariables } from '@/lib/template-utils'
import { logTouch } from '@/lib/chase-actions'

interface EmailComposeModalProps {
  lead: Lead
  open: boolean
  onClose: () => void
  onTouchLogged?: () => void
}

export function EmailComposeModal({ lead, open, onClose, onTouchLogged }: EmailComposeModalProps) {
  const [subject, setSubject] = useState('')
  const [body, setBody] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!open) return
    setLoading(true)

    const touchNum = (lead.contact_count || 0) + 1
    const vars = getTemplateVariables(lead)

    getTemplateForTouch(touchNum, 'email').then(async (tmpl) => {
      if (tmpl) {
        setSubject(renderTemplate(tmpl.subject || `Your ${lead.venue_name || ''} Wedding Photography`, vars))
        setBody(renderTemplate(tmpl.body, vars))
      } else {
        // Fallback — fetch from message_templates
        setSubject(`SIGS Photography — Your ${lead.venue_name || 'Wedding'} Day!`)
        const fallbackBody = await getMessageTemplate('initial', lead)
        setBody(fallbackBody)
      }
      setLoading(false)
    })
  }, [open, lead])

  const handleCopy = async () => {
    const full = `Subject: ${subject}\n\n${body}`
    await navigator.clipboard.writeText(full)
    toast.success('Email copied to clipboard!')

    // Log touch
    const result = await logTouch(lead.id, lead.entity_id, 'email', `Email: ${subject}`)
    if (result) {
      toast(`Logged as Touch #${result.touchNumber}`, {
        action: {
          label: 'Undo',
          onClick: async () => {
            const { undoTouch } = await import('@/lib/chase-actions')
            await undoTouch(result.contactId, lead.id)
          },
        },
      })
      onTouchLogged?.()
    }
    onClose()
  }

  const handleSend = async () => {
    const mailto = `mailto:${lead.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`
    window.open(mailto, '_blank')
    toast.success('Opening email compose')

    // Log touch
    const result = await logTouch(lead.id, lead.entity_id, 'email', `Email: ${subject}`)
    if (result) {
      toast(`Logged as Touch #${result.touchNumber}`, {
        action: {
          label: 'Undo',
          onClick: async () => {
            const { undoTouch } = await import('@/lib/chase-actions')
            await undoTouch(result.contactId, lead.id)
          },
        },
      })
      onTouchLogged?.()
    }
    onClose()
  }

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose() }}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <span>✉️</span> Email: {lead.bride_first_name || coupleName(lead)}
          </DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="py-8 text-center text-muted-foreground text-sm">Loading template...</div>
        ) : (
          <div className="space-y-3 py-2">
            <div className="text-sm">
              <span className="text-muted-foreground">To:</span>{' '}
              <span className="font-medium">{lead.email || '—'}</span>
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium">Subject</label>
              <input
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                className="w-full h-10 rounded-lg border border-border bg-white px-3 text-sm outline-none focus:border-[#0d4f4f] focus:ring-1 focus:ring-[#0d4f4f]/20"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium">Body</label>
              <textarea
                value={body}
                onChange={(e) => setBody(e.target.value)}
                rows={10}
                className="w-full rounded-lg border border-border bg-white px-3 py-2 text-sm outline-none resize-none focus:border-[#0d4f4f] focus:ring-1 focus:ring-[#0d4f4f]/20 font-mono text-xs leading-relaxed"
              />
            </div>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button variant="outline" onClick={handleCopy} disabled={loading}>
            <Copy className="h-4 w-4 mr-1.5" /> Copy
          </Button>
          <Button
            onClick={handleSend}
            disabled={loading || !lead.email}
            className="bg-[#0d4f4f] hover:bg-[#0d4f4f]/90 text-white"
          >
            <Send className="h-4 w-4 mr-1.5" /> Send
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
