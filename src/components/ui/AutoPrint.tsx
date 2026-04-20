'use client'

import { useSearchParams } from 'next/navigation'
import { useEffect } from 'react'

export function AutoPrint() {
  const searchParams = useSearchParams()

  useEffect(() => {
    if (searchParams.get('print') === 'true') {
      const timer = setTimeout(() => window.print(), 800)
      return () => clearTimeout(timer)
    }
  }, [searchParams])

  return null
}
