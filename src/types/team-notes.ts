// ── Team Notes Types ──────────────────────────────────────────────

export interface TeamNote {
  id: string
  couple_id: string | null
  couple_name: string | null
  shooters: string[]
  wedding_phase: string[]
  severity: 'low' | 'medium' | 'high'
  note: string
  is_lesson: boolean
  created_at: string
  tags?: NoteIssueTag[]
}

export interface NoteIssueTag {
  id: string
  tag: string
  usage_count: number
  created_at: string
}

export interface NoteTagLink {
  note_id: string
  tag_id: string
}

// ── Form Types ───────────────────────────────────────────────────

export interface TeamNoteFormData {
  couple_id: string
  couple_name: string
  shooters: string[]
  wedding_phase: string[]
  severity: 'low' | 'medium' | 'high'
  note: string
  is_lesson: boolean
  tag_ids: string[]
  new_tags: string[]
}

// ── API Request/Response ─────────────────────────────────────────

export interface CreateTeamNoteRequest {
  couple_id: string
  couple_name: string
  shooters: string[]
  wedding_phase: string[]
  severity: 'low' | 'medium' | 'high'
  note: string
  is_lesson: boolean
  tag_ids: string[]
  new_tags: string[]
}

export interface TeamNoteWithTags extends TeamNote {
  tags: NoteIssueTag[]
}

export interface CoupleOption {
  id: string
  couple_name: string
  wedding_date: string | null
  wedding_year: number | null
}

// ── Constants ────────────────────────────────────────────────────

export const SHOOTERS = [
  'Jean', 'Cole', 'Jey', 'Ryan', 'Nikki', 'Alex A', 'Isaac', 'Camille'
] as const

export const WEDDING_PHASES = [
  'Bride House', 'Groom House', 'Ceremony', 'First Look', 'Park',
  '2nd Park', 'Studio', 'Extra Location', 'Pre-Reception', 'Cocktail Hour',
  'Reception B-Roll', 'Wedding Intro', 'First Dance', 'Speeches',
  'Parent Dances', 'Special Performance', 'Dancing Footage',
  'Late Night Food', 'Garter', 'Bouquet', 'Goodbye'
] as const

export const SEVERITIES = ['low', 'medium', 'high'] as const
export type Severity = typeof SEVERITIES[number]
