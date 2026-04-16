'use client'

import { useState, useRef } from 'react'
import Link from 'next/link'
import { ArrowLeft, ImageIcon, Camera } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'

const SHOWS: { id: string; dates: [string, string] }[] = [
  { id: 'modern-feb-2026', dates: ['2026-02-21', '2026-02-23'] },
  { id: 'weddingring-oakville-mar-2026', dates: ['2026-03-07', '2026-03-09'] },
  { id: 'weddingring-newmarket-apr-2026', dates: ['2026-04-25', '2026-04-27'] },
  { id: 'cbs-oct-2026', dates: ['2026-10-01', '2026-10-05'] },
  { id: 'cbs-jan-2027', dates: ['2027-01-14', '2027-01-18'] },
  { id: 'hamilton-ring-mar-2026', dates: ['2026-03-28', '2026-03-29'] },
]

function detectShowId(): string {
  const today = new Date().toISOString().slice(0, 10)
  for (const show of SHOWS) {
    if (today >= show.dates[0] && today <= show.dates[1]) return show.id
  }
  return 'unknown'
}

interface BallotData {
  bride_first_name: string
  bride_last_name: string
  groom_first_name: string
  groom_last_name: string
  wedding_date: string
  cell_phone: string
  email: string
  venue_name: string
  guest_count: number | null
  has_photographer: boolean
  has_videographer: boolean
  has_venue: boolean
}

const emptyBallot: BallotData = {
  bride_first_name: '',
  bride_last_name: '',
  groom_first_name: '',
  groom_last_name: '',
  wedding_date: '',
  cell_phone: '',
  email: '',
  venue_name: '',
  guest_count: null,
  has_photographer: false,
  has_videographer: false,
  has_venue: false,
}

type Step = 'capture' | 'processing' | 'review' | 'saved'

