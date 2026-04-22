'use client'

import { useState, useEffect } from 'react'
import { useParams, useSearchParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { Loader2 } from 'lucide-react'
import { formatWeddingDate } from '@/lib/formatters'
import Image from 'next/image'
import { format, parseISO } from 'date-fns'

interface OrderData {
  id: string
  couple_id: string
  order_number: string
  order_type: string
  vendor: string | null
  lab_status: string
  lab_sent_date: string | null
  lab_received_date: string | null
  pickup_date: string | null
  notes: string | null
  created_at: string
}

interface CoupleData {
  bride_first_name: string
  bride_last_name: string | null
  groom_first_name: string
  groom_last_name: string | null
  wedding_date: string | null
}

interface LineItem {
  product_code: string | null
  quantity: number
  description: string | null
  notes: string | null
  status: string
  item_name: string | null
  category: string | null
}

function display(value: string | number | null | undefined): string {
  if (value === null || value === undefined || value === '') return '\u2014'
  return String(value)
}

const STATUS_COLORS: Record<string, string> = {
  not_started: 'bg-gray-100 text-gray-700',
  ready_to_start: 'bg-gray-100 text-gray-700',
  in_progress: 'bg-blue-100 text-blue-700',
  completed: 'bg-green-100 text-green-700',
  picked_up: 'bg-teal-100 text-teal-700',
  at_lab: 'bg-indigo-100 text-indigo-700',
  proofs_delivered: 'bg-sky-100 text-sky-700',
  waiting_approval: 'bg-amber-100 text-amber-700',
}

const LAB_STAGES = [
  { key: 'pending', label: 'Pending' },
  { key: 'sent_to_lab', label: 'Sent to Lab' },
  { key: 'at_lab', label: 'At Lab' },
  { key: 'back_at_studio', label: 'Back at Studio' },
  { key: 'picked_up', label: 'Picked Up' },
]

function formatCreatedDate(dateStr: string): string {
  try {
    return format(parseISO(dateStr), 'MMMM d, yyyy')
  } catch {
    return '\u2014'
  }
}

export default function ClientOrderViewPage() {
  const params = useParams()
  const orderId = params.orderId as string
  const searchParams = useSearchParams()

  const [order, setOrder] = useState<OrderData | null>(null)
  const [couple, setCouple] = useState<CoupleData | null>(null)
  const [items, setItems] = useState<LineItem[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!loading && searchParams.get('print') === 'true') {
      const timer = setTimeout(() => window.print(), 800)
      return () => clearTimeout(timer)
    }
  }, [loading, searchParams])

  useEffect(() => {
    async function fetchData() {
      if (!orderId) return

      // Get order
      const { data: orderData } = await supabase
        .from('client_orders')
        .select('*')
        .eq('id', orderId)
        .limit(1)

      const o = orderData?.[0]
      if (!o) { setLoading(false); return }
      setOrder(o)

      // Get couple
      if (o.couple_id) {
        const { data: coupleData } = await supabase
          .from('couples')
          .select('bride_first_name, bride_last_name, groom_first_name, groom_last_name, wedding_date')
          .eq('id', o.couple_id)
          .limit(1)

        if (coupleData?.[0]) setCouple(coupleData[0])
      }

      // Get line items with product info via separate queries (no JOIN in Supabase client)
      const { data: jobsData } = await supabase
        .from('jobs')
        .select('product_code, quantity, description, notes, status')
        .eq('client_order_id', orderId)

      if (jobsData && jobsData.length > 0) {
        const codes = Array.from(new Set(jobsData.map((j: any) => j.product_code).filter(Boolean)))
        const { data: productData } = await supabase
          .from('product_catalog')
          .select('product_code, item_name, category')
          .in('product_code', codes)

        const productMap = new Map<string, { item_name: string; category: string }>()
        ;(productData ?? []).forEach((p: any) => productMap.set(p.product_code, p))

        setItems(jobsData.map((j: any) => ({
          product_code: j.product_code,
          quantity: j.quantity ?? 1,
          description: j.description,
          notes: j.notes,
          status: j.status,
          item_name: productMap.get(j.product_code)?.item_name ?? null,
          category: productMap.get(j.product_code)?.category ?? null,
        })))
      }

      setLoading(false)
    }
    fetchData()
  }, [orderId])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
      </div>
    )
  }

  if (!order) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-gray-500">Order not found</p>
      </div>
    )
  }

  const currentStageIndex = LAB_STAGES.findIndex(s => s.key === order.lab_status)

  return (
    <>
      <style jsx global>{`
        @media print {
          @page { margin: 0.4in; }
          body * { visibility: hidden; }
          #print-area, #print-area * { visibility: visible; }
          #print-area { position: absolute; left: 0; top: 0; width: 100%; }
          .no-print { display: none !important; }
          .print-logo { max-height: 50px !important; }
          nav, aside, header { display: none !important; }
        }
      `}</style>

      <div id="print-area" className="max-w-3xl mx-auto px-6 py-8">
        {/* Header */}
        <div className="relative mb-8">
          <button
            onClick={() => window.print()}
            className="no-print absolute top-0 right-0 rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800 transition-colors"
          >
            PRINT
          </button>

          <div className="flex items-start justify-between">
            <div>
              <Image
                src="/sigs-logo.png"
                alt="SIGS Photography"
                width={180}
                height={60}
                className="print-logo mb-4"
                style={{ maxHeight: 60, width: 'auto' }}
              />
              <h1 className="text-2xl font-bold tracking-tight" style={{ fontFamily: 'Georgia, serif' }}>
                Client Production Order
              </h1>
            </div>
            <div className="text-right">
              <div className="text-lg font-bold" style={{ fontFamily: 'Georgia, serif' }}>
                {order.order_number}
              </div>
              <div className="text-sm text-gray-500 mt-1">
                {formatCreatedDate(order.created_at)}
              </div>
            </div>
          </div>
        </div>

        {/* Divider */}
        <div className="border-t border-gray-300 mb-6" />

        {/* Couple Info */}
        <div className="grid grid-cols-3 gap-6 mb-8">
          <div>
            <div className="text-xs text-gray-500 uppercase tracking-wide">Couple</div>
            <div className="text-sm font-semibold mt-0.5">
              {couple ? `${couple.bride_first_name} & ${couple.groom_first_name} ${couple.groom_last_name ?? ''}`.trim() : '\u2014'}
            </div>
          </div>
          <div>
            <div className="text-xs text-gray-500 uppercase tracking-wide">Wedding Date</div>
            <div className="text-sm mt-0.5">
              {couple?.wedding_date ? formatWeddingDate(couple.wedding_date) : '\u2014'}
            </div>
          </div>
          <div>
            <div className="text-xs text-gray-500 uppercase tracking-wide">Vendor</div>
            <div className="text-sm mt-0.5">{display(order.vendor)}</div>
          </div>
        </div>

        {/* Line Items Table */}
        <div className="mb-8">
          <h2 className="text-sm font-bold uppercase tracking-wide text-gray-500 mb-3">Line Items</h2>
          <table className="w-full border-collapse">
            <thead>
              <tr className="border-b-2 border-gray-800">
                <th className="text-left py-2 text-xs font-bold uppercase tracking-wide" style={{ width: 30 }}>#</th>
                <th className="text-left py-2 text-xs font-bold uppercase tracking-wide">Product</th>
                <th className="text-left py-2 text-xs font-bold uppercase tracking-wide">Description</th>
                <th className="text-center py-2 text-xs font-bold uppercase tracking-wide" style={{ width: 50 }}>Qty</th>
                <th className="text-center py-2 text-xs font-bold uppercase tracking-wide" style={{ width: 120 }}>Status</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item, i) => (
                <tr key={i} className="border-b border-gray-200">
                  <td className="py-2.5 text-sm text-gray-500">{i + 1}</td>
                  <td className="py-2.5 text-sm">
                    <span className="font-medium">{item.item_name ?? item.product_code ?? '\u2014'}</span>
                    {item.product_code && (
                      <span className="text-xs text-gray-400 ml-1">({item.product_code})</span>
                    )}
                  </td>
                  <td className="py-2.5 text-sm text-gray-600">{display(item.description)}</td>
                  <td className="py-2.5 text-sm text-center">{item.quantity}</td>
                  <td className="py-2.5 text-center">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[item.status] ?? 'bg-gray-100 text-gray-700'}`}>
                      {item.status.replace(/_/g, ' ')}
                    </span>
                  </td>
                </tr>
              ))}
              {items.length === 0 && (
                <tr>
                  <td colSpan={5} className="py-6 text-center text-sm text-gray-400">No line items</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Notes */}
        {order.notes && (
          <div className="mb-8">
            <h2 className="text-sm font-bold uppercase tracking-wide text-gray-500 mb-2">Notes</h2>
            <p className="text-sm text-gray-700 whitespace-pre-wrap">{order.notes}</p>
          </div>
        )}

        {/* Lab Status Tracker (screen only) */}
        <div className="no-print mb-8">
          <h2 className="text-sm font-bold uppercase tracking-wide text-gray-500 mb-4">Lab Status</h2>
          <div className="flex items-center gap-0">
            {LAB_STAGES.map((stage, i) => {
              const isActive = i === currentStageIndex
              const isDone = i < currentStageIndex
              const dateForStage = i === 1 ? order.lab_sent_date : i === 2 ? order.lab_received_date : i === 4 ? order.pickup_date : null

              return (
                <div key={stage.key} className="flex items-center">
                  <div className="flex flex-col items-center" style={{ minWidth: 100 }}>
                    <div
                      className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold border-2 ${
                        isActive
                          ? 'bg-blue-600 text-white border-blue-600'
                          : isDone
                            ? 'bg-green-600 text-white border-green-600'
                            : 'bg-white text-gray-400 border-gray-300'
                      }`}
                    >
                      {isDone ? '\u2713' : i + 1}
                    </div>
                    <span className={`text-[11px] mt-1.5 text-center ${isActive ? 'font-bold text-blue-700' : isDone ? 'text-green-700' : 'text-gray-400'}`}>
                      {stage.label}
                    </span>
                    {dateForStage && (
                      <span className="text-[10px] text-gray-400 mt-0.5">
                        {formatCreatedDate(dateForStage)}
                      </span>
                    )}
                  </div>
                  {i < LAB_STAGES.length - 1 && (
                    <div
                      className={`h-0.5 w-8 ${isDone ? 'bg-green-500' : 'bg-gray-200'}`}
                    />
                  )}
                </div>
              )
            })}
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-gray-300 pt-4 text-xs text-gray-400 text-center">
          SIGS Photography Ltd. \u00B7 Toronto & Vaughan
        </div>
      </div>
    </>
  )
}
