import { createClient } from '@supabase/supabase-js'
import { notFound } from 'next/navigation'
import Image from 'next/image'
import { Playfair_Display } from 'next/font/google'
import { formatWeddingDate, formatCurrency, formatTime12h } from '@/lib/formatters'
import { differenceInDays, parseISO, format } from 'date-fns'
import { ChevronDown } from 'lucide-react'

const playfair = Playfair_Display({ subsets: ['latin'], weight: ['700'] })

const BEIGE = '#f5f0eb'
const DARK = '#1a1a1a'
const TEAL = '#0F6E56'
const DARK_TEAL = '#1a3a3a'

function extractYouTubeId(url: string): string | null {
  const patterns = [
    /youtu\.be\/([^?&]+)/,
    /youtube\.com\/watch\?v=([^&]+)/,
    /youtube\.com\/embed\/([^?&]+)/,
  ]
  for (const p of patterns) {
    const match = url.match(p)
    if (match) return match[1]
  }
  return null
}

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

export default async function PortalHomePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const supabase = getSupabase()

  /* ─── Data fetching ─── */

  const { data: couples } = await supabase
    .from('couples')
    .select('id, bride_first_name, groom_first_name, wedding_date, portal_slug, hero_image_url, hero_focal_x, hero_focal_y, portal_video_url, portal_video_type, collage_img_left, collage_img_center, collage_img_right, collage_caption')
    .eq('portal_slug', slug)
    .limit(1)
  const couple = couples?.[0]
  if (!couple) return notFound()

  const bride = couple.bride_first_name ?? ''
  const groom = couple.groom_first_name ?? ''
  const weddingDate = couple.wedding_date ? parseISO(couple.wedding_date) : null
  const daysUntil = weddingDate ? differenceInDays(weddingDate, new Date()) : null
  const countdownText = daysUntil !== null
    ? daysUntil > 0 ? `${daysUntil} days to go` : daysUntil === 0 ? 'Today is the day!' : `Married ${Math.abs(daysUntil)} days`
    : null

  const { data: contracts } = await supabase
    .from('contracts')
    .select('id, total, start_time, end_time, reception_venue, ceremony_location')
    .eq('couple_id', couple.id)
    .limit(1)
  const contract = contracts?.[0]

  const { data: extrasOrders } = await supabase
    .from('extras_orders')
    .select('id, extras_sale_amount, status, collage_type, collage_size, album_qty')
    .eq('couple_id', couple.id)

  const orderIds = (extrasOrders ?? []).map((o: any) => o.id)
  let extrasInstallments: any[] = []
  if (orderIds.length > 0) {
    const { data } = await supabase
      .from('extras_installments')
      .select('*')
      .in('extras_order_id', orderIds)
      .order('installment_number', { ascending: true })
    extrasInstallments = data ?? []
  }

  const { data: wdForms } = await supabase
    .from('wedding_day_forms')
    .select('*')
    .eq('couple_id', couple.id)
    .limit(1)
  const wdForm = wdForms?.[0]

  const { data: payments } = await supabase
    .from('payments')
    .select('amount')
    .eq('couple_id', couple.id)

  const { data: c3Items } = await supabase
    .from('c3_line_items')
    .select('total')
    .eq('couple_id', couple.id)

  /* ─── C2 line items for Zone 2 "Your extras include" ─── */
  const activeOrderIds = (extrasOrders ?? [])
    .filter((o: any) => ['signed', 'paid', 'completed'].includes(o.status))
    .map((o: any) => o.id)
  let lineItems: { product_code: string; quantity: number; notes: string | null; item_name: string; category: string; retail_price: number; sort_order: number }[] = []
  if (activeOrderIds.length > 0) {
    const { data: liData } = await supabase
      .from('c2_line_items')
      .select('product_code, quantity, notes, extras_order_id')
      .in('extras_order_id', activeOrderIds)
    if (liData && liData.length > 0) {
      const codes = Array.from(new Set(liData.map((li: any) => li.product_code)))
      const { data: catalog } = await supabase
        .from('product_catalog')
        .select('product_code, item_name, category, retail_price, sort_order')
        .in('product_code', codes)
      const catalogMap = new Map((catalog ?? []).map((c: any) => [c.product_code, c]))
      lineItems = liData
        .map((li: any) => {
          const cat = catalogMap.get(li.product_code)
          return {
            product_code: li.product_code,
            quantity: li.quantity ?? 1,
            notes: li.notes,
            item_name: cat?.item_name ?? li.product_code,
            category: cat?.category ?? '',
            retail_price: cat?.retail_price ?? 0,
            sort_order: cat?.sort_order ?? 999,
          }
        })
        .sort((a: any, b: any) => a.sort_order - b.sort_order)
    }
  }

  /* ─── Financial calculations ─── */

  const c1 = contract?.total ?? 0
  const c2 = (extrasOrders ?? [])
    .filter((o: any) => ['signed', 'completed'].includes(o.status))
    .reduce((sum: number, o: any) => sum + (o.extras_sale_amount ?? 0), 0)
  const c3 = (c3Items ?? []).reduce((sum: number, item: any) => sum + (item.total ?? 0), 0)
  const invoiced = c1 + c2 + c3
  const received = (payments ?? []).reduce((sum: number, p: any) => sum + (p.amount ?? 0), 0)
  let balance = invoiced - received
  if (Math.abs(balance) <= 50) balance = 0

  /* ─── Derived data ─── */

  const videoId = couple.portal_video_url ? extractYouTubeId(couple.portal_video_url) : null
  const hasCollage = couple.collage_img_left || couple.collage_img_center || couple.collage_img_right
  const showZone2 = hasCollage || lineItems.length > 0

  const coverageStart = contract?.start_time ?? ''
  const coverageEnd = contract?.end_time ?? ''
  let coverageHours = 0
  if (coverageStart && coverageEnd) {
    const [sh, sm] = coverageStart.split(':').map(Number)
    const [eh, em] = coverageEnd.split(':').map(Number)
    const startMin = sh * 60 + (sm || 0)
    let endMin = eh * 60 + (em || 0)
    if (endMin <= startMin) endMin += 24 * 60
    coverageHours = Math.round((endMin - startMin) / 60)
  }


  // Schedule with phone numbers for mobile tap-to-call
  const schedule: { time: string; endTime?: string; label: string; location: string; address?: string; phone?: string }[] = []
  if (wdForm) {
    if (wdForm.groom_start_time) schedule.push({ time: wdForm.groom_start_time, endTime: wdForm.groom_finish_time, label: 'Groom Prep', location: [wdForm.groom_address, wdForm.groom_city].filter(Boolean).join(', '), address: wdForm.groom_address, phone: wdForm.groom_phone })
    if (wdForm.bride_start_time) schedule.push({ time: wdForm.bride_start_time, endTime: wdForm.bride_finish_time, label: 'Bride Prep', location: [wdForm.bride_address, wdForm.bride_city].filter(Boolean).join(', '), address: wdForm.bride_address, phone: wdForm.bride_phone })
    if (wdForm.has_first_look && wdForm.first_look_time) schedule.push({ time: wdForm.first_look_time, label: 'First Look', location: wdForm.first_look_location_name ?? '', address: wdForm.first_look_address })
    if (wdForm.ceremony_start_time) schedule.push({ time: wdForm.ceremony_start_time, endTime: wdForm.ceremony_finish_time, label: 'Ceremony', location: wdForm.ceremony_location_name ?? '', address: wdForm.ceremony_address })
    if (wdForm.park_start_time) schedule.push({ time: wdForm.park_start_time, endTime: wdForm.park_finish_time, label: 'Photos', location: wdForm.park_name ?? '', address: wdForm.park_address })
    if (wdForm.reception_start_time) schedule.push({ time: wdForm.reception_start_time, endTime: wdForm.reception_finish_time, label: 'Reception', location: wdForm.reception_venue_name ?? '', address: wdForm.reception_address, phone: wdForm.venue_contact_phone })
  }

  function getInstallmentStatus(inst: any): 'paid' | 'due' | 'future' {
    if (inst.paid) return 'paid'
    if (inst.due_date && parseISO(inst.due_date) <= new Date()) return 'due'
    return 'future'
  }

  return (
    <>
      {/* Scroll snap only on desktop — mobile flows naturally */}
      <style>{`
        .portal-scroll { overflow-y: auto; height: 100vh; -webkit-overflow-scrolling: touch; }
        @media (min-width: 640px) { .portal-scroll { scroll-snap-type: y proximity; } }
        @media (min-width: 640px) { .portal-snap { scroll-snap-align: start; } }
      `}</style>

      <div className="portal-scroll">
        {/* ═══════════════════════════════════════════
            ZONE 1 — Landing
            ═══════════════════════════════════════════ */}
        <section
          className="portal-snap"
          style={{ minHeight: '100vh', backgroundColor: BEIGE, display: 'flex', flexDirection: 'column' }}
        >
          <div className="mx-auto w-full px-5 sm:px-10 pt-8 flex-1 flex flex-col" style={{ maxWidth: 680 }}>
            {/* Mobile header — stacked centered */}
            <div className="sm:hidden text-center mb-8">
              <p className="text-[10px] font-semibold tracking-[0.2em] uppercase mb-2" style={{ color: '#aaa' }}>
                SIGS Photography Ltd.
              </p>
              <h1 className={`${playfair.className} text-2xl`} style={{ color: '#1a1a1a' }}>
                {bride} & {groom}
              </h1>
              <p className="text-sm mt-1.5" style={{ color: '#777' }}>
                {formatWeddingDate(couple.wedding_date)}
              </p>
              {countdownText && (
                <p className="text-sm font-medium mt-2" style={{ color: TEAL }}>{countdownText}</p>
              )}
            </div>
            {/* Desktop header — side by side */}
            <div className="hidden sm:flex items-start justify-between mb-8">
              <div>
                <h1 className={`${playfair.className} text-3xl`} style={{ color: '#1a1a1a' }}>
                  {bride} & {groom}
                </h1>
                <p className="text-sm mt-1.5" style={{ color: '#777' }}>
                  {formatWeddingDate(couple.wedding_date)}
                </p>
              </div>
              <div className="text-right shrink-0 ml-4">
                <p className="text-[10px] font-semibold tracking-[0.2em] uppercase" style={{ color: '#aaa' }}>
                  SIGS Photography Ltd.
                </p>
                {countdownText && (
                  <p className="text-sm font-medium mt-1.5" style={{ color: TEAL }}>{countdownText}</p>
                )}
              </div>
            </div>

            {/* Hero image — 4:5 portrait on mobile, 16:9 on desktop */}
            {couple.hero_image_url ? (
              <div className="relative w-full rounded-xl overflow-hidden mb-6 aspect-[4/5] sm:aspect-video" style={{ boxShadow: '0 8px 32px rgba(0,0,0,0.08)' }}>
                <Image
                  src={couple.hero_image_url}
                  alt={`${bride} & ${groom}`}
                  fill
                  sizes="(max-width: 640px) 100vw, 680px"
                  style={{
                    objectFit: 'cover',
                    objectPosition: `${couple.hero_focal_x ?? 50}% ${couple.hero_focal_y ?? 50}%`,
                  }}
                  priority
                />
              </div>
            ) : (
              <div className="relative w-full rounded-xl overflow-hidden mb-6 flex items-center justify-center aspect-[4/5] sm:aspect-video" style={{ backgroundColor: '#ebe5de' }}>
                <span className={`${playfair.className} text-6xl sm:text-7xl`} style={{ color: '#d4c9b8', letterSpacing: '0.1em' }}>
                  {bride?.[0] ?? ''}&{groom?.[0] ?? ''}
                </span>
              </div>
            )}

            {/* Video */}
            {videoId && (
              <div className="mb-6 rounded-xl overflow-hidden" style={{ boxShadow: '0 4px 20px rgba(0,0,0,0.06)' }}>
                <div style={{ position: 'relative', paddingBottom: '56.25%', height: 0 }}>
                  <iframe
                    src={`https://www.youtube.com/embed/${videoId}`}
                    title="Wedding Film"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                    style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', border: 0 }}
                  />
                </div>
              </div>
            )}

            {/* Quick link buttons — stack on mobile, row on desktop */}
            <div className="flex flex-col sm:flex-row gap-3 sm:justify-center mb-8">
              <a
                href={`/portal/${slug}/wedding-day`}
                className="flex items-center justify-center px-6 rounded-lg text-sm font-medium transition-all hover:scale-[1.02]"
                style={{ border: `1.5px solid ${TEAL}`, color: TEAL, minHeight: 48 }}
              >
                Wedding Day Form
              </a>
              <a
                href="mailto:info@sigsphoto.ca"
                className="hidden sm:flex items-center justify-center px-6 rounded-lg text-sm font-medium transition-all hover:scale-[1.02]"
                style={{ border: `1.5px solid ${TEAL}`, color: TEAL, minHeight: 48 }}
              >
                Contact SIGS
              </a>
            </div>

            {/* Scroll indicator */}
            <div className="flex flex-col items-center mt-auto pb-8 gap-2">
              <div style={{ width: 1, height: 28, backgroundColor: '#ccc' }} />
              <ChevronDown className="w-4 h-4" style={{ color: '#bbb' }} />
            </div>
          </div>
        </section>

        {/* ═══════════════════════════════════════════
            ZONE 2 — Theatre
            ═══════════════════════════════════════════ */}
        {showZone2 && (
          <section
            className="portal-snap"
            style={{ minHeight: '100vh', backgroundColor: DARK, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          >
            <div className="mx-auto w-full px-5 sm:px-10 py-16" style={{ maxWidth: 680 }}>
              {/* Collage — 3:4 on mobile, 1:1 on desktop */}
              {hasCollage && (
                <>
                  <p className="text-center text-[10px] font-semibold tracking-[0.25em] uppercase mb-8" style={{ color: 'rgba(255,255,255,0.35)' }}>
                    YOUR ENGAGEMENT
                  </p>
                  <div className="grid grid-cols-3 gap-2 sm:gap-3 mb-4">
                    {[couple.collage_img_left, couple.collage_img_center, couple.collage_img_right].map((url: string | null, i: number) =>
                      url ? (
                        <div key={i} className="rounded-lg overflow-hidden aspect-[3/4] sm:aspect-square" style={{ backgroundColor: '#2a2a2a' }}>
                          <Image src={url} alt={`Collage ${i + 1}`} width={220} height={293} sizes="33vw" className="object-cover w-full h-full" />
                        </div>
                      ) : (
                        <div key={i} className="rounded-lg aspect-[3/4] sm:aspect-square" style={{ backgroundColor: '#2a2a2a' }} />
                      )
                    )}
                  </div>
                  {couple.collage_caption && (
                    <p className="text-center text-sm italic mb-10" style={{ color: 'rgba(255,255,255,0.45)' }}>
                      {couple.collage_caption}
                    </p>
                  )}
                </>
              )}

              {hasCollage && lineItems.length > 0 && (
                <div className="flex justify-center my-10">
                  <div style={{ width: '40%', height: 1, backgroundColor: 'rgba(255,255,255,0.08)' }} />
                </div>
              )}

              {lineItems.length > 0 && (
                <div className="text-center">
                  <p className={`${playfair.className} text-xl mb-6`} style={{ color: 'rgba(255,255,255,0.85)' }}>
                    Your extras include
                  </p>
                  <div className="space-y-3">
                    {lineItems.map((item, i) => (
                      <div key={i}>
                        <p className="text-sm" style={{ color: 'rgba(255,255,255,0.55)' }}>
                          — {item.item_name}{item.quantity > 1 ? ` × ${item.quantity}` : ''}
                        </p>
                        {item.notes && (
                          <p className="text-xs mt-0.5" style={{ color: 'rgba(255,255,255,0.3)' }}>
                            {item.notes}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex flex-col items-center mt-16 gap-2">
                <div style={{ width: 1, height: 28, backgroundColor: 'rgba(255,255,255,0.12)' }} />
                <ChevronDown className="w-4 h-4" style={{ color: 'rgba(255,255,255,0.18)' }} />
              </div>
            </div>
          </section>
        )}

        {/* ═══════════════════════════════════════════
            ZONE 3 — Dashboard
            ═══════════════════════════════════════════ */}
        <section
          className="portal-snap"
          style={{ minHeight: '100vh', backgroundColor: BEIGE, display: 'flex', flexDirection: 'column' }}
        >
          <div className="mx-auto w-full px-5 sm:px-10 pt-8 flex-1 flex flex-col" style={{ maxWidth: 680 }}>
            {/* Mobile header */}
            <div className="sm:hidden text-center mb-8">
              <p className="text-[10px] font-semibold tracking-[0.2em] uppercase mb-2" style={{ color: '#aaa' }}>
                SIGS Photography Ltd.
              </p>
              <h2 className={`${playfair.className} text-2xl`} style={{ color: '#1a1a1a' }}>
                {bride} & {groom}
              </h2>
              <p className="text-sm mt-1" style={{ color: '#777' }}>
                {formatWeddingDate(couple.wedding_date)}
              </p>
            </div>
            {/* Desktop header */}
            <div className="hidden sm:flex items-start justify-between mb-8">
              <div>
                <h2 className={`${playfair.className} text-2xl`} style={{ color: '#1a1a1a' }}>
                  {bride} & {groom}
                </h2>
                <p className="text-sm mt-1" style={{ color: '#777' }}>{formatWeddingDate(couple.wedding_date)}</p>
              </div>
              <p className="text-[10px] font-semibold tracking-[0.2em] uppercase shrink-0 ml-4" style={{ color: '#aaa' }}>
                SIGS Photography Ltd.
              </p>
            </div>

            {/* Contract bar */}
            {contract && (
              <div className="rounded-xl overflow-hidden mb-6" style={{ backgroundColor: DARK_TEAL }}>
                <div className="px-5 py-4">
                  <p className="text-[10px] font-semibold tracking-[0.15em] uppercase mb-1" style={{ color: 'rgba(255,255,255,0.5)' }}>
                    CONTRACT
                  </p>
                  <p className="text-sm font-medium" style={{ color: '#fff' }}>
                    Coverage: {formatTime12h(coverageStart)} → {formatTime12h(coverageEnd)}
                    {coverageHours > 0 ? ` (${coverageHours} hours)` : ''}
                  </p>
                </div>
              </div>
            )}

            {/* Schedule — card stack on mobile, table on desktop */}
            {wdForm && schedule.length > 0 ? (
              <>
                {/* Mobile: card stack with Maps + phone buttons */}
                <div className="sm:hidden space-y-3 mb-6">
                  {schedule.map((item, i) => (
                    <div key={i} className="bg-white rounded-xl p-4" style={{ boxShadow: '0 2px 12px rgba(0,0,0,0.04)' }}>
                      <p className="text-sm font-semibold" style={{ color: '#1a1a1a' }}>
                        {formatTime12h(item.time)}{item.endTime ? ` → ${formatTime12h(item.endTime)}` : ''}
                      </p>
                      <p className="text-sm font-medium mt-1" style={{ color: '#1a1a1a' }}>{item.label}</p>
                      {item.location && (
                        <p className="text-xs mt-1" style={{ color: '#777' }}>{item.location}</p>
                      )}
                      {item.address && (
                        <a
                          href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(item.location || item.address)}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="block w-full text-white text-center rounded-lg font-medium mt-3"
                          style={{ backgroundColor: TEAL, minHeight: 48, lineHeight: '48px' }}
                        >
                          Open in Maps
                        </a>
                      )}
                      {item.phone && (
                        <a
                          href={`tel:${item.phone.replace(/[^\d+]/g, '')}`}
                          className="block w-full text-center rounded-lg font-medium mt-2"
                          style={{ border: '1px solid #ddd', color: '#1a1a1a', minHeight: 48, lineHeight: '48px' }}
                        >
                          {item.phone}
                        </a>
                      )}
                    </div>
                  ))}
                </div>

                {/* Desktop: compact table */}
                <div className="hidden sm:block bg-white rounded-xl overflow-hidden mb-6" style={{ boxShadow: '0 2px 12px rgba(0,0,0,0.04)' }}>
                  <div className="px-5 py-3" style={{ borderBottom: '1px solid #f0ede8' }}>
                    <p className="text-xs font-semibold tracking-wider uppercase" style={{ color: '#999' }}>Schedule</p>
                  </div>
                  {schedule.map((item, i) => (
                    <div key={i} className="flex items-start gap-4 px-5 py-3" style={{ borderBottom: i < schedule.length - 1 ? '1px solid #f5f2ed' : 'none' }}>
                      <div className="text-sm font-medium whitespace-nowrap" style={{ color: '#1a1a1a', minWidth: 110 }}>
                        {formatTime12h(item.time)}{item.endTime ? ` → ${formatTime12h(item.endTime)}` : ''}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium" style={{ color: '#1a1a1a' }}>{item.label}</p>
                        {item.location && (
                          <p className="text-xs mt-0.5 truncate">
                            {item.address ? (
                              <a href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(item.location)}`} target="_blank" rel="noopener noreferrer" className="hover:underline" style={{ color: TEAL }}>
                                {item.location}
                              </a>
                            ) : (
                              <span style={{ color: TEAL }}>{item.location}</span>
                            )}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div className="bg-white rounded-xl p-6 mb-6 text-center" style={{ boxShadow: '0 2px 12px rgba(0,0,0,0.04)' }}>
                <p className="text-sm" style={{ color: '#999' }}>Your wedding day schedule will appear here</p>
                <a
                  href={`/portal/${slug}/wedding-day`}
                  className="inline-flex items-center justify-center w-full sm:w-auto mt-3 text-sm font-medium rounded-lg sm:px-0"
                  style={{ color: TEAL, minHeight: 48 }}
                >
                  Fill out your Wedding Day Planner →
                </a>
              </div>
            )}

            {/* Emergency contacts + Form status */}
            {wdForm && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
                {(wdForm.emergency_contact_1_name || wdForm.emergency_contact_2_name) && (
                  <div className="bg-white rounded-xl p-4" style={{ boxShadow: '0 2px 12px rgba(0,0,0,0.04)' }}>
                    <p className="text-xs font-semibold tracking-wider uppercase mb-3" style={{ color: '#999' }}>Emergency Contacts</p>
                    {wdForm.emergency_contact_1_name && (
                      <div className="mb-3">
                        <p className="text-sm font-medium mb-1">{wdForm.emergency_contact_1_name}</p>
                        {wdForm.emergency_contact_1_phone && (
                          <a
                            href={`tel:${wdForm.emergency_contact_1_phone.replace(/[^\d+]/g, '')}`}
                            className="block w-full text-center rounded-lg font-medium sm:inline sm:w-auto sm:text-left sm:rounded-none sm:border-0"
                            style={{ border: '1px solid #ddd', color: TEAL, minHeight: 48, lineHeight: '48px' }}
                          >
                            <span className="sm:hidden">{wdForm.emergency_contact_1_phone}</span>
                            <span className="hidden sm:inline">{wdForm.emergency_contact_1_phone}</span>
                          </a>
                        )}
                      </div>
                    )}
                    {wdForm.emergency_contact_2_name && (
                      <div>
                        <p className="text-sm font-medium mb-1">{wdForm.emergency_contact_2_name}</p>
                        {wdForm.emergency_contact_2_phone && (
                          <a
                            href={`tel:${wdForm.emergency_contact_2_phone.replace(/[^\d+]/g, '')}`}
                            className="block w-full text-center rounded-lg font-medium sm:inline sm:w-auto sm:text-left sm:rounded-none sm:border-0"
                            style={{ border: '1px solid #ddd', color: TEAL, minHeight: 48, lineHeight: '48px' }}
                          >
                            <span className="sm:hidden">{wdForm.emergency_contact_2_phone}</span>
                            <span className="hidden sm:inline">{wdForm.emergency_contact_2_phone}</span>
                          </a>
                        )}
                      </div>
                    )}
                  </div>
                )}

                <div className="bg-white rounded-xl p-4" style={{ boxShadow: '0 2px 12px rgba(0,0,0,0.04)' }}>
                  <p className="text-xs font-semibold tracking-wider uppercase mb-3" style={{ color: '#999' }}>Wedding Day Form</p>
                  <p className="text-sm mb-3" style={{ color: '#666' }}>
                    Submitted {wdForm.updated_at ? format(parseISO(wdForm.updated_at), 'MMM d') : '—'}
                  </p>
                  <a
                    href={`/portal/${slug}/wedding-day`}
                    className="block w-full text-center rounded-lg font-medium sm:inline sm:w-auto sm:text-left sm:rounded-none"
                    style={{ border: '1px solid #ddd', color: TEAL, minHeight: 48, lineHeight: '48px' }}
                  >
                    <span className="sm:hidden">Edit Form</span>
                    <span className="hidden sm:inline">Edit Form →</span>
                  </a>
                </div>
              </div>
            )}

            {/* Scroll indicator */}
            <div className="flex flex-col items-center mt-auto pb-8 gap-2">
              <div style={{ width: 1, height: 28, backgroundColor: '#ccc' }} />
              <ChevronDown className="w-4 h-4" style={{ color: '#bbb' }} />
            </div>
          </div>
        </section>

        {/* ═══════════════════════════════════════════
            ZONE 4 — Vault
            ═══════════════════════════════════════════ */}
        <section
          className="portal-snap"
          style={{ minHeight: '100vh', backgroundColor: BEIGE, display: 'flex', flexDirection: 'column' }}
        >
          <div className="mx-auto w-full px-5 sm:px-10 pt-8 flex-1 flex flex-col pb-20 sm:pb-0" style={{ maxWidth: 680 }}>
            {/* Mobile header */}
            <div className="sm:hidden text-center mb-8">
              <p className="text-[10px] font-semibold tracking-[0.2em] uppercase mb-2" style={{ color: '#aaa' }}>
                SIGS Photography Ltd.
              </p>
              <h2 className={`${playfair.className} text-2xl`} style={{ color: '#1a1a1a' }}>
                {bride} & {groom}
              </h2>
              <p className="text-sm mt-1" style={{ color: '#777' }}>
                {formatWeddingDate(couple.wedding_date)}
              </p>
            </div>
            {/* Desktop header */}
            <div className="hidden sm:flex items-start justify-between mb-8">
              <div>
                <h2 className={`${playfair.className} text-2xl`} style={{ color: '#1a1a1a' }}>
                  {bride} & {groom}
                </h2>
                <p className="text-sm mt-1" style={{ color: '#777' }}>{formatWeddingDate(couple.wedding_date)}</p>
              </div>
              <p className="text-[10px] font-semibold tracking-[0.2em] uppercase shrink-0 ml-4" style={{ color: '#aaa' }}>
                SIGS Photography Ltd.
              </p>
            </div>

            {/* Financial cards — stacked on mobile, 3-across on desktop */}
            {/* Mobile: single card with rows */}
            <div className="sm:hidden bg-white rounded-xl overflow-hidden mb-6" style={{ boxShadow: '0 2px 12px rgba(0,0,0,0.04)' }}>
              <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: '1px solid #f0ede8' }}>
                <p className="text-xs font-semibold tracking-wider uppercase" style={{ color: '#999' }}>Contract Total</p>
                <p className="text-lg font-bold" style={{ color: '#1a1a1a' }}>{formatCurrency(invoiced)}</p>
              </div>
              <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: '1px solid #f0ede8' }}>
                <p className="text-xs font-semibold tracking-wider uppercase" style={{ color: '#999' }}>Total Paid</p>
                <p className="text-lg font-bold" style={{ color: received > 0 ? TEAL : '#1a1a1a' }}>{formatCurrency(received)}</p>
              </div>
              <div className="flex items-center justify-between px-5 py-4">
                <p className="text-xs font-semibold tracking-wider uppercase" style={{ color: '#999' }}>Balance</p>
                <p className="text-lg font-bold" style={{ color: balance > 0 ? '#D85A30' : TEAL }}>{formatCurrency(balance)}</p>
              </div>
            </div>
            {/* Desktop: 3 cards */}
            <div className="hidden sm:grid grid-cols-3 gap-3 mb-6">
              <div className="bg-white rounded-xl p-4 text-center" style={{ boxShadow: '0 2px 12px rgba(0,0,0,0.04)' }}>
                <p className="text-[10px] font-semibold tracking-wider uppercase mb-1" style={{ color: '#999' }}>Contract Total</p>
                <p className="text-lg font-bold" style={{ color: '#1a1a1a' }}>{formatCurrency(invoiced)}</p>
              </div>
              <div className="bg-white rounded-xl p-4 text-center" style={{ boxShadow: '0 2px 12px rgba(0,0,0,0.04)' }}>
                <p className="text-[10px] font-semibold tracking-wider uppercase mb-1" style={{ color: '#999' }}>Total Paid</p>
                <p className="text-lg font-bold" style={{ color: received > 0 ? TEAL : '#1a1a1a' }}>{formatCurrency(received)}</p>
              </div>
              <div className="bg-white rounded-xl p-4 text-center" style={{ boxShadow: '0 2px 12px rgba(0,0,0,0.04)' }}>
                <p className="text-[10px] font-semibold tracking-wider uppercase mb-1" style={{ color: '#999' }}>Balance</p>
                <p className="text-lg font-bold" style={{ color: balance > 0 ? '#D85A30' : TEAL }}>{formatCurrency(balance)}</p>
              </div>
            </div>

            {/* Payment schedule */}
            {extrasInstallments.length > 0 && (
              <div className="bg-white rounded-xl overflow-hidden mb-8" style={{ boxShadow: '0 2px 12px rgba(0,0,0,0.04)' }}>
                <div className="px-5 py-3" style={{ borderBottom: '1px solid #f0ede8' }}>
                  <p className="text-xs font-semibold tracking-wider uppercase" style={{ color: '#999' }}>Payment Schedule</p>
                </div>
                {extrasInstallments.map((inst: any, i: number) => {
                  const status = getInstallmentStatus(inst)
                  return (
                    <div
                      key={inst.id}
                      className="px-5 py-3"
                      style={{ borderBottom: i < extrasInstallments.length - 1 ? '1px solid #f5f2ed' : 'none', minHeight: 48 }}
                    >
                      {/* Mobile: stacked */}
                      <div className="sm:hidden">
                        <div className="flex items-center justify-between">
                          <p className="text-sm font-medium" style={{ color: '#1a1a1a' }}>
                            #{inst.installment_number} — {inst.due_description ?? 'Payment'}
                          </p>
                          {status === 'paid' && (
                            <span className="text-xs font-semibold px-2 py-0.5 rounded-full" style={{ backgroundColor: '#e6f5f0', color: TEAL }}>Paid</span>
                          )}
                          {status === 'due' && (
                            <span className="text-xs font-semibold px-2 py-0.5 rounded-full" style={{ backgroundColor: '#fef3ee', color: '#D85A30' }}>Due</span>
                          )}
                        </div>
                        <p className="text-sm font-semibold mt-0.5" style={{ color: '#1a1a1a' }}>{formatCurrency(inst.amount)}</p>
                      </div>
                      {/* Desktop: single row */}
                      <div className="hidden sm:flex items-center justify-between">
                        <p className="text-sm font-medium flex-1" style={{ color: '#1a1a1a' }}>
                          #{inst.installment_number} — {inst.due_description ?? 'Payment'}
                        </p>
                        <div className="flex items-center gap-3 shrink-0">
                          <span className="text-sm font-semibold" style={{ color: '#1a1a1a' }}>{formatCurrency(inst.amount)}</span>
                          {status === 'paid' && (
                            <span className="text-xs font-semibold px-2 py-0.5 rounded-full" style={{ backgroundColor: '#e6f5f0', color: TEAL }}>Paid</span>
                          )}
                          {status === 'due' && (
                            <span className="text-xs font-semibold px-2 py-0.5 rounded-full" style={{ backgroundColor: '#fef3ee', color: '#D85A30' }}>Due</span>
                          )}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}

            {/* Contact line — tap-friendly on mobile */}
            <div className="text-center text-sm mb-8" style={{ color: '#888' }}>
              <p className="mb-3">If you have any questions</p>
              <div className="flex flex-col sm:flex-row sm:justify-center gap-2 sm:gap-1">
                <span className="hidden sm:inline">text Marianna at{' '}</span>
                <a
                  href="tel:4168318942"
                  className="block sm:inline w-full sm:w-auto text-center rounded-lg font-medium sm:rounded-none sm:border-0"
                  style={{ border: '1px solid #ddd', color: TEAL, minHeight: 48, lineHeight: '48px' }}
                >
                  <span className="sm:hidden">Text Marianna — (416) 831-8942</span>
                  <span className="hidden sm:inline">(416) 831-8942</span>
                </a>
                <span className="hidden sm:inline">{' '}or email Jean at{' '}</span>
                <a
                  href="mailto:info@sigsphoto.ca"
                  className="block sm:inline w-full sm:w-auto text-center rounded-lg font-medium sm:rounded-none sm:border-0"
                  style={{ border: '1px solid #ddd', color: TEAL, minHeight: 48, lineHeight: '48px' }}
                >
                  <span className="sm:hidden">Email Jean — info@sigsphoto.ca</span>
                  <span className="hidden sm:inline">info@sigsphoto.ca</span>
                </a>
              </div>
            </div>

            {/* Footer */}
            <footer className="mt-auto pb-4 sm:pb-8 text-center">
              <p className="text-xs" style={{ color: '#bbb' }}>&copy; 2026 SIGS Photography Ltd.</p>
              <p className="text-xs mt-1" style={{ color: '#bbb' }}>sigsphoto.ca</p>
            </footer>
          </div>
        </section>
      </div>
    </>
  )
}
