'use client'

import { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import { JetBrains_Mono, Space_Grotesk } from 'next/font/google'
import {
  Plus, X, Search, Trash2, BookOpen, ChevronDown, ChevronUp,
  AlertTriangle, CheckCircle, AlertCircle, Filter, SlidersHorizontal
} from 'lucide-react'
import type {
  TeamNoteWithTags, NoteIssueTag, CoupleOption, Severity,
} from '@/types/team-notes'
import { SHOOTERS, WEDDING_PHASES, SEVERITIES } from '@/types/team-notes'

// ── Fonts ────────────────────────────────────────────────────────

const mono = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-mono',
  weight: ['400', '500', '700'],
})

const grotesk = Space_Grotesk({
  subsets: ['latin'],
  variable: '--font-grotesk',
  weight: ['400', '500', '600', '700'],
})

// ── Design tokens (inline dark theme) ────────────────────────────

const T = {
  bg: '#08080d',
  surface: '#0f0f16',
  surfaceRaised: '#15151f',
  border: '#1c1c2a',
  borderFocus: '#d4a853',
  text: '#dcdce4',
  textSecondary: '#65657a',
  textMuted: '#3a3a50',
  amber: '#d4a853',
  amberDim: '#a8842f',
  amberGlow: 'rgba(212,168,83,0.12)',
  red: '#e5484d',
  redDim: '#3b1219',
  green: '#30a46c',
  greenDim: '#0d3020',
  yellow: '#e5c100',
  yellowDim: '#2b2105',
} as const

// ── Severity config ──────────────────────────────────────────────

const SEV: Record<Severity, { label: string; icon: string; color: string; bg: string; border: string }> = {
  low: { label: 'Low', icon: '●', color: T.green, bg: T.greenDim, border: '#1a4d32' },
  medium: { label: 'Medium', icon: '●', color: T.yellow, bg: T.yellowDim, border: '#4d3f0a' },
  high: { label: 'High', icon: '●', color: T.red, bg: T.redDim, border: '#4d1a1f' },
}

// ══════════════════════════════════════════════════════════════════
// PAGE COMPONENT
// ══════════════════════════════════════════════════════════════════

