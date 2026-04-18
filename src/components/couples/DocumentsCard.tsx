'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { FileText, Check, X, ExternalLink } from 'lucide-react'
import Link from 'next/link'

interface FormsStatus {
  weddingDayForm: { submitted: boolean; formId?: string }
  videoOrderForm: { submitted: boolean; formId?: string }
}

interface DocumentsCardProps {
  coupleId: string
  formsStatus: FormsStatus
}

export function DocumentsCard({ coupleId, formsStatus }: DocumentsCardProps) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-medium">Forms</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Wedding Day Form */}
        <div className="flex items-center justify-between py-2 border-b">
          <div className="flex items-center gap-3">
            <FileText className="w-5 h-5 text-gray-400" />
            <span className="text-sm text-gray-900">Wedding Day Form</span>
          </div>
          {formsStatus.weddingDayForm.submitted && formsStatus.weddingDayForm.formId ? (
            <Link
              href={`/admin/wedding-day/forms/${formsStatus.weddingDayForm.formId}/print`}
              target="_blank"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-md bg-green-50 text-green-700 hover:bg-green-100"
            >
              <Check className="w-4 h-4" />
              View <ExternalLink className="w-3 h-3" />
            </Link>
          ) : (
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm text-gray-400">
              <X className="w-4 h-4" />
              Not submitted
            </span>
          )}
        </div>

        {/* Video Order Form */}
        <div className="flex items-center justify-between py-2">
          <div className="flex items-center gap-3">
            <FileText className="w-5 h-5 text-gray-400" />
            <span className="text-sm text-gray-900">Video Order Form</span>
          </div>
          {formsStatus.videoOrderForm.submitted && formsStatus.videoOrderForm.formId ? (
            <Link
              href={`/admin/video-orders/${formsStatus.videoOrderForm.formId}`}
              target="_blank"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-md bg-green-50 text-green-700 hover:bg-green-100"
            >
              <Check className="w-4 h-4" />
              View <ExternalLink className="w-3 h-3" />
            </Link>
          ) : (
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm text-gray-400">
              <X className="w-4 h-4" />
              Not submitted
            </span>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
