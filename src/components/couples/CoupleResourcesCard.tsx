'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { FileText, Check, X, ExternalLink } from 'lucide-react'
import Link from 'next/link'

interface ResourceLink {
  label: string
  href: string | null
  exists: boolean
}

interface CoupleResourcesCardProps {
  resources: ResourceLink[]
}

export function CoupleResourcesCard({ resources }: CoupleResourcesCardProps) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-medium">Couple Resources</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {resources.map((resource) => (
          <div key={resource.label} className="flex items-center justify-between py-2 border-b last:border-0">
            <div className="flex items-center gap-3">
              <FileText className="w-4 h-4 text-gray-400" />
              <span className="text-sm text-gray-900">{resource.label}</span>
            </div>
            {resource.exists && resource.href ? (
              <Link
                href={resource.href}
                target="_blank"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-md bg-green-50 text-green-700 hover:bg-green-100"
              >
                <Check className="w-4 h-4" />
                View <ExternalLink className="w-3 h-3" />
              </Link>
            ) : (
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm text-gray-400">
                <X className="w-4 h-4" />
                {resource.href === null ? 'Coming soon' : 'Not submitted'}
              </span>
            )}
          </div>
        ))}
      </CardContent>
    </Card>
  )
}
