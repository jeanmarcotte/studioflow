'use client'

import { Construction } from 'lucide-react'

interface UnderConstructionProps {
  title: string
  description?: string
}

export function UnderConstruction({ title, description }: UnderConstructionProps) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
      <div className="rounded-full bg-amber-100 p-6 mb-6">
        <Construction className="h-12 w-12 text-amber-600" />
      </div>
      <h1 className="text-3xl font-bold mb-2">{title}</h1>
      <p className="text-muted-foreground text-lg max-w-md">
        {description || 'This page is under construction. Check back soon.'}
      </p>
    </div>
  )
}
