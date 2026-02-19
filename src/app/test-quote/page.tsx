'use client'

import { generateQuotePdf } from '@/lib/generateQuotePdf'

export default function TestQuotePage() {
  const handleGenerateTestPdf = async () => {
    await generateQuotePdf({
      brideFirstName: 'Sarah',
      brideLastName: 'Johnson',
      groomFirstName: 'Michael',
      groomLastName: 'Chen',
      brideEmail: 'sarah@example.com',
      bridePhone: '416-555-1234',
      groomEmail: 'michael@example.com',
      groomPhone: '416-555-5678',
      weddingDate: '2026-09-12',
      ceremonyVenue: 'St. James Cathedral',
      receptionVenue: 'The Fairmont Royal York',
      guestCount: 150,
      bridalPartyCount: 8,
      flowerGirl: 1,
      ringBearer: 0,
      selectedPackage: 'photo_only',
      packageName: 'Photography Collection',
      packageHours: 8,
      packageFeatures: [
        '2 Lead Photographers',
        'Online Gallery',
        'Full Editing & Retouching',
        'Engagement Session',
        'Wedding Day Coverage',
        'Digital Downloads',
      ],
      extraPhotographer: true,
      extraHours: 3,
      engagementLocation: 'brides_choice',
      engagementLocationLabel: "Bride's Choice — Distillery District",
      albumType: 'premium',
      albumSize: '10x8',
      acrylicCover: true,
      parentAlbumQty: 2,
      firstLook: true,
      pricing: {
        basePrice: 3000,
        extraPhotographerPrice: 500,
        extraHoursPrice: 1050,
        albumPrice: 1200,
        acrylicCoverPrice: 200,
        parentAlbumsPrice: 590,
        locationFee: 200,
        printsPrice: 150,
        subtotal: 6890,
        discount: 500,
        hst: 830.7,
        total: 7220.7,
      },
      freeParentAlbums: false,
      freePrints: false,
      printsTotal: 150,
      printOrders: { '5x7': 0, '8x10': 0, '11x14': 3, '16x20': 0, '20x24': 0, '24x30': 1 },
      timeline: [
        { name: 'Groom Prep', startTime: '1:00 PM', endTime: '2:00 PM' },
        { name: 'Bride Prep', startTime: '1:00 PM', endTime: '3:00 PM' },
        { name: 'First Look + Park Photos', startTime: '3:00 PM', endTime: '4:30 PM', driveTime: '15 min' },
        { name: 'Ceremony', startTime: '4:30 PM', endTime: '5:30 PM', driveTime: '20 min' },
        { name: 'Reception', startTime: '6:00 PM', endTime: '12:00 AM', driveTime: '10 min' },
      ],
      installments: [
        { label: 'Deposit (upon signing)', amount: 1500 },
        { label: '2nd Payment (60 days before)', amount: 2000 },
        { label: '3rd Payment (30 days before)', amount: 2000 },
        { label: 'Final Payment (wedding day)', amount: 1720.7 },
      ],
      discountType: 'flat',
      discountAmount: 500,
      discount2Amount: 0,
    })
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <button
        onClick={handleGenerateTestPdf}
        className="px-8 py-4 bg-stone-800 text-white rounded-lg text-lg font-medium hover:bg-stone-900 transition-colors"
      >
        Generate Test PDF
      </button>
    </div>
  )
}
