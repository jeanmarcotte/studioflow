'use client'

import { useState, useEffect } from 'react'
import { Send } from 'lucide-react'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import type { Lead } from '@/lib/lead-utils'
import { coupleName, formatWeddingDate } from '@/lib/lead-utils'
import { logTouch } from '@/lib/chase-actions'

interface EmailComposeModalProps {
  lead: Lead
  open: boolean
  onClose: () => void
  onTouchLogged?: () => void
}

export function EmailComposeModal({ lead, open, onClose, onTouchLogged }: EmailComposeModalProps) {
  const [toEmail, setToEmail] = useState('')
  const [subject, setSubject] = useState('')
  const [body, setBody] = useState('')
  const [sending, setSending] = useState(false)

  useEffect(() => {
    if (!open) return
    setToEmail(lead.email || '')
    const bride = lead.bride_first_name || 'there'
    const date = formatWeddingDate(lead.wedding_date)
    const venue = lead.venue_name || 'your venue'

    setSubject('Met you at the bridal show — SIGS Photography')
    setBody(
      `Hi ${bride},\n\nThank you for connecting with us! We're excited to learn more about your ${date} wedding at ${venue}.\n\nI'd love to schedule a quick call or Zoom to discuss your photography vision and answer any questions. Or you can visit us at our studio in Toronto located just north of Yorkdale Mall. Allen Rd and Sheppard.\n\nWhat time works best for you this week?\n\nBest regards,\n\nJean Marcotte\nPrincipal Photographer\nSIGS Photography\n416-831-8942\nwww.sigsphoto.ca`
    )
  }, [open, lead])

  const handleSend = async () => {
    if (!toEmail) { toast.error('No email address'); return }
    setSending(true)
    try {
      const res = await fetch('/api/leads/send-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: toEmail,
          subject,
          body,
        }),
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Send failed')
      }

      toast.success(`Email sent to ${lead.bride_first_name || coupleName(lead)}`)

      // Log touch
      const result = await logTouch(lead.id, lead.entity_id, 'email', `Email: ${subject}`)
      if (result) {
        onTouchLogged?.()
      }
      onClose()
    } catch (err: any) {
      toast.error(`Failed to send: ${err.message}`)
    }
    setSending(false)
  }

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose() }}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <span>✉️</span> Compose Email
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-3 py-2">
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground">To</label>
            <input
              type="email"
              value={toEmail}
              onChange={(e) => setToEmail(e.target.value)}
              className="w-full h-9 rounded-lg border border-border bg-white dark:bg-slate-800 px-3 text-sm outline-none focus:border-[#0d4f4f] focus:ring-1 focus:ring-[#0d4f4f]/20"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium">Subject</label>
            <input
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              className="w-full h-10 rounded-lg border border-border bg-white dark:bg-slate-800 px-3 text-sm outline-none focus:border-[#0d4f4f] focus:ring-1 focus:ring-[#0d4f4f]/20"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium">Message</label>
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              rows={10}
              className="w-full rounded-lg border border-border bg-white dark:bg-slate-800 px-3 py-2 text-sm outline-none resize-y focus:border-[#0d4f4f] focus:ring-1 focus:ring-[#0d4f4f]/20 leading-relaxed"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={sending}>Cancel</Button>
          <Button
            onClick={handleSend}
            disabled={sending || !toEmail}
            className="bg-indigo-600 hover:bg-indigo-700 text-white"
          >
            <Send className="h-4 w-4 mr-1.5" />
            {sending ? 'Sending...' : 'Send Now'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
