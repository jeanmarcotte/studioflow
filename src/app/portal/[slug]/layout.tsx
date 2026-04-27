import { createClient } from '@supabase/supabase-js'
import { notFound } from 'next/navigation'
import { PortalShell } from '@/components/portal/PortalShell'

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

export default async function PortalSlugLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const supabase = getSupabase()

  const { data: couples } = await supabase
    .from('couples')
    .select('bride_first_name, groom_first_name, wedding_date, portal_slug')
    .eq('portal_slug', slug)
    .limit(1)

  const couple = couples?.[0]
  if (!couple) return notFound()

  return (
    <PortalShell couple={couple}>
      {children}
    </PortalShell>
  )
}
