'use client'

import { useState } from 'react'
import { format } from 'date-fns'
import { Camera, CheckCircle, ChevronDown, ChevronRight, Loader2, Mail, Search } from 'lucide-react'

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
  bride_groom_album_qty: number | null
  bride_groom_album_size: string | null
  bride_groom_album_images: number | null
  bride_groom_album_cover: string | null
  parent_albums_qty: number | null
  parent_albums_size: string | null
  parent_albums_images: number | null
  parent_albums_cover: string | null
  prints_30x40: number | null
  prints_24x30: number | null
  prints_20x24: number | null
  prints_16x20: number | null
  prints_16x16: number | null
  prints_11x14: number | null
  prints_8x10: number | null
  prints_5x7: number | null
  prints_postcard_thankyou: number | null
  usb_dropbox_delivery: boolean | null
}

interface Extras {
  album_qty: number | null
  album_cover: string | null
  collage_size: string | null
  collage_type: string | null
  wedding_frame_size: string | null
  eng_portrait_size: string | null
}

interface PrintRow {
  size: string
  qty: number
  filename: string
}

// ─── Constants ───────────────────────────────────────────────────────────────

function formatWeddingDate(dateStr: string): string {
  const date = new Date(dateStr + 'T12:00:00')
  return format(date, 'EEEE, MMMM d, yyyy')
}

const PRINT_SIZES: { key: keyof Contract; label: string }[] = [
  { key: 'prints_30x40', label: '30\u00d740' },
  { key: 'prints_24x30', label: '24\u00d730' },
  { key: 'prints_20x24', label: '20\u00d724' },
  { key: 'prints_16x20', label: '16\u00d720' },
  { key: 'prints_16x16', label: '16\u00d716' },
  { key: 'prints_11x14', label: '11\u00d714' },
  { key: 'prints_8x10', label: '8\u00d710' },
  { key: 'prints_5x7', label: '5\u00d77' },
]

// ─── Component ───────────────────────────────────────────────────────────────

