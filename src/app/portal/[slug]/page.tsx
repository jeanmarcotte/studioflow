import { createClient } from '@supabase/supabase-js'
import { notFound } from 'next/navigation'
import Image from 'next/image'
import { Playfair_Display } from 'next/font/google'
import { formatCurrency, formatDate } from '@/lib/formatters'

const playfair = Playfair_Display({ subsets: ['latin'], weight: ['700'] })

const GOLD = '#C9A84C'

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

function statusColor(status: string | null) {
  switch (status) {
    case 'signed': return 'bg-green-100 text-green-700'
    case 'pending': return 'bg-yellow-100 text-yellow-700'
    case 'declined': return 'bg-red-100 text-red-700'
    case 'completed': return 'bg-blue-100 text-blue-700'
    default: return 'bg-gray-100 text-gray-700'
  }
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

  const { data: couples } = await supabase
    .from('couples')
    .select('*')
    .eq('portal_slug', slug)
    .limit(1)
  const couple = couples?.[0]
  if (!couple) return notFound()

  const { data: contracts } = await supabase
    .from('contracts')
    .select('id, total, subtotal, signed_date, reception_venue, ceremony_location, start_time, end_time')
    .eq('couple_id', couple.id)
    .limit(1)
  const contract = contracts?.[0]

  const { data: extrasOrders } = await supabase
    .from('extras_orders')
    .select('*')
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

  const hasCollage = couple.collage_img_left ?? couple.collage_img_center ?? couple.collage_img_right
  const videoId = couple.portal_video_url ? extractYouTubeId(couple.portal_video_url) : null

  return (
    <>
      {/* Hero Image */}
      <section className="mb-10">
        {couple.hero_image_url ? (
          <div className="relative w-full" style={{ aspectRatio: '16/9', borderRadius: 12, overflow: 'hidden', boxShadow: '0 4px 20px rgba(0,0,0,0.08)' }}>
            <Image src={couple.hero_image_url} alt={`${couple.bride_first_name} & ${couple.groom_first_name}`} fill className="object-cover" quality={85} sizes="720px" />
          </div>
        ) : (
          <div className="flex items-center justify-center rounded-xl border-2 border-dashed" style={{ aspectRatio: '16/9', borderColor: GOLD, backgroundColor: '#FEFDF8' }}>
            <p className="text-center px-6" style={{ color: '#999' }}>
              Your engagement photos are coming soon
            </p>
          </div>
        )}
      </section>

      {/* Video */}
      <section className="mb-10">
        {videoId ? (
          <div className="mx-auto w-full md:w-[85%]">
            <div style={{ position: 'relative', paddingBottom: '56.25%', height: 0 }}>
              <iframe
                src={`https://www.youtube.com/embed/${videoId}`}
                title="Wedding Film"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', border: 0, borderRadius: 12 }}
              />
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-center rounded-xl border-2 border-dashed py-12" style={{ borderColor: '#ddd', backgroundColor: '#FEFDF8' }}>
            <p style={{ color: '#999' }}>Your wedding film preview will appear here</p>
          </div>
        )}
      </section>

      {/* Collage */}
      {hasCollage && (
        <section className="mb-10">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {[couple.collage_img_left, couple.collage_img_center, couple.collage_img_right].map((url: string | null, i: number) => (
              url ? (
                <div key={i} className="overflow-hidden rounded-lg">
                  <Image src={url} alt={`Collage ${i + 1}`} width={240} height={240} className="object-cover w-full aspect-square hover:scale-[1.03] transition-transform duration-300" />
                </div>
              ) : <div key={i} />
            ))}
          </div>
          {couple.collage_caption && (
            <p className="text-center text-sm italic mt-3" style={{ color: '#888' }}>{couple.collage_caption}</p>
          )}
        </section>
      )}

      {/* Quick Links */}
      <section className="mb-10">
        <div className="flex gap-3 justify-center flex-wrap">
          <a
            href="https://studioflow-zeta.vercel.app/client/wedding-day-form"
            className="inline-flex items-center px-5 py-2.5 rounded-lg text-sm font-medium transition-colors"
            style={{ border: `1.5px solid ${GOLD}`, color: GOLD }}
          >
            Wedding Day Form
          </a>
          <a
            href="mailto:info@sigsphoto.ca"
            className="inline-flex items-center px-5 py-2.5 rounded-lg text-sm font-medium transition-colors"
            style={{ border: `1.5px solid ${GOLD}`, color: GOLD }}
          >
            Contact SIGS
          </a>
        </div>
      </section>

      {/* Divider */}
      <div className="flex justify-center my-12">
        <hr style={{ width: '60%', border: 'none', borderTop: `1px solid ${GOLD}` }} />
      </div>

      {/* Financial Snapshot */}
      {contract && (
        <section className="mb-10">
          <div className="bg-white rounded-xl p-6" style={{ boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }}>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-center">
              <div>
                <p className="text-xs uppercase tracking-wider mb-1" style={{ color: '#999' }}>Contract Total</p>
                <p className="text-lg font-semibold">{formatCurrency(contract.total)}</p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-wider mb-1" style={{ color: '#999' }}>Total Paid</p>
                <p className="text-lg font-semibold">{formatCurrency(couple.total_paid)}</p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-wider mb-1" style={{ color: '#999' }}>Balance</p>
                <p className="text-lg font-semibold">{formatCurrency(couple.balance_owing)}</p>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Frames & Albums */}
      {extrasOrders && extrasOrders.length > 0 && (
        <section className="mb-10">
          <h2 className={`${playfair.className} text-xl mb-4`}>Frames & Albums</h2>
          <div className="space-y-3">
            {extrasOrders.map((order: any) => (
              <div key={order.id} className="bg-white rounded-xl p-4" style={{ boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }}>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm" style={{ color: '#666' }}>{formatDate(order.order_date)}</span>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusColor(order.status)}`}>{order.status}</span>
                </div>
                <p className="text-base font-semibold">{formatCurrency(order.extras_sale_amount)}</p>
                <div className="text-sm mt-1" style={{ color: '#888' }}>
                  {[
                    order.collage_type && order.collage_size ? `${order.collage_type} ${order.collage_size}` : null,
                    order.album_qty ? `${order.album_qty} album${order.album_qty > 1 ? 's' : ''}` : null,
                    order.signing_book ? 'Signing book' : null,
                  ].filter(Boolean).join(' \u00b7 ') || 'No items listed'}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Payment Schedule */}
      {extrasInstallments.length > 0 && (
        <section className="mb-10">
          <h2 className={`${playfair.className} text-xl mb-4`}>Payment Schedule</h2>
          <div className="bg-white rounded-xl overflow-hidden" style={{ boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }}>
            {extrasInstallments.map((inst: any, i: number) => {
              const isUnlocked = inst.unlocks_asset && (inst.paid || inst.admin_override_unlocked)
              const isLocked = inst.unlocks_asset && !inst.paid && !inst.admin_override_unlocked
              return (
                <div key={inst.id} className={`flex items-center justify-between px-4 py-3 ${i > 0 ? 'border-t' : ''}`} style={{ borderColor: '#f0f0f0' }}>
                  <div className="flex items-center gap-3">
                    <span className="text-base">{inst.paid ? '\u2713' : '\u25CB'}</span>
                    <p className="text-sm font-medium">#{inst.installment_number} — {inst.due_description ?? 'Payment'}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    {isUnlocked && <span title="Asset unlocked">🔓</span>}
                    {isLocked && <span title="Asset locked">🔒</span>}
                    <span className="text-sm font-semibold">{formatCurrency(inst.amount)}</span>
                  </div>
                </div>
              )
            })}
          </div>
        </section>
      )}

      {/* Footer */}
      <footer className="text-center pt-8 pb-6">
        <p className="text-xs" style={{ color: '#bbb' }}>&copy; 2026 SIGS Photography Ltd.</p>
        <a href="https://sigsphoto.ca" target="_blank" rel="noopener noreferrer" className="text-xs" style={{ color: GOLD }}>sigsphoto.ca</a>
      </footer>
    </>
  )
}
