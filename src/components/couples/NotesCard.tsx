import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

interface NotesCardProps {
  coupleNotes: string | null
  weddingDayNotes: {
    additional: string | null
    final: string | null
  } | null
}

export function NotesCard({ coupleNotes, weddingDayNotes }: NotesCardProps) {
  const hasAnyNotes = coupleNotes || weddingDayNotes?.additional || weddingDayNotes?.final

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-medium">Notes</CardTitle>
      </CardHeader>
      <CardContent>
        {!hasAnyNotes ? (
          <p className="text-sm text-gray-400 italic">No notes</p>
        ) : (
          <div className="space-y-4">
            {/* Couple notes */}
            {coupleNotes && (
              <div>
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">General</p>
                <p className="text-sm text-gray-700 whitespace-pre-wrap">{coupleNotes}</p>
              </div>
            )}

            {/* Wedding day additional notes */}
            {weddingDayNotes?.additional && (
              <div>
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">Wedding Day Notes</p>
                <p className="text-sm text-gray-700 whitespace-pre-wrap">{weddingDayNotes.additional}</p>
              </div>
            )}

            {/* Wedding day final notes */}
            {weddingDayNotes?.final && (
              <div>
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">Final Notes from Couple</p>
                <p className="text-sm text-gray-700 whitespace-pre-wrap">{weddingDayNotes.final}</p>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
