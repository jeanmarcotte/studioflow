'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { ChevronDown, ChevronRight, HelpCircle, Plus, Package, X } from 'lucide-react'
import { Playfair_Display, Nunito } from 'next/font/google'

const playfair = Playfair_Display({ subsets: ['latin'], weight: ['700'] })
const nunito = Nunito({ subsets: ['latin'], weight: ['400', '600', '700'] })

// ── Types ────────────────────────────────────────────────────────

interface Couple {
  id: string
  couple_name: string
  wedding_date: string | null
}

interface BackupLog {
  id: string
  couple_id: string
  asset_type: string
  destination: string
  size_gb: number | null
  notes: string | null
  logged_at: string
}

// ── Constants ────────────────────────────────────────────────────

const ASSET_TYPES = [
  { value: 'long_form_video', label: 'Long form video (final)' },
  { value: 'recap_video', label: 'Recap video (final)' },
  { value: 'wedding_proofs', label: 'Wedding proofs' },
  { value: 'eng_proofs', label: 'Eng proofs' },
  { value: 'eng_collage', label: 'Eng collage' },
  { value: 'hires_wedding_photos', label: 'Hi-res wedding photos' },
  { value: 'hires_eng_16x16', label: 'Hi-res eng 16\u00d716' },
  { value: 'print_orders', label: 'Print final orders' },
  { value: 'projects_raw', label: 'Photo projects + RAW' },
]

const DESTINATIONS = [
  { value: 'asset_t7', label: 'AssetT7' },
  { value: 'archive_drive', label: 'Archive Drive' },
  { value: 'aws_glacier', label: 'AWS Glacier' },
]

const ASSET_LABEL_MAP: Record<string, string> = Object.fromEntries(
  ASSET_TYPES.map((a) => [a.value, a.label])
)
const DEST_LABEL_MAP: Record<string, string> = Object.fromEntries(
  DESTINATIONS.map((d) => [d.value, d.label])
)

// ── Component ────────────────────────────────────────────────────

