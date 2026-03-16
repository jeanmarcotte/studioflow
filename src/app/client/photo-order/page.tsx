'use client'

import { useState } from 'react'
import { format } from 'date-fns'
import { Camera, CheckCircle, ChevronRight, Loader2, Search, Mail } from 'lucide-react'

// ─── Types ───────────────────────────────────────────────────────────────────

interface Couple {
  id: string
  couple_name: string
  bride_first_name: string
  groom_first_name: string
  wedding_date: string
  reception_venue: string | null
  email: string
}

interface Contract {
  parent_albums_qty: number | null
  parent_albums_size: string | null
  parent_albums_cover: string | null
  parent_albums_spreads: number | null
  parent_albums_images: number | null
  bride_groom_album_qty: number | null
  bride_groom_album_size: string | null
  bride_groom_album_cover: string | null
  bride_groom_album_spreads: number | null
  bride_groom_album_images: number | null
  prints_16x20: number | null
  prints_11x14: number | null
  prints_8x10: number | null
  prints_5x7: number | null
  prints_postcard_thankyou: number | null
  engagement_session: boolean | null
  engagement_location: string | null
  usb_dropbox_delivery: boolean | null
}

type SelectionsStatus = 'not_uploaded' | 'uploaded' | 'need_help'
type CoverStyle = 'classic' | 'minimal' | 'custom'

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatWeddingDate(dateStr: string): string {
  const date = new Date(dateStr + 'T12:00:00')
  return format(date, 'EEEE, MMMM d, yyyy')
}

// ─── Component ───────────────────────────────────────────────────────────────

