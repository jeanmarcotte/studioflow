'use client'

import { Badge } from '@/components/ui/badge'
import { CollapsibleSection } from '@/components/ui/collapsible-section'

interface ContractPackageProps {
  signedDate?: string
  isActive?: boolean
  coverage?: {
    package: string
    hours: string
    day: string
    locationFlags: {
      groom: boolean
      bride: boolean
      ceremony: boolean
      park: boolean
      reception: boolean
    }
    drone: boolean
    guests: number
  }
  engagement?: {
    included: boolean
    location: string | null
  }
  team?: {
    photographers: number
    videographers: number
  }
  financials?: {
    c1Contract: number
    c2FramesAlbums: number
    total: number
  }
  products?: Record<string, any> | null
}

const PRINT_FIELDS: Array<[string, string]> = [
  ['prints_postcard_thankyou', 'Postcard Thank You Cards'],
  ['prints_5x7', '5×7 Prints'],
  ['prints_8x10', '8×10 Prints'],
  ['prints_11x14', '11×14 Prints'],
  ['prints_16x16', '16×16 Prints'],
  ['prints_16x20', '16×20 Prints'],
  ['prints_20x24', '20×24 Prints'],
  ['prints_24x30', '24×30 Prints'],
  ['prints_30x40', '30×40 Prints'],
]

const DIGITAL_BOOL_FIELDS: Array<[string, string]> = [
  ['usb_dropbox_delivery', 'USB / Dropbox Delivery'],
  ['web_personal_page', 'Personal Web Page'],
  ['post_production', 'Post Production'],
]

const DIGITAL_COUNT_FIELDS: Array<[string, string]> = [
  ['web_engagement_upload', 'Engagement Upload'],
  ['web_wedding_upload', 'Wedding Upload'],
]

const VIDEO_BOOL_FIELDS: Array<[string, string]> = [
  ['video_long_form', 'Long Form Video'],
  ['video_recap', 'Recap Video'],
  ['video_slideshow', 'Slideshow'],
  ['video_instagram_facebook', 'Instagram/Facebook Edit'],
  ['video_digital_titles', 'Digital Titles'],
  ['video_after_effects', 'After Effects'],
  ['video_baby_pictures', 'Baby Pictures'],
  ['video_dating_pictures', 'Dating Pictures'],
  ['video_honeymoon_pictures', 'Honeymoon Pictures'],
  ['video_invitation', 'Video Invitation'],
  ['video_music', 'Music'],
  ['video_end_credits', 'End Credits'],
  ['video_hd', 'HD'],
  ['video_sd', 'SD'],
  ['video_gopro', 'GoPro'],
  ['video_drone', 'Video Drone'],
  ['video_led_lights', 'LED Lights'],
  ['video_proof', 'Video Proof'],
  ['video_usb', 'Video USB'],
  ['video_single_camera', 'Single Camera'],
  ['video_multi_camera', 'Multi Camera'],
]

const VIDEO_COUNT_FIELDS: Array<[string, string]> = [
  ['video_highlights', 'Highlight Videos'],
]

function toInt(v: any): number {
  if (v === null || v === undefined || v === '') return 0
  const n = typeof v === 'number' ? v : parseInt(String(v), 10)
  return Number.isFinite(n) ? n : 0
}

function isTrue(v: any): boolean {
  return v === true || v === 'true' || v === 1 || v === '1'
}

