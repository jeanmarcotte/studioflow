import { redirect } from 'next/navigation'

export default async function PaymentsRedirect({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  redirect(`/portal/${slug}`)
}
