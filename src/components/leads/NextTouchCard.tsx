'use client'

import { useState, useEffect } from 'react'
import { Copy, Check } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import type { Lead } from '@/lib/lead-utils'
import { getTemplateForTouch, renderTemplate, getTemplateVariables } from '@/lib/template-utils'
import { logTouch } from '@/lib/chase-actions'

interface NextTouchCardProps {
  lead: Lead
  onTouchLogged?: () => void
}

export function NextTouchCard({ lead, onTouchLogged }: NextTouchCardProps) {
  const [template, setTemplate] = useState<{ type: string; body: string; subject?: string } | null>(null)
  const [loading, setLoading] = useState(true)

  const touchNum = (lead.contact_count || 0) + 1

  useEffect(() => {
    if (touchNum > 6) {
      setLoading(false)
      return
    }

    getTemplateForTouch(touchNum).then(tmpl => {
      if (tmpl) {
        const vars = getTemplateVariables(lead)
        setTemplate({
          type: tmpl.contact_type,
          body: renderTemplate(tmpl.body, vars),
          subject: tmpl.subject ? renderTemplate(tmpl.subject, vars) : undefined,
        })
      }
      setLoading(false)
    })
  }, [touchNum, lead])

  if (touchNum > 6 || loading) return null

  const handleCopyScript = async () => {
    console.log("=== COPY SCRIPT CLICKED ===")
    console.log("Template:", template)
    if (!template) return
    const text = template.subject ? `Subject: ${template.subject}\n\n${template.body}` : template.body
    try {
      await navigator.clipboard.writeText(text)
      console.log("Clipboard write succeeded")
      toast.success(`Touch ${touchNum} script copied!`)
    } catch (error) {
      console.error("Clipboard write failed:", error)
    }
  }

  const handleLogTouch = async () => {
    console.log("=== LOG TOUCH CLICKED ===")
    console.log("Lead ID:", lead.id)
    console.log("Entity ID:", lead.entity_id)
    console.log("Touch num:", touchNum)
    const contactType = (template?.type || 'text') as 'call' | 'text' | 'email'
    console.log("Contact type:", contactType)
    try {
      console.log("About to call logTouch API...")
      const result = await logTouch(lead.id, lead.entity_id, contactType, `Touch ${touchNum}`)
      console.log("logTouch result:", result)
      if (result) {
        toast(`Logged Touch #${result.touchNumber}`, {
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
    } catch (error) {
      console.error("logTouch API call failed:", error)
    }
  }

  const typeLabel = template?.type?.toUpperCase() || 'TEXT'

  console.log("Rendering NextTouchCard, handleLogTouch is:", typeof handleLogTouch, "handleCopyScript is:", typeof handleCopyScript)

  return (
    <div className="rounded-xl border border-[#0d4f4f]/20 bg-[#0d4f4f]/5 p-3 space-y-2">
      <div className="text-xs font-bold uppercase tracking-wider text-[#0d4f4f] flex items-center gap-1.5">
        <span>📌</span> Next: Touch {touchNum} ({typeLabel})
      </div>

      {template && (
        <div className="text-xs text-muted-foreground line-clamp-3 italic">
          "{template.body.slice(0, 150)}{template.body.length > 150 ? '...' : ''}"
        </div>
      )}

      <div className="flex gap-2 pt-1">
        <Button
          variant="outline"
          size="sm"
          className="h-9 text-xs flex-1"
          onClick={handleCopyScript}
          disabled={!template}
        >
          <Copy className="h-3.5 w-3.5 mr-1" /> Copy Script
        </Button>
        <Button
          size="sm"
          className="h-9 text-xs flex-1 bg-[#0d4f4f] hover:bg-[#0d4f4f]/90 text-white"
          onClick={handleLogTouch}
        >
          <Check className="h-3.5 w-3.5 mr-1" /> Log Touch
        </Button>
      </div>
    </div>
  )
}
