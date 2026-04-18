import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

interface TeamAssignment {
  photo_1: string | null
  photo_2: string | null
  video_1: string | null
  status: string
}

interface TeamCardProps {
  assignment: TeamAssignment | null
}

export function TeamCard({ assignment }: TeamCardProps) {
  const leadPhotographer = assignment?.photo_1 || 'TBD'
  const secondPhotographer = assignment?.photo_2 || null
  const videographer = assignment?.video_1 || null

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-medium">Team</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Lead Photographer - Always show */}
        <div className="border rounded-lg p-4">
          <p className="text-xs font-medium text-teal-600 uppercase tracking-wider mb-1">Lead Photographer</p>
          <p className="text-lg font-medium text-gray-900">{leadPhotographer}</p>
        </div>

        {/* Second Photographer - Only show if assigned */}
        {secondPhotographer && (
          <div className="border rounded-lg p-4">
            <p className="text-xs font-medium text-teal-600 uppercase tracking-wider mb-1">Second Photographer</p>
            <p className="text-lg font-medium text-gray-900">{secondPhotographer}</p>
          </div>
        )}

        {/* Videographer - Only show if assigned */}
        {videographer && (
          <div className="border rounded-lg p-4">
            <p className="text-xs font-medium text-teal-600 uppercase tracking-wider mb-1">Videographer</p>
            <p className="text-lg font-medium text-gray-900">{videographer}</p>
          </div>
        )}

        {/* Status badge */}
        {assignment && (
          <div className="pt-2">
            <span className={`px-2 py-1 rounded-full text-xs font-medium ${
              assignment.status === 'confirmed'
                ? 'bg-green-100 text-green-700'
                : 'bg-yellow-100 text-yellow-700'
            }`}>
              {assignment.status === 'confirmed' ? 'Confirmed' : 'Pending'}
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
