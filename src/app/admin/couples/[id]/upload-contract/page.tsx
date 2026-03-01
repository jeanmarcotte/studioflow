'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import type { ParsedContractData } from '@/app/api/parse-contract-pdf/route'
import {
  ArrowLeft, Upload, Loader2, CheckCircle2, AlertCircle,
  XCircle, DollarSign, FileText, MapPin, Camera, Video,
  Globe, Users, Calendar, Pen, CreditCard
} from 'lucide-react'

type PageState = 'upload' | 'parsing' | 'review' | 'saving' | 'done' | 'error'

export default function UploadContractPage() {
  const params = useParams()
  const router = useRouter()
  const coupleId = params.id as string

  const [coupleName, setCoupleName] = useState('')
  const [state, setState] = useState<PageState>('upload')
  const [data, setData] = useState<ParsedContractData | null>(null)
  const [errorMsg, setErrorMsg] = useState('')
  const [dragOver, setDragOver] = useState(false)
  const [uploadedFile, setUploadedFile] = useState<File | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

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

      const res = await fetch('/api/parse-contract-pdf', { method: 'POST', body: formData })
      if (!res.ok) {
        const errBody = await res.json().catch(() => ({ error: `HTTP ${res.status}` }))
        throw new Error(errBody.error || `Server error ${res.status}`)
      }

      const parsed: ParsedContractData = await res.json()
      setData(parsed)
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
      // Insert contract
      const { data: contract, error: contractErr } = await supabase
        .from('contracts')
        .insert({
          couple_id: coupleId,
          ...data.couple,
          ...data.wedding,
          ...data.locations,
          ...data.engagement,
          ...data.photos,
          ...data.albums,
          ...data.video,
          ...data.web,
          ...data.team,
          subtotal: data.financials.subtotal,
          tax: data.financials.tax,
          total: data.financials.total,
          signed_date: data.financials.signed_date || null,
          appointment_notes: data.appointment_notes || null,
        })
        .select('id')
        .single()

      if (contractErr) throw contractErr

      // Insert installments
      if (data.installments.length > 0 && contract) {
        const { error: instErr } = await supabase
          .from('contract_installments')
          .insert(
            data.installments.map(inst => ({
              contract_id: contract.id,
              installment_number: inst.installment_number,
              due_description: inst.due_description,
              amount: inst.amount,
              due_date: inst.due_date || null,
            }))
          )
        if (instErr) throw instErr
      }

      // Insert signature
      if (data.signature.signer_name && contract) {
        const { error: sigErr } = await supabase
          .from('contract_signatures')
          .insert({
            contract_id: contract.id,
            signer_name: data.signature.signer_name,
            signer_email: data.signature.signer_email || null,
            signed_at: data.signature.signed_at || null,
            ip_address: data.signature.ip_address || null,
          })
        if (sigErr) throw sigErr
      }

      // Update couple record with contract total
      await supabase
        .from('couples')
        .update({
          contract_total: data.financials.total,
          wedding_date: data.wedding.wedding_date || undefined,
        })
        .eq('id', coupleId)

      // Upload PDF to storage
      if (uploadedFile) {
        const filePath = `${coupleId}/contract-${uploadedFile.name}`
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
    setErrorMsg('')
    setUploadedFile(null)
  }

  return (
    <div className="min-h-screen bg-background p-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <button
          onClick={() => router.push(`/admin/couples/${coupleId}`)}
          className="p-2 rounded-lg hover:bg-accent transition-colors"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div>
          <h1 className="text-xl font-bold">Upload Contract</h1>
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
              {dragOver ? 'Drop PDF here' : 'Drag & drop a signed contract PDF'}
            </p>
            <p className="text-xs text-muted-foreground mt-1">Adobe Sign PDF with 3-4 pages</p>
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
          <p className="font-medium">Parsing Contract...</p>
          <p className="text-sm text-muted-foreground mt-1">Extracting deliverables, financials, and signature with AI</p>
        </div>
      )}

      {/* Review State */}
      {state === 'review' && data && (
        <div className="space-y-4">
          {/* Header row */}
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

          {/* Couple & Wedding Info */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Section icon={Users} title="Couple">
              <Field label="Bride" value={`${data.couple.bride_first_name} ${data.couple.bride_last_name}`.trim()} />
              <Field label="Groom" value={`${data.couple.groom_first_name} ${data.couple.groom_last_name}`.trim()} />
              <Field label="Email" value={data.couple.email} />
              <Field label="Phone" value={data.couple.phone} />
            </Section>
            <Section icon={Calendar} title="Wedding">
              <Field label="Date" value={data.wedding.wedding_date} />
              <Field label="Start" value={data.wedding.start_time} />
              <Field label="End" value={data.wedding.end_time} />
            </Section>
          </div>

          {/* Locations */}
          <Section icon={MapPin} title="Locations">
            <div className="flex flex-wrap gap-2">
              {[
                ['Groom Prep', data.locations.loc_groom],
                ['Bride Prep', data.locations.loc_bride],
                ['Ceremony', data.locations.loc_ceremony],
                ['Park', data.locations.loc_park],
                ['Reception', data.locations.loc_reception],
              ].map(([label, checked]) => (
                <span
                  key={label as string}
                  className={`text-xs px-2.5 py-1 rounded-full font-medium ${
                    checked ? 'bg-teal-100 text-teal-700' : 'bg-muted text-muted-foreground'
                  }`}
                >
                  {checked ? '\u2713' : '\u2717'} {label as string}
                </span>
              ))}
            </div>
          </Section>

          {/* Engagement */}
          {data.engagement.engagement_session && (
            <Section icon={Camera} title="Engagement Session">
              <Field label="Location" value={data.engagement.engagement_location} />
              <Field label="Notes" value={data.engagement.engagement_notes} />
            </Section>
          )}

          {/* Photos & Prints */}
          <Section icon={Camera} title="Photos & Prints">
            <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
              {[
                ['Postcards', data.photos.prints_postcard_thankyou],
                ['5x7', data.photos.prints_5x7],
                ['8x10', data.photos.prints_8x10],
                ['11x14', data.photos.prints_11x14],
                ['16x16', data.photos.prints_16x16],
                ['16x20', data.photos.prints_16x20],
                ['20x24', data.photos.prints_20x24],
                ['24x30', data.photos.prints_24x30],
                ['30x40', data.photos.prints_30x40],
              ].filter(([, qty]) => (qty as number) > 0).map(([size, qty]) => (
                <div key={size as string} className="text-center p-2 bg-muted/50 rounded-lg">
                  <div className="text-lg font-bold text-teal-600">{qty as number}</div>
                  <div className="text-[11px] text-muted-foreground">{size as string}</div>
                </div>
              ))}
            </div>
            <div className="flex gap-2 mt-2">
              {data.photos.post_production && <Badge label="Post Production" />}
              {data.photos.drone_photography && <Badge label="Drone" />}
            </div>
          </Section>

          {/* Albums */}
          {(data.albums.parent_albums_qty > 0 || data.albums.bride_groom_album_qty > 0) && (
            <Section icon={FileText} title="Albums">
              {data.albums.parent_albums_qty > 0 && (
                <div className="mb-2">
                  <p className="text-xs font-medium text-muted-foreground mb-1">Parent Albums</p>
                  <p className="text-sm">
                    {data.albums.parent_albums_qty}x {data.albums.parent_albums_size}
                    {data.albums.parent_albums_spreads ? ` \u2022 ${data.albums.parent_albums_spreads} spreads` : ''}
                    {data.albums.parent_albums_images ? ` \u2022 ${data.albums.parent_albums_images} images` : ''}
                    {data.albums.parent_albums_cover ? ` \u2022 ${data.albums.parent_albums_cover}` : ''}
                  </p>
                </div>
              )}
              {data.albums.bride_groom_album_qty > 0 && (
                <div>
                  <p className="text-xs font-medium text-muted-foreground mb-1">Bride & Groom Album</p>
                  <p className="text-sm">
                    {data.albums.bride_groom_album_qty}x {data.albums.bride_groom_album_size}
                    {data.albums.bride_groom_album_spreads ? ` \u2022 ${data.albums.bride_groom_album_spreads} spreads` : ''}
                    {data.albums.bride_groom_album_images ? ` \u2022 ${data.albums.bride_groom_album_images} images` : ''}
                    {data.albums.bride_groom_album_cover ? ` \u2022 ${data.albums.bride_groom_album_cover}` : ''}
                  </p>
                </div>
              )}
            </Section>
          )}

          {/* Video */}
          <Section icon={Video} title="Video">
            <div className="flex flex-wrap gap-1.5">
              {Object.entries(data.video)
                .filter(([key, val]) => key !== 'video_highlights' && val === true)
                .map(([key]) => (
                  <Badge key={key} label={key.replace('video_', '').replace(/_/g, ' ')} />
                ))}
              {data.video.video_highlights > 0 && (
                <Badge label={`${data.video.video_highlights} highlights`} />
              )}
            </div>
            {Object.values(data.video).every(v => v === false || v === 0) && (
              <p className="text-sm text-muted-foreground">No video included</p>
            )}
          </Section>

          {/* Web */}
          <Section icon={Globe} title="Web">
            <div className="flex flex-wrap gap-1.5">
              {data.web.web_personal_page && <Badge label="Personal Page" />}
              {data.web.web_engagement_upload > 0 && <Badge label={`${data.web.web_engagement_upload} engagement uploads`} />}
              {data.web.web_wedding_upload > 0 && <Badge label={`${data.web.web_wedding_upload} wedding uploads`} />}
            </div>
          </Section>

          {/* Team */}
          <Section icon={Users} title="Team">
            <Field label="Photographer" value={data.team.photographer} />
            <Field label="Videographer" value={data.team.videographer} />
          </Section>

          {/* Financials */}
          <Section icon={DollarSign} title="Financials">
            <div className="space-y-1">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Subtotal</span>
                <span>${data.financials.subtotal.toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Tax</span>
                <span>${data.financials.tax.toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-sm font-bold border-t pt-1">
                <span>Total</span>
                <span className="text-teal-600">${data.financials.total.toLocaleString()}</span>
              </div>
            </div>
          </Section>

          {/* Installments */}
          {data.installments.length > 0 && (
            <Section icon={CreditCard} title={`Installments (${data.installments.length})`}>
              <div className="space-y-1.5">
                {data.installments.map((inst, i) => (
                  <div key={i} className="flex items-center justify-between text-sm">
                    <div>
                      <span className="text-muted-foreground mr-2">#{inst.installment_number}</span>
                      <span>{inst.due_description}</span>
                    </div>
                    <div className="text-right">
                      <span className="font-medium">${inst.amount.toLocaleString()}</span>
                      {inst.due_date && (
                        <span className="text-xs text-muted-foreground ml-2">{inst.due_date}</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </Section>
          )}

          {/* Signature */}
          {data.signature.signer_name && (
            <Section icon={Pen} title="Signature">
              <Field label="Signer" value={data.signature.signer_name} />
              <Field label="Email" value={data.signature.signer_email} />
              <Field label="Signed" value={data.signature.signed_at} />
              <Field label="IP" value={data.signature.ip_address} />
            </Section>
          )}

          {/* Notes */}
          {data.appointment_notes && (
            <div className="rounded-xl border bg-card p-4">
              <p className="text-xs font-medium text-muted-foreground mb-1">Appointment Notes</p>
              <p className="text-sm whitespace-pre-wrap">{data.appointment_notes}</p>
            </div>
          )}

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
              <CheckCircle2 className="h-4 w-4" />
              Save Contract
            </button>
          </div>
        </div>
      )}

      {/* Saving State */}
      {state === 'saving' && (
        <div className="rounded-xl border bg-card p-12 text-center">
          <Loader2 className="h-10 w-10 mx-auto mb-3 animate-spin text-teal-500" />
          <p className="font-medium">Saving contract...</p>
          <p className="text-sm text-muted-foreground mt-1">Writing to contracts, installments, and signatures</p>
        </div>
      )}

      {/* Done State */}
      {state === 'done' && (
        <div className="rounded-xl border bg-card p-12 text-center">
          <CheckCircle2 className="h-12 w-12 mx-auto mb-3 text-green-500" />
          <p className="font-semibold text-lg">Contract Saved!</p>
          <p className="text-sm text-muted-foreground mt-1">
            {data?.couple.bride_first_name} & {data?.couple.groom_first_name} &mdash; ${data?.financials.total.toLocaleString()}
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

function Section({ icon: Icon, title, children }: { icon: any; title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border bg-card p-4">
      <div className="flex items-center gap-2 mb-3">
        <Icon className="h-4 w-4 text-teal-600" />
        <h2 className="font-semibold text-sm">{title}</h2>
      </div>
      {children}
    </div>
  )
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between text-sm py-0.5">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium">{value || '\u2014'}</span>
    </div>
  )
}

function Badge({ label }: { label: string }) {
  return (
    <span className="text-xs px-2 py-0.5 rounded-full bg-teal-100 text-teal-700 font-medium capitalize">
      {label}
    </span>
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
