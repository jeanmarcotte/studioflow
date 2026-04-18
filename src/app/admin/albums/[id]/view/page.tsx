'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { Loader2, Printer } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { format, parseISO } from 'date-fns'
import Image from 'next/image'

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

  const coupleName = couple?.couple_name || '___'
  const contract = Array.isArray(couple?.contracts) ? couple.contracts[0] : couple?.contracts
  const weddingDateStr = couple?.wedding_date
    ? (() => {
        const d = parseISO(couple.wedding_date)
        const day = contract?.day_of_week?.toUpperCase() || format(d, 'EEEE').toUpperCase()
        return `${day} ${format(d, 'MMMM do, yyyy')}`
      })()
    : '___'

  // Items from JSONB
  const items: Record<string, string> = order.items && typeof order.items === 'object' ? order.items : {}

  // Financials
  const retailValue = parseFloat(order.total || '0')
  const salePrice = parseFloat(order.extras_sale_amount || '0')
  const discount = retailValue - salePrice

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Print Button */}
      <div className="no-print fixed top-4 right-4 z-50">
        <Button onClick={() => window.print()} className="bg-teal-600 hover:bg-teal-700">
          <Printer className="w-4 h-4 mr-2" />
          Print
        </Button>
      </div>

      <style jsx global>{`
        .contract-form {
          font-family: 'Courier New', Courier, monospace;
          font-size: 13px;
          line-height: 1.7;
          color: #000;
        }
        .contract-header {
          font-family: 'Georgia', serif;
          font-size: 18px;
          font-weight: bold;
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
        <div className="flex justify-between items-start mb-2">
          <div>
            <Image src="/images/sigslogo.png" alt="SIGS Photography" width={180} height={60} className="mb-1" />
            <div className="contract-header">SIGS Photography Ltd.</div>
          </div>
          <div className="text-right text-sm">Page | 1</div>
        </div>
        <div className="divider" />

        <p className="font-bold text-base mt-4 mb-4">FRAMES &amp; ALBUMS AGREEMENT</p>

        <p>Couple: <span className="field-wide">{coupleName}</span></p>
        <p>Wedding Date: <span className="field-wide">{weddingDateStr}</span></p>

        <div className="divider" />

        {/* Items + Specs side by side */}
        <div className="flex gap-16">
          <div className="flex-1">
            <p className="font-bold mb-2">ITEMS</p>
            <div className="space-y-1">
              {Object.keys(items).length > 0 ? (
                Object.entries(items).map(([key, value]) => (
                  <p key={key}>
                    <span className="capitalize">{key.replace(/_/g, ' ')}</span>: <span className="field-med">{String(value)}</span>
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
              {order.album_cover && <p>Album Cover: <span className="field-med">{order.album_cover}</span></p>}
              {order.album_pages && <p>Pages: <span className="field-med">{order.album_pages}</span></p>}
              {order.parent_album_cover && <p>Parent Cover: <span className="field-med">{order.parent_album_cover}</span></p>}
            </div>
          </div>
        </div>

        <div className="divider" />

        <p className="font-bold mb-2">FINANCIALS</p>
        <div className="space-y-1">
          <p>Retail Value: $<span className="field-med">{retailValue.toLocaleString()}</span></p>
          <p>Discount: -$<span className="field-med">{discount.toLocaleString()}</span></p>
          <p>Sale Price: $<span className="field-med">{salePrice.toLocaleString()}</span></p>
        </div>

        <div className="divider" />

        <p className="mt-12 mb-12">All terms of this agreement are understood and agreed upon.</p>

        <div className="flex justify-between mt-16">
          <div>
            <div className="border-b border-black w-64 mb-2" />
            <p>Jean Marcotte</p>
            <p className="text-xs text-gray-500">SIGS Photography Ltd.</p>
          </div>
          <div>
            <div className="border-b border-black w-64 mb-2" />
            <p>Client Signature</p>
          </div>
        </div>
      </div>
    </div>
  )
}
