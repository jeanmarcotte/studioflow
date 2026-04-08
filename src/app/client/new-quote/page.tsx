'use client'

import React, { useState, useEffect, useCallback, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Layout } from '@/components/layout/layout'
import { studioflowClientConfig } from '@/config/sidebar'
import { searchLeadByCouple, findOrCreateCouple, upsertQuote, getQuoteByCoupleId, getCoupleById } from '@/lib/supabase'
import { generateQuotePdf } from '@/lib/generateQuotePdf'
import {
  Calendar, Phone, MapPin, Users, DollarSign, FileText,
  AlertCircle, Camera, Video, Check, Plus, Trash2, Clock, Heart,
  ChevronDown, ChevronUp, Music, Image, Globe, Sparkles, Car, ArrowRight,
  Mail, Loader2
} from 'lucide-react'

// ============================================================
// SIGS PHOTOGRAPHY - QUOTE BUILDER v4
// Professional Sales Call Worksheet
// ============================================================

// Generate 15-minute time slots in 24-hour format: 06:00–01:00
const TIME_SLOTS = (() => {
  const slots: string[] = ['']
  // Regular hours 06:00 to 23:45
  for (let hour = 6; hour <= 23; hour++) {
    for (let min = 0; min < 60; min += 15) {
      slots.push(`${hour.toString().padStart(2, '0')}:${min.toString().padStart(2, '0')}`)
    }
  }
  // Past midnight: 00:00 to 01:00
  slots.push('00:00', '00:15', '00:30', '00:45', '01:00')
  return slots
})()

// Drive time options
const DRIVE_TIMES = ['', '5 min', '10 min', '15 min', '20 min', '25 min', '30 min', '45 min', '1 hr', '1.5 hr']

// Form validation schema
const quoteSchema = z.object({
  // Lead Source
  leadSource: z.string().optional(),
  referralName: z.string().optional(),
  
  // Couple Information - only first names required for basic identification
  brideFirstName: z.string().optional(),
  brideLastName: z.string().optional(),
  brideEmail: z.string().optional(),
  bridePhone: z.string().optional(),
  groomFirstName: z.string().optional(),
  groomLastName: z.string().optional(),
  groomEmail: z.string().optional(),
  groomPhone: z.string().optional(),
  
  // Wedding Details - only date required
  weddingDate: z.string().min(1, 'Wedding date is required'),
  guestCount: z.union([z.number(), z.nan()]).transform(val => (Number.isNaN(val) ? undefined : val)).optional(),
  bridalPartyCount: z.union([z.number(), z.nan()]).transform(val => (Number.isNaN(val) ? undefined : val)).optional(),
  flowerGirl: z.union([z.number(), z.nan()]).transform(val => (Number.isNaN(val) ? undefined : val)).optional(),
  ringBearer: z.union([z.number(), z.nan()]).transform(val => (Number.isNaN(val) ? undefined : val)).optional(),
  ceremonyVenue: z.string().optional(),
  receptionVenue: z.string().optional(),
  djName: z.string().optional(),
  plannerName: z.string().optional(),
  
  // Coverage Hours
  coverageStartTime: z.string().optional(),
  coverageEndTime: z.string().optional(),

  // Timeline - stored generically, displayed based on firstLook
  firstLook: z.boolean(),
  groomStart: z.string().optional(),
  groomEnd: z.string().optional(),
  driveGroomToBride: z.string().optional(),
  brideStart: z.string().optional(),
  brideEnd: z.string().optional(),
  driveBrideToNext: z.string().optional(),
  ceremonyStart: z.string().optional(),
  ceremonyEnd: z.string().optional(),
  driveCeremonyToNext: z.string().optional(),
  parkStart: z.string().optional(),
  parkEnd: z.string().optional(),
  driveParkToNext: z.string().optional(),
  receptionStart: z.string().optional(),
  receptionEnd: z.string().optional(),
  
  // Package
  selectedPackage: z.enum(['bella', 'eleganza', 'silver', 'gold', 'platinum', 'diamond']),
  extraPhotographer: z.boolean(),
  splitMorningTeam: z.boolean(),
  extraHours: z.number().min(0).max(10),
  
  // Engagement
  engagementLocation: z.string(),
  bridesChoiceLocation: z.string().optional(),
  
  // Albums - Couple Album
  albumType: z.enum(['none', 'standard', 'premium']),
  albumSize: z.enum(['10x8', '14x11']),
  albumSpreads: z.number().optional(),
  albumCover: z.string().optional(),
  acrylicCover: z.boolean(),
  
  // Albums - Parent
  parentAlbumQty: z.number().min(0).max(4),
  
  // Discount
  discountType: z.enum(['none', 'percent', 'flat']),
  discountAmount: z.number().optional(),
  discount2Amount: z.number().optional(), // Second discount - always flat $
  
  // Notes
  notes: z.string().optional(),
})

type QuoteFormData = z.infer<typeof quoteSchema>

// ============================================================
// PRICING CONFIGURATION - SIGS Price List Oct 2025
// ============================================================
const PACKAGES = {
  bella: {
    name: 'Bella',
    price: 5300,
    hours: 8,
    type: 'photo_only',
    photographers: 2,
    videographers: 0,
    features: [
      'Up to 8 hours of coverage',
      '2 Professional Photographers',
      'Drone Photography',
      'Drone Video Footage',
      'Engagement Photo session (~50 digital photos w/ watermark)',
      'Professional retouching and colour correction',
      'Photo Sneak Peeks',
      'Engagement & Wedding personalized online photo gallery',
      'Online proofing for your final approval',
      'Digital Download of ALL edited wedding photos NO WATERMARK',
      '1 × 16x20 Wedding Portrait',
    ]
  },
  eleganza: {
    name: 'Eleganza',
    price: 8800,
    hours: 12,
    type: 'photo_only',
    photographers: 3,
    videographers: 0,
    features: [
      'Up to 12 hours of coverage',
      '3 Professional Photographers',
      'Drone Photography',
      'Engagement Photo session (~50 digital photos w/ watermark)',
      'Engagement Shoot Slideshow Presentation',
      'Professional retouching and colour correction',
      'Photo Sneak Peeks',
      'Engagement & Wedding personalized online photo gallery',
      'Online proofing for your final approval',
      'Digital Download of ALL edited wedding photos NO WATERMARK',
      '1 × 24x30 Wedding Portrait',
      '1 × 16x20 Wedding Portrait',
      '1 × 28×11 Premium Layflat Album — Acrylic/Leather cover, 15 pages',
      '2 × 10x8 Parent Albums — Linen cover, magazine paper',
      '*Additional photographers available upon request',
    ]
  },
  silver: {
    name: 'Silver',
    price: 6400,
    hours: 8,
    type: 'photo_video',
    photographers: 1,
    videographers: 1,
    features: [
      'Up to 8 hours of coverage',
      '1 Professional Photographer',
      '1 Professional Videographer',
      'Drone Photography & Video Footage',
      'Engagement Photo session (~50 digital photos w/ watermark)',
      'Professional retouching and colour correction',
      'Photo Sneak Peeks',
      'Engagement & Wedding personalized online photo gallery',
      'Online proofing for your final approval',
      'Digital Download of ALL edited wedding photos NO WATERMARK',
      'Digital Download edited 2 hr story video',
      '8-12 min Highlight Reel',
      'Fun clips for Instagram',
      'Proof Video (preview video before final copy)',
      'Multi-camera shooting at the ceremony and venue',
      'Digital Audio Recorder',
      'USB with Wedding Photos & Video',
      '2 × 11x14 Parent Portraits',
      '1 × 16x20 Wedding Portrait',
    ]
  },
  gold: {
    name: 'Gold',
    price: 7400,
    hours: 10,
    type: 'photo_video',
    photographers: 2,
    videographers: 1,
    features: [
      'Up to 10 hours of coverage',
      '2 Professional Photographers',
      '1 Professional Videographer',
      'Drone Photography & Video Footage',
      'Engagement Photo session (~50 digital photos w/ watermark)',
      'Engagement Shoot Slideshow Presentation',
      'Professional retouching and colour correction',
      'Photo Sneak Peeks',
      'Engagement & Wedding personalized online photo gallery',
      'Online proofing for your final approval',
      'Digital Download of ALL edited wedding photos NO WATERMARK',
      'Digital Download edited 2 hr story video',
      '8-12 min Highlight Reel',
      'Fun clips for Instagram',
      'Proof Video (preview video before final copy)',
      'Multi-camera shooting at the ceremony and venue',
      'Digital Audio Recorder',
      'USB with Wedding Photos & Video',
      '2 × 11x14 Parent Portraits',
      '1 × 24x30 Wedding Portrait',
    ]
  },
  platinum: {
    name: 'Platinum',
    price: 8300,
    hours: 12,
    type: 'photo_video',
    photographers: 2,
    videographers: 1,
    features: [
      'Up to 12 hours of coverage',
      '2 Professional Photographers',
      '1 Professional Videographer',
      'Drone Photography & Video Footage',
      'Engagement Photo session (~50 digital photos w/ watermark)',
      'Engagement Shoot Slideshow Presentation',
      'Professional retouching and colour correction',
      'Photo Sneak Peeks',
      'Engagement & Wedding personalized online photo gallery',
      'Online proofing for your final approval',
      'Digital Download of ALL edited wedding photos NO WATERMARK',
      'Digital Download edited 2 hr story video',
      '8-12 min Highlight Reel',
      'Fun clips for Instagram',
      'Proof Video (preview video before final copy)',
      'Multi-camera shooting at the ceremony and venue',
      'Digital Audio Recorder',
      'USB with Wedding Photos & Video',
      '2 × 16x20 Parent Portraits',
      '1 × 24x30 Wedding Portrait',
      '*Additional photographers/videographers available upon request',
    ]
  },
  diamond: {
    name: 'Diamond',
    price: 9500,
    hours: 12,
    type: 'photo_video',
    photographers: 2,
    videographers: 1,
    features: [
      'Up to 12 hours of coverage',
      '2 Professional Photographers',
      '1 Professional Videographer',
      'Drone Photography & Video Footage',
      'Engagement Photo session (~50 digital photos w/ watermark)',
      'Engagement Shoot Slideshow Presentation',
      'Professional retouching and colour correction',
      'Photo Sneak Peeks',
      'Engagement & Wedding personalized online photo gallery',
      'Online proofing for your final approval',
      'Digital Download of ALL edited wedding photos NO WATERMARK',
      'Digital Download edited 2 hr story video',
      '8-12 min Highlight Reel',
      'Fun clips for Instagram',
      'Proof Video (preview video before final copy)',
      'Multi-camera shooting at the ceremony and venue',
      'Digital Audio Recorder',
      'USB with Wedding Photos & Video',
      '1 × 24x30 Wedding Portrait',
      '2 × 16x20 Parent Portraits',
      '1 × 28×11 Premium Layflat Album — Acrylic/Leather cover, 15 pages',
      '*Additional photographers/videographers available upon request',
    ]
  },
}

// Tiered extra hours pricing (volume discount)
const EXTRA_HOURS_PRICING: Record<number, number> = {
  0.5: 175, 1.0: 350, 1.5: 425, 2.0: 500, 2.5: 575, 3.0: 650,
  3.5: 725, 4.0: 800, 4.5: 850, 5.0: 900, 5.5: 950, 6.0: 1000,
}

function getExtraHoursPrice(hours: number): number {
  if (hours <= 0) return 0
  // Round up to nearest 0.5
  const rounded = Math.ceil(hours * 2) / 2
  if (rounded <= 6) return EXTRA_HOURS_PRICING[rounded] || 0
  // Beyond 6 hours: $1,000 + $167 per additional hour
  return 1000 + Math.ceil((rounded - 6) * 2) / 2 * 167
}

const PRICING = {
  albums: {
    standard: { '10x8': 800, '14x11': 1200 },
    premium: { '10x8': 1200, '14x11': 1600 },
  },
  premiumAlbumFull: 2000,
  acrylicCover: 200,
  parentAlbum: 295,
  bridesChoiceLocation: 200,
  extraPhotographer: 500,
  splitMorningTeam: 800,
  thankYouCard: 5,
  hstRate: 0.13,
}

// Engagement locations
const ENGAGEMENT_LOCATIONS = [
  { value: 'mill_pond', label: 'Mill Pond Park, Richmond Hill', sublabel: 'Mon-Thurs 9am-3pm', default: true },
  { value: 'richmond_green', label: 'Richmond Green, Richmond Hill', sublabel: '' },
  { value: 'tall_oaks', label: 'Tall Oaks Park, Mississauga', sublabel: '' },
  { value: 'spencer_smith', label: 'Spencer Smith Park, Burlington', sublabel: '' },
  { value: 'brides_choice', label: "Bride's Choice", sublabel: '+$200 within 90 mins of Studio' },
]

// Lead sources - Shows with Season/Year
const LEAD_SOURCES = [
  // Winter 2026 Shows (4 shows)
  '--- Winter 2026 Shows ---',
  'Canadian Bridal Show (CBS) - Winter 2026',
  'Hamilton Bridal Show (HBS) - Winter 2026',
  'Hamilton The Ring - Winter 2026',
  'Modern Bridal Show - Winter 2026',
  // Fall 2026 Shows
  '--- Fall 2026 Shows ---',
  'Canadian Bridal Show (CBS) - Fall 2026',
  'Hamilton Bridal Show (HBS) - Fall 2026',
  'Hamilton The Ring - Fall 2026',
  // Past Shows 2025
  '--- 2025 Shows ---',
  'Canadian Bridal Show (CBS) - Winter 2025',
  'Canadian Bridal Show (CBS) - Fall 2025',
  'Hamilton Bridal Show (HBS) - Winter 2025',
  'Hamilton Bridal Show (HBS) - Fall 2025',
  'Hamilton The Ring - Winter 2025',
  'Hamilton The Ring - Fall 2025',
  'Modern Bridal Show - 2025',
  'Canada\'s Bridal Show - 2025',
  'Newmarket Bridal Show - 2025',
  'Oakville Bridal Show - 2025',
  // Other Sources
  '--- Other Sources ---',
  'Google Search',
  'Instagram',
  'Facebook',
  'Referral',
  'Returning Client',
  'WeddingWire',
  'The Knot',
  'Other',
]

// Package → included portraits mapping (matches features in PACKAGES)
const PACKAGE_PORTRAITS: Record<string, Record<string, number>> = {
  bella:    { '16x20': 1 },
  eleganza: { '24x30': 1, '16x20': 1 },
  silver:   { '16x20': 1, '11x14': 2 },
  gold:     { '24x30': 1, '11x14': 2 },
  platinum: { '24x30': 1, '16x20': 2 },
  diamond:  { '24x30': 1, '16x20': 2 },
}

// Show ID → Lead Source mapping for BridalFlow integration
const SHOW_ID_TO_LEAD_SOURCE: Record<string, string> = {
  'modern-feb-2026': 'MBS Winter 2026',
  'weddingring-oakville-mar-2026': 'OBS Mar 2026',
  'weddingring-newmarket-mar-2026': 'NBS Mar 2026',
  'hamilton-ring-mar-2026': 'Hamilton Ring Mar 2026',
  'referral': 'Referral',
}

// Installment templates
const SPRING_INSTALLMENTS = [
  { label: 'Upon Booking', amount: 0 },
  { label: 'April 1st, 2026', amount: 0 },
  { label: 'May 1st, 2026', amount: 0 },
  { label: 'Engagement Photo Session', amount: 0 },
  { label: '2 weeks before wedding day', amount: 0 },
  { label: 'Proof images / Dropbox 2 weeks after wedding', amount: 0 },
  { label: 'Photo Ready', amount: 0 },
]

const FALL_INSTALLMENTS = [
  { label: 'Upon Booking', amount: 0 },
  { label: 'November 1st, 2026', amount: 0 },
  { label: 'January 15th, 2027', amount: 0 },
  { label: 'Engagement Photo Session', amount: 0 },
  { label: '2 weeks before wedding day', amount: 0 },
  { label: 'Proof images / Dropbox 2 weeks after wedding', amount: 0 },
  { label: 'Photo Ready', amount: 0 },
]

// ============================================================
// COMPONENT
// ============================================================
export default function NewClientQuotePage() {
  return (
    <Suspense fallback={
      <Layout sidebarConfig={studioflowClientConfig}>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-foreground"></div>
        </div>
      </Layout>
    }>
      <QuoteBuilderInner />
    </Suspense>
  )
}

