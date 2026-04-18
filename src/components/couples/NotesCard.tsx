import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

interface NotesCardProps {
  notes: string | null
}

export function NotesCard({ notes }: NotesCardProps) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-medium">Notes</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-gray-700 whitespace-pre-wrap">
          {notes ?? 'No notes'}
        </p>
      </CardContent>
    </Card>
  )
}
