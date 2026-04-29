'use client'

import { useEffect, useState } from 'react'

interface Zone {
  id: string
  label: string
}

interface Props {
  zones: Zone[]
}

export function PortalDotNav({ zones }: Props) {
  const [activeId, setActiveId] = useState<string>(zones[0]?.id ?? '')

  useEffect(() => {
    const elements = zones
      .map(z => document.getElementById(z.id))
      .filter((el): el is HTMLElement => el !== null)

    if (elements.length === 0) return

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter(e => e.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)
        if (visible.length > 0) {
          setActiveId(visible[0].target.id)
        }
      },
      { threshold: [0.25, 0.5, 0.75], rootMargin: '-10% 0px -10% 0px' }
    )

    elements.forEach(el => observer.observe(el))
    return () => observer.disconnect()
  }, [zones])

  const scrollTo = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  return (
    <nav className="hidden lg:flex fixed right-6 top-1/2 -translate-y-1/2 flex-col gap-3 z-50" aria-label="Section navigation">
      {zones.map(zone => {
        const active = activeId === zone.id
        return (
          <button
            key={zone.id}
            onClick={() => scrollTo(zone.id)}
            aria-label={zone.label}
            aria-current={active ? 'true' : undefined}
            className="group relative flex items-center justify-center"
            style={{ width: 12, height: 12 }}
          >
            <span
              className="block rounded-full transition-all"
              style={{
                width: active ? 12 : 8,
                height: active ? 12 : 8,
                backgroundColor: active ? '#0F6E56' : '#cbd5d0',
              }}
            />
            <span
              className="absolute right-full mr-3 whitespace-nowrap rounded-md px-2 py-1 text-xs font-medium opacity-0 transition-opacity group-hover:opacity-100"
              style={{ backgroundColor: '#1a1a1a', color: '#fff' }}
            >
              {zone.label}
            </span>
          </button>
        )
      })}
    </nav>
  )
}
