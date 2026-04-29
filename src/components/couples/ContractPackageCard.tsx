'use client'

import { Badge } from '@/components/ui/badge'
import { CollapsibleSection } from '@/components/ui/collapsible-section'
import { formatCurrency } from '@/lib/coupleFormatters'

interface CatalogRef {
  item_name?: string | null
  category?: string | null
}

interface C1LineItem {
  product_code: string | null
  quantity: number | null
  notes?: string | null
  product_catalog?: CatalogRef | CatalogRef[] | null
}

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
  // Retained for backwards compatibility with page.tsx; no longer rendered.
  products?: Record<string, any> | null
  lineItems?: C1LineItem[]
}

// Order: Package, Album, Portrait, Print, Canvas, Collage, Frame, Digital, Service, Production, Stationery, Glass, Mounting.
// Portrait and Print merge into a single bucket called "Portraits & Prints".
const CATEGORY_ORDER: Array<{ key: string; label: string; matchers: RegExp[] }> = [
  { key: 'package', label: 'Package', matchers: [/^package/i] },
  { key: 'album', label: 'Albums', matchers: [/^album/i] },
  { key: 'portrait', label: 'Portraits & Prints', matchers: [/^portrait/i, /^print/i] },
  { key: 'canvas', label: 'Canvas', matchers: [/^canvas/i] },
  { key: 'collage', label: 'Collage', matchers: [/^collage/i] },
  { key: 'frame', label: 'Frames', matchers: [/^frame/i] },
  { key: 'digital', label: 'Digital Delivery', matchers: [/^digital/i] },
  { key: 'service', label: 'Services', matchers: [/^service/i] },
  { key: 'production', label: 'Production', matchers: [/^production/i] },
  { key: 'stationery', label: 'Stationery', matchers: [/^stationery/i] },
  { key: 'glass', label: 'Glass', matchers: [/^glass/i] },
  { key: 'mounting', label: 'Mounting', matchers: [/^mounting/i] },
]

function categoryBucket(rawCategory: string | null | undefined): { key: string; label: string } {
  if (rawCategory) {
    for (const c of CATEGORY_ORDER) {
      if (c.matchers.some(rx => rx.test(rawCategory))) return { key: c.key, label: c.label }
    }
    return { key: `__${rawCategory}`, label: rawCategory }
  }
  return { key: '__other', label: 'Other' }
}

function catalogOf(item: C1LineItem): CatalogRef | null {
  const c = item.product_catalog
  if (!c) return null
  if (Array.isArray(c)) return c[0] ?? null
  return c
}


function PackageContents({ lineItems }: { lineItems?: C1LineItem[] }) {
  const items = lineItems || []

  if (items.length === 0) {
    return (
      <p className="text-sm text-gray-400 italic">Product details not yet mapped.</p>
    )
  }

  const buckets = new Map<string, { label: string; rows: C1LineItem[] }>()
  for (const item of items) {
    const cat = catalogOf(item)
    const { key, label } = categoryBucket(cat?.category)
    if (!buckets.has(key)) buckets.set(key, { label, rows: [] })
    buckets.get(key)!.rows.push(item)
  }

  const orderedKeys: string[] = []
  for (const c of CATEGORY_ORDER) if (buckets.has(c.key)) orderedKeys.push(c.key)
  for (const k of Array.from(buckets.keys())) if (!orderedKeys.includes(k)) orderedKeys.push(k)

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {orderedKeys.map(key => {
        const bucket = buckets.get(key)!
        return (
          <div key={key} className="rounded-md border border-gray-200 bg-white">
            <h5 className="text-xs font-medium text-gray-500 uppercase tracking-wider px-4 pt-3 pb-2 border-b border-gray-100">
              {bucket.label}
            </h5>
            <ul className="px-4 py-2 divide-y divide-gray-100">
              {bucket.rows.map((item, idx) => {
                const cat = catalogOf(item)
                const itemName = cat?.item_name || item.notes || '—'
                const code = item.product_code || ''
                return (
                  <li
                    key={`${code || 'na'}-${idx}`}
                    title={code || undefined}
                    className="py-2 flex items-baseline justify-between gap-3"
                  >
                    <div className="min-w-0 flex-1">
                      <span className="text-sm font-medium text-gray-900 truncate">{itemName}</span>
                      {code && (
                        <span className="md:hidden block font-mono text-xs text-gray-400 mt-0.5">{code}</span>
                      )}
                      {item.notes && cat?.item_name && (
                        <span className="block text-sm text-gray-400 mt-0.5">{item.notes}</span>
                      )}
                    </div>
                    <span className="text-sm text-gray-500 tabular-nums whitespace-nowrap">
                      × {item.quantity ?? 0}
                    </span>
                  </li>
                )
              })}
            </ul>
          </div>
        )
      })}
    </div>
  )
}

