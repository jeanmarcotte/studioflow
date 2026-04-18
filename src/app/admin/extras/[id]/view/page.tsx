'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { Loader2, Printer } from 'lucide-react'
import { Button } from '@/components/ui/button'
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

export default function ExtrasViewPage() {
  const params = useParams()
  const id = params.id as string

  const [extras, setExtras] = useState<any[]>([])
  const [couple, setCouple] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchData() {
      if (!id) return

      // id is always a couple_id
      const { data: extrasData } = await supabase
        .from('client_extras')
        .select('*')
        .eq('couple_id', id)
        .order('invoice_date')

      if (!extrasData || extrasData.length === 0) {
        setLoading(false)
        return
      }

      setExtras(extrasData)

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

  if (extras.length === 0) {
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

  // Earliest invoice_date across all rows
  const earliestInvoiceDate = extras
    .map(e => e.invoice_date)
    .filter(Boolean)
    .sort()[0]
  const signedDateStr = formatDate(earliestInvoiceDate)

  const grandTotal = extras.reduce((sum, item) => sum + Number(item.total || 0), 0)

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Print Button */}
      <div className="no-print fixed top-4 right-4 z-50">
        <Button onClick={() => window.print()} className="bg-teal-600 hover:bg-teal-700">
          <Printer className="w-4 h-4 mr-2" />
          Print Page
        </Button>
      </div>

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
        <div className="flex justify-between items-start mb-2">
          <div>
            <Image src="/images/sigslogo.png" alt="SIGS Photography" width={180} height={60} />
          </div>
          <div className="text-right text-sm">Page | 1</div>
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
              <th className="text-left py-1 pr-4">Item Type</th>
              <th className="text-left py-1 pr-4">Description</th>
              <th className="text-center py-1 pr-4">Qty</th>
              <th className="text-right py-1 pr-4">Unit Price</th>
              <th className="text-right py-1">Total</th>
            </tr>
          </thead>
          <tbody>
            {extras.map((item) => (
              <tr key={item.id} className="border-b border-gray-300">
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
              <td colSpan={4} className="py-2 text-right font-bold pr-4">TOTAL:</td>
              <td className="py-2 text-right font-bold">{currency(grandTotal)}</td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  )
}
