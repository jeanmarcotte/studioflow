export type Company = 'SIGS' | 'Excellence' | 'Unknown'

export interface HistoricalCouple {
  id: string
  couple_id: string | null
  bride_first_name: string | null
  bride_last_name: string | null
  groom_first_name: string | null
  groom_last_name: string | null
  bride_email: string | null
  groom_email: string | null
  phone_1: string | null
  phone_2: string | null
  wedding_date: string | null
  wedding_year: number | null
  ceremony_venue: string | null
  park_name: string | null
  reception_venue: string | null
  glacier_archived: boolean | null
  data_confidence: string | null
}

export function companyFor(c: Pick<HistoricalCouple, 'wedding_date' | 'wedding_year'>): Company {
  if (c.wedding_date) {
    return c.wedding_date >= '2016-05-01' ? 'SIGS' : 'Excellence'
  }
  if (c.wedding_year != null) {
    return c.wedding_year >= 2016 ? 'SIGS' : 'Excellence'
  }
  return 'Unknown'
}
