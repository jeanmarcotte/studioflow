'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { RotateCcw } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'

const SHOWS: { id: string; label: string; dates: [string, string] }[] = [
  { id: 'modern-feb-2026', label: 'Modern Wedding Show — Feb 2026', dates: ['2026-02-20', '2026-02-23'] },
  { id: 'weddingring-oakville-mar-2026', label: 'Wedding Ring Oakville — Mar 2026', dates: ['2026-03-07', '2026-03-09'] },
  { id: 'weddingring-newmarket-apr-2026', label: 'Wedding Ring Newmarket — Apr 2026', dates: ['2026-04-25', '2026-04-27'] },
  { id: 'cbs-oct-2026', label: 'CBS — Oct 2026', dates: ['2026-10-01', '2026-10-05'] },
  { id: 'cbs-jan-2027', label: 'CBS — Jan 2027', dates: ['2027-01-14', '2027-01-18'] },
  { id: 'hamilton-ring-mar-2026', label: 'Hamilton Ring — Mar 2026', dates: ['2026-03-28', '2026-03-29'] },
]

function detectShow(): { id: string; label: string } {
  const today = new Date().toISOString().slice(0, 10)
  for (const show of SHOWS) {
    if (today >= show.dates[0] && today <= show.dates[1]) {
      return { id: show.id, label: show.label }
    }
  }
  return { id: 'unknown', label: '' }
}

function getShowById(id: string): { id: string; label: string } {
  const show = SHOWS.find(s => s.id === id)
  if (show) return { id: show.id, label: show.label }
  return { id, label: id }
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
  guest_count: string
  has_photographer: boolean
  has_videographer: boolean
  has_venue: boolean
  entry_method: 'ipad' | 'qr' | 'manual' | 'website' | 'meta'
  show_id: string
}

const initialFormData: BallotData = {
  bride_first_name: '',
  bride_last_name: '',
  groom_first_name: '',
  groom_last_name: '',
  wedding_date: '',
  cell_phone: '',
  email: '',
  venue_name: '',
  guest_count: '',
  has_photographer: false,
  has_videographer: false,
  has_venue: false,
  entry_method: 'website',
  show_id: '',
}

