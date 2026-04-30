'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { formatWeddingDate, formatCurrency } from '@/lib/formatters'
import type { HistoricalCouple, Company } from './historicalArchiveTypes'

interface HistoricalCoupleSheetProps {
  couple: HistoricalCouple | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

interface DriveRow {
  folder_type: string
  drive_name: string | null
  size_gb: number | null
  file_count: number | null
}

interface ChargeRow {
  contract_type: string
  amount: number | null
}

interface ArchiveSlot {
  key: string
  label: string
  found: DriveRow | null
  marketing?: 'yes' | 'no'
}

const ARCHIVE_TEMPLATE: { key: string; label: string }[] = [
  { key: 'engagement', label: 'Engagement Project' },
  { key: 'engagement_album', label: 'Engagement Album' },
  { key: 'wed_raw', label: 'Wedding Photo RAW' },
  { key: 'wed_project', label: 'Wedding Photo Project' },
  { key: 'hires', label: 'Hi-Res Wedding Photos' },
  { key: 'album', label: 'Wedding Album' },
  { key: 'wed_video_project', label: 'Long Form Video' },
  { key: 'recap_video', label: 'Recap Video' },
  { key: 'wed_video_raw', label: 'Wedding Video RAW' },
]

const MARKETING_KEYS = new Set(['wed_video_project', 'recap_video'])

function companyOf(c: HistoricalCouple): Company {
  if (c.wedding_date) {
    return c.wedding_date >= '2016-05-01' ? 'SIGS' : 'Excellence'
  }
  if (c.wedding_year != null) {
    return c.wedding_year >= 2016 ? 'SIGS' : 'Excellence'
  }
  return 'Unknown'
}

function fmtGb(gb: number | null | undefined): string {
  if (gb == null) return '—'
  return `${gb.toFixed(1)} GB`
}

export function HistoricalCoupleSheet({
  couple,
  open,
  onOpenChange,
}: HistoricalCoupleSheetProps) {
  const [drives, setDrives] = useState<DriveRow[] | null>(null)
  const [charges, setCharges] = useState<ChargeRow[] | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!open || !couple) {
      setDrives(null)
      setCharges(null)
      return
    }
    let cancelled = false
    setLoading(true)
    ;(async () => {
      const driveQuery = supabase
        .from('drive_contents')
        .select('folder_type, drive_name, size_gb, file_count')
        .eq('historical_profile_id', couple.id)

      const chargesQuery = couple.couple_id
        ? supabase
            .from('couple_charges')
            .select('contract_type, amount')
            .eq('couple_id', couple.couple_id)
        : Promise.resolve({ data: [] as ChargeRow[], error: null })

      const [driveRes, chargesRes] = await Promise.all([driveQuery, chargesQuery])
      if (cancelled) return
      setDrives((driveRes.data ?? []) as DriveRow[])
      setCharges(((chargesRes as any).data ?? []) as ChargeRow[])
      setLoading(false)
    })()
    return () => {
      cancelled = true
    }
  }, [open, couple])

  if (!couple) return null

  const company = companyOf(couple)
  const bride = [couple.bride_first_name, couple.bride_last_name].filter(Boolean).join(' ').trim()
  const groom = [couple.groom_first_name, couple.groom_last_name].filter(Boolean).join(' ').trim()
  const titleName = [bride || null, groom || null].filter(Boolean).join(' & ') || 'Unknown couple'

  const brideContact = [couple.bride_email, couple.phone_1].filter(Boolean).join(' · ')
  const groomContact = [couple.groom_email, couple.phone_2].filter(Boolean).join(' · ')
  const hasContact = bride || groom || brideContact || groomContact

  const venues = [
    couple.ceremony_venue ? { label: 'Ceremony', value: couple.ceremony_venue } : null,
    couple.park_name ? { label: 'Park', value: couple.park_name } : null,
    couple.reception_venue ? { label: 'Reception', value: couple.reception_venue } : null,
  ].filter((v): v is { label: string; value: string } => !!v)

  const chargeAmount = (type: 'C1' | 'C2' | 'C3'): number | null => {
    if (!charges || charges.length === 0) return null
    const sum = charges
      .filter(c => c.contract_type === type)
      .reduce((s, c) => s + (Number(c.amount) ?? 0), 0)
    return sum > 0 ? sum : null
  }
  const c1 = chargeAmount('C1')
  const c2 = chargeAmount('C2')
  const c3 = chargeAmount('C3')

  const archiveSlots: ArchiveSlot[] = ARCHIVE_TEMPLATE.map(({ key, label }) => {
    const match = drives?.find(d => d.folder_type === key) ?? null
    let marketing: 'yes' | 'no' | undefined
    if (MARKETING_KEYS.has(key)) {
      const onMarketing = !!drives?.some(
        d =>
          d.folder_type === key &&
          d.drive_name &&
          d.drive_name.toLowerCase().includes('marketing'),
      )
      marketing = onMarketing ? 'yes' : 'no'
    }
    return { key, label, found: match, marketing }
  })

  const foundCount = archiveSlots.filter(s => s.found).length
  const driveSet = new Set(
    archiveSlots
      .map(s => s.found?.drive_name)
      .filter((d): d is string => !!d),
  )
  const totalGb = archiveSlots.reduce((sum, s) => sum + (Number(s.found?.size_gb) || 0), 0)

  const showFinancials = couple.couple_id != null && (c1 != null || c2 != null || c3 != null)
  const noFinancialsMsg = couple.couple_id == null

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="w-full sm:max-w-[480px] lg:max-w-[480px] overflow-y-auto p-0"
      >
        <SheetHeader className="px-5 pt-5 pb-3 border-b">
          <div className="flex items-start justify-between gap-3">
            <SheetTitle className="text-lg font-semibold leading-snug">
              {titleName}
            </SheetTitle>
            {couple.wedding_year != null && (
              <span className="text-sm text-muted-foreground font-medium">
                {couple.wedding_year}
              </span>
            )}
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            {company === 'Unknown' ? 'Company unknown' : `${company} Photography`}
          </p>
          {couple.wedding_date && (
            <p className="text-sm font-medium mt-2">
              {formatWeddingDate(couple.wedding_date)}
            </p>
          )}
        </SheetHeader>

        <div className="px-5 pb-6 space-y-6">
          {hasContact && (
            <Section title="Contact">
              {bride && (
                <div className="text-sm">
                  <span className="text-muted-foreground">Bride: </span>
                  <span className="font-medium">{bride}</span>
                  {brideContact && (
                    <div className="text-muted-foreground text-xs ml-1">{brideContact}</div>
                  )}
                </div>
              )}
              {groom && (
                <div className="text-sm">
                  <span className="text-muted-foreground">Groom: </span>
                  <span className="font-medium">{groom}</span>
                  {groomContact && (
                    <div className="text-muted-foreground text-xs ml-1">{groomContact}</div>
                  )}
                </div>
              )}
            </Section>
          )}

          {venues.length > 0 && (
            <Section title="Venues">
              {venues.map(v => (
                <div key={v.label} className="text-sm">
                  <span className="text-muted-foreground">{v.label}: </span>
                  <span className="font-medium">{v.value}</span>
                </div>
              ))}
            </Section>
          )}

          <Section title="Financials">
            {noFinancialsMsg ? (
              <p className="text-sm text-muted-foreground">No financial data</p>
            ) : !showFinancials ? (
              <p className="text-sm text-muted-foreground">No financial data</p>
            ) : (
              <div className="space-y-1 text-sm">
                <FinanceRow label="C1 Contract" amount={c1} />
                <FinanceRow label="C2 Frames & Albums" amount={c2} />
                <FinanceRow label="C3 Extras" amount={c3} />
              </div>
            )}
          </Section>

          <Section title="Digital Archive">
            {loading ? (
              <p className="text-sm text-muted-foreground">Loading…</p>
            ) : !drives || drives.length === 0 ? (
              <p className="text-sm text-muted-foreground">No archive data scanned yet</p>
            ) : (
              <>
                <p className="text-xs text-muted-foreground mb-3">
                  {foundCount} asset{foundCount !== 1 ? 's' : ''} across {driveSet.size} drive
                  {driveSet.size !== 1 ? 's' : ''} · {totalGb.toFixed(1)} GB total
                </p>
                <div className="space-y-1.5">
                  {archiveSlots.map(slot => (
                    <ArchiveRow key={slot.key} slot={slot} />
                  ))}
                </div>
                <div className="mt-4 text-sm">
                  <span className="text-muted-foreground">Glacier: </span>
                  <span className="font-medium">{couple.glacier_archived ? 'Yes' : 'No'}</span>
                </div>
              </>
            )}
          </Section>

          {couple.data_confidence && (
            <p className="text-xs text-muted-foreground">Data: {couple.data_confidence}</p>
          )}
        </div>
      </SheetContent>
    </Sheet>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h3 className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-2">
        {title}
      </h3>
      <div className="space-y-1">{children}</div>
    </section>
  )
}

function FinanceRow({ label, amount }: { label: string; amount: number | null }) {
  return (
    <div className="flex items-baseline justify-between">
      <span className="text-muted-foreground">{label}</span>
      <span className={amount == null ? 'text-muted-foreground/60' : 'font-medium tabular-nums'}>
        {amount == null ? '—' : formatCurrency(Math.round(amount))}
      </span>
    </div>
  )
}

function ArchiveRow({ slot }: { slot: ArchiveSlot }) {
  const found = slot.found
  return (
    <div>
      <div className="flex items-baseline justify-between gap-3 text-sm">
        <span className={found ? 'font-medium' : 'text-gray-400'}>{slot.label}</span>
        {found ? (
          <span className="flex items-center gap-3 text-xs">
            <span className="text-muted-foreground">{found.drive_name ?? '—'}</span>
            <span className="tabular-nums font-medium">{fmtGb(found.size_gb)}</span>
          </span>
        ) : (
          <span className="text-gray-400 text-xs">—</span>
        )}
      </div>
      {found && slot.marketing && (
        <div className="text-xs text-muted-foreground ml-3">
          Marketing Drive: {slot.marketing === 'yes' ? 'Yes' : 'No'}
        </div>
      )}
    </div>
  )
}