export default function BackupLogPage() {
  const [couples, setCouples] = useState<Couple[]>([])
  const [selectedCoupleId, setSelectedCoupleId] = useState<string>('')
  const [logs, setLogs] = useState<BackupLog[]>([])
  const [historyOpen, setHistoryOpen] = useState(true)
  const [legendOpen, setLegendOpen] = useState(false)
  const [toast, setToast] = useState<string | null>(null)

  // Form state
  const [assetType, setAssetType] = useState('')
  const [destination, setDestination] = useState('')
  const [sizeGb, setSizeGb] = useState('')
  const [notes, setNotes] = useState('')
  const [submitting, setSubmitting] = useState(false)

  // Load couples
  useEffect(() => {
    const fetchCouples = async () => {
      const { data } = await supabase
        .from('couples')
        .select('id, couple_name, wedding_date')
        .in('status', ['booked', 'completed'])
        .order('wedding_date', { ascending: false })
      if (data) setCouples(data)
    }
    fetchCouples()
  }, [])

  // Load logs when couple changes
  useEffect(() => {
    if (!selectedCoupleId) {
      setLogs([])
      return
    }
    const fetchLogs = async () => {
      const { data } = await supabase
        .from('backup_logs')
        .select('*')
        .eq('couple_id', selectedCoupleId)
        .order('logged_at', { ascending: false })
      if (data) setLogs(data)
    }
    fetchLogs()
  }, [selectedCoupleId])

  // Auto-dismiss toast
  useEffect(() => {
    if (!toast) return
    const t = setTimeout(() => setToast(null), 3000)
    return () => clearTimeout(t)
  }, [toast])

  const selectedCouple = couples.find((c) => c.id === selectedCoupleId)

  const formatCoupleLabel = (c: Couple) => {
    if (!c.wedding_date) return c.couple_name
    const d = new Date(c.wedding_date + 'T00:00:00')
    const day = d.toLocaleDateString('en-US', { weekday: 'short' }).toUpperCase()
    const month = d.toLocaleDateString('en-US', { month: 'short' })
    const date = d.getDate()
    const year = d.getFullYear()
    return `${c.couple_name} — ${day} ${month} ${date}, ${year}`
  }

  const handleSubmit = async () => {
    if (!selectedCoupleId || !assetType || !destination) return
    setSubmitting(true)
    const { error } = await supabase.from('backup_logs').insert({
      couple_id: selectedCoupleId,
      asset_type: assetType,
      destination,
      size_gb: sizeGb ? parseFloat(sizeGb) : null,
      notes: notes || null,
    })
    setSubmitting(false)
    if (error) {
      setToast('Error logging backup')
      return
    }
    setToast(`Logged: ${ASSET_LABEL_MAP[assetType]} \u2192 ${DEST_LABEL_MAP[destination]}`)
    setAssetType('')
    setDestination('')
    setSizeGb('')
    setNotes('')
    // Refresh logs
    const { data } = await supabase
      .from('backup_logs')
      .select('*')
      .eq('couple_id', selectedCoupleId)
      .order('logged_at', { ascending: false })
    if (data) setLogs(data)
  }

  const formatLogDate = (iso: string) => {
    const d = new Date(iso)
    const month = d.toLocaleDateString('en-US', { month: 'short' })
    const date = d.getDate()
    const hours = d.getHours()
    const mins = d.getMinutes().toString().padStart(2, '0')
    const ampm = hours >= 12 ? 'PM' : 'AM'
    const h = hours % 12 || 12
    return `${month} ${date}, ${h}:${mins} ${ampm}`
  }

  return (
    <div className={`${nunito.className} min-h-screen bg-gray-50`}>
      {/* Header */}
      <div className="bg-white border-b px-4 md:px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Package className="w-6 h-6 text-gray-600" />
          <h1 className={`${playfair.className} text-xl md:text-2xl font-bold text-gray-900`}>
            Backup Log
          </h1>
        </div>
        <button
          onClick={() => setLegendOpen(true)}
          className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 transition-colors"
        >
          <HelpCircle className="w-4 h-4" />
          Process Legend
        </button>
      </div>

      <div className="max-w-3xl mx-auto px-4 md:px-6 py-4 md:py-6 space-y-4 md:space-y-6">
        {/* Couple Selector */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1.5">COUPLE</label>
          <select
            value={selectedCoupleId}
            onChange={(e) => setSelectedCoupleId(e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="">Select a couple...</option>
            {couples.map((c) => (
              <option key={c.id} value={c.id}>
                {formatCoupleLabel(c)}
              </option>
            ))}
          </select>
        </div>

        {/* Log Form */}
        {selectedCoupleId && (
          <div className="bg-white rounded-lg border p-4 md:p-5 space-y-4">
            <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">
              Log a Copy
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Asset</label>
                <select
                  value={assetType}
                  onChange={(e) => setAssetType(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Select asset...</option>
                  {ASSET_TYPES.map((a) => (
                    <option key={a.value} value={a.value}>
                      {a.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Destination</label>
                <select
                  value={destination}
                  onChange={(e) => setDestination(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Select destination...</option>
                  {DESTINATIONS.map((d) => (
                    <option key={d.value} value={d.value}>
                      {d.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Size (GB)</label>
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  value={sizeGb}
                  onChange={(e) => setSizeGb(e.target.value)}
                  placeholder="e.g. 14"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Notes</label>
                <input
                  type="text"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Optional notes..."
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div className="flex justify-end">
              <button
                onClick={handleSubmit}
                disabled={!assetType || !destination || submitting}
                className="flex items-center gap-1.5 px-4 py-2.5 min-h-[44px] bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <Plus className="w-4 h-4" />
                {submitting ? 'Adding...' : 'Add to Log'}
              </button>
            </div>
          </div>
        )}

        {/* Copy History */}
        {selectedCoupleId && (
          <div className="bg-white rounded-lg border">
            <button
              onClick={() => setHistoryOpen(!historyOpen)}
              className="w-full flex items-center justify-between px-5 py-3 hover:bg-gray-50 transition-colors"
            >
              <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">
                Copy History for {selectedCouple?.couple_name || '...'}
              </h2>
              {historyOpen ? (
                <ChevronDown className="w-4 h-4 text-gray-400" />
              ) : (
                <ChevronRight className="w-4 h-4 text-gray-400" />
              )}
            </button>

            {historyOpen && (
              <div className="border-t px-5 py-3">
                {logs.length === 0 ? (
                  <p className="text-sm text-gray-400 italic py-2">No backup logs yet.</p>
                ) : (
                  <div className="space-y-2">
                    {logs.map((log) => (
                      <div key={log.id} className="py-2 border-b border-gray-100 last:border-0">
                        <p className="text-sm text-gray-800">
                          <span className="text-gray-500">{formatLogDate(log.logged_at)}</span>
                          {' — '}
                          <span className="font-medium">
                            {ASSET_LABEL_MAP[log.asset_type] || log.asset_type}
                          </span>
                          {' \u2192 '}
                          <span className="font-medium">
                            {DEST_LABEL_MAP[log.destination] || log.destination}
                          </span>
                          {log.size_gb != null && (
                            <span className="text-gray-500"> ({log.size_gb} GB)</span>
                          )}
                        </p>
                        {log.notes && (
                          <p className="text-xs text-gray-400 mt-0.5 ml-4">{log.notes}</p>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-6 right-6 bg-gray-900 text-white px-4 py-2.5 rounded-lg shadow-lg text-sm flex items-center gap-2 animate-in fade-in slide-in-from-bottom-2">
          {toast}
        </div>
      )}

      {/* Process Legend Modal */}
      {legendOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
          onClick={() => setLegendOpen(false)}
        >
          <div
            className="bg-white rounded-xl shadow-xl max-w-lg w-[95%] md:w-full mx-auto p-4 md:p-6"
            onClick={(e) => e.stopPropagation()
            }
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className={`${playfair.className} text-base md:text-lg font-bold text-gray-900`}>
                Archive Process
              </h2>
              <button
                onClick={() => setLegendOpen(false)}
                className="text-gray-400 hover:text-gray-600 min-h-[44px] min-w-[44px] flex items-center justify-center"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-5 text-sm text-gray-700">
              <div>
                <h3 className="font-bold text-gray-900 mb-1">STEP 1: T7 (Fingertips)</h3>
                <p className="text-gray-500 mb-1">Copy these to AssetT7 for active access:</p>
                <ul className="ml-4 space-y-0.5 text-gray-600">
                  <li>Long form video</li>
                  <li>Recap video</li>
                  <li>Wedding proofs</li>
                  <li>Eng proofs</li>
                  <li>Eng collage</li>
                </ul>
              </div>

              <div>
                <h3 className="font-bold text-gray-900 mb-1">STEP 2: Archive Drive (Full Backup)</h3>
                <p className="text-gray-500 mb-1">Copy EVERYTHING to Archive Drive:</p>
                <ul className="ml-4 space-y-0.5 text-gray-600">
                  <li>All items from T7</li>
                  <li>Hi-res wedding photos</li>
                  <li>Hi-res eng 16×16</li>
                  <li>Print final orders</li>
                  <li>Photo projects + RAW</li>
                </ul>
              </div>

              <div>
                <h3 className="font-bold text-gray-900 mb-1">STEP 3: AWS Glacier (Cold Storage)</h3>
                <p className="text-gray-500 mb-1">Zip and upload these packages:</p>
                <div className="ml-4 space-y-1 text-gray-600">
                  <p>BRIDE_GROOM_WEDDATE_FINAL_ENG_WED_PRINTS</p>
                  <p>BRIDE_GROOM_WEDDATE_FINAL_ENG_WED_PHOTO_PROJECTS_WITH_RAW</p>
                </div>
                <p className="text-gray-500 mt-1.5">
                  Each zip = project files + RAW photos + RAW video together.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
