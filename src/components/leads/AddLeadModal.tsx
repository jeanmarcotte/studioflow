'use client'

import { useState } from 'react'
import { X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { supabase } from '@/lib/supabase'
import type { Lead } from '@/lib/lead-utils'
import { inferCultureFromCouple } from '@/lib/cultureInference'

interface AddLeadModalProps {
  isOpen: boolean
  onClose: () => void
  onLeadAdded: (lead: Lead) => void
}

const SERVICE_OPTIONS = [
  { value: 'photo_video', label: 'Photo + Video' },
  { value: 'photo_only', label: 'Photo Only' },
  { value: 'video_only', label: 'Video Only' },
]

export function AddLeadModal({ isOpen, onClose, onLeadAdded }: AddLeadModalProps) {
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    bride_first_name: '',
    bride_last_name: '',
    groom_first_name: '',
    groom_last_name: '',
    email: '',
    cell_phone: '',
    wedding_date: '',
    venue_name: '',
    service_needs: 'photo_video',
    referral_source: '',
  })

  if (!isOpen) return null

  const set = (field: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm(prev => ({ ...prev, [field]: e.target.value }))

  const formatPhone = (e: React.ChangeEvent<HTMLInputElement>) => {
    const digits = e.target.value.replace(/\D/g, '').slice(0, 10)
    let formatted = digits
    if (digits.length >= 7) formatted = `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`
    else if (digits.length >= 4) formatted = `(${digits.slice(0, 3)}) ${digits.slice(3)}`
    else if (digits.length > 0) formatted = `(${digits}`
    setForm(prev => ({ ...prev, cell_phone: formatted }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.bride_first_name && !form.groom_first_name) return

    setSaving(true)
    try {
      const inferredCulture = inferCultureFromCouple(
        form.bride_last_name || null,
        form.groom_last_name || null,
      )

      const payload = {
        bride_first_name: form.bride_first_name || null,
        bride_last_name: form.bride_last_name || null,
        groom_first_name: form.groom_first_name || null,
        groom_last_name: form.groom_last_name || null,
        email: form.email || null,
        cell_phone: form.cell_phone || null,
        wedding_date: form.wedding_date || null,
        venue_name: form.venue_name || null,
        service_needs: form.service_needs,
        referral_source: form.referral_source || null,
        status: 'new',
        hidden: false,
        show_id: 'manual-entry',
        has_photographer: false,
        has_videographer: false,
        has_venue: !!form.venue_name,
        ...(inferredCulture ? { inferred_ethnicity: inferredCulture, culture_confirmed: false } : {}),
      }

      const { data, error } = await supabase
        .from('ballots')
        .insert(payload)
        .select('*')
        .limit(1)

      if (error) throw error
      if (data && data[0]) {
        onLeadAdded(data[0] as Lead)
        onClose()
        setForm({
          bride_first_name: '', bride_last_name: '',
          groom_first_name: '', groom_last_name: '',
          email: '', cell_phone: '', wedding_date: '',
          venue_name: '', service_needs: 'photo_video', referral_source: '',
        })
      }
    } catch (err: any) {
      console.error('Failed to add lead:', err)
      alert('Failed to save lead: ' + (err.message || err))
    }
    setSaving(false)
  }

  const inputCls = 'w-full h-9 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 px-3 text-sm outline-none focus:border-[#0d4f4f] focus:ring-1 focus:ring-[#0d4f4f]/20'
  const labelCls = 'block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1'

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />

      {/* Modal */}
      <div className="relative w-full max-w-lg mx-4 bg-white dark:bg-slate-900 rounded-2xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-700">
          <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100">Add Lead</h2>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4 max-h-[70vh] overflow-y-auto">
          {/* Names row */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>Bride First Name</label>
              <input className={inputCls} value={form.bride_first_name} onChange={set('bride_first_name')} placeholder="First name" />
            </div>
            <div>
              <label className={labelCls}>Bride Last Name</label>
              <input className={inputCls} value={form.bride_last_name} onChange={set('bride_last_name')} placeholder="Last name" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>Groom First Name</label>
              <input className={inputCls} value={form.groom_first_name} onChange={set('groom_first_name')} placeholder="First name" />
            </div>
            <div>
              <label className={labelCls}>Groom Last Name</label>
              <input className={inputCls} value={form.groom_last_name} onChange={set('groom_last_name')} placeholder="Last name" />
            </div>
          </div>

          {/* Contact */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>Email</label>
              <input className={inputCls} type="email" value={form.email} onChange={set('email')} placeholder="email@example.com" />
            </div>
            <div>
              <label className={labelCls}>Phone</label>
              <input className={inputCls} type="tel" value={form.cell_phone} onChange={formatPhone} placeholder="(416) 555-1234" />
            </div>
          </div>

          {/* Wedding details */}
          <div className="grid grid-cols-2 gap-3">
            <div className="min-w-0 overflow-hidden">
              <label className={labelCls}>Wedding Date</label>
              <input className={inputCls} type="date" value={form.wedding_date} onChange={set('wedding_date')} style={{ maxWidth: '100%', boxSizing: 'border-box' }} />
            </div>
            <div className="min-w-0 overflow-hidden">
              <label className={labelCls}>Service Needs</label>
              <select className={inputCls} value={form.service_needs} onChange={set('service_needs')}>
                {SERVICE_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>
          </div>

          <div>
            <label className={labelCls}>Venue Name</label>
            <input className={inputCls} value={form.venue_name} onChange={set('venue_name')} placeholder="e.g. Chateau Le Jardin" />
          </div>

          <div>
            <label className={labelCls}>Referral Source</label>
            <input className={inputCls} value={form.referral_source} onChange={set('referral_source')} placeholder="e.g. Walk-in, Phone call, Instagram DM" />
          </div>
        </form>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-slate-200 dark:border-slate-700">
          <Button variant="outline" onClick={onClose} className="h-9 px-4 text-sm rounded-lg">
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={saving || (!form.bride_first_name && !form.groom_first_name)}
            className="h-9 px-5 text-sm font-semibold bg-[#0d4f4f] hover:bg-[#0d4f4f]/90 text-white rounded-lg disabled:opacity-50"
          >
            {saving ? 'Saving...' : 'Save Lead'}
          </Button>
        </div>
      </div>
    </div>
  )
}
