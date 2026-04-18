'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { FileText, ExternalLink } from 'lucide-react'
import Link from 'next/link'

interface Document {
  name: string
  status: 'available' | 'generating' | 'unavailable'
  printUrl?: string
  unavailableReason?: string
}

interface DocumentsCardProps {
  documents: Document[]
  coupleId: string
}

export function DocumentsCard({ documents, coupleId }: DocumentsCardProps) {
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
            {doc.status === 'available' && doc.printUrl && (
              <Link
                href={doc.printUrl}
                target="_blank"
                className="inline-flex items-center gap-1 px-3 py-1.5 text-sm border rounded-md hover:bg-gray-50 text-teal-600"
              >
                Generate PDF <ExternalLink className="w-3 h-3" />
              </Link>
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
