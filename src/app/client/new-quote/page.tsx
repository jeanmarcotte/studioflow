'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Layout } from '@/components/layout/layout'
import { studioflowClientConfig } from '@/config/sidebar'
import { searchLeadByCouple, createQuote } from '@/lib/supabase'
import { 
  Calendar, Phone, MapPin, Users, DollarSign, FileText, Save, Send, 
  AlertCircle, Camera, Video, Check, Plus, Trash2, Clock, Heart,
  ChevronDown, ChevronUp, Music, Image, Globe, Sparkles, Car, ArrowRight
} from 'lucide-react'

// ============================================================
// SIGS PHOTOGRAPHY - QUOTE BUILDER v4
// Professional Sales Call Worksheet
// ============================================================

// Generate 15-minute time slots from 6:00 AM to 11:45 PM
const TIME_SLOTS = (() => {
  const slots: string[] = ['']
  // Regular hours 6AM to 11:45PM
  for (let hour = 6; hour <= 23; hour++) {
    for (let min = 0; min < 60; min += 15) {
      const h = hour % 12 || 12
      const ampm = hour < 12 ? 'AM' : 'PM'
      const minStr = min.toString().padStart(2, '0')
      slots.push(`${h}:${minStr} ${ampm}`)
    }
  }
  // Add midnight to 1AM for late receptions
  slots.push('12:00 AM')
  slots.push('12:15 AM')
  slots.push('12:30 AM')
  slots.push('12:45 AM')
  slots.push('1:00 AM')
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
  selectedPackage: z.enum(['exclusively_photo', 'package_c', 'package_b', 'package_a']),
  extraPhotographer: z.boolean(),
  extraHours: z.number().min(0).max(6),
  
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
  exclusively_photo: {
    name: 'Exclusively Photography',
    price: 5350,
    hours: 8,
    type: 'photo_only',
    photographers: 2,
    videographers: 0,
    features: [
      'Up to 8 hours of coverage',
      '2 Professional Photographers',
      'Drone Photography',
      'Engagement Photo session',
      'Professional retouching and colour correction',
      'Photo Sneak Peeks',
      'Engagement & Wedding personalized online photo gallery',
      'Online proofing for your final approval',
      'Digital Download of ALL edited wedding photos NO WATERMARK',
    ]
  },
  package_c: {
    name: 'Photography & Video Package C',
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
      'Engagement Photo session',
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
    ]
  },
  package_b: {
    name: 'Photography & Video Package B',
    price: 7000,
    hours: 10,
    type: 'photo_video',
    photographers: 2,
    videographers: 1,
    features: [
      'Up to 10 hours of coverage',
      '2 Professional Photographers',
      '1 Professional Videographer',
      'Drone Photography & Video Footage',
      'Engagement Photo session',
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
    ]
  },
  package_a: {
    name: 'Photography & Video Package A',
    price: 8000,
    hours: 12,
    type: 'photo_video',
    photographers: 2,
    videographers: 1,
    features: [
      'Up to 12 hours of coverage',
      '2 Professional Photographers',
      '1 Professional Videographer',
      'Drone Photography & Video Footage',
      'Engagement Photo session',
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
      '*additional photographers/videographers available upon request',
    ]
  },
}

