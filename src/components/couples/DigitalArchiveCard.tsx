'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Package } from 'lucide-react'

interface DriveContentRow {
  folder_type: string
  drive_name: string | null
  size_gb: number | string | null
  folder_name: string | null
}

interface ArchiveMeta {
  on_marketing_drive: boolean | null
  aws_verified: boolean | null
  archive_status: string | null
}

interface ArchiveResponse {
  driveContents: DriveContentRow[]
  archive: ArchiveMeta | null
}

const ARCHIVE_ITEMS: { label: string; folderType: string }[] = [
  { label: 'Engagement Project', folderType: 'engagement' },
  { label: 'Engagement Album', folderType: 'engagement_album' },
  { label: 'Wedding Photo RAW', folderType: 'wed_raw' },
  { label: 'Wedding Photo Project', folderType: 'wed_project' },
  { label: 'Hi-Res Wedding Photos', folderType: 'hires' },
  { label: 'Wedding Album', folderType: 'album' },
  { label: 'Long Form Video', folderType: 'wed_video_project' },
  { label: 'Recap Video', folderType: 'recap_video' },
  { label: 'Wedding Video RAW', folderType: 'wed_video_raw' },
]

function formatGB(value: number | string | null | undefined): string {
  const num = typeof value === 'string' ? parseFloat(value) : value ?? 0
  return `${(num || 0).toFixed(1)} GB`
}

export function DigitalArchiveCard({ coupleId }: { coupleId: string }) {
  const [loading, setLoading] = useState(true)
  const [data, setData] = useState<ArchiveResponse | null>(null)

  useEffect(() => {
    let cancelled = false
    async function load() {
      setLoading(true)
      try {
        const res = await fetch(`/api/couples/${coupleId}/archive`)
        if (!res.ok) throw new Error('Failed to load archive')
        const json = (await res.json()) as ArchiveResponse
        if (!cancelled) setData(json)
      } catch {
        if (!cancelled) setData({ driveContents: [], archive: null })
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => {
      cancelled = true
    }
  }, [coupleId])

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Package className="h-4 w-4 text-teal-600" />
          Digital Archive
        </CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="space-y-2">
            <Skeleton className="h-4 w-64" />
            {Array.from({ length: 9 }).map((_, i) => (
              <Skeleton key={i} className="h-5 w-full" />
            ))}
          </div>
        ) : (
          <ArchiveBody data={data} />
        )}
      </CardContent>
    </Card>
  )
}

function ArchiveBody({ data }: { data: ArchiveResponse | null }) {
  const driveContents = data?.driveContents || []
  const archive = data?.archive ?? null

  if (driveContents.length === 0 && !archive) {
    return <p className="text-sm text-muted-foreground italic">No archive data available.</p>
  }

  const byType = new Map<string, DriveContentRow>()
  for (const row of driveContents) {
    byType.set(row.folder_type, row)
  }

  const foundCount = driveContents.length
  const distinctDrives = new Set(
    driveContents.map(r => r.drive_name).filter((n): n is string => !!n)
  ).size
  const totalGb = driveContents.reduce((sum, r) => {
    const n = typeof r.size_gb === 'string' ? parseFloat(r.size_gb) : r.size_gb ?? 0
    return sum + (n || 0)
  }, 0)

  const longFormIndex = ARCHIVE_ITEMS.findIndex(i => i.folderType === 'wed_video_project')

  return (
    <div className="text-sm">
      <p className="text-muted-foreground mb-3">
        {foundCount} {foundCount === 1 ? 'asset' : 'assets'} across {distinctDrives}{' '}
        {distinctDrives === 1 ? 'drive' : 'drives'} · {totalGb.toFixed(1)} GB total
      </p>

      <div className="space-y-1">
        {ARCHIVE_ITEMS.map((item, idx) => {
          const row = byType.get(item.folderType)
          const found = !!row
          return (
            <div key={item.folderType}>
              <div className="grid grid-cols-[1fr_auto_auto] gap-3 items-baseline py-1">
                <span className={found ? 'font-semibold text-foreground' : 'text-muted-foreground/60'}>
                  {item.label}
                </span>
                {found ? (
                  <>
                    <span className="text-muted-foreground text-xs">{row!.drive_name || ''}</span>
                    <span className="text-muted-foreground tabular-nums text-right">
                      {formatGB(row!.size_gb)}
                    </span>
                  </>
                ) : (
                  <>
                    <span />
                    <span className="text-muted-foreground/60 text-right">—</span>
                  </>
                )}
              </div>
              {idx === longFormIndex && (
                <div className="pl-4 py-1 text-xs">
                  <span className="text-muted-foreground">Marketing Drive: </span>
                  <span className="font-semibold text-foreground">
                    {archive == null
                      ? '—'
                      : archive.on_marketing_drive
                      ? 'Yes'
                      : 'No'}
                  </span>
                </div>
              )}
            </div>
          )
        })}
      </div>

      <div className="mt-3 pt-3 border-t text-sm">
        <span className="text-muted-foreground">Glacier: </span>
        {archive == null ? (
          <span className="font-semibold text-foreground">—</span>
        ) : archive.aws_verified ? (
          <span className="font-semibold text-green-700">Yes</span>
        ) : (
          <span className="font-semibold text-foreground">No</span>
        )}
      </div>
    </div>
  )
}
