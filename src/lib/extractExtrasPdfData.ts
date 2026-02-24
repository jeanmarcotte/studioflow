// Shared types for extras/frames PDF extraction — parsing logic lives in /api/parse-extras-pdf

export interface ExtrasItem {
  name: string
  description: string
  price: number | null
}

export interface ExtractedExtrasData {
  coupleName: string
  items: ExtrasItem[]
  inclusions: string[]
  total: number | null
  remainingBalance: number | null
  paymentSchedule: { milestone: string; amount: number }[] | null
  parseWarnings: string[]
  confidence: 'high' | 'medium' | 'low'
}
