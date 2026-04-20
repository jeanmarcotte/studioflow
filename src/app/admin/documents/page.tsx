'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { DocumentsTable } from './DocumentsTable'

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
  has_quote: boolean
  has_wedding_day_form: boolean
  has_photo_order: boolean
  has_video_order: boolean
}

export default function DocumentsPage() {
  const [rows, setRows] = useState<CoupleDocRow[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    async function load() {
      setIsLoading(true)
      try {
        // 1. Fetch couples
        const { data: couples } = await supabase
          .from('couples')
          .select('id, bride_first_name, groom_first_name, wedding_date, status, email')
          .gte('wedding_date', '2025-01-01')
          .lte('wedding_date', '2028-12-31')
          .order('wedding_date', { ascending: false })

        if (!couples || couples.length === 0) {
          setRows([])
          return
        }

        // 2-8. Batch fetch all document tables
        const [
          { data: contracts },
          { data: extrasOrders },
          { data: clientExtras },
          { data: clientQuotes },
          { data: weddingDayForms },
          { data: photoOrders },
          { data: videoOrders },
        ] = await Promise.all([
          supabase.from('contracts').select('id, couple_id'),
          supabase.from('extras_orders').select('id, couple_id'),
          supabase.from('client_extras').select('couple_id'),
          supabase.from('client_quotes').select('couple_id'),
          supabase.from('wedding_day_forms').select('couple_id'),
          supabase.from('photo_orders').select('couple_id'),
          supabase.from('video_orders').select('couple_id'),
        ])

        // Build lookup sets/maps
        const contractMap = new Map<string, string[]>()
        ;(contracts || []).forEach((c: any) => {
          const arr = contractMap.get(c.couple_id) || []
          arr.push(c.id)
          contractMap.set(c.couple_id, arr)
        })

        const extrasOrderMap = new Map<string, string[]>()
        ;(extrasOrders || []).forEach((o: any) => {
          const arr = extrasOrderMap.get(o.couple_id) || []
          arr.push(o.id)
          extrasOrderMap.set(o.couple_id, arr)
        })

        const extrasSet = new Set((clientExtras || []).map((r: any) => r.couple_id))
        const quotesSet = new Set((clientQuotes || []).map((r: any) => r.couple_id))
        const wdfSet = new Set((weddingDayForms || []).map((r: any) => r.couple_id))
        const pofSet = new Set((photoOrders || []).map((r: any) => r.couple_id))
        const vofSet = new Set((videoOrders || []).map((r: any) => r.couple_id))

        // Combine
        const result: CoupleDocRow[] = couples.map((c: any) => ({
          id: c.id,
          bride_first_name: c.bride_first_name || '',
          groom_first_name: c.groom_first_name || '',
          wedding_date: c.wedding_date || '',
          status: c.status || 'lead',
          email: c.email || null,
          contract_ids: contractMap.get(c.id) || [],
          extras_order_ids: extrasOrderMap.get(c.id) || [],
          has_extras: extrasSet.has(c.id),
          has_quote: quotesSet.has(c.id),
          has_wedding_day_form: wdfSet.has(c.id),
          has_photo_order: pofSet.has(c.id),
          has_video_order: vofSet.has(c.id),
        }))

        setRows(result)
      } catch (err) {
        console.error('[DocumentsPage] Failed to load:', err)
      } finally {
        setIsLoading(false)
      }
    }
    load()
  }, [])

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    )
  }

  return (
    <div className="space-y-0">
      <div className="border-b border-border bg-background px-6 py-4">
        <h1 className="text-2xl font-bold tracking-tight">Documents</h1>
        <p className="text-sm text-muted-foreground mt-1">{rows.length} couples (2025 — 2028)</p>
      </div>
      <div className="p-6">
        <DocumentsTable data={rows} />
      </div>
    </div>
  )
}
