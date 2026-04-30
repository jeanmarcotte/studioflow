'use client'

import React, { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { Layout } from '@/components/layout/layout'
import { studioflowClientConfig } from '@/config/sidebar'
import { supabase } from '@/lib/supabase'
import { ArrowLeft, Printer } from 'lucide-react'
import { formatWeddingDate, formatDate, formatCurrency } from '@/lib/formatters'

interface C3LineItem {
  id: string
  couple_id: string
  product_code: string | null
  quantity: number
  unit_price: number
  tax_mode: string | null
  subtotal: number
  hst: number
  total: number
  notes: string | null
  payment_note: string | null
  invoice_date: string
  created_at: string
}

interface CatalogItem {
  product_code: string
  item_name: string
  category: string | null
}

interface Couple {
  id: string
  couple_name: string
  wedding_date: string | null
  bride_email: string | null
  groom_email: string | null
}

export default function ExtraDetailPage() {
  const router = useRouter()
  const params = useParams()
  const id = params.id as string

  const [item, setItem] = useState<C3LineItem | null>(null)
  const [catalog, setCatalog] = useState<CatalogItem | null>(null)
  const [couple, setCouple] = useState<Couple | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchData() {
      const { data, error } = await supabase
        .from('c3_line_items')
        .select('*')
        .eq('id', id)
        .limit(1)

      if (error || !data || data.length === 0) {
        console.error('Error fetching extra:', error)
        setLoading(false)
        return
      }

      const row = data[0]
      setItem(row)

      if (row.product_code) {
        const { data: catData } = await supabase
          .from('product_catalog')
          .select('product_code, item_name, category')
          .eq('product_code', row.product_code)
          .limit(1)
        setCatalog(catData?.[0] ?? null)
      }

      const { data: coupleData } = await supabase
        .from('couples')
        .select('id, couple_name, wedding_date, bride_email, groom_email')
        .eq('id', row.couple_id)
        .limit(1)

      setCouple(coupleData?.[0] ?? null)
      setLoading(false)
    }

    fetchData()
  }, [id])

  if (loading) {
    return (
      <Layout sidebarConfig={studioflowClientConfig}>
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
        </div>
      </Layout>
    )
  }

  if (!item) {
    return (
      <Layout sidebarConfig={studioflowClientConfig}>
        <div className="text-center py-12">
          <p className="text-lg font-medium text-muted-foreground">Extra not found</p>
          <button
            onClick={() => router.push('/client/extras')}
            className="mt-4 text-sm text-primary hover:underline"
          >
            Back to Extras
          </button>
        </div>
      </Layout>
    )
  }

  const itemName = catalog?.item_name || item.product_code || '—'

  return (
    <Layout sidebarConfig={studioflowClientConfig}>
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center justify-between mb-6 print:hidden">
          <button
            onClick={() => router.push('/client/extras')}
            className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Extras
          </button>
          <button
            onClick={() => window.print()}
            className="inline-flex items-center gap-2 rounded-lg border px-3 py-1.5 text-sm hover:bg-muted"
          >
            <Printer className="h-3.5 w-3.5" />
            Print
          </button>
        </div>

        <div className="bg-background rounded-lg border p-8 print:border-0 print:shadow-none">
          <div className="flex justify-between items-start mb-8">
            <div>
              <h1 className="text-2xl font-bold text-foreground">SIGS Photography</h1>
              <p className="text-sm text-muted-foreground mt-1">Additional Services Invoice</p>
            </div>
            <div className="text-right">
              <div className="text-sm text-muted-foreground">
                <p className="font-medium">Invoice Date</p>
                <p>{formatDate(item.invoice_date)}</p>
              </div>
            </div>
          </div>

          <div className="border-t border-b py-4 mb-6">
            <p className="text-sm text-muted-foreground">Bill To</p>
            <p className="font-medium text-foreground">{couple?.couple_name || 'Unknown'}</p>
            {couple?.wedding_date && (
              <p className="text-sm text-muted-foreground">Wedding: {formatWeddingDate(couple.wedding_date)}</p>
            )}
            {couple?.bride_email && (
              <p className="text-sm text-muted-foreground">{couple.bride_email}</p>
            )}
          </div>

          <table className="w-full text-sm mb-6">
            <thead>
              <tr className="border-b text-left text-muted-foreground">
                <th className="pb-2 font-medium">Item</th>
                <th className="pb-2 font-medium text-center">Qty</th>
                <th className="pb-2 font-medium text-right">Unit Price</th>
                <th className="pb-2 font-medium text-right">Amount</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b">
                <td className="py-3">
                  <p className="font-medium text-foreground">{itemName}</p>
                  {item.product_code && <p className="font-mono text-muted-foreground text-xs mt-0.5">{item.product_code}</p>}
                  {item.notes && <p className="text-muted-foreground text-xs mt-0.5">{item.notes}</p>}
                </td>
                <td className="py-3 text-center">{item.quantity}</td>
                <td className="py-3 text-right">{formatCurrency(item.unit_price)}</td>
                <td className="py-3 text-right">{formatCurrency(item.subtotal)}</td>
              </tr>
            </tbody>
          </table>

          <div className="flex justify-end">
            <div className="w-64 space-y-1 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Subtotal</span>
                <span>{formatCurrency(item.subtotal)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">HST (13%)</span>
                <span>{formatCurrency(item.hst)}</span>
              </div>
              <div className="flex justify-between border-t pt-2 font-bold text-base">
                <span>Total</span>
                <span>{formatCurrency(item.total)}</span>
              </div>
            </div>
          </div>

          {item.payment_note && (
            <div className="mt-8 pt-4 border-t">
              <p className="text-xs text-muted-foreground">Payment Note</p>
              <p className="text-sm text-foreground">{item.payment_note}</p>
            </div>
          )}

          <div className="mt-12 pt-4 border-t text-center text-xs text-muted-foreground">
            <p>SIGS Photography &middot; studio.sigsphoto.ca</p>
          </div>
        </div>
      </div>
    </Layout>
  )
}