function QuoteBuilderInner() {
  const searchParams = useSearchParams()
  const editCoupleId = searchParams.get('couple_id')
  const clientQuoteId = searchParams.get('id')
  const ballotIdParam = searchParams.get('ballot_id')
  const [isLoading, setIsLoading] = useState(false)
  const [loadingQuote, setLoadingQuote] = useState(!!editCoupleId || !!clientQuoteId || !!ballotIdParam)
  const [editingVersion, setEditingVersion] = useState<number | null>(null)
  const [existingLead, setExistingLead] = useState<any>(null)
  const [showOtherLocations, setShowOtherLocations] = useState(false)

  // BridalFlow ballot state
  const [ballotId, setBallotId] = useState<string | null>(ballotIdParam)
  const [ballotShowId, setBallotShowId] = useState<string | null>(null)
  const [ballotError, setBallotError] = useState<string | null>(null)
  const [isSendingEmail, setIsSendingEmail] = useState(false)
  const [savedQuoteId, setSavedQuoteId] = useState<string | null>(clientQuoteId)
  
  // Installments state
  const [installments, setInstallments] = useState(SPRING_INSTALLMENTS)
  const [installmentSchedule, setInstallmentSchedule] = useState<'spring' | 'fall'>('spring')
  
  // Checklist state for inclusions
  const [photoInclusions, setPhotoInclusions] = useState({
    engagementShoot: true,
    digitalImages: true,
    weddingPrints: true,
    usbDropbox: true,
    thankYouCards: false,
    postProduction: true,
    dronePhoto: true,
  })
  
  // Print orders with prices
  const PRINT_PRICES = {
    '5x7': 20,
    '8x10': 30,
    '11x14': 100,
    '16x20': 295,
    '20x24': 295,
    '24x30': 295,
  }
  
  const [printOrders, setPrintOrders] = useState<{[key: string]: number}>({
    '5x7': 0,
    '8x10': 0,
    '11x14': 0,
    '16x20': 0,
    '20x24': 0,
    '24x30': 0,
  })
  
  const [printsIncluded, setPrintsIncluded] = useState<'paid' | 'free' | false>(false)
  
  // Parent albums included state (for 2 free albums)
  const [parentAlbumsIncluded, setParentAlbumsIncluded] = useState<'paid' | 'free' | false>(false)

  // Thank you cards
  const [thankYouCardQty, setThankYouCardQty] = useState(0)

  // Album included with package (Diamond, Eleganza)
  const [albumIncluded, setAlbumIncluded] = useState(false)
  
  // Calculate prints total
  const printsTotal = Object.entries(printOrders).reduce((sum, [size, qty]) => {
    return sum + (qty * (PRINT_PRICES[size as keyof typeof PRINT_PRICES] || 0))
  }, 0)
  
  const [videoInclusions, setVideoInclusions] = useState({
    babyPictures: true,
    datingPictures: true,
    musicChoice: true,
    endCredits: true,
    hdVideo: true,
    goPro: true,
    droneVideo: true,
    ledLighting: true,
    proofVideo: true,
    usbDrive: true,
    singleCamera: true,
    multiCamera: true,
    slideshow: true,
    longVersion: true,
    instagramVideo: true,
    highlightClips: true,
  })
  
  const [webInclusions, setWebInclusions] = useState({
    personalWebPage: true,
    engagementUpload: true,
    weddingGallery: true,
  })
  
  // Pricing state
  const [pricing, setPricing] = useState({
    basePrice: 0,
    extraPhotographerPrice: 0,
    extraHoursPrice: 0,
    splitMorningTeamPrice: 0,
    albumPrice: 0,
    acrylicCoverPrice: 0,
    parentAlbumsPrice: 0,
    locationFee: 0,
    printsPrice: 0,
    thankYouCardsPrice: 0,
    subtotal: 0,
    discount: 0,
    hst: 0,
    total: 0
  })

  const { register, handleSubmit, watch, setValue, formState: { errors } } = useForm<QuoteFormData>({
    resolver: zodResolver(quoteSchema),
    defaultValues: {
      selectedPackage: 'bella',
      extraPhotographer: false,
      splitMorningTeam: false,
      extraHours: 0,
      engagementLocation: 'mill_pond',
      coverageStartTime: '',
      coverageEndTime: '',
      firstLook: false,
      albumType: 'none',
      albumSize: '10x8',
      albumSpreads: 15,
      albumCover: 'black_leather',
      acrylicCover: false,
      parentAlbumQty: 0,
      discountType: 'none',
      discountAmount: 0,
      discount2Amount: 0,
    }
  })

  const watchedValues = watch()

  // Pre-fill from BridalFlow ballot via ?ballot_id=
  useEffect(() => {
    if (!ballotIdParam || editCoupleId || clientQuoteId) return
    const loadBallot = async () => {
      setLoadingQuote(true)
      setBallotError(null)
      try {
        const res = await fetch(`/api/client/quotes/prefill?ballot_id=${ballotIdParam}`)
        if (!res.ok) {
          const err = await res.json().catch(() => ({ error: 'Failed to load ballot' }))
          setBallotError(err.error || 'Lead not found. Check the ballot ID.')
          setLoadingQuote(false)
          return
        }
        const ballot = await res.json()

        // Store ballot references
        setBallotId(ballot.id)
        setBallotShowId(ballot.show_id || null)

        // Map ballot fields to form fields (all editable)
        setValue('brideFirstName', (ballot.bride_first_name || '').trim())
        setValue('brideLastName', (ballot.bride_last_name || '').trim())
        setValue('groomFirstName', (ballot.groom_first_name || '').trim())
        setValue('groomLastName', (ballot.groom_last_name || '').trim())
        setValue('brideEmail', (ballot.email || '').trim())
        if (ballot.cell_phone) setValue('bridePhone', formatPhone((ballot.cell_phone || '').trim()))
        if (ballot.wedding_date) setValue('weddingDate', ballot.wedding_date)
        if (ballot.venue_name) setValue('receptionVenue', (ballot.venue_name || '').trim())
        if (ballot.guest_count) setValue('guestCount', ballot.guest_count)

        // Derive lead source from show_id
        if (ballot.show_id) {
          const leadSource = SHOW_ID_TO_LEAD_SOURCE[ballot.show_id] || ballot.show_id
          setValue('leadSource', leadSource)
        }

        // Pre-fill referral name
        if (ballot.referred_by) setValue('referralName', (ballot.referred_by || '').trim())

        // Pre-fill discovery fields (Fix 7)
        if (ballot.ceremony_venue) setValue('ceremonyVenue', (ballot.ceremony_venue || '').trim())
        if (ballot.bridal_party_count) setValue('bridalPartyCount', ballot.bridal_party_count)
        if (ballot.flower_girl_count) setValue('flowerGirl', ballot.flower_girl_count)
        if (ballot.ring_bearer_count) setValue('ringBearer', ballot.ring_bearer_count)
        if (ballot.first_look != null) setValue('firstLook', ballot.first_look)

        // Package auto-select based on service_needs (Phase 2B)
        if (ballot.service_needs === 'photo_only') {
          setValue('selectedPackage', 'bella')
        } else if (ballot.service_needs === 'photo_video') {
          setValue('selectedPackage', 'silver')
        }
        // video_only: don't auto-select, leave default
      } catch (err) {
        console.error('Failed to load ballot:', err)
        setBallotError('Failed to load lead data. Please try again.')
      } finally {
        setLoadingQuote(false)
      }
    }
    loadBallot()
  }, [ballotIdParam, editCoupleId, clientQuoteId, setValue])

  // Restore saved quote when editing via ?couple_id= URL param
  useEffect(() => {
    if (!editCoupleId) return
    const loadQuote = async () => {
      setLoadingQuote(true)
      try {
        const { data: quote, error } = await getQuoteByCoupleId(editCoupleId)
        if (error || !quote?.form_data) {
          // No saved quote — pre-fill from couple record and ballot data
          const { data: couple } = await getCoupleById(editCoupleId)
          if (couple) {
            setValue('brideFirstName', couple.bride_first_name || '')
            setValue('brideLastName', couple.bride_last_name || '')
            setValue('groomFirstName', couple.groom_first_name || '')
            setValue('groomLastName', couple.groom_last_name || '')
            setValue('weddingDate', couple.wedding_date || '')
            if (couple.bride_phone) setValue('bridePhone', couple.bride_phone)
            if (couple.bride_email) setValue('brideEmail', couple.bride_email)
            if (couple.ceremony_venue) setValue('ceremonyVenue', couple.ceremony_venue)

            // Also pull phone/email/venue from ballot if available
            if (couple.bride_first_name) {
              const { data: leads } = await searchLeadByCouple(
                couple.bride_first_name,
                couple.groom_first_name || ''
              )
              if (leads && leads.length > 0) {
                const lead = leads[0]
                setExistingLead(lead)
                if (lead.cell_phone) setValue('bridePhone', formatPhone(lead.cell_phone))
                if (lead.email) setValue('brideEmail', lead.email)
                if (lead.venue_name) setValue('ceremonyVenue', lead.venue_name)
              }
            }
          }
          setLoadingQuote(false)
          return
        }

        const saved = quote.form_data

        // Restore React Hook Form values
        if (saved.formValues) {
          const fields = saved.formValues as Record<string, any>
          Object.entries(fields).forEach(([key, value]) => {
            setValue(key as any, value)
          })
        }

        // Restore all useState values
        if (saved.installments) setInstallments(saved.installments)
        if (saved.installmentSchedule) setInstallmentSchedule(saved.installmentSchedule)
        if (saved.photoInclusions) setPhotoInclusions(saved.photoInclusions)
        if (saved.videoInclusions) setVideoInclusions(saved.videoInclusions)
        if (saved.webInclusions) setWebInclusions(saved.webInclusions)
        if (saved.printOrders) setPrintOrders(saved.printOrders)
        if (saved.printsIncluded !== undefined) setPrintsIncluded(saved.printsIncluded)
        if (saved.parentAlbumsIncluded !== undefined) setParentAlbumsIncluded(saved.parentAlbumsIncluded)

        setEditingVersion(quote.version || 1)
      } catch (err) {
        console.error('Failed to restore quote:', err)
      } finally {
        setLoadingQuote(false)
      }
    }
    loadQuote()
  }, [editCoupleId, setValue])

  // Restore saved quote when viewing via ?id= (client_quotes table)
  useEffect(() => {
    if (!clientQuoteId || editCoupleId) return
    const loadClientQuote = async () => {
      setLoadingQuote(true)
      try {
        const res = await fetch(`/api/admin/contracts/quote?quote_id=${clientQuoteId}`)
        if (!res.ok) {
          console.error('Failed to fetch client quote:', res.status)
          setLoadingQuote(false)
          return
        }
        const q = await res.json()

        // Map flat client_quotes fields back to form values
        setValue('brideFirstName', q.bride_first_name || '')
        setValue('brideLastName', q.bride_last_name || '')
        setValue('groomFirstName', q.groom_first_name || '')
        setValue('groomLastName', q.groom_last_name || '')
        setValue('brideEmail', q.email || '')
        setValue('bridePhone', q.phone || '')
        setValue('weddingDate', q.wedding_date || '')
        setValue('ceremonyVenue', q.ceremony_venue || '')
        setValue('receptionVenue', q.reception_venue || '')
        if (q.guest_count) setValue('guestCount', q.guest_count)
        if (q.bridal_party_count) setValue('bridalPartyCount', q.bridal_party_count)
        if (q.flower_girl_count) setValue('flowerGirl', q.flower_girl_count)
        if (q.ring_bearer_count) setValue('ringBearer', q.ring_bearer_count)
        setValue('firstLook', q.first_look ?? false)
        if (q.start_time) setValue('coverageStartTime', q.start_time)
        if (q.end_time) setValue('coverageEndTime', q.end_time)
        if (q.extra_hours) setValue('extraHours', q.extra_hours)
        if (q.parent_albums_count) setValue('parentAlbumQty', q.parent_albums_count)
        if (q.notes) setValue('notes', q.notes)
        if (q.lead_source) setValue('leadSource', q.lead_source)

        // Reverse-map package name → key
        if (q.package_name) {
          const pkgKey = Object.keys(PACKAGES).find(
            k => PACKAGES[k as keyof typeof PACKAGES].name.toLowerCase() === q.package_name.toLowerCase()
          ) as QuoteFormData['selectedPackage'] | undefined
          if (pkgKey) setValue('selectedPackage', pkgKey)
        }

        // Reverse-map engagement location label → value
        if (q.engagement_location) {
          const loc = ENGAGEMENT_LOCATIONS.find(
            l => l.label.toLowerCase() === q.engagement_location.toLowerCase()
          )
          setValue('engagementLocation', loc?.value || q.engagement_location)
        }

        // Discount
        if (q.discount_type) {
          setValue('discountType', q.discount_type)
          if (q.discount_value) setValue('discountAmount', q.discount_value)
        }

        // Installments
        if (Array.isArray(q.installments) && q.installments.length > 0) {
          setInstallments(q.installments.map((inst: any) => ({
            label: inst.label || inst.due_description || '',
            amount: Number(inst.amount) || 0,
          })))
        }

        // Parent albums included state
        if (q.parent_albums_count > 0 && q.parent_albums_price === 0) {
          setParentAlbumsIncluded('free')
        } else if (q.parent_albums_count > 0) {
          setParentAlbumsIncluded('paid')
        }

        // Prints included state
        if (q.prints_included === 'free') {
          setPrintsIncluded('free')
        } else if (q.prints_included === 'paid') {
          setPrintsIncluded('paid')
        }
      } catch (err) {
        console.error('Failed to load client quote:', err)
      } finally {
        setLoadingQuote(false)
      }
    }
    loadClientQuote()
  }, [clientQuoteId, editCoupleId, setValue])

  // Check for existing BridalFlow lead
  useEffect(() => {
    const checkExistingLead = async () => {
      if (watchedValues.brideFirstName && watchedValues.groomFirstName) {
        try {
          const { data, error } = await searchLeadByCouple(
            watchedValues.brideFirstName,
            watchedValues.groomFirstName
          )
          if (data && data.length > 0) {
            const lead = data[0]
            setExistingLead(lead)
            setValue('brideLastName', lead.bride_last_name || '')
            setValue('groomLastName', lead.groom_last_name || '')
            setValue('weddingDate', lead.wedding_date || '')
            setValue('bridePhone', lead.cell_phone ? formatPhone(lead.cell_phone) : '')
            setValue('ceremonyVenue', lead.venue_name || '')
          } else {
            setExistingLead(null)
          }
        } catch (error) {
          console.error('Error searching leads:', error)
        }
      }
    }
    const timeoutId = setTimeout(checkExistingLead, 500)
    return () => clearTimeout(timeoutId)
  }, [watchedValues.brideFirstName, watchedValues.groomFirstName, setValue])

  // Calculate pricing
  const calculatePricing = useCallback(() => {
    const selectedPkg = PACKAGES[watchedValues.selectedPackage as keyof typeof PACKAGES]
    const basePrice = selectedPkg?.price || 0
    const pkgKey = watchedValues.selectedPackage

    // Extra photographer
    const extraPhotographerPrice = watchedValues.extraPhotographer ? PRICING.extraPhotographer : 0

    // Extra hours — tiered pricing
    const extraHoursPrice = getExtraHoursPrice(watchedValues.extraHours || 0)

    // Split morning team
    const splitMorningTeamPrice = watchedValues.splitMorningTeam ? PRICING.splitMorningTeam : 0

    // Album pricing — included for Diamond/Eleganza
    let albumPrice = 0
    const isAlbumIncluded = pkgKey === 'diamond' || pkgKey === 'eleganza'
    if (!isAlbumIncluded) {
      if (watchedValues.albumType === 'standard') {
        albumPrice = PRICING.albums.standard[watchedValues.albumSize as keyof typeof PRICING.albums.standard] || 0
      } else if (watchedValues.albumType === 'premium') {
        albumPrice = PRICING.albums.premium[watchedValues.albumSize as keyof typeof PRICING.albums.premium] || 0
      }
    }

    const acrylicCoverPrice = (watchedValues.acrylicCover && (watchedValues.albumType !== 'none' || isAlbumIncluded) && !isAlbumIncluded)
      ? PRICING.acrylicCover
      : 0

    const parentAlbumsPrice = parentAlbumsIncluded === 'paid'
      ? (watchedValues.parentAlbumQty || 0) * PRICING.parentAlbum
      : 0
    const locationFee = watchedValues.engagementLocation === 'brides_choice' ? PRICING.bridesChoiceLocation : 0

    // Prints (only if included and paid)
    const printsPrice = printsIncluded === 'paid' ? printsTotal : 0

    // Thank you cards
    const thankYouCardsPrice = thankYouCardQty * PRICING.thankYouCard

    // Discount 1 applies to BASE PRICE ONLY
    let discount = 0
    if (watchedValues.discountType === 'percent' && watchedValues.discountAmount && watchedValues.discountAmount > 0) {
      discount = basePrice * (watchedValues.discountAmount / 100)
    } else if (watchedValues.discountType === 'flat' && watchedValues.discountAmount && watchedValues.discountAmount > 0) {
      discount = Math.min(watchedValues.discountAmount, basePrice)
    }

    // Discount 2 - always flat $ amount
    let discount2 = 0
    if (watchedValues.discount2Amount && watchedValues.discount2Amount > 0) {
      discount2 = watchedValues.discount2Amount
    }

    const totalDiscount = discount + discount2
    const discountedBase = basePrice - discount
    const subtotal = discountedBase + extraPhotographerPrice + extraHoursPrice + splitMorningTeamPrice + albumPrice + acrylicCoverPrice + parentAlbumsPrice + locationFee + printsPrice + thankYouCardsPrice - discount2
    const hst = subtotal * PRICING.hstRate
    const total = subtotal + hst

    setPricing({
      basePrice,
      extraPhotographerPrice,
      extraHoursPrice,
      splitMorningTeamPrice,
      albumPrice,
      acrylicCoverPrice,
      parentAlbumsPrice,
      locationFee,
      printsPrice,
      thankYouCardsPrice,
      subtotal,
      discount: totalDiscount,
      hst,
      total
    })
    setAlbumIncluded(isAlbumIncluded)
  }, [watchedValues.selectedPackage, watchedValues.extraPhotographer, watchedValues.extraHours, watchedValues.splitMorningTeam, watchedValues.albumType, watchedValues.albumSize, watchedValues.acrylicCover, watchedValues.parentAlbumQty, watchedValues.engagementLocation, watchedValues.discountType, watchedValues.discountAmount, watchedValues.discount2Amount, printsIncluded, printsTotal, parentAlbumsIncluded, thankYouCardQty])

  useEffect(() => {
    calculatePricing()
  }, [calculatePricing])

  // Auto-calculate extra hours from coverage start/end vs package base hours
  useEffect(() => {
    const startVal = watchedValues.coverageStartTime || ''
    const endVal = watchedValues.coverageEndTime || ''
    const selectedPkg = PACKAGES[watchedValues.selectedPackage as keyof typeof PACKAGES]
    const baseHours = selectedPkg?.hours || 8

    if (!startVal || !endVal) {
      setValue('extraHours', 0)
      return
    }

    const [sh, sm] = startVal.split(':').map(Number)
    const [eh, em] = endVal.split(':').map(Number)
    let startMins = sh * 60 + sm
    let endMins = eh * 60 + em
    if (endMins <= startMins) endMins += 1440
    const totalHours = (endMins - startMins) / 60

    const rawExtra = Math.max(0, totalHours - baseHours)
    const roundedExtra = Math.ceil(rawExtra * 2) / 2
    setValue('extraHours', roundedExtra)
  }, [watchedValues.coverageStartTime, watchedValues.coverageEndTime, watchedValues.selectedPackage, setValue])

  // Auto-populate portraits when package changes (Fix 4)
  const prevPackageRef = React.useRef(watchedValues.selectedPackage)
  useEffect(() => {
    const pkg = watchedValues.selectedPackage
    if (pkg && pkg !== prevPackageRef.current) {
      prevPackageRef.current = pkg
      const portraits = PACKAGE_PORTRAITS[pkg] || {}
      const newPrintOrders: Record<string, number> = { '5x7': 0, '8x10': 0, '11x14': 0, '16x20': 0, '20x24': 0, '24x30': 0 }
      Object.entries(portraits).forEach(([size, qty]) => {
        if (size in newPrintOrders) newPrintOrders[size] = qty
      })
      setPrintOrders(newPrintOrders)
      // Auto-set as free (included with package) if there are portraits
      if (Object.values(portraits).some(q => q > 0)) {
        setPrintsIncluded('free')
      }

      // Auto-fill album for Diamond/Eleganza (Fix 3)
      if (pkg === 'diamond' || pkg === 'eleganza') {
        setValue('albumType', 'premium')
        setValue('albumSize', '14x11')
        setValue('albumSpreads', 15)
        setValue('acrylicCover', false) // Don't auto-check upgrade
      }

      // Auto-fill parent albums for Eleganza
      if (pkg === 'eleganza') {
        setValue('parentAlbumQty', 2)
        setParentAlbumsIncluded('free')
      }
    }
  }, [watchedValues.selectedPackage, setValue])

  // Auto-divide installments when total changes - with proper rounding
  // Only auto-update when total changes, not when installments change (to allow manual edits)
  const prevTotalRef = React.useRef(pricing.total)
  
  useEffect(() => {
    // Only redistribute if total actually changed (not from manual edits)
    if (pricing.total > 0 && pricing.total !== prevTotalRef.current) {
      prevTotalRef.current = pricing.total
      const totalCents = Math.round(pricing.total * 100)
      const numInstallments = installments.length
      const perInstallmentCents = Math.floor(totalCents / numInstallments)
      const remainderCents = totalCents - (perInstallmentCents * numInstallments)
      
      setInstallments(prev => prev.map((inst, index) => ({
        ...inst,
        amount: (perInstallmentCents + (index < remainderCents ? 1 : 0)) / 100
      })))
    }
  }, [pricing.total])

  // Installment handlers
  const switchSchedule = (schedule: 'spring' | 'fall') => {
    setInstallmentSchedule(schedule)
    const template = schedule === 'spring' ? SPRING_INSTALLMENTS : FALL_INSTALLMENTS
    
    if (pricing.total > 0) {
      const totalCents = Math.round(pricing.total * 100)
      const perInstallmentCents = Math.floor(totalCents / template.length)
      const remainderCents = totalCents - (perInstallmentCents * template.length)
      
      const updated = template.map((inst, index) => ({
        ...inst,
        amount: (perInstallmentCents + (index < remainderCents ? 1 : 0)) / 100
      }))
      setInstallments(updated)
    } else {
      setInstallments(template)
    }
  }

  const updateInstallment = (index: number, field: 'label' | 'amount', value: string | number) => {
    const updated = [...installments]
    updated[index] = { ...updated[index], [field]: value }
    setInstallments(updated)
  }

  const addInstallment = () => {
    setInstallments([...installments, { label: 'New Installment', amount: 0 }])
  }

  const removeInstallment = (index: number) => {
    if (installments.length > 1) {
      setInstallments(installments.filter((_, i) => i !== index))
    }
  }
  
  const moveInstallment = (index: number, direction: 'up' | 'down') => {
    if (direction === 'up' && index > 0) {
      const newInst = [...installments]
      ;[newInst[index - 1], newInst[index]] = [newInst[index], newInst[index - 1]]
      setInstallments(newInst)
    } else if (direction === 'down' && index < installments.length - 1) {
      const newInst = [...installments]
      ;[newInst[index], newInst[index + 1]] = [newInst[index + 1], newInst[index]]
      setInstallments(newInst)
    }
  }

  const redistributeInstallments = () => {
    if (pricing.total > 0 && installments.length > 0) {
      const totalCents = Math.round(pricing.total * 100)
      const perInstallmentCents = Math.floor(totalCents / installments.length)
      const remainderCents = totalCents - (perInstallmentCents * installments.length)
      
      const updated = installments.map((inst, index) => ({
        ...inst,
        amount: (perInstallmentCents + (index < remainderCents ? 1 : 0)) / 100
      }))
      setInstallments(updated)
    }
  }

  const installmentTotal = installments.reduce((sum, inst) => sum + (inst.amount || 0), 0)

  // Validation for action buttons (Fix 1 + Fix 5)
  const missingLastNames = !watchedValues.brideLastName?.trim() || !watchedValues.groomLastName?.trim()
  const missingReferral = watchedValues.leadSource === 'Referral' && !watchedValues.referralName?.trim()
  const actionButtonsDisabled = missingLastNames || missingReferral
  const validationMessages: string[] = []
  if (missingLastNames) validationMessages.push('Bride and groom last names are required.')
  if (missingReferral) validationMessages.push('Please enter who referred this couple.')

  // Required field styling — amber when empty
  const reqClass = (value: string | undefined) =>
    !value?.trim()
      ? 'px-3 py-2 border border-amber-400 bg-amber-50 rounded text-sm focus:outline-none focus:border-ring'
      : 'px-3 py-2 border border-border rounded text-sm focus:outline-none focus:border-ring'

  // Format phone number as (XXX) XXX-XXXX
  const formatPhone = (value: string): string => {
    const digits = value.replace(/\D/g, '').slice(0, 10)
    if (digits.length === 0) return ''
    if (digits.length <= 3) return `(${digits}`
    if (digits.length <= 6) return `(${digits.slice(0, 3)}) ${digits.slice(3)}`
    return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`
  }

  const handlePhoneChange = (field: 'bridePhone' | 'groomPhone') => (e: React.ChangeEvent<HTMLInputElement>) => {
    setValue(field, formatPhone(e.target.value))
  }

  const onSubmit = async (data: QuoteFormData) => {
    setIsLoading(true)
    try {
      // 1. Find or create couple
      const { data: couple, error: coupleError } = await findOrCreateCouple({
        brideFirstName: data.brideFirstName,
        brideLastName: data.brideLastName,
        groomFirstName: data.groomFirstName,
        groomLastName: data.groomLastName,
        brideEmail: data.brideEmail,
        bridePhone: data.bridePhone,
        groomEmail: data.groomEmail,
        groomPhone: data.groomPhone,
        weddingDate: data.weddingDate,
        ceremonyVenue: data.ceremonyVenue,
        receptionVenue: data.receptionVenue,
        leadSource: data.leadSource,
      })

      if (coupleError || !couple) {
        alert(`Error finding/creating couple: ${coupleError?.message || 'Unknown error'}`)
        return
      }

      // 2. Build items summary for the quote record
      const selectedPkg = PACKAGES[data.selectedPackage as keyof typeof PACKAGES]
      const items = {
        package: { key: data.selectedPackage, name: selectedPkg?.name, price: selectedPkg?.price },
        extraPhotographer: data.extraPhotographer,
        extraHours: data.extraHours,
        albumType: data.albumType,
        albumSize: data.albumSize,
        albumSpreads: data.albumSpreads,
        acrylicCover: data.acrylicCover,
        parentAlbumQty: data.parentAlbumQty,
        engagementLocation: data.engagementLocation,
        bridesChoiceLocation: data.bridesChoiceLocation,
        printOrders: printsIncluded ? printOrders : null,
        printsIncluded,
        parentAlbumsIncluded,
      }

      // 3. Serialize complete form state for restoration
      const formData = {
        formValues: data,
        installments,
        installmentSchedule,
        photoInclusions,
        videoInclusions,
        webInclusions,
        printOrders,
        printsIncluded,
        parentAlbumsIncluded,
        pricing,
      }

      // 4. Upsert quote with versioning
      const { data: quote, error: quoteError, isUpdate, version } = await upsertQuote(couple.id, {
        quote_type: selectedPkg?.type === 'photo_only' ? 'photo_only' : 'photo_video',
        items,
        subtotal: pricing.subtotal,
        tax: pricing.hst,
        discount_type: data.discountType !== 'none' ? data.discountType : null,
        discount_value: pricing.discount,
        total: pricing.total,
        form_data: formData,
        notes: data.notes,
      })

      if (quoteError) {
        alert(`Error saving quote: ${quoteError.message}`)
        return
      }

      const action = isUpdate ? 'updated' : 'created'
      alert(`Quote ${action} successfully! (v${version}) — $${pricing.total.toLocaleString('en-CA', { minimumFractionDigits: 2 })}`)
    } catch (error) {
      console.error('Error saving quote:', error)
      alert('Error saving quote. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  // ============================================================
  // TIMELINE HELPERS - Auto-advance time slots
  // ============================================================
  
  // Convert "14:30" (24hr) to minutes from midnight
  const timeToMinutes = (timeStr: string): number | null => {
    if (!timeStr) return null
    // 24-hour format: HH:MM
    const match24 = timeStr.match(/^(\d{1,2}):(\d{2})$/)
    if (match24) {
      return parseInt(match24[1]) * 60 + parseInt(match24[2])
    }
    // Legacy AM/PM format fallback
    const matchAmPm = timeStr.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i)
    if (matchAmPm) {
      let hours = parseInt(matchAmPm[1])
      const minutes = parseInt(matchAmPm[2])
      const period = matchAmPm[3].toUpperCase()
      if (period === 'PM' && hours !== 12) hours += 12
      if (period === 'AM' && hours === 12) hours = 0
      return hours * 60 + minutes
    }
    return null
  }

  // Convert minutes from midnight to "14:30" (24hr)
  const minutesToTime = (mins: number): string => {
    if (mins < 0) mins = 0
    if (mins >= 24 * 60) mins = 23 * 60 + 45
    const hours24 = Math.floor(mins / 60) % 24
    const minutes = Math.round(mins % 60 / 15) * 15
    return `${hours24.toString().padStart(2, '0')}:${(minutes % 60).toString().padStart(2, '0')}`
  }
  
  // Parse drive time string to minutes
  const parseDriveTime = (driveStr: string): number => {
    if (!driveStr) return 0
    if (driveStr.includes('hr')) {
      const match = driveStr.match(/([\d.]+)\s*hr/)
      return match ? parseFloat(match[1]) * 60 : 0
    }
    const match = driveStr.match(/(\d+)\s*min/)
    return match ? parseInt(match[1]) : 0
  }
  
  // Get suggested start time based on previous end + drive time
  const getSuggestedTime = (prevEndField: string, driveField: string): string => {
    const prevEnd = watchedValues[prevEndField as keyof typeof watchedValues] as string
    const drive = watchedValues[driveField as keyof typeof watchedValues] as string
    const prevMins = timeToMinutes(prevEnd)
    if (prevMins === null) return ''
    const driveMins = parseDriveTime(drive)
    return minutesToTime(prevMins + driveMins)
  }
  
  // Auto-set a field if it's empty and we have a suggestion
  const autoSetTime = (field: string, prevEndField: string, driveField: string) => {
    const currentValue = watchedValues[field as keyof typeof watchedValues]
    if (!currentValue) {
      const suggested = getSuggestedTime(prevEndField, driveField)
      if (suggested) {
        setValue(field as any, suggested)
      }
    }
  }
  
  // Auto-set end time 1hr 15min after start time
  const autoSetEndTime = (endField: string, startField: string) => {
    const startValue = watchedValues[startField as keyof typeof watchedValues] as string
    const endValue = watchedValues[endField as keyof typeof watchedValues]
    if (startValue && !endValue) {
      const startMins = timeToMinutes(startValue)
      if (startMins !== null) {
        const endMins = startMins + 75 // 1 hour 15 minutes
        setValue(endField as any, minutesToTime(endMins))
      }
    }
  }
  
  // Add drive time to a time string
  const addDriveTime = (timeStr: string, driveStr: string): string | null => {
    const timeMins = timeToMinutes(timeStr)
    if (timeMins === null) return null
    const driveMins = parseDriveTime(driveStr)
    return minutesToTime(timeMins + driveMins)
  }
  
  // Unified Timeline - All locations in one sortable array
  type TimelineLocation = {
    id: string
    type: 'fixed' | 'custom'
    name: string
    label: string
    color: string
    bgColor: string
    borderColor: string
    startField?: string
    endField?: string
    startTime?: string
    endTime?: string
    driveTime?: string
    driveField?: string
  }
  
  const FIXED_LOCATIONS: TimelineLocation[] = [
    { id: 'groom', type: 'fixed', name: 'Groom Prep', label: 'Groom Prep', color: 'text-sky-700', bgColor: 'bg-sky-50', borderColor: 'border-sky-100', startField: 'groomStart', endField: 'groomEnd', driveField: 'driveGroomToBride' },
    { id: 'bride', type: 'fixed', name: 'Bride Prep', label: 'Bride Prep', color: 'text-rose-700', bgColor: 'bg-rose-50', borderColor: 'border-rose-100', startField: 'brideStart', endField: 'brideEnd', driveField: 'driveBrideToNext' },
    { id: 'ceremony', type: 'fixed', name: 'Ceremony', label: 'Ceremony', color: 'text-amber-700', bgColor: 'bg-amber-50', borderColor: 'border-amber-100', startField: 'ceremonyStart', endField: 'ceremonyEnd', driveField: 'driveCeremonyToNext' },
    { id: 'park', type: 'fixed', name: 'Park Photos', label: 'Park Photos', color: 'text-emerald-700', bgColor: 'bg-emerald-50', borderColor: 'border-emerald-100', startField: 'parkStart', endField: 'parkEnd', driveField: 'driveParkToNext' },
    { id: 'reception', type: 'fixed', name: 'Reception', label: 'Reception', color: 'text-purple-700', bgColor: 'bg-purple-50', borderColor: 'border-purple-100', startField: 'receptionStart', endField: 'receptionEnd' },
  ]
  
  const [timelineOrder, setTimelineOrder] = useState<string[]>(['groom', 'bride', 'ceremony', 'park', 'reception'])
  const [customLocations, setCustomLocations] = useState<{id: string, name: string, startTime: string, endTime: string, driveTime: string}[]>([])
  const [nextLocationId, setNextLocationId] = useState(1)
  
  const addCustomLocation = () => {
    const newId = `custom-${nextLocationId}`
    setCustomLocations([...customLocations, { id: newId, name: '', startTime: '', endTime: '', driveTime: '' }])
    setTimelineOrder([...timelineOrder, newId])
    setNextLocationId(nextLocationId + 1)
  }
  
  const removeCustomLocation = (id: string) => {
    setCustomLocations(customLocations.filter(loc => loc.id !== id))
    setTimelineOrder(timelineOrder.filter(locId => locId !== id))
  }
  
  const updateCustomLocation = (id: string, field: string, value: string) => {
    setCustomLocations(customLocations.map(loc => 
      loc.id === id ? { ...loc, [field]: value } : loc
    ))
  }
  
  const moveTimelineLocation = (index: number, direction: 'up' | 'down') => {
    if (direction === 'up' && index > 0) {
      const newOrder = [...timelineOrder]
      ;[newOrder[index - 1], newOrder[index]] = [newOrder[index], newOrder[index - 1]]
      setTimelineOrder(newOrder)
    } else if (direction === 'down' && index < timelineOrder.length - 1) {
      const newOrder = [...timelineOrder]
      ;[newOrder[index], newOrder[index + 1]] = [newOrder[index + 1], newOrder[index]]
      setTimelineOrder(newOrder)
    }
  }
  
  const getLocationData = (locId: string): TimelineLocation | null => {
    const fixed = FIXED_LOCATIONS.find(l => l.id === locId)
    if (fixed) return fixed
    const custom = customLocations.find(l => l.id === locId)
    if (custom) {
      return {
        id: custom.id,
        type: 'custom',
        name: custom.name || 'Custom Location',
        label: custom.name || 'Custom Location',
        color: 'text-orange-700',
        bgColor: 'bg-orange-50',
        borderColor: 'border-orange-100',
        startTime: custom.startTime,
        endTime: custom.endTime,
        driveTime: custom.driveTime,
      }
    }
    return null
  }

  // ============================================================
  // RENDER
  // ============================================================

  // Guard: require ballot_id, couple_id, or id
  if (!ballotIdParam && !editCoupleId && !clientQuoteId) {
    return (
      <Layout sidebarConfig={studioflowClientConfig}>
        <div className="min-h-screen bg-muted flex items-center justify-center">
          <div className="bg-background rounded-lg border border-border p-8 max-w-md text-center shadow-sm">
            <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-foreground mb-2">No Lead Selected</h2>
            <p className="text-muted-foreground mb-6">Please start a quote from BridalFlow.</p>
            <a
              href="https://bridalflow.vercel.app/admin"
              className="inline-flex items-center gap-2 bg-primary text-primary-foreground px-6 py-3 rounded font-medium hover:bg-primary/90 transition-colors"
            >
              Go to BridalFlow <ArrowRight className="h-4 w-4" />
            </a>
          </div>
        </div>
      </Layout>
    )
  }

  // Ballot fetch error
  if (ballotError) {
    return (
      <Layout sidebarConfig={studioflowClientConfig}>
        <div className="min-h-screen bg-muted flex items-center justify-center">
          <div className="bg-background rounded-lg border border-border p-8 max-w-md text-center shadow-sm">
            <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-foreground mb-2">Error Loading Lead</h2>
            <p className="text-muted-foreground mb-6">{ballotError}</p>
            <a
              href="https://bridalflow.vercel.app/admin"
              className="inline-flex items-center gap-2 bg-primary text-primary-foreground px-6 py-3 rounded font-medium hover:bg-primary/90 transition-colors"
            >
              Back to BridalFlow <ArrowRight className="h-4 w-4" />
            </a>
          </div>
        </div>
      </Layout>
    )
  }

  return (
    <Layout sidebarConfig={studioflowClientConfig}>
      <div className="min-h-screen bg-muted">
        {loadingQuote && (
          <div className="fixed inset-0 bg-background/80 z-50 flex items-center justify-center">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-foreground mx-auto mb-3"></div>
              <p className="text-muted-foreground text-sm">Loading quote...</p>
            </div>
          </div>
        )}
        {/* Header */}
        <header className="border-b bg-card">
          <div className="container mx-auto px-4 py-6">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold tracking-tight">SIGS Photography</h1>
                <p className="text-muted-foreground">Wedding Photography Quote</p>
                {editingVersion && (
                  <p className="text-amber-600 dark:text-amber-400 text-xs font-medium mt-1">Editing v{editingVersion} — changes will save as v{editingVersion + 1}</p>
                )}
              </div>
              <div className="text-right text-sm text-muted-foreground">
                <p>Toronto & GTA</p>
                <p>info@sigsphoto.ca</p>
              </div>
            </div>
          </div>
        </header>

        <form onSubmit={handleSubmit(onSubmit)} className="max-w-6xl mx-auto px-8 pb-12 space-y-8">
          
          {/* Lead Source & BridalFlow Alert */}
          <div className="bg-background rounded border border-border p-6">
            <div className="flex items-start justify-between gap-8">
              <div className="flex-1 grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">
                    Lead Source
                  </label>
                  <select 
                    {...register('leadSource')}
                    className="w-full px-3 py-2 border border-border rounded text-sm bg-background focus:outline-none focus:border-ring"
                  >
                    <option value="">Select lead source...</option>
                    <optgroup label="Online">
                      <option value="Instagram/Facebook Ad">Instagram/Facebook Ad</option>
                      <option value="Referral">Referral</option>
                    </optgroup>
                    <optgroup label="Winter 2027">
                      <option value="Canada's Bridal Show - Winter 2027">Canada's Bridal Show</option>
                    </optgroup>
                    <optgroup label="Fall 2026">
                      <option value="Canada's Bridal Show - Fall 2026">Canada's Bridal Show</option>
                    </optgroup>
                    <optgroup label="Winter 2026">
                      <option value="Canada's Bridal Show - Winter 2026">Canada's Bridal Show</option>
                      <option value="The Ring Hamilton - Winter 2026">The Ring Hamilton</option>
                      <option value="Modern Bridal Show - Winter 2026">Modern Bridal Show</option>
                      <option value="The Ring Oakville - Winter 2026">The Ring Oakville</option>
                      <option value="The Ring Newmarket - Winter 2026">The Ring Newmarket</option>
                    </optgroup>
                    <optgroup label="Fall 2025">
                      <option value="Canada's Bridal Show - Fall 2025">Canada's Bridal Show</option>
                      <option value="The Ring Oakville - Fall 2025">The Ring Oakville</option>
                      <option value="The Ring Newmarket - Fall 2025">The Ring Newmarket</option>
                      <option value="The Ring Hamilton - Fall 2025">The Ring Hamilton</option>
                    </optgroup>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">
                    Referred By {watchedValues.leadSource === 'Referral' && <span className="text-red-500">*</span>}
                  </label>
                  <input
                    {...register('referralName')}
                    placeholder="Who referred them?"
                    className={`w-full px-3 py-2 border rounded text-sm focus:outline-none focus:border-ring ${missingReferral ? 'border-red-300 bg-red-50' : 'border-border'}`}
                  />
                </div>
              </div>
              
              {existingLead && (
                <div className="bg-emerald-50 border border-emerald-200 rounded px-4 py-3">
                  <div className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-emerald-600" />
                    <span className="text-sm font-medium text-emerald-800">
                      BridalFlow lead found!
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Couple Information */}
          <div className="bg-background rounded border border-border p-6">
            <h2 className="text-sm font-semibold text-foreground uppercase tracking-wide mb-4 flex items-center gap-2">
              <Heart className="h-4 w-4 text-rose-400" />
              Couple Information
            </h2>
            
            <div className="grid grid-cols-2 gap-8">
              {/* Bride */}
              <div className="space-y-3">
                <div className="text-xs font-semibold text-rose-500 uppercase tracking-wide border-b border-rose-100 pb-1">
                  Bride
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <input {...register('brideFirstName')} placeholder="First Name *" className={reqClass(watchedValues.brideFirstName)} />
                  <input {...register('brideLastName')} placeholder="Last Name *" className={reqClass(watchedValues.brideLastName)} />
                </div>
                <input {...register('brideEmail')} type="email" placeholder="Email" className="w-full px-3 py-2 border border-border rounded text-sm focus:outline-none focus:border-ring" />
                <input {...register('bridePhone')} onChange={handlePhoneChange('bridePhone')} placeholder="(416) 555-1234" type="tel" className="w-full px-3 py-2 border border-border rounded text-sm focus:outline-none focus:border-ring" />
              </div>
              
              {/* Groom */}
              <div className="space-y-3">
                <div className="text-xs font-semibold text-sky-500 uppercase tracking-wide border-b border-sky-100 pb-1">
                  Groom
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <input {...register('groomFirstName')} placeholder="First Name *" className={reqClass(watchedValues.groomFirstName)} />
                  <input {...register('groomLastName')} placeholder="Last Name *" className={reqClass(watchedValues.groomLastName)} />
                </div>
                <input {...register('groomEmail')} type="email" placeholder="Email" className="w-full px-3 py-2 border border-border rounded text-sm focus:outline-none focus:border-ring" />
                <input {...register('groomPhone')} onChange={handlePhoneChange('groomPhone')} placeholder="(416) 555-1234" type="tel" className="w-full px-3 py-2 border border-border rounded text-sm focus:outline-none focus:border-ring" />
              </div>
            </div>
          </div>

          {/* Wedding Details */}
          <div className="bg-background rounded border border-border p-6">
            <h2 className="text-sm font-semibold text-foreground uppercase tracking-wide mb-4 flex items-center gap-2">
              <Calendar className="h-4 w-4 text-amber-500" />
              Wedding Details
            </h2>
            
            <div className="grid grid-cols-4 gap-4 mb-4">
              <div>
                <label className="block text-xs text-muted-foreground mb-1">Wedding Date *</label>
                <input type="date" {...register('weddingDate')} className={`w-full ${reqClass(watchedValues.weddingDate)}`} />
              </div>
              <div>
                <label className="block text-xs text-muted-foreground mb-1"># of Guests</label>
                <input type="number" {...register('guestCount', { valueAsNumber: true })} placeholder="150" className="w-full px-3 py-2 border border-border rounded text-sm focus:outline-none focus:border-ring" />
              </div>
              <div>
                <label className="block text-xs text-muted-foreground mb-1"># in Bridal Party</label>
                <input type="number" {...register('bridalPartyCount', { valueAsNumber: true })} placeholder="8" className="w-full px-3 py-2 border border-border rounded text-sm focus:outline-none focus:border-ring" />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs text-muted-foreground mb-1">Flower Girl</label>
                  <input type="number" {...register('flowerGirl', { valueAsNumber: true })} placeholder="0" className="w-full px-3 py-2 border border-border rounded text-sm focus:outline-none focus:border-ring" />
                </div>
                <div>
                  <label className="block text-xs text-muted-foreground mb-1">Ring Bearer</label>
                  <input type="number" {...register('ringBearer', { valueAsNumber: true })} placeholder="0" className="w-full px-3 py-2 border border-border rounded text-sm focus:outline-none focus:border-ring" />
                </div>
              </div>
            </div>
            
            <div className="grid grid-cols-4 gap-4">
              <div>
                <label className="block text-xs text-muted-foreground mb-1">Ceremony Location</label>
                <input {...register('ceremonyVenue')} placeholder="Church / Venue" className="w-full px-3 py-2 border border-border rounded text-sm focus:outline-none focus:border-ring" />
              </div>
              <div>
                <label className="block text-xs text-muted-foreground mb-1">Reception Venue</label>
                <input {...register('receptionVenue')} placeholder="Venue Name" className="w-full px-3 py-2 border border-border rounded text-sm focus:outline-none focus:border-ring" />
              </div>
              <div>
                <label className="block text-xs text-muted-foreground mb-1">DJ</label>
                <input {...register('djName')} placeholder="DJ Name" className="w-full px-3 py-2 border border-border rounded text-sm focus:outline-none focus:border-ring" />
              </div>
              <div>
                <label className="block text-xs text-muted-foreground mb-1">Planner</label>
                <input {...register('plannerName')} placeholder="Planner Name" className="w-full px-3 py-2 border border-border rounded text-sm focus:outline-none focus:border-ring" />
              </div>
            </div>
          </div>

          {/* Coverage Hours */}
          {(() => {
            // Generate 30-min start time slots: 06:00–14:00
            const startSlots: string[] = []
            for (let h = 6; h <= 14; h++) {
              startSlots.push(`${h.toString().padStart(2, '0')}:00`)
              if (h < 14) startSlots.push(`${h.toString().padStart(2, '0')}:30`)
            }
            // Generate 30-min end time slots: 18:00–02:00 (next day)
            const endSlots: string[] = []
            for (let h = 18; h <= 23; h++) {
              endSlots.push(`${h.toString().padStart(2, '0')}:00`)
              endSlots.push(`${h.toString().padStart(2, '0')}:30`)
            }
            endSlots.push('00:00', '00:30', '01:00', '01:30', '02:00')

            const startVal = watchedValues.coverageStartTime || ''
            const endVal = watchedValues.coverageEndTime || ''

            // Calculate total hours with midnight crossing
            let totalHours: number | null = null
            if (startVal && endVal) {
              const [sh, sm] = startVal.split(':').map(Number)
              const [eh, em] = endVal.split(':').map(Number)
              let startMins = sh * 60 + sm
              let endMins = eh * 60 + em
              if (endMins <= startMins) endMins += 1440 // crosses midnight
              totalHours = Math.round((endMins - startMins) / 60 * 10) / 10
            }

            const hoursColor = totalHours === null ? '' :
              totalHours >= 14 ? 'text-red-600 bg-red-50 border-red-200' :
              totalHours >= 13 ? 'text-amber-600 bg-amber-50 border-amber-200' :
              'text-emerald-700 bg-emerald-50 border-emerald-200'

            return (
              <div className="bg-background rounded border border-border p-6">
                <h2 className="text-sm font-semibold text-foreground uppercase tracking-wide mb-4 flex items-center gap-2">
                  <Clock className="h-4 w-4 text-emerald-600" />
                  Coverage Hours
                </h2>
                <div className="flex items-end gap-6">
                  <div className="flex-1">
                    <label className="block text-xs text-muted-foreground mb-1">Start Time</label>
                    <select
                      value={startVal}
                      onChange={e => setValue('coverageStartTime', e.target.value)}
                      className="w-full px-3 py-2 border border-border rounded text-sm focus:outline-none focus:border-ring"
                    >
                      <option value="">—</option>
                      {startSlots.map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                  </div>
                  <div className="flex-1">
                    <label className="block text-xs text-muted-foreground mb-1">End Time</label>
                    <select
                      value={endVal}
                      onChange={e => setValue('coverageEndTime', e.target.value)}
                      className="w-full px-3 py-2 border border-border rounded text-sm focus:outline-none focus:border-ring"
                    >
                      <option value="">—</option>
                      {endSlots.map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                  </div>
                  <div className={`flex-1 text-center rounded border px-4 py-2 ${totalHours !== null ? hoursColor : 'bg-muted border-border'}`}>
                    <div className="text-xs uppercase tracking-wide opacity-70">Total Hours</div>
                    <div className="text-3xl font-bold leading-tight">
                      {totalHours !== null ? totalHours : '—'}
                    </div>
                  </div>
                </div>
              </div>
            )
          })()}

          {/* Timeline - Unified Sortable */}
          <div className="bg-background rounded border border-border p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-semibold text-foreground uppercase tracking-wide flex items-center gap-2">
                <Clock className="h-4 w-4 text-indigo-500" />
                Wedding Day Timeline
              </h2>
              <p className="text-xs text-muted-foreground">Use arrows to reorder locations</p>
            </div>

            {/* First Look Toggle */}
            <div className="flex items-center justify-between p-3 mb-4 bg-muted border border-border rounded">
              <div>
                <span className="text-sm font-medium text-foreground">First Look</span>
                <p className="text-xs text-muted-foreground">Couple sees each other before the ceremony</p>
              </div>
              <button
                type="button"
                onClick={() => {
                  const newVal = !watchedValues.firstLook
                  setValue('firstLook', newVal)
                  // Reorder timeline: First Look ON moves Park before Ceremony
                  const customIds = timelineOrder.filter(id => id.startsWith('custom-'))
                  if (newVal) {
                    setTimelineOrder(['groom', 'bride', 'park', 'ceremony', ...customIds, 'reception'])
                  } else {
                    setTimelineOrder(['groom', 'bride', 'ceremony', 'park', ...customIds, 'reception'])
                  }
                }}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  watchedValues.firstLook ? 'bg-indigo-500' : 'bg-muted'
                }`}
              >
                <span className={`inline-block h-4 w-4 transform rounded-full bg-background transition-transform ${
                  watchedValues.firstLook ? 'translate-x-6' : 'translate-x-1'
                }`} />
              </button>
            </div>

            <div className="space-y-3">
              {timelineOrder.map((locId, index) => {
                const loc = getLocationData(locId)
                if (!loc) return null

                const isCustom = loc.type === 'custom'
                const customData = isCustom ? customLocations.find(c => c.id === locId) : null
                const nextLoc = index < timelineOrder.length - 1 ? getLocationData(timelineOrder[index + 1]) : null

                // Auto-calculated arrival row before Ceremony
                const ceremonyStartVal = watchedValues.ceremonyStart as string | undefined
                const arrivalStartMins = ceremonyStartVal ? timeToMinutes(ceremonyStartVal) : null
                const showArrivalRow = locId === 'ceremony'

                return (
                  <div key={locId}>
                    {/* Photo/Video Arrival — auto-calculated, read-only */}
                    {showArrivalRow && (
                      <div className="flex items-center gap-2 p-3 bg-muted rounded border border-border mb-3 opacity-90">
                        <div className="w-[52px]" /> {/* spacer to align with arrow buttons */}
                        <span className="text-xs font-semibold text-muted-foreground w-28">Photo/Video Arrival</span>
                        <span className="px-2 py-1.5 border border-border rounded text-xs bg-muted text-muted-foreground">
                          {arrivalStartMins !== null ? minutesToTime(arrivalStartMins - 30) : '—'}
                        </span>
                        <span className="text-muted-foreground text-xs">to</span>
                        <span className="px-2 py-1.5 border border-border rounded text-xs bg-muted text-muted-foreground">
                          {ceremonyStartVal || '—'}
                        </span>
                        <span className="text-[10px] text-muted-foreground italic ml-1">30 min before ceremony</span>
                      </div>
                    )}
                    {/* Location Row */}
                    <div className={`flex items-center gap-2 p-3 ${loc.bgColor} rounded border ${loc.borderColor}`}>
                      {/* Move Arrows */}
                      <div className="flex flex-col bg-background rounded border border-border">
                        <button 
                          type="button" 
                          onClick={() => moveTimelineLocation(index, 'up')}
                          disabled={index === 0}
                          className="px-1.5 py-0.5 hover:bg-muted disabled:opacity-30 rounded-t border-b border-border"
                        >
                          <ChevronUp className="h-4 w-4 text-muted-foreground" />
                        </button>
                        <button 
                          type="button" 
                          onClick={() => moveTimelineLocation(index, 'down')}
                          disabled={index === timelineOrder.length - 1}
                          className="px-1.5 py-0.5 hover:bg-muted disabled:opacity-30 rounded-b"
                        >
                          <ChevronDown className="h-4 w-4 text-muted-foreground" />
                        </button>
                      </div>
                      
                      {/* Location Label / Input */}
                      {isCustom ? (
                        <input
                          type="text"
                          value={customData?.name || ''}
                          onChange={(e) => updateCustomLocation(locId, 'name', e.target.value)}
                          placeholder="Location name"
                          className={`w-28 px-2 py-1 text-xs font-semibold ${loc.color} bg-background border border-border rounded`}
                        />
                      ) : (
                        <span className={`text-xs font-semibold ${loc.color} w-28`}>{locId === 'park' && watchedValues.firstLook ? 'First Look + Park' : loc.label}</span>
                      )}
                      
                      {/* Time Selects */}
                      {isCustom ? (
                        <>
                          <select 
                            value={customData?.startTime || ''}
                            onChange={(e) => updateCustomLocation(locId, 'startTime', e.target.value)}
                            onFocus={() => {
                              // Auto-fill from previous location
                              if (!customData?.startTime && index > 0) {
                                const prevLocId = timelineOrder[index - 1]
                                const prevLoc = getLocationData(prevLocId)
                                if (prevLoc) {
                                  const prevCustom = customLocations.find(c => c.id === prevLocId)
                                  const prevEnd = prevLoc.type === 'custom' ? prevCustom?.endTime : watchedValues[prevLoc.endField as keyof typeof watchedValues]
                                  const prevDrive = prevLoc.type === 'custom' ? prevCustom?.driveTime : watchedValues[prevLoc.driveField as keyof typeof watchedValues]
                                  if (prevEnd && typeof prevEnd === 'string') {
                                    const newStart = addDriveTime(prevEnd, String(prevDrive ?? ''))
                                    if (newStart) updateCustomLocation(locId, 'startTime', newStart)
                                  }
                                }
                              }
                            }}
                            className="px-2 py-1.5 border border-border rounded text-xs bg-background"
                          >
                            {TIME_SLOTS.map(t => <option key={`${locId}-s-${t}`} value={t}>{t || '—'}</option>)}
                          </select>
                          <span className="text-muted-foreground text-xs">to</span>
                          <select 
                            value={customData?.endTime || ''}
                            onChange={(e) => updateCustomLocation(locId, 'endTime', e.target.value)}
                            onFocus={() => {
                              // Auto-fill 1 hour after start
                              if (!customData?.endTime && customData?.startTime) {
                                const startMins = timeToMinutes(customData.startTime)
                                if (startMins !== null) {
                                  const endMins = startMins + 60 // 1 hour
                                  const endTime = minutesToTime(endMins)
                                  if (endTime) updateCustomLocation(locId, 'endTime', endTime)
                                }
                              }
                            }}
                            className="px-2 py-1.5 border border-border rounded text-xs bg-background"
                          >
                            {TIME_SLOTS.map(t => <option key={`${locId}-e-${t}`} value={t}>{t || '—'}</option>)}
                          </select>
                        </>
                      ) : (
                        <>
                          <select 
                            {...register(loc.startField as any)}
                            onFocus={() => {
                              // Auto-fill from previous location
                              const currentVal = watchedValues[loc.startField as keyof typeof watchedValues]
                              if (!currentVal && index > 0) {
                                const prevLocId = timelineOrder[index - 1]
                                const prevLoc = getLocationData(prevLocId)
                                if (prevLoc) {
                                  const prevCustom = customLocations.find(c => c.id === prevLocId)
                                  const prevEnd = prevLoc.type === 'custom' ? prevCustom?.endTime : watchedValues[prevLoc.endField as keyof typeof watchedValues]
                                  const prevDrive = prevLoc.type === 'custom' ? prevCustom?.driveTime : (prevLoc.driveField ? watchedValues[prevLoc.driveField as keyof typeof watchedValues] : '')
                                  if (prevEnd) {
                                    const newStart = addDriveTime(prevEnd as string, prevDrive as string)
                                    if (newStart) setValue(loc.startField as any, newStart)
                                  }
                                }
                              }
                            }}
                            className="px-2 py-1.5 border border-border rounded text-xs bg-background"
                          >
                            {TIME_SLOTS.map(t => <option key={`${locId}-s-${t}`} value={t}>{t || '—'}</option>)}
                          </select>
                          <span className="text-muted-foreground text-xs">to</span>
                          <select 
                            {...register(loc.endField as any)}
                            onFocus={() => {
                              // Auto-fill based on location type
                              const currentVal = watchedValues[loc.endField as keyof typeof watchedValues]
                              const startVal = watchedValues[loc.startField as keyof typeof watchedValues]
                              if (!currentVal && startVal) {
                                const startMins = timeToMinutes(startVal as string)
                                if (startMins !== null) {
                                  let duration = 75 // Default 1 hour 15 min
                                  if (locId === 'groom' || locId === 'bride') duration = 75 // 1:15
                                  else if (locId === 'ceremony') duration = 75 // 1:15
                                  else if (locId === 'park') duration = 75 // 1:15
                                  else if (locId === 'reception') {
                                    // Reception: auto-fill 6pm to 10pm
                                    setValue(loc.endField as any, '10:00 PM')
                                    return
                                  }
                                  const endMins = startMins + duration
                                  const endTime = minutesToTime(endMins)
                                  if (endTime) setValue(loc.endField as any, endTime)
                                }
                              }
                            }}
                            className="px-2 py-1.5 border border-border rounded text-xs bg-background"
                          >
                            {TIME_SLOTS.map(t => <option key={`${locId}-e-${t}`} value={t}>{t || '—'}</option>)}
                          </select>
                        </>
                      )}
                      
                      {/* Delete button for custom locations */}
                      {isCustom && (
                        <button 
                          type="button" 
                          onClick={() => removeCustomLocation(locId)}
                          className="p-1 text-red-500 hover:text-red-700 ml-auto"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                    
                    {/* Drive Time (if not last) */}
                    {nextLoc && (
                      <div className="flex items-center gap-2 pl-12 py-2">
                        <Car className="h-3 w-3 text-muted-foreground" />
                        <ArrowRight className="h-3 w-3 text-muted-foreground" />
                        {isCustom ? (
                          <select 
                            value={customData?.driveTime || ''}
                            onChange={(e) => updateCustomLocation(locId, 'driveTime', e.target.value)}
                            className="px-2 py-1 border border-border rounded text-xs bg-muted text-muted-foreground"
                          >
                            {DRIVE_TIMES.map(t => <option key={`${locId}-d-${t}`} value={t}>{t || 'Drive time'}</option>)}
                          </select>
                        ) : loc.driveField ? (
                          <select 
                            {...register(loc.driveField as any)}
                            className="px-2 py-1 border border-border rounded text-xs bg-muted text-muted-foreground"
                          >
                            {DRIVE_TIMES.map(t => <option key={`${locId}-d-${t}`} value={t}>{t || 'Drive time'}</option>)}
                          </select>
                        ) : null}
                        <span className="text-xs text-muted-foreground">to {nextLoc.name}</span>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
            
            {/* Add Location Button */}
            <div className="mt-4 pt-4 border-t border-border">
              <button
                type="button"
                onClick={addCustomLocation}
                className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors py-2"
              >
                <Plus className="h-4 w-4" />
                Add Custom Location
              </button>
            </div>
            
            {/* Timeline Summary */}
            {(() => {
              // Find first start time and last end time from the actual timeline order
              let startTime: string | undefined
              let endTime: string | undefined
              for (const locId of timelineOrder) {
                const loc = getLocationData(locId)
                if (!loc) continue
                const isCustom = loc.type === 'custom'
                const customData = isCustom ? customLocations.find(c => c.id === locId) : null
                const locStart = isCustom ? customData?.startTime : (loc.startField ? watchedValues[loc.startField as keyof typeof watchedValues] as string : undefined)
                const locEnd = isCustom ? customData?.endTime : (loc.endField ? watchedValues[loc.endField as keyof typeof watchedValues] as string : undefined)
                if (locStart && !startTime) startTime = locStart
                if (locEnd) endTime = locEnd
              }
              const startMins = startTime ? timeToMinutes(startTime) : null
              const endMins = endTime ? timeToMinutes(endTime) : null
              const totalHours = startMins !== null && endMins !== null
                ? Math.round(((endMins >= startMins ? endMins : endMins + 1440) - startMins) / 60 * 10) / 10
                : null

              if (startTime || endTime) {
                return (
                  <div className="mt-4 pt-4 border-t border-border flex items-center justify-between">
                    <div className="flex items-center gap-6 text-sm">
                      {startTime && (
                        <div>
                          <span className="text-muted-foreground">Start:</span>
                          <span className="font-semibold text-foreground ml-2">{startTime}</span>
                        </div>
                      )}
                      {endTime && (
                        <div>
                          <span className="text-muted-foreground">Finish:</span>
                          <span className="font-semibold text-foreground ml-2">{endTime}</span>
                        </div>
                      )}
                    </div>
                    {totalHours !== null && totalHours > 0 && (
                      <div className="bg-primary text-primary-foreground px-4 py-2 rounded">
                        <span className="text-muted-foreground text-xs uppercase tracking-wide">Total Coverage:</span>
                        <span className="font-bold text-lg ml-2">{totalHours} hours</span>
                      </div>
                    )}
                  </div>
                )
              }
              return null
            })()}
          </div>

          {/* Package Selection */}
          <div className="bg-background rounded border border-border p-6">
            <h2 className="text-sm font-semibold text-foreground uppercase tracking-wide mb-4 flex items-center gap-2">
              <Camera className="h-4 w-4 text-violet-500" />
              Package Selection
            </h2>
            
            {/* Photo Only */}
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Photo Only</p>
            <div className="grid grid-cols-2 gap-4 mb-5">
              {(['bella', 'eleganza'] as const).map(key => {
                const pkg = PACKAGES[key]
                const sel = watchedValues.selectedPackage === key
                const teamLabel = `${pkg.photographers}P`
                return (
                  <label key={key} className={`relative flex flex-col p-4 border-2 rounded cursor-pointer transition-all ${sel ? 'border-primary bg-muted' : 'border-border hover:border-border'}`}>
                    <input type="radio" {...register('selectedPackage')} value={key} className="sr-only" />
                    <div className="flex items-center gap-3 mb-2">
                      <Camera className={`h-6 w-6 ${sel ? 'text-foreground' : 'text-muted-foreground'}`} />
                      <div>
                        <div className="font-semibold text-foreground">{pkg.name}</div>
                        <div className="text-xs text-muted-foreground">Photo Only · {pkg.hours} hrs · {teamLabel}</div>
                      </div>
                    </div>
                    <div className="text-2xl font-bold text-foreground mt-auto">${pkg.price.toLocaleString()}</div>
                    {sel && <Check className="absolute top-3 right-3 h-5 w-5 text-foreground" />}
                  </label>
                )
              })}
            </div>

            {/* Photo + Video */}
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Photo + Video</p>
            <div className="grid grid-cols-2 gap-4">
              {(['silver', 'gold', 'platinum', 'diamond'] as const).map(key => {
                const pkg = PACKAGES[key]
                const sel = watchedValues.selectedPackage === key
                const teamLabel = `${pkg.photographers}P+${pkg.videographers}V`
                return (
                  <label key={key} className={`relative flex flex-col p-4 border-2 rounded cursor-pointer transition-all ${sel ? 'border-primary bg-muted' : 'border-border hover:border-border'}`}>
                    <input type="radio" {...register('selectedPackage')} value={key} className="sr-only" />
                    <div className="flex items-center gap-3 mb-2">
                      <Video className={`h-6 w-6 ${sel ? 'text-foreground' : 'text-muted-foreground'}`} />
                      <div>
                        <div className="font-semibold text-foreground">{pkg.name}</div>
                        <div className="text-xs text-muted-foreground">Photo + Video · {pkg.hours} hrs · {teamLabel}</div>
                      </div>
                    </div>
                    <div className="text-2xl font-bold text-foreground mt-auto">${pkg.price.toLocaleString()}</div>
                    {sel && <Check className="absolute top-3 right-3 h-5 w-5 text-foreground" />}
                  </label>
                )
              })}
            </div>
            
            {/* Package Details */}
            {watchedValues.selectedPackage && (
              <div className="mt-4 p-4 bg-muted rounded border border-border">
                <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                  {PACKAGES[watchedValues.selectedPackage as keyof typeof PACKAGES]?.name} Includes:
                </h3>
                <div className="grid grid-cols-2 gap-1">
                  {PACKAGES[watchedValues.selectedPackage as keyof typeof PACKAGES]?.features.map((feature, i) => (
                    <div key={i} className="flex items-start gap-2 text-xs text-muted-foreground">
                      <Check className="h-3 w-3 text-emerald-500 mt-0.5 flex-shrink-0" />
                      <span>{feature}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            {/* Extra Photographer Option */}
            <label className={`mt-4 flex items-center gap-3 p-4 border-2 rounded cursor-pointer transition-all ${
              watchedValues.extraPhotographer ? 'border-primary bg-muted' : 'border-border hover:border-border'
            }`}>
              <input type="checkbox" {...register('extraPhotographer')} className="sr-only" />
              <div className={`w-5 h-5 rounded border-2 flex items-center justify-center ${
                watchedValues.extraPhotographer ? 'border-primary bg-primary' : 'border-border'
              }`}>
                {watchedValues.extraPhotographer && <Check className="h-3 w-3 text-primary-foreground" />}
              </div>
              <div className="flex-1">
                <span className="text-sm font-medium text-foreground">Add Extra Photographer</span>
                <p className="text-xs text-muted-foreground">Additional coverage for larger weddings</p>
              </div>
              <span className="text-lg font-bold text-foreground">+$500</span>
            </label>
            
            {/* Extra Hours — Auto-calculated from coverage hours vs package base */}
            {(watchedValues.extraHours || 0) > 0 && (
              <div className="mt-4 p-4 border-2 border-amber-200 bg-amber-50 rounded">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Clock className="h-5 w-5 text-amber-600" />
                    <div>
                      <span className="text-sm font-medium text-foreground">Extra Coverage: {watchedValues.extraHours} hr{watchedValues.extraHours !== 1 ? 's' : ''}</span>
                      <p className="text-xs text-muted-foreground">{PACKAGES[watchedValues.selectedPackage as keyof typeof PACKAGES]?.hours || 8}hr base + {watchedValues.extraHours}hr extra = {(PACKAGES[watchedValues.selectedPackage as keyof typeof PACKAGES]?.hours || 8) + (watchedValues.extraHours || 0)}hr total</p>
                    </div>
                  </div>
                  <span className="text-lg font-bold text-foreground">+${getExtraHoursPrice(watchedValues.extraHours || 0).toLocaleString()}</span>
                </div>
              </div>
            )}

            {/* Team info (always shown) */}
            <div className="mt-2 text-xs text-muted-foreground text-right">
              {PACKAGES[watchedValues.selectedPackage as keyof typeof PACKAGES]?.photographers || 0} photographer{(PACKAGES[watchedValues.selectedPackage as keyof typeof PACKAGES]?.photographers || 0) !== 1 ? 's' : ''}{(PACKAGES[watchedValues.selectedPackage as keyof typeof PACKAGES]?.videographers || 0) > 0 ? ` + ${PACKAGES[watchedValues.selectedPackage as keyof typeof PACKAGES]?.videographers} videographer` : ''}
            </div>

            {/* Split Morning Team */}
            <label className={`mt-4 flex items-center gap-3 p-4 border-2 rounded cursor-pointer transition-all ${
              watchedValues.splitMorningTeam ? 'border-primary bg-muted' : 'border-border hover:border-border'
            }`}>
              <input type="checkbox" {...register('splitMorningTeam')} className="sr-only" />
              <div className={`w-5 h-5 rounded border-2 flex items-center justify-center ${
                watchedValues.splitMorningTeam ? 'border-primary bg-primary' : 'border-border'
              }`}>
                {watchedValues.splitMorningTeam && <Check className="h-3 w-3 text-primary-foreground" />}
              </div>
              <div className="flex-1">
                <span className="text-sm font-medium text-foreground">Split the Morning Team</span>
                <p className="text-xs text-muted-foreground">1 photographer + 1 videographer at the groom's house while another photographer and videographer are at the bride's. 4th team member for 2 hours. Morning sessions extended from 1:15 to 2 hours.</p>
              </div>
              <span className="text-lg font-bold text-foreground">+$800</span>
            </label>
          </div>

          {/* Engagement Location */}
          <div className="bg-background rounded border border-border p-6">
            <h2 className="text-sm font-semibold text-foreground uppercase tracking-wide mb-4 flex items-center gap-2">
              <MapPin className="h-4 w-4 text-emerald-500" />
              Engagement Session Location
            </h2>
            
            <div className="space-y-2">
              {/* Default: Mill Pond */}
              <label className={`flex items-center gap-3 p-3 border rounded cursor-pointer transition-all ${
                watchedValues.engagementLocation === 'mill_pond' ? 'border-primary bg-muted' : 'border-border hover:border-border'
              }`}>
                <input type="radio" {...register('engagementLocation')} value="mill_pond" className="sr-only" />
                <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${watchedValues.engagementLocation === 'mill_pond' ? 'border-primary' : 'border-border'}`}>
                  {watchedValues.engagementLocation === 'mill_pond' && <div className="w-2 h-2 rounded-full bg-primary" />}
                </div>
                <div className="flex-1">
                  <span className="text-sm font-medium text-foreground">Mill Pond Park, Richmond Hill</span>
                  <span className="text-xs text-muted-foreground ml-2">Mon-Thurs 9am-3pm</span>
                </div>
                <span className="text-xs text-emerald-600 font-medium">Default</span>
              </label>
              
              <button type="button" onClick={() => setShowOtherLocations(!showOtherLocations)} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors py-2">
                <ChevronDown className={`h-4 w-4 transition-transform ${showOtherLocations ? 'rotate-180' : ''}`} />
                {showOtherLocations ? 'Hide other locations' : 'Show other locations'}
              </button>
              
              {showOtherLocations && (
                <div className="space-y-2 pl-4 border-l-2 border-border">
                  {ENGAGEMENT_LOCATIONS.filter(loc => loc.value !== 'mill_pond').map(location => (
                    <label key={location.value} className={`flex items-center gap-3 p-3 border rounded cursor-pointer transition-all ${
                      watchedValues.engagementLocation === location.value ? 'border-primary bg-muted' : 'border-border hover:border-border'
                    }`}>
                      <input type="radio" {...register('engagementLocation')} value={location.value} className="sr-only" />
                      <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${watchedValues.engagementLocation === location.value ? 'border-primary' : 'border-border'}`}>
                        {watchedValues.engagementLocation === location.value && <div className="w-2 h-2 rounded-full bg-primary" />}
                      </div>
                      <div className="flex-1">
                        <span className="text-sm font-medium text-foreground">{location.label}</span>
                        {location.sublabel && <span className="text-xs text-muted-foreground ml-2">{location.sublabel}</span>}
                      </div>
                      {location.value === 'brides_choice' && <span className="text-xs font-medium text-amber-600">+$200</span>}
                    </label>
                  ))}
                </div>
              )}

              {watchedValues.engagementLocation === 'brides_choice' && (
                <div className="mt-2">
                  <label className="text-xs font-medium text-muted-foreground mb-1 block">Preferred Location</label>
                  <input
                    type="text"
                    {...register('bridesChoiceLocation')}
                    placeholder="Enter preferred location..."
                    className="w-full px-3 py-2 border border-border rounded text-sm focus:outline-none focus:border-ring"
                  />
                </div>
              )}
            </div>
          </div>

          {/* Work Included - Photo */}
          <div className="bg-background rounded border border-border p-6">
            <h2 className="text-sm font-semibold text-foreground uppercase tracking-wide mb-4 flex items-center gap-2">
              <Image className="h-4 w-4 text-rose-500" />
              Work Included — Photography
            </h2>
            <p className="text-xs text-muted-foreground mb-4">Check off as you explain each inclusion to the couple</p>
            
            <div className="grid grid-cols-2 gap-3 mb-6">
              {[
                { key: 'engagementShoot', label: 'Engagement Photo Shoot', sublabel: '50 digital images watermarked' },
                { key: 'digitalImages', label: 'Wedding Photos on USB/Dropbox', sublabel: 'Ready to print, 300 DPI 4x6, no watermarks' },
                { key: 'postProduction', label: 'Post Production', sublabel: '10 minutes per enlarged image' },
                { key: 'dronePhoto', label: 'Drone Photography', sublabel: 'Aerial shots (weather permitting) — Included' },
              ].map(item => (
                <label key={item.key} className={`flex items-start gap-3 p-3 border rounded cursor-pointer transition-all ${
                  photoInclusions[item.key as keyof typeof photoInclusions] ? 'border-emerald-300 bg-emerald-50' : 'border-border hover:border-border'
                }`}>
                  <input type="checkbox" checked={photoInclusions[item.key as keyof typeof photoInclusions]} onChange={(e) => setPhotoInclusions({...photoInclusions, [item.key]: e.target.checked})} className="sr-only" />
                  <div className={`w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 mt-0.5 ${
                    photoInclusions[item.key as keyof typeof photoInclusions] ? 'border-emerald-500 bg-emerald-500' : 'border-border'
                  }`}>
                    {photoInclusions[item.key as keyof typeof photoInclusions] && <Check className="h-3 w-3 text-primary-foreground" />}
                  </div>
                  <div>
                    <div className="text-sm font-medium text-foreground">{item.label}</div>
                    <div className="text-xs text-muted-foreground">{item.sublabel}</div>
                  </div>
                </label>
              ))}
            </div>
            
            {/* Thank You Cards */}
            <div className="border-t-2 border-primary/20 pt-4 mt-4">
              <div className="bg-amber-50 border-l-4 border-amber-400 rounded-r p-4 mb-4">
                <h3 className="text-sm font-semibold text-foreground uppercase tracking-wide mb-1 flex items-center gap-2">
                  <Heart className="h-4 w-4 text-amber-500" />
                  Thank You Cards
                </h3>
                <p className="text-xs text-muted-foreground mb-3">Post Card style — includes 4×6 envelope. Customizable design.</p>
                <div className="flex items-center gap-4">
                  <label className="text-sm text-foreground font-medium">Quantity:</label>
                  <input
                    type="number"
                    min="0"
                    value={thankYouCardQty || ''}
                    onChange={(e) => setThankYouCardQty(e.target.value === '' ? 0 : parseInt(e.target.value))}
                    placeholder="0"
                    className="w-20 px-3 py-2 border border-border rounded text-sm text-center focus:outline-none focus:border-ring"
                  />
                  <span className="text-xs text-muted-foreground">$5.00 per card</span>
                  {thankYouCardQty > 0 && (
                    <span className="text-sm font-bold text-foreground ml-auto">${(thankYouCardQty * 5).toLocaleString()}</span>
                  )}
                </div>
              </div>
            </div>

            {/* Prints Section */}
            <div className="bg-muted/50 border border-border rounded-lg p-4">
              <p className="text-xs text-muted-foreground mb-3">
                *All weddings on USB/Dropbox, ready to print. 300 DPI 4x6, no watermarks
              </p>
              <h3 className="text-sm font-semibold text-foreground uppercase tracking-wide mb-3 flex items-center gap-2">
                <Image className="h-4 w-4 text-primary" />
                Portraits & Prints
              </h3>
              <div className="grid grid-cols-3 gap-3 mb-4">
                {(() => {
                  const pkgPortraits = PACKAGE_PORTRAITS[watchedValues.selectedPackage] || {}
                  return [
                    { size: '5x7', label: '5×7', price: 20 },
                    { size: '8x10', label: '8×10', price: 30 },
                    { size: '11x14', label: '11×14', price: 100 },
                    { size: '16x20', label: '16×20', price: 295 },
                    { size: '20x24', label: '20×24', price: 295 },
                    { size: '24x30', label: '24×30', price: 295 },
                  ].map(item => {
                    const includedQty = pkgPortraits[item.size] || 0
                    const currentQty = printOrders[item.size] || 0
                    return (
                      <div key={item.size} className={`flex items-center gap-2 p-2 border rounded ${includedQty > 0 && currentQty === includedQty ? 'border-emerald-300 bg-emerald-50' : 'border-border bg-background'}`}>
                        <div className="flex-1">
                          <span className="text-sm font-medium text-foreground">{item.label}</span>
                          <span className="text-xs text-muted-foreground ml-1">${item.price}</span>
                          {includedQty > 0 && currentQty <= includedQty && (
                            <span className="text-[10px] font-semibold text-emerald-600 ml-1 bg-emerald-100 px-1.5 py-0.5 rounded">Included</span>
                          )}
                        </div>
                        <input
                          type="number"
                          min="0"
                          value={currentQty || ''}
                          onChange={(e) => {
                            const val = e.target.value === '' ? 0 : parseInt(e.target.value)
                            setPrintOrders({...printOrders, [item.size]: val})
                          }}
                          placeholder="0"
                          className="w-16 px-2 py-1.5 border border-border rounded text-sm text-center focus:outline-none focus:border-ring"
                        />
                      </div>
                    )
                  })
                })()}
              </div>

              {/* Prints Total & Controls */}
              {printsTotal > 0 && (
                <div className="flex items-center justify-between p-3 bg-background rounded border border-border">
                  <div>
                    {printsIncluded === 'free' ? (
                      <span className="text-sm font-semibold text-emerald-600">Prints included in package — $0</span>
                    ) : printsIncluded === 'paid' ? (
                      <span className="text-sm font-semibold text-foreground">Additional prints: ${printsTotal.toLocaleString()}</span>
                    ) : (
                      <span className="text-sm text-muted-foreground">Prints value: ${printsTotal.toLocaleString()}</span>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setPrintsIncluded(printsIncluded === 'paid' ? false : 'paid')}
                      className={`px-4 py-2 rounded text-sm font-medium transition-all ${
                        printsIncluded === 'paid'
                          ? 'bg-emerald-600 text-white'
                          : 'bg-primary text-primary-foreground hover:bg-primary/90'
                      }`}
                    >
                      {printsIncluded === 'paid' ? '✓ Added' : 'Add'}
                    </button>
                    <button
                      type="button"
                      onClick={() => setPrintsIncluded(printsIncluded === 'free' ? false : 'free')}
                      className={`px-4 py-2 rounded text-sm font-medium transition-all ${
                        printsIncluded === 'free'
                          ? 'bg-emerald-600 text-white'
                          : 'bg-primary/80 text-primary-foreground hover:bg-primary/70'
                      }`}
                    >
                      {printsIncluded === 'free' ? '✓ Included' : 'Include'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Work Included - Video */}
          {PACKAGES[watchedValues.selectedPackage as keyof typeof PACKAGES]?.type === 'photo_video' && (
            <div className="bg-background rounded border border-border p-6">
              <h2 className="text-sm font-semibold text-foreground uppercase tracking-wide mb-4 flex items-center gap-2">
                <Video className="h-4 w-4 text-indigo-500" />
                Work Included — Video
              </h2>
              <p className="text-xs text-muted-foreground mb-4">Check off as you explain each inclusion to the couple</p>
              
              <div className="grid grid-cols-4 gap-2">
                {[
                  { key: 'babyPictures', label: 'Baby Pictures' },
                  { key: 'datingPictures', label: 'Dating Pictures' },
                  { key: 'musicChoice', label: 'Music Choice' },
                  { key: 'endCredits', label: 'End Credits' },
                  { key: 'hdVideo', label: 'HD Video' },
                  { key: 'goPro', label: 'GoPro' },
                  { key: 'droneVideo', label: 'Drone Video' },
                  { key: 'ledLighting', label: 'LED Lighting' },
                  { key: 'proofVideo', label: 'Proof Video' },
                  { key: 'usbDrive', label: 'USB Drive' },
                  { key: 'singleCamera', label: 'Single Camera' },
                  { key: 'multiCamera', label: 'Multi-Camera' },
                  { key: 'slideshow', label: 'Slideshow' },
                  { key: 'longVersion', label: 'Long Version (2hrs)' },
                  { key: 'instagramVideo', label: 'Instagram Video' },
                  { key: 'highlightClips', label: '10 Highlight Clips' },
                ].map(item => (
                  <label key={item.key} className={`flex items-center gap-2 p-2 border rounded cursor-pointer text-xs transition-all ${
                    videoInclusions[item.key as keyof typeof videoInclusions] ? 'border-emerald-300 bg-emerald-50' : 'border-border hover:border-border'
                  }`}>
                    <input type="checkbox" checked={videoInclusions[item.key as keyof typeof videoInclusions]} onChange={(e) => setVideoInclusions({...videoInclusions, [item.key]: e.target.checked})} className="sr-only" />
                    <div className={`w-4 h-4 rounded border flex items-center justify-center flex-shrink-0 ${
                      videoInclusions[item.key as keyof typeof videoInclusions] ? 'border-emerald-500 bg-emerald-500' : 'border-border'
                    }`}>
                      {videoInclusions[item.key as keyof typeof videoInclusions] && <Check className="h-2.5 w-2.5 text-primary-foreground" />}
                    </div>
                    <span className="text-foreground">{item.label}</span>
                  </label>
                ))}
              </div>
            </div>
          )}

          {/* Work Included - Web */}
          <div className="bg-background rounded border border-border p-6">
            <h2 className="text-sm font-semibold text-foreground uppercase tracking-wide mb-4 flex items-center gap-2">
              <Globe className="h-4 w-4 text-sky-500" />
              Work Included — Web
            </h2>
            
            <div className="grid grid-cols-3 gap-3">
              {[
                { key: 'personalWebPage', label: 'Personal Web Page' },
                { key: 'engagementUpload', label: 'Engagement Upload (10 pics)' },
                { key: 'weddingGallery', label: 'Wedding Photo Gallery (50 pics)' },
              ].map(item => (
                <label key={item.key} className={`flex items-center gap-3 p-3 border rounded cursor-pointer transition-all ${
                  webInclusions[item.key as keyof typeof webInclusions] ? 'border-emerald-300 bg-emerald-50' : 'border-border hover:border-border'
                }`}>
                  <input type="checkbox" checked={webInclusions[item.key as keyof typeof webInclusions]} onChange={(e) => setWebInclusions({...webInclusions, [item.key]: e.target.checked})} className="sr-only" />
                  <div className={`w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 ${
                    webInclusions[item.key as keyof typeof webInclusions] ? 'border-emerald-500 bg-emerald-500' : 'border-border'
                  }`}>
                    {webInclusions[item.key as keyof typeof webInclusions] && <Check className="h-3 w-3 text-primary-foreground" />}
                  </div>
                  <span className="text-sm font-medium text-foreground">{item.label}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Albums */}
          <div className="bg-background rounded border border-border p-6">
            <h2 className="text-sm font-semibold text-foreground uppercase tracking-wide mb-4 flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-amber-500" />
              Albums
            </h2>
            
            <div className="grid grid-cols-2 gap-8">
              {/* Couple Album - Left Side */}
              <div className="space-y-3">
                <div>
                  <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">Bride & Groom Album</h3>
                  <p className="text-xs text-muted-foreground">*Omakase style if purchased — $500 discount on layflat pro</p>
                </div>
                
                <div>
                  <label className="block text-xs text-muted-foreground mb-1">Album Type</label>
                  <select {...register('albumType')} className="w-full px-3 py-2 border border-border rounded text-sm bg-background focus:outline-none focus:border-ring">
                    <option value="none">No Album</option>
                    <option value="standard">Standard Album</option>
                    <option value="premium">Premium Album</option>
                  </select>
                </div>
                
                {watchedValues.albumType !== 'none' && (
                  <>
                    <div>
                      <label className="block text-xs text-muted-foreground mb-1">Album Size</label>
                      <select {...register('albumSize')} className="w-full px-3 py-2 border border-border rounded text-sm bg-background focus:outline-none focus:border-ring">
                        <option value="10x8">10" × 8" (Standard)</option>
                        <option value="14x11">14" × 11" (Large)</option>
                      </select>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs text-muted-foreground mb-1"># of Spreads</label>
                        <input type="number" {...register('albumSpreads', { valueAsNumber: true })} placeholder="15" className="w-full px-3 py-2 border border-border rounded text-sm focus:outline-none focus:border-ring" />
                      </div>
                      <div>
                        <label className="block text-xs text-muted-foreground mb-1">Cover</label>
                        <select {...register('albumCover')} className="w-full px-3 py-2 border border-border rounded text-sm bg-background focus:outline-none focus:border-ring">
                          <option value="black_leather">Black Leather</option>
                          <option value="white_leather">White Leather</option>
                          <option value="brown_leather">Brown Leather</option>
                          <option value="linen">Linen</option>
                          <option value="photo_cover">Photo Cover</option>
                        </select>
                      </div>
                    </div>
                    
                    <label className={`flex items-center gap-3 p-3 border rounded cursor-pointer transition-all ${
                      watchedValues.acrylicCover ? 'border-primary bg-muted' : 'border-border hover:border-border'
                    }`}>
                      <input type="checkbox" {...register('acrylicCover')} className="sr-only" />
                      <div className={`w-5 h-5 rounded border-2 flex items-center justify-center ${
                        watchedValues.acrylicCover ? 'border-primary bg-primary' : 'border-border'
                      }`}>
                        {watchedValues.acrylicCover && <Check className="h-3 w-3 text-primary-foreground" />}
                      </div>
                      <div className="flex-1">
                        <span className="text-sm font-medium text-foreground">Acrylic Cover</span>
                        <p className="text-xs text-muted-foreground">Crystal-clear cover with favorite photo</p>
                      </div>
                      <span className="text-sm font-semibold text-foreground">+$200</span>
                    </label>
                  </>
                )}
              </div>
              
              {/* Parent Albums - Right Side */}
              <div className="space-y-3">
                <div>
                  <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">Parent Albums</h3>
                  <p className="text-xs text-muted-foreground">10"×8" • 6 spreads • 30 photos • Linen cover — $295 each</p>
                </div>
                
                <div>
                  <label className="block text-xs text-muted-foreground mb-1">Quantity</label>
                  <select {...register('parentAlbumQty', { valueAsNumber: true })} className="w-full px-3 py-2 border border-border rounded text-sm bg-background focus:outline-none focus:border-ring">
                    <option value={0}>None</option>
                    <option value={1}>1 Album</option>
                    <option value={2}>2 Albums</option>
                    <option value={3}>3 Albums</option>
                    <option value={4}>4 Albums</option>
                  </select>
                </div>
                
                {/* Add/Include buttons for parent albums */}
                {(watchedValues.parentAlbumQty || 0) > 0 && (
                  <div className="flex items-center justify-between p-3 bg-muted rounded border border-border">
                    <div>
                      <span className="text-sm text-muted-foreground">Total:</span>
                      <span className={`text-lg font-bold ml-2 ${parentAlbumsIncluded === 'free' ? 'text-emerald-600 line-through' : 'text-foreground'}`}>
                        ${((watchedValues.parentAlbumQty || 0) * 295).toLocaleString()}
                      </span>
                      {parentAlbumsIncluded === 'free' && (
                        <span className="text-lg font-bold text-emerald-600 ml-2">$0</span>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => setParentAlbumsIncluded(parentAlbumsIncluded === 'paid' ? false : 'paid')}
                        className={`px-3 py-1.5 rounded text-xs font-medium transition-all ${
                          parentAlbumsIncluded === 'paid'
                            ? 'bg-emerald-600 text-white' 
                            : 'bg-primary text-primary-foreground hover:bg-primary/90'
                        }`}
                      >
                        {parentAlbumsIncluded === 'paid' ? '✓ Added' : 'Add'}
                      </button>
                      <button
                        type="button"
                        onClick={() => setParentAlbumsIncluded(parentAlbumsIncluded === 'free' ? false : 'free')}
                        className={`px-3 py-1.5 rounded text-xs font-medium transition-all ${
                          parentAlbumsIncluded === 'free'
                            ? 'bg-emerald-600 text-white' 
                            : 'bg-primary/80 text-primary-foreground hover:bg-primary/70'
                        }`}
                      >
                        {parentAlbumsIncluded === 'free' ? '✓ Included' : 'Include'}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Notes */}
          <div className="bg-background rounded border border-border p-6">
            <h2 className="text-sm font-semibold text-foreground uppercase tracking-wide mb-4">Notes</h2>
            <textarea {...register('notes')} rows={3} placeholder="Special requests, vision for the day, additional details..." className="w-full px-3 py-2 border border-border rounded text-sm focus:outline-none focus:border-ring resize-none" />
          </div>

          {/* Pricing Summary — Premium Dark */}
          <div className="bg-slate-800 rounded-2xl p-6 shadow-lg border border-slate-700">
            <div className="flex items-center gap-2 mb-6">
              <DollarSign className="w-5 h-5 text-emerald-400" />
              <h3 className="text-lg font-bold text-white tracking-wide">PRICING SUMMARY</h3>
            </div>

            <div className="space-y-3 text-sm">
              {/* Package */}
              <div className="flex justify-between items-center py-2">
                <div>
                  <span className="text-white font-medium">{PACKAGES[watchedValues.selectedPackage as keyof typeof PACKAGES]?.name}</span>
                  <span className="text-slate-400 text-sm ml-2">({PACKAGES[watchedValues.selectedPackage as keyof typeof PACKAGES]?.hours}hr, {PACKAGES[watchedValues.selectedPackage as keyof typeof PACKAGES]?.photographers}P{(PACKAGES[watchedValues.selectedPackage as keyof typeof PACKAGES]?.videographers || 0) > 0 ? ` + ${PACKAGES[watchedValues.selectedPackage as keyof typeof PACKAGES]?.videographers}V` : ''})</span>
                </div>
                <span className="font-mono text-white">${pricing.basePrice.toLocaleString()}</span>
              </div>

              {/* Extra coverage */}
              {pricing.extraHoursPrice > 0 && (
                <div className="flex justify-between items-center py-2">
                  <span className="text-slate-300">Extra coverage: {watchedValues.extraHours} hrs</span>
                  <span className="font-mono text-slate-300">${pricing.extraHoursPrice.toLocaleString()}</span>
                </div>
              )}

              {/* Split Morning Team */}
              {pricing.splitMorningTeamPrice > 0 && (
                <div className="flex justify-between items-center py-2">
                  <span className="text-slate-300">Split Morning Team</span>
                  <span className="font-mono text-slate-300">${pricing.splitMorningTeamPrice.toLocaleString()}</span>
                </div>
              )}

              {/* Extra Photographer */}
              {pricing.extraPhotographerPrice > 0 && (
                <div className="flex justify-between items-center py-2">
                  <span className="text-slate-300">Extra Photographer</span>
                  <span className="font-mono text-slate-300">${pricing.extraPhotographerPrice.toLocaleString()}</span>
                </div>
              )}

              {/* Wedding Album — paid */}
              {pricing.albumPrice > 0 && (
                <div className="flex justify-between items-center py-2">
                  <span className="text-slate-300">Wedding Album ({watchedValues.albumSize === '10x8' ? '10"×8"' : '14"×11"'} {watchedValues.albumType})</span>
                  <span className="font-mono text-slate-300">${pricing.albumPrice.toLocaleString()}</span>
                </div>
              )}

              {/* Wedding Album — included */}
              {albumIncluded && (
                <div className="flex justify-between items-center py-2">
                  <span className="text-emerald-400">28×11 Premium Album (included)</span>
                  <span className="font-mono text-emerald-400">$0</span>
                </div>
              )}

              {/* Acrylic Cover */}
              {pricing.acrylicCoverPrice > 0 && (
                <div className="flex justify-between items-center py-2">
                  <span className="text-slate-300">Acrylic Cover Upgrade</span>
                  <span className="font-mono text-slate-300">${pricing.acrylicCoverPrice.toLocaleString()}</span>
                </div>
              )}

              {/* Parent Albums — paid */}
              {pricing.parentAlbumsPrice > 0 && (
                <div className="flex justify-between items-center py-2">
                  <span className="text-slate-300">Parent Albums ({watchedValues.parentAlbumQty})</span>
                  <span className="font-mono text-slate-300">${pricing.parentAlbumsPrice.toLocaleString()}</span>
                </div>
              )}

              {/* Parent Albums — included */}
              {parentAlbumsIncluded === 'free' && (watchedValues.parentAlbumQty || 0) > 0 && (
                <div className="flex justify-between items-center py-2">
                  <span className="text-emerald-400">Parent Albums ({watchedValues.parentAlbumQty}) — included</span>
                  <span className="font-mono text-emerald-400">$0</span>
                </div>
              )}

              {/* Thank You Cards */}
              {pricing.thankYouCardsPrice > 0 && (
                <div className="flex justify-between items-center py-2">
                  <span className="text-slate-300">Thank You Cards ({thankYouCardQty})</span>
                  <span className="font-mono text-slate-300">${pricing.thankYouCardsPrice.toLocaleString()}</span>
                </div>
              )}

              {/* Additional Prints */}
              {pricing.printsPrice > 0 && (
                <div className="flex justify-between items-center py-2">
                  <span className="text-slate-300">Additional Prints</span>
                  <span className="font-mono text-slate-300">${pricing.printsPrice.toLocaleString()}</span>
                </div>
              )}

              {/* Prints — included */}
              {printsIncluded === 'free' && printsTotal > 0 && (
                <div className="flex justify-between items-center py-2">
                  <span className="text-emerald-400">Prints — included</span>
                  <span className="font-mono text-emerald-400">$0</span>
                </div>
              )}

              {/* Bride's Choice Location */}
              {pricing.locationFee > 0 && (
                <div className="flex justify-between items-center py-2">
                  <span className="text-slate-300">Bride's Choice Location</span>
                  <span className="font-mono text-slate-300">${pricing.locationFee.toLocaleString()}</span>
                </div>
              )}

              {/* Divider */}
              <div className="border-t border-slate-600 my-4" />

              {/* Subtotal */}
              <div className="flex justify-between items-center py-2">
                <span className="text-white font-medium">Subtotal</span>
                <span className="font-mono text-white">${pricing.subtotal.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</span>
              </div>

              {/* Discount Controls — inside dark box */}
              <div data-dark-panel className="bg-slate-700/50 rounded-lg p-4 my-3">
                <div className="text-sm text-slate-400 mb-3">Apply Discount</div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <select
                      {...register('discountType')}
                      onChange={(e) => {
                        const value = e.target.value
                        setValue('discountType', value as any)
                        if (value === 'percent') setValue('discountAmount', 50)
                      }}
                      className="w-full h-10 px-3 rounded-lg text-sm focus:outline-none"
                    >
                      <option value="none">No discount</option>
                      <option value="percent">Percentage (%)</option>
                      <option value="flat">Flat amount ($)</option>
                    </select>
                  </div>
                  {watchedValues.discountType !== 'none' && (
                    <div className="relative">
                      <input
                        type="number"
                        {...register('discountAmount', { valueAsNumber: true })}
                        placeholder={watchedValues.discountType === 'percent' ? '50' : '500'}
                        className="w-full h-10 px-3 rounded-lg text-sm focus:outline-none"
                      />
                      <span className="absolute right-3 top-2.5 text-slate-400 text-sm">
                        {watchedValues.discountType === 'percent' ? '%' : '$'}
                      </span>
                    </div>
                  )}
                </div>
                {/* Discount 2 — flat */}
                <div className="mt-3">
                  <div className="text-xs text-slate-400 mb-1">Discount 2 (flat $)</div>
                  <input
                    type="number"
                    {...register('discount2Amount', { valueAsNumber: true })}
                    placeholder="0"
                    className="w-full h-10 px-3 rounded-lg text-sm focus:outline-none"
                  />
                </div>
              </div>

              {/* Discount Display — RED */}
              {pricing.discount > 0 && (
                <div className="flex justify-between items-center py-2">
                  <span className="text-red-400">
                    Discount{watchedValues.discountType === 'percent' ? ` (${watchedValues.discountAmount}%)` : ''}
                  </span>
                  <span className="font-mono text-red-400">-${pricing.discount.toLocaleString()}</span>
                </div>
              )}

              {/* Discount 2 Display — RED */}
              {(watchedValues.discount2Amount || 0) > 0 && (
                <div className="flex justify-between items-center py-2">
                  <span className="text-red-400">Discount 2</span>
                  <span className="font-mono text-red-400">-${(watchedValues.discount2Amount || 0).toLocaleString()}</span>
                </div>
              )}

              {/* HST */}
              <div className="flex justify-between items-center py-2">
                <span className="text-slate-400">HST (13%)</span>
                <span className="font-mono text-slate-400">${pricing.hst.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
              </div>

              {/* Final Divider */}
              <div className="border-t-2 border-slate-500 my-4" />

              {/* TOTAL — Premium */}
              <div className="flex justify-between items-center py-3">
                <span className="text-xl font-bold text-white">TOTAL</span>
                <span className="text-3xl font-mono font-bold text-amber-400">${pricing.total.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
              </div>
            </div>
          </div>

          {/* Installment Schedule */}
          <div className="bg-background rounded border border-border p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-semibold text-foreground uppercase tracking-wide">Installment Schedule</h2>
              <div className="flex gap-2">
                <button type="button" onClick={() => switchSchedule('spring')} className={`px-3 py-1 text-xs rounded transition-all ${installmentSchedule === 'spring' ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:bg-muted/80'}`}>
                  Spring/Summer
                </button>
                <button type="button" onClick={() => switchSchedule('fall')} className={`px-3 py-1 text-xs rounded transition-all ${installmentSchedule === 'fall' ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:bg-muted/80'}`}>
                  Fall/Winter
                </button>
              </div>
            </div>
            
            <div className="space-y-2">
              {installments.map((inst, index) => (
                <div key={index} className="flex items-center gap-3">
                  <span className="text-xs text-muted-foreground w-6">{index + 1}.</span>
                  <input type="text" value={inst.label} onChange={(e) => updateInstallment(index, 'label', e.target.value)} className="flex-1 px-3 py-2 border border-border rounded text-sm focus:outline-none focus:border-ring" />
                  <div className="flex items-center border border-border rounded">
                    <span className="px-2 py-2 bg-muted text-muted-foreground text-sm border-r border-border">$</span>
                    <input type="number" value={inst.amount || ''} onChange={(e) => updateInstallment(index, 'amount', parseFloat(e.target.value) || 0)} placeholder="0.00" step="0.01" className="w-28 px-2 py-2 text-sm focus:outline-none rounded-r" />
                  </div>
                  <div className="flex flex-col">
                    <button 
                      type="button" 
                      onClick={() => moveInstallment(index, 'up')}
                      disabled={index === 0}
                      className="p-0.5 text-muted-foreground hover:text-foreground disabled:opacity-30"
                    >
                      <ChevronUp className="h-3 w-3" />
                    </button>
                    <button 
                      type="button" 
                      onClick={() => moveInstallment(index, 'down')}
                      disabled={index === installments.length - 1}
                      className="p-0.5 text-muted-foreground hover:text-foreground disabled:opacity-30"
                    >
                      <ChevronDown className="h-3 w-3" />
                    </button>
                  </div>
                  <button type="button" onClick={() => removeInstallment(index)} className="p-2 text-muted-foreground hover:text-red-500 transition-colors" disabled={installments.length <= 1}>
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
            
            <div className="flex items-center justify-between mt-4 pt-4 border-t border-border">
              <div className="flex gap-2">
                <button type="button" onClick={addInstallment} className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors">
                  <Plus className="h-4 w-4" />
                  Add Installment
                </button>
                <button type="button" onClick={redistributeInstallments} className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors ml-4">
                  Redistribute Evenly
                </button>
              </div>
              
              <div className="text-right">
                <div className="text-xs text-muted-foreground">Installments Total</div>
                <div className={`text-lg font-bold ${Math.abs(installmentTotal - pricing.total) < 0.01 ? 'text-emerald-600' : 'text-amber-600'}`}>
                  ${installmentTotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  {Math.abs(installmentTotal - pricing.total) >= 0.01 && (
                    <span className="text-xs font-normal ml-2">
                      ({installmentTotal > pricing.total ? '+' : ''}${(installmentTotal - pricing.total).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} from total)
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Validation Messages */}
          {actionButtonsDisabled && validationMessages.length > 0 && (
            <div className="bg-amber-50 border border-amber-200 rounded p-3 flex items-start gap-2">
              <AlertCircle className="h-4 w-4 text-amber-600 mt-0.5 shrink-0" />
              <div className="text-sm text-amber-800">
                {validationMessages.map((msg, i) => <p key={i}>{msg}</p>)}
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-4">
            <button
              type="button"
              disabled={actionButtonsDisabled}
              onClick={async () => {
                const selectedPkg = PACKAGES[watchedValues.selectedPackage as keyof typeof PACKAGES]
                const engLoc = ENGAGEMENT_LOCATIONS.find(l => l.value === watchedValues.engagementLocation)
                const engLabel = watchedValues.engagementLocation === 'brides_choice' && watchedValues.bridesChoiceLocation
                  ? `Bride's Choice — ${watchedValues.bridesChoiceLocation}`
                  : engLoc?.label || watchedValues.engagementLocation

                // Build timeline from current order
                const timeline = timelineOrder
                  .map(locId => {
                    const loc = getLocationData(locId)
                    if (!loc) return null
                    const isCustom = loc.type === 'custom'
                    const customData = isCustom ? customLocations.find(c => c.id === locId) : null
                    const startTime = isCustom ? (customData?.startTime || '') : (watchedValues[loc.startField as keyof typeof watchedValues] as string || '')
                    const endTime = isCustom ? (customData?.endTime || '') : (watchedValues[loc.endField as keyof typeof watchedValues] as string || '')
                    const driveTime = isCustom ? (customData?.driveTime || '') : (loc.driveField ? (watchedValues[loc.driveField as keyof typeof watchedValues] as string || '') : '')
                    const name = locId === 'park' && watchedValues.firstLook ? 'First Look + Park Photos' : loc.name
                    return { name, startTime, endTime, driveTime: driveTime || undefined }
                  })
                  .filter((t): t is NonNullable<typeof t> => t !== null)

                // Determine service_needs from package
                const selectedPkgData = PACKAGES[watchedValues.selectedPackage as keyof typeof PACKAGES]
                const serviceNeeds = selectedPkgData?.type === 'photo_only' ? 'photo_only' : 'photo_video'

                // Save quote to database (update existing or insert new)
                try {
                  const quotePayload = {
                    bride_first_name: watchedValues.brideFirstName || '',
                    bride_last_name: watchedValues.brideLastName || '',
                    groom_first_name: watchedValues.groomFirstName || '',
                    groom_last_name: watchedValues.groomLastName || '',
                    email: watchedValues.brideEmail || watchedValues.groomEmail || '',
                    phone: watchedValues.bridePhone || watchedValues.groomPhone || '',
                    wedding_date: watchedValues.weddingDate || null,
                    ceremony_venue: watchedValues.ceremonyVenue || '',
                    reception_venue: watchedValues.receptionVenue || '',
                    guest_count: watchedValues.guestCount || null,
                    bridal_party_count: watchedValues.bridalPartyCount || null,
                    flower_girl_count: watchedValues.flowerGirl || null,
                    ring_bearer_count: watchedValues.ringBearer || null,
                    first_look: watchedValues.firstLook,
                    engagement_location: engLabel,
                    service_needs: serviceNeeds,
                    package_name: selectedPkg?.name || '',
                    start_time: watchedValues.coverageStartTime || null,
                    end_time: watchedValues.coverageEndTime || null,
                    coverage_hours: (() => {
                      const s = watchedValues.coverageStartTime
                      const e = watchedValues.coverageEndTime
                      if (s && e) {
                        const [sh, sm] = s.split(':').map(Number)
                        const [eh, em] = e.split(':').map(Number)
                        let startM = sh * 60 + sm, endM = eh * 60 + em
                        if (endM <= startM) endM += 1440
                        return Math.round((endM - startM) / 60 * 10) / 10
                      }
                      return selectedPkg?.hours || 0
                    })(),
                    extra_hours: watchedValues.extraHours || 0,
                    package_price: pricing.basePrice,
                    extra_hours_price: pricing.extraHoursPrice,
                    parent_albums_count: watchedValues.parentAlbumQty || 0,
                    parent_albums_price: pricing.parentAlbumsPrice,
                    prints_included: printsIncluded || null,
                    discount_type: watchedValues.discountType === 'none' ? null : watchedValues.discountType,
                    discount_value: watchedValues.discountAmount || null,
                    discount_amount: pricing.discount,
                    subtotal: pricing.subtotal,
                    hst_amount: pricing.hst,
                    total: pricing.total,
                    installments,
                    timeline,
                    notes: watchedValues.notes || null,
                    lead_source: watchedValues.leadSource || null,
                  }

                  if (clientQuoteId || savedQuoteId) {
                    // Update existing client_quotes record
                    const res = await fetch('/api/client/quotes', {
                      method: 'PATCH',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ id: clientQuoteId || savedQuoteId, ...quotePayload }),
                    })
                    if (!res.ok) {
                      const err = await res.json().catch(() => ({ error: 'Save failed' }))
                      console.error('[Download PDF] Save failed:', err)
                      alert('Failed to save quote: ' + (err.error || 'Unknown error'))
                    }
                  } else {
                    // Insert new (or upsert by ballot_id)
                    const res = await fetch('/api/client/quotes', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({
                        ...quotePayload,
                        ballot_id: ballotId || null,
                        show_id: ballotShowId || null,
                      }),
                    })
                    if (!res.ok) {
                      const err = await res.json().catch(() => ({ error: 'Save failed' }))
                      console.error('[Download PDF] Save failed:', err)
                      alert('Failed to save quote: ' + (err.error || 'Unknown error'))
                    } else {
                      const result = await res.json().catch(() => null)
                      if (result?.id) setSavedQuoteId(result.id)
                    }
                  }
                } catch (err) {
                  console.error('[Download PDF] Failed to save quote:', err)
                  alert('Failed to save quote. PDF will still download.')
                }

                // Generate and download PDF
                await generateQuotePdf({
                  brideFirstName: watchedValues.brideFirstName || '',
                  brideLastName: watchedValues.brideLastName || '',
                  groomFirstName: watchedValues.groomFirstName || '',
                  groomLastName: watchedValues.groomLastName || '',
                  brideEmail: watchedValues.brideEmail || '',
                  bridePhone: watchedValues.bridePhone || '',
                  groomEmail: watchedValues.groomEmail || '',
                  groomPhone: watchedValues.groomPhone || '',
                  weddingDate: watchedValues.weddingDate || '',
                  ceremonyVenue: watchedValues.ceremonyVenue || '',
                  receptionVenue: watchedValues.receptionVenue || '',
                  guestCount: watchedValues.guestCount,
                  bridalPartyCount: watchedValues.bridalPartyCount,
                  flowerGirl: watchedValues.flowerGirl,
                  ringBearer: watchedValues.ringBearer,
                  selectedPackage: watchedValues.selectedPackage,
                  packageName: selectedPkg?.name || '',
                  packageHours: selectedPkg?.hours || 0,
                  packageFeatures: selectedPkg?.features || [],
                  extraPhotographer: watchedValues.extraPhotographer,
                  extraHours: watchedValues.extraHours,
                  splitMorningTeam: watchedValues.splitMorningTeam,
                  thankYouCardQty,
                  albumIncluded,
                  engagementLocation: watchedValues.engagementLocation,
                  engagementLocationLabel: engLabel,
                  albumType: watchedValues.albumType,
                  albumSize: watchedValues.albumSize,
                  acrylicCover: watchedValues.acrylicCover,
                  parentAlbumQty: watchedValues.parentAlbumQty,
                  firstLook: watchedValues.firstLook,
                  pricing,
                  freeParentAlbums: parentAlbumsIncluded === 'free',
                  freePrints: printsIncluded === 'free',
                  printsTotal,
                  printOrders,
                  timeline,
                  installments,
                  discountType: watchedValues.discountType,
                  discountAmount: watchedValues.discountAmount,
                  discount2Amount: watchedValues.discount2Amount,
                  leadSource: watchedValues.leadSource || '',
                })
              }}
              className="flex-1 bg-primary text-primary-foreground hover:bg-primary/90 px-6 py-3 rounded font-medium flex items-center justify-center gap-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <FileText className="h-4 w-4" />
              Download &amp; Save
            </button>

            <button
              type="button"
              disabled={isSendingEmail || actionButtonsDisabled}
              onClick={async () => {
                const selectedPkg = PACKAGES[watchedValues.selectedPackage as keyof typeof PACKAGES]
                const engLoc = ENGAGEMENT_LOCATIONS.find(l => l.value === watchedValues.engagementLocation)
                const engLabel = watchedValues.engagementLocation === 'brides_choice' && watchedValues.bridesChoiceLocation
                  ? `Bride's Choice — ${watchedValues.bridesChoiceLocation}`
                  : engLoc?.label || watchedValues.engagementLocation

                const timeline = timelineOrder
                  .map(locId => {
                    const loc = getLocationData(locId)
                    if (!loc) return null
                    const isCustom = loc.type === 'custom'
                    const customData = isCustom ? customLocations.find(c => c.id === locId) : null
                    const startTime = isCustom ? (customData?.startTime || '') : (watchedValues[loc.startField as keyof typeof watchedValues] as string || '')
                    const endTime = isCustom ? (customData?.endTime || '') : (watchedValues[loc.endField as keyof typeof watchedValues] as string || '')
                    const driveTime = isCustom ? (customData?.driveTime || '') : (loc.driveField ? (watchedValues[loc.driveField as keyof typeof watchedValues] as string || '') : '')
                    const name = locId === 'park' && watchedValues.firstLook ? 'First Look + Park Photos' : loc.name
                    return { name, startTime, endTime, driveTime: driveTime || undefined }
                  })
                  .filter((t): t is NonNullable<typeof t> => t !== null)

                const selectedPkgData = PACKAGES[watchedValues.selectedPackage as keyof typeof PACKAGES]
                const serviceNeeds = selectedPkgData?.type === 'photo_only' ? 'photo_only' : 'photo_video'

                setIsSendingEmail(true)

                // 1. Save quote to database first
                try {
                  const quotePayload = {
                    bride_first_name: watchedValues.brideFirstName || '',
                    bride_last_name: watchedValues.brideLastName || '',
                    groom_first_name: watchedValues.groomFirstName || '',
                    groom_last_name: watchedValues.groomLastName || '',
                    email: watchedValues.brideEmail || watchedValues.groomEmail || '',
                    phone: watchedValues.bridePhone || watchedValues.groomPhone || '',
                    wedding_date: watchedValues.weddingDate || null,
                    ceremony_venue: watchedValues.ceremonyVenue || '',
                    reception_venue: watchedValues.receptionVenue || '',
                    guest_count: watchedValues.guestCount || null,
                    bridal_party_count: watchedValues.bridalPartyCount || null,
                    flower_girl_count: watchedValues.flowerGirl || null,
                    ring_bearer_count: watchedValues.ringBearer || null,
                    first_look: watchedValues.firstLook,
                    engagement_location: engLabel,
                    service_needs: serviceNeeds,
                    package_name: selectedPkg?.name || '',
                    start_time: watchedValues.coverageStartTime || null,
                    end_time: watchedValues.coverageEndTime || null,
                    coverage_hours: (() => {
                      const s = watchedValues.coverageStartTime
                      const e = watchedValues.coverageEndTime
                      if (s && e) {
                        const [sh, sm] = s.split(':').map(Number)
                        const [eh, em] = e.split(':').map(Number)
                        let startM = sh * 60 + sm, endM = eh * 60 + em
                        if (endM <= startM) endM += 1440
                        return Math.round((endM - startM) / 60 * 10) / 10
                      }
                      return selectedPkg?.hours || 0
                    })(),
                    extra_hours: watchedValues.extraHours || 0,
                    package_price: pricing.basePrice,
                    extra_hours_price: pricing.extraHoursPrice,
                    parent_albums_count: watchedValues.parentAlbumQty || 0,
                    parent_albums_price: pricing.parentAlbumsPrice,
                    prints_included: printsIncluded || null,
                    discount_type: watchedValues.discountType === 'none' ? null : watchedValues.discountType,
                    discount_value: watchedValues.discountAmount || null,
                    discount_amount: pricing.discount,
                    subtotal: pricing.subtotal,
                    hst_amount: pricing.hst,
                    total: pricing.total,
                    installments,
                    timeline,
                    notes: watchedValues.notes || null,
                    lead_source: watchedValues.leadSource || null,
                  }

                  if (clientQuoteId || savedQuoteId) {
                    await fetch('/api/client/quotes', {
                      method: 'PATCH',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ id: clientQuoteId || savedQuoteId, ...quotePayload }),
                    })
                  } else {
                    const res = await fetch('/api/client/quotes', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({
                        ...quotePayload,
                        ballot_id: ballotId || null,
                        show_id: ballotShowId || null,
                      }),
                    })
                    const result = await res.json().catch(() => null)
                    if (result?.id) setSavedQuoteId(result.id)
                  }
                } catch (err) {
                  console.error('[Send Quote] Failed to save quote:', err)
                }

                // 2. Generate PDF as base64 (also triggers download)
                let pdfBase64: string | undefined
                try {
                  pdfBase64 = await generateQuotePdf({
                    brideFirstName: watchedValues.brideFirstName || '',
                    brideLastName: watchedValues.brideLastName || '',
                    groomFirstName: watchedValues.groomFirstName || '',
                    groomLastName: watchedValues.groomLastName || '',
                    brideEmail: watchedValues.brideEmail || '',
                    bridePhone: watchedValues.bridePhone || '',
                    groomEmail: watchedValues.groomEmail || '',
                    groomPhone: watchedValues.groomPhone || '',
                    weddingDate: watchedValues.weddingDate || '',
                    ceremonyVenue: watchedValues.ceremonyVenue || '',
                    receptionVenue: watchedValues.receptionVenue || '',
                    guestCount: watchedValues.guestCount,
                    bridalPartyCount: watchedValues.bridalPartyCount,
                    flowerGirl: watchedValues.flowerGirl,
                    ringBearer: watchedValues.ringBearer,
                    selectedPackage: watchedValues.selectedPackage,
                    packageName: selectedPkg?.name || '',
                    packageHours: selectedPkg?.hours || 0,
                    packageFeatures: selectedPkg?.features || [],
                    extraPhotographer: watchedValues.extraPhotographer,
                    extraHours: watchedValues.extraHours,
                    splitMorningTeam: watchedValues.splitMorningTeam,
                    thankYouCardQty,
                    albumIncluded,
                    engagementLocation: watchedValues.engagementLocation,
                    engagementLocationLabel: engLabel,
                    albumType: watchedValues.albumType,
                    albumSize: watchedValues.albumSize,
                    acrylicCover: watchedValues.acrylicCover,
                    parentAlbumQty: watchedValues.parentAlbumQty,
                    firstLook: watchedValues.firstLook,
                    pricing,
                    freeParentAlbums: parentAlbumsIncluded === 'free',
                    freePrints: printsIncluded === 'free',
                    printsTotal,
                    printOrders,
                    timeline,
                    installments,
                    discountType: watchedValues.discountType,
                    discountAmount: watchedValues.discountAmount,
                    discount2Amount: watchedValues.discount2Amount,
                    leadSource: watchedValues.leadSource || '',
                  }, { returnBase64: true }) as string | undefined
                } catch (err) {
                  console.error('[Send Quote] PDF generation failed:', err)
                }

                // 3. Send email with PDF
                if (pdfBase64) {
                  try {
                    const coupleEmail = watchedValues.brideEmail || watchedValues.groomEmail || ''
                    if (!coupleEmail) {
                      alert('No email address found. Please enter an email to send the quote.')
                      setIsSendingEmail(false)
                      return
                    }
                    const emailRes = await fetch('/api/client/quotes/send-email', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({
                        quoteId: savedQuoteId || clientQuoteId,
                        brideName: watchedValues.brideFirstName || '',
                        groomName: watchedValues.groomFirstName || '',
                        coupleEmail,
                        pdfBase64,
                      }),
                    })
                    if (emailRes.ok) {
                      alert(`Quote emailed to ${coupleEmail}`)
                    } else {
                      const errData = await emailRes.json().catch(() => null)
                      alert(`Email failed: ${errData?.error || 'Unknown error'}. The PDF was still downloaded.`)
                    }
                  } catch (err) {
                    console.error('[Send Quote] Email send failed:', err)
                    alert('Failed to send email, but the PDF was downloaded.')
                  }
                } else {
                  alert('Could not generate PDF for email. Please try Download PDF instead.')
                }

                setIsSendingEmail(false)
              }}
              className="flex-1 bg-green-600 text-white hover:bg-green-700 px-6 py-3 rounded font-medium flex items-center justify-center gap-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSendingEmail ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Sending...
                </>
              ) : (
                <>
                  <Mail className="h-4 w-4" />
                  Send Quote via Email
                </>
              )}
            </button>

            <button
              type="button"
              disabled={actionButtonsDisabled || (!clientQuoteId && !savedQuoteId)}
              onClick={() => {
                const qId = clientQuoteId || savedQuoteId
                if (qId) {
                  window.open(`/admin/contracts/generate?quote_id=${qId}`, '_blank')
                }
              }}
              className="px-6 py-3 border border-border rounded font-medium flex items-center justify-center gap-2 transition-colors hover:bg-accent disabled:opacity-50 disabled:cursor-not-allowed"
              title={!clientQuoteId && !savedQuoteId ? 'Save the quote first (Download & Save)' : ''}
            >
              <FileText className="h-4 w-4" />
              Print Contract
            </button>
          </div>

          {/* Booking Instructions */}
          <div className="bg-background rounded border border-border p-8 text-center">
            <img 
              src="/images/sigslogo.png" 
              alt="SIGS Photography" 
              className="h-24 w-auto object-contain mx-auto mb-4"
            />
            <p className="text-muted-foreground text-sm leading-relaxed max-w-2xl mx-auto">
              We like to keep things easy and pressure-free. If you're ready to move forward, just shoot a text to Marianna at <span className="font-semibold">416-831-8942</span> to let her know. We'll do a quick happy dance on this end, then send a DocuSign agreement your way. Once you've reviewed and signed, the system will automatically email you a PDF copy for your records. You can send the e-transfer to <span className="font-semibold">info@sigsphoto.ca</span> to get everything finalized!
            </p>
          </div>
        </form>
        
      </div>
    </Layout>
  )
}
