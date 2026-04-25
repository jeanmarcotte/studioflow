'use client'

import { useState, useEffect } from 'react'
import { Nunito } from 'next/font/google'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { toast } from 'sonner'
import { Save, Loader2 } from 'lucide-react'

const nunito = Nunito({ subsets: ['latin'], weight: ['400', '600', '700'] })

interface MessageTemplate {
  id: string
  template_type: string
  message_text: string
}

interface ChaseTemplate {
  id: string
  touch_number: number
  contact_type: string
  template_name: string
  subject: string | null
  body: string
}

const TOUCH_LABELS: Record<number, string> = {
  1: 'Touch 1 — Initial Text (Day 0)',
  2: 'Touch 2 — Follow-up Call (Day 2)',
  3: 'Touch 3 — Portfolio Email (Day 5)',
  4: 'Touch 4 — Check-in Text (Day 9)',
  5: 'Touch 5 — Special Offer Email (Day 14)',
  6: 'Touch 6 — Final Outreach Text (Day 21)',
}

export default function ScriptsSettingsPage() {
  const [messageTemplates, setMessageTemplates] = useState<MessageTemplate[]>([])
  const [chaseTemplates, setChaseTemplates] = useState<ChaseTemplate[]>([])
  const [loading, setLoading] = useState(true)
  const [savingId, setSavingId] = useState<string | null>(null)

  useEffect(() => {
    loadTemplates()
  }, [])

  async function loadTemplates() {
    setLoading(true)
    const [msgRes, chaseRes] = await Promise.all([
      supabase
        .from('message_templates')
        .select('id, template_type, message_text')
        .eq('is_active', true)
        .order('template_type'),
      supabase
        .from('chase_templates')
        .select('id, touch_number, contact_type, template_name, subject, body')
        .eq('is_active', true)
        .order('touch_number'),
    ])
    setMessageTemplates(msgRes.data ?? [])
    setChaseTemplates(chaseRes.data ?? [])
    setLoading(false)
  }

  async function saveMessageTemplate(tmpl: MessageTemplate) {
    setSavingId(tmpl.id)
    const { error } = await supabase
      .from('message_templates')
      .update({ message_text: tmpl.message_text })
      .eq('id', tmpl.id)

    if (error) {
      toast.error('Failed to save')
    } else {
      toast.success('Saved!')
    }
    setSavingId(null)
  }

  async function saveChaseTemplate(tmpl: ChaseTemplate) {
    setSavingId(tmpl.id)
    const { error } = await supabase
      .from('chase_templates')
      .update({ subject: tmpl.subject, body: tmpl.body })
      .eq('id', tmpl.id)

    if (error) {
      toast.error('Failed to save')
    } else {
      toast.success('Saved!')
    }
    setSavingId(null)
  }

  function updateMessageText(id: string, text: string) {
    setMessageTemplates(prev =>
      prev.map(t => t.id === id ? { ...t, message_text: text } : t)
    )
  }

  function updateChaseBody(id: string, body: string) {
    setChaseTemplates(prev =>
      prev.map(t => t.id === id ? { ...t, body } : t)
    )
  }

  function updateChaseSubject(id: string, subject: string) {
    setChaseTemplates(prev =>
      prev.map(t => t.id === id ? { ...t, subject } : t)
    )
  }

  const TYPE_LABELS: Record<string, string> = {
    initial: 'Initial Contact Script',
    followup_1: 'Follow-up 1',
    followup_2: 'Follow-up 2',
  }

  if (loading) {
    return (
      <div className={`${nunito.className} flex items-center justify-center py-20`}>
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className={`${nunito.className} py-4 space-y-6 max-w-2xl mx-auto`}>
      <div>
        <h1 className="text-xl font-bold text-foreground">Scripts</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Edit the message templates used for lead outreach. Changes take effect immediately.
        </p>
      </div>

      {/* Message Templates Section */}
      <section className="space-y-4">
        <h2 className="text-base font-semibold text-foreground border-b pb-2">
          Message Templates
        </h2>
        <p className="text-xs text-muted-foreground">
          Available variables: <code className="bg-muted px-1.5 py-0.5 rounded text-xs">[BRIDE_NAME]</code>{' '}
          <code className="bg-muted px-1.5 py-0.5 rounded text-xs">[SHOW_NAME]</code>
        </p>

        {messageTemplates.map(tmpl => (
          <Card key={tmpl.id} className="p-4 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold">{TYPE_LABELS[tmpl.template_type] ?? tmpl.template_type}</h3>
              <Button
                size="sm"
                className="h-8 bg-[#0d4f4f] hover:bg-[#0d4f4f]/90 text-white"
                onClick={() => saveMessageTemplate(tmpl)}
                disabled={savingId === tmpl.id}
              >
                {savingId === tmpl.id ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" />
                ) : (
                  <Save className="h-3.5 w-3.5 mr-1" />
                )}
                Save
              </Button>
            </div>
            <textarea
              value={tmpl.message_text}
              onChange={(e) => updateMessageText(tmpl.id, e.target.value)}
              rows={6}
              className="w-full rounded-lg border border-border bg-white px-3 py-2 text-sm outline-none resize-y focus:border-[#0d4f4f] focus:ring-1 focus:ring-[#0d4f4f]/20 font-mono text-xs leading-relaxed"
            />
          </Card>
        ))}
      </section>

      {/* Chase Templates Section */}
      <section className="space-y-4">
        <h2 className="text-base font-semibold text-foreground border-b pb-2">
          Chase Engine Scripts (6 Touches)
        </h2>
        <p className="text-xs text-muted-foreground">
          Available variables:{' '}
          <code className="bg-muted px-1.5 py-0.5 rounded text-xs">{'{{bride_name}}'}</code>{' '}
          <code className="bg-muted px-1.5 py-0.5 rounded text-xs">{'{{venue_name}}'}</code>{' '}
          <code className="bg-muted px-1.5 py-0.5 rounded text-xs">{'{{wedding_date}}'}</code>{' '}
          <code className="bg-muted px-1.5 py-0.5 rounded text-xs">{'{{show_name}}'}</code>
        </p>

        {chaseTemplates.map(tmpl => (
          <Card key={tmpl.id} className="p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-semibold">
                  {TOUCH_LABELS[tmpl.touch_number] ?? `Touch ${tmpl.touch_number}`}
                </h3>
                <span className="text-xs text-muted-foreground capitalize">{tmpl.contact_type}</span>
              </div>
              <Button
                size="sm"
                className="h-8 bg-[#0d4f4f] hover:bg-[#0d4f4f]/90 text-white"
                onClick={() => saveChaseTemplate(tmpl)}
                disabled={savingId === tmpl.id}
              >
                {savingId === tmpl.id ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" />
                ) : (
                  <Save className="h-3.5 w-3.5 mr-1" />
                )}
                Save
              </Button>
            </div>

            {tmpl.subject !== null && (
              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground">Subject</label>
                <input
                  value={tmpl.subject ?? ''}
                  onChange={(e) => updateChaseSubject(tmpl.id, e.target.value)}
                  className="w-full h-9 rounded-lg border border-border bg-white px-3 text-sm outline-none focus:border-[#0d4f4f] focus:ring-1 focus:ring-[#0d4f4f]/20"
                />
              </div>
            )}

            <textarea
              value={tmpl.body}
              onChange={(e) => updateChaseBody(tmpl.id, e.target.value)}
              rows={5}
              className="w-full rounded-lg border border-border bg-white px-3 py-2 text-sm outline-none resize-y focus:border-[#0d4f4f] focus:ring-1 focus:ring-[#0d4f4f]/20 font-mono text-xs leading-relaxed"
            />
          </Card>
        ))}
      </section>
    </div>
  )
}
