import { Badge } from '@/components/ui/badge'

interface ContractPackageProps {
  signedDate: string
  isActive: boolean
  coverage: {
    package: string
    hours: string
    day: string
    locations: string
    drone: boolean
    guests: number
  }
  engagement: {
    included: boolean
    location: string | null
  }
  team: {
    photographers: number
    videographers: number
  }
  financials: {
    c1Contract: number
    c2FramesAlbums: number
    total: number
  }
}

export function ContractPackageCard({
  signedDate,
  isActive,
  coverage,
  engagement,
  team,
  financials
}: ContractPackageProps) {
  return (
    <div className="border rounded-lg overflow-hidden">
      {/* Header */}
      <div className="bg-teal-600 px-5 py-4 flex justify-between items-center">
        <span className="text-white font-medium">Contract Package — As Signed</span>
        <div className="flex items-center gap-2">
          <span className="text-teal-100 text-sm">{signedDate}</span>
          {isActive && <Badge className="bg-green-500">ACTIVE</Badge>}
        </div>
      </div>

      {/* 4-Column Grid */}
      <div className="grid grid-cols-4 divide-x">
        {/* Coverage */}
        <div className="p-4">
          <h4 className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-3">Coverage</h4>
          <dl className="space-y-2 text-sm">
            <div className="flex justify-between">
              <dt className="text-gray-500">Package</dt>
              <dd className="text-gray-900">{coverage.package}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-gray-500">Hours</dt>
              <dd className="text-gray-900">{coverage.hours}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-gray-500">Day</dt>
              <dd className="text-gray-900">{coverage.day}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-gray-500">Locations</dt>
              <dd className="text-gray-900">{coverage.locations}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-gray-500">Drone</dt>
              <dd className="text-gray-900">{coverage.drone ? '✓ Yes' : 'No'}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-gray-500">Guests</dt>
              <dd className="text-gray-900">{coverage.guests}</dd>
            </div>
          </dl>
        </div>

        {/* Engagement */}
        <div className="p-4">
          <h4 className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-3">Engagement</h4>
          <dl className="space-y-2 text-sm">
            <div className="flex justify-between">
              <dt className="text-gray-500">Session</dt>
              <dd className="text-gray-900">{engagement.included ? '✓ Included' : 'Not included'}</dd>
            </div>
            {engagement.location && (
              <div className="flex justify-between">
                <dt className="text-gray-500">Location</dt>
                <dd className="text-gray-900">{engagement.location}</dd>
              </div>
            )}
          </dl>
        </div>

        {/* Team */}
        <div className="p-4">
          <h4 className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-3">Team</h4>
          <dl className="space-y-2 text-sm">
            <div className="flex justify-between">
              <dt className="text-gray-500">Photographers</dt>
              <dd className="text-gray-900">{team.photographers}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-gray-500">Videographers</dt>
              <dd className="text-gray-900">{team.videographers === 0 ? 'None' : team.videographers}</dd>
            </div>
          </dl>
        </div>

        {/* Financials */}
        <div className="p-4">
          <h4 className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-3">Financials</h4>
          <dl className="space-y-2 text-sm">
            <div className="flex justify-between">
              <dt className="text-gray-500">C1 Contract</dt>
              <dd className="text-gray-900">${financials.c1Contract.toLocaleString()}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-gray-500">C2 Frames & Albums</dt>
              <dd className="text-gray-900">${financials.c2FramesAlbums.toLocaleString()}</dd>
            </div>
            <div className="flex justify-between pt-2 border-t mt-2">
              <dt className="text-gray-700 font-medium">Total</dt>
              <dd className="text-gray-900 font-medium">${financials.total.toLocaleString()}</dd>
            </div>
          </dl>
        </div>
      </div>
    </div>
  )
}
