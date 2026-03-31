'use client'

import { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import {
  Plus, X, Search, Trash2, BookOpen, ChevronDown, ChevronUp,
  AlertCircle, SlidersHorizontal, ImagePlus, Mail, Send
} from 'lucide-react'
import { supabase } from '@/lib/supabase'
import type {
  TeamNoteWithTags, NoteIssueTag, CoupleOption, Severity,
} from '@/types/team-notes'
import { SHOOTERS, WEDDING_PHASES, SEVERITIES } from '@/types/team-notes'

// ── Severity config ──────────────────────────────────────────────

const SEV: Record<Severity, { label: string; dot: string; badge: string }> = {
  low: { label: 'Low', dot: 'bg-green-500', badge: 'bg-green-100 text-green-700 border-green-200' },
  medium: { label: 'Medium', dot: 'bg-amber-500', badge: 'bg-amber-100 text-amber-700 border-amber-200' },
  high: { label: 'High', dot: 'bg-red-500', badge: 'bg-red-100 text-red-700 border-red-200' },
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
  const [imageFiles, setImageFiles] = useState<File[]>([])
  const [imagePreviews, setImagePreviews] = useState<string[]>([])
  const [toast, setToast] = useState('')

  // ── Email state ──────────────────────────────────────────────
  const [emailPopoverNote, setEmailPopoverNote] = useState<string | null>(null)
  const [emailRecipients, setEmailRecipients] = useState<Record<string, boolean>>({})
  const [sendingEmail, setSendingEmail] = useState(false)
  const [shooterEmails, setShooterEmails] = useState<Record<string, string>>({})

  // ── Lightbox state ───────────────────────────────────────────
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null)

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
  const fileInputRef = useRef<HTMLInputElement>(null)
  const emailPopoverRef = useRef<HTMLDivElement>(null)

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

  // Fetch shooter emails on mount
  useEffect(() => {
    async function loadShooterEmails() {
      const res = await fetch('/api/team-members?fields=first_name,email')
      const json = await res.json()
      if (json.data) {
        const map: Record<string, string> = {}
        for (const m of json.data) {
          if (m.first_name && m.email) map[m.first_name] = m.email
        }
        setShooterEmails(map)
      }
    }
    loadShooterEmails()
  }, [])

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (coupleDropdownRef.current && !coupleDropdownRef.current.contains(e.target as Node)) {
        setCoupleDropdownOpen(false)
      }
      if (emailPopoverRef.current && !emailPopoverRef.current.contains(e.target as Node)) {
        setEmailPopoverNote(null)
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
    const yearOrder = [2026, 2027, 2025]
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

  // ── Image handlers ─────────────────────────────────────────────

  const handleImageSelect = (files: FileList | null) => {
    if (!files) return
    const newFiles = Array.from(files).filter(f => f.type.startsWith('image/'))
    const total = imageFiles.length + newFiles.length
    if (total > 3) {
      setToast('Maximum 3 images per note')
      setTimeout(() => setToast(''), 3000)
      return
    }
    const updated = [...imageFiles, ...newFiles]
    setImageFiles(updated)
    setImagePreviews(updated.map(f => URL.createObjectURL(f)))
  }

  const removeImage = (index: number) => {
    const updated = imageFiles.filter((_, i) => i !== index)
    setImageFiles(updated)
    setImagePreviews(updated.map(f => URL.createObjectURL(f)))
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    handleImageSelect(e.dataTransfer.files)
  }

  const uploadImages = async (): Promise<string[]> => {
    const urls: string[] = []
    for (const file of imageFiles) {
      const ext = file.name.split('.').pop() || 'jpg'
      const path = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`
      const { error } = await supabase.storage
        .from('team-notes-images')
        .upload(path, file, { upsert: true })
      if (error) {
        console.error('Image upload error:', error)
        setToast('Error uploading image: ' + error.message)
        setTimeout(() => setToast(''), 4000)
        continue
      }
      const { data: publicUrl } = supabase.storage
        .from('team-notes-images')
        .getPublicUrl(path)
      urls.push(publicUrl.publicUrl)
    }
    return urls
  }

  // ── Email handler ──────────────────────────────────────────────

  const openEmailPopover = (noteId: string, noteShooters: string[]) => {
    const recipients: Record<string, boolean> = {}
    for (const s of noteShooters) {
      if (shooterEmails[s]) recipients[s] = true
    }
    setEmailRecipients(recipients)
    setEmailPopoverNote(noteId)
  }

  const handleSendEmail = async () => {
    if (!emailPopoverNote) return
    const emails = Object.entries(emailRecipients)
      .filter(([, checked]) => checked)
      .map(([name]) => shooterEmails[name])
      .filter(Boolean)
    if (emails.length === 0) return

    setSendingEmail(true)
    const res = await fetch('/api/team-notes/email', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ noteId: emailPopoverNote, recipientEmails: emails }),
    })

    if (res.ok) {
      const names = Object.entries(emailRecipients)
        .filter(([, checked]) => checked)
        .map(([name]) => name)
        .join(', ')
      setToast(`Note sent to ${names}`)
    } else {
      setToast('Error sending email')
    }
    setTimeout(() => setToast(''), 4000)
    setSendingEmail(false)
    setEmailPopoverNote(null)
  }

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

    // Upload images first if any
    let uploadedUrls: string[] = []
    if (imageFiles.length > 0) {
      uploadedUrls = await uploadImages()
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
      image_urls: uploadedUrls.length > 0 ? uploadedUrls : null,
    }

    const res = await fetch('/api/team-notes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })

    if (res.ok) {
      setShooters([])
      setOtherShooter('')
      setShowOtherShooter(false)
      setPhases([])
      setSeverity('medium')
      setSelectedTagIds([])
      setPendingNewTags([])
      setNoteText('')
      setIsLesson(false)
      setImageFiles([])
      setImagePreviews([])
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
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold">Team Notes</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Field observations, teaching moments, and production log
        </p>
      </div>

      {/* ══════════════════════════════════════════════════════ */}
      {/* FORM                                                  */}
      {/* ══════════════════════════════════════════════════════ */}
      <form ref={formRef} onSubmit={handleSubmit}>
        <div className="rounded-xl border bg-card p-5 sm:p-6 space-y-5">

          {/* ── Couple ────────────────────────────────────── */}
          <div ref={coupleDropdownRef}>
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
                className={`w-full rounded-lg border bg-background px-3 py-2.5 text-sm outline-none transition-colors focus:border-stone-400 ${coupleId ? 'border-stone-800' : 'border-input'}`}
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

          {/* ── Shooters ──────────────────────────────────── */}
          <div>
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
                className="mt-2 rounded-lg border border-input bg-background px-3 py-1.5 text-sm outline-none w-48 focus:border-stone-400"
              />
            )}
          </div>

          {/* ── Wedding Phase ──────────────────────────────── */}
          <div>
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
          <div>
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
                    className={`px-4 py-2 rounded-lg text-sm font-medium border transition-all ${
                      active ? cfg.badge : 'border-input text-muted-foreground hover:bg-accent/50'
                    }`}
                  >
                    <span className={`inline-block w-2 h-2 rounded-full mr-1.5 ${cfg.dot}`} />
                    {cfg.label}
                  </button>
                )
              })}
            </div>
          </div>

          {/* ── Issue Tags ────────────────────────────────── */}
          <div>
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
                      className={`px-2.5 py-1 rounded text-xs border transition-all ${
                        active
                          ? 'bg-stone-800 text-white border-stone-800'
                          : 'border-input text-muted-foreground hover:bg-accent/50'
                      }`}
                    >
                      {tag.tag}
                      {active && <span className="ml-1 opacity-60">&times;</span>}
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
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded text-xs bg-stone-100 text-stone-700 border border-dashed border-stone-400"
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
                className="rounded-lg border border-input bg-background px-3 py-1.5 text-xs outline-none flex-1 max-w-xs focus:border-stone-400"
              />
              <button
                type="button"
                onClick={addNewTag}
                className="px-3 py-1.5 rounded-lg border border-input text-muted-foreground hover:bg-accent/50 transition-colors"
              >
                <Plus size={12} />
              </button>
            </div>
          </div>
        </div>

        {/* ── Note textarea + submit ────────────────────────── */}
        <div className="rounded-xl border bg-card p-5 sm:p-6 mt-4">
          <Label>Note</Label>
          <textarea
            value={noteText}
            onChange={e => setNoteText(e.target.value)}
            rows={5}
            placeholder="Describe what happened, what should have been done differently, and what the team should learn from this..."
            className="w-full rounded-lg border border-input bg-background px-3 py-3 text-sm outline-none resize-y transition-colors focus:border-stone-400 min-h-[120px]"
          />

          {/* ── Image Upload ──────────────────────────────── */}
          <div className="mt-4">
            <div
              onDrop={handleDrop}
              onDragOver={e => e.preventDefault()}
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-input rounded-lg p-4 text-center cursor-pointer hover:border-stone-400 transition-colors"
            >
              <ImagePlus size={20} className="mx-auto mb-1.5 text-muted-foreground" />
              <p className="text-xs text-muted-foreground">
                Drop images here or click to browse
              </p>
              <p className="text-[10px] text-muted-foreground/60 mt-0.5">
                Max 3 images (PNG, JPEG, WebP)
              </p>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/png,image/jpeg,image/webp"
                multiple
                className="hidden"
                onChange={e => handleImageSelect(e.target.files)}
              />
            </div>
            {imagePreviews.length > 0 && (
              <div className="flex gap-2 mt-3">
                {imagePreviews.map((url, i) => (
                  <div key={i} className="relative group">
                    <img
                      src={url}
                      alt={`Preview ${i + 1}`}
                      className="w-20 h-20 object-cover rounded-lg border border-input"
                    />
                    <button
                      type="button"
                      onClick={() => removeImage(i)}
                      className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-red-500 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <X size={10} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="flex items-center justify-between mt-4 flex-wrap gap-3">
            {/* Lesson checkbox */}
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={isLesson}
                onChange={e => setIsLesson(e.target.checked)}
                className="sr-only peer"
              />
              <div className={`w-5 h-5 rounded border flex items-center justify-center transition-all ${
                isLesson ? 'bg-stone-800 border-stone-800' : 'border-input bg-background'
              }`}>
                {isLesson && <BookOpen size={12} className="text-white" />}
              </div>
              <span className={`text-sm ${isLesson ? 'text-foreground font-medium' : 'text-muted-foreground'}`}>
                Mark as lesson
              </span>
            </label>

            {/* Submit */}
            <button
              type="submit"
              disabled={submitting || !coupleId || !noteText.trim()}
              className="rounded-lg bg-stone-800 px-6 py-2.5 text-sm font-semibold text-white hover:bg-stone-700 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
            >
              {submitting ? 'Logging...' : 'Log Note'}
            </button>
          </div>
        </div>
      </form>

      {/* ══════════════════════════════════════════════════════ */}
      {/* NOTES LIST                                            */}
      {/* ══════════════════════════════════════════════════════ */}

      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">
            Recent Notes
            <span className="ml-2 text-xs font-normal text-muted-foreground">
              {notes.length}
            </span>
          </h2>
          <button
            type="button"
            onClick={() => setShowFilters(!showFilters)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs border transition-colors ${
              activeFilterCount > 0
                ? 'bg-stone-800 text-white border-stone-800'
                : 'border-input text-muted-foreground hover:bg-accent/50'
            }`}
          >
            <SlidersHorizontal size={12} />
            Filters{activeFilterCount > 0 && ` (${activeFilterCount})`}
          </button>
        </div>

        {/* ── Filters bar ─────────────────────────────────────── */}
        {showFilters && (
          <div className="rounded-xl border bg-card p-4 mb-4 flex flex-wrap gap-3 items-end">
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
              <div className="text-xs font-medium text-muted-foreground mb-1">
                Search
              </div>
              <div className="relative">
                <Search
                  size={12}
                  className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground"
                />
                <input
                  type="text"
                  value={filterSearch}
                  onChange={e => setFilterSearch(e.target.value)}
                  placeholder="Search notes..."
                  className="rounded-lg border border-input bg-background pl-7 pr-3 py-1.5 text-xs outline-none w-[180px] focus:border-stone-400"
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
                className="px-3 py-1.5 rounded-lg text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                Clear all
              </button>
            )}
          </div>
        )}

        {/* ── Notes list ──────────────────────────────────────── */}
        {loading ? (
          <div className="text-center py-12 text-muted-foreground">
            <div className="text-sm">Loading notes...</div>
          </div>
        ) : notes.length === 0 ? (
          <div className="text-center py-16 rounded-xl border bg-card">
            <AlertCircle size={32} className="mx-auto mb-3 text-muted-foreground/50" />
            <p className="text-sm text-muted-foreground">
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
                  className="rounded-xl border bg-card transition-colors"
                >
                  {/* Row header */}
                  <div
                    className="flex items-start gap-3 p-4 cursor-pointer hover:bg-accent/30 transition-colors rounded-xl"
                    onClick={() => setExpandedNote(expanded ? null : note.id)}
                  >
                    {/* Severity dot */}
                    <div className="pt-1">
                      <div
                        className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${sevCfg.dot}`}
                        title={sevCfg.label}
                      />
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <span className="text-sm font-medium">
                          {note.couple_name || 'Unknown'}
                        </span>
                        {note.is_lesson && (
                          <BookOpen size={13} className="text-amber-600" />
                        )}
                        <span className="text-[10px] ml-auto flex-shrink-0 text-muted-foreground">
                          {formatDate(note.created_at?.split('T')[0])}
                        </span>
                      </div>

                      {/* Note preview */}
                      <p className={`text-sm leading-relaxed text-muted-foreground ${expanded ? '' : 'truncate'}`}>
                        {note.note}
                      </p>

                      {/* Image thumbnails */}
                      {note.image_urls && note.image_urls.length > 0 && (
                        <div className="flex gap-1.5 mt-2">
                          {note.image_urls.map((url: string, i: number) => (
                            <img
                              key={i}
                              src={url}
                              alt={`Note image ${i + 1}`}
                              onClick={(e) => { e.stopPropagation(); setLightboxUrl(url) }}
                              className="w-[80px] h-[80px] object-cover rounded-lg border border-input cursor-pointer hover:opacity-80 transition-opacity"
                            />
                          ))}
                        </div>
                      )}

                      {/* Inline pills */}
                      <div className="flex flex-wrap gap-1 mt-2">
                        {note.shooters?.map(s => (
                          <MicroPill key={s} label={s} variant="default" />
                        ))}
                        {note.wedding_phase?.map(p => (
                          <MicroPill key={p} label={p} variant="muted" />
                        ))}
                        {note.tags?.map(t => (
                          <MicroPill key={t.id} label={t.tag} variant="filled" />
                        ))}
                      </div>
                    </div>

                    {/* Email + Expand */}
                    <div className="pt-0.5 flex-shrink-0 flex items-center gap-1.5">
                      {note.shooters && note.shooters.some(s => shooterEmails[s]) && (
                        <div className="relative" ref={emailPopoverNote === note.id ? emailPopoverRef : undefined}>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation()
                              emailPopoverNote === note.id
                                ? setEmailPopoverNote(null)
                                : openEmailPopover(note.id, note.shooters)
                            }}
                            className="p-1 rounded text-muted-foreground hover:text-stone-700 hover:bg-accent/50 transition-colors"
                            title="Email note to shooter"
                          >
                            <Mail size={13} />
                          </button>
                          {emailPopoverNote === note.id && (
                            <div className="absolute right-0 top-full mt-1 z-50 w-56 rounded-lg border bg-card shadow-lg p-3" onClick={e => e.stopPropagation()}>
                              <p className="text-xs font-medium text-muted-foreground mb-2">Send to:</p>
                              <div className="space-y-1.5">
                                {note.shooters.filter(s => shooterEmails[s]).map(s => (
                                  <label key={s} className="flex items-center gap-2 cursor-pointer">
                                    <input
                                      type="checkbox"
                                      checked={emailRecipients[s] || false}
                                      onChange={e => setEmailRecipients(prev => ({ ...prev, [s]: e.target.checked }))}
                                      className="rounded border-input"
                                    />
                                    <span className="text-sm">{s}</span>
                                    <span className="text-[10px] text-muted-foreground ml-auto truncate max-w-[100px]">{shooterEmails[s]}</span>
                                  </label>
                                ))}
                              </div>
                              <button
                                type="button"
                                onClick={handleSendEmail}
                                disabled={sendingEmail || !Object.values(emailRecipients).some(Boolean)}
                                className="mt-3 w-full flex items-center justify-center gap-1.5 rounded-lg bg-stone-800 px-3 py-1.5 text-xs font-medium text-white hover:bg-stone-700 transition-colors disabled:opacity-30"
                              >
                                <Send size={11} />
                                {sendingEmail ? 'Sending...' : 'Send'}
                              </button>
                            </div>
                          )}
                        </div>
                      )}
                      <div className="text-muted-foreground">
                        {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                      </div>
                    </div>
                  </div>

                  {/* Expanded detail */}
                  {expanded && (
                    <div className="px-4 pb-4 pt-0 flex justify-end border-t">
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); handleDelete(note.id) }}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs mt-3 transition-colors bg-red-100 text-red-700 border border-red-200 hover:bg-red-200"
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

      {/* ── Lightbox ─────────────────────────────────────────── */}
      {lightboxUrl && (
        <div
          className="fixed inset-0 z-[100] bg-black/80 flex items-center justify-center p-8"
          onClick={() => setLightboxUrl(null)}
        >
          <button
            className="absolute top-4 right-4 text-white/80 hover:text-white"
            onClick={() => setLightboxUrl(null)}
          >
            <X size={24} />
          </button>
          <img
            src={lightboxUrl}
            alt="Full size"
            className="max-w-full max-h-full rounded-lg object-contain"
            onClick={e => e.stopPropagation()}
          />
        </div>
      )}

      {/* ── Toast ────────────────────────────────────────────── */}
      {toast && (
        <div className="fixed bottom-6 right-6 z-[100] px-4 py-2.5 rounded-lg shadow-lg text-sm font-medium bg-stone-800 text-white">
          {toast}
        </div>
      )}
    </div>
  )
}

// ══════════════════════════════════════════════════════════════════
// SUB-COMPONENTS
// ══════════════════════════════════════════════════════════════════

function Label({ children }: { children: React.ReactNode }) {
  return (
    <div className="text-xs font-medium text-muted-foreground mb-2 select-none">
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
      className={`rounded-lg font-medium transition-all border ${
        sm ? 'px-2 py-1 text-[11px]' : 'px-3 py-1.5 text-xs'
      } ${
        active
          ? 'bg-stone-800 text-white border-stone-800'
          : variant === 'ghost'
            ? 'border-dashed border-muted-foreground/40 text-muted-foreground hover:bg-accent/50'
            : 'border-input text-muted-foreground hover:bg-accent/50'
      }`}
    >
      {label}
    </button>
  )
}

function MicroPill({ label, variant }: { label: string; variant: 'default' | 'muted' | 'filled' }) {
  const classes = {
    default: 'border-input text-muted-foreground',
    muted: 'border-stone-300 text-stone-500',
    filled: 'bg-stone-100 border-stone-300 text-stone-700',
  }
  return (
    <span className={`inline-block px-1.5 py-0.5 rounded text-[10px] border ${classes[variant]}`}>
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
      <div className="text-xs font-medium text-muted-foreground mb-1">
        {label}
      </div>
      <select
        value={value}
        onChange={e => onChange(e.target.value)}
        className={`rounded-lg border bg-background px-3 py-1.5 pr-8 text-xs outline-none cursor-pointer ${
          value ? 'border-stone-800 text-stone-800' : 'border-input text-muted-foreground'
        }`}
      >
        <option value="">All</option>
        {options.map(opt => (
          <option key={opt} value={opt}>{opt}</option>
        ))}
      </select>
    </div>
  )
}
