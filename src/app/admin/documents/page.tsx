'use client'

import { useEffect, useMemo, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { DocumentsTable } from './DocumentsTable'
import { Files, FileText, Image, ShoppingBag, Calendar, Camera, Video, Package } from 'lucide-react'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet'
import { parseISO, format } from 'date-fns'

export interface CoupleDocRow {
  id: string
  bride_first_name: string
  groom_first_name: string
  wedding_date: string
  status: string
  email: string | null
  contract_ids: string[]
  extras_order_ids: string[]
  has_extras: boolean
  wdf_ids: string[]
  pof_ids: string[]
  vof_ids: string[]
  photo_order_ids: string[]
  video_order_ids: string[]
}

type SheetType = 'total' | 'contracts' | 'frames' | 'extras' | 'dayForms' | 'photoOrders' | 'videoOrders' | 'photoProdOrders' | 'videoProdOrders' | null

function formatDateDow(date: string): string {
  if (!date) return '—'
  try {
    const parsed = parseISO(date)
    return `${format(parsed, 'EEE').toUpperCase()} ${format(parsed, 'MMM d, yyyy')}`
  } catch { return '—' }
}

function yearSortPriority(year: number): number {
  const current = new Date().getFullYear()
  if (year === current) return 0
  if (year > current) return 1 + (year - current)
  return 100 + (current - year)
}

export default function DocumentsPage() {
  const [rows, setRows] = useState<CoupleDocRow[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [sheetType, setSheetType] = useState<SheetType>(null)

  useEffect(() => {
    async function load() {
      setIsLoading(true)
      try {
        const { data: couples } = await supabase
          .from('couples')
          .select('id, bride_first_name, groom_first_name, wedding_date, status, email')
          .gte('wedding_date', '2025-01-01')
          .lte('wedding_date', '2028-12-31')
          .order('wedding_date', { ascending: true })

        if (!couples || couples.length === 0) { setRows([]); return }

        const [
          { data: contracts },
          { data: extrasOrders },
          { data: clientExtras },
          { data: weddingDayForms },
          { data: photoOrders },
          { data: videoOrders },
          { data: clientOrders },
        ] = await Promise.all([
          supabase.from('contracts').select('id, couple_id'),
          supabase.from('extras_orders').select('id, couple_id, status'),
          supabase.from('client_extras').select('couple_id'),
          supabase.from('wedding_day_forms').select('id, couple_id'),
          supabase.from('photo_orders').select('id, couple_id'),
          supabase.from('video_orders').select('id, couple_id'),
          supabase.from('client_orders').select('id, couple_id, order_type'),
        ])

        const contractMap = new Map<string, string[]>()
        ;(contracts || []).forEach((c: any) => {
          const arr = contractMap.get(c.couple_id) || []
          arr.push(c.id)
          contractMap.set(c.couple_id, arr)
        })

        const extrasOrderMap = new Map<string, string[]>()
        ;(extrasOrders || []).forEach((o: any) => {
          if (['signed', 'paid', 'completed'].includes(o.status)) {
            const arr = extrasOrderMap.get(o.couple_id) || []
            arr.push(o.id)
            extrasOrderMap.set(o.couple_id, arr)
          }
        })

        const extrasSet = new Set((clientExtras || []).map((r: any) => r.couple_id))

        const wdfMap = new Map<string, string[]>()
        ;(weddingDayForms || []).forEach((r: any) => {
          if (r.couple_id) { const arr = wdfMap.get(r.couple_id) || []; arr.push(r.id); wdfMap.set(r.couple_id, arr) }
        })

        const pofMap = new Map<string, string[]>()
        ;(photoOrders || []).forEach((r: any) => {
          if (r.couple_id) { const arr = pofMap.get(r.couple_id) || []; arr.push(r.id); pofMap.set(r.couple_id, arr) }
        })

        const vofMap = new Map<string, string[]>()
        ;(videoOrders || []).forEach((r: any) => {
          if (r.couple_id) { const arr = vofMap.get(r.couple_id) || []; arr.push(r.id); vofMap.set(r.couple_id, arr) }
        })

        const photoProdMap = new Map<string, string[]>()
        const videoProdMap = new Map<string, string[]>()
        ;(clientOrders || []).forEach((r: any) => {
          if (!r.couple_id) return
          const map = r.order_type === 'video' ? videoProdMap : photoProdMap
          const arr = map.get(r.couple_id) || []
          arr.push(r.id)
          map.set(r.couple_id, arr)
        })

        setRows(couples.map((c: any) => ({
          id: c.id,
          bride_first_name: c.bride_first_name || '',
          groom_first_name: c.groom_first_name || '',
          wedding_date: c.wedding_date || '',
          status: c.status || 'lead',
          email: c.email || null,
          contract_ids: contractMap.get(c.id) || [],
          extras_order_ids: extrasOrderMap.get(c.id) || [],
          has_extras: extrasSet.has(c.id),
          wdf_ids: wdfMap.get(c.id) || [],
          pof_ids: pofMap.get(c.id) || [],
          vof_ids: vofMap.get(c.id) || [],
          photo_order_ids: photoProdMap.get(c.id) || [],
          video_order_ids: videoProdMap.get(c.id) || [],
        })))
      } catch (err) {
        console.error('[DocumentsPage] Failed to load:', err)
      } finally {
        setIsLoading(false)
      }
    }
    load()
  }, [])

  // Metrics
  const metrics = useMemo(() => {
    const contracts = rows.filter(r => r.contract_ids.length > 0).length
    const frames = rows.filter(r => r.extras_order_ids.length > 0).length
    const extras = rows.filter(r => r.has_extras).length
    const dayForms = rows.filter(r => r.wdf_ids.length > 0).length
    const photoOrders = rows.filter(r => r.pof_ids.length > 0).length
    const videoOrders = rows.filter(r => r.vof_ids.length > 0).length
    const photoProdOrders = rows.filter(r => r.photo_order_ids.length > 0).length
    const videoProdOrders = rows.filter(r => r.video_order_ids.length > 0).length
    return { total: contracts + frames + extras, contracts, frames, extras, dayForms, photoOrders, videoOrders, photoProdOrders, videoProdOrders }
  }, [rows])

  // Sheet data
  const sheetData = useMemo(() => {
    if (!sheetType) return { title: '', couples: [] as CoupleDocRow[] }

    const filterMap: Record<string, (r: CoupleDocRow) => boolean> = {
      total: r => r.contract_ids.length > 0 || r.extras_order_ids.length > 0 || r.has_extras,
      contracts: r => r.contract_ids.length > 0,
      frames: r => r.extras_order_ids.length > 0,
      extras: r => r.has_extras,
      dayForms: r => r.wdf_ids.length > 0,
      photoOrders: r => r.pof_ids.length > 0,
      videoOrders: r => r.vof_ids.length > 0,
      photoProdOrders: r => r.photo_order_ids.length > 0,
      videoProdOrders: r => r.video_order_ids.length > 0,
    }

    const titles: Record<string, string> = {
      total: 'Total Documents',
      contracts: 'Contracts',
      frames: 'Frames & Albums',
      extras: 'Extras',
      dayForms: 'Day Forms',
      photoOrders: 'Photo Orders',
      videoOrders: 'Video Orders',
      photoProdOrders: 'Photo Production Orders',
      videoProdOrders: 'Video Production Orders',
    }

    const couples = rows.filter(filterMap[sheetType] || (() => false))
    return { title: titles[sheetType] || '', couples }
  }, [sheetType, rows])

  // Group couples by year for sheet display
  const sheetGroups = useMemo(() => {
    const groups: Record<number, CoupleDocRow[]> = {}
    sheetData.couples.forEach(c => {
      const year = c.wedding_date ? parseISO(c.wedding_date).getFullYear() : 2026
      if (!groups[year]) groups[year] = []
      groups[year].push(c)
    })
    const sortedYears = Object.keys(groups).map(Number).sort((a, b) => yearSortPriority(a) - yearSortPriority(b))
    return sortedYears.map(year => ({ year, couples: groups[year] }))
  }, [sheetData])

  function getDocUrl(couple: CoupleDocRow): string {
    if (!sheetType) return '#'
    switch (sheetType) {
      case 'total':
      case 'contracts': return couple.contract_ids[0] ? `/admin/contracts/${couple.contract_ids[0]}/view` : '#'
      case 'frames': return couple.extras_order_ids[0] ? `/admin/albums/${couple.extras_order_ids[0]}/view` : '#'
      case 'extras': return `/admin/extras/${couple.id}/view`
      case 'dayForms': return couple.wdf_ids[0] ? `/admin/documents/wedding-day-form/${couple.wdf_ids[0]}` : '#'
      case 'photoOrders': return couple.pof_ids[0] ? `/admin/documents/photo-order/${couple.pof_ids[0]}` : '#'
      case 'videoOrders': return couple.vof_ids[0] ? `/admin/documents/video-order/${couple.vof_ids[0]}` : '#'
      case 'photoProdOrders': return couple.photo_order_ids[0] ? `/admin/orders/${couple.photo_order_ids[0]}/view` : '#'
      case 'videoProdOrders': return couple.video_order_ids[0] ? `/admin/orders/${couple.video_order_ids[0]}/view` : '#'
      default: return '#'
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    )
  }

  return (
    <div className="space-y-0">
      <div className="border-b border-border bg-background px-4 md:px-6 py-4">
        <h1 className="text-xl md:text-2xl font-bold tracking-tight">Documents</h1>
        <p className="text-sm text-muted-foreground mt-1">{rows.length} couples (2025 — 2028)</p>
      </div>

      {/* Mobile: Sidebar cards as horizontal scroll row */}
      <div className="lg:hidden px-4 pt-4">
        <div className="flex gap-3 overflow-x-auto pb-2 -mx-4 px-4 scroll-smooth">
          <button onClick={() => setSheetType('dayForms')} className="bg-white border rounded-lg p-3 hover:border-blue-400 transition-all text-left min-w-[140px] flex-shrink-0">
            <div className="flex items-center gap-2 text-xs text-gray-500 mb-1">
              <Calendar size={12} />
              <span>Day Forms</span>
            </div>
            <div className="text-xl font-bold">{metrics.dayForms}</div>
          </button>
          <button onClick={() => setSheetType('photoOrders')} className="bg-white border rounded-lg p-3 hover:border-blue-400 transition-all text-left min-w-[140px] flex-shrink-0">
            <div className="flex items-center gap-2 text-xs text-gray-500 mb-1">
              <Camera size={12} />
              <span>Photo Orders</span>
            </div>
            <div className="text-xl font-bold">{metrics.photoOrders}</div>
          </button>
          <button onClick={() => setSheetType('videoOrders')} className="bg-white border rounded-lg p-3 hover:border-blue-400 transition-all text-left min-w-[140px] flex-shrink-0">
            <div className="flex items-center gap-2 text-xs text-gray-500 mb-1">
              <Video size={12} />
              <span>Video Orders</span>
            </div>
            <div className="text-xl font-bold">{metrics.videoOrders}</div>
          </button>
          <button onClick={() => setSheetType('photoProdOrders')} className="bg-white border rounded-lg p-3 hover:border-blue-400 transition-all text-left min-w-[140px] flex-shrink-0">
            <div className="flex items-center gap-2 text-xs text-gray-500 mb-1">
              <Package size={12} />
              <span>Photo Prod</span>
            </div>
            <div className="text-xl font-bold">{metrics.photoProdOrders}</div>
          </button>
          <button onClick={() => setSheetType('videoProdOrders')} className="bg-white border rounded-lg p-3 hover:border-blue-400 transition-all text-left min-w-[140px] flex-shrink-0">
            <div className="flex items-center gap-2 text-xs text-gray-500 mb-1">
              <Package size={12} />
              <span>Video Prod</span>
            </div>
            <div className="text-xl font-bold">{metrics.videoProdOrders}</div>
          </button>
        </div>
      </div>

      <div className="flex gap-6 p-4 md:p-6">
        {/* LEFT: Main content */}
        <div className="flex-1 min-w-0 space-y-4">
          {/* Top row: 4 clickable cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
            <button onClick={() => setSheetType('total')} className="bg-white border rounded-lg p-4 hover:border-blue-400 hover:shadow-sm transition-all text-left w-full">
              <div className="flex items-center gap-2 text-sm text-gray-500 mb-1">
                <Files size={14} />
                <span>Total Documents</span>
              </div>
              <div className="text-2xl font-bold">{metrics.total}</div>
            </button>
            <button onClick={() => setSheetType('contracts')} className="bg-white border rounded-lg p-4 hover:border-blue-400 hover:shadow-sm transition-all text-left w-full">
              <div className="flex items-center gap-2 text-sm text-gray-500 mb-1">
                <FileText size={14} />
                <span>Contracts</span>
              </div>
              <div className="text-2xl font-bold">{metrics.contracts}</div>
            </button>
            <button onClick={() => setSheetType('frames')} className="bg-white border rounded-lg p-4 hover:border-blue-400 hover:shadow-sm transition-all text-left w-full">
              <div className="flex items-center gap-2 text-sm text-gray-500 mb-1">
                <Image size={14} />
                <span>Frames & Albums</span>
              </div>
              <div className="text-2xl font-bold">{metrics.frames}</div>
            </button>
            <button onClick={() => setSheetType('extras')} className="bg-white border rounded-lg p-4 hover:border-blue-400 hover:shadow-sm transition-all text-left w-full">
              <div className="flex items-center gap-2 text-sm text-gray-500 mb-1">
                <ShoppingBag size={14} />
                <span>Extras</span>
              </div>
              <div className="text-2xl font-bold">{metrics.extras}</div>
            </button>
          </div>

          {/* Table */}
          <DocumentsTable data={rows} />
        </div>

        {/* RIGHT: Sidebar — desktop only */}
        <div className="hidden lg:block w-72 shrink-0 space-y-4">
          <button onClick={() => setSheetType('dayForms')} className="bg-white border rounded-lg p-4 hover:border-blue-400 hover:shadow-sm transition-all text-left w-full">
            <div className="flex items-center gap-2 text-sm text-gray-500 mb-1">
              <Calendar size={14} />
              <span>Day Forms</span>
            </div>
            <div className="text-2xl font-bold">{metrics.dayForms}</div>
          </button>
          <button onClick={() => setSheetType('photoOrders')} className="bg-white border rounded-lg p-4 hover:border-blue-400 hover:shadow-sm transition-all text-left w-full">
            <div className="flex items-center gap-2 text-sm text-gray-500 mb-1">
              <Camera size={14} />
              <span>Photo Orders</span>
            </div>
            <div className="text-2xl font-bold">{metrics.photoOrders}</div>
          </button>
          <button onClick={() => setSheetType('videoOrders')} className="bg-white border rounded-lg p-4 hover:border-blue-400 hover:shadow-sm transition-all text-left w-full">
            <div className="flex items-center gap-2 text-sm text-gray-500 mb-1">
              <Video size={14} />
              <span>Video Orders</span>
            </div>
            <div className="text-2xl font-bold">{metrics.videoOrders}</div>
          </button>
          <div className="border-t pt-4 mt-2">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Production Orders</p>
            <div className="space-y-3">
              <button onClick={() => setSheetType('photoProdOrders')} className="bg-white border rounded-lg p-4 hover:border-blue-400 hover:shadow-sm transition-all text-left w-full">
                <div className="flex items-center gap-2 text-sm text-gray-500 mb-1">
                  <Package size={14} />
                  <span>Photo Prod Orders</span>
                </div>
                <div className="text-2xl font-bold">{metrics.photoProdOrders}</div>
              </button>
              <button onClick={() => setSheetType('videoProdOrders')} className="bg-white border rounded-lg p-4 hover:border-blue-400 hover:shadow-sm transition-all text-left w-full">
                <div className="flex items-center gap-2 text-sm text-gray-500 mb-1">
                  <Package size={14} />
                  <span>Video Prod Orders</span>
                </div>
                <div className="text-2xl font-bold">{metrics.videoProdOrders}</div>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Sheet popup */}
      <Sheet open={!!sheetType} onOpenChange={(open) => { if (!open) setSheetType(null) }}>
        <SheetContent side="right">
          <SheetHeader>
            <SheetTitle>{sheetData.title}</SheetTitle>
            <SheetDescription>{sheetData.couples.length} couples</SheetDescription>
          </SheetHeader>
          <div className="overflow-y-auto flex-1 px-4 pb-4">
            {sheetGroups.map(({ year, couples }) => (
              <div key={year} className="mb-6">
                <h3 className="text-sm font-semibold text-gray-500 uppercase mb-2">{year}</h3>
                <div className="space-y-1">
                  {couples.map(couple => (
                    <a
                      key={couple.id}
                      href={getDocUrl(couple)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center justify-between px-3 py-2 rounded-md hover:bg-gray-50 cursor-pointer"
                    >
                      <span className="font-medium text-sm">{couple.bride_first_name} & {couple.groom_first_name}</span>
                      <span className="text-xs text-gray-400">{formatDateDow(couple.wedding_date)}</span>
                    </a>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </SheetContent>
      </Sheet>
    </div>
  )
}
