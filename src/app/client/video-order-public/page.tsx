'use client'

import { useState } from 'react'
import { CheckCircle, ChevronRight, Loader2, Mail, Video } from 'lucide-react'

// ─── Types ───────────────────────────────────────────────────────────────────

type SongPlacement = 'groom' | 'bride' | 'first_look' | 'park' | 'pre_ceremony' | 'after_ceremony' | 'pre_reception' | 'other' | 'no_preference'
type RecapStyle = 'short' | 'longer'

const PLACEMENT_OPTIONS: { value: SongPlacement; label: string }[] = [
  { value: 'groom', label: 'Groom' },
  { value: 'bride', label: 'Bride' },
  { value: 'first_look', label: 'First Look' },
  { value: 'park', label: 'Park' },
  { value: 'pre_ceremony', label: 'Pre-Ceremony' },
  { value: 'after_ceremony', label: 'After Ceremony' },
  { value: 'pre_reception', label: 'Pre-Reception' },
  { value: 'other', label: 'Other' },
  { value: 'no_preference', label: 'No preference' },
]

// ─── Component ───────────────────────────────────────────────────────────────

export default function VideoOrderPublicPage() {
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

  // Step 2 — Video preferences
  const [letJeanChoose, setLetJeanChoose] = useState(false)
  const [songs, setSongs] = useState<string[]>(Array(7).fill(''))
  const [songPlacements, setSongPlacements] = useState<SongPlacement[]>(Array(7).fill('no_preference'))
  const [mustHaveMoments, setMustHaveMoments] = useState('')
  const [recapStyle, setRecapStyle] = useState<RecapStyle | ''>('')
  const [includeVows, setIncludeVows] = useState<boolean | null>(null)

  // ─── Derived ─────────────────────────────────────────────────────────────

  const weddingDateStr = month && day && year ? `${year}-${month}-${day}` : ''
  const step1Valid = brideName.trim() && groomName.trim() && weddingDateStr && email.trim()

  // ─── Step 1 → 2 ───────────────────────────────────────────────────────────

  function handleContinue() {
    if (!step1Valid) return
    setStep(2)
  }

  // ─── Step 2: Submit ────────────────────────────────────────────────────────

  async function handleSubmit() {
    setError(null)
    setLoading(true)
    try {
      const filledSongs = letJeanChoose ? [] : songs.map((s, i) => ({
        song: s || null,
        placement: songPlacements[i],
      })).filter(s => s.song)

      const res = await fetch('/api/client/video-order-public', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bride_name: brideName.trim(),
          groom_name: groomName.trim(),
          wedding_date: weddingDateStr,
          email: email.trim(),
          let_jean_choose_music: letJeanChoose,
          songs: filledSongs.length > 0 ? filledSongs : null,
          song_placements: filledSongs.length > 0 ? filledSongs.map(s => s.placement) : null,
          must_have_moments: mustHaveMoments || null,
          recap_style: recapStyle || null,
          include_vows: includeVows,
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
    const steps = ['Your Info', 'Video Order', 'Done']
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

  // ─── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b bg-card">
        <div className="max-w-2xl mx-auto px-4 py-4 flex items-center gap-2">
          <Video className="w-6 h-6 text-teal-600" />
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

        {/* ═══ STEP 1: Your Info ═══════════════════════════════════════ */}
        {step === 1 && (
          <div className="bg-card rounded-xl border p-6 shadow-sm">
            <div className="text-center mb-6">
              <Video className="w-10 h-10 text-teal-600 mx-auto mb-3" />
              <h1 className="text-2xl font-bold text-foreground">Video Order Form</h1>
              <p className="text-muted-foreground mt-1">Tell us about your wedding</p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">
                  Bride&apos;s First Name
                </label>
                <input
                  type="text"
                  placeholder="e.g. Sarah"
                  value={brideName}
                  onChange={(e) => setBrideName(e.target.value)}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-1">
                  Groom&apos;s First Name
                </label>
                <input
                  type="text"
                  placeholder="e.g. James"
                  value={groomName}
                  onChange={(e) => setGroomName(e.target.value)}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-1">
                  Wedding Date
                </label>
                <div className="grid grid-cols-3 gap-2">
                  <select
                    value={month}
                    onChange={(e) => {
                      const newMonth = e.target.value
                      setMonth(newMonth)
                      if (day && newMonth && year) {
                        const max = new Date(parseInt(year), parseInt(newMonth), 0).getDate()
                        if (parseInt(day) > max) setDay('')
                      }
                    }}
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
                    onChange={(e) => {
                      const newYear = e.target.value
                      setYear(newYear)
                      if (day && month && newYear) {
                        const max = new Date(parseInt(newYear), parseInt(month), 0).getDate()
                        if (parseInt(day) > max) setDay('')
                      }
                    }}
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
                onClick={handleContinue}
                disabled={!step1Valid}
                className="w-full bg-teal-600 hover:bg-teal-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium py-3 px-4 rounded-lg transition-colors flex items-center justify-center gap-2"
              >
                <ChevronRight className="w-4 h-4" />
                Continue
              </button>
            </div>
          </div>
        )}

        {/* ═══ STEP 2: Video Order Form ════════════════════════════════ */}
        {step === 2 && (
          <div className="space-y-6">
            {/* Instructions */}
            <div className="bg-teal-50 border border-teal-200 rounded-lg px-4 py-3 text-sm text-teal-800 space-y-2">
              <p className="font-medium">Here&apos;s how to get your full-length wedding video and 8-11 minute highlight reel:</p>
              <ol className="list-decimal list-inside space-y-1">
                <li>Fill out the form below with your must-have moments and music ideas.</li>
                <li>We&apos;ll create your full-length video (up to 2hrs).</li>
                <li>Watch the full video and email us your feedback on what to keep or tweak.</li>
                <li>Email us the title and artist of a song or two for your 8-11 minute highlight reel — unless you can tell us below!</li>
              </ol>
              <p>Once we have your input, we&apos;ll finalize both videos with polished edits and send you digital files plus a shareable link.</p>
            </div>

            {/* Songs */}
            <div className="bg-card rounded-xl border p-6 shadow-sm">
              <h2 className="text-lg font-semibold text-foreground mb-1">List up to 7 songs</h2>
              <p className="text-xs text-muted-foreground mb-4">YouTube links preferred. We may not use all songs.</p>

              <label className="flex items-center gap-3 cursor-pointer mb-4">
                <input
                  type="checkbox"
                  checked={letJeanChoose}
                  onChange={(e) => setLetJeanChoose(e.target.checked)}
                  className="w-4 h-4 accent-teal-600 rounded"
                />
                <span className="text-sm font-medium text-foreground">Let Jean choose the music for me</span>
              </label>

              {letJeanChoose ? (
                <p className="text-sm text-teal-700 bg-teal-50 border border-teal-200 rounded-lg px-4 py-3">
                  Great! Jean will select music that fits your wedding style.
                </p>
              ) : (
                <div className="space-y-3">
                  {songs.map((song, i) => (
                    <div key={i}>
                      <label className="text-sm font-medium text-foreground mb-1 block">
                        Song {i + 1}
                      </label>
                      <input
                        type="text"
                        value={song}
                        onChange={(e) => {
                          const updated = [...songs]
                          updated[i] = e.target.value
                          setSongs(updated)
                        }}
                        placeholder="Song name or YouTube link"
                      />
                      {song && (
                        <div className="mt-1.5">
                          <label className="text-xs text-muted-foreground mb-1 block">Where to use this song?</label>
                          <select
                            value={songPlacements[i]}
                            onChange={(e) => {
                              const updated = [...songPlacements]
                              updated[i] = e.target.value as SongPlacement
                              setSongPlacements(updated)
                            }}
                            className="text-sm"
                          >
                            {PLACEMENT_OPTIONS.map((opt) => (
                              <option key={opt.value} value={opt.value}>{opt.label}</option>
                            ))}
                          </select>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Must-Have Moments */}
            <div className="bg-card rounded-xl border p-6 shadow-sm">
              <h2 className="text-lg font-semibold text-foreground mb-3">Instructions / must-have moments</h2>
              <textarea
                value={mustHaveMoments}
                onChange={(e) => setMustHaveMoments(e.target.value)}
                placeholder="Tell us about specific moments, people, or details you want featured..."
                rows={4}
                className="w-full"
              />
            </div>

            {/* Recap Style */}
            <div className="bg-card rounded-xl border p-6 shadow-sm">
              <h2 className="text-lg font-semibold text-foreground mb-3">Recap style</h2>
              <div className="space-y-2">
                <label className="flex items-center gap-3 p-3 rounded-lg border cursor-pointer hover:bg-muted/50 transition-colors">
                  <input
                    type="radio"
                    name="recapStyle"
                    checked={recapStyle === 'short'}
                    onChange={() => setRecapStyle('short')}
                    className="w-4 h-4 accent-teal-600"
                  />
                  <div>
                    <span className="text-sm font-medium">Short</span>
                    <p className="text-xs text-muted-foreground">1 song</p>
                  </div>
                </label>
                <label className="flex items-center gap-3 p-3 rounded-lg border cursor-pointer hover:bg-muted/50 transition-colors">
                  <input
                    type="radio"
                    name="recapStyle"
                    checked={recapStyle === 'longer'}
                    onChange={() => setRecapStyle('longer')}
                    className="w-4 h-4 accent-teal-600"
                  />
                  <div>
                    <span className="text-sm font-medium">Longer</span>
                    <p className="text-xs text-muted-foreground">2 songs</p>
                  </div>
                </label>
              </div>
            </div>

            {/* Include Vows */}
            <div className="bg-card rounded-xl border p-6 shadow-sm">
              <h2 className="text-lg font-semibold text-foreground mb-3">Include vows in recap?</h2>
              <div className="space-y-2">
                <label className="flex items-center gap-3 p-3 rounded-lg border cursor-pointer hover:bg-muted/50 transition-colors">
                  <input
                    type="radio"
                    name="includeVows"
                    checked={includeVows === true}
                    onChange={() => setIncludeVows(true)}
                    className="w-4 h-4 accent-teal-600"
                  />
                  <span className="text-sm font-medium">Yes</span>
                </label>
                <label className="flex items-center gap-3 p-3 rounded-lg border cursor-pointer hover:bg-muted/50 transition-colors">
                  <input
                    type="radio"
                    name="includeVows"
                    checked={includeVows === false}
                    onChange={() => setIncludeVows(false)}
                    className="w-4 h-4 accent-teal-600"
                  />
                  <span className="text-sm font-medium">No</span>
                </label>
              </div>
            </div>

            {/* Submit */}
            <button
              onClick={handleSubmit}
              disabled={loading}
              className="w-full bg-teal-600 hover:bg-teal-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold py-4 px-6 rounded-xl transition-colors flex items-center justify-center gap-2 text-lg"
            >
              {loading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <Video className="w-5 h-5" />
              )}
              Submit Video Order
            </button>
          </div>
        )}

        {/* ═══ STEP 3: Done ════════════════════════════════════════════ */}
        {step === 3 && (
          <div className="bg-card rounded-xl border p-8 shadow-sm text-center">
            <CheckCircle className="w-16 h-16 text-teal-600 mx-auto mb-4" />
            <h1 className="text-2xl font-bold text-foreground mb-2">
              Video Order Submitted!
            </h1>
            <p className="text-muted-foreground mb-6 max-w-md mx-auto">
              Your video order has been submitted! We&apos;ll be in touch soon.
            </p>
            <div className="bg-muted/50 rounded-lg p-4 text-left max-w-sm mx-auto">
              <h3 className="text-sm font-semibold text-foreground mb-2">What happens next?</h3>
              <ul className="space-y-1.5 text-sm text-muted-foreground">
                <li>1. We&apos;ll review your song choices and preferences</li>
                <li>2. Your full-length video will be created</li>
                <li>3. You&apos;ll review and share feedback</li>
                <li>4. We&apos;ll finalize your highlight reel</li>
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
