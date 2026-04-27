import { createClient } from '@supabase/supabase-js'
import Image from 'next/image'
import { Playfair_Display, DM_Sans } from 'next/font/google'
import { formatWeddingDate } from '@/lib/formatters'
import { differenceInDays, parseISO } from 'date-fns'

const playfair = Playfair_Display({ subsets: ['latin'], weight: ['700'] })
const dmSans = DM_Sans({ subsets: ['latin'], weight: ['400', '500', '600'] })

const GOLD = '#C9A84C'
const BG = '#FAFAF7'

function extractYouTubeId(url: string): string | null {
  const patterns = [/youtu\.be\/([^?&]+)/, /youtube\.com\/watch\?v=([^&]+)/, /youtube\.com\/embed\/([^?&]+)/]
  for (const p of patterns) {
    const match = url.match(p)
    if (match) return match[1]
  }
  return null
}

function getSupabase() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
}

export default async function SharePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params
  const supabase = getSupabase()

  const { data: couples } = await supabase
    .from('couples')
    .select('id, bride_first_name, groom_first_name, wedding_date, hero_image_url, portal_video_url, collage_img_left, collage_img_center, collage_img_right, collage_caption, share_enabled, share_view_count')
    .eq('share_token', token)
    .eq('share_enabled', true)
    .limit(1)

  const couple = couples?.[0]
  if (!couple) {
    return (
      <div className={`${dmSans.className} min-h-screen flex items-center justify-center`} style={{ backgroundColor: BG }}>
        <div className="text-center px-6">
          <Image src="/images/sigslogo.png" alt="SIGS Photography" width={140} height={47} className="mx-auto mb-6" />
          <h1 className={`${playfair.className} text-xl mb-2`}>This page is not available</h1>
          <p style={{ color: '#999' }}>This share link may have been disabled or doesn't exist.</p>
        </div>
      </div>
    )
  }

  // Track view count
  await supabase.from('couples').update({
    share_view_count: ((couple as any).share_view_count || 0) + 1,
  }).eq('id', couple.id)

  const weddingDate = couple.wedding_date ? parseISO(couple.wedding_date) : null
  const today = new Date()
  const daysUntil = weddingDate ? differenceInDays(weddingDate, today) : null
  const videoId = couple.portal_video_url ? extractYouTubeId(couple.portal_video_url) : null
  const hasCollage = couple.collage_img_left ?? couple.collage_img_center ?? couple.collage_img_right

  return (
    <div className={dmSans.className} style={{ backgroundColor: BG, minHeight: '100vh' }}>
      <div className="mx-auto px-4 py-10" style={{ maxWidth: 720 }}>

        {/* Header */}
        <header className="text-center mb-10">
          <div className="flex justify-center mb-4">
            <Image src="/images/sigslogo.png" alt="SIGS Photography" width={140} height={47} priority />
          </div>
          <h1 className={`${playfair.className} text-3xl md:text-4xl mb-2`}>
            {couple.bride_first_name} & {couple.groom_first_name}
          </h1>
          <p className="text-base mb-1" style={{ color: '#666' }}>
            {formatWeddingDate(couple.wedding_date)}
          </p>
          {daysUntil !== null && (
            <p className="text-sm font-medium" style={{ color: GOLD }}>
              {daysUntil > 0 ? `${daysUntil} days to go` : daysUntil === 0 ? 'Today is the day!' : `Married ${Math.abs(daysUntil)} days`}
            </p>
          )}
        </header>

        {/* Hero Image */}
        {couple.hero_image_url && (
          <section className="mb-10">
            <div className="relative w-full" style={{ aspectRatio: '16/9', borderRadius: 12, overflow: 'hidden', boxShadow: '0 4px 20px rgba(0,0,0,0.08)' }}>
              <Image src={couple.hero_image_url} alt={`${couple.bride_first_name} & ${couple.groom_first_name}`} fill className="object-cover" quality={85} sizes="720px" />
            </div>
          </section>
        )}

        {/* Video */}
        {videoId && (
          <section className="mb-10">
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
          </section>
        )}

        {/* Collage */}
        {hasCollage && (
          <section className="mb-10">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {[couple.collage_img_left, couple.collage_img_center, couple.collage_img_right].map((url, i) => (
                url ? (
                  <div key={i} className="overflow-hidden rounded-lg">
                    <Image src={url} alt={`Photo ${i + 1}`} width={240} height={240} className="object-cover w-full aspect-square hover:scale-[1.03] transition-transform duration-300" />
                  </div>
                ) : <div key={i} />
              ))}
            </div>
            {couple.collage_caption && (
              <p className="text-center text-sm italic mt-3" style={{ color: '#888' }}>{couple.collage_caption}</p>
            )}
          </section>
        )}

        {/* Footer */}
        <footer className="text-center pt-8 pb-6">
          <p className="text-xs" style={{ color: '#bbb' }}>&copy; 2026 SIGS Photography Ltd.</p>
          <a href="https://sigsphoto.ca" target="_blank" rel="noopener noreferrer" className="text-xs" style={{ color: GOLD }}>sigsphoto.ca</a>
        </footer>
      </div>
    </div>
  )
}
