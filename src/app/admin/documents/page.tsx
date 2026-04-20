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
  extras_order_ids: string[]   // only signed/paid/completed
  has_extras: boolean
  wdf_ids: string[]
  pof_ids: string[]
  vof_ids: string[]
}

export default function DocumentsPage() {
  const [rows, setRows] = useState<CoupleDocRow[]>([])
  const [isLoading, setIsLoading] = useState(true)

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

        if (!couples || couples.length === 0) {
          setRows([])
          return
        }

        const [
          { data: contracts },
          { data: extrasOrders },
          { data: clientExtras },
          { data: weddingDayForms },
          { data: photoOrders },
          { data: videoOrders },
        ] = await Promise.all([
          supabase.from('contracts').select('id, couple_id'),
          supabase.from('extras_orders').select('id, couple_id, status'),
          supabase.from('client_extras').select('couple_id'),
          supabase.from('wedding_day_forms').select('id, couple_id'),
          supabase.from('photo_orders').select('id, couple_id'),
          supabase.from('video_orders').select('id, couple_id'),
        ])

        // Build lookup maps
        const contractMap = new Map<string, string[]>()
        ;(contracts || []).forEach((c: any) => {
          const arr = contractMap.get(c.couple_id) || []
          arr.push(c.id)
          contractMap.set(c.couple_id, arr)
        })

        // Only signed/paid/completed extras orders
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
          if (r.couple_id) {
            const arr = wdfMap.get(r.couple_id) || []
            arr.push(r.id)
            wdfMap.set(r.couple_id, arr)
          }
        })

        const pofMap = new Map<string, string[]>()
        ;(photoOrders || []).forEach((r: any) => {
          if (r.couple_id) {
            const arr = pofMap.get(r.couple_id) || []
            arr.push(r.id)
            pofMap.set(r.couple_id, arr)
          }
        })

        const vofMap = new Map<string, string[]>()
        ;(videoOrders || []).forEach((r: any) => {
          if (r.couple_id) {
            const arr = vofMap.get(r.couple_id) || []
            arr.push(r.id)
            vofMap.set(r.couple_id, arr)
          }
        })

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
          wdf_ids: wdfMap.get(c.id) || [],
          pof_ids: pofMap.get(c.id) || [],
          vof_ids: vofMap.get(c.id) || [],
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
