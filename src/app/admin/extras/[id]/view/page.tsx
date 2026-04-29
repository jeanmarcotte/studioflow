'use client'

import { useState, useEffect } from 'react'
import { useParams, useSearchParams } from 'next/navigation'
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

function formatDate(value: string | null | undefined): string {
  if (!value) return 'n/a'
  return format(parseISO(value), 'MMMM do, yyyy')
}

interface C3LineItem {
  id: string
  product_code: string | null
  quantity: number | null
  unit_price?: number | null
  total?: number | null
  notes?: string | null
  invoice_date?: string | null
  tax_mode?: string | null
  subtotal?: number | null
  hst?: number | null
  salesperson?: string | null
  payment_note?: string | null
}

interface CatalogItem {
  product_code: string
  item_name: string
  category?: string | null
  retail_price?: number | null
}

export default function ExtrasViewPage() {
  const params = useParams()
  const id = params.id as string

  const [extras, setExtras] = useState<any[]>([])
  const [lineItems, setLineItems] = useState<C3LineItem[]>([])
  const [catalog, setCatalog] = useState<CatalogItem[]>([])
  const [couple, setCouple] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const searchParams = useSearchParams()

  // Auto-print when ?print=true
  useEffect(() => {
    if (!loading && searchParams.get('print') === 'true') {
      const timer = setTimeout(() => window.print(), 800)
      return () => clearTimeout(timer)
    }
  }, [loading, searchParams])

  useEffect(() => {
    async function fetchData() {
      if (!id) return

      // id is always a couple_id
      const { data: extrasData } = await supabase
        .from('client_extras')
        .select('*')
        .eq('couple_id', id)
        .order('invoice_date')

      const { data: c3Data } = await supabase
        .from('c3_line_items')
        .select('id, product_code, quantity, unit_price, total, notes, invoice_date, tax_mode, subtotal, hst, salesperson, payment_note')
        .eq('couple_id', id)
        .order('created_at')

      const codes = (c3Data || []).map(i => i.product_code).filter(Boolean) as string[]
      const { data: catalogData } = codes.length > 0
        ? await supabase
            .from('product_catalog')
            .select('product_code, item_name, category, retail_price')
            .in('product_code', codes)
        : { data: [] }

      const hasExtras = !!(extrasData && extrasData.length > 0)
      const hasLineItems = !!(c3Data && c3Data.length > 0)

      if (!hasExtras && !hasLineItems) {
        setLoading(false)
        return
      }

      setExtras(extrasData || [])
      setLineItems(c3Data || [])
      setCatalog((catalogData as CatalogItem[]) || [])

      // Fetch couple info
      const { data: coupleData } = await supabase
        .from('couples')
        .select('couple_name, wedding_date, contracts(day_of_week)')
        .eq('id', id)
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

  if (extras.length === 0 && lineItems.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-gray-500">No extras found</p>
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

  // Prefer c3_line_items when present (has product codes); otherwise fall back to client_extras
  const useLineItems = lineItems.length > 0
  const catalogByCode = new Map<string, CatalogItem>()
  for (const c of catalog) {
    if (c?.product_code) catalogByCode.set(c.product_code, c)
  }

  // Earliest invoice_date across the displayed rows
  const dateSource: Array<string | null | undefined> = useLineItems
    ? lineItems.map(i => i.invoice_date)
    : extras.map(e => e.invoice_date)
  const earliestInvoiceDate = dateSource
    .filter(Boolean)
    .sort()[0]
  const signedDateStr = formatDate(earliestInvoiceDate)

  const grandTotal = useLineItems
    ? lineItems.reduce((sum, item) => sum + Number(item.total || 0), 0)
    : extras.reduce((sum, item) => sum + Number(item.total || 0), 0)

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
        <div className="relative mb-2">
          <Image src="/images/sigslogo.png" alt="SIGS Photography" width={180} height={60} />
          <button
            type="button"
            onClick={() => window.print()}
            className="print:hidden absolute bottom-0 right-0 font-mono text-sm tracking-wider uppercase border border-black rounded-none px-3 py-1 hover:bg-black hover:text-white transition-colors cursor-pointer"
          >
            [ PRINT ]
          </button>
        </div>
        <div className="divider" />

        <div className="text-center my-6 pb-4 border-b border-black">
          EXTRAS ORDER
        </div>

        <p>Couple: <span className="field-wide">{coupleName}</span></p>
        <p>Wedding Date: <span className="field-wide">{weddingDateStr}</span></p>
        <p>Signed Date: <span className="field-wide">{signedDateStr}</span></p>

        <div className="divider" />

        <p className="font-bold mb-3">ITEMS ORDERED</p>

        {/* Table */}
        <table className="w-full border-collapse">
          <thead>
            <tr className="border-b-2 border-black">
              <th className="text-left py-1 pr-4">Product Code</th>
              <th className="text-left py-1 pr-4">Item Type</th>
              <th className="text-left py-1 pr-4">Description</th>
              <th className="text-center py-1 pr-4">Qty</th>
              <th className="text-right py-1 pr-4">Unit Price</th>
              <th className="text-right py-1">Total</th>
            </tr>
          </thead>
          <tbody>
            {useLineItems
              ? lineItems.map((item) => {
                  const cat = item.product_code ? catalogByCode.get(item.product_code) : null
                  const itemName = cat?.item_name || item.notes || ''
                  return (
                    <tr key={item.id} className="border-b border-gray-300">
                      <td className="py-1 pr-4 font-mono text-xs text-gray-500">{item.product_code || '—'}</td>
                      <td className="py-1 pr-4">{display(cat?.category)}</td>
                      <td className="py-1 pr-4">{display(itemName)}</td>
                      <td className="py-1 pr-4 text-center">{item.quantity === null || item.quantity === undefined ? 'n/a' : item.quantity}</td>
                      <td className="py-1 pr-4 text-right">{currency(item.unit_price)}</td>
                      <td className="py-1 text-right">{currency(item.total)}</td>
                    </tr>
                  )
                })
              : extras.map((item) => (
                  <tr key={item.id} className="border-b border-gray-300">
                    <td className="py-1 pr-4 font-mono text-xs text-gray-500">—</td>
                    <td className="py-1 pr-4">{display(item.item_type)}</td>
                    <td className="py-1 pr-4">{display(item.description)}</td>
                    <td className="py-1 pr-4 text-center">{item.quantity === null || item.quantity === undefined ? 'n/a' : item.quantity}</td>
                    <td className="py-1 pr-4 text-right">{currency(item.unit_price)}</td>
                    <td className="py-1 text-right">{currency(item.total)}</td>
                  </tr>
                ))}
          </tbody>
          <tfoot>
            <tr className="border-t-2 border-black">
              <td colSpan={5} className="py-2 text-right font-bold pr-4">TOTAL:</td>
              <td className="py-2 text-right font-bold">{currency(grandTotal)}</td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  )
}
