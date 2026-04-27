'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Delete } from 'lucide-react'

export default function BridalFlowLoginPage() {
  const router = useRouter()
  const [pin, setPin] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleDigit = (digit: string) => {
    if (pin.length >= 4) return
    const next = pin + digit
    setPin(next)
    setError('')
    if (next.length === 4) {
      submitPin(next)
    }
  }

  const handleBackspace = () => {
    setPin(prev => prev.slice(0, -1))
    setError('')
  }

  const submitPin = async (code: string) => {
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/leads/pin-verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pin: code }),
      })
      const data = await res.json()
      if (data.ok) {
        router.push('/leads')
      } else {
        setError('Wrong PIN')
        setPin('')
      }
    } catch {
      setError('Connection error')
      setPin('')
    }
    setLoading(false)
  }

  const digits = ['1', '2', '3', '4', '5', '6', '7', '8', '9']

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-800 flex flex-col items-center justify-center px-4">
      {/* Logo */}
      <div className="mb-10 text-center">
        <h1 className="text-2xl font-bold text-white tracking-wider" style={{ fontFamily: 'Playfair Display, serif' }}>
          SIGS Photography
        </h1>
        <p className="text-slate-400 text-sm mt-1">BridalFlow</p>
      </div>

      {/* PIN Circles */}
      <div className="flex gap-4 mb-8">
        {[0, 1, 2, 3].map(i => (
          <div
            key={i}
            className={`w-4 h-4 rounded-full transition-all duration-200 ${
              i < pin.length
                ? 'bg-teal-400 scale-110'
                : 'bg-slate-600 border border-slate-500'
            }`}
          />
        ))}
      </div>

      {/* Error */}
      {error && (
        <div className="mb-4 text-red-400 text-sm font-medium animate-pulse">{error}</div>
      )}

      {/* Loading */}
      {loading && (
        <div className="mb-4 text-teal-400 text-sm">Verifying...</div>
      )}

      {/* Number Grid */}
      <div className="grid grid-cols-3 gap-3 mb-3" style={{ maxWidth: 280 }}>
        {digits.map(d => (
          <button
            key={d}
            onClick={() => handleDigit(d)}
            disabled={loading}
            className="w-20 h-20 rounded-full bg-slate-700/50 text-white text-2xl font-medium hover:bg-slate-600 active:bg-teal-700 transition-all duration-150 disabled:opacity-50 border border-slate-600"
            style={{ minWidth: 48, minHeight: 48 }}
          >
            {d}
          </button>
        ))}
      </div>

      {/* Bottom Row: empty, 0, backspace */}
      <div className="grid grid-cols-3 gap-3" style={{ maxWidth: 280 }}>
        <div />
        <button
          onClick={() => handleDigit('0')}
          disabled={loading}
          className="w-20 h-20 rounded-full bg-slate-700/50 text-white text-2xl font-medium hover:bg-slate-600 active:bg-teal-700 transition-all duration-150 disabled:opacity-50 border border-slate-600"
          style={{ minWidth: 48, minHeight: 48 }}
        >
          0
        </button>
        <button
          onClick={handleBackspace}
          disabled={loading || pin.length === 0}
          className="w-20 h-20 rounded-full flex items-center justify-center text-slate-400 hover:text-white hover:bg-slate-700/50 transition-all duration-150 disabled:opacity-30"
          style={{ minWidth: 48, minHeight: 48 }}
        >
          <Delete className="h-6 w-6" />
        </button>
      </div>
    </div>
  )
}
