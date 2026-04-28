'use client'

import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { formatWeddingDate } from '@/lib/formatters'
import { HubCouple, HubContract, HubMilestones } from './types'

const PHASE_LABELS: Record<string, string> = {
  'new_client': 'New Client',
  'pre_engagement': 'Pre-Engagement',
  'post_engagement': 'Post-Engagement',
  'pre_wedding': 'Pre-Wedding',
  'post_wedding': 'Post-Wedding',
  'post_production': 'Post-Production',
  'completed': 'Completed',
}

const PHASE_COLORS: Record<string, string> = {
  'new_client': 'bg-gray-100 text-gray-700',
  'pre_engagement': 'bg-yellow-100 text-yellow-700',
  'post_engagement': 'bg-blue-100 text-blue-700',
  'pre_wedding': 'bg-green-100 text-green-700',
  'post_wedding': 'bg-yellow-100 text-yellow-700',
  'post_production': 'bg-blue-100 text-blue-700',
  'completed': 'bg-green-100 text-green-700',
}

interface Props {
  couple: HubCouple
  contract: HubContract | null
  milestones: HubMilestones | null
}

export function HubHeader({ couple, contract, milestones }: Props) {
  const phase = couple.phase || 'new_client'

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
          {PHASE_LABELS[phase] || phase}
        </span>
      </div>
      <div className="flex flex-wrap gap-x-4 text-sm text-muted-foreground">
        {contract?.package_name && <span>Package: {contract.package_name}</span>}
        {contract?.reception_venue && <span>Venue: {contract.reception_venue}</span>}
      </div>
    </div>
  )
}
