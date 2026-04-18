'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { Loader2 } from 'lucide-react'
import { format, parseISO } from 'date-fns'
import Image from 'next/image'

function display(value: string | number | null | undefined): string {
  if (value === null || value === undefined || value === '') return 'n/a'
  return String(value)
}

function currency(value: number | string | null | undefined): string {
  if (value === null || value === undefined || value === '') return 'n/a'
  const num = typeof value === 'string' ? parseFloat(value) : value
  if (isNaN(num)) return 'n/a'
  return `$${num.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

export default function AlbumViewPage() {
  const params = useParams()
  const id = params.id as string

  const [order, setOrder] = useState<any>(null)
  const [couple, setCouple] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchData() {
      if (!id) return

      // Try as extras_orders ID first, then as couple_id
      let { data: orderData } = await supabase
        .from('extras_orders')
        .select('*')
        .eq('id', id)
        .limit(1)

      if (!orderData || orderData.length === 0) {
        const { data: byCoupleId } = await supabase
          .from('extras_orders')
          .select('*')
          .eq('couple_id', id)
          .limit(1)
        orderData = byCoupleId
      }

      if (!orderData || orderData.length === 0) {
        setLoading(false)
        return
      }

      const o = orderData[0]
      setOrder(o)

      // Fetch couple + contract for names and wedding date
      const { data: coupleData } = await supabase
        .from('couples')
        .select('couple_name, wedding_date, contracts(day_of_week)')
        .eq('id', o.couple_id)
        .limit(1)
      setCouple(coupleData?.[0] ?? null)

      setLoading(false)
    }

    fetchData()
  }, [id])

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-teal-600" />
      </div>
    )
  }

  if (!order) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-gray-500">Frames & Albums order not found</p>
      </div>
    )
  }

  const coupleName = display(couple?.couple_name)
  const contract = Array.isArray(couple?.contracts) ? couple.contracts[0] : couple?.contracts
  const weddingDateStr = couple?.wedding_date
    ? (() => {
        const d = parseISO(couple.wedding_date)
        const day = contract?.day_of_week?.toUpperCase() || format(d, 'EEEE').toUpperCase()
        return `${day} ${format(d, 'MMMM do, yyyy')}`
      })()
    : 'n/a'

  const signedDateStr = order.order_date
    ? format(parseISO(order.order_date), 'MMMM do, yyyy')
    : 'n/a'

  // Items from JSONB
  const items: Record<string, string> = order.items && typeof order.items === 'object' ? order.items : {}

  // Financials
  const retailValue = parseFloat(order.total || '0')
  const salePrice = parseFloat(order.extras_sale_amount || '0')
  const discount = retailValue - salePrice

  return (
    <div className="min-h-screen bg-gray-100">
      <style jsx global>{`
        .contract-form {
          font-family: 'Courier New', Courier, monospace;
          font-size: 13px;
          line-height: 1.7;
          color: #000;
        }
        .field-wide {
          border-bottom: 1px solid #000;
          display: inline-block;
          min-width: 300px;
          padding: 0 4px;
        }
        .field-med {
          border-bottom: 1px solid #000;
          display: inline;
          min-width: 150px;
          padding: 0 4px;
        }
        .divider {
          border-top: 1px solid #000;
          margin: 20px 0;
        }
        @media print {
          .no-print { display: none !important; }
          @page { size: letter; margin: 0.75in; }
          body { background: white !important; }
        }
      `}</style>

      <div className="max-w-[8.5in] mx-auto bg-white shadow-md print:shadow-none p-10 mb-8 contract-form">
        {/* Header */}
        <div className="flex items-end justify-between mb-2">
          <Image src="/images/sigslogo.png" alt="SIGS Photography" width={180} height={60} />
          <div className="flex items-end gap-4">
            <button
              type="button"
              onClick={() => window.print()}
              className="print:hidden font-mono text-sm tracking-wider uppercase border border-black rounded-none px-3 py-1 hover:bg-black hover:text-white transition-colors cursor-pointer"
            >
              [ PRINT ]
            </button>
            <span className="text-sm">Page | 1</span>
          </div>
        </div>
        <div className="divider" />

        <div className="text-center my-6 pb-4 border-b border-black">
          FRAMES &amp; ALBUMS AGREEMENT
        </div>

        <p>Couple: <span className="field-wide">{coupleName}</span></p>
        <p>Wedding Date: <span className="field-wide">{weddingDateStr}</span></p>
        <p>Signed Date: <span className="field-wide">{signedDateStr}</span></p>

        <div className="divider" />

        {/* Items + Specs side by side */}
        <div className="flex gap-16">
          <div className="flex-1">
            <p className="font-bold mb-2">ITEMS</p>
            <div className="space-y-1">
              {Object.keys(items).length > 0 ? (
                Object.entries(items).map(([key, value]) => (
                  <p key={key}>
                    <span className="capitalize">{key.replace(/_/g, ' ')}</span>: <span className="field-med">{display(value)}</span>
                  </p>
                ))
              ) : (
                <p className="text-gray-400">No items</p>
              )}
            </div>
          </div>
          <div>
            <p className="font-bold mb-2">SPECS</p>
            <div className="space-y-1">
              <p>Album Cover: <span className="field-med">{display(order.album_cover)}</span></p>
              <p>Pages: <span className="field-med">{display(order.album_pages)}</span></p>
              <p>Parent Cover: <span className="field-med">{display(order.parent_album_cover)}</span></p>
            </div>
          </div>
        </div>

        <div className="divider" />

        <p className="font-bold mb-2">FINANCIALS</p>
        <div className="space-y-1">
          <p>Retail Value: <span className="field-med">{currency(order.total)}</span></p>
          <p>Discount: <span className="field-med">-{currency(discount)}</span></p>
          <p>Sale Price: <span className="field-med">{currency(order.extras_sale_amount)}</span></p>
        </div>
      </div>
    </div>
  )
}
