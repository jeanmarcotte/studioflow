'use client'

import { ExternalLink } from 'lucide-react'
import { motion } from 'framer-motion'
import { formatPackage } from '@/lib/formatters'

const PHASE_COLORS: Record<string, string> = {
  pre_wedding: '#0d9488',
  wedding_day: '#d97706',
  post_production: '#2563eb',
  completed: '#16a34a',
  archived: '#6b7280',
}

function formatPhase(phase: string): string {
  if (!phase) return ''
  return phase.split('_').map(w => w ? w[0].toUpperCase() + w.slice(1) : w).join(' ')
}

interface CoupleHeaderProps {
  coupleName: string
  packageType: string
  phase: string
  weddingDate: string
  daysUntil: number
  signedDate: string
  bookedDate: string
  portalSlug?: string | null
}

export function CoupleHeader({
  coupleName,
  packageType,
  phase,
  weddingDate,
  daysUntil,
  signedDate,
  bookedDate,
  portalSlug
}: CoupleHeaderProps) {
  const daysColor = daysUntil < 0 ? 'text-amber-200' : 'text-emerald-200'
  const daysText = daysUntil < 0
    ? `${Math.abs(daysUntil)} days ago`
    : daysUntil === 0 ? 'Today!' : `${daysUntil} days until wedding`

  return (
    <div className="bg-gradient-to-r from-teal-700 to-teal-900 rounded-xl p-6 md:p-8 text-white relative">
      <div className="flex flex-col md:flex-row md:justify-between md:items-start gap-3 md:gap-0">
        <div>
          <h1 className="text-xl md:text-2xl font-bold">
            {coupleName} <span className="text-teal-100 text-lg font-normal">— {formatPackage(packageType)}</span>
          </h1>
          <p className="mt-2 text-teal-100 text-sm md:text-base">
            {weddingDate} · <span className={daysColor}>{daysText}</span>
          </p>
          <p className="text-sm text-teal-200">
            Signed {signedDate} · Booked {bookedDate}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {(() => {
            const phaseColor = PHASE_COLORS[phase] ?? '#6b7280'
            const isArchived = phase === 'archived'
            return (
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.5, ease: 'easeOut' }}
                className="flex items-center gap-2"
              >
                <motion.span
                  className="inline-flex h-3 w-3 rounded-full"
                  style={{ backgroundColor: phaseColor }}
                  animate={isArchived ? undefined : { scale: [1, 1.25, 1], opacity: [1, 0.6, 1] }}
                  transition={isArchived ? undefined : { duration: 2, repeat: Infinity, ease: 'easeInOut' }}
                />
                <motion.span
                  className="px-3 py-1 rounded-full text-sm font-medium border border-white/40 text-white"
                  animate={isArchived ? undefined : {
                    boxShadow: [
                      `0 0 0 0 ${phaseColor}00`,
                      `0 0 8px 2px ${phaseColor}66`,
                      `0 0 0 0 ${phaseColor}00`,
                    ],
                  }}
                  transition={isArchived ? undefined : { duration: 2, repeat: Infinity, ease: 'easeInOut' }}
                >
                  {formatPhase(phase)}
                </motion.span>
              </motion.div>
            )
          })()}
        </div>
      </div>
      {portalSlug && (
        <a
          href={`/portal/${portalSlug}`}
          target="_blank"
          className="absolute bottom-4 right-4 md:bottom-5 md:right-6 inline-flex items-center gap-1.5 px-3 py-1.5 text-sm text-white border border-white/40 rounded-md hover:bg-white/10 transition"
        >
          View Portal <ExternalLink className="w-3.5 h-3.5" />
        </a>
      )}
    </div>
  )
}