export function ContractPackageCard({
  signedDate,
  isActive,
  coverage,
  engagement,
  team,
  financials,
  products,
  lineItems
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

  // C1 contract financials only — read directly from the contracts row.
  const taxRaw = products?.tax
  const totalRaw = products?.total
  const subtotalRaw = products?.subtotal

  const taxNum = taxRaw != null && taxRaw !== '' ? Number(taxRaw) : null
  const totalNum = totalRaw != null && totalRaw !== '' ? Number(totalRaw) : financials.c1Contract
  let subtotalNum: number | null = subtotalRaw != null && subtotalRaw !== '' ? Number(subtotalRaw) : null
  if (subtotalNum === null && taxNum !== null && Number.isFinite(totalNum)) {
    subtotalNum = totalNum - taxNum
  }

  const showBreakdown = taxNum !== null && Number.isFinite(taxNum) && taxNum !== 0 && subtotalNum !== null

  const financialsContent = (
    <dl className="space-y-2 text-sm">
      {showBreakdown && (
        <>
          <div className="flex justify-between">
            <dt className="text-gray-500">Subtotal</dt>
            <dd className="text-gray-900 tabular-nums">{formatCurrency(subtotalNum, 2)}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-gray-500">HST</dt>
            <dd className="text-gray-900 tabular-nums">{formatCurrency(taxNum, 2)}</dd>
          </div>
        </>
      )}
      <div className={`flex justify-between ${showBreakdown ? 'pt-2 border-t mt-2' : ''}`}>
        <dt className={showBreakdown ? 'text-gray-700 font-medium' : 'text-gray-500'}>Total</dt>
        <dd className={`text-gray-900 tabular-nums ${showBreakdown ? 'font-medium' : ''}`}>{formatCurrency(totalNum, 2)}</dd>
      </div>
    </dl>
  )

  const itemCount = (lineItems || []).length
  const packageHeading = (
    <h4 className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-3 flex items-center gap-2">
      <span aria-hidden="true">📦</span>
      <span>Package Contents</span>
      {itemCount > 0 && (
        <span className="text-gray-400 normal-case tracking-normal font-normal">
          ({itemCount} {itemCount === 1 ? 'item' : 'items'})
        </span>
      )}
    </h4>
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

      {/* Desktop: 4-Column Grid + Package Contents */}
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
        <div className="border-t border-gray-100 bg-stone-50/30 px-5 py-5">
          {packageHeading}
          <PackageContents lineItems={lineItems} />
          {itemCount > 0 && (
            <p className="mt-4 text-xs text-gray-400 italic">Hover any item to see its product code.</p>
          )}
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
        <CollapsibleSection
          title={`Package Contents${itemCount > 0 ? ` (${itemCount} ${itemCount === 1 ? 'item' : 'items'})` : ''}`}
          defaultOpen={false}
          className="border-0 rounded-none"
        >
          <PackageContents lineItems={lineItems} />
        </CollapsibleSection>
      </div>
    </div>
  )
}
