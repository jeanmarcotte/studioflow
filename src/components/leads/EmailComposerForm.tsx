'use client'

import { useState, useEffect } from 'react'
import { toast } from 'sonner'
import type { Lead } from '@/lib/lead-utils'
import { formatWeddingDate, getMessageTemplate } from '@/lib/lead-utils'

interface EmailComposerFormProps {
  lead: Lead
  onClose: () => void
}

export function EmailComposerForm({ lead, onClose }: EmailComposerFormProps) {
  const bride = lead.bride_first_name || 'there'
  const date = formatWeddingDate(lead.wedding_date)
  const venue = lead.venue_name || 'your venue'

  const [to, setTo] = useState(lead.email || '')
  const [subject, setSubject] = useState('SIGS Photography — Following Up')
  const [body, setBody] = useState('')
  const [sending, setSending] = useState(false)

  useEffect(() => {
    getMessageTemplate(1, lead).then(text => {
      setBody(text)
    })
  }, [lead])

  const handleSend = async () => {
    if (!to) { toast.error('Please enter an email address'); return }
    setSending(true)
    try {
      const res = await fetch('/api/leads/send-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ to, subject, body, leadId: lead.id }),
      })
      if (!res.ok) throw new Error('Failed to send')
      toast.success(`Email sent to ${bride}`)
      onClose()
    } catch {
      toast.error('Failed to send email')
    }
    setSending(false)
  }

  return (
    <div className="space-y-4">
      <div className="space-y-1">
        <label className="text-sm font-medium text-gray-700 dark:text-gray-300">To</label>
        <input
          type="email"
          className="w-full h-10 px-3 rounded-md border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-sm"
          value={to}
          onChange={(e) => setTo(e.target.value)}
          placeholder="email@example.com"
        />
      </div>
      <div className="space-y-1">
        <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Subject</label>
        <input
          type="text"
          className="w-full h-10 px-3 rounded-md border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-sm"
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
        />
      </div>
      <div className="space-y-1">
        <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Message</label>
        <textarea
          className="w-full px-3 py-2 rounded-md border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-sm resize-none"
          rows={10}
          value={body}
          onChange={(e) => setBody(e.target.value)}
        />
      </div>
      <div className="flex gap-3 justify-end pt-2">
        <button onClick={onClose} className="px-4 py-2 rounded-md border border-gray-300 dark:border-slate-600 hover:bg-gray-50 dark:hover:bg-slate-800 text-sm font-medium">
          Cancel
        </button>
        <button
          onClick={handleSend}
          disabled={sending}
          className="px-4 py-2 rounded-md bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50 text-sm font-medium"
        >
          {sending ? 'Sending...' : 'Send Email'}
        </button>
      </div>
    </div>
  )
}
