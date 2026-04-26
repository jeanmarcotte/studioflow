'use client'

import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { formatWeddingDate } from '@/lib/formatters'
import { HubCouple, HubContract, HubMilestones } from './types'

function computePhase(m: HubMilestones | null): string {
  if (!m) return 'New Client'
  if (m.m34_items_picked_up) return 'Completed'
  if (m.m22_proofs_edited) return 'Post-Production'
  if (m.m19_wedding_day) return 'Post-Wedding'
  if (m.m15_day_form_approved) return 'Pre-Wedding'
  if (m.m06_eng_session_shot) return 'Post-Engagement'
  if (m.m06_declined) return 'Pre-Wedding'
  return 'New Client'
}

const PHASE_COLORS: Record<string, string> = {
  'Completed': 'bg-blue-100 text-blue-700',
  'Post-Production': 'bg-purple-100 text-purple-700',
  'Post-Wedding': 'bg-orange-100 text-orange-700',
  'Pre-Wedding': 'bg-teal-100 text-teal-700',
  'Post-Engagement': 'bg-green-100 text-green-700',
  'New Client': 'bg-gray-100 text-gray-700',
}

interface Props {
  couple: HubCouple
  contract: HubContract | null
  milestones: HubMilestones | null
}

export function HubHeader({ couple, contract, milestones }: Props) {
  const phase = computePhase(milestones)

  return (
    <div className="space-y-1">
      <Link href="/admin/production/photo" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors">
        <ArrowLeft className="h-4 w-4" />
        Back to Production
      </Link>
      <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
        <h1 className="text-2xl font-bold" style={{ fontFamily: 'Playfair Display, serif' }}>
          {couple.bride_first_name || '—'} & {couple.groom_first_name || '—'}
        </h1>
        <span className="text-muted-foreground text-sm">{formatWeddingDate(couple.wedding_date)}</span>
        <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${PHASE_COLORS[phase] || 'bg-gray-100 text-gray-700'}`}>
          {phase}
        </span>
      </div>
      <div className="flex flex-wrap gap-x-4 text-sm text-muted-foreground">
        {contract?.package_name && <span>Package: {contract.package_name}</span>}
        {contract?.reception_venue && <span>Venue: {contract.reception_venue}</span>}
      </div>
    </div>
  )
}
