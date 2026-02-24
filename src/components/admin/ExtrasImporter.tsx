'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import type { ExtractedExtrasData, ExtrasItem } from '@/lib/extractExtrasPdfData'
import {
  ChevronDown, ChevronRight, Upload, FileText, Loader2,
  CheckCircle2, AlertCircle, XCircle, Package, Search,
  DollarSign, List, UserCheck
} from 'lucide-react'

interface ExtrasImporterProps {
  onImportComplete: () => void
  defaultOpen?: boolean
}

interface CoupleMatch {
  id: string
  couple_name: string
  wedding_date: string | null
}

type FlowState = 'upload' | 'parsing' | 'review' | 'saving' | 'done' | 'error'

function confidenceBadge(c: ExtractedExtrasData['confidence']) {
  switch (c) {
    case 'high':
      return <span className="inline-flex items-center gap-1 rounded-full bg-green-100 text-green-700 px-2 py-0.5 text-xs font-medium"><CheckCircle2 className="h-3 w-3" /> High</span>
    case 'medium':
      return <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 text-amber-700 px-2 py-0.5 text-xs font-medium"><AlertCircle className="h-3 w-3" /> Medium</span>
    case 'low':
      return <span className="inline-flex items-center gap-1 rounded-full bg-red-100 text-red-700 px-2 py-0.5 text-xs font-medium"><XCircle className="h-3 w-3" /> Low</span>
  }
}

