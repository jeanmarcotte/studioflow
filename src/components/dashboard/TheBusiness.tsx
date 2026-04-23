'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { format, differenceInDays, parseISO } from 'date-fns'

interface ExtrasOrder {
  id: string
  couple_id: string
  status: string
  extras_sale_amount: number | null
  couples: { couple_name: string } | null
}

interface ExtrasInstallment {
  id: string
  extras_order_id: string
  installment_number: number
  due_description: string | null
  amount: number
  due_date: string | null
  paid: boolean | null
}

interface InstallmentWithCouple extends ExtrasInstallment {
  couple_name: string
}

export default function TheBusiness() {
  const [signedRevenue, setSignedRevenue] = useState(0)
  const [signedCount, setSignedCount] = useState(0)
  const [pendingCount, setPendingCount] = useState(0)
  const [pendingRevenue, setPendingRevenue] = useState(0)
  const [paidAmount, setPaidAmount] = useState(0)
  const [outstandingAmount, setOutstandingAmount] = useState(0)
  const [unpaidInstallments, setUnpaidInstallments] = useState<InstallmentWithCouple[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchData = async () => {
      // Get all 2026 extras orders
      const { data: ordersData } = await supabase
        .from('extras_orders')
        .select('id, couple_id, status, extras_sale_amount, couples(couple_name)')
        .gte('order_date', '2026-01-01')
        .lte('order_date', '2026-12-31')

      const orders = (ordersData ?? []) as unknown as ExtrasOrder[]

      // Signed/completed orders
      const signed = orders.filter(o => ['signed', 'paid', 'completed'].includes(o.status))
      const revenue = signed.reduce((s, o) => s + (Number(o.extras_sale_amount) ?? 0), 0)
      setSignedRevenue(revenue)
      setSignedCount(signed.length)

      // Pending orders
      const pending = orders.filter(o => o.status === 'pending')
      setPendingCount(pending.length)
      setPendingRevenue(pending.reduce((s, o) => s + (Number(o.extras_sale_amount) ?? 0), 0))

      // Get all extras installments for signed orders
      const signedIds = signed.map(o => o.id)
      if (signedIds.length > 0) {
        const { data: installData } = await supabase
          .from('extras_installments')
          .select('*')
          .in('extras_order_id', signedIds)

        const installments = (installData ?? []) as ExtrasInstallment[]
        const paid = installments.filter(i => i.paid === true).reduce((s, i) => s + (Number(i.amount) ?? 0), 0)
        const outstanding = installments.filter(i => i.paid !== true).reduce((s, i) => s + (Number(i.amount) ?? 0), 0)
        setPaidAmount(paid)
        setOutstandingAmount(outstanding)
      }

      // Get unpaid installments with due dates for the installments column
      // Need all order IDs (not just signed) to show upcoming payments
      const allOrderIds = orders.filter(o => ['signed', 'paid', 'completed'].includes(o.status)).map(o => o.id)
      if (allOrderIds.length > 0) {
        const { data: unpaidData } = await supabase
          .from('extras_installments')
          .select('*')
          .in('extras_order_id', allOrderIds)
          .eq('paid', false)
          .not('due_date', 'is', null)
          .order('due_date', { ascending: true })
          .limit(8)

        const unpaid = (unpaidData ?? []) as ExtrasInstallment[]

        // Map order IDs to couple names
        const orderCoupleMap = new Map<string, string>()
        for (const o of signed) {
          orderCoupleMap.set(o.id, o.couples?.couple_name ?? 'Unknown')
        }

        const withCouples: InstallmentWithCouple[] = unpaid.map(i => ({
          ...i,
          couple_name: orderCoupleMap.get(i.extras_order_id) ?? 'Unknown',
        }))

        setUnpaidInstallments(withCouples)
      }

      setLoading(false)
    }
    fetchData()
  }, [])

  if (loading) return null

  const today = new Date()
  const todayStr = format(today, 'yyyy-MM-dd')

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-CA', { style: 'currency', currency: 'CAD', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(amount)
  }

  const totalInstallments = paidAmount + outstandingAmount
  const paidPct = totalInstallments > 0 ? (paidAmount / totalInstallments) * 100 : 0

  return (
    <div className="rounded-lg border border-gray-200 bg-white shadow-sm p-5">
      <div className="flex items-center gap-2 mb-4">
        <span className="text-lg">💰</span>
        <h2 className="text-base font-semibold text-gray-900">The Business</h2>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Column A: Revenue at a Glance */}
        <div>
          <h3 className="text-base font-semibold text-gray-900 mb-4 flex items-center gap-2">
            💰 2026 Season Revenue
          </h3>
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">C2 Frames & Albums (signed)</span>
              <span className="text-sm font-bold text-gray-900">{formatCurrency(signedRevenue)}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Signed orders</span>
              <span className="text-sm font-medium text-gray-700">{signedCount} couples</span>
            </div>
            {pendingCount > 0 && (
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">C2 Pending</span>
                <span className="text-sm font-medium text-amber-600">{pendingCount} couple{pendingCount !== 1 ? 's' : ''} · {formatCurrency(pendingRevenue)}</span>
              </div>
            )}

            {/* Progress bar */}
            {totalInstallments > 0 && (
              <div className="pt-2">
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-green-600 font-medium">{formatCurrency(paidAmount)} received</span>
                  <span className="text-red-600 font-medium">{formatCurrency(outstandingAmount)} outstanding</span>
                </div>
                <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-green-500 rounded-full"
                    style={{ width: `${paidPct}%` }}
                  />
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Column B: Installments */}
        <div>
          <h3 className="text-base font-semibold text-gray-900 mb-4 flex items-center gap-2">
            💳 Installments
          </h3>
          {unpaidInstallments.length === 0 ? (
            <p className="text-sm text-green-600 font-medium">✅ All installments paid</p>
          ) : (
            <div>
              {unpaidInstallments.map(i => {
                const isPastDue = i.due_date ? i.due_date < todayStr : false
                const daysPast = isPastDue && i.due_date ? differenceInDays(today, parseISO(i.due_date)) : 0
                const formattedDate = i.due_date ? format(parseISO(i.due_date), 'MMM d') : '—'
                return (
                  <div
                    key={i.id}
                    className={`flex items-center justify-between py-2 border-b border-gray-100 last:border-0 ${isPastDue ? 'bg-red-50 -mx-2 px-2 rounded' : ''}`}
                  >
                    <div>
                      <div className="text-sm font-medium text-gray-900">{i.couple_name}</div>
                      <div className="text-xs text-gray-400">{i.due_description ?? `Installment #${i.installment_number}`}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-bold text-gray-900">{formatCurrency(Number(i.amount))}</div>
                      <div className={`text-xs ${isPastDue ? 'text-red-600 font-medium' : 'text-gray-400'}`}>
                        {isPastDue ? `${daysPast}d overdue` : `Due ${formattedDate}`}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