const PRICING = {
  albums: {
    standard: { '10x8': 800, '14x11': 1200 },
    premium: { '10x8': 1200, '14x11': 1600 },
  },
  acrylicCover: 200,
  parentAlbum: 295,
  bridesChoiceLocation: 200,
  extraPhotographer: 500,
  extraHour: 350,
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
  const [isLoading, setIsLoading] = useState(false)
  const [existingLead, setExistingLead] = useState<any>(null)
  const [showOtherLocations, setShowOtherLocations] = useState(false)
  const [showEmailModal, setShowEmailModal] = useState(false)
  
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
    albumPrice: 0,
    acrylicCoverPrice: 0,
    parentAlbumsPrice: 0,
    locationFee: 0,
    printsPrice: 0,
    subtotal: 0,
    discount: 0,
    hst: 0,
    total: 0
  })

  const { register, handleSubmit, watch, setValue, formState: { errors } } = useForm<QuoteFormData>({
    resolver: zodResolver(quoteSchema),
    defaultValues: {
      selectedPackage: 'exclusively_photo',
      extraPhotographer: false,
      extraHours: 0,
      engagementLocation: 'mill_pond',
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
            setValue('bridePhone', lead.cell_phone || '')
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

    // Extra photographer
    const extraPhotographerPrice = watchedValues.extraPhotographer ? PRICING.extraPhotographer : 0
    
    // Extra hours
    const extraHoursPrice = (watchedValues.extraHours || 0) * PRICING.extraHour

    // Album pricing
    let albumPrice = 0
    if (watchedValues.albumType === 'standard') {
      albumPrice = PRICING.albums.standard[watchedValues.albumSize as keyof typeof PRICING.albums.standard] || 0
    } else if (watchedValues.albumType === 'premium') {
      albumPrice = PRICING.albums.premium[watchedValues.albumSize as keyof typeof PRICING.albums.premium] || 0
    }

    const acrylicCoverPrice = (watchedValues.acrylicCover && watchedValues.albumType !== 'none') 
      ? PRICING.acrylicCover 
      : 0

    const parentAlbumsPrice = parentAlbumsIncluded === 'paid' 
      ? (watchedValues.parentAlbumQty || 0) * PRICING.parentAlbum 
      : 0
    const locationFee = watchedValues.engagementLocation === 'brides_choice' ? PRICING.bridesChoiceLocation : 0
    
    // Prints (only if included and paid)
    const printsPrice = printsIncluded === 'paid' ? printsTotal : 0

    // Discount 1 applies to BASE PRICE ONLY - only when type is selected and amount is valid
    let discount = 0
    if (watchedValues.discountType === 'percent' && watchedValues.discountAmount && watchedValues.discountAmount > 0) {
      discount = basePrice * (watchedValues.discountAmount / 100)
    } else if (watchedValues.discountType === 'flat' && watchedValues.discountAmount && watchedValues.discountAmount > 0) {
      discount = Math.min(watchedValues.discountAmount, basePrice) // Can't discount more than base price
    }
    
    // Discount 2 - always flat $ amount
    let discount2 = 0
    if (watchedValues.discount2Amount && watchedValues.discount2Amount > 0) {
      discount2 = watchedValues.discount2Amount
    }
    
    const totalDiscount = discount + discount2
    const discountedBase = basePrice - discount
    const subtotal = discountedBase + extraPhotographerPrice + extraHoursPrice + albumPrice + acrylicCoverPrice + parentAlbumsPrice + locationFee + printsPrice - discount2
    const hst = subtotal * PRICING.hstRate
    const total = subtotal + hst

    setPricing({
      basePrice,
      extraPhotographerPrice,
      extraHoursPrice,
      albumPrice,
      acrylicCoverPrice,
      parentAlbumsPrice,
      locationFee,
      printsPrice,
      subtotal,
      discount: totalDiscount,
      hst,
      total
    })
  }, [watchedValues.selectedPackage, watchedValues.extraPhotographer, watchedValues.extraHours, watchedValues.albumType, watchedValues.albumSize, watchedValues.acrylicCover, watchedValues.parentAlbumQty, watchedValues.engagementLocation, watchedValues.discountType, watchedValues.discountAmount, watchedValues.discount2Amount, printsIncluded, printsTotal, parentAlbumsIncluded])

  useEffect(() => {
    calculatePricing()
  }, [calculatePricing])

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

  const onSubmit = async (data: QuoteFormData) => {
    setIsLoading(true)
    try {
      alert('Quote saved successfully!')
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
  
  // Convert "11:30 AM" to minutes from midnight
  const timeToMinutes = (timeStr: string): number | null => {
    if (!timeStr) return null
    const match = timeStr.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i)
    if (!match) return null
    let hours = parseInt(match[1])
    const minutes = parseInt(match[2])
    const period = match[3].toUpperCase()
    if (period === 'PM' && hours !== 12) hours += 12
    if (period === 'AM' && hours === 12) hours = 0
    return hours * 60 + minutes
  }
  
  // Convert minutes from midnight to "11:30 AM"
  const minutesToTime = (mins: number): string => {
    if (mins < 0) mins = 0
    if (mins >= 24 * 60) mins = 23 * 60 + 45
    const hours24 = Math.floor(mins / 60)
    const minutes = Math.round(mins % 60 / 15) * 15 // Round to nearest 15
    const hours12 = hours24 % 12 || 12
    const period = hours24 < 12 ? 'AM' : 'PM'
    return `${hours12}:${minutes.toString().padStart(2, '0')} ${period}`
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
  return (
    <Layout sidebarConfig={studioflowClientConfig}>
      <div className="min-h-screen bg-stone-50">
        {/* Header */}
        <div className="bg-stone-900 text-white py-6 px-8 mb-8">
          <div className="max-w-6xl mx-auto flex items-center justify-between">
            <div className="flex items-center gap-4">
              <img 
                src="/images/sigslogo.png" 
                alt="SIGS Photography" 
                className="h-14 w-auto object-contain"
              />
              <div>
                <p className="text-stone-400 text-sm">Wedding Package Quote</p>
              </div>
            </div>
            <div className="text-right text-sm">
              <p className="text-stone-400">E-Transfer</p>
              <p className="font-medium">info@sigsphoto.ca</p>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="max-w-6xl mx-auto px-8 pb-12 space-y-8">
          
          {/* Lead Source & BridalFlow Alert */}
          <div className="bg-white rounded border border-stone-200 p-6">
            <div className="flex items-start justify-between gap-8">
              <div className="flex-1 grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-stone-500 uppercase tracking-wide mb-1">
                    Lead Source
                  </label>
                  <select 
                    {...register('leadSource')}
                    className="w-full px-3 py-2 border border-stone-300 rounded text-sm bg-white focus:outline-none focus:border-stone-500"
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
                  <label className="block text-xs font-medium text-stone-500 uppercase tracking-wide mb-1">
                    Referral Name (if applicable)
                  </label>
                  <input
                    {...register('referralName')}
                    placeholder="Who referred them?"
                    className="w-full px-3 py-2 border border-stone-300 rounded text-sm focus:outline-none focus:border-stone-500"
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
          <div className="bg-white rounded border border-stone-200 p-6">
            <h2 className="text-sm font-semibold text-stone-800 uppercase tracking-wide mb-4 flex items-center gap-2">
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
                  <input {...register('brideFirstName')} placeholder="First Name *" className="px-3 py-2 border border-stone-300 rounded text-sm focus:outline-none focus:border-stone-500" />
                  <input {...register('brideLastName')} placeholder="Last Name *" className="px-3 py-2 border border-stone-300 rounded text-sm focus:outline-none focus:border-stone-500" />
                </div>
                <input {...register('brideEmail')} type="email" placeholder="Email" className="w-full px-3 py-2 border border-stone-300 rounded text-sm focus:outline-none focus:border-stone-500" />
                <input {...register('bridePhone')} placeholder="Phone" className="w-full px-3 py-2 border border-stone-300 rounded text-sm focus:outline-none focus:border-stone-500" />
              </div>
              
              {/* Groom */}
              <div className="space-y-3">
                <div className="text-xs font-semibold text-sky-500 uppercase tracking-wide border-b border-sky-100 pb-1">
                  Groom
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <input {...register('groomFirstName')} placeholder="First Name *" className="px-3 py-2 border border-stone-300 rounded text-sm focus:outline-none focus:border-stone-500" />
                  <input {...register('groomLastName')} placeholder="Last Name *" className="px-3 py-2 border border-stone-300 rounded text-sm focus:outline-none focus:border-stone-500" />
                </div>
                <input {...register('groomEmail')} type="email" placeholder="Email" className="w-full px-3 py-2 border border-stone-300 rounded text-sm focus:outline-none focus:border-stone-500" />
                <input {...register('groomPhone')} placeholder="Phone" className="w-full px-3 py-2 border border-stone-300 rounded text-sm focus:outline-none focus:border-stone-500" />
              </div>
            </div>
          </div>

          {/* Wedding Details */}
          <div className="bg-white rounded border border-stone-200 p-6">
            <h2 className="text-sm font-semibold text-stone-800 uppercase tracking-wide mb-4 flex items-center gap-2">
              <Calendar className="h-4 w-4 text-amber-500" />
              Wedding Details
            </h2>
            
            <div className="grid grid-cols-4 gap-4 mb-4">
              <div>
                <label className="block text-xs text-stone-500 mb-1">Wedding Date *</label>
                <input type="date" {...register('weddingDate')} className="w-full px-3 py-2 border border-stone-300 rounded text-sm focus:outline-none focus:border-stone-500" />
              </div>
              <div>
                <label className="block text-xs text-stone-500 mb-1"># of Guests</label>
                <input type="number" {...register('guestCount', { valueAsNumber: true })} placeholder="150" className="w-full px-3 py-2 border border-stone-300 rounded text-sm focus:outline-none focus:border-stone-500" />
              </div>
              <div>
                <label className="block text-xs text-stone-500 mb-1"># in Bridal Party</label>
                <input type="number" {...register('bridalPartyCount', { valueAsNumber: true })} placeholder="8" className="w-full px-3 py-2 border border-stone-300 rounded text-sm focus:outline-none focus:border-stone-500" />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs text-stone-500 mb-1">Flower Girl</label>
                  <input type="number" {...register('flowerGirl', { valueAsNumber: true })} placeholder="0" className="w-full px-3 py-2 border border-stone-300 rounded text-sm focus:outline-none focus:border-stone-500" />
                </div>
                <div>
                  <label className="block text-xs text-stone-500 mb-1">Ring Bearer</label>
                  <input type="number" {...register('ringBearer', { valueAsNumber: true })} placeholder="0" className="w-full px-3 py-2 border border-stone-300 rounded text-sm focus:outline-none focus:border-stone-500" />
                </div>
              </div>
            </div>
            
            <div className="grid grid-cols-4 gap-4">
              <div>
                <label className="block text-xs text-stone-500 mb-1">Ceremony Location</label>
                <input {...register('ceremonyVenue')} placeholder="Church / Venue" className="w-full px-3 py-2 border border-stone-300 rounded text-sm focus:outline-none focus:border-stone-500" />
              </div>
              <div>
                <label className="block text-xs text-stone-500 mb-1">Reception Venue</label>
                <input {...register('receptionVenue')} placeholder="Venue Name" className="w-full px-3 py-2 border border-stone-300 rounded text-sm focus:outline-none focus:border-stone-500" />
              </div>
              <div>
                <label className="block text-xs text-stone-500 mb-1">DJ</label>
                <input {...register('djName')} placeholder="DJ Name" className="w-full px-3 py-2 border border-stone-300 rounded text-sm focus:outline-none focus:border-stone-500" />
              </div>
              <div>
                <label className="block text-xs text-stone-500 mb-1">Planner</label>
                <input {...register('plannerName')} placeholder="Planner Name" className="w-full px-3 py-2 border border-stone-300 rounded text-sm focus:outline-none focus:border-stone-500" />
              </div>
            </div>
          </div>

          {/* Timeline - Unified Sortable */}
          <div className="bg-white rounded border border-stone-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-semibold text-stone-800 uppercase tracking-wide flex items-center gap-2">
                <Clock className="h-4 w-4 text-indigo-500" />
                Wedding Day Timeline
              </h2>
              <p className="text-xs text-stone-400">Use arrows to reorder locations</p>
            </div>

            {/* First Look Toggle */}
            <div className="flex items-center justify-between p-3 mb-4 bg-stone-50 border border-stone-200 rounded">
              <div>
                <span className="text-sm font-medium text-stone-800">First Look</span>
                <p className="text-xs text-stone-500">Couple sees each other before the ceremony</p>
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
                  watchedValues.firstLook ? 'bg-indigo-500' : 'bg-stone-300'
                }`}
              >
                <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
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
                
                return (
                  <div key={locId}>
                    {/* Location Row */}
                    <div className={`flex items-center gap-2 p-3 ${loc.bgColor} rounded border ${loc.borderColor}`}>
                      {/* Move Arrows */}
                      <div className="flex flex-col bg-white rounded border border-stone-200">
                        <button 
                          type="button" 
                          onClick={() => moveTimelineLocation(index, 'up')}
                          disabled={index === 0}
                          className="px-1.5 py-0.5 hover:bg-stone-100 disabled:opacity-30 rounded-t border-b border-stone-200"
                        >
                          <ChevronUp className="h-4 w-4 text-stone-600" />
                        </button>
                        <button 
                          type="button" 
                          onClick={() => moveTimelineLocation(index, 'down')}
                          disabled={index === timelineOrder.length - 1}
                          className="px-1.5 py-0.5 hover:bg-stone-100 disabled:opacity-30 rounded-b"
                        >
                          <ChevronDown className="h-4 w-4 text-stone-600" />
                        </button>
                      </div>
                      
                      {/* Location Label / Input */}
                      {isCustom ? (
                        <input
                          type="text"
                          value={customData?.name || ''}
                          onChange={(e) => updateCustomLocation(locId, 'name', e.target.value)}
                          placeholder="Location name"
                          className={`w-28 px-2 py-1 text-xs font-semibold ${loc.color} bg-white border border-stone-300 rounded`}
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
                            className="px-2 py-1.5 border border-stone-300 rounded text-xs bg-white"
                          >
                            {TIME_SLOTS.map(t => <option key={`${locId}-s-${t}`} value={t}>{t || '—'}</option>)}
                          </select>
                          <span className="text-stone-400 text-xs">to</span>
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
                            className="px-2 py-1.5 border border-stone-300 rounded text-xs bg-white"
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
                            className="px-2 py-1.5 border border-stone-300 rounded text-xs bg-white"
                          >
                            {TIME_SLOTS.map(t => <option key={`${locId}-s-${t}`} value={t}>{t || '—'}</option>)}
                          </select>
                          <span className="text-stone-400 text-xs">to</span>
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
                            className="px-2 py-1.5 border border-stone-300 rounded text-xs bg-white"
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
                        <Car className="h-3 w-3 text-stone-400" />
                        <ArrowRight className="h-3 w-3 text-stone-300" />
                        {isCustom ? (
                          <select 
                            value={customData?.driveTime || ''}
                            onChange={(e) => updateCustomLocation(locId, 'driveTime', e.target.value)}
                            className="px-2 py-1 border border-stone-200 rounded text-xs bg-stone-50 text-stone-600"
                          >
                            {DRIVE_TIMES.map(t => <option key={`${locId}-d-${t}`} value={t}>{t || 'Drive time'}</option>)}
                          </select>
                        ) : loc.driveField ? (
                          <select 
                            {...register(loc.driveField as any)}
                            className="px-2 py-1 border border-stone-200 rounded text-xs bg-stone-50 text-stone-600"
                          >
                            {DRIVE_TIMES.map(t => <option key={`${locId}-d-${t}`} value={t}>{t || 'Drive time'}</option>)}
                          </select>
                        ) : null}
                        <span className="text-xs text-stone-400">to {nextLoc.name}</span>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
            
            {/* Add Location Button */}
            <div className="mt-4 pt-4 border-t border-stone-200">
              <button
                type="button"
                onClick={addCustomLocation}
                className="flex items-center gap-2 text-sm text-stone-500 hover:text-stone-700 transition-colors py-2"
              >
                <Plus className="h-4 w-4" />
                Add Custom Location
              </button>
            </div>
            
            {/* Timeline Summary */}
            {(() => {
              const startTime = watchedValues.groomStart || watchedValues.brideStart
              const endTime = watchedValues.receptionEnd
              const startMins = startTime ? timeToMinutes(startTime) : null
              const endMins = endTime ? timeToMinutes(endTime) : null
              const totalHours = startMins !== null && endMins !== null 
                ? Math.round((endMins - startMins) / 60 * 10) / 10 
                : null
              
              if (startTime || endTime) {
                return (
                  <div className="mt-4 pt-4 border-t border-stone-200 flex items-center justify-between">
                    <div className="flex items-center gap-6 text-sm">
                      {startTime && (
                        <div>
                          <span className="text-stone-500">Start:</span>
                          <span className="font-semibold text-stone-800 ml-2">{startTime}</span>
                        </div>
                      )}
                      {endTime && (
                        <div>
                          <span className="text-stone-500">Finish:</span>
                          <span className="font-semibold text-stone-800 ml-2">{endTime}</span>
                        </div>
                      )}
                    </div>
                    {totalHours !== null && totalHours > 0 && (
                      <div className="bg-stone-800 text-white px-4 py-2 rounded">
                        <span className="text-stone-400 text-xs uppercase tracking-wide">Total Coverage:</span>
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
          <div className="bg-white rounded border border-stone-200 p-6">
            <h2 className="text-sm font-semibold text-stone-800 uppercase tracking-wide mb-4 flex items-center gap-2">
              <Camera className="h-4 w-4 text-violet-500" />
              Package Selection
            </h2>
            
            <div className="grid grid-cols-2 gap-4">
              {/* Exclusively Photography */}
              <label className={`relative flex flex-col p-4 border-2 rounded cursor-pointer transition-all ${
                watchedValues.selectedPackage === 'exclusively_photo' ? 'border-stone-800 bg-stone-50' : 'border-stone-200 hover:border-stone-300'
              }`}>
                <input type="radio" {...register('selectedPackage')} value="exclusively_photo" className="sr-only" />
                <div className="flex items-center gap-3 mb-2">
                  <Camera className={`h-6 w-6 ${watchedValues.selectedPackage === 'exclusively_photo' ? 'text-stone-800' : 'text-stone-400'}`} />
                  <div>
                    <div className="font-semibold text-stone-800">Exclusively Photography</div>
                    <div className="text-xs text-stone-500">PHOTO ONLY • 8 hours • 2 Photographers</div>
                  </div>
                </div>
                <div className="text-2xl font-bold text-stone-800 mt-auto">$5,350</div>
                {watchedValues.selectedPackage === 'exclusively_photo' && <Check className="absolute top-3 right-3 h-5 w-5 text-stone-800" />}
              </label>
              
              {/* Package C */}
              <label className={`relative flex flex-col p-4 border-2 rounded cursor-pointer transition-all ${
                watchedValues.selectedPackage === 'package_c' ? 'border-stone-800 bg-stone-50' : 'border-stone-200 hover:border-stone-300'
              }`}>
                <input type="radio" {...register('selectedPackage')} value="package_c" className="sr-only" />
                <div className="flex items-center gap-3 mb-2">
                  <Video className={`h-6 w-6 ${watchedValues.selectedPackage === 'package_c' ? 'text-stone-800' : 'text-stone-400'}`} />
                  <div>
                    <div className="font-semibold text-stone-800">Package C</div>
                    <div className="text-xs text-stone-500">Photo + Video • 8 hours • 1+1</div>
                  </div>
                </div>
                <div className="text-2xl font-bold text-stone-800 mt-auto">$6,400</div>
                {watchedValues.selectedPackage === 'package_c' && <Check className="absolute top-3 right-3 h-5 w-5 text-stone-800" />}
              </label>
              
              {/* Package B */}
              <label className={`relative flex flex-col p-4 border-2 rounded cursor-pointer transition-all ${
                watchedValues.selectedPackage === 'package_b' ? 'border-stone-800 bg-stone-50' : 'border-stone-200 hover:border-stone-300'
              }`}>
                <input type="radio" {...register('selectedPackage')} value="package_b" className="sr-only" />
                <div className="flex items-center gap-3 mb-2">
                  <Video className={`h-6 w-6 ${watchedValues.selectedPackage === 'package_b' ? 'text-stone-800' : 'text-stone-400'}`} />
                  <div>
                    <div className="font-semibold text-stone-800">Package B</div>
                    <div className="text-xs text-stone-500">Photo + Video • 10 hours • 2+1</div>
                  </div>
                </div>
                <div className="text-2xl font-bold text-stone-800 mt-auto">$7,000</div>
                {watchedValues.selectedPackage === 'package_b' && <Check className="absolute top-3 right-3 h-5 w-5 text-stone-800" />}
              </label>
              
              {/* Package A */}
              <label className={`relative flex flex-col p-4 border-2 rounded cursor-pointer transition-all ${
                watchedValues.selectedPackage === 'package_a' ? 'border-stone-800 bg-stone-50' : 'border-stone-200 hover:border-stone-300'
              }`}>
                <input type="radio" {...register('selectedPackage')} value="package_a" className="sr-only" />
                <div className="flex items-center gap-3 mb-2">
                  <Video className={`h-6 w-6 ${watchedValues.selectedPackage === 'package_a' ? 'text-stone-800' : 'text-stone-400'}`} />
                  <div>
                    <div className="font-semibold text-stone-800">Package A</div>
                    <div className="text-xs text-stone-500">Photo + Video • 12 hours • 2+1</div>
                  </div>
                </div>
                <div className="text-2xl font-bold text-stone-800 mt-auto">$8,000</div>
                {watchedValues.selectedPackage === 'package_a' && <Check className="absolute top-3 right-3 h-5 w-5 text-stone-800" />}
              </label>
            </div>
            
            {/* Package Details */}
            {watchedValues.selectedPackage && (
              <div className="mt-4 p-4 bg-stone-50 rounded border border-stone-200">
                <h3 className="text-xs font-semibold text-stone-600 uppercase tracking-wide mb-2">
                  {PACKAGES[watchedValues.selectedPackage as keyof typeof PACKAGES]?.name} Includes:
                </h3>
                <div className="grid grid-cols-2 gap-1">
                  {PACKAGES[watchedValues.selectedPackage as keyof typeof PACKAGES]?.features.slice(0, 10).map((feature, i) => (
                    <div key={i} className="flex items-start gap-2 text-xs text-stone-600">
                      <Check className="h-3 w-3 text-emerald-500 mt-0.5 flex-shrink-0" />
                      <span>{feature}</span>
                    </div>
                  ))}
                </div>
                {(PACKAGES[watchedValues.selectedPackage as keyof typeof PACKAGES]?.features.length || 0) > 10 && (
                  <p className="text-xs text-stone-500 mt-2">
                    + {(PACKAGES[watchedValues.selectedPackage as keyof typeof PACKAGES]?.features.length || 0) - 10} more inclusions
                  </p>
                )}
              </div>
            )}
            
            {/* Extra Photographer Option */}
            <label className={`mt-4 flex items-center gap-3 p-4 border-2 rounded cursor-pointer transition-all ${
              watchedValues.extraPhotographer ? 'border-stone-800 bg-stone-50' : 'border-stone-200 hover:border-stone-300'
            }`}>
              <input type="checkbox" {...register('extraPhotographer')} className="sr-only" />
              <div className={`w-5 h-5 rounded border-2 flex items-center justify-center ${
                watchedValues.extraPhotographer ? 'border-stone-800 bg-stone-800' : 'border-stone-300'
              }`}>
                {watchedValues.extraPhotographer && <Check className="h-3 w-3 text-white" />}
              </div>
              <div className="flex-1">
                <span className="text-sm font-medium text-stone-800">Add Extra Photographer</span>
                <p className="text-xs text-stone-500">Additional coverage for larger weddings</p>
              </div>
              <span className="text-lg font-bold text-stone-800">+$500</span>
            </label>
            
            {/* Extra Hours */}
            <div className="mt-4 p-4 border-2 border-stone-200 rounded">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3">
                    <Clock className="h-5 w-5 text-stone-600" />
                    <div>
                      <span className="text-sm font-medium text-stone-800">Extra Hours</span>
                      <p className="text-xs text-stone-500">$350 per additional hour</p>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <select 
                    {...register('extraHours', { valueAsNumber: true })}
                    className="px-3 py-2 border border-stone-300 rounded text-sm bg-white focus:outline-none focus:border-stone-500"
                  >
                    <option value={0}>None</option>
                    <option value={0.5}>+30 min</option>
                    <option value={1}>+1 hour</option>
                    <option value={1.5}>+1.5 hours</option>
                    <option value={2}>+2 hours</option>
                    <option value={2.5}>+2.5 hours</option>
                    <option value={3}>+3 hours</option>
                    <option value={3.5}>+3.5 hours</option>
                    <option value={4}>+4 hours</option>
                    <option value={4.5}>+4.5 hours</option>
                    <option value={5}>+5 hours</option>
                    <option value={5.5}>+5.5 hours</option>
                    <option value={6}>+6 hours</option>
                  </select>
                  {(watchedValues.extraHours || 0) > 0 && (
                    <span className="text-lg font-bold text-stone-800">
                      +${((watchedValues.extraHours || 0) * 350).toLocaleString()}
                    </span>
                  )}
                </div>
              </div>
              {(watchedValues.extraHours || 0) > 0 && (
                <div className="mt-2 text-xs text-stone-500 text-right">
                  Total coverage: {(PACKAGES[watchedValues.selectedPackage as keyof typeof PACKAGES]?.hours || 8) + (watchedValues.extraHours || 0)} hours
                </div>
              )}
            </div>
          </div>

          {/* Engagement Location */}
          <div className="bg-white rounded border border-stone-200 p-6">
            <h2 className="text-sm font-semibold text-stone-800 uppercase tracking-wide mb-4 flex items-center gap-2">
              <MapPin className="h-4 w-4 text-emerald-500" />
              Engagement Session Location
            </h2>
            
            <div className="space-y-2">
              {/* Default: Mill Pond */}
              <label className={`flex items-center gap-3 p-3 border rounded cursor-pointer transition-all ${
                watchedValues.engagementLocation === 'mill_pond' ? 'border-stone-800 bg-stone-50' : 'border-stone-200 hover:border-stone-300'
              }`}>
                <input type="radio" {...register('engagementLocation')} value="mill_pond" className="sr-only" />
                <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${watchedValues.engagementLocation === 'mill_pond' ? 'border-stone-800' : 'border-stone-300'}`}>
                  {watchedValues.engagementLocation === 'mill_pond' && <div className="w-2 h-2 rounded-full bg-stone-800" />}
                </div>
                <div className="flex-1">
                  <span className="text-sm font-medium text-stone-800">Mill Pond Park, Richmond Hill</span>
                  <span className="text-xs text-stone-500 ml-2">Mon-Thurs 9am-3pm</span>
                </div>
                <span className="text-xs text-emerald-600 font-medium">Default</span>
              </label>
              
              <button type="button" onClick={() => setShowOtherLocations(!showOtherLocations)} className="flex items-center gap-2 text-sm text-stone-500 hover:text-stone-700 transition-colors py-2">
                <ChevronDown className={`h-4 w-4 transition-transform ${showOtherLocations ? 'rotate-180' : ''}`} />
                {showOtherLocations ? 'Hide other locations' : 'Show other locations'}
              </button>
              
              {showOtherLocations && (
                <div className="space-y-2 pl-4 border-l-2 border-stone-200">
                  {ENGAGEMENT_LOCATIONS.filter(loc => loc.value !== 'mill_pond').map(location => (
                    <label key={location.value} className={`flex items-center gap-3 p-3 border rounded cursor-pointer transition-all ${
                      watchedValues.engagementLocation === location.value ? 'border-stone-800 bg-stone-50' : 'border-stone-200 hover:border-stone-300'
                    }`}>
                      <input type="radio" {...register('engagementLocation')} value={location.value} className="sr-only" />
                      <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${watchedValues.engagementLocation === location.value ? 'border-stone-800' : 'border-stone-300'}`}>
                        {watchedValues.engagementLocation === location.value && <div className="w-2 h-2 rounded-full bg-stone-800" />}
                      </div>
                      <div className="flex-1">
                        <span className="text-sm font-medium text-stone-800">{location.label}</span>
                        {location.sublabel && <span className="text-xs text-stone-500 ml-2">{location.sublabel}</span>}
                      </div>
                      {location.value === 'brides_choice' && <span className="text-xs font-medium text-amber-600">+$200</span>}
                    </label>
                  ))}
                </div>
              )}

              {watchedValues.engagementLocation === 'brides_choice' && (
                <div className="mt-2">
                  <label className="text-xs font-medium text-stone-600 mb-1 block">Preferred Location</label>
                  <input
                    type="text"
                    {...register('bridesChoiceLocation')}
                    placeholder="Enter preferred location..."
                    className="w-full px-3 py-2 border border-stone-300 rounded text-sm focus:outline-none focus:border-stone-500"
                  />
                </div>
              )}
            </div>
          </div>

          {/* Work Included - Photo */}
          <div className="bg-white rounded border border-stone-200 p-6">
            <h2 className="text-sm font-semibold text-stone-800 uppercase tracking-wide mb-4 flex items-center gap-2">
              <Image className="h-4 w-4 text-rose-500" />
              Work Included — Photography
            </h2>
            <p className="text-xs text-stone-500 mb-4">Check off as you explain each inclusion to the couple</p>
            
            <div className="grid grid-cols-2 gap-3 mb-6">
              {[
                { key: 'engagementShoot', label: 'Engagement Photo Shoot', sublabel: '50 digital images watermarked' },
                { key: 'digitalImages', label: 'Wedding Photos on USB/Dropbox', sublabel: 'Ready to print, 300 DPI 4x6, no watermarks' },
                { key: 'postProduction', label: 'Post Production', sublabel: '10 minutes per enlarged image' },
                { key: 'dronePhoto', label: 'Drone Photography', sublabel: 'Aerial shots (weather permitting) — Included' },
              ].map(item => (
                <label key={item.key} className={`flex items-start gap-3 p-3 border rounded cursor-pointer transition-all ${
                  photoInclusions[item.key as keyof typeof photoInclusions] ? 'border-emerald-300 bg-emerald-50' : 'border-stone-200 hover:border-stone-300'
                }`}>
                  <input type="checkbox" checked={photoInclusions[item.key as keyof typeof photoInclusions]} onChange={(e) => setPhotoInclusions({...photoInclusions, [item.key]: e.target.checked})} className="sr-only" />
                  <div className={`w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 mt-0.5 ${
                    photoInclusions[item.key as keyof typeof photoInclusions] ? 'border-emerald-500 bg-emerald-500' : 'border-stone-300'
                  }`}>
                    {photoInclusions[item.key as keyof typeof photoInclusions] && <Check className="h-3 w-3 text-white" />}
                  </div>
                  <div>
                    <div className="text-sm font-medium text-stone-800">{item.label}</div>
                    <div className="text-xs text-stone-500">{item.sublabel}</div>
                  </div>
                </label>
              ))}
            </div>
            
            {/* Prints Section */}
            <div className="border-t border-stone-200 pt-4">
              <p className="text-xs text-stone-500 mb-3">
                *All weddings on USB/Dropbox, ready to print. 300 DPI 4x6, no watermarks
              </p>
              <h3 className="text-xs font-semibold text-stone-600 uppercase tracking-wide mb-3">
                Post Card style Thank You Cards & Prints
              </h3>
              <div className="grid grid-cols-3 gap-4 mb-4">
                {[
                  { size: '5x7', label: '5×7', price: 20 },
                  { size: '8x10', label: '8×10', price: 30 },
                  { size: '11x14', label: '11×14', price: 100 },
                  { size: '16x20', label: '16×20', price: 295 },
                  { size: '20x24', label: '20×24', price: 295 },
                  { size: '24x30', label: '24×30', price: 295 },
                ].map(item => (
                  <div key={item.size} className="flex items-center gap-2 p-2 border border-stone-200 rounded">
                    <div className="flex-1">
                      <span className="text-sm font-medium text-stone-800">{item.label}</span>
                      <span className="text-xs text-stone-500 ml-2">${item.price}</span>
                    </div>
                    <input
                      type="number"
                      min="0"
                      value={printOrders[item.size] || ''}
                      onChange={(e) => {
                        const val = e.target.value === '' ? 0 : parseInt(e.target.value)
                        setPrintOrders({...printOrders, [item.size]: val})
                      }}
                      placeholder="0"
                      className="w-16 px-2 py-1.5 border border-stone-300 rounded text-sm text-center focus:outline-none focus:border-stone-500"
                    />
                  </div>
                ))}
              </div>
              
              {/* Prints Total & Add Button */}
              {printsTotal > 0 && (
                <div className="flex items-center justify-between p-3 bg-stone-100 rounded border border-stone-200">
                  <div>
                    <span className="text-sm text-stone-600">Prints Total:</span>
                    <span className={`text-lg font-bold ml-2 ${printsIncluded === 'free' ? 'text-emerald-600 line-through' : 'text-stone-800'}`}>
                      ${printsTotal.toLocaleString()}
                    </span>
                    {printsIncluded === 'free' && (
                      <span className="text-lg font-bold text-emerald-600 ml-2">$0 (included)</span>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setPrintsIncluded(printsIncluded === 'paid' ? false : 'paid')}
                      className={`px-4 py-2 rounded text-sm font-medium transition-all ${
                        printsIncluded === 'paid'
                          ? 'bg-emerald-600 text-white' 
                          : 'bg-stone-800 text-white hover:bg-stone-900'
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
                          : 'bg-stone-600 text-white hover:bg-stone-700'
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
          {watchedValues.selectedPackage !== 'exclusively_photo' && (
            <div className="bg-white rounded border border-stone-200 p-6">
              <h2 className="text-sm font-semibold text-stone-800 uppercase tracking-wide mb-4 flex items-center gap-2">
                <Video className="h-4 w-4 text-indigo-500" />
                Work Included — Video
              </h2>
              <p className="text-xs text-stone-500 mb-4">Check off as you explain each inclusion to the couple</p>
              
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
                    videoInclusions[item.key as keyof typeof videoInclusions] ? 'border-emerald-300 bg-emerald-50' : 'border-stone-200 hover:border-stone-300'
                  }`}>
                    <input type="checkbox" checked={videoInclusions[item.key as keyof typeof videoInclusions]} onChange={(e) => setVideoInclusions({...videoInclusions, [item.key]: e.target.checked})} className="sr-only" />
                    <div className={`w-4 h-4 rounded border flex items-center justify-center flex-shrink-0 ${
                      videoInclusions[item.key as keyof typeof videoInclusions] ? 'border-emerald-500 bg-emerald-500' : 'border-stone-300'
                    }`}>
                      {videoInclusions[item.key as keyof typeof videoInclusions] && <Check className="h-2.5 w-2.5 text-white" />}
                    </div>
                    <span className="text-stone-700">{item.label}</span>
                  </label>
                ))}
              </div>
            </div>
          )}

          {/* Work Included - Web */}
          <div className="bg-white rounded border border-stone-200 p-6">
            <h2 className="text-sm font-semibold text-stone-800 uppercase tracking-wide mb-4 flex items-center gap-2">
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
                  webInclusions[item.key as keyof typeof webInclusions] ? 'border-emerald-300 bg-emerald-50' : 'border-stone-200 hover:border-stone-300'
                }`}>
                  <input type="checkbox" checked={webInclusions[item.key as keyof typeof webInclusions]} onChange={(e) => setWebInclusions({...webInclusions, [item.key]: e.target.checked})} className="sr-only" />
                  <div className={`w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 ${
                    webInclusions[item.key as keyof typeof webInclusions] ? 'border-emerald-500 bg-emerald-500' : 'border-stone-300'
                  }`}>
                    {webInclusions[item.key as keyof typeof webInclusions] && <Check className="h-3 w-3 text-white" />}
                  </div>
                  <span className="text-sm font-medium text-stone-800">{item.label}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Albums */}
          <div className="bg-white rounded border border-stone-200 p-6">
            <h2 className="text-sm font-semibold text-stone-800 uppercase tracking-wide mb-4 flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-amber-500" />
              Albums
            </h2>
            
            <div className="grid grid-cols-2 gap-8">
              {/* Couple Album - Left Side */}
              <div className="space-y-3">
                <div>
                  <h3 className="text-xs font-semibold text-stone-600 uppercase tracking-wide mb-1">Bride & Groom Album</h3>
                  <p className="text-xs text-stone-500">*Omakase style if purchased — $500 discount on layflat pro</p>
                </div>
                
                <div>
                  <label className="block text-xs text-stone-500 mb-1">Album Type</label>
                  <select {...register('albumType')} className="w-full px-3 py-2 border border-stone-300 rounded text-sm bg-white focus:outline-none focus:border-stone-500">
                    <option value="none">No Album</option>
                    <option value="standard">Standard Album</option>
                    <option value="premium">Premium Album</option>
                  </select>
                </div>
                
                {watchedValues.albumType !== 'none' && (
                  <>
                    <div>
                      <label className="block text-xs text-stone-500 mb-1">Album Size</label>
                      <select {...register('albumSize')} className="w-full px-3 py-2 border border-stone-300 rounded text-sm bg-white focus:outline-none focus:border-stone-500">
                        <option value="10x8">10" × 8" (Standard)</option>
                        <option value="14x11">14" × 11" (Large)</option>
                      </select>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs text-stone-500 mb-1"># of Spreads</label>
                        <input type="number" {...register('albumSpreads', { valueAsNumber: true })} placeholder="15" className="w-full px-3 py-2 border border-stone-300 rounded text-sm focus:outline-none focus:border-stone-500" />
                      </div>
                      <div>
                        <label className="block text-xs text-stone-500 mb-1">Cover</label>
                        <select {...register('albumCover')} className="w-full px-3 py-2 border border-stone-300 rounded text-sm bg-white focus:outline-none focus:border-stone-500">
                          <option value="black_leather">Black Leather</option>
                          <option value="white_leather">White Leather</option>
                          <option value="brown_leather">Brown Leather</option>
                          <option value="linen">Linen</option>
                          <option value="photo_cover">Photo Cover</option>
                        </select>
                      </div>
                    </div>
                    
                    <label className={`flex items-center gap-3 p-3 border rounded cursor-pointer transition-all ${
                      watchedValues.acrylicCover ? 'border-stone-800 bg-stone-50' : 'border-stone-200 hover:border-stone-300'
                    }`}>
                      <input type="checkbox" {...register('acrylicCover')} className="sr-only" />
                      <div className={`w-5 h-5 rounded border-2 flex items-center justify-center ${
                        watchedValues.acrylicCover ? 'border-stone-800 bg-stone-800' : 'border-stone-300'
                      }`}>
                        {watchedValues.acrylicCover && <Check className="h-3 w-3 text-white" />}
                      </div>
                      <div className="flex-1">
                        <span className="text-sm font-medium text-stone-800">Acrylic Cover</span>
                        <p className="text-xs text-stone-500">Crystal-clear cover with favorite photo</p>
                      </div>
                      <span className="text-sm font-semibold text-stone-800">+$200</span>
                    </label>
                  </>
                )}
              </div>
              
              {/* Parent Albums - Right Side */}
              <div className="space-y-3">
                <div>
                  <h3 className="text-xs font-semibold text-stone-600 uppercase tracking-wide mb-1">Parent Albums</h3>
                  <p className="text-xs text-stone-500">10"×8" • 6 spreads • 30 photos • Linen cover — $295 each</p>
                </div>
                
                <div>
                  <label className="block text-xs text-stone-500 mb-1">Quantity</label>
                  <select {...register('parentAlbumQty', { valueAsNumber: true })} className="w-full px-3 py-2 border border-stone-300 rounded text-sm bg-white focus:outline-none focus:border-stone-500">
                    <option value={0}>None</option>
                    <option value={1}>1 Album</option>
                    <option value={2}>2 Albums</option>
                    <option value={3}>3 Albums</option>
                    <option value={4}>4 Albums</option>
                  </select>
                </div>
                
                {/* Add/Include buttons for parent albums */}
                {(watchedValues.parentAlbumQty || 0) > 0 && (
                  <div className="flex items-center justify-between p-3 bg-stone-100 rounded border border-stone-200">
                    <div>
                      <span className="text-sm text-stone-600">Total:</span>
                      <span className={`text-lg font-bold ml-2 ${parentAlbumsIncluded === 'free' ? 'text-emerald-600 line-through' : 'text-stone-800'}`}>
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
                            : 'bg-stone-800 text-white hover:bg-stone-900'
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
                            : 'bg-stone-600 text-white hover:bg-stone-700'
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
          <div className="bg-white rounded border border-stone-200 p-6">
            <h2 className="text-sm font-semibold text-stone-800 uppercase tracking-wide mb-4">Notes</h2>
            <textarea {...register('notes')} rows={3} placeholder="Special requests, vision for the day, additional details..." className="w-full px-3 py-2 border border-stone-300 rounded text-sm focus:outline-none focus:border-stone-500 resize-none" />
          </div>

          {/* Pricing Summary */}
          <div className="bg-stone-800 text-white rounded p-6">
            <h2 className="text-sm font-semibold uppercase tracking-wide mb-4 flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-emerald-400" />
              Pricing Summary
            </h2>
            
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-stone-400">
                  {PACKAGES[watchedValues.selectedPackage as keyof typeof PACKAGES]?.name} ({PACKAGES[watchedValues.selectedPackage as keyof typeof PACKAGES]?.hours}hr)
                </span>
                <span>${pricing.basePrice.toLocaleString()}</span>
              </div>
              
              {pricing.extraPhotographerPrice > 0 && (
                <div className="flex justify-between">
                  <span className="text-stone-400">Extra Photographer</span>
                  <span>${pricing.extraPhotographerPrice.toLocaleString()}</span>
                </div>
              )}
              
              {pricing.extraHoursPrice > 0 && (
                <div className="flex justify-between">
                  <span className="text-stone-400">Extra Hours ({watchedValues.extraHours})</span>
                  <span>${pricing.extraHoursPrice.toLocaleString()}</span>
                </div>
              )}
              
              {pricing.albumPrice > 0 && (
                <div className="flex justify-between">
                  <span className="text-stone-400">Wedding Album ({watchedValues.albumSize === '10x8' ? '10"×8"' : '14"×11"'} {watchedValues.albumType})</span>
                  <span>${pricing.albumPrice.toLocaleString()}</span>
                </div>
              )}
              
              {pricing.acrylicCoverPrice > 0 && (
                <div className="flex justify-between">
                  <span className="text-stone-400">Acrylic Cover</span>
                  <span>${pricing.acrylicCoverPrice.toLocaleString()}</span>
                </div>
              )}
              
              {pricing.parentAlbumsPrice > 0 && (
                <div className="flex justify-between">
                  <span className="text-stone-400">Parent Albums ({watchedValues.parentAlbumQty})</span>
                  <span>${pricing.parentAlbumsPrice.toLocaleString()}</span>
                </div>
              )}
              
              {parentAlbumsIncluded === 'free' && (watchedValues.parentAlbumQty || 0) > 0 && (
                <div className="flex justify-between">
                  <span className="text-stone-400">Parent Albums ({watchedValues.parentAlbumQty}) (included)</span>
                  <span className="text-emerald-400">$0</span>
                </div>
              )}
              
              {pricing.locationFee > 0 && (
                <div className="flex justify-between">
                  <span className="text-stone-400">Bride's Choice Location</span>
                  <span>${pricing.locationFee.toLocaleString()}</span>
                </div>
              )}
              
              {pricing.printsPrice > 0 && (
                <div className="flex justify-between">
                  <span className="text-stone-400">Prints & Thank You Cards</span>
                  <span>${pricing.printsPrice.toLocaleString()}</span>
                </div>
              )}
              
              {printsIncluded === 'free' && printsTotal > 0 && (
                <div className="flex justify-between">
                  <span className="text-stone-400">Prints & Thank You Cards (included)</span>
                  <span className="text-emerald-400">$0</span>
                </div>
              )}
              
              <div className="border-t border-stone-600 pt-3 mt-3">
                <div className="flex justify-between">
                  <span>Subtotal</span>
                  <span>${(pricing.basePrice + pricing.extraPhotographerPrice + pricing.extraHoursPrice + pricing.albumPrice + pricing.acrylicCoverPrice + pricing.parentAlbumsPrice + pricing.locationFee + pricing.printsPrice).toLocaleString()}</span>
                </div>
                
                {/* Discount Controls - inside pricing summary */}
                <div className="flex justify-between items-center mt-2 py-2 border-y border-stone-600">
                  <div className="flex items-center gap-2">
                    <span className="text-stone-400">Discount 1</span>
                    <select 
                      {...register('discountType')}
                      onChange={(e) => {
                        const value = e.target.value
                        setValue('discountType', value as any)
                        // Prefill 50% when % is selected
                        if (value === 'percent') {
                          setValue('discountAmount', 50)
                        }
                      }}
                      className="px-2 py-1 text-xs bg-stone-700 border border-stone-600 rounded text-white focus:outline-none"
                    >
                      <option value="none">—</option>
                      <option value="percent">%</option>
                      <option value="flat">$</option>
                    </select>
                    {watchedValues.discountType !== 'none' && (
                      <input
                        type="number"
                        {...register('discountAmount', { valueAsNumber: true })}
                        placeholder={watchedValues.discountType === 'percent' ? '10' : '500'}
                        className="w-20 px-2 py-1 text-xs bg-white border border-stone-400 rounded text-stone-900 focus:outline-none"
                      />
                    )}
                  </div>
                  <span className={watchedValues.discountAmount && watchedValues.discountType !== 'none' ? 'text-emerald-400' : 'text-stone-500'}>
                    {watchedValues.discountAmount && watchedValues.discountType !== 'none' 
                      ? watchedValues.discountType === 'percent' 
                        ? `-${watchedValues.discountAmount}%`
                        : `-$${watchedValues.discountAmount.toLocaleString()}`
                      : '$0'}
                  </span>
                </div>
                
                {/* Discount 2 - Always flat $ */}
                <div className="flex justify-between items-center py-2 border-b border-stone-600">
                  <div className="flex items-center gap-2">
                    <span className="text-stone-400">Discount 2</span>
                    <span className="text-stone-500 text-xs">$</span>
                    <input
                      type="number"
                      {...register('discount2Amount', { valueAsNumber: true })}
                      placeholder="0"
                      className="w-20 px-2 py-1 text-xs bg-white border border-stone-400 rounded text-stone-900 focus:outline-none"
                    />
                  </div>
                  <span className={(watchedValues.discount2Amount || 0) > 0 ? 'text-emerald-400' : 'text-stone-500'}>
                    {(watchedValues.discount2Amount || 0) > 0 ? `-$${watchedValues.discount2Amount?.toLocaleString()}` : '$0'}
                  </span>
                </div>
                
                <div className="flex justify-between text-stone-400 mt-2">
                  <span>HST (13%)</span>
                  <span>${pricing.hst.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                </div>
                <div className="flex justify-between text-xl font-bold mt-2 pt-2 border-t border-stone-600">
                  <span>Total</span>
                  <span className="text-emerald-400">${pricing.total.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Installment Schedule */}
          <div className="bg-white rounded border border-stone-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-semibold text-stone-800 uppercase tracking-wide">Installment Schedule</h2>
              <div className="flex gap-2">
                <button type="button" onClick={() => switchSchedule('spring')} className={`px-3 py-1 text-xs rounded transition-all ${installmentSchedule === 'spring' ? 'bg-stone-800 text-white' : 'bg-stone-100 text-stone-600 hover:bg-stone-200'}`}>
                  Spring/Summer
                </button>
                <button type="button" onClick={() => switchSchedule('fall')} className={`px-3 py-1 text-xs rounded transition-all ${installmentSchedule === 'fall' ? 'bg-stone-800 text-white' : 'bg-stone-100 text-stone-600 hover:bg-stone-200'}`}>
                  Fall/Winter
                </button>
              </div>
            </div>
            
            <div className="space-y-2">
              {installments.map((inst, index) => (
                <div key={index} className="flex items-center gap-3">
                  <span className="text-xs text-stone-500 w-6">{index + 1}.</span>
                  <input type="text" value={inst.label} onChange={(e) => updateInstallment(index, 'label', e.target.value)} className="flex-1 px-3 py-2 border border-stone-300 rounded text-sm focus:outline-none focus:border-stone-500" />
                  <div className="flex items-center border border-stone-300 rounded">
                    <span className="px-2 py-2 bg-stone-100 text-stone-500 text-sm border-r border-stone-300">$</span>
                    <input type="number" value={inst.amount || ''} onChange={(e) => updateInstallment(index, 'amount', parseFloat(e.target.value) || 0)} placeholder="0.00" step="0.01" className="w-28 px-2 py-2 text-sm focus:outline-none rounded-r" />
                  </div>
                  <div className="flex flex-col">
                    <button 
                      type="button" 
                      onClick={() => moveInstallment(index, 'up')}
                      disabled={index === 0}
                      className="p-0.5 text-stone-400 hover:text-stone-600 disabled:opacity-30"
                    >
                      <ChevronUp className="h-3 w-3" />
                    </button>
                    <button 
                      type="button" 
                      onClick={() => moveInstallment(index, 'down')}
                      disabled={index === installments.length - 1}
                      className="p-0.5 text-stone-400 hover:text-stone-600 disabled:opacity-30"
                    >
                      <ChevronDown className="h-3 w-3" />
                    </button>
                  </div>
                  <button type="button" onClick={() => removeInstallment(index)} className="p-2 text-stone-400 hover:text-red-500 transition-colors" disabled={installments.length <= 1}>
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
            
            <div className="flex items-center justify-between mt-4 pt-4 border-t border-stone-200">
              <div className="flex gap-2">
                <button type="button" onClick={addInstallment} className="flex items-center gap-1 text-sm text-stone-600 hover:text-stone-800 transition-colors">
                  <Plus className="h-4 w-4" />
                  Add Installment
                </button>
                <button type="button" onClick={redistributeInstallments} className="flex items-center gap-1 text-sm text-stone-500 hover:text-stone-700 transition-colors ml-4">
                  Redistribute Evenly
                </button>
              </div>
              
              <div className="text-right">
                <div className="text-xs text-stone-500">Installments Total</div>
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

          {/* Action Buttons */}
          <div className="flex gap-4">
            <button type="submit" disabled={isLoading} className="flex-1 bg-stone-800 text-white hover:bg-stone-900 px-6 py-3 rounded font-medium flex items-center justify-center gap-2 transition-colors disabled:opacity-50">
              <Save className="h-4 w-4" />
              {isLoading ? 'Saving...' : 'Save Quote'}
            </button>
            <button 
              type="button" 
              onClick={() => window.print()}
              className="flex-1 bg-stone-100 text-stone-800 hover:bg-stone-200 px-6 py-3 rounded font-medium flex items-center justify-center gap-2 transition-colors"
            >
              <FileText className="h-4 w-4" />
              Print / Save PDF
            </button>
            <button 
              type="button" 
              onClick={() => setShowEmailModal(true)}
              className="flex-1 bg-emerald-600 text-white hover:bg-emerald-700 px-6 py-3 rounded font-medium flex items-center justify-center gap-2 transition-colors"
            >
              <Send className="h-4 w-4" />
              Email Template
            </button>
          </div>
          
          {/* Booking Instructions */}
          <div className="bg-white rounded border border-stone-200 p-8 text-center">
            <img 
              src="/images/sigslogo.png" 
              alt="SIGS Photography" 
              className="h-24 w-auto object-contain mx-auto mb-4"
            />
            <p className="text-stone-600 text-sm leading-relaxed max-w-2xl mx-auto">
              We like to keep things easy and pressure-free. If you're ready to move forward, just shoot a text to Marianna at <span className="font-semibold">416-831-8942</span> to let her know. We'll do a quick happy dance on this end, then send a DocuSign agreement your way. Once you've reviewed and signed, the system will automatically email you a PDF copy for your records. You can send the e-transfer to <span className="font-semibold">info@sigsphoto.ca</span> to get everything finalized!
            </p>
          </div>
        </form>
        
        {/* Email Template Modal */}
        {showEmailModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <div className="p-6 border-b border-stone-200">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-stone-800">Email Template</h3>
                  <button 
                    onClick={() => setShowEmailModal(false)}
                    className="p-1 text-stone-400 hover:text-stone-600"
                  >
                    <span className="text-2xl">&times;</span>
                  </button>
                </div>
              </div>
              
              <div className="p-6 space-y-4">
                <div>
                  <label className="block text-xs font-medium text-stone-500 uppercase tracking-wide mb-1">Subject</label>
                  <input 
                    type="text" 
                    readOnly
                    value="Thank You for Your Time – Wedding Photography Proposal"
                    className="w-full px-3 py-2 border border-stone-300 rounded text-sm bg-stone-50"
                  />
                </div>
                
                <div>
                  <label className="block text-xs font-medium text-stone-500 uppercase tracking-wide mb-1">Email Body</label>
                  <textarea 
                    readOnly
                    rows={18}
                    value={`Dear ${watchedValues.brideFirstName || '[Bride]'} and ${watchedValues.groomFirstName || '[Groom]'},

Thank you so much for spending time with me on Zoom today! It was a pleasure discussing your wedding plans and how SIGS Photography can capture your special day. I've attached the PDF with the quote we talked about, including details on how we can create beautiful memories together.

If you have any questions or need further information, feel free to contact Marianna Kogan at 416-831-8942. We're both here to help make your wedding experience seamless and unforgettable.

Looking forward to hearing from you!

Warm regards,

Jean Marcotte
Principal Photographer
SIGS Photography Ltd.
Among the Finest Weddings in the World
265 Rimrock Rd, Unit 2A, Toronto, ON M3J 3A6
416-831-8942`}
                    className="w-full px-3 py-2 border border-stone-300 rounded text-sm bg-stone-50 font-mono text-xs"
                  />
                </div>
                
                <div className="flex gap-3 pt-4">
                  <button
                    type="button"
                    onClick={() => {
                      const subject = encodeURIComponent("Thank You for Your Time – Wedding Photography Proposal")
                      const body = encodeURIComponent(`Dear ${watchedValues.brideFirstName || '[Bride]'} and ${watchedValues.groomFirstName || '[Groom]'},

Thank you so much for spending time with me on Zoom today! It was a pleasure discussing your wedding plans and how SIGS Photography can capture your special day. I've attached the PDF with the quote we talked about, including details on how we can create beautiful memories together.

If you have any questions or need further information, feel free to contact Marianna Kogan at 416-831-8942. We're both here to help make your wedding experience seamless and unforgettable.

Looking forward to hearing from you!

Warm regards,

Jean Marcotte
Principal Photographer
SIGS Photography Ltd.
Among the Finest Weddings in the World
265 Rimrock Rd, Unit 2A, Toronto, ON M3J 3A6
416-831-8942`)
                      const email = watchedValues.brideEmail || watchedValues.groomEmail || ''
                      window.open(`mailto:${email}?subject=${subject}&body=${body}`, '_blank')
                    }}
                    className="flex-1 bg-emerald-600 text-white hover:bg-emerald-700 px-4 py-2 rounded font-medium flex items-center justify-center gap-2"
                  >
                    <Send className="h-4 w-4" />
                    Open in Mail App
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const text = `Dear ${watchedValues.brideFirstName || '[Bride]'} and ${watchedValues.groomFirstName || '[Groom]'},

Thank you so much for spending time with me on Zoom today! It was a pleasure discussing your wedding plans and how SIGS Photography can capture your special day. I've attached the PDF with the quote we talked about, including details on how we can create beautiful memories together.

If you have any questions or need further information, feel free to contact Marianna Kogan at 416-831-8942. We're both here to help make your wedding experience seamless and unforgettable.

Looking forward to hearing from you!

Warm regards,

Jean Marcotte
Principal Photographer
SIGS Photography Ltd.
Among the Finest Weddings in the World
265 Rimrock Rd, Unit 2A, Toronto, ON M3J 3A6
416-831-8942`
                      navigator.clipboard.writeText(text)
                      alert('Email body copied to clipboard!')
                    }}
                    className="flex-1 bg-stone-100 text-stone-800 hover:bg-stone-200 px-4 py-2 rounded font-medium"
                  >
                    Copy to Clipboard
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </Layout>
  )
}