export default function PhotoOrderPage() {
  const [step, setStep] = useState(1)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Step 1 — date as 3 dropdowns
  const [month, setMonth] = useState('')
  const [day, setDay] = useState('')
  const [year, setYear] = useState('')
  const [firstName, setFirstName] = useState('')
  const [email, setEmail] = useState('')

  // Data
  const [couple, setCouple] = useState<Couple | null>(null)
  const [contract, setContract] = useState<Contract | null>(null)
  const [extras, setExtras] = useState<Extras | null>(null)

  // Step 3 form
  const [designPref, setDesignPref] = useState<'omakase' | 'custom' | ''>('')
  const [coverPhotoFilename, setCoverPhotoFilename] = useState('')
  const [parentAlbum1Photos, setParentAlbum1Photos] = useState('')
  const [parentAlbum1Notes, setParentAlbum1Notes] = useState('')
  const [parentAlbum1NotesOpen, setParentAlbum1NotesOpen] = useState(false)
  const [parentAlbum2Photos, setParentAlbum2Photos] = useState('')
  const [parentAlbum2Notes, setParentAlbum2Notes] = useState('')
  const [parentAlbum2NotesOpen, setParentAlbum2NotesOpen] = useState(false)
  const [mainAlbumPhotos, setMainAlbumPhotos] = useState('')
  const [mainAlbumNotes, setMainAlbumNotes] = useState('')
  const [mainAlbumNotesOpen, setMainAlbumNotesOpen] = useState(false)
  const [printRows, setPrintRows] = useState<PrintRow[]>([])
  const [collagePhotos, setCollagePhotos] = useState('')
  const [weddingFramePhoto, setWeddingFramePhoto] = useState('')
  const [engPortraitPhoto, setEngPortraitPhoto] = useState('')
  const [albumCoverText, setAlbumCoverText] = useState('')
  const [specialInstructions, setSpecialInstructions] = useState('')
  const [noSpecialRequests, setNoSpecialRequests] = useState(false)

  // ─── Derived ─────────────────────────────────────────────────────────────

  const parentAlbumsQty = contract?.parent_albums_qty ?? 0
  const parentAlbumsImages = contract?.parent_albums_images ?? 0
  const hasMainAlbum = (contract?.bride_groom_album_qty ?? 0) > 0 || (extras?.album_qty ?? 0) > 0
  const mainAlbumImages = contract?.bride_groom_album_images ?? 0
  const hasCollage = !!extras?.collage_size
  const hasWeddingFrame = !!extras?.wedding_frame_size
  const hasEngPortrait = !!extras?.eng_portrait_size
  const isCustom = designPref === 'custom'

  const weddingDateStr = month && day && year
    ? `${year}-${month}-${day}`
    : ''

  // ─── Step 1: Lookup ──────────────────────────────────────────────────────

  async function handleLookup() {
    setError(null)
    setLoading(true)
    try {
      const res = await fetch('/api/client/lookup-couple', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          wedding_date: weddingDateStr,
          first_name: firstName.trim(),
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

  // ─── Step 2 → 3: Load contract + extras ──────────────────────────────────

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
      const c: Contract | null = json.contract
      const e: Extras | null = json.extras
      setContract(c)
      setExtras(e)

      // Build print rows from contract
      if (c) {
        const rows: PrintRow[] = []
        for (const ps of PRINT_SIZES) {
          const qty = c[ps.key] as number | null
          if (qty && qty > 0) {
            rows.push({ size: ps.label, qty, filename: '' })
          }
        }
        setPrintRows(rows)
      }

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
    if (!couple || !designPref) {
      setError('Please select an album design preference.')
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
          album_design_preference: designPref,
          cover_photo_filename: coverPhotoFilename || null,
          parent_album_1_photos: parentAlbum1Photos || null,
          parent_album_1_notes: parentAlbum1Notes || null,
          parent_album_2_photos: parentAlbum2Photos || null,
          parent_album_2_notes: parentAlbum2Notes || null,
          main_album_photos: mainAlbumPhotos || null,
          main_album_notes: mainAlbumNotes || null,
          portrait_prints: printRows.length > 0 ? printRows.filter(r => r.filename) : null,
          collage_photos: collagePhotos || null,
          wedding_frame_photo: weddingFramePhoto || null,
          eng_portrait_photo: engPortraitPhoto || null,
          album_cover_text: albumCoverText || null,
          special_instructions: specialInstructions || null,
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
    const items: string[] = []

    // Parent albums from contract
    if (contract && parentAlbumsQty > 0) {
      items.push(
        `Parent Albums: ${parentAlbumsQty} \u00d7 ${contract.parent_albums_size || ''} ${contract.parent_albums_cover || ''}, ${parentAlbumsImages} images each`
      )
    }

    // Main album from contract
    if (contract?.bride_groom_album_qty && contract.bride_groom_album_qty > 0) {
      items.push(
        `Main Album: ${contract.bride_groom_album_qty} \u00d7 ${contract.bride_groom_album_size || ''} ${contract.bride_groom_album_cover || ''}, ${contract.bride_groom_album_images || 0} images`
      )
    }

    // Main album from extras
    if (extras?.album_qty && extras.album_qty > 0) {
      items.push(
        `Main Album (add-on): ${extras.album_qty} \u00d7 ${extras.album_cover || 'Standard'}`
      )
    }

    // Prints
    if (printRows.length > 0) {
      items.push(`Portrait Prints: ${printRows.map(r => `${r.qty} \u00d7 ${r.size}`).join(', ')}`)
    }

    // Extras
    if (hasCollage) {
      items.push(`Collage: ${extras!.collage_size} ${extras!.collage_type || ''}`.trim())
    }
    if (hasWeddingFrame) {
      items.push(`Wedding Frame: ${extras!.wedding_frame_size}`)
    }
    if (hasEngPortrait) {
      items.push(`Engagement Portrait: ${extras!.eng_portrait_size}`)
    }

    // Delivery
    if (contract?.usb_dropbox_delivery) {
      items.push('Delivery: USB/Dropbox')
    }

    return (
      <div className="bg-card rounded-xl border p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-foreground mb-3 flex items-center gap-2">
          <span>📖</span> Your Package
        </h2>
        {items.length > 0 ? (
          <ul className="space-y-1.5">
            {items.map((item) => (
              <li key={item} className="text-sm text-muted-foreground">{item}</li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-muted-foreground">No package details found.</p>
        )}
        {!hasMainAlbum && (
          <div className="mt-4 bg-teal-50 border border-teal-200 rounded-lg p-3 flex items-start gap-2">
            <span className="text-base">💡</span>
            <p className="text-sm text-teal-800">
              Interested in a main album? Call Marianna at{' '}
              <a href="tel:4168318942" className="font-medium underline">416-831-8942</a>
            </p>
          </div>
        )}
      </div>
    )
  }

  // ─── Collapsible Notes ───────────────────────────────────────────────────

  function NotesToggle({ open, onToggle, value, onChange }: {
    open: boolean
    onToggle: () => void
    value: string
    onChange: (v: string) => void
  }) {
    return (
      <div className="mt-2">
        <button
          type="button"
          onClick={onToggle}
          className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors"
        >
          <ChevronDown className={`w-3 h-3 transition-transform ${open ? 'rotate-0' : '-rotate-90'}`} />
          {open ? 'Hide notes' : 'Add notes'}
        </button>
        {open && (
          <textarea
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder="Optional notes for this album..."
            rows={2}
            className="w-full mt-1 text-sm"
          />
        )}
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

        {/* ═══ STEP 1: Couple Lookup ═══════════════════════════════════ */}
        {step === 1 && (
          <div className="bg-card rounded-xl border p-6 shadow-sm">
            <div className="text-center mb-6">
              <Search className="w-10 h-10 text-teal-600 mx-auto mb-3" />
              <h1 className="text-2xl font-bold text-foreground">Photo Order Form</h1>
              <p className="text-muted-foreground mt-1">Enter your details to get started</p>
            </div>

            <div className="space-y-4">
              {/* Date: 3 dropdowns */}
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">
                  Wedding Date
                </label>
                <div className="grid grid-cols-3 gap-2">
                  <select
                    value={month}
                    onChange={(e) => { setMonth(e.target.value); setDay('') }}
                  >
                    <option value="">Month</option>
                    <option value="01">January</option>
                    <option value="02">February</option>
                    <option value="03">March</option>
                    <option value="04">April</option>
                    <option value="05">May</option>
                    <option value="06">June</option>
                    <option value="07">July</option>
                    <option value="08">August</option>
                    <option value="09">September</option>
                    <option value="10">October</option>
                    <option value="11">November</option>
                    <option value="12">December</option>
                  </select>
                  <select
                    value={day}
                    onChange={(e) => setDay(e.target.value)}
                  >
                    <option value="">Day</option>
                    {[...Array(31)].map((_, i) => (
                      <option key={i + 1} value={String(i + 1).padStart(2, '0')}>{i + 1}</option>
                    ))}
                  </select>
                  <select
                    value={year}
                    onChange={(e) => { setYear(e.target.value); setDay('') }}
                  >
                    <option value="">Year</option>
                    <option value="2024">2024</option>
                    <option value="2025">2025</option>
                    <option value="2026">2026</option>
                    <option value="2027">2027</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-1">
                  First Name (Bride or Groom)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Sarah"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
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
                disabled={loading || !weddingDateStr || !firstName || !email}
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

        {/* ═══ STEP 2: Confirmation ═══════════════════════════════════ */}
        {step === 2 && couple && (
          <div className="bg-card rounded-xl border p-6 shadow-sm text-center">
            <div className="text-4xl mb-4">🎉</div>
            <h1 className="text-2xl font-bold text-foreground mb-2">
              Congratulations {couple.couple_name}!
            </h1>
            <div className="space-y-1 text-muted-foreground mb-6">
              <p className="text-lg">{formatWeddingDate(couple.wedding_date)}</p>
              {couple.reception_venue && <p>{couple.reception_venue}</p>}
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

        {/* ═══ STEP 3: Order Form ═════════════════════════════════════ */}
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

            {/* Album Design Preference */}
            <div className="bg-card rounded-xl border p-6 shadow-sm">
              <h2 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
                <span>📷</span> Album Design Preference
              </h2>
              <div className="space-y-3">
                <label className="flex items-start gap-3 p-3 rounded-lg border cursor-pointer hover:bg-muted/50 transition-colors">
                  <input
                    type="radio"
                    name="designPref"
                    checked={designPref === 'omakase'}
                    onChange={() => setDesignPref('omakase')}
                    className="mt-0.5 w-4 h-4 accent-teal-600"
                  />
                  <div>
                    <span className="text-sm font-medium">Omakase</span>
                    <p className="text-xs text-muted-foreground">Jean selects photos, you review the design</p>
                  </div>
                </label>
                <label className="flex items-start gap-3 p-3 rounded-lg border cursor-pointer hover:bg-muted/50 transition-colors">
                  <input
                    type="radio"
                    name="designPref"
                    checked={designPref === 'custom'}
                    onChange={() => setDesignPref('custom')}
                    className="mt-0.5 w-4 h-4 accent-teal-600"
                  />
                  <div>
                    <span className="text-sm font-medium">Custom</span>
                    <p className="text-xs text-muted-foreground">You select photos, Jean designs the album</p>
                  </div>
                </label>
              </div>
            </div>

            {/* Cover Photo */}
            <div className="bg-card rounded-xl border p-6 shadow-sm">
              <h2 className="text-lg font-semibold text-foreground mb-1 flex items-center gap-2">
                <span>📷</span> Cover Photo
              </h2>
              <p className="text-xs text-muted-foreground mb-3">
                Select a horizontal photo for the album cover (first image in parent albums)
              </p>
              <input
                type="text"
                value={coverPhotoFilename}
                onChange={(e) => setCoverPhotoFilename(e.target.value)}
                placeholder="e.g. DSC_1234.jpg"
              />
            </div>

            {/* Parent Album Selections — only if custom */}
            {isCustom && parentAlbumsQty > 0 && (
              <div className="bg-card rounded-xl border p-6 shadow-sm">
                <h2 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
                  <span>📷</span> Parent Album Selections
                </h2>

                {/* Album 1 */}
                <div className="mb-4">
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-sm font-medium text-foreground">Parent Album 1</label>
                    <span className="text-xs text-muted-foreground">
                      {parentAlbum1Photos.split(/[\n,]+/).filter(s => s.trim()).length} of {parentAlbumsImages}
                    </span>
                  </div>
                  <textarea
                    value={parentAlbum1Photos}
                    onChange={(e) => setParentAlbum1Photos(e.target.value)}
                    placeholder="Enter filenames, one per line or comma-separated..."
                    rows={3}
                    className="w-full"
                  />
                  <NotesToggle
                    open={parentAlbum1NotesOpen}
                    onToggle={() => setParentAlbum1NotesOpen(!parentAlbum1NotesOpen)}
                    value={parentAlbum1Notes}
                    onChange={setParentAlbum1Notes}
                  />
                </div>

                {/* Album 2 */}
                {parentAlbumsQty >= 2 && (
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-sm font-medium text-foreground">Parent Album 2</label>
                      <span className="text-xs text-muted-foreground">
                        {parentAlbum2Photos.split(/[\n,]+/).filter(s => s.trim()).length} of {parentAlbumsImages}
                      </span>
                    </div>
                    <textarea
                      value={parentAlbum2Photos}
                      onChange={(e) => setParentAlbum2Photos(e.target.value)}
                      placeholder="Enter filenames, one per line or comma-separated..."
                      rows={3}
                      className="w-full"
                    />
                    <NotesToggle
                      open={parentAlbum2NotesOpen}
                      onToggle={() => setParentAlbum2NotesOpen(!parentAlbum2NotesOpen)}
                      value={parentAlbum2Notes}
                      onChange={setParentAlbum2Notes}
                    />
                  </div>
                )}
              </div>
            )}

            {/* Main Album — only if has main album AND custom */}
            {isCustom && hasMainAlbum && (
              <div className="bg-card rounded-xl border p-6 shadow-sm">
                <h2 className="text-lg font-semibold text-foreground mb-1 flex items-center gap-2">
                  <span>📷</span> Main Album
                </h2>
                {mainAlbumImages > 0 && (
                  <p className="text-xs text-muted-foreground mb-3">
                    {mainAlbumPhotos.split(/[\n,]+/).filter(s => s.trim()).length} of {mainAlbumImages} selected
                  </p>
                )}
                <textarea
                  value={mainAlbumPhotos}
                  onChange={(e) => setMainAlbumPhotos(e.target.value)}
                  placeholder="Enter filenames, one per line or comma-separated..."
                  rows={3}
                  className="w-full"
                />
                <NotesToggle
                  open={mainAlbumNotesOpen}
                  onToggle={() => setMainAlbumNotesOpen(!mainAlbumNotesOpen)}
                  value={mainAlbumNotes}
                  onChange={setMainAlbumNotes}
                />
              </div>
            )}

            {/* Portrait Prints — dynamic rows */}
            {printRows.length > 0 && (
              <div className="bg-card rounded-xl border p-6 shadow-sm">
                <h2 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
                  <span>🖼️</span> Portrait Prints
                </h2>
                <div className="space-y-3">
                  {printRows.map((row, i) => (
                    <div key={row.size}>
                      <label className="text-sm font-medium text-foreground mb-1 block">
                        {row.size} <span className="text-muted-foreground font-normal">({row.qty} print{row.qty > 1 ? 's' : ''})</span>
                      </label>
                      <input
                        type="text"
                        value={row.filename}
                        onChange={(e) => {
                          const updated = [...printRows]
                          updated[i] = { ...row, filename: e.target.value }
                          setPrintRows(updated)
                        }}
                        placeholder="Photo filename (e.g. DSC_5678.jpg)"
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Collage */}
            {hasCollage && (
              <div className="bg-card rounded-xl border p-6 shadow-sm">
                <h2 className="text-lg font-semibold text-foreground mb-1 flex items-center gap-2">
                  <span>🖼️</span> Collage
                </h2>
                <p className="text-xs text-muted-foreground mb-3">
                  {extras!.collage_size} {extras!.collage_type || ''}
                </p>
                <textarea
                  value={collagePhotos}
                  onChange={(e) => setCollagePhotos(e.target.value)}
                  placeholder="Enter filenames for collage photos..."
                  rows={3}
                  className="w-full"
                />
              </div>
            )}

            {/* Wedding Frame */}
            {hasWeddingFrame && (
              <div className="bg-card rounded-xl border p-6 shadow-sm">
                <h2 className="text-lg font-semibold text-foreground mb-1 flex items-center gap-2">
                  <span>🖼️</span> Wedding Frame
                </h2>
                <p className="text-xs text-muted-foreground mb-3">{extras!.wedding_frame_size}</p>
                <input
                  type="text"
                  value={weddingFramePhoto}
                  onChange={(e) => setWeddingFramePhoto(e.target.value)}
                  placeholder="Photo filename (e.g. DSC_9012.jpg)"
                />
              </div>
            )}

            {/* Engagement Portrait */}
            {hasEngPortrait && (
              <div className="bg-card rounded-xl border p-6 shadow-sm">
                <h2 className="text-lg font-semibold text-foreground mb-1 flex items-center gap-2">
                  <span>🖼️</span> Engagement Portrait
                </h2>
                <p className="text-xs text-muted-foreground mb-3">{extras!.eng_portrait_size}</p>
                <input
                  type="text"
                  value={engPortraitPhoto}
                  onChange={(e) => setEngPortraitPhoto(e.target.value)}
                  placeholder="Photo filename (e.g. ENG_0456.jpg)"
                />
              </div>
            )}

            {/* Album Cover Text */}
            <div className="bg-card rounded-xl border p-6 shadow-sm">
              <h2 className="text-lg font-semibold text-foreground mb-3 flex items-center gap-2">
                <span>📖</span> Album Cover Text
              </h2>
              <input
                type="text"
                value={albumCoverText}
                onChange={(e) => setAlbumCoverText(e.target.value)}
                placeholder="e.g. Sarah & Mike • April 11, 2025"
              />
            </div>

            {/* Special Instructions */}
            <div className="bg-card rounded-xl border p-6 shadow-sm">
              <h2 className="text-lg font-semibold text-foreground mb-3 flex items-center gap-2">
                <span>📝</span> Special Instructions
              </h2>
              <textarea
                value={specialInstructions}
                onChange={(e) => setSpecialInstructions(e.target.value)}
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
              disabled={loading || !designPref}
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

        {/* ═══ STEP 4: Confirmation ═══════════════════════════════════ */}
        {step === 4 && (
          <div className="bg-card rounded-xl border p-8 shadow-sm text-center">
            <CheckCircle className="w-16 h-16 text-teal-600 mx-auto mb-4" />
            <h1 className="text-2xl font-bold text-foreground mb-2">
              Photo Order Submitted!
            </h1>
            <p className="text-muted-foreground mb-6 max-w-md mx-auto">
              Thank you for submitting your photo order. We&apos;ll review everything
              and get started on your beautiful photos.
            </p>
            <div className="bg-muted/50 rounded-lg p-4 text-left max-w-sm mx-auto">
              <h3 className="text-sm font-semibold text-foreground mb-2">What happens next?</h3>
              <ul className="space-y-1.5 text-sm text-muted-foreground">
                <li>1. We&apos;ll review your selections and preferences</li>
                <li>2. Jean will begin designing your albums</li>
                <li>3. You&apos;ll receive a proof for review</li>
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
