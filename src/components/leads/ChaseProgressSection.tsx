'use client'

import { useState, useEffect } from 'react'
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
}

const MAX_TOUCHES = 6

function formatContactDate(dateStr: string | null): string {
  if (!dateStr) return '—'
  const d = new Date(dateStr)
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
  return `${months[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`
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
    call: 'Call', text: 'Text', email: 'Email', voicemail: 'Voicemail', zoom: 'Zoom', in_person: 'In Person'
  }
  return map[type] || type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())
}

export function ChaseProgressSection({ ballotId }: ChaseProgressSectionProps) {
  const [contacts, setContacts] = useState<Contact[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetch() {
      const { data } = await supabase
        .from('lead_contacts')
        .select('id, contact_number, contact_type, contact_date, outcome, notes')
        .eq('ballot_id', ballotId)
        .order('contact_number', { ascending: true })

      setContacts((data as Contact[]) || [])
      setLoading(false)
    }
    fetch()
  }, [ballotId])

  const touchCount = contacts.length
  const lastContact = contacts.length > 0 ? contacts[contacts.length - 1] : null

  return (
    <div className="space-y-3">
      <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
        <span>📞</span> Chase Progress
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
                — Last: {formatContactDate(lastContact.contact_date)} {daysAgo(lastContact.contact_date)}
              </span>
            )}
          </div>

          {/* History */}
          {contacts.length > 0 && (
            <div className="space-y-1.5 pt-1">
              {contacts.map(c => (
                <div key={c.id} className="text-xs text-muted-foreground flex gap-2">
                  <span className="font-semibold text-foreground shrink-0">Touch {c.contact_number}:</span>
                  <span>{contactTypeLabel(c.contact_type)}</span>
                  <span>—</span>
                  <span>{formatContactDate(c.contact_date)}</span>
                  {c.notes && <span className="italic truncate">— "{c.notes}"</span>}
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
