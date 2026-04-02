'use client'

import { useState } from 'react'
import { Camera, CheckCircle, ChevronRight, Loader2, Mail, Plus, Trash2 } from 'lucide-react'

// ─── Types ───────────────────────────────────────────────────────────────────

interface PortraitRow {
  size: string
  filename: string
  notes: string
}

interface AdditionalPhotoRow {
  size: string
  filename: string
  notes: string
}

const PORTRAIT_SIZES = ['11x14', '16x20', '20x24', '24x30']
const ADDITIONAL_SIZES = ['5x7', '8x10', '11x14', '16x20', '20x24', '24x30']
const ADDITIONAL_SIZES_PRICED = [
  { value: '5x7', label: '5x7 — $15' },
  { value: '8x10', label: '8x10 — $30' },
  { value: '11x14', label: '11x14 — $100' },
  { value: '16x20', label: '16x20 — $195' },
  { value: '20x24', label: '20x24 — $249' },
  { value: '24x30', label: '24x30 — $295' },
]

// ─── Component ───────────────────────────────────────────────────────────────

export default function PhotoOrderPublicPage() {
  const [step, setStep] = useState(1)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Step 1 — Info
  const [brideName, setBrideName] = useState('')
  const [groomName, setGroomName] = useState('')
  const [month, setMonth] = useState('')
  const [day, setDay] = useState('')
  const [year, setYear] = useState('')
  const [email, setEmail] = useState('')

  // Step 2 — Photo order
  const [hasWeddingAlbum, setHasWeddingAlbum] = useState<'yes' | 'no' | 'not_sure' | ''>('')
  const [designPref, setDesignPref] = useState<'omakase' | 'custom' | ''>('')
  const [coverPhoto, setCoverPhoto] = useState('')
  const [mainAlbumPhotos, setMainAlbumPhotos] = useState('')
  const [numParentAlbums, setNumParentAlbums] = useState(0)
  const [parentAlbumPhotos, setParentAlbumPhotos] = useState<string[]>(['', '', '', ''])
  // Parent Portraits
  const [hasParentPortraits, setHasParentPortraits] = useState<boolean | null>(null)
  const [numParentPortraits, setNumParentPortraits] = useState(1)
  const [parentPortraitCanvas, setParentPortraitCanvas] = useState<boolean | null>(null)
  const [parentPortraitRows, setParentPortraitRows] = useState<PortraitRow[]>([
    { size: '16x20', filename: '', notes: '' },
    { size: '16x20', filename: '', notes: '' },
    { size: '16x20', filename: '', notes: '' },
    { size: '16x20', filename: '', notes: '' },
  ])
  // B&G Portrait
  const [hasBGPortrait, setHasBGPortrait] = useState<boolean | null>(null)
  const [bgPortraitSize, setBGPortraitSize] = useState('24x30')
  const [bgPortraitFilename, setBGPortraitFilename] = useState('')
  const [bgPortraitNotes, setBGPortraitNotes] = useState('')
  const [bgPortraitCanvas, setBGPortraitCanvas] = useState<boolean | null>(null)
  const [bgPortraitPurchased, setBGPortraitPurchased] = useState(false)
  // Thank You Cards
  const [hasTYC, setHasTYC] = useState<'yes' | 'no' | 'add' | ''>('')
  const [tycQty, setTycQty] = useState<number>(0)
  const [tycNotes, setTycNotes] = useState('')
  // Additional Photos
  const [hasAdditionalPhotos, setHasAdditionalPhotos] = useState<boolean | null>(null)
  const [wantToOrderPhotos, setWantToOrderPhotos] = useState<boolean | null>(null)
  const [additionalPhotoRows, setAdditionalPhotoRows] = useState<AdditionalPhotoRow[]>([])
  // Special Instructions
  const [specialInstructions, setSpecialInstructions] = useState('')

  // ─── Derived ─────────────────────────────────────────────────────────────

  const weddingDateStr = month && day && year ? `${year}-${month}-${day}` : ''
  const step1Valid = brideName.trim() && groomName.trim() && weddingDateStr && email.trim()

  // ─── Handlers ──────────────────────────────────────────────────────────────

  function handleContinue() {
    if (!step1Valid) return
    setStep(2)
  }

  function addAdditionalPhotoRow() {
    setAdditionalPhotoRows(prev => [...prev, { size: '8x10', filename: '', notes: '' }])
  }

  function removeAdditionalPhotoRow(index: number) {
    setAdditionalPhotoRows(prev => prev.filter((_, i) => i !== index))
  }

  function updateParentPhotos(index: number, value: string) {
    setParentAlbumPhotos(prev => {
      const updated = [...prev]
      updated[index] = value
      return updated
    })
  }

  async function handleSubmit() {
    setError(null)
    setLoading(true)
    try {
      const res = await fetch('/api/client/photo-order-public', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bride_name: brideName.trim(),
          groom_name: groomName.trim(),
          wedding_date: weddingDateStr,
          email: email.trim(),
          has_wedding_album: hasWeddingAlbum || null,
          album_design_preference: hasWeddingAlbum === 'yes' ? designPref || null : null,
          cover_photo_filename: hasWeddingAlbum === 'yes' ? coverPhoto || null : null,
          main_album_photos: hasWeddingAlbum === 'yes' && designPref === 'custom' ? mainAlbumPhotos || null : null,
          num_parent_albums: numParentAlbums,
          parent_album_1_photos: numParentAlbums >= 1 ? parentAlbumPhotos[0] || null : null,
          parent_album_2_photos: numParentAlbums >= 2 ? parentAlbumPhotos[1] || null : null,
          parent_album_3_photos: numParentAlbums >= 3 ? parentAlbumPhotos[2] || null : null,
          parent_album_4_photos: numParentAlbums >= 4 ? parentAlbumPhotos[3] || null : null,
          portrait_prints: (() => {
            const prints: { size: string; qty: number; filename: string; notes: string | null; type: string }[] = []
            if (hasParentPortraits && numParentPortraits > 0) {
              for (let i = 0; i < numParentPortraits; i++) {
                const r = parentPortraitRows[i]
                if (r.filename) prints.push({ size: r.size, qty: 1, filename: r.filename, notes: [r.notes, parentPortraitCanvas ? 'Canvas upgrade' : null].filter(Boolean).join('. ') || null, type: 'parent_portrait' })
              }
            }
            if (hasBGPortrait && !bgPortraitPurchased && bgPortraitFilename) {
              prints.push({ size: bgPortraitSize, qty: 1, filename: bgPortraitFilename, notes: [bgPortraitNotes, bgPortraitCanvas ? 'Canvas upgrade' : null].filter(Boolean).join('. ') || null, type: 'bg_portrait' })
            }
            if (additionalPhotoRows.length > 0) {
              for (const r of additionalPhotoRows) {
                if (r.filename) prints.push({ size: r.size, qty: 1, filename: r.filename, notes: r.notes || null, type: 'additional' })
              }
            }
            return prints.length > 0 ? prints : null
          })(),
          thank_you_cards: hasTYC === 'yes' || hasTYC === 'add',
          thank_you_cards_qty: (hasTYC === 'yes' || hasTYC === 'add') ? tycQty || null : null,
          canvas_upgrade_notes: [parentPortraitCanvas ? 'Canvas upgrade for parent portraits' : null, bgPortraitCanvas ? 'Canvas upgrade for B&G portrait' : null, bgPortraitPurchased ? 'B&G portrait already purchased at frame & album appointment' : null].filter(Boolean).join('. ') || null,
          special_instructions: specialInstructions || null,
        }),
      })
      const json = await res.json()
      if (!res.ok) {
        setError(json.error || 'Something went wrong')
        return
      }
      setStep(3)
    } catch {
      setError('Network error. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  // ─── Progress Bar ──────────────────────────────────────────────────────────

  function ProgressBar() {
    const steps = ['Your Info', 'Photo Order', 'Done']
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
                      ? 'bg-[#4a7c9b] text-white'
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

  // ─── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#f5f0e8', color: '#333' }}>
      {/* Header */}
      <div className="border-b" style={{ backgroundColor: '#fff' }}>
        <div className="max-w-2xl mx-auto px-4 py-4 flex items-center gap-2">
          <Camera className="w-6 h-6 text-[#4a7c9b]" />
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

        {/* ═══ STEP 1: Contact Info ════════════════════════════════════ */}
        {step === 1 && (
          <div className="rounded-xl border p-6 shadow-sm" style={{ backgroundColor: '#fff' }}>
            <div className="text-center mb-6">
              <Camera className="w-10 h-10 text-[#4a7c9b] mx-auto mb-3" />
              <h1 className="text-2xl font-bold">Photo Order Form</h1>
              <p className="text-muted-foreground mt-1">Tell us about your wedding</p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Bride&apos;s First Name</label>
                <input type="text" placeholder="e.g. Sarah" value={brideName} onChange={(e) => setBrideName(e.target.value)} />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Groom&apos;s First Name</label>
                <input type="text" placeholder="e.g. James" value={groomName} onChange={(e) => setGroomName(e.target.value)} />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Wedding Date</label>
                <div className="grid grid-cols-3 gap-2">
                  <select value={month} onChange={(e) => {
                    const m = e.target.value; setMonth(m)
                    if (day && m && year) { const max = new Date(parseInt(year), parseInt(m), 0).getDate(); if (parseInt(day) > max) setDay('') }
                  }}>
                    <option value="">Month</option>
                    <option value="01">January</option><option value="02">February</option><option value="03">March</option>
                    <option value="04">April</option><option value="05">May</option><option value="06">June</option>
                    <option value="07">July</option><option value="08">August</option><option value="09">September</option>
                    <option value="10">October</option><option value="11">November</option><option value="12">December</option>
                  </select>
                  <select value={day} onChange={(e) => setDay(e.target.value)}>
                    <option value="">Day</option>
                    {[...Array(31)].map((_, i) => <option key={i + 1} value={String(i + 1).padStart(2, '0')}>{i + 1}</option>)}
                  </select>
                  <select value={year} onChange={(e) => {
                    const y = e.target.value; setYear(y)
                    if (day && month && y) { const max = new Date(parseInt(y), parseInt(month), 0).getDate(); if (parseInt(day) > max) setDay('') }
                  }}>
                    <option value="">Year</option>
                    <option value="2024">2024</option><option value="2025">2025</option>
                    <option value="2026">2026</option><option value="2027">2027</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Email Address</label>
                <input type="email" placeholder="your@email.com" value={email} onChange={(e) => setEmail(e.target.value)} />
              </div>

              <button
                onClick={handleContinue}
                disabled={!step1Valid}
                className="w-full bg-[#4a7c9b] hover:bg-[#3d6a85] disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium py-3 px-4 rounded-lg transition-colors flex items-center justify-center gap-2"
              >
                <ChevronRight className="w-4 h-4" />
                Continue
              </button>
            </div>
          </div>
        )}

        {/* ═══ STEP 2: Photo Order Form ════════════════════════════════ */}
        {step === 2 && (
          <div className="space-y-6">
            {/* Instructions */}
            <div className="bg-muted border border-border rounded-lg px-4 py-3 text-sm">
              Before completing this form, please review your package details to ensure accuracy. If you have any questions about what&apos;s included, Marianna is happy to help at{' '}
              <a href="tel:4168318942" className="font-medium underline text-[#4a7c9b]">416-831-8942</a>.
            </div>

            {/* ── Wedding Album ────────────────────────────────────────── */}
            <div className="rounded-xl border p-6 shadow-sm" style={{ backgroundColor: '#fff' }}>
              <h2 className="text-lg font-semibold mb-1 flex items-center gap-2">
                <span>📷</span> Wedding Album
              </h2>
              <p className="text-xs text-muted-foreground mb-4">
                Not everyone has a wedding album in their package. If you&apos;d like to add one, contact Marianna at{' '}
                <a href="tel:4168318942" className="underline text-[#4a7c9b]">416-831-8942</a> to discuss options.
              </p>

              <div className="space-y-3 mb-4">
                <p className="text-sm font-medium">Do you have a wedding album in your package?</p>
                {(['yes', 'no', 'not_sure'] as const).map(val => (
                  <label key={val} className="flex items-center gap-3 p-3 rounded-lg border cursor-pointer hover:bg-muted transition-colors">
                    <input type="radio" name="hasAlbum" checked={hasWeddingAlbum === val} onChange={() => setHasWeddingAlbum(val)} className="w-4 h-4 accent-[#4a7c9b]" />
                    <span className="text-sm font-medium">
                      {val === 'yes' ? 'Yes' : val === 'no' ? 'No' : 'Not sure — contact Marianna'}
                    </span>
                  </label>
                ))}
              </div>

              {hasWeddingAlbum === 'yes' && (
                <div className="space-y-4 border-t pt-4">
                  {/* Design Preference */}
                  <div>
                    <p className="text-sm font-medium mb-2">Album Design Preference</p>
                    <div className="space-y-2">
                      <label className="flex items-start gap-3 p-3 rounded-lg border cursor-pointer hover:bg-muted transition-colors">
                        <input type="radio" name="designPref" checked={designPref === 'omakase'} onChange={() => setDesignPref('omakase')} className="mt-0.5 w-4 h-4 accent-[#4a7c9b]" />
                        <div>
                          <span className="text-sm font-medium">Omakase</span>
                          <p className="text-xs text-muted-foreground">Jean selects photos, you review the design</p>
                        </div>
                      </label>
                      <label className="flex items-start gap-3 p-3 rounded-lg border cursor-pointer hover:bg-muted transition-colors">
                        <input type="radio" name="designPref" checked={designPref === 'custom'} onChange={() => setDesignPref('custom')} className="mt-0.5 w-4 h-4 accent-[#4a7c9b]" />
                        <div>
                          <span className="text-sm font-medium">Custom</span>
                          <p className="text-xs text-muted-foreground">You select photos, Jean designs the album</p>
                        </div>
                      </label>
                    </div>
                  </div>

                  {/* Cover Photo */}
                  <div>
                    <label className="block text-sm font-medium mb-1">Cover Photo</label>
                    <p className="text-xs text-muted-foreground mb-2">Select a horizontal photo for your album cover</p>
                    <input type="text" value={coverPhoto} onChange={(e) => setCoverPhoto(e.target.value)} placeholder="e.g. Amanda_KyleWEDPROOFS_-732" />
                  </div>

                  {/* Main Album Photos (Custom only) */}
                  {designPref === 'custom' && (
                    <div>
                      <h3 className="text-sm font-medium mb-1">Your Wedding Album — Select 70 photos</h3>
                      <p className="text-xs text-muted-foreground mb-2">Enter filenames, one per line or comma-separated</p>
                      <textarea
                        value={mainAlbumPhotos}
                        onChange={(e) => setMainAlbumPhotos(e.target.value)}
                        placeholder="Enter filenames..."
                        rows={4}
                        className="w-full"
                      />
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* ── Parent Albums ─────────────────────────────────────────── */}
            <div className="rounded-xl border p-6 shadow-sm" style={{ backgroundColor: '#fff' }}>
              <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
                <span>📷</span> Parent Albums
              </h2>

              <div className="mb-4">
                <label className="block text-sm font-medium mb-1">Number of Parent Albums</label>
                <select value={numParentAlbums} onChange={(e) => setNumParentAlbums(parseInt(e.target.value))}>
                  <option value={0}>0</option>
                  <option value={1}>1</option>
                  <option value={2}>2</option>
                  <option value={3}>3</option>
                  <option value={4}>4</option>
                </select>
              </div>

              {numParentAlbums > 0 && (
                <div className="space-y-4">
                  {[...Array(numParentAlbums)].map((_, i) => (
                    <div key={i}>
                      <h3 className="text-sm font-medium mb-1">Parent Album {i + 1} — Select 30 photos</h3>
                      <p className="text-xs text-muted-foreground mb-2">Enter filenames, one per line or comma-separated</p>
                      <textarea
                        value={parentAlbumPhotos[i]}
                        onChange={(e) => updateParentPhotos(i, e.target.value)}
                        placeholder="Enter filenames..."
                        rows={3}
                        className="w-full"
                      />
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* ── Parent Portraits ──────────────────────────────────────── */}
            <div className="rounded-xl border p-6 shadow-sm" style={{ backgroundColor: '#fff' }}>
              <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
                <span>🖼️</span> Parent Portraits
              </h2>
              <p className="text-sm font-medium mb-2">Do you have parent portraits in your package?</p>
              <div className="space-y-2 mb-4">
                <label className="flex items-center gap-3 p-3 rounded-lg border cursor-pointer hover:bg-muted transition-colors">
                  <input type="radio" name="hasParentPortraits" checked={hasParentPortraits === true} onChange={() => setHasParentPortraits(true)} className="w-4 h-4 accent-[#4a7c9b]" />
                  <span className="text-sm font-medium">Yes</span>
                </label>
                <label className="flex items-center gap-3 p-3 rounded-lg border cursor-pointer hover:bg-muted transition-colors">
                  <input type="radio" name="hasParentPortraits" checked={hasParentPortraits === false} onChange={() => setHasParentPortraits(false)} className="w-4 h-4 accent-[#4a7c9b]" />
                  <span className="text-sm font-medium">No</span>
                </label>
              </div>

              {hasParentPortraits && (
                <div className="space-y-4 border-t pt-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">How many parent portraits?</label>
                    <select value={numParentPortraits} onChange={(e) => setNumParentPortraits(parseInt(e.target.value))}>
                      <option value={1}>1</option>
                      <option value={2}>2</option>
                      <option value={3}>3</option>
                      <option value={4}>4</option>
                    </select>
                  </div>

                  <div>
                    <p className="text-sm font-medium mb-2">Do you want to upgrade to canvas? (+$100 each)</p>
                    <div className="space-y-2">
                      <label className="flex items-center gap-3 p-3 rounded-lg border cursor-pointer hover:bg-muted transition-colors">
                        <input type="radio" name="canvasUpgrade" checked={parentPortraitCanvas === true} onChange={() => setParentPortraitCanvas(true)} className="w-4 h-4 accent-[#4a7c9b]" />
                        <span className="text-sm font-medium">Yes</span>
                      </label>
                      <label className="flex items-center gap-3 p-3 rounded-lg border cursor-pointer hover:bg-muted transition-colors">
                        <input type="radio" name="canvasUpgrade" checked={parentPortraitCanvas === false} onChange={() => setParentPortraitCanvas(false)} className="w-4 h-4 accent-[#4a7c9b]" />
                        <span className="text-sm font-medium">No</span>
                      </label>
                    </div>
                  </div>

                  {[...Array(numParentPortraits)].map((_, i) => (
                    <div key={i} className="border rounded-lg p-3 space-y-2">
                      <span className="text-sm font-medium">Parent Portrait {i + 1}</span>
                      <div>
                        <label className="block text-xs text-muted-foreground mb-1">Size</label>
                        <select value={parentPortraitRows[i].size} onChange={(e) => setParentPortraitRows(prev => prev.map((r, idx) => idx === i ? { ...r, size: e.target.value } : r))} className="text-sm">
                          {PORTRAIT_SIZES.map(s => <option key={s} value={s}>{s}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs text-muted-foreground mb-1">Filename</label>
                        <input type="text" value={parentPortraitRows[i].filename} onChange={(e) => setParentPortraitRows(prev => prev.map((r, idx) => idx === i ? { ...r, filename: e.target.value } : r))} placeholder="e.g. Amanda_KyleWEDPROOFS_-732" className="text-sm" />
                      </div>
                      <div>
                        <label className="block text-xs text-muted-foreground mb-1">Notes (optional)</label>
                        <input type="text" value={parentPortraitRows[i].notes} onChange={(e) => setParentPortraitRows(prev => prev.map((r, idx) => idx === i ? { ...r, notes: e.target.value } : r))} placeholder="Special instructions..." className="text-sm" />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* ── Bride & Groom Portrait ────────────────────────────────── */}
            <div className="rounded-xl border p-6 shadow-sm" style={{ backgroundColor: '#fff' }}>
              <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
                <span>🖼️</span> Bride &amp; Groom Portrait
              </h2>
              <p className="text-sm font-medium mb-2">Do you have a Bride &amp; Groom portrait in your package?</p>
              <div className="space-y-2 mb-4">
                <label className="flex items-center gap-3 p-3 rounded-lg border cursor-pointer hover:bg-muted transition-colors">
                  <input type="radio" name="hasBGPortrait" checked={hasBGPortrait === true} onChange={() => setHasBGPortrait(true)} className="w-4 h-4 accent-[#4a7c9b]" />
                  <span className="text-sm font-medium">Yes</span>
                </label>
                <label className="flex items-center gap-3 p-3 rounded-lg border cursor-pointer hover:bg-muted transition-colors">
                  <input type="radio" name="hasBGPortrait" checked={hasBGPortrait === false} onChange={() => setHasBGPortrait(false)} className="w-4 h-4 accent-[#4a7c9b]" />
                  <span className="text-sm font-medium">No</span>
                </label>
              </div>

              {hasBGPortrait && (
                <div className="space-y-4 border-t pt-4">
                  {!bgPortraitPurchased && (
                    <>
                      <div>
                        <p className="text-sm font-medium mb-2">Do you want to upgrade to canvas? (+$100 each)</p>
                        <div className="space-y-2">
                          <label className="flex items-center gap-3 p-3 rounded-lg border cursor-pointer hover:bg-muted transition-colors">
                            <input type="radio" name="bgCanvasUpgrade" checked={bgPortraitCanvas === true} onChange={() => setBGPortraitCanvas(true)} className="w-4 h-4 accent-[#4a7c9b]" />
                            <span className="text-sm font-medium">Yes</span>
                          </label>
                          <label className="flex items-center gap-3 p-3 rounded-lg border cursor-pointer hover:bg-muted transition-colors">
                            <input type="radio" name="bgCanvasUpgrade" checked={bgPortraitCanvas === false} onChange={() => setBGPortraitCanvas(false)} className="w-4 h-4 accent-[#4a7c9b]" />
                            <span className="text-sm font-medium">No</span>
                          </label>
                        </div>
                      </div>
                      <div>
                        <label className="block text-xs text-muted-foreground mb-1">Size</label>
                        <select value={bgPortraitSize} onChange={(e) => setBGPortraitSize(e.target.value)} className="text-sm">
                          {PORTRAIT_SIZES.map(s => <option key={s} value={s}>{s}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs text-muted-foreground mb-1">Filename</label>
                        <input type="text" value={bgPortraitFilename} onChange={(e) => setBGPortraitFilename(e.target.value)} placeholder="e.g. Amanda_KyleWEDPROOFS_-732" className="text-sm" />
                      </div>
                      <div>
                        <label className="block text-xs text-muted-foreground mb-1">Notes (optional)</label>
                        <input type="text" value={bgPortraitNotes} onChange={(e) => setBGPortraitNotes(e.target.value)} placeholder="Special instructions..." className="text-sm" />
                      </div>
                    </>
                  )}

                  <label className="flex items-center gap-3 cursor-pointer">
                    <input type="checkbox" checked={bgPortraitPurchased} onChange={(e) => setBGPortraitPurchased(e.target.checked)} className="w-4 h-4 accent-[#4a7c9b] rounded" />
                    <span className="text-sm font-medium">Already purchased with frame &amp; album appointment</span>
                  </label>
                </div>
              )}
            </div>

            {/* ── Thank You Cards ───────────────────────────────────────── */}
            <div className="rounded-xl border p-6 shadow-sm" style={{ backgroundColor: '#fff' }}>
              <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
                <span>💌</span> Thank You Cards
              </h2>
              <p className="text-sm font-medium mb-2">Do you have Thank You cards in your package?</p>
              <div className="space-y-2 mb-4">
                <label className="flex items-center gap-3 p-3 rounded-lg border cursor-pointer hover:bg-muted transition-colors">
                  <input type="radio" name="hasTYC" checked={hasTYC === 'yes'} onChange={() => setHasTYC('yes')} className="w-4 h-4 accent-[#4a7c9b]" />
                  <span className="text-sm font-medium">Yes</span>
                </label>
                <label className="flex items-center gap-3 p-3 rounded-lg border cursor-pointer hover:bg-muted transition-colors">
                  <input type="radio" name="hasTYC" checked={hasTYC === 'no'} onChange={() => setHasTYC('no')} className="w-4 h-4 accent-[#4a7c9b]" />
                  <span className="text-sm font-medium">No</span>
                </label>
                <label className="flex items-center gap-3 p-3 rounded-lg border cursor-pointer hover:bg-muted transition-colors">
                  <input type="radio" name="hasTYC" checked={hasTYC === 'add'} onChange={() => setHasTYC('add')} className="w-4 h-4 accent-[#4a7c9b]" />
                  <span className="text-sm font-medium">No, but I&apos;d like to add some</span>
                </label>
              </div>
              {hasTYC === 'add' && (
                <div className="bg-muted border border-border rounded-lg px-4 py-3 text-sm mb-4">
                  Thank You cards are $5 each and include envelope.
                </div>
              )}
              {(hasTYC === 'yes' || hasTYC === 'add') && (
                <div className="space-y-2 border-t pt-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">Quantity</label>
                    <input type="number" min={1} value={tycQty || ''} onChange={(e) => setTycQty(parseInt(e.target.value) || 0)} placeholder="e.g. 50" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Notes (optional)</label>
                    <input type="text" value={tycNotes} onChange={(e) => setTycNotes(e.target.value)} placeholder="Any preferences for the cards..." className="text-sm" />
                  </div>
                </div>
              )}
            </div>

            {/* ── Additional Photos ─────────────────────────────────────── */}
            <div className="rounded-xl border p-6 shadow-sm" style={{ backgroundColor: '#fff' }}>
              <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
                <span>📸</span> Additional Photos
              </h2>
              <p className="text-sm font-medium mb-2">Do you have any additional photos in your package?</p>
              <div className="space-y-2 mb-4">
                <label className="flex items-center gap-3 p-3 rounded-lg border cursor-pointer hover:bg-muted transition-colors">
                  <input type="radio" name="hasAdditional" checked={hasAdditionalPhotos === true} onChange={() => { setHasAdditionalPhotos(true); if (additionalPhotoRows.length === 0) addAdditionalPhotoRow() }} className="w-4 h-4 accent-[#4a7c9b]" />
                  <span className="text-sm font-medium">Yes</span>
                </label>
                <label className="flex items-center gap-3 p-3 rounded-lg border cursor-pointer hover:bg-muted transition-colors">
                  <input type="radio" name="hasAdditional" checked={hasAdditionalPhotos === false} onChange={() => setHasAdditionalPhotos(false)} className="w-4 h-4 accent-[#4a7c9b]" />
                  <span className="text-sm font-medium">No</span>
                </label>
              </div>

              {hasAdditionalPhotos === true && (
                <div className="space-y-4 border-t pt-4">
                  {additionalPhotoRows.map((row, i) => (
                    <div key={i} className="border rounded-lg p-3 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">Photo {i + 1}</span>
                        <button type="button" onClick={() => removeAdditionalPhotoRow(i)} className="text-red-500 hover:text-red-700 transition-colors">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                      <div>
                        <label className="block text-xs text-muted-foreground mb-1">Size</label>
                        <select value={row.size} onChange={(e) => setAdditionalPhotoRows(prev => prev.map((r, idx) => idx === i ? { ...r, size: e.target.value } : r))} className="text-sm">
                          {ADDITIONAL_SIZES.map(s => <option key={s} value={s}>{s}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs text-muted-foreground mb-1">Filename</label>
                        <input type="text" value={row.filename} onChange={(e) => setAdditionalPhotoRows(prev => prev.map((r, idx) => idx === i ? { ...r, filename: e.target.value } : r))} placeholder="e.g. Amanda_KyleWEDPROOFS_-732" className="text-sm" />
                      </div>
                      <div>
                        <label className="block text-xs text-muted-foreground mb-1">Notes (optional)</label>
                        <input type="text" value={row.notes} onChange={(e) => setAdditionalPhotoRows(prev => prev.map((r, idx) => idx === i ? { ...r, notes: e.target.value } : r))} placeholder="Special instructions..." className="text-sm" />
                      </div>
                    </div>
                  ))}
                  <button type="button" onClick={addAdditionalPhotoRow} className="flex items-center gap-2 text-sm font-medium text-[#4a7c9b] hover:text-[#3d6a85] transition-colors">
                    <Plus className="w-4 h-4" />
                    Add Another Photo
                  </button>
                </div>
              )}

              {hasAdditionalPhotos === false && (
                <div className="border-t pt-4">
                  <p className="text-sm text-muted-foreground mb-2">Would you like to order some? Marianna will confirm pricing.</p>
                  <div className="space-y-2 mb-4">
                    <label className="flex items-center gap-3 p-3 rounded-lg border cursor-pointer hover:bg-muted transition-colors">
                      <input type="radio" name="wantToOrder" checked={wantToOrderPhotos === true} onChange={() => { setWantToOrderPhotos(true); if (additionalPhotoRows.length === 0) addAdditionalPhotoRow() }} className="w-4 h-4 accent-[#4a7c9b]" />
                      <span className="text-sm font-medium">Yes</span>
                    </label>
                    <label className="flex items-center gap-3 p-3 rounded-lg border cursor-pointer hover:bg-muted transition-colors">
                      <input type="radio" name="wantToOrder" checked={wantToOrderPhotos === false} onChange={() => setWantToOrderPhotos(false)} className="w-4 h-4 accent-[#4a7c9b]" />
                      <span className="text-sm font-medium">No</span>
                    </label>
                  </div>
                  {wantToOrderPhotos && (
                    <div className="space-y-4">
                      {additionalPhotoRows.map((row, i) => (
                        <div key={i} className="border rounded-lg p-3 space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-medium">Photo {i + 1}</span>
                            <button type="button" onClick={() => removeAdditionalPhotoRow(i)} className="text-red-500 hover:text-red-700 transition-colors">
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                          <div>
                            <label className="block text-xs text-muted-foreground mb-1">Size</label>
                            <select value={row.size} onChange={(e) => setAdditionalPhotoRows(prev => prev.map((r, idx) => idx === i ? { ...r, size: e.target.value } : r))} className="text-sm">
                              {ADDITIONAL_SIZES_PRICED.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                            </select>
                          </div>
                          <div>
                            <label className="block text-xs text-muted-foreground mb-1">Filename</label>
                            <input type="text" value={row.filename} onChange={(e) => setAdditionalPhotoRows(prev => prev.map((r, idx) => idx === i ? { ...r, filename: e.target.value } : r))} placeholder="e.g. Amanda_KyleWEDPROOFS_-732" className="text-sm" />
                          </div>
                          <div>
                            <label className="block text-xs text-muted-foreground mb-1">Notes (optional)</label>
                            <input type="text" value={row.notes} onChange={(e) => setAdditionalPhotoRows(prev => prev.map((r, idx) => idx === i ? { ...r, notes: e.target.value } : r))} placeholder="Special instructions..." className="text-sm" />
                          </div>
                        </div>
                      ))}
                      <button type="button" onClick={addAdditionalPhotoRow} className="flex items-center gap-2 text-sm font-medium text-[#4a7c9b] hover:text-[#3d6a85] transition-colors">
                        <Plus className="w-4 h-4" />
                        Add Another Photo
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* ── Special Instructions ──────────────────────────────────── */}
            <div className="rounded-xl border p-6 shadow-sm" style={{ backgroundColor: '#fff' }}>
              <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
                <span>📝</span> Special Instructions
              </h2>
              <textarea
                value={specialInstructions}
                onChange={(e) => setSpecialInstructions(e.target.value)}
                placeholder="Any other instructions or notes..."
                rows={3}
                className="w-full"
              />
            </div>

            {/* Pre-submit note */}
            <div className="bg-muted border border-border rounded-lg px-4 py-3 text-sm">
              Once submitted, Jean will personally review your selections and confirm all details before we begin. If you have any questions or need to make changes, reach out to us at{' '}
              <a href="mailto:info@sigsphoto.ca" className="font-medium underline text-[#4a7c9b]">info@sigsphoto.ca</a> or call{' '}
              <a href="tel:4168318942" className="font-medium underline text-[#4a7c9b]">416-831-8942</a> — we&apos;re here to help.
            </div>

            {/* Submit */}
            <button
              onClick={handleSubmit}
              disabled={loading}
              className="w-full bg-[#4a7c9b] hover:bg-[#3d6a85] disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold py-4 px-6 rounded-xl transition-colors flex items-center justify-center gap-2 text-lg"
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

        {/* ═══ STEP 3: Done ════════════════════════════════════════════ */}
        {step === 3 && (
          <div className="rounded-xl border p-8 shadow-sm text-center" style={{ backgroundColor: '#fff' }}>
            <CheckCircle className="w-16 h-16 text-[#4a7c9b] mx-auto mb-4" />
            <h1 className="text-2xl font-bold mb-2">Photo Order Submitted!</h1>
            <p className="text-muted-foreground mb-6 max-w-md mx-auto">
              Your photo order has been submitted! Marianna will review and confirm your order details before processing.
            </p>
            <div className="bg-muted rounded-lg p-4 text-left max-w-sm mx-auto">
              <h3 className="text-sm font-semibold mb-2">What happens next?</h3>
              <ul className="space-y-1.5 text-sm text-muted-foreground">
                <li>1. Marianna will review your order details</li>
                <li>2. She&apos;ll confirm sizes and any upgrades</li>
                <li>3. Jean will begin designing your albums</li>
                <li>4. You&apos;ll receive a proof for review</li>
              </ul>
            </div>
            <div className="mt-6 flex items-center justify-center gap-2 text-sm text-muted-foreground">
              <Mail className="w-4 h-4" />
              <span>Questions? Contact us at info@sigsphoto.ca or call <a href="tel:4168318942" className="underline">416-831-8942</a></span>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