export default function TeamNotesPage() {
  // ── Form state ─────────────────────────────────────────────────
  const [coupleId, setCoupleId] = useState('')
  const [coupleName, setCoupleName] = useState('')
  const [coupleSearch, setCoupleSearch] = useState('')
  const [coupleOptions, setCoupleOptions] = useState<CoupleOption[]>([])
  const [coupleDropdownOpen, setCoupleDropdownOpen] = useState(false)
  const [shooters, setShooters] = useState<string[]>([])
  const [otherShooter, setOtherShooter] = useState('')
  const [showOtherShooter, setShowOtherShooter] = useState(false)
  const [phases, setPhases] = useState<string[]>([])
  const [severity, setSeverity] = useState<Severity>('medium')
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>([])
  const [newTagInput, setNewTagInput] = useState('')
  const [pendingNewTags, setPendingNewTags] = useState<string[]>([])
  const [noteText, setNoteText] = useState('')
  const [isLesson, setIsLesson] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  // ── Data state ─────────────────────────────────────────────────
  const [allTags, setAllTags] = useState<NoteIssueTag[]>([])
  const [notes, setNotes] = useState<TeamNoteWithTags[]>([])
  const [loading, setLoading] = useState(true)
  const [expandedNote, setExpandedNote] = useState<string | null>(null)

  // ── Filter state ───────────────────────────────────────────────
  const [filterShooter, setFilterShooter] = useState('')
  const [filterPhase, setFilterPhase] = useState('')
  const [filterSeverity, setFilterSeverity] = useState('')
  const [filterTag, setFilterTag] = useState('')
  const [filterSearch, setFilterSearch] = useState('')
  const [showFilters, setShowFilters] = useState(false)

  const coupleDropdownRef = useRef<HTMLDivElement>(null)
  const formRef = useRef<HTMLFormElement>(null)

  // ── Load initial data ──────────────────────────────────────────

  const fetchTags = useCallback(async () => {
    const res = await fetch('/api/team-notes/tags')
    const json = await res.json()
    if (json.data) setAllTags(json.data)
  }, [])

  const fetchNotes = useCallback(async () => {
    const params = new URLSearchParams()
    if (filterShooter) params.set('shooter', filterShooter)
    if (filterPhase) params.set('phase', filterPhase)
    if (filterSeverity) params.set('severity', filterSeverity)
    if (filterTag) params.set('tag', filterTag)
    if (filterSearch) params.set('search', filterSearch)

    const res = await fetch(`/api/team-notes?${params}`)
    const json = await res.json()
    if (json.data) setNotes(json.data)
    setLoading(false)
  }, [filterShooter, filterPhase, filterSeverity, filterTag, filterSearch])

  const fetchCouples = useCallback(async (q: string) => {
    const res = await fetch(`/api/couples/search?q=${encodeURIComponent(q)}`)
    const json = await res.json()
    if (json.data) setCoupleOptions(json.data)
  }, [])

  useEffect(() => { fetchTags(); fetchNotes() }, [fetchTags, fetchNotes])

  useEffect(() => {
    const timer = setTimeout(() => fetchCouples(coupleSearch), 200)
    return () => clearTimeout(timer)
  }, [coupleSearch, fetchCouples])

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (coupleDropdownRef.current && !coupleDropdownRef.current.contains(e.target as Node)) {
        setCoupleDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  // ── Grouped couples for dropdown ───────────────────────────────

  const groupedCouples = useMemo(() => {
    const groups: Record<number, CoupleOption[]> = {}
    for (const c of coupleOptions) {
      const year = c.wedding_year || (c.wedding_date ? new Date(c.wedding_date).getFullYear() : 0)
      if (!groups[year]) groups[year] = []
      groups[year].push(c)
    }
    return Object.entries(groups)
      .sort(([a], [b]) => Number(b) - Number(a))
      .map(([year, couples]) => ({ year: Number(year), couples }))
  }, [coupleOptions])

  // ── Handlers ───────────────────────────────────────────────────

  const toggleShooter = (name: string) => {
    setShooters(prev => prev.includes(name) ? prev.filter(s => s !== name) : [...prev, name])
  }

  const togglePhase = (phase: string) => {
    setPhases(prev => prev.includes(phase) ? prev.filter(p => p !== phase) : [...prev, phase])
  }

  const toggleTag = (tagId: string) => {
    setSelectedTagIds(prev =>
      prev.includes(tagId) ? prev.filter(t => t !== tagId) : [...prev, tagId]
    )
  }

  const addNewTag = () => {
    const trimmed = newTagInput.trim().toLowerCase()
    if (!trimmed) return
    // Check if tag already exists in allTags
    const existing = allTags.find(t => t.tag === trimmed)
    if (existing) {
      if (!selectedTagIds.includes(existing.id)) {
        setSelectedTagIds(prev => [...prev, existing.id])
      }
    } else if (!pendingNewTags.includes(trimmed)) {
      setPendingNewTags(prev => [...prev, trimmed])
    }
    setNewTagInput('')
  }

  const removeNewTag = (tag: string) => {
    setPendingNewTags(prev => prev.filter(t => t !== tag))
  }

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!coupleId || !noteText.trim()) return

    setSubmitting(true)

    const allShooters = [...shooters]
    if (showOtherShooter && otherShooter.trim()) {
      allShooters.push(otherShooter.trim())
    }

    const body = {
      couple_id: coupleId,
      couple_name: coupleName,
      shooters: allShooters,
      wedding_phase: phases,
      severity,
      note: noteText,
      is_lesson: isLesson,
      tag_ids: selectedTagIds,
      new_tags: pendingNewTags,
    }

    const res = await fetch('/api/team-notes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })

    if (res.ok) {
      // Reset form but keep couple selected
      setShooters([])
      setOtherShooter('')
      setShowOtherShooter(false)
      setPhases([])
      setSeverity('medium')
      setSelectedTagIds([])
      setPendingNewTags([])
      setNoteText('')
      setIsLesson(false)
      // Refresh data
      await Promise.all([fetchNotes(), fetchTags()])
    }

    setSubmitting(false)
  }

  const handleDelete = async (noteId: string) => {
    const res = await fetch(`/api/team-notes?id=${noteId}`, { method: 'DELETE' })
    if (res.ok) {
      setNotes(prev => prev.filter(n => n.id !== noteId))
    }
  }

  const activeFilterCount = [filterShooter, filterPhase, filterSeverity, filterTag, filterSearch].filter(Boolean).length

  // ══════════════════════════════════════════════════════════════
  // RENDER
  // ══════════════════════════════════════════════════════════════

  return (
    <div
      className={`${mono.variable} ${grotesk.variable} min-h-screen`}
      style={{ background: T.bg, color: T.text }}
    >
      <div className="max-w-5xl mx-auto px-4 py-6 sm:px-6 lg:px-8">

        {/* ── Header ──────────────────────────────────────────── */}
        <div className="mb-8">
          <h1
            className="text-2xl font-bold tracking-tight"
            style={{ fontFamily: 'var(--font-grotesk), sans-serif' }}
          >
            Team Notes
          </h1>
          <p
            className="text-sm mt-1"
            style={{ color: T.textSecondary, fontFamily: 'var(--font-mono), monospace' }}
          >
            field observations &middot; teaching moments &middot; production log
          </p>
        </div>

        {/* ══════════════════════════════════════════════════════ */}
        {/* FORM                                                  */}
        {/* ══════════════════════════════════════════════════════ */}
        <form ref={formRef} onSubmit={handleSubmit}>
          <div
            className="rounded-lg p-5 sm:p-6 mb-6"
            style={{ background: T.surface, border: `1px solid ${T.border}` }}
          >

            {/* ── Couple ────────────────────────────────────── */}
            <div className="mb-5" ref={coupleDropdownRef}>
              <Label>Couple</Label>
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
                  className="w-full rounded-md text-sm outline-none transition-colors"
                  style={{
                    background: T.surfaceRaised,
                    border: `1px solid ${coupleId ? T.amber : T.border}`,
                    color: T.text,
                    padding: '10px 12px',
                    fontFamily: 'var(--font-grotesk), sans-serif',
                  }}
                />
                {coupleId && (
                  <button
                    type="button"
                    onClick={() => { setCoupleId(''); setCoupleName(''); setCoupleSearch('') }}
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-0.5 rounded hover:opacity-80"
                    style={{ color: T.textSecondary }}
                  >
                    <X size={14} />
                  </button>
                )}
                {coupleDropdownOpen && coupleOptions.length > 0 && (
                  <div
                    className="absolute z-50 w-full mt-1 rounded-md shadow-2xl overflow-auto"
                    style={{
                      background: T.surfaceRaised,
                      border: `1px solid ${T.border}`,
                      maxHeight: 280,
                    }}
                  >
                    {groupedCouples.map(({ year, couples }) => (
                      <div key={year}>
                        <div
                          className="px-3 py-1.5 text-[10px] uppercase tracking-widest sticky top-0"
                          style={{
                            background: T.surface,
                            color: T.textSecondary,
                            fontFamily: 'var(--font-mono), monospace',
                            borderBottom: `1px solid ${T.border}`,
                          }}
                        >
                          {year || 'No Date'}
                        </div>
                        {couples.map(c => (
                          <button
                            key={c.id}
                            type="button"
                            onClick={() => selectCouple(c)}
                            className="w-full text-left px-3 py-2 text-sm transition-colors"
                            style={{ fontFamily: 'var(--font-grotesk)' }}
                            onMouseEnter={e => (e.currentTarget.style.background = T.amberGlow)}
                            onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                          >
                            <span style={{ color: T.text }}>{c.couple_name}</span>
                            {c.wedding_date && (
                              <span
                                className="ml-2 text-xs"
                                style={{ color: T.textSecondary, fontFamily: 'var(--font-mono)' }}
                              >
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

            {/* ── Shooters ──────────────────────────────────── */}
            <div className="mb-5">
              <Label>Shooters</Label>
              <div className="flex flex-wrap gap-2">
                {SHOOTERS.map(name => (
                  <PillButton
                    key={name}
                    label={name}
                    active={shooters.includes(name)}
                    onClick={() => toggleShooter(name)}
                  />
                ))}
                <PillButton
                  label="+ Other"
                  active={showOtherShooter}
                  onClick={() => setShowOtherShooter(!showOtherShooter)}
                  variant="ghost"
                />
              </div>
              {showOtherShooter && (
                <input
                  type="text"
                  value={otherShooter}
                  onChange={e => setOtherShooter(e.target.value)}
                  placeholder="Name..."
                  className="mt-2 rounded-md text-sm outline-none w-48"
                  style={{
                    background: T.surfaceRaised,
                    border: `1px solid ${T.border}`,
                    color: T.text,
                    padding: '6px 10px',
                    fontFamily: 'var(--font-grotesk)',
                  }}
                />
              )}
            </div>

            {/* ── Wedding Phase ──────────────────────────────── */}
            <div className="mb-5">
              <Label>Wedding Phase</Label>
              <div className="flex flex-wrap gap-1.5">
                {WEDDING_PHASES.map(phase => (
                  <PillButton
                    key={phase}
                    label={phase}
                    active={phases.includes(phase)}
                    onClick={() => togglePhase(phase)}
                    size="sm"
                  />
                ))}
              </div>
            </div>

            {/* ── Severity ──────────────────────────────────── */}
            <div className="mb-5">
              <Label>Severity</Label>
              <div className="flex gap-2">
                {SEVERITIES.map(sev => {
                  const cfg = SEV[sev]
                  const active = severity === sev
                  return (
                    <button
                      key={sev}
                      type="button"
                      onClick={() => setSeverity(sev)}
                      className="px-4 py-2 rounded-md text-sm font-medium transition-all"
                      style={{
                        background: active ? cfg.bg : 'transparent',
                        border: `1px solid ${active ? cfg.border : T.border}`,
                        color: active ? cfg.color : T.textSecondary,
                        fontFamily: 'var(--font-grotesk)',
                      }}
                    >
                      <span className="mr-1.5" style={{ color: cfg.color, fontSize: 10 }}>{cfg.icon}</span>
                      {cfg.label}
                    </button>
                  )
                })}
              </div>
            </div>

            {/* ── Issue Tags ────────────────────────────────── */}
            <div className="mb-5">
              <Label>Issue Tags</Label>
              {allTags.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mb-2">
                  {allTags.map(tag => {
                    const active = selectedTagIds.includes(tag.id)
                    return (
                      <button
                        key={tag.id}
                        type="button"
                        onClick={() => toggleTag(tag.id)}
                        className="px-2.5 py-1 rounded text-xs transition-all"
                        style={{
                          background: active ? T.amberGlow : 'transparent',
                          border: `1px solid ${active ? T.amber : T.border}`,
                          color: active ? T.amber : T.textSecondary,
                          fontFamily: 'var(--font-mono)',
                        }}
                      >
                        {tag.tag}
                        {active && <span className="ml-1 opacity-60">×</span>}
                      </button>
                    )
                  })}
                </div>
              )}
              {/* Pending new tags */}
              {pendingNewTags.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mb-2">
                  {pendingNewTags.map(tag => (
                    <span
                      key={tag}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded text-xs"
                      style={{
                        background: T.amberGlow,
                        border: `1px dashed ${T.amber}`,
                        color: T.amber,
                        fontFamily: 'var(--font-mono)',
                      }}
                    >
                      {tag}
                      <button type="button" onClick={() => removeNewTag(tag)} className="hover:opacity-80">
                        <X size={10} />
                      </button>
                    </span>
                  ))}
                </div>
              )}
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newTagInput}
                  onChange={e => setNewTagInput(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addNewTag() } }}
                  placeholder="Type new tag + Enter..."
                  className="rounded-md text-xs outline-none flex-1 max-w-xs"
                  style={{
                    background: T.surfaceRaised,
                    border: `1px solid ${T.border}`,
                    color: T.text,
                    padding: '6px 10px',
                    fontFamily: 'var(--font-mono)',
                  }}
                />
                <button
                  type="button"
                  onClick={addNewTag}
                  className="px-3 py-1.5 rounded-md text-xs transition-colors"
                  style={{
                    background: T.surfaceRaised,
                    border: `1px solid ${T.border}`,
                    color: T.textSecondary,
                    fontFamily: 'var(--font-mono)',
                  }}
                >
                  <Plus size={12} />
                </button>
              </div>
            </div>
          </div>

          {/* ── Note textarea + submit ────────────────────────── */}
          <div
            className="rounded-lg p-5 sm:p-6 mb-8"
            style={{ background: T.surface, border: `1px solid ${T.border}` }}
          >
            <Label>Note</Label>
            <textarea
              value={noteText}
              onChange={e => setNoteText(e.target.value)}
              rows={5}
              placeholder="Describe what happened, what should have been done differently, and what the team should learn from this..."
              className="w-full rounded-md text-sm outline-none resize-y transition-colors"
              style={{
                background: T.surfaceRaised,
                border: `1px solid ${T.border}`,
                color: T.text,
                padding: '12px',
                fontFamily: 'var(--font-grotesk)',
                minHeight: 120,
              }}
              onFocus={e => (e.currentTarget.style.borderColor = T.borderFocus)}
              onBlur={e => (e.currentTarget.style.borderColor = T.border)}
            />

            <div className="flex items-center justify-between mt-4 flex-wrap gap-3">
              {/* Lesson checkbox */}
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={isLesson}
                  onChange={e => setIsLesson(e.target.checked)}
                  className="sr-only peer"
                />
                <div
                  className="w-5 h-5 rounded flex items-center justify-center transition-all peer-checked:opacity-100"
                  style={{
                    background: isLesson ? T.amberGlow : T.surfaceRaised,
                    border: `1px solid ${isLesson ? T.amber : T.border}`,
                  }}
                >
                  {isLesson && <BookOpen size={12} style={{ color: T.amber }} />}
                </div>
                <span
                  className="text-sm"
                  style={{ color: isLesson ? T.amber : T.textSecondary, fontFamily: 'var(--font-grotesk)' }}
                >
                  Mark as lesson
                </span>
              </label>

              {/* Submit */}
              <button
                type="submit"
                disabled={submitting || !coupleId || !noteText.trim()}
                className="px-6 py-2.5 rounded-md text-sm font-semibold transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                style={{
                  background: T.amber,
                  color: T.bg,
                  fontFamily: 'var(--font-grotesk)',
                }}
              >
                {submitting ? 'Logging...' : 'Log Note'}
              </button>
            </div>
          </div>
        </form>

        {/* ══════════════════════════════════════════════════════ */}
        {/* NOTES LIST                                            */}
        {/* ══════════════════════════════════════════════════════ */}

        <div className="mb-4 flex items-center justify-between">
          <h2
            className="text-lg font-semibold"
            style={{ fontFamily: 'var(--font-grotesk)' }}
          >
            Recent Notes
            <span
              className="ml-2 text-xs font-normal"
              style={{ color: T.textSecondary, fontFamily: 'var(--font-mono)' }}
            >
              {notes.length}
            </span>
          </h2>
          <button
            type="button"
            onClick={() => setShowFilters(!showFilters)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs transition-colors"
            style={{
              background: activeFilterCount > 0 ? T.amberGlow : T.surfaceRaised,
              border: `1px solid ${activeFilterCount > 0 ? T.amber : T.border}`,
              color: activeFilterCount > 0 ? T.amber : T.textSecondary,
              fontFamily: 'var(--font-mono)',
            }}
          >
            <SlidersHorizontal size={12} />
            Filters{activeFilterCount > 0 && ` (${activeFilterCount})`}
          </button>
        </div>

        {/* ── Filters bar ─────────────────────────────────────── */}
        {showFilters && (
          <div
            className="rounded-lg p-4 mb-4 flex flex-wrap gap-3 items-end"
            style={{ background: T.surface, border: `1px solid ${T.border}` }}
          >
            <FilterSelect
              label="Shooter"
              value={filterShooter}
              onChange={setFilterShooter}
              options={[...SHOOTERS]}
            />
            <FilterSelect
              label="Phase"
              value={filterPhase}
              onChange={setFilterPhase}
              options={[...WEDDING_PHASES]}
            />
            <FilterSelect
              label="Severity"
              value={filterSeverity}
              onChange={setFilterSeverity}
              options={['low', 'medium', 'high']}
            />
            <FilterSelect
              label="Tag"
              value={filterTag}
              onChange={setFilterTag}
              options={allTags.map(t => t.tag)}
            />
            <div>
              <div
                className="text-[10px] uppercase tracking-widest mb-1"
                style={{ color: T.textSecondary, fontFamily: 'var(--font-mono)' }}
              >
                Search
              </div>
              <div className="relative">
                <Search
                  size={12}
                  className="absolute left-2.5 top-1/2 -translate-y-1/2"
                  style={{ color: T.textMuted }}
                />
                <input
                  type="text"
                  value={filterSearch}
                  onChange={e => setFilterSearch(e.target.value)}
                  placeholder="Search notes..."
                  className="rounded-md text-xs outline-none pl-7"
                  style={{
                    background: T.surfaceRaised,
                    border: `1px solid ${T.border}`,
                    color: T.text,
                    padding: '6px 10px',
                    width: 180,
                    fontFamily: 'var(--font-grotesk)',
                  }}
                />
              </div>
            </div>
            {activeFilterCount > 0 && (
              <button
                type="button"
                onClick={() => {
                  setFilterShooter(''); setFilterPhase(''); setFilterSeverity('')
                  setFilterTag(''); setFilterSearch('')
                }}
                className="px-3 py-1.5 rounded-md text-xs"
                style={{ color: T.textSecondary, fontFamily: 'var(--font-mono)' }}
              >
                Clear all
              </button>
            )}
          </div>
        )}

        {/* ── Notes list ──────────────────────────────────────── */}
        {loading ? (
          <div className="text-center py-12" style={{ color: T.textSecondary }}>
            <div
              className="text-sm"
              style={{ fontFamily: 'var(--font-mono)' }}
            >
              loading notes...
            </div>
          </div>
        ) : notes.length === 0 ? (
          <div
            className="text-center py-16 rounded-lg"
            style={{ background: T.surface, border: `1px solid ${T.border}` }}
          >
            <AlertCircle size={32} className="mx-auto mb-3" style={{ color: T.textMuted }} />
            <p className="text-sm" style={{ color: T.textSecondary, fontFamily: 'var(--font-grotesk)' }}>
              {activeFilterCount > 0 ? 'No notes match your filters.' : 'No notes logged yet. Start by logging your first observation above.'}
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {notes.map(note => {
              const expanded = expandedNote === note.id
              const sevCfg = SEV[note.severity as Severity] || SEV.medium
              return (
                <div
                  key={note.id}
                  className="rounded-lg transition-colors"
                  style={{ background: T.surface, border: `1px solid ${T.border}` }}
                >
                  {/* Row header */}
                  <div
                    className="flex items-start gap-3 p-4 cursor-pointer"
                    onClick={() => setExpandedNote(expanded ? null : note.id)}
                  >
                    {/* Severity dot */}
                    <div className="pt-0.5">
                      <div
                        className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                        style={{ background: sevCfg.color }}
                        title={sevCfg.label}
                      />
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <span
                          className="text-sm font-medium"
                          style={{ fontFamily: 'var(--font-grotesk)', color: T.text }}
                        >
                          {note.couple_name || 'Unknown'}
                        </span>
                        {note.is_lesson && (
                          <BookOpen size={13} style={{ color: T.amber }} />
                        )}
                        <span
                          className="text-[10px] ml-auto flex-shrink-0"
                          style={{ color: T.textMuted, fontFamily: 'var(--font-mono)' }}
                        >
                          {formatDate(note.created_at?.split('T')[0])}
                        </span>
                      </div>

                      {/* Note preview */}
                      <p
                        className="text-sm leading-relaxed"
                        style={{
                          color: T.textSecondary,
                          fontFamily: 'var(--font-grotesk)',
                          ...(expanded ? {} : {
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap' as const,
                          }),
                        }}
                      >
                        {note.note}
                      </p>

                      {/* Inline pills */}
                      <div className="flex flex-wrap gap-1 mt-2">
                        {note.shooters?.map(s => (
                          <MicroPill key={s} label={s} color={T.textSecondary} />
                        ))}
                        {note.wedding_phase?.map(p => (
                          <MicroPill key={p} label={p} color={T.amberDim} />
                        ))}
                        {note.tags?.map(t => (
                          <MicroPill key={t.id} label={t.tag} color={T.amber} filled />
                        ))}
                      </div>
                    </div>

                    {/* Expand indicator */}
                    <div className="pt-0.5 flex-shrink-0" style={{ color: T.textMuted }}>
                      {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                    </div>
                  </div>

                  {/* Expanded detail */}
                  {expanded && (
                    <div
                      className="px-4 pb-4 pt-0 flex justify-end"
                      style={{ borderTop: `1px solid ${T.border}` }}
                    >
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); handleDelete(note.id) }}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs mt-3 transition-colors hover:opacity-80"
                        style={{
                          background: T.redDim,
                          border: `1px solid #4d1a1f`,
                          color: T.red,
                          fontFamily: 'var(--font-mono)',
                        }}
                      >
                        <Trash2 size={11} /> Delete
                      </button>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

// ══════════════════════════════════════════════════════════════════
// SUB-COMPONENTS
// ══════════════════════════════════════════════════════════════════

function Label({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="text-[10px] uppercase tracking-widest mb-2 select-none"
      style={{ color: T.textSecondary, fontFamily: 'var(--font-mono), monospace' }}
    >
      {children}
    </div>
  )
}

function PillButton({
  label, active, onClick, size = 'md', variant = 'default',
}: {
  label: string; active: boolean; onClick: () => void; size?: 'sm' | 'md'; variant?: 'default' | 'ghost'
}) {
  const sm = size === 'sm'
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-md font-medium transition-all ${sm ? 'px-2 py-1 text-[11px]' : 'px-3 py-1.5 text-xs'}`}
      style={{
        background: active ? T.amberGlow : 'transparent',
        border: `1px solid ${active ? T.amber : variant === 'ghost' ? T.textMuted : T.border}`,
        color: active ? T.amber : T.textSecondary,
        fontFamily: 'var(--font-grotesk), sans-serif',
        ...(variant === 'ghost' && !active ? { borderStyle: 'dashed' } : {}),
      }}
    >
      {label}
    </button>
  )
}

function MicroPill({ label, color, filled }: { label: string; color: string; filled?: boolean }) {
  return (
    <span
      className="inline-block px-1.5 py-0.5 rounded text-[10px]"
      style={{
        background: filled ? `${color}18` : 'transparent',
        border: `1px solid ${color}40`,
        color,
        fontFamily: 'var(--font-mono), monospace',
      }}
    >
      {label}
    </span>
  )
}

function FilterSelect({
  label, value, onChange, options,
}: {
  label: string; value: string; onChange: (v: string) => void; options: string[]
}) {
  return (
    <div>
      <div
        className="text-[10px] uppercase tracking-widest mb-1"
        style={{ color: T.textSecondary, fontFamily: 'var(--font-mono), monospace' }}
      >
        {label}
      </div>
      <select
        value={value}
        onChange={e => onChange(e.target.value)}
        className="rounded-md text-xs outline-none cursor-pointer"
        style={{
          background: T.surfaceRaised,
          border: `1px solid ${value ? T.amber : T.border}`,
          color: value ? T.amber : T.textSecondary,
          padding: '6px 28px 6px 10px',
          fontFamily: 'var(--font-grotesk), sans-serif',
          WebkitAppearance: 'none',
          appearance: 'none',
          backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%2365657a' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E")`,
          backgroundRepeat: 'no-repeat',
          backgroundPosition: 'right 8px center',
        }}
      >
        <option value="">All</option>
        {options.map(opt => (
          <option key={opt} value={opt}>{opt}</option>
        ))}
      </select>
    </div>
  )
}
