'use client'

import { useState, useEffect } from 'react'
import { Phone, MessageSquare, Mail, Check, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { toast } from 'sonner'
import { supabase } from '@/lib/supabase'
import type { Lead } from '@/lib/lead-utils'
import { getMessageTemplate, formatWeddingDate, formatShowName } from '@/lib/lead-utils'
import { inferCultureFromLastName } from '@/lib/cultureInference'
import { useRouter } from 'next/navigation'

const CULTURE_FLAGS: Record<string, string> = {
  'portuguese': '🇵🇹', 'greek': '🇬🇷', 'italian': '🇮🇹', 'filipino': '🇵🇭',
  'jewish': '🇮🇱', 'caribbean': '🇹🇹', 'trinidadian': '🇹🇹', 'ghanaian': '🇬🇭',
  'jamaican': '🇯🇲', 'spanish': '🇪🇸', 'mexican': '🇪🇸', 'venezuelan': '🇪🇸',
  'colombian': '🇪🇸', 'canadian': '🇨🇦', 'south asian': '🇮🇳', 'indian': '🇮🇳',
  'pakistani': '🇵🇰', 'chinese': '🇨🇳', 'vietnamese': '🇻🇳', 'korean': '🇰🇷',
  'japanese': '🇯🇵', 'irish': '🇮🇪', 'scottish': '🏴󠁧󠁢󠁳󠁣󠁴󠁿', 'ukrainian': '🇺🇦',
  'croatian': '🇭🇷', 'french canadian': '🇨🇦', 'middle eastern': '🇱🇧',
}

interface ContactSectionProps {
  lead: Lead
  onUpdate?: (updated: Lead) => void
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

export function ContactSection({ lead, onUpdate }: ContactSectionProps) {
  const router = useRouter()
  const [isEditingEmail, setIsEditingEmail] = useState(false)
  const [editedEmail, setEditedEmail] = useState(lead?.email || '')

  useEffect(() => {
    setEditedEmail(lead?.email || '')
  }, [lead?.email])

  const phoneDigits = lead.cell_phone?.replace(/\D/g, '') || ''
  const [textScript, setTextScript] = useState('')

  useEffect(() => {
    getMessageTemplate(1, lead).then(setTextScript)
  }, [lead])

  const handleEmailSave = async () => {
    if (!lead?.id) return

    try {
      const { error } = await supabase
        .from('ballots')
        .update({ email: editedEmail.trim() })
        .eq('id', lead.id)

      if (error) throw error

      toast.success('Email updated')
      setIsEditingEmail(false)
      onUpdate?.({ ...lead, email: editedEmail.trim() })
    } catch (err) {
      console.error('Failed to update email:', err)
      toast.error('Failed to update email')
    }
  }

  const handleEmailCancel = () => {
    setEditedEmail(lead?.email || '')
    setIsEditingEmail(false)
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
          <a
            href={`tel:${phoneDigits}`}
            className="inline-flex items-center justify-center rounded-md text-xs font-medium h-11 min-w-[44px] px-3 hover:bg-accent hover:text-accent-foreground"
          >
            <Phone className="h-3.5 w-3.5 mr-1" /> Call
          </a>
          <a
            href={`sms:${phoneDigits}?&body=${encodeURIComponent(textScript)}`}
            className="inline-flex items-center justify-center rounded-md text-xs font-medium h-11 min-w-[44px] px-3 hover:bg-accent hover:text-accent-foreground"
          >
            <MessageSquare className="h-3.5 w-3.5 mr-1" /> Text
          </a>
        </div>
      </div>

      {/* Email */}
      <div className="flex items-center justify-between">
        <div className="text-sm flex items-center gap-2 flex-1 mr-2">
          <span className="text-muted-foreground">✉️</span>
          {isEditingEmail ? (
            <div className="flex items-center gap-1 flex-1">
              <Input
                type="email"
                value={editedEmail}
                onChange={(e) => setEditedEmail(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleEmailSave()
                  if (e.key === 'Escape') handleEmailCancel()
                }}
                className="h-8 text-sm"
                autoFocus
              />
              <Button size="sm" variant="ghost" className="h-8 w-8 p-0 shrink-0" onClick={handleEmailSave}>
                <Check className="w-3.5 h-3.5" />
              </Button>
              <Button size="sm" variant="ghost" className="h-8 w-8 p-0 shrink-0" onClick={handleEmailCancel}>
                <X className="w-3.5 h-3.5" />
              </Button>
            </div>
          ) : (
            <span
              className="font-medium cursor-pointer hover:underline truncate"
              onClick={() => setIsEditingEmail(true)}
              title="Click to edit"
            >
              {lead.email || 'No email — click to add'}
            </span>
          )}
        </div>
        {!isEditingEmail && lead.email && (
          <Button
            variant="ghost"
            size="sm"
            className="h-9 px-3 text-xs shrink-0"
            onClick={() => router.push(`/leads/${lead.id}/compose`)}
          >
            <Mail className="h-3.5 w-3.5 mr-1" /> Email
          </Button>
        )}
      </div>

      {/* Bride & Groom names with flags */}
      {(() => {
        const brideCulture = inferCultureFromLastName(lead.bride_last_name)
        const brideFlag = brideCulture ? CULTURE_FLAGS[brideCulture.toLowerCase()] : null
        const groomCulture = inferCultureFromLastName(lead.groom_last_name)
        const groomFlag = groomCulture ? CULTURE_FLAGS[groomCulture.toLowerCase()] : null
        return (
          <div className="text-sm space-y-1 pt-1 border-t border-border/60">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Bride</span>
              <span className="font-medium">{lead.bride_first_name} {lead.bride_last_name} {brideFlag}</span>
            </div>
            {lead.groom_first_name && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Groom</span>
                <span className="font-medium">{lead.groom_first_name} {lead.groom_last_name} {groomFlag}</span>
              </div>
            )}
          </div>
        )
      })()}

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
