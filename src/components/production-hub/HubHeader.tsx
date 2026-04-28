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
  'new_client': 'bg-slate-500/20 text-slate-300 border border-slate-500/30',
  'pre_engagement': 'bg-yellow-500/20 text-yellow-300 border border-yellow-500/30',
  'post_engagement': 'bg-blue-500/20 text-blue-300 border border-blue-500/30',
  'pre_wedding': 'bg-green-500/20 text-green-300 border border-green-500/30',
  'post_wedding': 'bg-yellow-500/20 text-yellow-300 border border-yellow-500/30',
  'post_production': 'bg-blue-500/20 text-blue-300 border border-blue-500/30',
  'completed': 'bg-green-500/20 text-green-300 border border-green-500/30',
}

interface Props {
  couple: HubCouple
  contract: HubContract | null
  milestones: HubMilestones | null
}

export function HubHeader({ couple, contract, milestones }: Props) {
  const phase = couple.phase || 'new_client'

  return (
    <div className="space-y-3">
      <Link href="/admin/production/photo" className="inline-flex items-center gap-1 text-sm text-slate-400 hover:text-white transition-colors">
        <ArrowLeft className="h-4 w-4" />
        Back to Production
      </Link>
      <div className="bg-gradient-to-r from-slate-800 via-slate-700 to-slate-900 rounded-xl p-6 md:p-8">
        <div className="flex flex-col md:flex-row md:justify-between md:items-start gap-3 md:gap-0">
          <div>
            <h1 className="text-xl md:text-2xl font-bold text-white" style={{ fontFamily: 'Playfair Display, serif' }}>
              {couple.bride_first_name || '—'} & {couple.groom_first_name || '—'}
            </h1>
            <p className="mt-2 text-slate-300 text-sm">{formatWeddingDate(couple.wedding_date)}</p>
            <div className="flex flex-wrap gap-x-4 text-sm text-slate-400 mt-1">
              {contract?.package_name && <span>Package: {contract.package_name}</span>}
              {contract?.reception_venue && <span>Venue: {contract.reception_venue}</span>}
            </div>
          </div>
          <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ${PHASE_COLORS[phase] || 'bg-slate-500/20 text-slate-300 border border-slate-500/30'}`}>
            {PHASE_LABELS[phase] || phase}
          </span>
        </div>
      </div>
    </div>
  )
}
