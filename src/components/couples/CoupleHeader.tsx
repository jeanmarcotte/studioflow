'use client'

import { Badge } from '@/components/ui/badge'

interface CoupleHeaderProps {
  coupleName: string
  packageType: string
  status: string
  phase: string
  weddingDate: string
  daysUntil: number
  signedDate: string
  bookedDate: string
}

export function CoupleHeader({
  coupleName,
  packageType,
  status,
  phase,
  weddingDate,
  daysUntil,
  signedDate,
  bookedDate
}: CoupleHeaderProps) {
  const statusColor = {
    booked: 'bg-green-600 hover:bg-green-600',
    completed: 'bg-blue-600 hover:bg-blue-600',
    cancelled: 'bg-red-600 hover:bg-red-600',
    lead: 'bg-gray-500 hover:bg-gray-500',
    quoted: 'bg-yellow-500 hover:bg-yellow-500'
  }[status] ?? 'bg-gray-500'

  return (
    <div className="bg-teal-600 rounded-lg p-6 text-white">
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-2xl font-semibold">
            {coupleName} <span className="text-teal-200 font-normal">— {packageType}</span>
          </h1>
          <p className="mt-2 text-teal-100">
            {weddingDate} · <span className="text-teal-200">{daysUntil} days until wedding</span>
          </p>
          <p className="text-sm text-teal-200">
            Signed {signedDate} · Booked {bookedDate}
          </p>
        </div>
        <div className="flex gap-2">
          <Badge className={statusColor}>{status}</Badge>
          <Badge variant="outline" className="border-white text-white">{phase}</Badge>
        </div>
      </div>
    </div>
  )
}
