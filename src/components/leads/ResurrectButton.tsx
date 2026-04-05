'use client'

import { useState } from 'react'
import { RotateCcw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import { resurrectLead } from '@/lib/chase-actions'
import type { Lead } from '@/lib/lead-utils'

interface ResurrectButtonProps {
  lead: Lead
  onResurrected: (updated: Lead) => void
}

export function ResurrectButton({ lead, onResurrected }: ResurrectButtonProps) {
  const [submitting, setSubmitting] = useState(false)

  const handleResurrect = async () => {
    setSubmitting(true)
    const ok = await resurrectLead(lead.id, lead.entity_id)
    setSubmitting(false)

    if (ok) {
      toast.success('Lead resurrected! Starting fresh chase.')
      onResurrected({
        ...lead,
        status: 'contacted',
        contact_count: 0,
      })
    } else {
      toast.error('Failed to resurrect lead')
    }
  }

  if (lead.status !== 'dead') return null

  return (
    <div className="rounded-xl border-2 border-dashed border-gray-300 bg-gray-50 p-4 text-center space-y-2">
      <div className="text-lg">💀</div>
      <div className="text-sm font-bold text-muted-foreground">This lead is DEAD</div>
      <div className="text-xs text-muted-foreground">6 touches, no response</div>
      <Button
        onClick={handleResurrect}
        disabled={submitting}
        className="mt-2 bg-[#0d4f4f] hover:bg-[#0d4f4f]/90 text-white"
      >
        <RotateCcw className="h-4 w-4 mr-1.5" />
        {submitting ? 'Resurrecting...' : 'Resurrect Lead'}
      </Button>
    </div>
  )
}
