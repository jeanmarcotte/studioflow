'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { Loader2, Printer } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { format, parseISO } from 'date-fns'
import Image from 'next/image'

function check(value: boolean | null | undefined): string {
  return value ? '_✓_' : '___'
}

export default function ExtrasViewPage() {
  const params = useParams()
  const id = params.id as string

  const [order, setOrder] = useState<any>(null)
  const [couple, setCouple] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchData() {
      if (!id) return

      // Try as extras_orders ID first
      let { data: orderData } = await supabase
        .from('extras_orders')
        .select('*')
        .eq('id', id)
        .limit(1)

      // If not found, try as couple_id
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

      // Fetch couple info
      const { data: coupleData } = await supabase
        .from('couples')
        .select('bride_first_name, bride_last_name, groom_first_name, groom_last_name, couple_name')
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
        <p className="text-gray-500">Extras order not found</p>
      </div>
    )
  }

  const brideName = couple ? [couple.bride_first_name, couple.bride_last_name].filter(Boolean).join(' ') : '___'
  const groomName = couple ? [couple.groom_first_name, couple.groom_last_name].filter(Boolean).join(' ') : '___'
  const orderDateStr = order.order_date ? format(parseISO(order.order_date), 'MMMM do, yyyy') : '___'

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
        .field-med {
          border-bottom: 1px solid #000;
          display: inline;
          min-width: 150px;
          padding: 0 4px;
        }
        .field-wide {
          border-bottom: 1px solid #000;
          display: inline-block;
          min-width: 300px;
          padding: 0 4px;
        }
        .field-sm {
          border-bottom: 1px solid #000;
          display: inline;
          min-width: 80px;
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

        <p className="font-bold text-base mt-4 mb-4">EXTRAS ORDER</p>

        <p>Order Date: <span className="field-wide">{orderDateStr}</span></p>
        <p>Status: <span className="field-med">{order.status || '___'}</span></p>

        <div className="mt-4">
          <p>Bride&apos;s Name: <span className="field-wide">{brideName}</span></p>
          <p>Groom&apos;s Name: <span className="field-wide">{groomName}</span></p>
        </div>

        <div className="divider" />

        <p className="font-bold">ITEMS ORDERED</p>
        <div className="mt-2 space-y-1">
          <p>Collage Type: <span className="field-med">{order.collage_type || '___'}</span></p>
          <p>Collage Size: <span className="field-med">{order.collage_size || '___'}</span></p>
          <p>Frame Color: <span className="field-med">{order.collage_frame_color || '___'}</span></p>
          <p />
          <p>Album Qty: <span className="field-med">{order.album_qty || '___'}</span></p>
          <p>Album Cover: <span className="field-med">{order.album_cover || '___'}</span></p>
          <p />
          <p>Wedding Frame Size: <span className="field-med">{order.wedding_frame_size || '___'}</span></p>
          <p>Wedding Frame Style: <span className="field-med">{order.wedding_frame_style || '___'}</span></p>
          <p />
          <p>Engagement Portrait Size: <span className="field-med">{order.eng_portrait_size || '___'}</span></p>
          <p />
          <p>Signing Book: <span className="field-sm">{check(order.signing_book)}</span></p>
          <p />
          <p>5x5 Prints (engagement): <span className="field-sm">{check(order.printed_5x5)}</span></p>
        </div>

        <div className="divider" />

        <p className="font-bold">FINANCIAL SUMMARY</p>
        <div className="mt-2 space-y-1">
          <p>Contract Balance Remaining: $<span className="field-med">{Number(order.contract_balance_remaining || 0).toLocaleString()}</span></p>
          <p>Extras Sale Amount: $<span className="field-med">{Number(order.extras_sale_amount || 0).toLocaleString()}</span></p>
          <p />
          <p>Downpayment: $<span className="field-med">{Number(order.downpayment || 0).toLocaleString()}</span></p>
          <p>New Balance: $<span className="field-med">{Number(order.new_balance || 0).toLocaleString()}</span></p>
          <p />
          <p>Number of Installments: <span className="field-med">{order.num_installments || '___'}</span></p>
          <p>Payment Per Installment: $<span className="field-med">{Number(order.payment_per_installment || 0).toLocaleString()}</span></p>
          <p>Last Installment Amount: $<span className="field-med">{Number(order.last_installment_amount || 0).toLocaleString()}</span></p>
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