export default function ExtrasImporter({ onImportComplete, defaultOpen = false }: ExtrasImporterProps) {
  const [open, setOpen] = useState(defaultOpen)
  const [flowState, setFlowState] = useState<FlowState>('upload')
  const [data, setData] = useState<ExtractedExtrasData | null>(null)
  const [editableTotal, setEditableTotal] = useState('')
  const [errorMsg, setErrorMsg] = useState('')
  const [dragOver, setDragOver] = useState(false)
  const [uploadedFile, setUploadedFile] = useState<File | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Couple matching
  const [allCouples, setAllCouples] = useState<CoupleMatch[]>([])
  const [coupleSearch, setCoupleSearch] = useState('')
  const [selectedCouple, setSelectedCouple] = useState<CoupleMatch | null>(null)
  const [showCoupleDropdown, setShowCoupleDropdown] = useState(false)
  const [result, setResult] = useState<{ success: boolean; message: string } | null>(null)

  // Load couples list on mount
  useEffect(() => {
    async function load() {
      const { data } = await supabase
        .from('couples')
        .select('id, couple_name, wedding_date')
        .order('couple_name')
      if (data) setAllCouples(data)
    }
    load()
  }, [])

  // Auto-match couple when PDF is parsed
  useEffect(() => {
    if (data?.coupleName && allCouples.length > 0) {
      const pdfName = data.coupleName.toLowerCase()
      // Try exact-ish match first
      const exact = allCouples.find(c =>
        c.couple_name.toLowerCase() === pdfName
      )
      if (exact) {
        setSelectedCouple(exact)
        setCoupleSearch(exact.couple_name)
        return
      }
      // Fuzzy: match if PDF name words appear in couple name
      const words = pdfName.split(/[\s&]+/).filter(w => w.length > 2)
      const fuzzy = allCouples.find(c => {
        const cn = c.couple_name.toLowerCase()
        return words.filter(w => cn.includes(w)).length >= Math.min(words.length, 2)
      })
      if (fuzzy) {
        setSelectedCouple(fuzzy)
        setCoupleSearch(fuzzy.couple_name)
      } else {
        setCoupleSearch(data.coupleName)
      }
    }
  }, [data, allCouples])

  const filteredCouples = coupleSearch.trim()
    ? allCouples.filter(c =>
        c.couple_name.toLowerCase().includes(coupleSearch.toLowerCase())
      ).slice(0, 8)
    : allCouples.slice(0, 8)

  const processFile = useCallback(async (file: File) => {
    if (!file.name.toLowerCase().endsWith('.pdf')) {
      setErrorMsg('Please upload a PDF file')
      setFlowState('error')
      return
    }

    setUploadedFile(file)
    setFlowState('parsing')
    setErrorMsg('')
    setResult(null)

    try {
      const formData = new FormData()
      formData.append('file', file)

      const res = await fetch('/api/parse-extras-pdf', { method: 'POST', body: formData })
      if (!res.ok) {
        const errBody = await res.json().catch(() => ({ error: `HTTP ${res.status}` }))
        throw new Error(errBody.error || `Server error ${res.status}`)
      }

      const parsed: ExtractedExtrasData = await res.json()
      setData(parsed)
      setEditableTotal(parsed.total != null ? parsed.total.toString() : '')
      setFlowState('review')
    } catch (e) {
      setErrorMsg(e instanceof Error ? e.message : 'Failed to parse PDF')
      setFlowState('error')
    }
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
    const files = e.dataTransfer.files
    if (files.length > 0) processFile(files[0])
  }, [processFile])

  const handleSave = async () => {
    if (!data || !selectedCouple) return
    setFlowState('saving')

    try {
      const total = parseFloat(editableTotal) || data.total || 0

      const { error: insertErr } = await supabase
        .from('extras_orders')
        .insert({
          couple_id: selectedCouple.id,
          order_type: 'frames_albums',
          items: data.items,
          total,
          status: 'confirmed',
          order_date: new Date().toISOString().split('T')[0],
          notes: data.inclusions.length > 0
            ? `Inclusions: ${data.inclusions.join('; ')}`
            : null,
        })

      if (insertErr) throw insertErr

      await supabase
        .from('couples')
        .update({ extras_total: total })
        .eq('id', selectedCouple.id)

      if (uploadedFile) {
        const filePath = `${selectedCouple.id}/extras-${uploadedFile.name}`
        await supabase.storage
          .from('couple-documents')
          .upload(filePath, uploadedFile, { upsert: true })
      }

      setResult({ success: true, message: `Saved ${data.items.length} items ($${total.toLocaleString()}) for ${selectedCouple.couple_name}` })
      setFlowState('done')
      onImportComplete()
    } catch (e) {
      setErrorMsg(e instanceof Error ? e.message : 'Failed to save')
      setFlowState('error')
    }
  }

  const reset = () => {
    setFlowState('upload')
    setData(null)
    setEditableTotal('')
    setErrorMsg('')
    setUploadedFile(null)
    setSelectedCouple(null)
    setCoupleSearch('')
    setResult(null)
  }

  return (
    <div className="rounded-xl border bg-card overflow-hidden">
      {/* Toggle bar */}
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between p-4 hover:bg-accent/50 transition-colors text-left"
      >
        <div className="flex items-center gap-2">
          <Package className="h-4 w-4 text-teal-500" />
          <span className="font-semibold text-sm">Import Extras / Frames & Albums</span>
        </div>
        {open ? <ChevronDown className="h-4 w-4 text-muted-foreground" /> : <ChevronRight className="h-4 w-4 text-muted-foreground" />}
      </button>

      {open && (
        <div className="border-t p-4 space-y-4">
          {/* Upload state */}
          {flowState === 'upload' && (
            <div
              onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
              onDragLeave={() => setDragOver(false)}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
                dragOver
                  ? 'border-teal-400 bg-teal-50'
                  : 'border-border hover:border-teal-300 hover:bg-muted/30'
              }`}
            >
              <Upload className={`h-8 w-8 mx-auto mb-2 ${dragOver ? 'text-teal-500' : 'text-muted-foreground'}`} />
              <p className="text-sm font-medium">
                {dragOver ? 'Drop PDF here' : 'Drag & drop a Frames & Album quote PDF'}
              </p>
              <p className="text-xs text-muted-foreground mt-1">or click to browse</p>
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf"
                className="hidden"
                onChange={(e) => {
                  if (e.target.files?.[0]) processFile(e.target.files[0])
                  e.target.value = ''
                }}
              />
            </div>
          )}

          {/* Parsing state */}
          {flowState === 'parsing' && (
            <div className="py-8 text-center">
              <Loader2 className="h-8 w-8 mx-auto mb-2 animate-spin text-teal-500" />
              <p className="text-sm font-medium">Parsing extras PDF...</p>
              <p className="text-xs text-muted-foreground mt-1">Extracting items and pricing with AI</p>
            </div>
          )}

          {/* Review state */}
          {flowState === 'review' && data && (
            <div className="space-y-4">
              {/* Header with file + confidence */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <FileText className="h-4 w-4 text-red-500" />
                  <span className="text-xs text-muted-foreground truncate">{uploadedFile?.name}</span>
                </div>
                {confidenceBadge(data.confidence)}
              </div>

              {/* Warnings */}
              {data.parseWarnings.length > 0 && (
                <div className="rounded-lg bg-amber-50 border border-amber-200 p-3 text-xs text-amber-700">
                  {data.parseWarnings.map((w, i) => <p key={i}>{w}</p>)}
                </div>
              )}

              {/* Couple matcher */}
              <div className="rounded-lg border p-3">
                <div className="flex items-center gap-2 mb-2">
                  <UserCheck className="h-4 w-4 text-teal-600" />
                  <span className="text-sm font-medium">Match to Couple</span>
                  {selectedCouple && (
                    <span className="text-xs bg-green-100 text-green-700 rounded-full px-2 py-0.5">Matched</span>
                  )}
                </div>
                {data.coupleName && (
                  <p className="text-xs text-muted-foreground mb-2">PDF says: <span className="font-medium text-foreground">{data.coupleName}</span></p>
                )}
                <div className="relative">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                  <input
                    type="text"
                    value={coupleSearch}
                    onChange={(e) => {
                      setCoupleSearch(e.target.value)
                      setShowCoupleDropdown(true)
                      setSelectedCouple(null)
                    }}
                    onFocus={() => setShowCoupleDropdown(true)}
                    placeholder="Search couples..."
                    className="w-full pl-8 pr-3 py-1.5 text-sm border rounded-lg"
                  />
                  {showCoupleDropdown && filteredCouples.length > 0 && !selectedCouple && (
                    <div className="absolute z-10 top-full mt-1 w-full bg-card border rounded-lg shadow-lg max-h-48 overflow-y-auto">
                      {filteredCouples.map(c => (
                        <button
                          key={c.id}
                          onClick={() => {
                            setSelectedCouple(c)
                            setCoupleSearch(c.couple_name)
                            setShowCoupleDropdown(false)
                          }}
                          className="w-full text-left px-3 py-2 text-sm hover:bg-accent transition-colors flex items-center justify-between"
                        >
                          <span className="font-medium">{c.couple_name}</span>
                          {c.wedding_date && (
                            <span className="text-xs text-muted-foreground">{c.wedding_date}</span>
                          )}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Items table */}
              <div className="rounded-lg border overflow-hidden">
                <div className="flex items-center gap-2 px-3 py-2 bg-muted/50 border-b">
                  <Package className="h-3.5 w-3.5 text-teal-600" />
                  <span className="text-xs font-semibold">Items ({data.items.length})</span>
                </div>
                {data.items.length > 0 ? (
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b bg-muted/30">
                        <th className="text-left p-2 text-xs font-medium">Item</th>
                        <th className="text-left p-2 text-xs font-medium hidden sm:table-cell">Description</th>
                        <th className="text-right p-2 text-xs font-medium">Price</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {data.items.map((item: ExtrasItem, i: number) => (
                        <tr key={i}>
                          <td className="p-2 text-xs font-medium">{item.name}</td>
                          <td className="p-2 text-xs text-muted-foreground hidden sm:table-cell">{item.description || '—'}</td>
                          <td className="p-2 text-xs text-right">
                            {item.price != null ? `$${item.price.toLocaleString()}` : '—'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <p className="p-3 text-xs text-muted-foreground">No items extracted</p>
                )}
              </div>

              {/* Inclusions */}
              {data.inclusions.length > 0 && (
                <div className="rounded-lg border overflow-hidden">
                  <div className="flex items-center gap-2 px-3 py-2 bg-muted/50 border-b">
                    <List className="h-3.5 w-3.5 text-teal-600" />
                    <span className="text-xs font-semibold">Inclusions ({data.inclusions.length})</span>
                  </div>
                  <ul className="p-3 space-y-1">
                    {data.inclusions.map((inc, i) => (
                      <li key={i} className="text-xs flex items-start gap-1.5">
                        <CheckCircle2 className="h-3 w-3 text-green-500 mt-0.5 shrink-0" />
                        {inc}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Total */}
              <div className="flex items-center justify-between rounded-lg border p-3">
                <div className="flex items-center gap-2">
                  <DollarSign className="h-4 w-4 text-teal-600" />
                  <span className="text-sm font-medium">Total</span>
                </div>
                <div className="flex items-center gap-1">
                  <span className="text-sm text-muted-foreground">$</span>
                  <input
                    type="number"
                    value={editableTotal}
                    onChange={(e) => setEditableTotal(e.target.value)}
                    className="w-24 text-right font-semibold border rounded-lg px-2 py-1 text-sm bg-background"
                    placeholder="0"
                  />
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center justify-between pt-1">
                <button
                  onClick={reset}
                  className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  Start Over
                </button>
                <button
                  onClick={handleSave}
                  disabled={!selectedCouple}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-teal-600 text-white text-sm font-medium hover:bg-teal-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Save to {selectedCouple?.couple_name || 'Couple'}
                </button>
              </div>
            </div>
          )}

          {/* Saving state */}
          {flowState === 'saving' && (
            <div className="py-8 text-center">
              <Loader2 className="h-8 w-8 mx-auto mb-2 animate-spin text-teal-500" />
              <p className="text-sm font-medium">Saving extras order...</p>
            </div>
          )}

          {/* Done state */}
          {flowState === 'done' && result && (
            <div className="py-6 text-center">
              <CheckCircle2 className="h-10 w-10 mx-auto mb-2 text-green-500" />
              <p className="text-sm font-medium text-green-700">{result.message}</p>
              <button
                onClick={reset}
                className="mt-3 text-sm text-muted-foreground hover:text-foreground transition-colors underline"
              >
                Import Another
              </button>
            </div>
          )}

          {/* Error state */}
          {flowState === 'error' && (
            <div className="py-6 text-center">
              <XCircle className="h-10 w-10 mx-auto mb-2 text-red-500" />
              <p className="text-sm font-medium">Something went wrong</p>
              <p className="text-xs text-red-600 mt-1">{errorMsg}</p>
              <button
                onClick={reset}
                className="mt-3 text-sm text-muted-foreground hover:text-foreground transition-colors underline"
              >
                Try Again
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
