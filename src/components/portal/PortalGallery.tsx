'use client'

import { useState } from 'react'
import Image from 'next/image'
import { Playfair_Display } from 'next/font/google'

const playfair = Playfair_Display({ subsets: ['latin'], weight: ['700'] })

interface Props {
  heroUrl: string | null
  leftUrl: string | null
  centerUrl: string | null
  rightUrl: string | null
  caption: string | null
  bride: string
  groom: string
}

export function PortalGallery({ heroUrl, leftUrl, centerUrl, rightUrl, caption, bride, groom }: Props) {
  const [lightboxSrc, setLightboxSrc] = useState<string | null>(null)

  const collageImages = [leftUrl, centerUrl, rightUrl].filter(Boolean) as string[]
  const hasAnyImage = heroUrl || collageImages.length > 0

  if (!hasAnyImage) {
    return (
      <div className="text-center py-12">
        <p className={`${playfair.className} italic text-xl sm:text-2xl mb-4`} style={{ color: '#78716c' }}>
          Your Gallery
        </p>
        <div className="mx-auto mb-8" style={{ maxWidth: 200, height: 1, backgroundColor: '#d6d3d1' }} />
        <p className="italic text-sm" style={{ color: '#a8a29e' }}>
          Your gallery is being prepared — check back soon!
        </p>
      </div>
    )
  }

  return (
    <>
      {/* Section title */}
      <div className="text-center mb-8">
        <p className={`${playfair.className} italic text-xl sm:text-2xl`} style={{ color: '#44403c' }}>
          Your Gallery
        </p>
        <div className="mx-auto mt-3" style={{ maxWidth: 200, height: 1, backgroundColor: '#d6d3d1' }} />
      </div>

      {/* Desktop: 3-up collage row + hero below */}
      <div className="hidden sm:block">
        {collageImages.length > 0 && (
          <div className="grid grid-cols-3 gap-4 mb-4">
            {collageImages.map((url, i) => (
              <button
                key={i}
                onClick={() => setLightboxSrc(url)}
                className="relative aspect-[3/4] rounded-lg overflow-hidden cursor-pointer hover:scale-[1.02] transition-transform duration-300"
                style={{ boxShadow: '0 4px 20px rgba(0,0,0,0.08)' }}
              >
                <Image src={url} alt={`${bride} & ${groom} — ${i + 1}`} fill sizes="33vw" className="object-cover" />
              </button>
            ))}
          </div>
        )}

        {caption && (
          <p className="text-center text-sm italic mb-6" style={{ color: '#78716c' }}>
            {caption}
          </p>
        )}

        {heroUrl && (
          <div className="flex justify-center">
            <button
              onClick={() => setLightboxSrc(heroUrl)}
              className="relative w-full rounded-lg overflow-hidden cursor-pointer hover:scale-[1.02] transition-transform duration-300"
              style={{ maxWidth: 480, aspectRatio: '4/3', boxShadow: '0 4px 20px rgba(0,0,0,0.08)' }}
            >
              <Image src={heroUrl} alt={`${bride} & ${groom}`} fill sizes="480px" className="object-cover" />
            </button>
          </div>
        )}
      </div>

      {/* Mobile: single column — Hero first, then collage */}
      <div className="sm:hidden space-y-4">
        {heroUrl && (
          <button
            onClick={() => setLightboxSrc(heroUrl)}
            className="relative w-full aspect-[4/5] rounded-lg overflow-hidden cursor-pointer hover:scale-[1.02] transition-transform duration-300"
            style={{ boxShadow: '0 4px 20px rgba(0,0,0,0.08)' }}
          >
            <Image src={heroUrl} alt={`${bride} & ${groom}`} fill sizes="100vw" className="object-cover" />
          </button>
        )}

        {collageImages.map((url, i) => (
          <button
            key={i}
            onClick={() => setLightboxSrc(url)}
            className="relative w-full aspect-[4/5] rounded-lg overflow-hidden cursor-pointer hover:scale-[1.02] transition-transform duration-300"
            style={{ boxShadow: '0 4px 20px rgba(0,0,0,0.08)' }}
          >
            <Image src={url} alt={`${bride} & ${groom} — ${i + 1}`} fill sizes="100vw" className="object-cover" />
          </button>
        ))}

        {caption && (
          <p className="text-center text-sm italic" style={{ color: '#78716c' }}>
            {caption}
          </p>
        )}
      </div>

      {/* Lightbox */}
      {lightboxSrc && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 cursor-pointer"
          onClick={() => setLightboxSrc(null)}
        >
          <div className="relative w-[90vw] h-[90vh]">
            <Image
              src={lightboxSrc}
              alt={`${bride} & ${groom}`}
              fill
              sizes="90vw"
              className="object-contain"
            />
          </div>
        </div>
      )}
    </>
  )
}
