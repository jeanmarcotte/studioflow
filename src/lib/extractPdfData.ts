// Shared types for PDF extraction — parsing logic lives in /api/parse-pdf

export interface ExtractedPdfData {
  fileName: string

  // Couple info
  brideFirstName: string
  brideLastName: string
  groomFirstName: string
  groomLastName: string
  brideEmail: string
  groomEmail: string
  bridePhone: string
  groomPhone: string

  // Wedding details
  weddingDate: string | null
  weddingDateDisplay: string
  ceremonyVenue: string
  receptionVenue: string
  guestCount: number | null
  bridalPartyCount: number | null

  // Package
  packageType: 'photo_only' | 'photo_video' | null
  packageName: string
  coverageHours: number | null

  // Pricing
  subtotal: number | null
  discount: number | null
  hst: number | null
  total: number | null

  // Derived for couple record
  coupleName: string
  weddingYear: number | null

  // Quality indicators
  parseWarnings: string[]
  confidence: 'high' | 'medium' | 'low'
}
