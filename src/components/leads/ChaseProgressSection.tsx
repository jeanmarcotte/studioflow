'use client'

import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'

interface Contact {
  id: string
  contact_number: number
  contact_type: string
  contact_date: string | null
  outcome: string | null
  notes: string | null
}

interface ChaseProgressSectionProps {
  ballotId: string
  refreshKey?: number
}

const MAX_TOUCHES = 6

function formatContactDateTime(dateStr: string | null): string {
  if (!dateStr) return '—'
  const d = new Date(dateStr)
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
  const hh = d.getHours().toString().padStart(2, '0')
  const mm = d.getMinutes().toString().padStart(2, '0')
  return `${months[d.getMonth()]} ${d.getDate()}, ${hh}:${mm}`
}

function daysAgo(dateStr: string | null): string {
  if (!dateStr) return ''
  const d = new Date(dateStr)
  const now = new Date()
  const diff = Math.floor((now.getTime() - d.getTime()) / (1000 * 60 * 60 * 24))
  if (diff === 0) return '(today)'
  if (diff === 1) return '(yesterday)'
  return `(${diff} days ago)`
}

function contactTypeLabel(type: string): string {
  const map: Record<string, string> = {
    call: 'CALL', text: 'TEXT', email: 'EMAIL', voicemail: 'VM', zoom: 'ZOOM', in_person: 'IN PERSON', view: 'VIEW'
  }
  return map[type] || type.toUpperCase()
}

export function ChaseProgressSection({ ballotId, refreshKey }: ChaseProgressSectionProps) {
  const [contacts, setContacts] = useState<Contact[]>([])
  const [loading, setLoading] = useState(true)

  const fetchContacts = useCallback(async () => {
    const { data } = await supabase
      .from('lead_contacts')
      .select('id, contact_number, contact_type, contact_date, outcome, notes')
      .eq('ballot_id', ballotId)
      .order('contact_number', { ascending: true })

    setContacts((data as Contact[]) || [])
    setLoading(false)
  }, [ballotId])

  useEffect(() => {
    fetchContacts()
  }, [fetchContacts, refreshKey])

  const touchCount = contacts.length
  const lastContact = contacts.length > 0 ? contacts[contacts.length - 1] : null

  return (
    <div className="space-y-3">
      <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
        <span>📞</span> Chase History
      </h3>

      {loading ? (
        <div className="h-8 flex items-center text-xs text-muted-foreground">Loading...</div>
      ) : (
        <>
          {/* Progress dots */}
          <div className="flex items-center gap-1">
            {Array.from({ length: MAX_TOUCHES }).map((_, i) => {
              const completed = i < touchCount
              const isCurrent = i === touchCount - 1
              return (
                <div key={i} className="flex items-center">
                  <div className={`h-4 w-4 rounded-full transition-all ${
                    completed
                      ? isCurrent
                        ? 'bg-[#0d4f4f] ring-2 ring-[#0d4f4f]/30'
                        : 'bg-[#0d4f4f]'
                      : 'bg-gray-200'
                  }`} />
                  {i < MAX_TOUCHES - 1 && (
                    <div className={`h-0.5 w-4 ${completed && i < touchCount - 1 ? 'bg-[#0d4f4f]' : 'bg-gray-200'}`} />
                  )}
                </div>
              )
            })}
          </div>

          <div className="text-sm text-muted-foreground">
            Touch {touchCount} of {MAX_TOUCHES}
            {lastContact?.contact_date && (
              <span className="ml-2">
                — Last: {formatContactDateTime(lastContact.contact_date)} {daysAgo(lastContact.contact_date)}
              </span>
            )}
          </div>

          {/* Detailed history cards */}
          {contacts.length > 0 && (
            <div className="space-y-1 pt-1">
              {contacts.map(c => (
                <div key={c.id} className="rounded-lg border border-border/60 bg-gray-50 px-3 py-2">
                  <div className="flex items-center gap-2 text-xs">
                    <span className="font-bold text-foreground">Touch {c.contact_number}</span>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-[#0d4f4f] bg-[#0d4f4f]/10 px-1.5 py-0.5 rounded">
                      {contactTypeLabel(c.contact_type)}
                    </span>
                    <span className="text-muted-foreground ml-auto">{formatContactDateTime(c.contact_date)}</span>
                  </div>
                  {c.notes && (
                    <div className="text-xs text-muted-foreground mt-1 italic">"{c.notes}"</div>
                  )}
                  {c.outcome && c.outcome !== 'sent' && (
                    <div className="text-[10px] text-muted-foreground/70 mt-0.5">Outcome: {c.outcome}</div>
                  )}
                </div>
              ))}
            </div>
          )}

          {contacts.length === 0 && (
            <div className="text-xs text-muted-foreground italic">No contacts logged yet</div>
          )}
        </>
      )}
    </div>
  )
}