export default function ScannerPage() {
  const [step, setStep] = useState<Step>('capture')
  const [imageData, setImageData] = useState<string | null>(null)
  const [ballot, setBallot] = useState<BallotData>(emptyBallot)
  const [error, setError] = useState<string | null>(null)
  const [savedCount, setSavedCount] = useState(0)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const cameraInputRef = useRef<HTMLInputElement>(null)

  const getPin = () => sessionStorage.getItem('admin_pin') || ''

  const resizeImage = (file: File, maxWidth = 1600): Promise<string> => {
    return new Promise((resolve) => {
      const reader = new FileReader()
      reader.onload = (ev) => {
        const img = new Image()
        img.onload = () => {
          if (img.width <= maxWidth && file.size < 3_000_000) {
            resolve(ev.target?.result as string)
            return
          }
          const canvas = document.createElement('canvas')
          const scale = Math.min(maxWidth / img.width, 1)
          canvas.width = img.width * scale
          canvas.height = img.height * scale
          const ctx = canvas.getContext('2d')!
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
          resolve(canvas.toDataURL('image/jpeg', 0.85))
        }
        img.src = ev.target?.result as string
      }
      reader.readAsDataURL(file)
    })
  }

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const resized = await resizeImage(file)
    setImageData(resized)
    setError(null)
    e.target.value = ''
  }

  const processImage = async () => {
    if (!imageData) return
    setStep('processing')
    setError(null)

    try {
      const res = await fetch('/api/scan-ballot', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-pin': getPin(),
        },
        body: JSON.stringify({ action: 'scan', image: imageData }),
      })

      if (res.status === 401) {
        setError('Not authenticated. Go back and enter PIN.')
        setStep('capture')
        return
      }

      if (!res.ok) {
        const body = await res.json()
        setError(body.error || 'Processing failed')
        setStep('capture')
        return
      }

      const data = await res.json()
      setBallot({
        bride_first_name: data.bride_first_name || '',
        bride_last_name: data.bride_last_name || '',
        groom_first_name: data.groom_first_name || '',
        groom_last_name: data.groom_last_name || '',
        wedding_date: data.wedding_date || '',
        cell_phone: data.cell_phone || '',
        email: data.email || '',
        venue_name: data.venue_name || '',
        guest_count: data.guest_count ?? null,
        has_photographer: data.has_photographer ?? false,
        has_videographer: data.has_videographer ?? false,
        has_venue: data.has_venue ?? false,
      })
      setStep('review')
    } catch {
      setError('Network error. Check your connection.')
      setStep('capture')
    }
  }

  const saveBallot = async () => {
    try {
      const res = await fetch('/api/scan-ballot', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-pin': getPin(),
        },
        body: JSON.stringify({ action: 'save', ballot, show_id: detectShowId() }),
      })

      if (!res.ok) {
        const body = await res.json()
        setError(body.error || 'Save failed')
        return
      }

      setSavedCount(prev => prev + 1)
      setStep('saved')
    } catch {
      setError('Network error. Check your connection.')
    }
  }

  const scanAnother = () => {
    setImageData(null)
    setBallot(emptyBallot)
    setError(null)
    setStep('capture')
  }

  const handleField = (field: keyof BallotData, value: string | number | boolean | null) => {
    setBallot(prev => ({ ...prev, [field]: value }))
  }

  const formatPhone = (value: string) => {
    const digits = value.replace(/\D/g, '').slice(0, 10)
    if (digits.length === 0) return ''
    if (digits.length <= 3) return `(${digits}`
    if (digits.length <= 6) return `(${digits.slice(0, 3)}) ${digits.slice(3)}`
    return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`
  }

  // ─── Capture Step ──────────────────────────────────────────
  if (step === 'capture') {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="bg-gray-800 shadow-md sticky top-0 z-20">
          <div className="max-w-lg mx-auto px-4 py-3 flex items-center justify-between">
            <Link href="/leads" className="flex items-center gap-1 text-blue-300 font-medium text-sm">
              <ArrowLeft className="w-5 h-5" />
              Back
            </Link>
            <h1 className="font-bold text-white">Scan Ballot</h1>
            <div className="w-14" />
          </div>
        </div>

        <div className="max-w-lg mx-auto px-4 pt-8 pb-8 space-y-6">
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-red-700 text-sm">
              {error}
            </div>
          )}

          {savedCount > 0 && (
            <div className="bg-green-50 border border-green-200 rounded-xl p-3 text-green-700 text-sm text-center font-medium">
              {savedCount} ballot{savedCount !== 1 ? 's' : ''} saved this session
            </div>
          )}

          {imageData ? (
            <div className="space-y-4">
              <div className="rounded-xl overflow-hidden border-2 border-gray-200 shadow-sm">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={imageData} alt="Ballot preview" className="w-full" />
              </div>
              <Button
                onClick={processImage}
                className="w-full h-12 text-base font-bold bg-purple-600 hover:bg-purple-700"
                size="lg"
              >
                Process with AI
              </Button>
              <Button
                variant="outline"
                onClick={() => { setImageData(null); setError(null) }}
                className="w-full"
              >
                Choose Different Image
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              <Card>
                <CardContent className="pt-6 text-center space-y-2">
                  <div className="text-5xl mb-4">📋</div>
                  <h2 className="text-lg font-bold text-gray-900">Scan a Paper Ballot</h2>
                  <p className="text-sm text-muted-foreground">Take a photo or choose an image of a completed ballot form</p>
                </CardContent>
              </Card>

              <Button
                onClick={() => fileInputRef.current?.click()}
                className="w-full h-14 text-lg font-bold bg-blue-600 hover:bg-blue-700"
                size="lg"
              >
                <ImageIcon className="w-5 h-5 mr-2" /> Choose Image
              </Button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileSelect}
                className="hidden"
              />

              <Button
                variant="outline"
                onClick={() => cameraInputRef.current?.click()}
                className="w-full h-14 text-lg font-bold"
                size="lg"
              >
                <Camera className="w-5 h-5 mr-2" /> Take Photo
              </Button>
              <input
                ref={cameraInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                onChange={handleFileSelect}
                className="hidden"
              />
            </div>
          )}
        </div>
      </div>
    )
  }

  // ─── Processing Step ───────────────────────────────────────
  if (step === 'processing') {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-8">
        <div className="text-center space-y-4">
          <div className="w-16 h-16 border-4 border-purple-200 border-t-purple-600 rounded-full animate-spin mx-auto" />
          <h2 className="text-xl font-bold text-gray-900">Reading Ballot...</h2>
          <p className="text-sm text-muted-foreground">AI is extracting the information</p>
        </div>
      </div>
    )
  }

  // ─── Saved Step ────────────────────────────────────────────
  if (step === 'saved') {
    return (
      <div className="min-h-screen bg-gradient-to-b from-green-500 to-green-600 flex flex-col items-center justify-center p-8">
        <div className="text-center text-white space-y-4">
          <div className="text-7xl">✅</div>
          <h2 className="text-3xl font-bold">Lead Saved!</h2>
          <p className="text-lg opacity-90">
            {ballot.bride_first_name} {ballot.bride_last_name}
          </p>
          <p className="text-sm opacity-75">{savedCount} scanned this session</p>
          <div className="pt-4 space-y-3 w-full max-w-xs mx-auto">
            <Button
              onClick={scanAnother}
              className="w-full h-12 text-lg font-bold bg-white text-green-700 hover:bg-white/90"
              size="lg"
            >
              Scan Another
            </Button>
            <Link href="/leads" className="block">
              <Button
                variant="outline"
                className="w-full border-white/30 text-white/80 hover:bg-white/10 hover:text-white"
              >
                Back to Lead Manager
              </Button>
            </Link>
          </div>
        </div>
      </div>
    )
  }

  // ─── Review Step ───────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-gray-800 shadow-md sticky top-0 z-20">
        <div className="max-w-lg mx-auto px-4 py-3 flex items-center justify-between">
          <button onClick={() => setStep('capture')} className="text-blue-300 font-medium text-sm flex items-center gap-1">
            <ArrowLeft className="w-5 h-5" />
            Re-scan
          </button>
          <h1 className="font-bold text-white">Review & Edit</h1>
          <div className="w-14" />
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 pt-6 pb-8 space-y-5">
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-red-700 text-sm">
            {error}
          </div>
        )}

        {imageData && (
          <details className="bg-white rounded-xl shadow-sm overflow-hidden">
            <summary className="px-4 py-3 text-sm font-medium text-muted-foreground cursor-pointer">
              View original image
            </summary>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={imageData} alt="Ballot" className="w-full border-t border-gray-100" />
          </details>
        )}

        {/* Bride */}
        <Card>
          <CardContent className="pt-6 space-y-4">
            <h3 className="font-bold text-gray-900">Bride</h3>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>First Name *</Label>
                <Input
                  value={ballot.bride_first_name}
                  onChange={e => handleField('bride_first_name', e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Last Name</Label>
                <Input
                  value={ballot.bride_last_name}
                  onChange={e => handleField('bride_last_name', e.target.value)}
                />
              </div>
            </div>

            <h3 className="font-bold text-gray-900 pt-2">Groom</h3>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>First Name</Label>
                <Input
                  value={ballot.groom_first_name}
                  onChange={e => handleField('groom_first_name', e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Last Name</Label>
                <Input
                  value={ballot.groom_last_name}
                  onChange={e => handleField('groom_last_name', e.target.value)}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Contact & Details */}
        <Card>
          <CardContent className="pt-6 space-y-4">
            <div className="space-y-1.5">
              <Label>Wedding Date</Label>
              <Input
                type="date"
                value={ballot.wedding_date}
                onChange={e => handleField('wedding_date', e.target.value)}
                style={{ colorScheme: 'light' }}
              />
            </div>

            <div className="space-y-1.5">
              <Label>Cell Phone *</Label>
              <Input
                type="tel"
                value={ballot.cell_phone}
                onChange={e => handleField('cell_phone', formatPhone(e.target.value))}
                inputMode="tel"
                placeholder="(416) 555-1234"
              />
            </div>

            <div className="space-y-1.5">
              <Label>Email</Label>
              <Input
                type="email"
                value={ballot.email}
                onChange={e => handleField('email', e.target.value)}
                placeholder="email@example.com"
              />
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div className="col-span-2 space-y-1.5">
                <Label>Venue</Label>
                <Input
                  value={ballot.venue_name}
                  onChange={e => handleField('venue_name', e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Guests</Label>
                <Input
                  type="number"
                  value={ballot.guest_count ?? ''}
                  onChange={e => handleField('guest_count', e.target.value ? parseInt(e.target.value) : null)}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Toggle buttons */}
        <Card>
          <CardContent className="pt-6 space-y-3">
            {[
              { key: 'has_photographer' as const, label: 'Photographer booked?' },
              { key: 'has_videographer' as const, label: 'Videographer booked?' },
              { key: 'has_venue' as const, label: 'Venue booked?' },
            ].map(({ key, label }) => (
              <div key={key} className="flex items-center justify-between gap-3">
                <span className="text-sm text-gray-700">{label}</span>
                <div className="grid grid-cols-2 gap-2 w-32">
                  <button
                    type="button"
                    onClick={() => handleField(key, true)}
                    className={`py-2 rounded-lg text-sm font-semibold transition-colors ${
                      ballot[key] ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-400'
                    }`}
                  >
                    YES
                  </button>
                  <button
                    type="button"
                    onClick={() => handleField(key, false)}
                    className={`py-2 rounded-lg text-sm font-semibold transition-colors ${
                      !ballot[key] ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-400'
                    }`}
                  >
                    NO
                  </button>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <Button
          onClick={saveBallot}
          disabled={!ballot.bride_first_name || !ballot.cell_phone}
          className="w-full h-12 text-base font-bold bg-green-600 hover:bg-green-700"
          size="lg"
        >
          Save Lead
        </Button>

        <Button
          variant="outline"
          onClick={scanAnother}
          className="w-full"
        >
          Discard & Scan Another
        </Button>
      </div>
    </div>
  )
}
