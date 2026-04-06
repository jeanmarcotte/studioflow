'use client'

import { useState, useEffect } from 'react'
import { Send, X } from 'lucide-react'
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

  if (!open) return null

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />

      {/* Modal */}
      <div className="relative w-full max-w-lg mx-4 bg-white dark:bg-slate-900 rounded-2xl shadow-2xl overflow-hidden" style={{ zIndex: 101 }}>
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-slate-200 dark:border-slate-700">
          <h2 className="text-base font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
            ✉️ Compose Email
          </h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Form */}
        <div className="px-5 py-4 space-y-3 max-h-[70vh] overflow-y-auto">
          <div className="space-y-1">
            <label className="text-xs font-medium text-slate-500">To</label>
            <input
              type="email"
              value={toEmail}
              onChange={(e) => setToEmail(e.target.value)}
              className="w-full h-10 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 px-3 text-sm outline-none focus:border-[#0d4f4f] focus:ring-2 focus:ring-[#0d4f4f]/20"
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-medium text-slate-500">Subject</label>
            <input
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              className="w-full h-10 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 px-3 text-sm outline-none focus:border-[#0d4f4f] focus:ring-2 focus:ring-[#0d4f4f]/20"
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-medium text-slate-500">Message</label>
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              rows={10}
              className="w-full rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 px-3 py-2 text-sm outline-none resize-y focus:border-[#0d4f4f] focus:ring-2 focus:ring-[#0d4f4f]/20 leading-relaxed"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-5 py-3 border-t border-slate-200 dark:border-slate-700">
          <Button variant="outline" onClick={onClose} disabled={sending} className="h-9 px-4 text-sm rounded-lg">
            Cancel
          </Button>
          <Button
            onClick={handleSend}
            disabled={sending || !toEmail}
            className="h-9 px-5 text-sm font-semibold bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg disabled:opacity-50"
          >
            <Send className="h-4 w-4 mr-1.5" />
            {sending ? 'Sending...' : 'Send Now'}
          </Button>
        </div>
      </div>
    </div>
  )
}
