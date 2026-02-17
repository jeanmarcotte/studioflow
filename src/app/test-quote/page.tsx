'use client'

import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'

// Form validation schema (simplified for demo)
const quoteSchema = z.object({
  brideFirstName: z.string().min(1, 'Required'),
  groomFirstName: z.string().min(1, 'Required'),
  weddingDate: z.string().min(1, 'Required'),
  packageType: z.enum(['photo_only', 'photo_video']),
  hoursOfCoverage: z.number().min(4).max(16),
})

export default function TestQuotePage() {
  const [pricing, setPricing] = useState({ total: 5000, hst: 650 })

  const { register, watch } = useForm({
    resolver: zodResolver(quoteSchema),
    defaultValues: {
      packageType: 'photo_only',
      hoursOfCoverage: 8,
    }
  })

  const watchedValues = watch()

  // Real-time pricing calculation
  useEffect(() => {
    const basePrice = watchedValues.packageType === 'photo_only' ? 5000 : 7500
    const total = basePrice + (watchedValues.hoursOfCoverage - 8) * 400
    const hst = total * 0.13
    setPricing({ total, hst })
  }, [watchedValues])

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-6">
        <div className="bg-white rounded-lg shadow p-8">
          <h1 className="text-3xl font-bold mb-2">StudioFlow Demo</h1>
          <p className="text-gray-600 mb-8">Professional Quote Builder</p>

          <div className="grid md:grid-cols-2 gap-8">
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium mb-1">Bride First Name *</label>
                <input
                  {...register('brideFirstName')}
                  className="w-full px-3 py-2 border rounded-lg"
                  placeholder="Enter bride's name"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Groom First Name *</label>
                <input
                  {...register('groomFirstName')}
                  className="w-full px-3 py-2 border rounded-lg"
                  placeholder="Enter groom's name"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Wedding Date *</label>
                <input
                  type="date"
                  {...register('weddingDate')}
                  className="w-full px-3 py-2 border rounded-lg"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Package Type</label>
                <div className="space-y-2">
                  <label className="flex items-center">
                    <input type="radio" {...register('packageType')} value="photo_only" className="mr-2" />
                    Photo Only ($5,000 base)
                  </label>
                  <label className="flex items-center">
                    <input type="radio" {...register('packageType')} value="photo_video" className="mr-2" />
                    Photo + Video ($7,500 base)
                  </label>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Hours of Coverage</label>
                <select
                  {...register('hoursOfCoverage', { valueAsNumber: true })}
                  className="w-full px-3 py-2 border rounded-lg"
                >
                  {[4, 5, 6, 7, 8, 9, 10, 11, 12].map(hours => (
                    <option key={hours} value={hours}>{hours} hours</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="bg-gray-50 rounded-lg p-6">
              <h3 className="text-lg font-semibold mb-4">Real-Time Pricing</h3>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span>Package Total</span>
                  <span>${pricing.total.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span>HST (13%)</span>
                  <span>${pricing.hst.toLocaleString()}</span>
                </div>
                <div className="border-t pt-2">
                  <div className="flex justify-between text-xl font-bold">
                    <span>Final Total</span>
                    <span>${(pricing.total + pricing.hst).toLocaleString()}</span>
                  </div>
                </div>
              </div>

              <div className="mt-6 space-y-3">
                <button className="w-full bg-blue-600 text-white py-2 rounded-lg font-medium">
                  Save Quote
                </button>
                <button className="w-full border border-blue-600 text-blue-600 py-2 rounded-lg font-medium">
                  Generate PDF
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
