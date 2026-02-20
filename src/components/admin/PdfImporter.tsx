'use client'

import { useState, useRef, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import type { ExtractedPdfData } from '@/lib/extractPdfData'
import {
  ChevronDown, ChevronRight, Upload, FileText, Loader2,
  CheckCircle2, AlertCircle, XCircle, Trash2
} from 'lucide-react'

interface PdfImporterProps {
  onImportComplete: () => void
}

interface QueueItem {
  file: File
  data: ExtractedPdfData | null
  status: 'extracting' | 'ready' | 'importing' | 'done' | 'error'
  selected: boolean
  error?: string
  coupleId?: string
}

function confidenceBadge(c: ExtractedPdfData['confidence']) {
  switch (c) {
    case 'high':
      return <span className="inline-flex items-center gap-1 rounded-full bg-green-100 text-green-700 px-2 py-0.5 text-xs font-medium"><CheckCircle2 className="h-3 w-3" /> High</span>
    case 'medium':
      return <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 text-amber-700 px-2 py-0.5 text-xs font-medium"><AlertCircle className="h-3 w-3" /> Medium</span>
    case 'low':
      return <span className="inline-flex items-center gap-1 rounded-full bg-red-100 text-red-700 px-2 py-0.5 text-xs font-medium"><XCircle className="h-3 w-3" /> Low</span>
  }
}

export default function PdfImporter({ onImportComplete }: PdfImporterProps) {
  const [open, setOpen] = useState(false)
  const [queue, setQueue] = useState<QueueItem[]>([])
  const [importing, setImporting] = useState(false)
  const [result, setResult] = useState<{ success: number; failed: number } | null>(null)
  const [dragOver, setDragOver] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const processFiles = useCallback(async (files: FileList | File[]) => {
    const pdfFiles = Array.from(files)
      .filter(f => f.type === 'application/pdf' || f.name.toLowerCase().endsWith('.pdf'))
      .slice(0, 10)

    if (pdfFiles.length === 0) return

    // Generate unique IDs for each file so we can track them through state updates
    const fileIds = pdfFiles.map((_, i) => `pdf-${Date.now()}-${i}`)

    const newItems: QueueItem[] = pdfFiles.map((f, i) => ({
      file: f,
      data: null,
      status: 'extracting' as const,
      selected: false,
      _id: fileIds[i],
    }))

    setQueue(prev => [...prev, ...newItems])
    setResult(null)

    // Send each file to server-side API for extraction
    for (let i = 0; i < pdfFiles.length; i++) {
      const targetFile = pdfFiles[i]
      const targetId = fileIds[i]
      try {
        const formData = new FormData()
        formData.append('file', targetFile)

        const res = await fetch('/api/parse-pdf', { method: 'POST', body: formData })
        if (!res.ok) {
          const errBody = await res.json().catch(() => ({ error: `HTTP ${res.status}` }))
          throw new Error(errBody.error || `Server error ${res.status}`)
        }

        const data: ExtractedPdfData = await res.json()
        setQueue(prev => prev.map(item =>
          (item as any)._id === targetId
            ? { ...item, data, status: 'ready' as const, selected: data.confidence !== 'low' && !!data.coupleName }
            : item
        ))
      } catch (e) {
        console.error(`[PDF Importer] Error extracting ${targetFile.name}:`, e)
        setQueue(prev => prev.map(item =>
          (item as any)._id === targetId
            ? { ...item, status: 'error' as const, error: e instanceof Error ? e.message : 'Extraction failed' }
            : item
        ))
      }
    }
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
    processFiles(e.dataTransfer.files)
  }, [processFiles])

  const toggleSelect = (idx: number) => {
    setQueue(prev => prev.map((item, i) =>
      i === idx ? { ...item, selected: !item.selected } : item
    ))
  }

  const toggleSelectAll = () => {
    const readyItems = queue.filter(q => q.status === 'ready')
    const allSelected = readyItems.every(q => q.selected)
    setQueue(prev => prev.map(item =>
      item.status === 'ready' ? { ...item, selected: !allSelected } : item
    ))
  }

  const clearQueue = () => {
    setQueue([])
    setResult(null)
  }

  const importSelected = async () => {
    const selectedItems = queue
      .map((item, idx) => ({ item, idx }))
      .filter(({ item }) => item.selected && item.status === 'ready' && item.data && item.data.coupleName)

    if (selectedItems.length === 0) return

    setImporting(true)
    setResult(null)
    let success = 0
    let failed = 0

    for (const { item, idx } of selectedItems) {
      const data = item.data!

      // Mark as importing
      setQueue(prev => prev.map((q, i) => i === idx ? { ...q, status: 'importing' as const } : q))

      try {
        // Build update fields from extracted data
        const updateFields: Record<string, any> = {
          bride_name: [data.brideFirstName, data.brideLastName].filter(Boolean).join(' ') || null,
          bride_email: data.brideEmail || null,
          bride_phone: data.bridePhone || null,
          groom_name: [data.groomFirstName, data.groomLastName].filter(Boolean).join(' ') || null,
          groom_email: data.groomEmail || null,
          groom_phone: data.groomPhone || null,
          ceremony_venue: data.ceremonyVenue || null,
          reception_venue: data.receptionVenue || null,
          package_type: data.packageType,
          coverage_hours: data.coverageHours,
          contract_total: data.total,
        }

        // Try to match existing couple — combine date + name for precision
        let coupleId: string | null = null

        // Match 1: date + bride first name (most precise)
        if (data.weddingDate && data.brideFirstName) {
          const { data: match } = await supabase
            .from('couples')
            .select('id, couple_name')
            .eq('wedding_date', data.weddingDate)
            .ilike('couple_name', `${data.brideFirstName}%`)
          if (match && match.length >= 1) {
            coupleId = match[0].id
            console.log(`[PDF Import] Matched by date+name: ${match[0].couple_name}`)
          }
        }

        // Match 2: date + groom first name
        if (!coupleId && data.weddingDate && data.groomFirstName) {
          const { data: match } = await supabase
            .from('couples')
            .select('id, couple_name')
            .eq('wedding_date', data.weddingDate)
            .ilike('couple_name', `%${data.groomFirstName}%`)
          if (match && match.length >= 1) {
            coupleId = match[0].id
            console.log(`[PDF Import] Matched by date+groom: ${match[0].couple_name}`)
          }
        }

        // Match 3: bride first name only (if unique)
        if (!coupleId && data.brideFirstName) {
          const { data: match } = await supabase
            .from('couples')
            .select('id, couple_name')
            .ilike('couple_name', `${data.brideFirstName}%`)
          if (match && match.length === 1) {
            coupleId = match[0].id
            console.log(`[PDF Import] Matched by bride name: ${match[0].couple_name}`)
          }
        }

        if (coupleId) {
          // UPDATE existing record
          const { error } = await supabase
            .from('couples')
            .update(updateFields)
            .eq('id', coupleId)
          if (error) throw error
        } else {
          // CREATE new record
          const insertRecord = {
            ...updateFields,
            couple_name: data.coupleName,
            wedding_date: data.weddingDate,
            wedding_year: data.weddingYear,
            balance_owing: data.total,
            status: 'booked',
            lead_source: 'pdf_import',
            notes: `Imported from ${data.fileName}`,
          }
          const { data: inserted, error } = await supabase
            .from('couples')
            .insert(insertRecord)
            .select('id')
            .single()
          if (error) throw error
          coupleId = inserted.id
        }

        // Upload PDF to storage
        const filePath = `${coupleId!}/${item.file.name}`
        await supabase.storage
          .from('couple-documents')
          .upload(filePath, item.file, { upsert: true })

        setQueue(prev => prev.map((q, i) =>
          i === idx ? { ...q, status: 'done' as const, coupleId: coupleId! } : q
        ))
        success++
      } catch (e: any) {
        const msg = e instanceof Error ? e.message : e?.message || JSON.stringify(e) || 'Import failed'
        console.error(`[PDF Import] Error importing ${data.coupleName}:`, e)
        setQueue(prev => prev.map((q, i) =>
          i === idx ? { ...q, status: 'error' as const, error: msg } : q
        ))
        failed++
      }
    }

    setImporting(false)
    setResult({ success, failed })

    // Clear successful items after a brief delay
    setTimeout(() => {
      setQueue(prev => prev.filter(q => q.status !== 'done'))
    }, 2000)

    if (success > 0) {
      onImportComplete()
    }
  }

  const readyCount = queue.filter(q => q.status === 'ready').length
  const selectedCount = queue.filter(q => q.selected && q.status === 'ready').length
  const extractingCount = queue.filter(q => q.status === 'extracting').length

  return (
    <div className="rounded-xl border bg-card overflow-hidden">
      {/* Toggle bar */}
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between p-4 hover:bg-accent/50 transition-colors text-left"
      >
        <div className="flex items-center gap-2">
          <Upload className="h-4 w-4 text-indigo-500" />
          <span className="font-semibold text-sm">Import PDFs</span>
          {queue.length > 0 && (
            <span className="text-xs bg-indigo-100 text-indigo-700 rounded-full px-2 py-0.5">
              {queue.length} in queue
            </span>
          )}
        </div>
        {open ? <ChevronDown className="h-4 w-4 text-muted-foreground" /> : <ChevronRight className="h-4 w-4 text-muted-foreground" />}
      </button>

      {open && (
        <div className="border-t p-4 space-y-4">
          {/* Drop zone */}
          <div
            onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
              dragOver
                ? 'border-indigo-400 bg-indigo-50'
                : 'border-border hover:border-indigo-300 hover:bg-muted/30'
            }`}
          >
            <Upload className={`h-8 w-8 mx-auto mb-2 ${dragOver ? 'text-indigo-500' : 'text-muted-foreground'}`} />
            <p className="text-sm font-medium">
              {dragOver ? 'Drop PDFs here' : 'Drag & drop SIGS quote PDFs here'}
            </p>
            <p className="text-xs text-muted-foreground mt-1">or click to browse (up to 10 files)</p>
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf"
              multiple
              className="hidden"
              onChange={(e) => {
                if (e.target.files) processFiles(e.target.files)
                e.target.value = ''
              }}
            />
          </div>

          {/* Result banner */}
          {result && (
            <div className={`rounded-lg p-3 text-sm font-medium ${
              result.failed === 0
                ? 'bg-green-50 text-green-700 border border-green-200'
                : 'bg-amber-50 text-amber-700 border border-amber-200'
            }`}>
              {result.success > 0 && `${result.success} couple${result.success > 1 ? 's' : ''} imported successfully.`}
              {result.failed > 0 && ` ${result.failed} failed.`}
            </div>
          )}

          {/* Review table */}
          {queue.length > 0 && (
            <div className="rounded-lg border overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="p-2 w-8">
                      <input
                        type="checkbox"
                        checked={readyCount > 0 && selectedCount === readyCount}
                        onChange={toggleSelectAll}
                        className="rounded"
                      />
                    </th>
                    <th className="text-left p-2 font-medium">File</th>
                    <th className="text-left p-2 font-medium hidden sm:table-cell">Couple</th>
                    <th className="text-left p-2 font-medium hidden md:table-cell">Date</th>
                    <th className="text-left p-2 font-medium hidden lg:table-cell">Package</th>
                    <th className="text-right p-2 font-medium hidden sm:table-cell">Total</th>
                    <th className="text-center p-2 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {queue.map((item, idx) => (
                    <tr key={idx} className={item.status === 'done' ? 'bg-green-50/50' : item.status === 'error' ? 'bg-red-50/50' : ''}>
                      <td className="p-2">
                        {item.status === 'ready' ? (
                          <input
                            type="checkbox"
                            checked={item.selected}
                            onChange={() => toggleSelect(idx)}
                            className="rounded"
                          />
                        ) : item.status === 'extracting' || item.status === 'importing' ? (
                          <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                        ) : item.status === 'done' ? (
                          <CheckCircle2 className="h-4 w-4 text-green-500" />
                        ) : (
                          <XCircle className="h-4 w-4 text-red-500" />
                        )}
                      </td>
                      <td className="p-2">
                        <div className="flex items-center gap-1.5 min-w-0">
                          <FileText className="h-3.5 w-3.5 text-red-500 shrink-0" />
                          <span className="truncate text-xs">{item.file.name}</span>
                        </div>
                      </td>
                      <td className="p-2 hidden sm:table-cell">
                        {item.data ? (
                          <span className="font-medium text-xs">{item.data.coupleName}</span>
                        ) : item.status === 'extracting' ? (
                          <span className="text-xs text-muted-foreground">Extracting...</span>
                        ) : null}
                      </td>
                      <td className="p-2 hidden md:table-cell text-xs text-muted-foreground">
                        {item.data?.weddingDateDisplay || '—'}
                      </td>
                      <td className="p-2 hidden lg:table-cell text-xs text-muted-foreground">
                        {item.data?.packageType === 'photo_only' ? 'Photo Only'
                          : item.data?.packageType === 'photo_video' ? 'Photo + Video'
                          : '—'}
                      </td>
                      <td className="p-2 text-right hidden sm:table-cell text-xs">
                        {item.data?.total ? `$${item.data.total.toLocaleString()}` : '—'}
                      </td>
                      <td className="p-2 text-center">
                        {item.status === 'ready' && item.data ? (
                          confidenceBadge(item.data.confidence)
                        ) : item.status === 'done' ? (
                          <span className="text-xs text-green-600 font-medium">Imported</span>
                        ) : item.status === 'error' ? (
                          <span className="text-xs text-red-600">{item.error || 'Error'}</span>
                        ) : item.status === 'importing' ? (
                          <span className="text-xs text-muted-foreground">Importing...</span>
                        ) : null}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Warnings for selected items */}
              {queue.filter(q => q.selected && q.data?.parseWarnings.length).map((item, i) => (
                <div key={i} className="px-3 py-2 bg-amber-50 border-t text-xs text-amber-700">
                  <span className="font-medium">{item.file.name}:</span>{' '}
                  {item.data!.parseWarnings.join('; ')}
                </div>
              ))}
            </div>
          )}

          {/* Action bar */}
          {queue.length > 0 && (
            <div className="flex items-center justify-between">
              <button
                onClick={clearQueue}
                disabled={importing}
                className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50"
              >
                <Trash2 className="h-3.5 w-3.5" /> Clear Queue
              </button>
              <button
                onClick={importSelected}
                disabled={importing || selectedCount === 0}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {importing ? (
                  <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Importing...</>
                ) : (
                  <>Import Selected ({selectedCount})</>
                )}
              </button>
            </div>
          )}

          {/* Extracting indicator */}
          {extractingCount > 0 && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Extracting data from {extractingCount} PDF{extractingCount > 1 ? 's' : ''}...
            </div>
          )}
        </div>
      )}
    </div>
  )
}
