'use client'

import { useState } from 'react'
import Image from 'next/image'

export default function PortalLoginPage() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Check URL params for error messages
  const urlError = typeof window !== 'undefined'
    ? new URLSearchParams(window.location.search).get('error')
    : null

  const errorMessages: Record<string, string> = {
    no_portal: "We couldn't find a portal for this email. Contact Jean at jean@sigsphoto.ca if you think this is a mistake.",
    invalid_link: 'Your login link has expired or is invalid. Please request a new one.',
    wrong_couple: 'You do not have access to that portal. Please log in with the correct email.',
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)

    try {
      const res = await fetch('/api/portal/send-magic-link', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim() }),
      })

      if (!res.ok) {
        setError("Something went wrong. Please try again or contact Jean at jean@sigsphoto.ca.")
        return
      }

      setSent(true)
    } catch {
      setError("Something went wrong. Please try again or contact Jean at jean@sigsphoto.ca.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-2xl shadow-lg p-8">
          {/* Logo */}
          <div className="flex justify-center mb-6">
            <Image
              src="/images/sigslogo.png"
              alt="SIGS Photography"
              width={180}
              height={60}
              priority
            />
          </div>

          {sent ? (
            /* Success state */
            <div className="text-center">
              <div className="w-16 h-16 bg-teal-50 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-teal-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
              </div>
              <h2 className="text-xl font-semibold text-gray-900 mb-2">Check your inbox</h2>
              <p className="text-gray-600 mb-6">
                Your login link is on its way to <strong>{email}</strong>.
              </p>
              <button
                onClick={() => { setSent(false); setEmail('') }}
                className="text-sm text-teal-600 hover:underline"
              >
                Use a different email
              </button>
            </div>
          ) : (
            /* Login form */
            <>
              <h1 className="text-xl font-semibold text-gray-900 text-center mb-1">
                Welcome to your SIGS Couples Portal
              </h1>
              <p className="text-gray-500 text-center text-sm mb-6">
                Enter your email to receive a secure login link.
              </p>

              {(error || (urlError && errorMessages[urlError])) && (
                <div className="bg-red-50 text-red-700 text-sm rounded-lg p-3 mb-4">
                  {error || errorMessages[urlError!]}
                </div>
              )}

              <form onSubmit={handleSubmit}>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                  Email address
                </label>
                <input
                  id="email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="your@email.com"
                  className="w-full rounded-lg border border-gray-300 px-4 py-3 text-sm focus:border-teal-500 focus:ring-1 focus:ring-teal-500 outline-none"
                  disabled={loading}
                />
                <button
                  type="submit"
                  disabled={loading || !email.trim()}
                  className="w-full mt-4 bg-teal-600 text-white font-medium py-3 rounded-lg hover:bg-teal-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? 'Sending...' : 'Send me my link'}
                </button>
              </form>
            </>
          )}
        </div>

        <p className="text-center text-xs text-gray-400 mt-6">
          SIGS Photography &bull; Toronto & Vaughan, Ontario
        </p>
      </div>
    </div>
  )
}
