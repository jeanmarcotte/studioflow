'use client'

import { useState, useMemo } from 'react'
import { supabase } from '@/lib/supabase'
import { toast } from 'sonner'
import { X } from 'lucide-react'
import { ProductItem } from './types'

type Category = 'wedding' | 'engagement' | 'video'

function filterProductsByTab(products: ProductItem[], tab: Category): ProductItem[] {
  return products.filter(p => {
    if (tab === 'wedding') {
      if (p.category === 'Production') return /Wedding/i.test(p.item_name) || /Hi-Res Wedding/i.test(p.item_name)
      if (p.category === 'Album') return true
      if (p.category === 'Portrait') return true
      if (p.category === 'Print') return !['PRT-5X5-50', 'PRT-5X7', 'PRT-8X10'].includes(p.product_code)
      if (p.category === 'Canvas') return true
      if (p.category === 'Mounting') return p.product_code.startsWith('MNT-CNV-')
      if (p.category === 'Collage') return true
      if (p.category === 'Frame') return true
      if (p.category === 'Stationery') return true
      if (p.category === 'Digital') return p.product_code === 'DIG-USB-COMBO'
      return false
    }
    if (tab === 'engagement') {
      if (p.category === 'Production') return /Engagement|Collage|Hi-Res Engagement/i.test(p.item_name)
      if (p.category === 'Print') return ['PRT-5X5-50', 'PRT-5X7', 'PRT-8X10'].includes(p.product_code)
      return false
    }
    if (tab === 'video') {
      if (p.category === 'Production') return /Video/i.test(p.item_name)
      return false
    }
    return false
  })
}

function groupByCategory(products: ProductItem[]): { category: string; products: ProductItem[] }[] {
  const map: Record<string, ProductItem[]> = {}
  for (const p of products) {
    if (!map[p.category]) map[p.category] = []
    map[p.category].push(p)
  }
  return Object.entries(map)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([category, products]) => ({ category, products }))
}

interface Props {
  coupleId: string
  products: ProductItem[]
  onClose: () => void
  onCreated: () => void
}

export function AddJobModal({ coupleId, products, onClose, onCreated }: Props) {
  const [category, setCategory] = useState<Category>('wedding')
  const [selectedProductCode, setSelectedProductCode] = useState('')
  const [description, setDescription] = useState('')
  const [notes, setNotes] = useState('')
  const [quantity, setQuantity] = useState(1)
  const [submitting, setSubmitting] = useState(false)

  const filtered = useMemo(() => filterProductsByTab(products, category), [products, category])
  const grouped = useMemo(() => groupByCategory(filtered), [filtered])

  const selectedProduct = products.find(p => p.product_code === selectedProductCode)

  const handleSubmit = async () => {
    if (!selectedProductCode) return
    setSubmitting(true)

    const { error } = await supabase.from('jobs').insert({
      couple_id: coupleId,
      category,
      job_type: selectedProductCode,
      product_code: selectedProductCode,
      quantity: quantity || 1,
      description: description.trim() || null,
      notes: notes.trim() || null,
      status: 'not_started',
    })

    setSubmitting(false)

    if (error) {
      toast.error(`Failed to create job: ${error.message}`)
    } else {
      toast.success(`Job created: ${selectedProduct?.item_name || selectedProductCode}`)
      onCreated()
      onClose()
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={onClose}>
      <div className="bg-card rounded-xl border shadow-xl w-full max-w-lg max-h-[85vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <h3 className="font-semibold">Add Job</h3>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="p-4 space-y-4">
          {/* Category pills */}
          <div>
            <div className="text-xs font-medium text-muted-foreground mb-2">Category</div>
            <div className="flex gap-2">
              {(['wedding', 'engagement', 'video'] as const).map(cat => (
                <button
                  key={cat}
                  onClick={() => { setCategory(cat); setSelectedProductCode('') }}
                  className={`rounded-full border px-4 py-1.5 text-sm font-medium transition-colors ${
                    category === cat
                      ? 'bg-primary text-primary-foreground border-primary'
                      : 'border-input hover:bg-accent/50'
                  }`}
                >
                  {cat === 'wedding' ? 'Wedding' : cat === 'engagement' ? 'Engagement' : 'Video'}
                </button>
              ))}
            </div>
          </div>

          {/* Product dropdown */}
          <div>
            <div className="text-xs font-medium text-muted-foreground mb-2">Product *</div>
            <select
              value={selectedProductCode}
              onChange={e => setSelectedProductCode(e.target.value)}
              className="w-full rounded-lg border border-input bg-background px-3 py-2.5 text-sm outline-none focus:border-ring"
            >
              <option value="">Select product...</option>
              {grouped.map(({ category: cat, products: prods }) => (
                <optgroup key={cat} label={cat}>
                  {prods.map(p => (
                    <option key={p.product_code} value={p.product_code}>{p.item_name}</option>
                  ))}
                </optgroup>
              ))}
            </select>
          </div>

          {/* Description */}
          <div>
            <div className="text-xs font-medium text-muted-foreground mb-2">Description</div>
            <input
              type="text"
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="e.g., Mom's side, Bride's parents"
              className="w-full rounded-lg border border-input bg-background px-3 py-2.5 text-sm outline-none focus:border-ring"
            />
          </div>

          {/* Notes */}
          <div>
            <div className="text-xs font-medium text-muted-foreground mb-2">Notes</div>
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              rows={2}
              placeholder="Optional notes..."
              className="w-full rounded-lg border border-input bg-background px-3 py-2.5 text-sm outline-none resize-y focus:border-ring"
            />
          </div>

          {/* Quantity */}
          <div>
            <div className="text-xs font-medium text-muted-foreground mb-2">Quantity</div>
            <input
              type="number"
              min={1}
              max={9999}
              value={quantity}
              onChange={e => setQuantity(Math.max(1, Number(e.target.value) || 1))}
              className="w-24 rounded-lg border border-input bg-background px-3 py-2.5 text-sm outline-none focus:border-ring"
            />
          </div>

          {/* Submit */}
          <button
            onClick={handleSubmit}
            disabled={submitting || !selectedProductCode}
            className="rounded-lg bg-primary px-6 py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
          >
            {submitting ? 'Creating...' : 'Create'}
          </button>
        </div>
      </div>
    </div>
  )
}
