'use client'

import { Phone, MessageSquare, Mail } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import type { Lead } from '@/lib/lead-utils'
import { getCallScript, getTextTemplate, formatWeddingDate, formatShowName } from '@/lib/lead-utils'

interface ContactSectionProps {
  lead: Lead
}

function formatPhone(phone: string | null): string {
  if (!phone) return '—'
  const digits = phone.replace(/\D/g, '')
  if (digits.length === 10) {
    return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`
  }
  if (digits.length === 11 && digits[0] === '1') {
    return `(${digits.slice(1, 4)}) ${digits.slice(4, 7)}-${digits.slice(7)}`
  }
  return phone
}

export function ContactSection({ lead }: ContactSectionProps) {
  const handleCall = async () => {
    await navigator.clipboard.writeText(getCallScript(lead))
    toast.success('Script copied! Call from iPhone')
  }

  const handleText = async () => {
    await navigator.clipboard.writeText(getTextTemplate(lead))
    toast.success('Text copied! Send from iPhone')
  }

  return (
    <div className="space-y-3">
      <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
        <span>📍</span> Contact Info
      </h3>

      {/* Phone */}
      <div className="flex items-center justify-between">
        <div className="text-sm">
          <span className="text-muted-foreground mr-2">📞</span>
          <span className="font-medium">{formatPhone(lead.cell_phone)}</span>
        </div>
        <div className="flex gap-1">
          <Button variant="ghost" size="sm" className="h-9 px-3 text-xs" onClick={handleCall}>
            <Phone className="h-3.5 w-3.5 mr-1" /> Call
          </Button>
          <Button variant="ghost" size="sm" className="h-9 px-3 text-xs" onClick={handleText}>
            <MessageSquare className="h-3.5 w-3.5 mr-1" /> Text
          </Button>
        </div>
      </div>

      {/* Email */}
      <div className="flex items-center justify-between">
        <div className="text-sm truncate mr-2">
          <span className="text-muted-foreground mr-2">✉️</span>
          <span className="font-medium">{lead.email || '—'}</span>
        </div>
        {lead.email && (
          <Button
            variant="ghost"
            size="sm"
            className="h-9 px-3 text-xs shrink-0"
            onClick={() => {
              window.open(`mailto:${lead.email}?subject=SIGS Photography — Your Wedding Day!`, '_blank')
              toast.success('Opening email compose')
            }}
          >
            <Mail className="h-3.5 w-3.5 mr-1" /> Email
          </Button>
        )}
      </div>

      {/* Quick details */}
      <div className="text-sm space-y-1 pt-1 border-t border-border/60">
        <div className="flex justify-between">
          <span className="text-muted-foreground">Venue</span>
          <span className="font-medium text-right">{lead.venue_name || '—'}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">Date</span>
          <span className="font-medium">{formatWeddingDate(lead.wedding_date)}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">Source</span>
          <span className="font-medium">{formatShowName(lead.show_id)}</span>
        </div>
      </div>
    </div>
  )
}