export default function BallotPage() {
  const [formData, setFormData] = useState<BallotData>(initialFormData)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [showSuccess, setShowSuccess] = useState(false)
  const [isWebsiteEmbed, setIsWebsiteEmbed] = useState(false)
  const [isOnline, setIsOnline] = useState(true)
  const [showLabel, setShowLabel] = useState('')
  const [countdown, setCountdown] = useState(10)

  useEffect(() => {
    const updateOnlineStatus = () => setIsOnline(navigator.onLine)
    window.addEventListener('online', updateOnlineStatus)
    window.addEventListener('offline', updateOnlineStatus)
    updateOnlineStatus()
    return () => {
      window.removeEventListener('online', updateOnlineStatus)
      window.removeEventListener('offline', updateOnlineStatus)
    }
  }, [])

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const method = params.get('source')
    const showParam = params.get('show')

    let show: { id: string; label: string }
    if (showParam) {
      show = getShowById(showParam)
    } else {
      show = detectShow()
    }

    setFormData(prev => ({
      ...prev,
      entry_method: method === 'qr' ? 'qr' : method === 'website' ? 'website' : method === 'meta' ? 'meta' : 'website',
      show_id: show.id,
    }))
    setShowLabel(show.label)
    if (method === 'website' || method === 'meta') setIsWebsiteEmbed(true)
  }, [])

  // Auto-forward countdown on success
  useEffect(() => {
    if (!showSuccess) return
    const timer = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          clearInterval(timer)
          handleReset()
          return 10
        }
        return prev - 1
      })
    }, 1000)
    return () => clearInterval(timer)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showSuccess])

  const handleReset = () => {
    setShowSuccess(false)
    setCountdown(10)
    setFormData(initialFormData)
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
  }

  const handleToggle = (name: string, value: boolean) => {
    setFormData(prev => ({ ...prev, [name]: value }))
  }

  const formatPhoneNumber = (value: string) => {
    const digits = value.replace(/\D/g, '').slice(0, 10)
    if (digits.length === 0) return ''
    if (digits.length <= 3) return `(${digits}`
    if (digits.length <= 6) return `(${digits.slice(0, 3)}) ${digits.slice(3)}`
    return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`
  }

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatPhoneNumber(e.target.value)
    setFormData(prev => ({ ...prev, cell_phone: formatted }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)

    try {
      const res = await fetch('/api/ballot/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      })

      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Submission failed')
      }

      setShowSuccess(true)
    } catch (error) {
      console.error('Error submitting ballot:', error)
      alert('Error saving entry. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <AnimatePresence mode="wait">
    {showSuccess ? (
      <motion.div
        key="success"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.4 }}
        className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-b from-green-500 to-green-600 text-white p-8"
      >
        <div className="text-center space-y-6">
          <div className="text-8xl">🎉</div>
          <h1 className="text-4xl font-bold">You&apos;re Entered!</h1>
          <p className="text-xl opacity-90">Good luck!</p>
          <p className="text-sm opacity-75">Returning to form in {countdown}s</p>
          <Button
            variant="outline"
            onClick={handleReset}
            className="border-white/30 text-white hover:bg-white/10 hover:text-white"
          >
            <RotateCcw className="h-4 w-4 mr-2" />
            Enter Another
          </Button>
        </div>
      </motion.div>
    ) : (
    <div key="form" className="min-h-[100dvh] bg-gray-50 pb-24 overflow-x-hidden max-w-[100vw]">
      {/* Header */}
      {!isWebsiteEmbed && (
        <div className="bg-white shadow-sm sticky top-0 z-10">
          <div className="max-w-lg mx-auto px-4 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-blue-600 rounded-lg flex items-center justify-center text-white font-bold text-lg">
                  SIGS
                </div>
                <div>
                  <h1 className="font-bold text-gray-900">SIGS Photography</h1>
                  <p className="text-sm text-gray-500">{showLabel || '50% Off Draw'}</p>
                </div>
              </div>
              <div className="text-right">
                <div className={`text-xs font-medium ${isOnline ? 'text-green-600' : 'text-yellow-600'}`}>
                  {isOnline ? '● Online' : '● Offline'}
                </div>
                {isOnline && <div className="text-xs text-green-600">All synced</div>}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Form */}
      <form onSubmit={handleSubmit} className="max-w-lg mx-auto px-4 pt-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
        <Card>
          <CardContent className="pt-6 space-y-5">

            {/* Bride Name */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="bride_first_name">Bride&apos;s First Name *</Label>
                <Input
                  id="bride_first_name"
                  name="bride_first_name"
                  value={formData.bride_first_name}
                  onChange={handleChange}
                  required
                  autoComplete="given-name"
                  placeholder="First"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="bride_last_name">Bride&apos;s Last Name</Label>
                <Input
                  id="bride_last_name"
                  name="bride_last_name"
                  value={formData.bride_last_name}
                  onChange={handleChange}
                  autoComplete="family-name"
                  placeholder="Last"
                />
              </div>
            </div>

            {/* Groom Name */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="groom_first_name">Groom&apos;s First Name</Label>
                <Input
                  id="groom_first_name"
                  name="groom_first_name"
                  value={formData.groom_first_name}
                  onChange={handleChange}
                  autoComplete="off"
                  placeholder="First"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="groom_last_name">Groom&apos;s Last Name</Label>
                <Input
                  id="groom_last_name"
                  name="groom_last_name"
                  value={formData.groom_last_name}
                  onChange={handleChange}
                  autoComplete="off"
                  placeholder="Last"
                />
              </div>
            </div>

            {/* Wedding Date */}
            <div className="space-y-1.5">
              <Label htmlFor="wedding_date">
                Wedding Date * <span className="font-normal text-muted-foreground">(if unsure, enter the 1st of your planned month)</span>
              </Label>
              <Input
                id="wedding_date"
                type="date"
                name="wedding_date"
                value={formData.wedding_date}
                onChange={handleChange}
                required
                style={{ colorScheme: 'light' }}
              />
            </div>

            {/* Phone */}
            <div className="space-y-1.5">
              <Label htmlFor="cell_phone">Cell Phone *</Label>
              <Input
                id="cell_phone"
                type="tel"
                name="cell_phone"
                value={formData.cell_phone}
                onChange={handlePhoneChange}
                required
                autoComplete="tel"
                inputMode="tel"
                placeholder="(416) 555-1234"
              />
            </div>

            {/* Email */}
            <div className="space-y-1.5">
              <Label htmlFor="email">Email Address *</Label>
              <Input
                id="email"
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                required
                autoComplete="email"
                inputMode="email"
                placeholder="email@example.com"
              />
            </div>

            {/* Venue + Guest Count */}
            <div className="grid grid-cols-3 gap-3">
              <div className="col-span-2 space-y-1.5">
                <Label htmlFor="venue_name">Venue Name</Label>
                <Input
                  id="venue_name"
                  name="venue_name"
                  value={formData.venue_name}
                  onChange={(e) => {
                    handleChange(e)
                    if (e.target.value.trim()) {
                      handleToggle('has_venue', true)
                    }
                  }}
                  autoComplete="off"
                  placeholder="Name of your Venue"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="guest_count">Guests</Label>
                <Input
                  id="guest_count"
                  type="number"
                  name="guest_count"
                  value={formData.guest_count}
                  onChange={handleChange}
                  autoComplete="off"
                  placeholder="#"
                  min="0"
                  max="1000"
                />
              </div>
            </div>

            {/* YES/NO Toggle Questions */}
            <div className="bg-gray-50 rounded-xl p-4 space-y-3">
              {[
                { name: 'has_photographer', label: 'Have you booked a photographer?' },
                { name: 'has_videographer', label: 'Have you booked a videographer?' },
                { name: 'has_venue', label: 'Have you booked your venue?' },
              ].map(({ name, label }) => (
                <div key={name} className="flex items-center justify-between gap-3">
                  <span className="text-sm text-gray-700 flex-1">{label}</span>
                  <div className="grid grid-cols-2 gap-2 flex-shrink-0 w-32">
                    <button
                      type="button"
                      onClick={() => handleToggle(name, true)}
                      className={`py-2 rounded-lg text-sm font-semibold transition-colors ${
                        (formData as any)[name]
                          ? 'bg-blue-600 text-white'
                          : 'bg-gray-200 text-gray-400'
                      }`}
                    >
                      YES
                    </button>
                    <button
                      type="button"
                      onClick={() => handleToggle(name, false)}
                      className={`py-2 rounded-lg text-sm font-semibold transition-colors ${
                        !(formData as any)[name]
                          ? 'bg-blue-600 text-white'
                          : 'bg-gray-200 text-gray-400'
                      }`}
                    >
                      NO
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Submit */}
            <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
              <Button
                type="submit"
                disabled={isSubmitting}
                className="w-full h-12 text-base font-bold bg-blue-600 hover:bg-blue-700"
                size="lg"
              >
                {isSubmitting ? 'Saving...' : 'ENTER TO WIN! 🎉'}
              </Button>
            </motion.div>

            <p className="text-xs text-center text-muted-foreground">
              By entering, you agree to be contacted about your prize.
            </p>
          </CardContent>
        </Card>
        </motion.div>
      </form>
    </div>
    )}
    </AnimatePresence>
  )
}
