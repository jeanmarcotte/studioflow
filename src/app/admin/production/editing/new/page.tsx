'use client'

import { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { X } from 'lucide-react'

// ── Constants ──────────────────────────────────────────────────────

type Category = 'wedding' | 'engagement' | 'video'

const JOB_TYPES: Record<Category, { value: string; label: string }[]> = {
  wedding: [
    { value: 'wedding_proofs', label: 'Wedding Proofs' },
    { value: 'parent_album', label: 'Parent Album' },
    { value: 'bg_album', label: 'Bride & Groom Album' },
    { value: 'bg_portrait_canvas', label: 'B&G Portrait Canvas' },
    { value: 'bg_portrait_print', label: 'B&G Portrait Print' },
    { value: 'parent_portrait_canvas', label: 'Parent Portrait Canvas' },
    { value: 'parent_portrait_print', label: 'Parent Portrait Print' },
    { value: 'tyc', label: 'Thank You Cards' },
    { value: 'hires_wedding', label: 'Hi-Res Wedding Export' },
  ],
  engagement: [
    { value: 'eng_proofs', label: 'Engagement Proofs' },
    { value: 'eng_collage', label: 'Engagement Collage' },
    { value: 'eng_signing_book', label: 'Engagement Signing Book' },
    { value: 'eng_album', label: 'Engagement Album' },
    { value: 'eng_prints', label: 'Extra Engagement Prints' },
    { value: 'hires_engagement', label: 'Hi-Res Engagement Export' },
  ],
  video: [
    { value: 'FULL', label: 'Full Length Video' },
    { value: 'RECAP', label: 'Recap Video' },
    { value: 'ENG_SLIDESHOW', label: 'Engagement Slideshow' },
    { value: 'RAW_VIDEO_OUTPUT', label: 'Raw Video Output' },
  ],
}

const VENDORS = [
  { value: 'cci', label: 'CCI' },
  { value: 'uaf', label: 'UAF' },
  { value: 'best_canvas', label: 'Best Canvas' },
  { value: 'in_house', label: 'In-house' },
]

const AUTO_FILL_QUANTITY: Record<string, number> = {
  parent_album: 30,
  bg_album: 70,
  eng_collage: 3,
  eng_signing_book: 22,
  bg_portrait_canvas: 1,
  bg_portrait_print: 1,
  parent_portrait_canvas: 1,
  parent_portrait_print: 1,
}

// ── Types ──────────────────────────────────────────────────────────

interface CoupleOption {
  id: string
  couple_name: string
  wedding_date: string | null
  wedding_year: number | null
}

// ══════════════════════════════════════════════════════════════════
// PAGE COMPONENT
// ══════════════════════════════════════════════════════════════════

export default function AddEditingJobPage() {
  const router = useRouter()

  // ── Couple search state ────────────────────────────────────────
  const [coupleId, setCoupleId] = useState('')
  const [coupleName, setCoupleName] = useState('')
  const [coupleSearch, setCoupleSearch] = useState('')
  const [coupleOptions, setCoupleOptions] = useState<CoupleOption[]>([])
  const [coupleDropdownOpen, setCoupleDropdownOpen] = useState(false)
  const coupleDropdownRef = useRef<HTMLDivElement>(null)

  // ── Form state ─────────────────────────────────────────────────
  const [category, setCategory] = useState<Category>('wedding')
  const [jobType, setJobType] = useState('')
  const [vendor, setVendor] = useState('')
  const [quantity, setQuantity] = useState<number | string>(1)
  const [description, setDescription] = useState('')
  const [notes, setNotes] = useState('')

  // ── Submission state ───────────────────────────────────────────
  const [submitting, setSubmitting] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState('')

  // ── Couple search (copied from team-notes) ─────────────────────

  const fetchCouples = useCallback(async (q: string) => {
    const res = await fetch(`/api/couples/search?q=${encodeURIComponent(q)}`)
    const json = await res.json()
    if (json.data) setCoupleOptions(json.data)
  }, [])

  useEffect(() => {
    const timer = setTimeout(() => fetchCouples(coupleSearch), 200)
    return () => clearTimeout(timer)
  }, [coupleSearch, fetchCouples])

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (coupleDropdownRef.current && !coupleDropdownRef.current.contains(e.target as Node)) {
        setCoupleDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const groupedCouples = useMemo(() => {
    const groups: Record<number, CoupleOption[]> = {}
    for (const c of coupleOptions) {
      const year = c.wedding_year || (c.wedding_date ? new Date(c.wedding_date).getFullYear() : 0)
      if (!groups[year]) groups[year] = []
      groups[year].push(c)
    }
    const yearOrder = [2025, 2026, 2027]
    return Object.entries(groups)
      .sort(([a], [b]) => {
        const idxA = yearOrder.indexOf(Number(a))
        const idxB = yearOrder.indexOf(Number(b))
        const posA = idxA === -1 ? yearOrder.length : idxA
        const posB = idxB === -1 ? yearOrder.length : idxB
        return posA - posB
      })
      .map(([year, couples]) => ({ year: Number(year), couples }))
  }, [coupleOptions])

  const selectCouple = (couple: CoupleOption) => {
    setCoupleId(couple.id)
    setCoupleName(couple.couple_name)
    setCoupleSearch(couple.couple_name)
    setCoupleDropdownOpen(false)
  }

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return ''
    const d = new Date(dateStr + 'T12:00:00')
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  }

  // ── Handlers ───────────────────────────────────────────────────

  const handleCategoryChange = (cat: Category) => {
    setCategory(cat)
    setJobType('')
    setQuantity(1)
  }

  const handleJobTypeChange = (jt: string) => {
    setJobType(jt)
    if (jt in AUTO_FILL_QUANTITY) {
      setQuantity(AUTO_FILL_QUANTITY[jt])
    } else {
      setQuantity(1)
    }
  }

  const resetForm = () => {
    setCoupleId('')
    setCoupleName('')
    setCoupleSearch('')
    setCategory('wedding')
    setJobType('')
    setVendor('')
    setQuantity(1)
    setDescription('')
    setNotes('')
    setSuccess(false)
    setError('')
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!coupleId || !jobType) return

    setSubmitting(true)
    setError('')

    let insertError: { message: string } | null = null

    if (category === 'video') {
      // Video jobs go into video_jobs table
      const { error } = await supabase
        .from('video_jobs')
        .insert({
          couple_id: coupleId,
          job_type: jobType,
          status: 'not_started',
          notes: notes.trim() || null,
          section: 'editing',
        })
      insertError = error
    } else {
      // Engagement & Wedding jobs go into jobs table
      const { error } = await supabase
        .from('jobs')
        .insert({
          couple_id: coupleId,
          category,
          job_type: jobType,
          vendor: vendor || null,
          photos_taken: Number(quantity) || null,
          status: 'not_started',
          notes: notes.trim() || null,
        })
      insertError = error
    }

    if (insertError) {
      setError(insertError.message)
      setSubmitting(false)
      return
    }

    setSubmitting(false)
    setSuccess(true)
  }

  // ── Success state ──────────────────────────────────────────────

  if (success) {
    return (
      <div className="space-y-8">
        <div>
          <h1 className="text-2xl font-bold">Add Editing Job</h1>
          <p className="text-muted-foreground text-sm mt-1">Create a new editing job for a couple</p>
        </div>
        <div className="rounded-xl border bg-card p-8 text-center space-y-4">
          <div className="text-green-600 text-lg font-semibold">Job added successfully</div>
          <p className="text-sm text-muted-foreground">
            Editing job for {coupleName} has been created.
          </p>
          <div className="flex justify-center gap-3">
            <button
              onClick={resetForm}
              className="rounded-lg border px-5 py-2.5 text-sm font-medium hover:bg-accent transition-colors"
            >
              Add Another
            </button>
            <button
              onClick={() => router.push(category === 'video' ? '/admin/production/video' : '/admin/production/photo')}
              className="rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90 transition-colors"
            >
              Go to Production
            </button>
          </div>
        </div>
      </div>
    )
  }

  // ── Form ───────────────────────────────────────────────────────

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold">Add Editing Job</h1>
        <p className="text-muted-foreground text-sm mt-1">Create a new editing job for a couple</p>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="rounded-xl border bg-card p-5 sm:p-6 space-y-5">

          {/* ── Couple ──────────────────────────────────────── */}
          <div ref={coupleDropdownRef}>
            <Label>Couple *</Label>
            <div className="relative">
              <input
                type="text"
                value={coupleSearch}
                onChange={(e) => {
                  setCoupleSearch(e.target.value)
                  setCoupleDropdownOpen(true)
                  if (!e.target.value) { setCoupleId(''); setCoupleName('') }
                }}
                onFocus={() => { setCoupleDropdownOpen(true); fetchCouples(coupleSearch) }}
                placeholder="Search by couple name..."
                className={`w-full rounded-lg border bg-background px-3 py-2.5 text-sm outline-none transition-colors focus:border-ring ${coupleId ? 'border-stone-800' : 'border-input'}`}
              />
              {coupleId && (
                <button
                  type="button"
                  onClick={() => { setCoupleId(''); setCoupleName(''); setCoupleSearch('') }}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-0.5 rounded text-muted-foreground hover:text-foreground"
                >
                  <X size={14} />
                </button>
              )}
              {coupleDropdownOpen && coupleOptions.length > 0 && (
                <div className="absolute z-50 w-full mt-1 rounded-lg border bg-card shadow-lg overflow-auto max-h-[280px]">
                  {groupedCouples.map(({ year, couples }) => (
                    <div key={year}>
                      <div className="px-3 py-1.5 text-[10px] uppercase tracking-widest sticky top-0 bg-muted/50 text-muted-foreground border-b">
                        {year || 'No Date'}
                      </div>
                      {couples.map(c => (
                        <button
                          key={c.id}
                          type="button"
                          onClick={() => selectCouple(c)}
                          className="w-full text-left px-3 py-2 text-sm hover:bg-accent/50 transition-colors"
                        >
                          <span>{c.couple_name}</span>
                          {c.wedding_date && (
                            <span className="ml-2 text-xs text-muted-foreground">
                              {formatDate(c.wedding_date)}
                            </span>
                          )}
                        </button>
                      ))}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* ── Category ────────────────────────────────────── */}
          <div>
            <Label>Category *</Label>
            <div className="flex gap-2">
              {(['wedding', 'engagement', 'video'] as const).map(cat => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => handleCategoryChange(cat)}
                  className={`rounded-full border px-4 py-1.5 text-sm font-medium transition-colors ${
                    category === cat
                      ? 'bg-primary text-primary-foreground border-primary'
                      : 'border-input hover:bg-accent/50'
                  }`}
                >
                  {cat === 'wedding' ? 'Wedding' : cat === 'engagement' ? 'Engagement' : 'Video'}
                </button>
              ))}
            </div>
          </div>

          {/* ── Job Type ────────────────────────────────────── */}
          <div>
            <Label>Job Type *</Label>
            <select
              value={jobType}
              onChange={(e) => handleJobTypeChange(e.target.value)}
              className="w-full rounded-lg border border-input bg-background px-3 py-2.5 text-sm outline-none transition-colors focus:border-ring"
            >
              <option value="">Select job type...</option>
              {JOB_TYPES[category].map(jt => (
                <option key={jt.value} value={jt.value}>{jt.label}</option>
              ))}
            </select>
          </div>

          {/* ── Vendor (hidden for video) ────────────────── */}
          {category !== 'video' && (
            <div>
              <Label>Vendor</Label>
              <select
                value={vendor}
                onChange={(e) => setVendor(e.target.value)}
                className="w-full rounded-lg border border-input bg-background px-3 py-2.5 text-sm outline-none transition-colors focus:border-ring"
              >
                <option value="">None</option>
                {VENDORS.map(v => (
                  <option key={v.value} value={v.value}>{v.label}</option>
                ))}
              </select>
            </div>
          )}

          {/* ── Photos Taken (hidden for video) ─────────── */}
          {category !== 'video' && (
            <div>
              <Label>Photos Taken</Label>
              <input
                type="number"
                min={1}
                max={9999}
                value={quantity}
                onChange={(e) => setQuantity(e.target.value === '' ? '' : Math.max(1, Number(e.target.value)))}
                readOnly={jobType in AUTO_FILL_QUANTITY}
                className={`w-24 rounded-lg border border-input bg-background px-3 py-2.5 text-sm outline-none transition-colors focus:border-ring ${jobType in AUTO_FILL_QUANTITY ? 'bg-muted text-muted-foreground cursor-not-allowed' : ''}`}
              />
            </div>
          )}

          {/* ── Description (hidden for video) ──────────── */}
          {category !== 'video' && (
            <div>
              <Label>Description</Label>
              <input
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="e.g., Parent Album - Mom's side"
                className="w-full rounded-lg border border-input bg-background px-3 py-2.5 text-sm outline-none transition-colors focus:border-ring"
              />
            </div>
          )}

          {/* ── Notes ───────────────────────────────────────── */}
          <div>
            <Label>Notes</Label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              placeholder="Optional notes..."
              className="w-full rounded-lg border border-input bg-background px-3 py-3 text-sm outline-none resize-y transition-colors focus:border-ring"
            />
          </div>

          {/* ── Error ───────────────────────────────────────── */}
          {error && (
            <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
              {error}
            </div>
          )}

          {/* ── Submit ──────────────────────────────────────── */}
          <button
            type="submit"
            disabled={submitting || !coupleId || !jobType}
            className="rounded-lg bg-primary px-6 py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
          >
            {submitting ? 'Creating...' : 'Create Job'}
          </button>
        </div>
      </form>
    </div>
  )
}

// ── Sub-components ─────────────────────────────────────────────────

function Label({ children }: { children: React.ReactNode }) {
  return (
    <div className="text-xs font-medium text-muted-foreground mb-2 select-none">
      {children}
    </div>
  )
}
