import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { FileText } from 'lucide-react'

interface Document {
  name: string
  status: 'available' | 'generating' | 'unavailable'
  generateAction?: () => void
  unavailableReason?: string
}

interface DocumentsCardProps {
  documents: Document[]
}

export function DocumentsCard({ documents }: DocumentsCardProps) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-medium">Documents</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {documents.map((doc) => (
          <div key={doc.name} className="flex items-center justify-between py-2 border-b last:border-0">
            <div className="flex items-center gap-3">
              <FileText className="w-5 h-5 text-gray-400" />
              <span className="text-sm text-gray-900">{doc.name}</span>
            </div>
            {doc.status === 'available' && doc.generateAction && (
              <Button variant="outline" size="sm" onClick={doc.generateAction}>
                Generate PDF
              </Button>
            )}
            {doc.status === 'unavailable' && (
              <span className="text-sm text-gray-400">{doc.unavailableReason ?? 'Unavailable'}</span>
            )}
          </div>
        ))}
      </CardContent>
    </Card>
  )
}