export default function PhotoOrderPage() {
  const [step, setStep] = useState(1)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Step 1
  const [weddingDate, setWeddingDate] = useState('')
  const [brideFirstName, setBrideFirstName] = useState('')
  const [email, setEmail] = useState('')

  // Couple + contract data
  const [couple, setCouple] = useState<Couple | null>(null)
  const [contract, setContract] = useState<Contract | null>(null)

  // Step 3 form
  const [selectionsStatus, setSelectionsStatus] = useState<SelectionsStatus | ''>('')
  const [albumCoverText, setAlbumCoverText] = useState('')
  const [coverStyle, setCoverStyle] = useState<CoverStyle | ''>('')
  const [printInstructions, setPrintInstructions] = useState('')
  const [additionalNotes, setAdditionalNotes] = useState('')
  const [noSpecialRequests, setNoSpecialRequests] = useState(false)

  // ─── Step 1: Lookup ──────────────────────────────────────────────────────

  async function handleLookup() {
    setError(null)
    setLoading(true)
    try {
      const res = await fetch('/api/client/lookup-couple', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          wedding_date: weddingDate,
          bride_first_name: brideFirstName.trim(),
          email: email.trim(),
        }),
      })
      const json = await res.json()
      if (!res.ok) {
        setError(json.error || 'Something went wrong')
        return
      }
      setCouple(json.couple)
      setStep(2)
    } catch {
      setError('Network error. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  // ─── Step 2 → 3: Load contract ──────────────────────────────────────────

  async function handleContinueToForm() {
    if (!couple) return
    setError(null)
    setLoading(true)
    try {
      const res = await fetch(`/api/client/contract?coupleId=${couple.id}`)
      const json = await res.json()
      if (!res.ok) {
        setError(json.error || 'Could not load contract')
        return
      }
      setContract(json.contract)
      // Prefill album cover text
      const d = new Date(couple.wedding_date + 'T12:00:00')
      const formatted = format(d, 'MMMM d, yyyy')
      setAlbumCoverText(`${couple.bride_first_name} & ${couple.groom_first_name} \u2022 ${formatted}`)
      setStep(3)
    } catch {
      setError('Network error. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  // ─── Step 3: Submit ──────────────────────────────────────────────────────

  async function handleSubmit() {
    if (!couple || !selectionsStatus || !coverStyle) {
      setError('Please complete all required fields.')
      return
    }
    setError(null)
    setLoading(true)
    try {
      const res = await fetch('/api/client/photo-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          couple_id: couple.id,
          selections_status: selectionsStatus,
          needs_dropbox_link: selectionsStatus === 'not_uploaded',
          album_cover_text: albumCoverText,
          cover_style: coverStyle,
          print_instructions: printInstructions || null,
          additional_notes: additionalNotes || null,
          no_special_requests: noSpecialRequests,
          submitted_by_email: email,
        }),
      })
      const json = await res.json()
      if (!res.ok) {
        setError(json.error || 'Something went wrong')
        return
      }
      setStep(4)
    } catch {
      setError('Network error. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  // ─── Progress Bar ────────────────────────────────────────────────────────

  function ProgressBar() {
    const steps = ['Find Wedding', 'Confirm', 'Photo Order', 'Done']
    return (
      <div className="flex items-center justify-center gap-1 mb-8">
        {steps.map((label, i) => {
          const stepNum = i + 1
          const isActive = step === stepNum
          const isCompleted = step > stepNum
          return (
            <div key={label} className="flex items-center gap-1">
              <div className="flex items-center gap-1.5">
                <div
                  className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-medium transition-colors ${
                    isCompleted
                      ? 'bg-teal-600 text-white'
                      : isActive
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted text-muted-foreground'
                  }`}
                >
                  {isCompleted ? <CheckCircle className="w-4 h-4" /> : stepNum}
                </div>
                <span
                  className={`text-xs hidden sm:inline ${
                    isActive ? 'font-semibold text-foreground' : 'text-muted-foreground'
                  }`}
                >
                  {label}
                </span>
              </div>
              {i < steps.length - 1 && (
                <ChevronRight className="w-4 h-4 text-muted-foreground mx-1" />
              )}
            </div>
          )
        })}
      </div>
    )
  }

  // ─── Package Summary ─────────────────────────────────────────────────────

  function PackageSummary() {
    if (!contract) return null
    const items: string[] = []

    if (contract.parent_albums_qty && contract.parent_albums_qty > 0) {
      items.push(
        `Parent Albums: ${contract.parent_albums_qty} \u00d7 ${contract.parent_albums_size || ''} ${contract.parent_albums_cover || ''}, ${contract.parent_albums_spreads || 0} spreads, ${contract.parent_albums_images || 0} images each`
      )
    }

    if (contract.bride_groom_album_qty && contract.bride_groom_album_qty > 0) {
      items.push(
        `Main Album: ${contract.bride_groom_album_qty} \u00d7 ${contract.bride_groom_album_size || ''} ${contract.bride_groom_album_cover || ''}, ${contract.bride_groom_album_spreads || 0} spreads, ${contract.bride_groom_album_images || 0} images`
      )
    }

    const prints: string[] = []
    if (contract.prints_16x20 && contract.prints_16x20 > 0) prints.push(`${contract.prints_16x20} \u00d7 16\u00d720`)
    if (contract.prints_11x14 && contract.prints_11x14 > 0) prints.push(`${contract.prints_11x14} \u00d7 11\u00d714`)
    if (contract.prints_8x10 && contract.prints_8x10 > 0) prints.push(`${contract.prints_8x10} \u00d7 8\u00d710`)
    if (contract.prints_5x7 && contract.prints_5x7 > 0) prints.push(`${contract.prints_5x7} \u00d7 5\u00d77`)
    if (contract.prints_postcard_thankyou && contract.prints_postcard_thankyou > 0) prints.push(`${contract.prints_postcard_thankyou} \u00d7 Postcard/Thank You`)
    if (prints.length > 0) items.push(`Prints: ${prints.join(', ')}`)

    if (contract.engagement_session) {
      items.push(`Engagement Session${contract.engagement_location ? `: ${contract.engagement_location}` : ''}`)
    }

    if (contract.usb_dropbox_delivery) {
      items.push('Delivery: USB/Dropbox')
    }

    if (items.length === 0) return null

    return (
      <div className="bg-muted/50 rounded-lg p-4 mb-6">
        <h3 className="text-sm font-semibold text-foreground mb-2">Your Package</h3>
        <ul className="space-y-1">
          {items.map((item) => (
            <li key={item} className="text-sm text-muted-foreground">{item}</li>
          ))}
        </ul>
      </div>
    )
  }

  // ─── Render ──────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b bg-card">
        <div className="max-w-2xl mx-auto px-4 py-4 flex items-center gap-2">
          <Camera className="w-6 h-6 text-teal-600" />
          <span className="font-semibold text-lg">SIGS Photography</span>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-8">
        <ProgressBar />

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 mb-6 text-sm">
            {error}
          </div>
        )}

        {/* ─── STEP 1: Couple Lookup ──────────────────────────────────── */}
        {step === 1 && (
          <div className="bg-card rounded-xl border p-6 shadow-sm">
            <div className="text-center mb-6">
              <Search className="w-10 h-10 text-teal-600 mx-auto mb-3" />
              <h1 className="text-2xl font-bold text-foreground">Photo Order Form</h1>
              <p className="text-muted-foreground mt-1">
                Enter your details to get started
              </p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">
                  Wedding Date
                </label>
                <input
                  type="date"
                  value={weddingDate}
                  onChange={(e) => setWeddingDate(e.target.value)}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-1">
                  Bride&apos;s First Name
                </label>
                <input
                  type="text"
                  placeholder="e.g. Sarah"
                  value={brideFirstName}
                  onChange={(e) => setBrideFirstName(e.target.value)}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-1">
                  Email Address
                </label>
                <input
                  type="email"
                  placeholder="your@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>

              <button
                onClick={handleLookup}
                disabled={loading || !weddingDate || !brideFirstName || !email}
                className="w-full bg-teal-600 hover:bg-teal-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium py-3 px-4 rounded-lg transition-colors flex items-center justify-center gap-2"
              >
                {loading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Search className="w-4 h-4" />
                )}
                Find My Wedding
              </button>
            </div>
          </div>
        )}

        {/* ─── STEP 2: Confirmation ───────────────────────────────────── */}
        {step === 2 && couple && (
          <div className="bg-card rounded-xl border p-6 shadow-sm text-center">
            <div className="text-4xl mb-4">🎉</div>
            <h1 className="text-2xl font-bold text-foreground mb-2">
              Congratulations {couple.couple_name}!
            </h1>
            <div className="space-y-1 text-muted-foreground mb-6">
              <p className="text-lg">{formatWeddingDate(couple.wedding_date)}</p>
              {couple.reception_venue && (
                <p>{couple.reception_venue}</p>
              )}
            </div>
            <button
              onClick={handleContinueToForm}
              disabled={loading}
              className="bg-teal-600 hover:bg-teal-700 disabled:opacity-50 text-white font-medium py-3 px-6 rounded-lg transition-colors inline-flex items-center gap-2"
            >
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <ChevronRight className="w-4 h-4" />
              )}
              Continue to Photo Order
            </button>
          </div>
        )}

        {/* ─── STEP 3: Form ───────────────────────────────────────────── */}
        {step === 3 && couple && (
          <div className="space-y-6">
            {/* Header */}
            <div className="bg-card rounded-xl border p-4 shadow-sm">
              <h1 className="text-xl font-bold text-foreground">{couple.couple_name}</h1>
              <p className="text-sm text-muted-foreground">
                {formatWeddingDate(couple.wedding_date)}
                {couple.reception_venue ? ` \u2022 ${couple.reception_venue}` : ''}
              </p>
            </div>

            {/* Package Summary */}
            <PackageSummary />

            {/* Photo Selections */}
            <div className="bg-card rounded-xl border p-6 shadow-sm">
              <h2 className="text-lg font-semibold text-foreground mb-4">Photo Selections</h2>
              <div className="space-y-3">
                <label className="flex items-start gap-3 p-3 rounded-lg border cursor-pointer hover:bg-muted/50 transition-colors">
                  <input
                    type="radio"
                    name="selections"
                    value="not_uploaded"
                    checked={selectionsStatus === 'not_uploaded'}
                    onChange={() => setSelectionsStatus('not_uploaded')}
                    className="mt-0.5 w-4 h-4 accent-teal-600"
                  />
                  <span className="text-sm">Not yet — please send me the Dropbox link</span>
                </label>
                <label className="flex items-start gap-3 p-3 rounded-lg border cursor-pointer hover:bg-muted/50 transition-colors">
                  <input
                    type="radio"
                    name="selections"
                    value="uploaded"
                    checked={selectionsStatus === 'uploaded'}
                    onChange={() => setSelectionsStatus('uploaded')}
                    className="mt-0.5 w-4 h-4 accent-teal-600"
                  />
                  <span className="text-sm">Yes, I&apos;ve uploaded to Dropbox</span>
                </label>
                <label className="flex items-start gap-3 p-3 rounded-lg border cursor-pointer hover:bg-muted/50 transition-colors">
                  <input
                    type="radio"
                    name="selections"
                    value="need_help"
                    checked={selectionsStatus === 'need_help'}
                    onChange={() => setSelectionsStatus('need_help')}
                    className="mt-0.5 w-4 h-4 accent-teal-600"
                  />
                  <span className="text-sm">I need help selecting photos</span>
                </label>
              </div>
            </div>

            {/* Album Details */}
            <div className="bg-card rounded-xl border p-6 shadow-sm">
              <h2 className="text-lg font-semibold text-foreground mb-4">Album Details</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">
                    Album Cover Text
                  </label>
                  <input
                    type="text"
                    value={albumCoverText}
                    onChange={(e) => setAlbumCoverText(e.target.value)}
                    placeholder="e.g. Sarah & Mike • April 11, 2025"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">
                    Cover Style
                  </label>
                  <div className="space-y-2">
                    <label className="flex items-center gap-3 p-3 rounded-lg border cursor-pointer hover:bg-muted/50 transition-colors">
                      <input
                        type="radio"
                        name="coverStyle"
                        value="classic"
                        checked={coverStyle === 'classic'}
                        onChange={() => setCoverStyle('classic')}
                        className="w-4 h-4 accent-teal-600"
                      />
                      <div>
                        <span className="text-sm font-medium">Classic</span>
                        <p className="text-xs text-muted-foreground">Traditional elegant cover design</p>
                      </div>
                    </label>
                    <label className="flex items-center gap-3 p-3 rounded-lg border cursor-pointer hover:bg-muted/50 transition-colors">
                      <input
                        type="radio"
                        name="coverStyle"
                        value="minimal"
                        checked={coverStyle === 'minimal'}
                        onChange={() => setCoverStyle('minimal')}
                        className="w-4 h-4 accent-teal-600"
                      />
                      <div>
                        <span className="text-sm font-medium">Minimal</span>
                        <p className="text-xs text-muted-foreground">Clean, modern design</p>
                      </div>
                    </label>
                    <label className="flex items-center gap-3 p-3 rounded-lg border cursor-pointer hover:bg-muted/50 transition-colors">
                      <input
                        type="radio"
                        name="coverStyle"
                        value="custom"
                        checked={coverStyle === 'custom'}
                        onChange={() => setCoverStyle('custom')}
                        className="w-4 h-4 accent-teal-600"
                      />
                      <div>
                        <span className="text-sm font-medium">Custom</span>
                        <p className="text-xs text-muted-foreground">Describe your preference in the notes below</p>
                      </div>
                    </label>
                  </div>
                </div>
              </div>
            </div>

            {/* Print Instructions */}
            <div className="bg-card rounded-xl border p-6 shadow-sm">
              <h2 className="text-lg font-semibold text-foreground mb-4">Print Instructions</h2>
              <textarea
                value={printInstructions}
                onChange={(e) => setPrintInstructions(e.target.value)}
                placeholder="Any specific instructions for your prints (e.g. which photos to use, sizing preferences)..."
                rows={3}
                className="w-full"
              />
            </div>

            {/* Additional */}
            <div className="bg-card rounded-xl border p-6 shadow-sm">
              <h2 className="text-lg font-semibold text-foreground mb-4">Additional Notes</h2>
              <textarea
                value={additionalNotes}
                onChange={(e) => setAdditionalNotes(e.target.value)}
                placeholder="Anything else you'd like us to know..."
                rows={3}
                className="w-full mb-4"
              />
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={noSpecialRequests}
                  onChange={(e) => setNoSpecialRequests(e.target.checked)}
                  className="w-4 h-4 accent-teal-600 rounded"
                />
                <span className="text-sm text-muted-foreground">
                  No special requests — use your best judgment
                </span>
              </label>
            </div>

            {/* Submit */}
            <button
              onClick={handleSubmit}
              disabled={loading || !selectionsStatus || !coverStyle}
              className="w-full bg-teal-600 hover:bg-teal-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold py-4 px-6 rounded-xl transition-colors flex items-center justify-center gap-2 text-lg"
            >
              {loading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <Camera className="w-5 h-5" />
              )}
              Submit Photo Order
            </button>
          </div>
        )}

        {/* ─── STEP 4: Confirmation ───────────────────────────────────── */}
        {step === 4 && (
          <div className="bg-card rounded-xl border p-8 shadow-sm text-center">
            <CheckCircle className="w-16 h-16 text-teal-600 mx-auto mb-4" />
            <h1 className="text-2xl font-bold text-foreground mb-2">
              Photo Order Submitted!
            </h1>
            <p className="text-muted-foreground mb-6 max-w-md mx-auto">
              Thank you for submitting your photo order preferences. We&apos;ll review everything
              and get started on your beautiful photos.
            </p>
            <div className="bg-muted/50 rounded-lg p-4 text-left max-w-sm mx-auto">
              <h3 className="text-sm font-semibold text-foreground mb-2">What happens next?</h3>
              <ul className="space-y-1.5 text-sm text-muted-foreground">
                <li>1. We&apos;ll review your order details</li>
                <li>2. You&apos;ll receive a confirmation email</li>
                <li>3. We&apos;ll begin working on your photos</li>
              </ul>
            </div>
            <div className="mt-6 flex items-center justify-center gap-2 text-sm text-muted-foreground">
              <Mail className="w-4 h-4" />
              <span>Questions? Contact us at info@sigsphoto.ca</span>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
