'use client'

import React, { useState, useEffect, useMemo } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { Layout } from '@/components/layout/layout'
import { studioflowClientConfig } from '@/config/sidebar'
import { supabase } from '@/lib/supabase'
import { cn } from '@/lib/utils'
import {
  ArrowLeft, Printer, Pencil, Trash2, Save, X, DollarSign,
} from 'lucide-react'

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

interface Extra {
  id: string
  couple_id: string
  item_type: string
  description: string | null
  quantity: number
  unit_price: number
  tax_mode: string
  subtotal: number
  hst: number
  total: number
  discount_type: string | null
  discount_value: number | null
  payment_note: string | null
  status: string
  paid_date: string | null
  invoice_date: string
  created_at: string
}

interface Couple {
  id: string
  couple_name: string
  wedding_date: string | null
  bride_email: string | null
  groom_email: string | null
  bride_phone: string | null
}

export default function ExtraDetailPage() {
  const router = useRouter()
  const params = useParams()
  const id = params.id as string

  const [extra, setExtra] = useState<Extra | null>(null)
  const [couple, setCouple] = useState<Couple | null>(null)
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)

  // Edit form state
  const [editItemType, setEditItemType] = useState('')
  const [editDescription, setEditDescription] = useState('')
  const [editQuantity, setEditQuantity] = useState(1)
  const [editUnitPrice, setEditUnitPrice] = useState('')
  const [editTaxMode, setEditTaxMode] = useState<'before' | 'including'>('before')
  const [editPaymentNote, setEditPaymentNote] = useState('')
  const [editStatus, setEditStatus] = useState('pending')

  useEffect(() => {
    const fetchExtra = async () => {
      const { data, error } = await supabase
        .from('client_extras')
        .select('*')
        .eq('id', id)
        .single()

      if (error || !data) {
        console.error('Error fetching extra:', error)
        setLoading(false)
        return
      }

      setExtra(data)

      // Fetch couple
      const { data: coupleData } = await supabase
        .from('couples')
        .select('id, couple_name, wedding_date, bride_email, groom_email, bride_phone')
        .eq('id', data.couple_id)
        .single()

      setCouple(coupleData)
      setLoading(false)
    }

    fetchExtra()
  }, [id])

  const startEditing = () => {
    if (!extra) return
    setEditItemType(extra.item_type)
    setEditDescription(extra.description || '')
    setEditQuantity(extra.quantity)
    setEditUnitPrice(String(extra.unit_price))
    setEditTaxMode(extra.tax_mode as 'before' | 'including')
    setEditPaymentNote(extra.payment_note || '')
    setEditStatus(extra.status)
    setEditing(true)
  }

  const editCalc = useMemo(() => {
    const price = parseFloat(editUnitPrice) || 0
    if (editTaxMode === 'before') {
      const subtotal = price * editQuantity
      const hst = subtotal * HST_RATE
      return { subtotal, hst, total: subtotal + hst }
    } else {
      const totalWithTax = price * editQuantity
      const subtotal = totalWithTax / (1 + HST_RATE)
      const hst = totalWithTax - subtotal
      return { subtotal, hst, total: totalWithTax }
    }
  }, [editUnitPrice, editQuantity, editTaxMode])

  const handleSave = async () => {
    if (!extra) return
    setSaving(true)

    const { error } = await supabase
      .from('client_extras')
      .update({
        item_type: editItemType,
        description: editDescription || null,
        quantity: editQuantity,
        unit_price: parseFloat(editUnitPrice),
        tax_mode: editTaxMode,
        subtotal: Math.round(editCalc.subtotal * 100) / 100,
        hst: Math.round(editCalc.hst * 100) / 100,
        total: Math.round(editCalc.total * 100) / 100,
        payment_note: editPaymentNote || null,
        status: editStatus,
      })
      .eq('id', extra.id)

    if (error) {
      console.error('Error updating extra:', error)
      setSaving(false)
      return
    }

    // Refresh
    const { data: updated } = await supabase
      .from('client_extras')
      .select('*')
      .eq('id', extra.id)
      .single()

    if (updated) setExtra(updated)
    setEditing(false)
    setSaving(false)
  }

  const handleDelete = async () => {
    if (!extra) return
    const { error } = await supabase
      .from('client_extras')
      .delete()
      .eq('id', extra.id)

    if (error) {
      console.error('Error deleting extra:', error)
      return
    }

    router.push('/client/extras')
  }

  const formatCurrency = (val: number) =>
    new Intl.NumberFormat('en-CA', { style: 'currency', currency: 'CAD' }).format(val)

  const formatDate = (d: string | null) => {
    if (!d) return '—'
    return new Date(d + 'T12:00:00').toLocaleDateString('en-CA', { month: 'long', day: 'numeric', year: 'numeric' })
  }

  const statusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'paid': return 'bg-green-100 text-green-800'
      case 'sent': return 'bg-blue-100 text-blue-800'
      case 'pending': return 'bg-yellow-100 text-yellow-800'
      case 'cancelled': return 'bg-red-100 text-red-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  if (loading) {
    return (
      <Layout sidebarConfig={studioflowClientConfig}>
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
        </div>
      </Layout>
    )
  }

  if (!extra) {
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

  // Edit mode
  if (editing) {
    return (
      <Layout sidebarConfig={studioflowClientConfig}>
        <div className="max-w-2xl mx-auto space-y-6">
          <div className="flex items-center gap-3">
            <button onClick={() => setEditing(false)} className="rounded-lg p-2 hover:bg-muted">
              <ArrowLeft className="h-4 w-4" />
            </button>
            <h1 className="text-2xl font-bold">Edit Extra</h1>
          </div>

          <div className="rounded-lg border bg-card p-6 space-y-5">
            <div>
              <label className="block text-sm font-medium mb-1.5">Couple</label>
              <p className="text-sm text-muted-foreground">{couple?.couple_name || 'Unknown'}</p>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1.5">Item Type *</label>
              <select
                value={editItemType}
                onChange={e => setEditItemType(e.target.value)}
                className="w-full rounded-lg border bg-background px-3 py-2 text-sm"
              >
                {ITEM_TYPES.map(t => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1.5">Description</label>
              <input
                type="text"
                value={editDescription}
                onChange={e => setEditDescription(e.target.value)}
                className="w-full rounded-lg border bg-background px-3 py-2 text-sm"
              />
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1.5">Quantity</label>
                <input
                  type="number"
                  min={1}
                  value={editQuantity}
                  onChange={e => setEditQuantity(Math.max(1, parseInt(e.target.value) || 1))}
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
                    value={editUnitPrice}
                    onChange={e => setEditUnitPrice(e.target.value)}
                    className="w-full rounded-lg border bg-background pl-8 pr-3 py-2 text-sm"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1.5">Tax</label>
                <select
                  value={editTaxMode}
                  onChange={e => setEditTaxMode(e.target.value as 'before' | 'including')}
                  className="w-full rounded-lg border bg-background px-3 py-2 text-sm"
                >
                  <option value="before">Before Tax</option>
                  <option value="including">Including Tax</option>
                </select>
              </div>
            </div>

            {editUnitPrice && (
              <div className="rounded-lg bg-muted/50 p-4 space-y-1.5 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Subtotal</span>
                  <span>{formatCurrency(editCalc.subtotal)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">HST (13%)</span>
                  <span>{formatCurrency(editCalc.hst)}</span>
                </div>
                <div className="flex justify-between font-bold text-base border-t pt-2">
                  <span>Total</span>
                  <span>{formatCurrency(editCalc.total)}</span>
                </div>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium mb-1.5">Payment Note</label>
              <input
                type="text"
                value={editPaymentNote}
                onChange={e => setEditPaymentNote(e.target.value)}
                className="w-full rounded-lg border bg-background px-3 py-2 text-sm"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1.5">Status</label>
              <select
                value={editStatus}
                onChange={e => setEditStatus(e.target.value)}
                className="w-full rounded-lg border bg-background px-3 py-2 text-sm"
              >
                <option value="pending">Pending</option>
                <option value="sent">Sent</option>
                <option value="paid">Paid</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>
          </div>

          <div className="flex gap-3">
            <button
              onClick={handleSave}
              disabled={saving}
              className="inline-flex items-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
            >
              <Save className="h-4 w-4" />
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
            <button
              onClick={() => setEditing(false)}
              className="inline-flex items-center gap-2 rounded-lg border px-5 py-2.5 text-sm font-medium hover:bg-muted"
            >
              <X className="h-4 w-4" />
              Cancel
            </button>
          </div>
        </div>
      </Layout>
    )
  }

  // Invoice view (default)
  return (
    <Layout sidebarConfig={studioflowClientConfig}>
      <div className="max-w-2xl mx-auto">
        {/* Top bar */}
        <div className="flex items-center justify-between mb-6 print:hidden">
          <button
            onClick={() => router.push('/client/extras')}
            className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Extras
          </button>
          <div className="flex gap-2">
            <button
              onClick={startEditing}
              className="inline-flex items-center gap-2 rounded-lg border px-3 py-1.5 text-sm hover:bg-muted"
            >
              <Pencil className="h-3.5 w-3.5" />
              Edit
            </button>
            <button
              onClick={() => window.print()}
              className="inline-flex items-center gap-2 rounded-lg border px-3 py-1.5 text-sm hover:bg-muted"
            >
              <Printer className="h-3.5 w-3.5" />
              Print
            </button>
            <button
              onClick={() => setShowDeleteConfirm(true)}
              className="inline-flex items-center gap-2 rounded-lg border border-red-200 text-red-600 px-3 py-1.5 text-sm hover:bg-red-50"
            >
              <Trash2 className="h-3.5 w-3.5" />
              Delete
            </button>
          </div>
        </div>

        {/* Delete confirmation */}
        {showDeleteConfirm && (
          <div className="rounded-lg border border-red-200 bg-red-50 p-4 mb-6 print:hidden">
            <p className="text-sm font-medium text-red-800">Are you sure you want to delete this extra?</p>
            <p className="text-xs text-red-600 mt-1">This action cannot be undone.</p>
            <div className="flex gap-2 mt-3">
              <button
                onClick={handleDelete}
                className="rounded-lg bg-red-600 px-3 py-1.5 text-sm text-white hover:bg-red-700"
              >
                Yes, Delete
              </button>
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="rounded-lg border px-3 py-1.5 text-sm hover:bg-background"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Invoice */}
        <div className="bg-background rounded-lg border p-8 print:border-0 print:shadow-none">
          {/* Header */}
          <div className="flex justify-between items-start mb-8">
            <div>
              <h1 className="text-2xl font-bold text-foreground">SIGS Photography</h1>
              <p className="text-sm text-muted-foreground mt-1">Additional Services Invoice</p>
            </div>
            <div className="text-right">
              <div className="text-sm text-muted-foreground">
                <p className="font-medium">Invoice Date</p>
                <p>{formatDate(extra.invoice_date)}</p>
              </div>
              <span className={cn('inline-flex rounded-full px-2 py-0.5 text-xs font-medium capitalize mt-2', statusColor(extra.status))}>
                {extra.status}
              </span>
            </div>
          </div>

          {/* Client Info */}
          <div className="border-t border-b py-4 mb-6">
            <p className="text-sm text-muted-foreground">Bill To</p>
            <p className="font-medium text-foreground">{couple?.couple_name || 'Unknown'}</p>
            {couple?.wedding_date && (
              <p className="text-sm text-muted-foreground">Wedding: {formatDate(couple.wedding_date)}</p>
            )}
            {couple?.bride_email && (
              <p className="text-sm text-muted-foreground">{couple.bride_email}</p>
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
                  <p className="font-medium text-foreground">{extra.item_type}</p>
                  {extra.description && <p className="text-muted-foreground text-xs mt-0.5">{extra.description}</p>}
                </td>
                <td className="py-3 text-center">{extra.quantity}</td>
                <td className="py-3 text-right">{formatCurrency(extra.unit_price)}</td>
                <td className="py-3 text-right">{formatCurrency(extra.subtotal)}</td>
              </tr>
            </tbody>
          </table>

          {/* Totals */}
          <div className="flex justify-end">
            <div className="w-64 space-y-1 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Subtotal</span>
                <span>{formatCurrency(extra.subtotal)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">HST (13%)</span>
                <span>{formatCurrency(extra.hst)}</span>
              </div>
              <div className="flex justify-between border-t pt-2 font-bold text-base">
                <span>Total</span>
                <span>{formatCurrency(extra.total)}</span>
              </div>
            </div>
          </div>

          {/* Payment Note */}
          {extra.payment_note && (
            <div className="mt-8 pt-4 border-t">
              <p className="text-xs text-muted-foreground">Payment Note</p>
              <p className="text-sm text-foreground">{extra.payment_note}</p>
            </div>
          )}

          {/* Footer */}
          <div className="mt-12 pt-4 border-t text-center text-xs text-muted-foreground">
            <p>SIGS Photography &middot; studio.sigsphoto.ca</p>
          </div>
        </div>
      </div>
    </Layout>
  )
}
