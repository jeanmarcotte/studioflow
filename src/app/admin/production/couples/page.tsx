'use client'

import Link from 'next/link'

export default function CoupleHubLandingPage() {
  return (
    <div className="max-w-2xl mx-auto py-16 px-4 text-center space-y-6">
      <h1 className="text-2xl font-bold">Couple Production Hub</h1>
      <p className="text-muted-foreground">
        Select a couple from the Couples page or any Production page to view their hub.
      </p>
      <div className="flex justify-center gap-4">
        <Link
          href="/admin/couples"
          className="rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90 transition-colors"
        >
          Go to Couples Page
        </Link>
        <Link
          href="/admin/production/photo"
          className="rounded-lg border border-input px-5 py-2.5 text-sm font-medium hover:bg-accent/50 transition-colors"
        >
          Go to Photo Editing
        </Link>
      </div>
    </div>
  )
}
