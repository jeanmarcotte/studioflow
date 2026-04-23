'use client'

import { useState, useEffect, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { generateQuotePdf, type QuotePdfData } from '@/lib/generateQuotePdf'
import { Loader2, FileText, AlertCircle, ArrowLeft, Download, CheckCircle2 } from 'lucide-react'

// Package definitions matching the quote builder
const PACKAGES: Record<string, { name: string; price: number; hours: number; features: string[] }> = {
  exclusively_photo: {
    name: 'Exclusively Photography',
    price: 5350,
    hours: 8,
    features: [
      'Up to 8 hours of coverage',
      '2 Professional Photographers',
      'Drone Photography',
      'Engagement Photo session (~50 digital photos w/ watermark)',
      'Professional retouching and colour correction',
      'Photo Sneak Peeks',
      'Engagement & Wedding personalized online photo gallery',
      'Online proofing for your final approval',
      'Digital Download of ALL edited wedding photos NO WATERMARK',
    ],
  },
  package_c: {
    name: 'Photography & Video Package C',
    price: 6400,
    hours: 8,
    features: [
      'Up to 8 hours of coverage',
      '1 Professional Photographer',
      '1 Professional Videographer',
      'Drone Photography & Video Footage',
      'Engagement Photo session (~50 digital photos w/ watermark)',
      'Professional retouching and colour correction',
      'Photo Sneak Peeks',
      'Engagement & Wedding personalized online photo gallery',
      'Online proofing for your final approval',
      'Digital Download of ALL edited wedding photos NO WATERMARK',
      'Digital Download edited 2 hr story video',
      '8-12 min Highlight Reel',
      'Fun clips for Instagram',
      'Proof Video (preview video before final copy)',
      'Multi-camera shooting at the ceremony and venue',
      'Digital Audio Recorder',
      'USB with Wedding Photos & Video',
    ],
  },
  package_b: {
    name: 'Photography & Video Package B',
    price: 7000,
    hours: 10,
    features: [
      'Up to 10 hours of coverage',
      '2 Professional Photographers',
      '1 Professional Videographer',
      'Drone Photography & Video Footage',
      'Engagement Photo session (~50 digital photos w/ watermark)',
      'Engagement Shoot Slideshow Presentation',
      'Professional retouching and colour correction',
      'Photo Sneak Peeks',
      'Engagement & Wedding personalized online photo gallery',
      'Online proofing for your final approval',
      'Digital Download of ALL edited wedding photos NO WATERMARK',
      'Digital Download edited 2 hr story video',
      '8-12 min Highlight Reel',
      'Fun clips for Instagram',
      'Proof Video (preview video before final copy)',
      'Multi-camera shooting at the ceremony and venue',
      'Digital Audio Recorder',
      'USB with Wedding Photos & Video',
    ],
  },
  package_a: {
    name: 'Photography & Video Package A',
    price: 8000,
    hours: 12,
    features: [
      'Up to 12 hours of coverage',
      '2 Professional Photographers',
      '1 Professional Videographer',
      'Drone Photography & Video Footage',
      'Engagement Photo session (~50 digital photos w/ watermark)',
      'Engagement Shoot Slideshow Presentation',
      'Professional retouching and colour correction',
      'Photo Sneak Peeks',
      'Engagement & Wedding personalized online photo gallery',
      'Online proofing for your final approval',
      'Digital Download of ALL edited wedding photos NO WATERMARK',
      'Digital Download edited 2 hr story video',
      '8-12 min Highlight Reel',
      'Fun clips for Instagram',
      'Proof Video (preview video before final copy)',
      'Multi-camera shooting at the ceremony and venue',
      'Digital Audio Recorder',
      'USB with Wedding Photos & Video',
    ],
  },
}

// Reverse-lookup: find package key by name
function findPackageKey(packageName: string): string {
  for (const [key, pkg] of Object.entries(PACKAGES)) {
    if (pkg.name === packageName) return key
  }
  return 'package_c'
}

function ContractGenerateContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const quoteId = searchParams.get('quote_id')

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [quote, setQuote] = useState<any>(null)
  const [generating, setGenerating] = useState(false)
  const [saved, setSaved] = useState(false)
  const [saveError, setSaveError] = useState('')

  useEffect(() => {
    if (!quoteId) {
      setError('No quote_id provided')
      setLoading(false)
      return
    }

    async function fetchQuote() {
      try {
        const res = await fetch(`/api/admin/contracts/quote?quote_id=${quoteId}`)
        if (!res.ok) {
          const body = await res.json().catch(() => ({ error: `HTTP ${res.status}` }))
          throw new Error(body.error || `Failed to fetch quote`)
        }
        const data = await res.json()
        setQuote(data)
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed to load quote')
      } finally {
        setLoading(false)
      }
    }

    fetchQuote()
  }, [quoteId])

  const handleGenerate = async () => {
    if (!quote) return
    setGenerating(true)
    setSaveError('')

    try {
      const packageKey = findPackageKey(quote.package_name || '')
      const pkg = PACKAGES[packageKey]

      const timeline: QuotePdfData['timeline'] = Array.isArray(quote.timeline)
        ? quote.timeline
        : []

      const installments: QuotePdfData['installments'] = Array.isArray(quote.installments)
        ? quote.installments.map((inst: any) => ({
            label: inst.label || inst.due_description || '',
            amount: Number(inst.amount) || 0,
          }))
        : []

      const pdfData: QuotePdfData = {
        brideFirstName: quote.bride_first_name || '',
        brideLastName: quote.bride_last_name || '',
        groomFirstName: quote.groom_first_name || '',
        groomLastName: quote.groom_last_name || '',
        brideEmail: quote.email || '',
        bridePhone: quote.phone || '',
        groomEmail: '',
        groomPhone: '',
        weddingDate: quote.wedding_date || '',
        ceremonyVenue: quote.ceremony_venue || '',
        receptionVenue: quote.reception_venue || '',
        guestCount: quote.guest_count || undefined,
        bridalPartyCount: quote.bridal_party_count || undefined,
        flowerGirl: quote.flower_girl_count || undefined,
        ringBearer: quote.ring_bearer_count || undefined,
        selectedPackage: packageKey,
        packageName: pkg?.name || quote.package_name || '',
        packageHours: quote.coverage_hours || pkg?.hours || 0,
        packageFeatures: pkg?.features || [],
        extraPhotographer: false,
        extraHours: quote.extra_hours || 0,
        splitMorningTeam: false,
        thankYouCardQty: 0,
        albumIncluded: packageKey === 'diamond' || packageKey === 'eleganza',
        engagementLocation: quote.engagement_location || '',
        engagementLocationLabel: quote.engagement_location || '',
        albumType: 'none',
        albumSize: '10x8',
        acrylicCover: false,
        parentAlbumQty: quote.parent_albums_count || 0,
        firstLook: quote.first_look ?? false,
        pricing: {
          basePrice: quote.package_price || pkg?.price || 0,
          extraPhotographerPrice: 0,
          extraHoursPrice: quote.extra_hours_price || 0,
          splitMorningTeamPrice: 0,
          albumPrice: 0,
          acrylicCoverPrice: 0,
          parentAlbumsPrice: quote.parent_albums_price || 0,
          locationFee: 0,
          printsPrice: 0,
          thankYouCardsPrice: 0,
          subtotal: quote.subtotal || 0,
          discount: quote.discount_amount || 0,
          hst: quote.hst_amount || 0,
          total: quote.total || 0,
        },
        freeParentAlbums: quote.parent_albums_price === 0 && (quote.parent_albums_count || 0) > 0,
        freePrints: quote.prints_included === 'free',
        printsTotal: 0,
        printOrders: {},
        timeline,
        installments,
        discountType: quote.discount_type || 'none',
        discountAmount: quote.discount_value || undefined,
        leadSource: quote.lead_source || '',
        notes: quote.notes || '',
        contractMode: true,
      }

      // Generate PDF download
      await generateQuotePdf(pdfData)

      // Save contract to database (contracts + contract_installments + update couple + mark quote converted)
      const saveRes = await fetch('/api/admin/contracts/from-quote', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ quote_id: quoteId }),
      })

      if (!saveRes.ok) {
        const body = await saveRes.json().catch(() => ({ error: 'Save failed' }))
        // 409 = already converted, treat as success
        if (saveRes.status === 409) {
          setSaved(true)
        } else {
          setSaveError(body.error || 'Failed to save contract to database')
        }
      } else {
        setSaved(true)
      }
    } catch (e) {
      console.error('Contract generation failed:', e)
      setError(e instanceof Error ? e.message : 'Failed to generate contract')
    } finally {
      setGenerating(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-teal-500 mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">Loading quote data...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center max-w-md">
          <AlertCircle className="h-10 w-10 text-red-500 mx-auto mb-3" />
          <p className="font-semibold text-lg mb-1">Error</p>
          <p className="text-sm text-muted-foreground mb-4">{error}</p>
          <button
            onClick={() => router.back()}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border text-sm font-medium hover:bg-accent transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Go Back
          </button>
        </div>
      </div>
    )
  }

  if (!quote) return null

  const coupleName = [quote.bride_first_name, quote.groom_first_name].filter(Boolean).join(' & ')
  const fmt = (n: number) => '$' + (n || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })

  return (
    <div className="min-h-screen bg-background p-4 md:p-6 max-w-2xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <button
          onClick={() => router.back()}
          className="p-2 rounded-lg hover:bg-accent transition-colors"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div>
          <h1 className="text-xl md:text-2xl font-bold">Generate Contract</h1>
          {coupleName && (
            <p className="text-sm text-muted-foreground">{coupleName}</p>
          )}
        </div>
      </div>

      {/* Quote Summary */}
      <div className="rounded-xl border bg-card p-5 mb-4 space-y-3">
        <div className="flex items-center gap-2 mb-2">
          <FileText className="h-4 w-4 text-teal-600" />
          <h2 className="font-semibold text-sm">Quote Summary</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-y-2 text-sm">
          <div>
            <span className="text-muted-foreground">Couple</span>
            <p className="font-medium">{coupleName || '\u2014'}</p>
          </div>
          <div>
            <span className="text-muted-foreground">Wedding Date</span>
            <p className="font-medium">{quote.wedding_date || '\u2014'}</p>
          </div>
          <div>
            <span className="text-muted-foreground">Package</span>
            <p className="font-medium">{quote.package_name || '\u2014'}</p>
          </div>
          <div>
            <span className="text-muted-foreground">Coverage</span>
            <p className="font-medium">{quote.coverage_hours ? `${quote.coverage_hours} hours` : '\u2014'}</p>
          </div>
          <div>
            <span className="text-muted-foreground">Ceremony</span>
            <p className="font-medium">{quote.ceremony_venue || '\u2014'}</p>
          </div>
          <div>
            <span className="text-muted-foreground">Reception</span>
            <p className="font-medium">{quote.reception_venue || '\u2014'}</p>
          </div>
        </div>

        <div className="border-t pt-3 mt-3">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Subtotal</span>
            <span>{fmt(quote.subtotal)}</span>
          </div>
          {quote.discount_amount > 0 && (
            <div className="flex justify-between text-sm text-green-600">
              <span>Discount</span>
              <span>-{fmt(quote.discount_amount)}</span>
            </div>
          )}
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">HST (13%)</span>
            <span>{fmt(quote.hst_amount)}</span>
          </div>
          <div className="flex justify-between text-sm font-bold border-t pt-1 mt-1">
            <span>Total</span>
            <span className="text-teal-600">{fmt(quote.total)}</span>
          </div>
        </div>
      </div>

      {/* Installments */}
      {Array.isArray(quote.installments) && quote.installments.length > 0 && (
        <div className="rounded-xl border bg-card p-5 mb-4">
          <h3 className="font-semibold text-sm mb-2">Payment Schedule ({quote.installments.length} installments)</h3>
          <div className="space-y-1">
            {quote.installments.map((inst: any, i: number) => (
              <div key={i} className="flex justify-between text-sm">
                <span className="text-muted-foreground">#{i + 1} {inst.label || inst.due_description || ''}</span>
                <span className="font-medium">{fmt(inst.amount)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Generate Button */}
      <button
        onClick={handleGenerate}
        disabled={generating || saved}
        className="w-full inline-flex items-center justify-center gap-2 px-6 py-3 rounded-lg bg-teal-600 text-white font-medium hover:bg-teal-700 disabled:opacity-50 transition-colors"
      >
        {generating ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            Generating Contract...
          </>
        ) : saved ? (
          <>
            <CheckCircle2 className="h-4 w-4" />
            Contract Saved &amp; Downloaded
          </>
        ) : (
          <>
            <Download className="h-4 w-4" />
            Generate &amp; Download Contract PDF
          </>
        )}
      </button>

      {saved && (
        <div className="rounded-lg bg-green-50 border border-green-200 p-3 text-sm text-green-700 text-center mt-3">
          Contract saved to database, couple marked as booked, and quote marked as converted.
        </div>
      )}

      {saveError && (
        <div className="rounded-lg bg-amber-50 border border-amber-200 p-3 text-sm text-amber-700 text-center mt-3">
          PDF downloaded but database save failed: {saveError}
        </div>
      )}

      <p className="text-xs text-muted-foreground text-center mt-3">
        Generates a 3-page PDF and saves the contract to the database with all financial data and installments.
      </p>
    </div>
  )
}

export default function ContractGeneratePage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-background flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-teal-500" />
        </div>
      }
    >
      <ContractGenerateContent />
    </Suspense>
  )
}
