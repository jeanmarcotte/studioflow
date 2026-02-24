'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import type { ExtractedExtrasData, ExtrasItem } from '@/lib/extractExtrasPdfData'
import {
  ArrowLeft, Upload, Loader2, CheckCircle2, AlertCircle,
  XCircle, DollarSign, Package, FileText, List
} from 'lucide-react'

type PageState = 'upload' | 'parsing' | 'review' | 'saving' | 'done' | 'error'

export default function UploadExtrasPage() {
  const params = useParams()
  const router = useRouter()
  const coupleId = params.id as string

  const [coupleName, setCoupleName] = useState<string>('')
  const [state, setState] = useState<PageState>('upload')
  const [data, setData] = useState<ExtractedExtrasData | null>(null)
  const [editableTotal, setEditableTotal] = useState<string>('')
  const [errorMsg, setErrorMsg] = useState<string>('')
  const [dragOver, setDragOver] = useState(false)
  const [uploadedFile, setUploadedFile] = useState<File | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Fetch couple name on mount
  useEffect(() => {
    async function fetchCouple() {
      const { data: couple } = await supabase
        .from('couples')
        .select('couple_name')
        .eq('id', coupleId)
        .single()
      if (couple) setCoupleName(couple.couple_name)
    }
    fetchCouple()
  }, [coupleId])

  const processFile = useCallback(async (file: File) => {
    if (!file.name.toLowerCase().endsWith('.pdf')) {
      setErrorMsg('Please upload a PDF file')
      setState('error')
      return
    }

    setUploadedFile(file)
    setState('parsing')
    setErrorMsg('')

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
      setState('review')
    } catch (e) {
      setErrorMsg(e instanceof Error ? e.message : 'Failed to parse PDF')
      setState('error')
    }
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
    const files = e.dataTransfer.files
    if (files.length > 0) processFile(files[0])
  }, [processFile])

  const handleSave = async () => {
    if (!data) return
    setState('saving')

    try {
      const total = parseFloat(editableTotal) || data.total || 0

      // Insert into extras_orders
      const { error: insertErr } = await supabase
        .from('extras_orders')
        .insert({
          couple_id: coupleId,
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

      // Update couple's extras_total
      await supabase
        .from('couples')
        .update({ extras_total: total })
        .eq('id', coupleId)

      // Upload PDF to storage if we have the file
      if (uploadedFile) {
        const filePath = `${coupleId}/extras-${uploadedFile.name}`
        await supabase.storage
          .from('couple-documents')
          .upload(filePath, uploadedFile, { upsert: true })
      }

      setState('done')
    } catch (e) {
      setErrorMsg(e instanceof Error ? e.message : 'Failed to save')
      setState('error')
    }
  }

  const reset = () => {
    setState('upload')
    setData(null)
    setEditableTotal('')
    setErrorMsg('')
    setUploadedFile(null)
  }

  return (
    <div className="min-h-screen bg-background p-6 max-w-3xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <button
          onClick={() => router.push(`/admin/couples/${coupleId}`)}
          className="p-2 rounded-lg hover:bg-accent transition-colors"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div>
          <h1 className="text-xl font-bold">Upload Extras Quote</h1>
          {coupleName && (
            <p className="text-sm text-muted-foreground">{coupleName}</p>
          )}
        </div>
      </div>

      {/* Upload State */}
      {state === 'upload' && (
        <div className="rounded-xl border bg-card p-6">
          <div
            onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`border-2 border-dashed rounded-lg p-12 text-center cursor-pointer transition-colors ${
              dragOver
                ? 'border-teal-400 bg-teal-50'
                : 'border-border hover:border-teal-300 hover:bg-muted/30'
            }`}
          >
            <Upload className={`h-10 w-10 mx-auto mb-3 ${dragOver ? 'text-teal-500' : 'text-muted-foreground'}`} />
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
        </div>
      )}

      {/* Parsing State */}
      {state === 'parsing' && (
        <div className="rounded-xl border bg-card p-12 text-center">
          <Loader2 className="h-10 w-10 mx-auto mb-3 animate-spin text-teal-500" />
          <p className="font-medium">Parsing PDF...</p>
          <p className="text-sm text-muted-foreground mt-1">Extracting items and pricing with AI</p>
        </div>
      )}

      {/* Review State */}
      {state === 'review' && data && (
        <div className="space-y-4">
          {/* Confidence badge */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FileText className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">{uploadedFile?.name}</span>
            </div>
            <ConfidenceBadge confidence={data.confidence} />
          </div>

          {/* Warnings */}
          {data.parseWarnings.length > 0 && (
            <div className="rounded-lg bg-amber-50 border border-amber-200 p-3 text-sm text-amber-700">
              {data.parseWarnings.map((w, i) => (
                <p key={i}>{w}</p>
              ))}
            </div>
          )}

          {/* Couple name from PDF */}
          {data.coupleName && (
            <div className="rounded-xl border bg-card p-4">
              <p className="text-xs font-medium text-muted-foreground mb-1">Couple (from PDF)</p>
              <p className="font-semibold">{data.coupleName}</p>
            </div>
          )}

          {/* Items table */}
          <div className="rounded-xl border bg-card overflow-hidden">
            <div className="flex items-center gap-2 p-4 border-b">
              <Package className="h-4 w-4 text-teal-600" />
              <h2 className="font-semibold text-sm">Items ({data.items.length})</h2>
            </div>
            {data.items.length > 0 ? (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="text-left p-3 font-medium">Item</th>
                    <th className="text-left p-3 font-medium">Description</th>
                    <th className="text-right p-3 font-medium">Price</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {data.items.map((item: ExtrasItem, i: number) => (
                    <tr key={i}>
                      <td className="p-3 font-medium">{item.name}</td>
                      <td className="p-3 text-muted-foreground">{item.description || '—'}</td>
                      <td className="p-3 text-right">
                        {item.price != null ? `$${item.price.toLocaleString()}` : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <p className="p-4 text-sm text-muted-foreground">No items extracted</p>
            )}
          </div>

          {/* Inclusions */}
          {data.inclusions.length > 0 && (
            <div className="rounded-xl border bg-card overflow-hidden">
              <div className="flex items-center gap-2 p-4 border-b">
                <List className="h-4 w-4 text-teal-600" />
                <h2 className="font-semibold text-sm">Inclusions ({data.inclusions.length})</h2>
              </div>
              <ul className="p-4 space-y-1.5">
                {data.inclusions.map((inc, i) => (
                  <li key={i} className="text-sm flex items-start gap-2">
                    <CheckCircle2 className="h-3.5 w-3.5 text-green-500 mt-0.5 shrink-0" />
                    {inc}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Financial summary */}
          <div className="rounded-xl border bg-card p-4">
            <div className="flex items-center gap-2 mb-3">
              <DollarSign className="h-4 w-4 text-teal-600" />
              <h2 className="font-semibold text-sm">Financial Summary</h2>
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Total</span>
                <div className="flex items-center gap-1">
                  <span className="text-sm text-muted-foreground">$</span>
                  <input
                    type="number"
                    value={editableTotal}
                    onChange={(e) => setEditableTotal(e.target.value)}
                    className="w-28 text-right font-semibold text-lg border rounded-lg px-2 py-1 bg-background"
                    placeholder="0"
                  />
                </div>
              </div>
              {data.remainingBalance != null && (
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Remaining Balance</span>
                  <span className="font-medium">${data.remainingBalance.toLocaleString()}</span>
                </div>
              )}
              {data.paymentSchedule && data.paymentSchedule.length > 0 && (
                <div className="mt-3 pt-3 border-t">
                  <p className="text-xs font-medium text-muted-foreground mb-2">Payment Schedule</p>
                  {data.paymentSchedule.map((ps, i) => (
                    <div key={i} className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">{ps.milestone}</span>
                      <span className="font-medium">${ps.amount.toLocaleString()}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex items-center justify-between pt-2">
            <button
              onClick={reset}
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              Start Over
            </button>
            <button
              onClick={handleSave}
              className="inline-flex items-center gap-2 px-6 py-2.5 rounded-lg bg-teal-600 text-white font-medium hover:bg-teal-700 transition-colors"
            >
              <DollarSign className="h-4 w-4" />
              Save to Database
            </button>
          </div>
        </div>
      )}

      {/* Saving State */}
      {state === 'saving' && (
        <div className="rounded-xl border bg-card p-12 text-center">
          <Loader2 className="h-10 w-10 mx-auto mb-3 animate-spin text-teal-500" />
          <p className="font-medium">Saving extras order...</p>
        </div>
      )}

      {/* Done State */}
      {state === 'done' && (
        <div className="rounded-xl border bg-card p-12 text-center">
          <CheckCircle2 className="h-12 w-12 mx-auto mb-3 text-green-500" />
          <p className="font-semibold text-lg">Extras Order Saved!</p>
          <p className="text-sm text-muted-foreground mt-1">
            {data?.items.length} items totalling ${editableTotal || data?.total || 0}
          </p>
          <div className="flex items-center justify-center gap-3 mt-6">
            <button
              onClick={reset}
              className="px-4 py-2 rounded-lg border text-sm font-medium hover:bg-accent transition-colors"
            >
              Upload Another
            </button>
            <button
              onClick={() => router.push(`/admin/couples/${coupleId}`)}
              className="px-4 py-2 rounded-lg bg-teal-600 text-white text-sm font-medium hover:bg-teal-700 transition-colors"
            >
              Back to {coupleName || 'Couple'}
            </button>
          </div>
        </div>
      )}

      {/* Error State */}
      {state === 'error' && (
        <div className="rounded-xl border bg-card p-12 text-center">
          <XCircle className="h-12 w-12 mx-auto mb-3 text-red-500" />
          <p className="font-semibold text-lg">Something went wrong</p>
          <p className="text-sm text-red-600 mt-1">{errorMsg}</p>
          <button
            onClick={reset}
            className="mt-6 px-4 py-2 rounded-lg border text-sm font-medium hover:bg-accent transition-colors"
          >
            Try Again
          </button>
        </div>
      )}
    </div>
  )
}

function ConfidenceBadge({ confidence }: { confidence: 'high' | 'medium' | 'low' }) {
  switch (confidence) {
    case 'high':
      return (
        <span className="inline-flex items-center gap-1 rounded-full bg-green-100 text-green-700 px-2 py-0.5 text-xs font-medium">
          <CheckCircle2 className="h-3 w-3" /> High Confidence
        </span>
      )
    case 'medium':
      return (
        <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 text-amber-700 px-2 py-0.5 text-xs font-medium">
          <AlertCircle className="h-3 w-3" /> Medium Confidence
        </span>
      )
    case 'low':
      return (
        <span className="inline-flex items-center gap-1 rounded-full bg-red-100 text-red-700 px-2 py-0.5 text-xs font-medium">
          <XCircle className="h-3 w-3" /> Low Confidence
        </span>
      )
  }
}