export function ContractPackageCard({
  signedDate,
  isActive,
  coverage,
  engagement,
  team,
  financials,
  products
}: ContractPackageProps) {
  if (!coverage || !engagement || !team || !financials) {
    return (
      <div className="border rounded-lg overflow-hidden">
        <div className="bg-teal-600 px-4 md:px-5 py-4 flex justify-between items-center">
          <span className="text-white font-medium text-sm md:text-base">Contract Package (C1) — As Signed</span>
        </div>
        <div className="p-6">
          <p className="text-sm text-gray-500">No contract on file.</p>
        </div>
      </div>
    )
  }
  const locations = []
  if (coverage.locationFlags.groom) locations.push('Groom Prep')
  if (coverage.locationFlags.bride) locations.push('Bride Prep')
  if (coverage.locationFlags.ceremony) locations.push('Ceremony')
  if (coverage.locationFlags.park) locations.push('Park')
  if (coverage.locationFlags.reception) locations.push('Reception')

  const coverageContent = (
    <dl className="space-y-2 text-sm">
      <div className="flex justify-between">
        <dt className="text-gray-500">Package</dt>
        <dd className="text-gray-900">{coverage.package}</dd>
      </div>
      <div className="flex justify-between">
        <dt className="text-gray-500">Hours</dt>
        <dd className="text-gray-900">{coverage.hours}</dd>
      </div>
      <div className="flex justify-between">
        <dt className="text-gray-500">Day</dt>
        <dd className="text-gray-900">{coverage.day}</dd>
      </div>
      <div>
        <dt className="text-gray-500 mb-1">Locations</dt>
        <dd className="flex flex-wrap gap-1">
          {locations.length > 0 ? locations.map(loc => (
            <span key={loc} className="px-2 py-1 bg-gray-100 rounded text-xs text-gray-700">
              {loc}
            </span>
          )) : (
            <span className="text-sm text-gray-400">No locations specified</span>
          )}
        </dd>
      </div>
      <div className="flex justify-between">
        <dt className="text-gray-500">Drone</dt>
        <dd className="text-gray-900">{coverage.drone ? '✓ Yes' : 'No'}</dd>
      </div>
      <div className="flex justify-between">
        <dt className="text-gray-500">Guests</dt>
        <dd className="text-gray-900">{coverage.guests}</dd>
      </div>
    </dl>
  )

  const engagementContent = (
    <dl className="space-y-2 text-sm">
      <div className="flex justify-between">
        <dt className="text-gray-500">Session</dt>
        <dd className="text-gray-900">{engagement.included ? '✓ Included' : 'Not included'}</dd>
      </div>
      {engagement.location && (
        <div className="flex justify-between">
          <dt className="text-gray-500">Location</dt>
          <dd className="text-gray-900">{engagement.location}</dd>
        </div>
      )}
    </dl>
  )

  const teamContent = (
    <dl className="space-y-2 text-sm">
      <div className="flex justify-between">
        <dt className="text-gray-500">Photographers</dt>
        <dd className="text-gray-900">{team.photographers}</dd>
      </div>
      <div className="flex justify-between">
        <dt className="text-gray-500">Videographers</dt>
        <dd className="text-gray-900">{team.videographers === 0 ? 'None' : team.videographers}</dd>
      </div>
    </dl>
  )

  const financialsContent = (
    <dl className="space-y-2 text-sm">
      <div className="flex justify-between">
        <dt className="text-gray-500">C1 Contract</dt>
        <dd className="text-gray-900">${financials.c1Contract.toLocaleString()}</dd>
      </div>
      <div className="flex justify-between">
        <dt className="text-gray-500">C2 Frames & Albums</dt>
        <dd className="text-gray-900">${financials.c2FramesAlbums.toLocaleString()}</dd>
      </div>
      <div className="flex justify-between pt-2 border-t mt-2">
        <dt className="text-gray-700 font-medium">Total</dt>
        <dd className="text-gray-900 font-medium">${financials.total.toLocaleString()}</dd>
      </div>
    </dl>
  )

  // Build "Included Products" manifest
  const p = products || {}

  const printItems = PRINT_FIELDS
    .map(([col, label]) => ({ label, qty: toInt(p[col]) }))
    .filter(item => item.qty > 0)

  const brideGroomAlbumQty = toInt(p.bride_groom_album_qty)
  const parentAlbumsQty = toInt(p.parent_albums_qty)
  const hasAlbums = brideGroomAlbumQty > 0 || parentAlbumsQty > 0

  const digitalBoolItems = DIGITAL_BOOL_FIELDS
    .filter(([col]) => isTrue(p[col]))
    .map(([, label]) => label)
  const digitalCountItems = DIGITAL_COUNT_FIELDS
    .map(([col, label]) => ({ label, qty: toInt(p[col]) }))
    .filter(item => item.qty > 0)
  const hasDigital = digitalBoolItems.length > 0 || digitalCountItems.length > 0

  const videoBoolItems = VIDEO_BOOL_FIELDS
    .filter(([col]) => isTrue(p[col]))
    .map(([, label]) => label)
  const videoCountItems = VIDEO_COUNT_FIELDS
    .map(([col, label]) => ({ label, qty: toInt(p[col]) }))
    .filter(item => item.qty > 0)
  const hasVideo = videoBoolItems.length > 0 || videoCountItems.length > 0

  const hasAnyProducts = printItems.length > 0 || hasAlbums || hasDigital || hasVideo

  const albumLine = (
    size: any, spreads: any, images: any, cover: any
  ): string => {
    const parts = []
    if (size) parts.push(String(size))
    const sp = toInt(spreads)
    if (sp > 0) parts.push(`${sp} spreads`)
    const im = toInt(images)
    if (im > 0) parts.push(`${im} images`)
    if (cover) parts.push(`${cover} cover`)
    return parts.join(' · ')
  }

  const productsContent = (
    <div>
      <h4 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">Included Products</h4>
      {!hasAnyProducts ? (
        <p className="text-sm text-gray-500">No product details on file.</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {printItems.length > 0 && (
            <div>
              <h5 className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-2">Prints</h5>
              <ul className="space-y-1 text-sm">
                {printItems.map(item => (
                  <li key={item.label} className="flex justify-between">
                    <span className="text-gray-700">{item.label}</span>
                    <span className="text-gray-900">{item.qty}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {hasAlbums && (
            <div>
              <h5 className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-2">Albums</h5>
              <div className="space-y-3 text-sm">
                {brideGroomAlbumQty > 0 && (
                  <div>
                    <div className="flex justify-between text-gray-900">
                      <span>Bride & Groom Album</span>
                      <span>{brideGroomAlbumQty}</span>
                    </div>
                    {(() => {
                      const line = albumLine(p.bride_groom_album_size, p.bride_groom_album_spreads, p.bride_groom_album_images, p.bride_groom_album_cover)
                      return line ? <div className="text-xs text-gray-500 mt-0.5">{line}</div> : null
                    })()}
                  </div>
                )}
                {parentAlbumsQty > 0 && (
                  <div>
                    <div className="flex justify-between text-gray-900">
                      <span>Parent Albums</span>
                      <span>{parentAlbumsQty}</span>
                    </div>
                    {(() => {
                      const line = albumLine(p.parent_albums_size, p.parent_albums_spreads, p.parent_albums_images, p.parent_albums_cover)
                      return line ? <div className="text-xs text-gray-500 mt-0.5">{line}</div> : null
                    })()}
                  </div>
                )}
              </div>
            </div>
          )}

          {(hasDigital || hasVideo) && (
            <div className="space-y-4">
              {hasDigital && (
                <div>
                  <h5 className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-2">Digital Delivery</h5>
                  <ul className="space-y-1 text-sm">
                    {digitalBoolItems.map(label => (
                      <li key={label} className="flex justify-between">
                        <span className="text-gray-700">{label}</span>
                        <span className="text-gray-900">✓</span>
                      </li>
                    ))}
                    {digitalCountItems.map(item => (
                      <li key={item.label} className="flex justify-between">
                        <span className="text-gray-700">{item.label}</span>
                        <span className="text-gray-900">{item.qty}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {hasVideo && (
                <div>
                  <h5 className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-2">Video</h5>
                  <ul className="space-y-1 text-sm">
                    {videoCountItems.map(item => (
                      <li key={item.label} className="flex justify-between">
                        <span className="text-gray-700">{item.label}</span>
                        <span className="text-gray-900">{item.qty}</span>
                      </li>
                    ))}
                    {videoBoolItems.map(label => (
                      <li key={label} className="flex justify-between">
                        <span className="text-gray-700">{label}</span>
                        <span className="text-gray-900">✓</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )

  return (
    <div className="border rounded-lg overflow-hidden">
      {/* Header */}
      <div className="bg-teal-600 px-4 md:px-5 py-4 flex justify-between items-center">
        <span className="text-white font-medium text-sm md:text-base">Contract Package — As Signed</span>
        <div className="flex items-center gap-2">
          <span className="text-teal-100 text-sm">{signedDate}</span>
          {isActive && <Badge className="bg-green-500">ACTIVE</Badge>}
        </div>
      </div>

      {/* Desktop: 4-Column Grid */}
      <div className="hidden md:block">
        <div className="grid grid-cols-4 divide-x">
          <div className="p-4">
            <h4 className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-3">Coverage</h4>
            {coverageContent}
          </div>
          <div className="p-4">
            <h4 className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-3">Engagement</h4>
            {engagementContent}
          </div>
          <div className="p-4">
            <h4 className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-3">Team</h4>
            {teamContent}
          </div>
          <div className="p-4">
            <h4 className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-3">Financials</h4>
            {financialsContent}
          </div>
        </div>
        <div className="border-t p-4">
          {productsContent}
        </div>
      </div>

      {/* Mobile: Collapsible Accordion */}
      <div className="md:hidden divide-y">
        <CollapsibleSection title="Coverage Details" defaultOpen={false} className="border-0 rounded-none">
          {coverageContent}
        </CollapsibleSection>
        <CollapsibleSection title="Engagement" defaultOpen={false} className="border-0 rounded-none">
          {engagementContent}
        </CollapsibleSection>
        <CollapsibleSection title="Team" defaultOpen={false} className="border-0 rounded-none">
          {teamContent}
        </CollapsibleSection>
        <CollapsibleSection title="Financial Summary" defaultOpen={true} className="border-0 rounded-none">
          {financialsContent}
        </CollapsibleSection>
        <CollapsibleSection title="Included Products" defaultOpen={false} className="border-0 rounded-none">
          {productsContent}
        </CollapsibleSection>
      </div>
    </div>
  )
}
