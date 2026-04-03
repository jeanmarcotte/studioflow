'use client'

import React, { useState, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { Layout } from '@/components/layout/layout'
import { studioflowClientConfig } from '@/config/sidebar'
import { supabase } from '@/lib/supabase'
import { cn } from '@/lib/utils'
import {
  Save, Eye, ArrowLeft, DollarSign, Package,
} from 'lucide-react'
import { formatWeddingDate, formatDate, formatCurrency } from '@/lib/formatters'

const ITEM_TYPES = [
  'Hours',
  'Wedding Album',
  'Parent Album',
  'Raw Video',
  'Hi Res Files',
  'Print',
  'Additional Person',
  'Thank You Cards',
]

const HST_RATE = 0.13

interface Couple {
  id: string
  couple_name: string
  wedding_date: string | null
}

export default function NewExtraPage() {
  const router = useRouter()
  const [couples, setCouples] = useState<Couple[]>([])
  const [saving, setSaving] = useState(false)
  const [showPreview, setShowPreview] = useState(false)

  // Form state
  const [coupleId, setCoupleId] = useState('')
  const [itemType, setItemType] = useState('')
  const [description, setDescription] = useState('')
  const [quantity, setQuantity] = useState(1)
  const [unitPrice, setUnitPrice] = useState('')
  const [taxMode, setTaxMode] = useState<'before' | 'including'>('before')
  const [paymentNote, setPaymentNote] = useState('')
  const [status, setStatus] = useState('pending')

  useEffect(() => {
    const fetchCouples = async () => {
      const { data } = await supabase
        .from('couples')
        .select('id, couple_name, wedding_date')
        .order('wedding_date', { ascending: false })

      setCouples(data || [])
    }
    fetchCouples()
  }, [])

  // Auto-calculate pricing
  const calc = useMemo(() => {
    const price = parseFloat(unitPrice) || 0
    if (taxMode === 'before') {
      const subtotal = price * quantity
      const hst = subtotal * HST_RATE
      const total = subtotal + hst
      return { subtotal, hst, total }
    } else {
      // Price includes tax — back-calculate
      const totalWithTax = price * quantity
      const subtotal = totalWithTax / (1 + HST_RATE)
      const hst = totalWithTax - subtotal
      return { subtotal, hst, total: totalWithTax }
    }
  }, [unitPrice, quantity, taxMode])

  const selectedCouple = couples.find(c => c.id === coupleId)

  const handleSave = async () => {
    if (!coupleId || !itemType || !unitPrice) return

    setSaving(true)
    const { error } = await supabase.from('client_extras').insert({
      couple_id: coupleId,
      item_type: itemType,
      description: description || null,
      quantity,
      unit_price: parseFloat(unitPrice),
      tax_mode: taxMode,
      subtotal: Math.round(calc.subtotal * 100) / 100,
      hst: Math.round(calc.hst * 100) / 100,
      total: Math.round(calc.total * 100) / 100,
      payment_note: paymentNote || null,
      status,
    })

    if (error) {
      console.error('Error saving extra:', error)
      setSaving(false)
      return
    }

    router.push('/client/extras')
  }

  // Invoice preview
  if (showPreview) {
    return (
      <Layout sidebarConfig={studioflowClientConfig}>
        <div className="max-w-2xl mx-auto">
          <button
            onClick={() => setShowPreview(false)}
            className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-6"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to form
          </button>

          <div className="bg-background rounded-lg border p-8 print:border-0 print:shadow-none" id="invoice-preview">
            {/* Invoice Header */}
            <div className="flex justify-between items-start mb-8">
              <div>
                <h1 className="text-2xl font-bold text-foreground">SIGS Photography</h1>
                <p className="text-sm text-muted-foreground mt-1">Additional Services Invoice</p>
              </div>
              <div className="text-right text-sm text-muted-foreground">
                <p className="font-medium">Invoice Date</p>
                <p>{formatDate(new Date())}</p>
              </div>
            </div>

            {/* Client Info */}
            <div className="border-t border-b py-4 mb-6">
              <p className="text-sm text-muted-foreground">Bill To</p>
              <p className="font-medium text-foreground">{selectedCouple?.couple_name || '—'}</p>
              {selectedCouple?.wedding_date && (
                <p className="text-sm text-muted-foreground">Wedding: {formatWeddingDate(selectedCouple.wedding_date)}</p>
              )}
            </div>

            {/* Line Items */}
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
                    <p className="font-medium text-foreground">{itemType || '—'}</p>
                    {description && <p className="text-muted-foreground text-xs mt-0.5">{description}</p>}
                  </td>
                  <td className="py-3 text-center">{quantity}</td>
                  <td className="py-3 text-right">{formatCurrency(parseFloat(unitPrice) || 0)}</td>
                  <td className="py-3 text-right">{formatCurrency(calc.subtotal)}</td>
                </tr>
              </tbody>
            </table>

            {/* Totals */}
            <div className="flex justify-end">
              <div className="w-64 space-y-1 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Subtotal</span>
                  <span>{formatCurrency(calc.subtotal)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">HST (13%)</span>
                  <span>{formatCurrency(calc.hst)}</span>
                </div>
                <div className="flex justify-between border-t pt-2 font-bold text-base">
                  <span>Total</span>
                  <span>{formatCurrency(calc.total)}</span>
                </div>
              </div>
            </div>

            {/* Payment Note */}
            {paymentNote && (
              <div className="mt-8 pt-4 border-t">
                <p className="text-xs text-muted-foreground">Payment Note</p>
                <p className="text-sm text-foreground">{paymentNote}</p>
              </div>
            )}

            {/* Footer */}
            <div className="mt-12 pt-4 border-t text-center text-xs text-muted-foreground">
              <p>SIGS Photography &middot; studio.sigsphoto.ca</p>
            </div>
          </div>

          <div className="flex gap-3 mt-6 print:hidden">
            <button
              onClick={() => window.print()}
              className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
            >
              Print Invoice
            </button>
            <button
              onClick={() => setShowPreview(false)}
              className="inline-flex items-center gap-2 rounded-lg border px-4 py-2 text-sm font-medium hover:bg-muted"
            >
              Back to Form
            </button>
          </div>
        </div>
      </Layout>
    )
  }

  return (
    <Layout sidebarConfig={studioflowClientConfig}>
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.push('/client/extras')}
            className="rounded-lg p-2 hover:bg-muted"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
          <div>
            <h1 className="text-2xl font-bold">New Extra</h1>
            <p className="text-sm text-muted-foreground">Add an additional charge for a couple</p>
          </div>
        </div>

        {/* Form */}
        <div className="rounded-lg border bg-card p-6 space-y-5">
          {/* Couple */}
          <div>
            <label className="block text-sm font-medium mb-1.5">Couple *</label>
            <select
              value={coupleId}
              onChange={e => setCoupleId(e.target.value)}
              className="w-full rounded-lg border bg-background px-3 py-2 text-sm"
            >
              <option value="">Select a couple...</option>
              {couples.map(c => (
                <option key={c.id} value={c.id}>
                  {c.couple_name}{c.wedding_date ? ` — ${formatWeddingDate(c.wedding_date)}` : ''}
                </option>
              ))}
            </select>
          </div>

          {/* Item Type */}
          <div>
            <label className="block text-sm font-medium mb-1.5">Item Type *</label>
            <select
              value={itemType}
              onChange={e => setItemType(e.target.value)}
              className="w-full rounded-lg border bg-background px-3 py-2 text-sm"
            >
              <option value="">Select item type...</option>
              {ITEM_TYPES.map(t => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium mb-1.5">Description</label>
            <input
              type="text"
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder='e.g. "2nd photographer" or "11x14"'
              className="w-full rounded-lg border bg-background px-3 py-2 text-sm"
            />
          </div>

          {/* Qty + Unit Price + Tax Mode */}
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1.5">Quantity</label>
              <input
                type="number"
                min={1}
                value={quantity}
                onChange={e => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                className="w-full rounded-lg border bg-background px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5">Unit Price *</label>
              <div className="relative">
                <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                <input
                  type="number"
                  min={0}
                  step="0.01"
                  value={unitPrice}
                  onChange={e => setUnitPrice(e.target.value)}
                  placeholder="0.00"
                  className="w-full rounded-lg border bg-background pl-8 pr-3 py-2 text-sm"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5">Tax</label>
              <select
                value={taxMode}
                onChange={e => setTaxMode(e.target.value as 'before' | 'including')}
                className="w-full rounded-lg border bg-background px-3 py-2 text-sm"
              >
                <option value="before">Before Tax</option>
                <option value="including">Including Tax</option>
              </select>
            </div>
          </div>

          {/* Auto-calculated totals */}
          {unitPrice && (
            <div className="rounded-lg bg-muted/50 p-4 space-y-1.5 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Subtotal</span>
                <span>{formatCurrency(calc.subtotal)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">HST (13%)</span>
                <span>{formatCurrency(calc.hst)}</span>
              </div>
              <div className="flex justify-between font-bold text-base border-t pt-2">
                <span>Total</span>
                <span>{formatCurrency(calc.total)}</span>
              </div>
            </div>
          )}

          {/* Payment Note */}
          <div>
            <label className="block text-sm font-medium mb-1.5">Payment Note</label>
            <input
              type="text"
              value={paymentNote}
              onChange={e => setPaymentNote(e.target.value)}
              placeholder='e.g. "Added to next installment"'
              className="w-full rounded-lg border bg-background px-3 py-2 text-sm"
            />
          </div>

          {/* Status */}
          <div>
            <label className="block text-sm font-medium mb-1.5">Status</label>
            <select
              value={status}
              onChange={e => setStatus(e.target.value)}
              className="w-full rounded-lg border bg-background px-3 py-2 text-sm"
            >
              <option value="pending">Pending</option>
              <option value="sent">Sent</option>
              <option value="paid">Paid</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-3">
          <button
            onClick={handleSave}
            disabled={!coupleId || !itemType || !unitPrice || saving}
            className="inline-flex items-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <Save className="h-4 w-4" />
            {saving ? 'Saving...' : 'Save Extra'}
          </button>
          <button
            onClick={() => setShowPreview(true)}
            disabled={!coupleId || !itemType || !unitPrice}
            className="inline-flex items-center gap-2 rounded-lg border px-5 py-2.5 text-sm font-medium hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <Eye className="h-4 w-4" />
            Preview Invoice
          </button>
        </div>
      </div>
    </Layout>
  )
}
