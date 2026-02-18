'use client'

import React, { useState, useMemo } from 'react'
import { Layout } from '@/components/layout/layout'
import { studioflowClientConfig } from '@/config/sidebar'
import { 
  Calendar, DollarSign, FileText, Save, Send, 
  Check, Image, Frame, Printer,
  Youtube, ExternalLink
} from 'lucide-react'

// ============================================================
// SIGS PHOTOGRAPHY - FRAMES & ALBUMS QUOTE
// Engagement Photo Presentation Sales Tool
// ============================================================

// Pricing Configuration
const PRICING = {
  // Collage Options
  collageA: {
    name: 'Collage A',
    price: 1500,
  },
  collageB: {
    name: 'Collage B - Big Michelle Frame',
    price: 1750,
  },
  collageC: {
    name: 'Collage C - Small Michelle Frame',
    price: 1200,
  },
  single16x16: {
    name: 'Single 16x16 Canvas',
    price: 500,
  },
  
  // Wedding Frame Options
  frameA: {
    name: 'Wedding Frame A',
    price: 200,
  },
  frameB: {
    name: 'Wedding Frame B',
    price: 250,
  },
  frameC: {
    name: 'Wedding Frame C',
    price: 300,
  },
  
  // Albums
  albumStandard: {
    name: 'Standard Album',
    price: 1250, // After $500 print credit
    fullPrice: 1750,
  },
  albumPremium: {
    name: 'Premium Album',
    price: 1750, // After $500 print credit
    fullPrice: 2250,
  },
  parentAlbum: {
    name: 'Parent Album',
    price: 295,
  },
  
  // Extras
  engProofs: {
    name: 'Engagement Proofs',
    price: 250,
  },
  hiResFiles: {
    name: 'High-Resolution Digital Files',
    price: 0,
    retailPrice: 2250,
  },
}

const SIGS_DISCOUNT_PERCENT = 25

export default function FramesAlbumsQuotePage() {
  // ============================================================
  // STATE - Pre-appointment Data
  // ============================================================
  const [coupleName, setCoupleName] = useState('')
  const [weddingDate, setWeddingDate] = useState('')
  const [youtubeLink, setYoutubeLink] = useState('')
  
  // Contract Balance Info
  const [contractAmount, setContractAmount] = useState('')
  const [paymentsReceived, setPaymentsReceived] = useState('')
  const [balanceRemaining, setBalanceRemaining] = useState('')
  const [paymentHistory, setPaymentHistory] = useState('')
  
  // ============================================================
  // STATE - Product Selections
  // ============================================================
  
  // Collage selection: 'none' | 'A' | 'B' | 'C' | 'single'
  const [collageType, setCollageType] = useState<'none' | 'A' | 'B' | 'C' | 'single'>('A')
  
  // 5x5 Photos toggle (free with $500+ purchase)
  const [include5x5, setInclude5x5] = useState(true)
  
  // Albums
  const [albumType, setAlbumType] = useState<'none' | 'standard' | 'premium'>('standard')
  const [parentAlbumQty, setParentAlbumQty] = useState(0)
  
  // Wedding Frame: 'none' | 'A' | 'B' | 'C'
  const [frameType, setFrameType] = useState<'none' | 'A' | 'B' | 'C'>('A')
  
  // Extras
  const [includeEngProofs, setIncludeEngProofs] = useState(true)
  const [includeHiRes, setIncludeHiRes] = useState(true)
  
  // Custom items text
  const [customItems, setCustomItems] = useState('')
  
  // Collage photo notes
  const [collagePhotos, setCollagePhotos] = useState({
    leftProof: '',
    leftNotes: '',
    centerProof: '',
    centerNotes: '',
    rightProof: '',
    rightNotes: ''
  })
  
  // ============================================================
  // PRICING CALCULATIONS
  // ============================================================
  const calculations = useMemo(() => {
    let subtotal = 0
    
    // Collage
    if (collageType === 'A') subtotal += PRICING.collageA.price
    if (collageType === 'B') subtotal += PRICING.collageB.price
    if (collageType === 'C') subtotal += PRICING.collageC.price
    if (collageType === 'single') subtotal += PRICING.single16x16.price
    
    // Albums
    if (albumType === 'standard') subtotal += PRICING.albumStandard.price
    if (albumType === 'premium') subtotal += PRICING.albumPremium.price
    subtotal += parentAlbumQty * PRICING.parentAlbum.price
    
    // Wedding Frame
    if (frameType === 'A') subtotal += PRICING.frameA.price
    if (frameType === 'B') subtotal += PRICING.frameB.price
    if (frameType === 'C') subtotal += PRICING.frameC.price
    
    // Extras
    if (includeEngProofs) subtotal += PRICING.engProofs.price
    if (includeHiRes) subtotal += PRICING.hiResFiles.price
    
    const tax = subtotal * 0.13
    const subtotalWithTax = subtotal + tax
    const discount = subtotalWithTax * (SIGS_DISCOUNT_PERCENT / 100)
    const total = subtotalWithTax - discount
    
    // Check if 5x5 photos qualify (need $500+ purchase)
    const qualifiesFor5x5 = subtotal >= 500
    
    return {
      subtotal,
      tax,
      subtotalWithTax,
      discount,
      total,
      qualifiesFor5x5
    }
  }, [collageType, albumType, parentAlbumQty, frameType, includeEngProofs, includeHiRes])

  return (
    <Layout sidebarConfig={studioflowClientConfig}>
      {/* Dark Banner - Frames & Albums */}
      <div className="bg-zinc-900 text-white -mx-6 -mt-6 px-6 py-4 mb-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-white/10 rounded flex items-center justify-center">
              <Frame className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl font-semibold">
                {coupleName ? `${coupleName} — Frames & Albums` : 'Frames & Albums'}
              </h1>
              <p className="text-zinc-400 text-sm">
                {weddingDate ? weddingDate : 'Engagement Photo Presentation'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-6">
            {youtubeLink && (
              <a 
                href={youtubeLink} 
                target="_blank" 
                rel="noopener noreferrer"
                className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 rounded-lg transition-colors"
              >
                <Youtube className="w-5 h-5" />
                <span className="font-medium">Play Slideshow</span>
                <ExternalLink className="w-4 h-4" />
              </a>
            )}
            <div className="text-right">
              <div className="text-sm text-zinc-400">E-Transfer</div>
              <div className="font-medium">info@sigsphoto.ca</div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto space-y-6">

        {/* ============================================================ */}
        {/* COLLAGE OPTIONS */}
        {/* ============================================================ */}
        <div className="bg-white border rounded-lg overflow-hidden">
          <div className="bg-zinc-900 text-white px-6 py-4">
            <h2 className="text-xl font-semibold">Collage</h2>
          </div>
          
          <div className="p-6 space-y-4">
            {/* Collage A */}
            <div 
              onClick={() => setCollageType('A')}
              className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${
                collageType === 'A' ? 'border-green-500 bg-green-50' : 'border-zinc-200 hover:border-zinc-300'
              }`}
            >
              <div className="flex justify-between items-start mb-2">
                <h3 className="font-bold">Collage A — ${PRICING.collageA.price.toLocaleString()}</h3>
                {collageType === 'A' && <Check className="w-5 h-5 text-green-600" />}
              </div>
              <ul className="space-y-1 text-sm ml-4">
                <li className="flex items-start gap-2">
                  <span className="text-zinc-400 mt-0.5">●</span>
                  <span>3 16x16 custom-edited prints with editing</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-zinc-400 mt-0.5">●</span>
                  <span>All 3 mounted on canvas stretcher</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-zinc-400 mt-0.5">●</span>
                  <span>All 3 framed with black float-frame</span>
                </li>
              </ul>
            </div>

            {/* Collage B */}
            <div 
              onClick={() => setCollageType('B')}
              className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${
                collageType === 'B' ? 'border-green-500 bg-green-50' : 'border-zinc-200 hover:border-zinc-300'
              }`}
            >
              <div className="flex justify-between items-start mb-2">
                <h3 className="font-bold">Collage B — Big Michelle Frame — ${PRICING.collageB.price.toLocaleString()}</h3>
                {collageType === 'B' && <Check className="w-5 h-5 text-green-600" />}
              </div>
              <ul className="space-y-1 text-sm ml-4">
                <li className="flex items-start gap-2">
                  <span className="text-zinc-400 mt-0.5">●</span>
                  <span>Big Michelle Frame 50x18</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-zinc-400 mt-0.5">●</span>
                  <span>3 14x14 edited matt portraits</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-zinc-400 mt-0.5">●</span>
                  <span>3 14x14 photos mounted on masonite with UV spray protection</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-zinc-400 mt-0.5">●</span>
                  <span>1 acid-free cut for 3 photos with ⅛" allowance</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-zinc-400 mt-0.5">●</span>
                  <span>1 low glare glass cut to fit 50x18</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-zinc-400 mt-0.5">●</span>
                  <span>Assembly including D rings and wire</span>
                </li>
              </ul>
            </div>

            {/* Collage C */}
            <div 
              onClick={() => setCollageType('C')}
              className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${
                collageType === 'C' ? 'border-green-500 bg-green-50' : 'border-zinc-200 hover:border-zinc-300'
              }`}
            >
              <div className="flex justify-between items-start mb-2">
                <h3 className="font-bold">Collage C — Small Michelle Frame — ${PRICING.collageC.price.toLocaleString()}</h3>
                {collageType === 'C' && <Check className="w-5 h-5 text-green-600" />}
              </div>
              <ul className="space-y-1 text-sm ml-4">
                <li className="flex items-start gap-2">
                  <span className="text-zinc-400 mt-0.5">●</span>
                  <span>3 10x10 custom-edited prints with editing</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-zinc-400 mt-0.5">●</span>
                  <span>Small Michelle Frame 38x14</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-zinc-400 mt-0.5">●</span>
                  <span>3 10x10 photos mounted on masonite with UV spray protection</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-zinc-400 mt-0.5">●</span>
                  <span>1 acid-free cut for 3 photos with ⅛" allowance</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-zinc-400 mt-0.5">●</span>
                  <span>1 low glare glass cut to fit 38x14</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-zinc-400 mt-0.5">●</span>
                  <span>Assembly including D rings and wire</span>
                </li>
              </ul>
            </div>

            {/* Single 16x16 */}
            <div 
              onClick={() => setCollageType('single')}
              className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${
                collageType === 'single' ? 'border-green-500 bg-green-50' : 'border-zinc-200 hover:border-zinc-300'
              }`}
            >
              <div className="flex justify-between items-start mb-2">
                <h3 className="font-bold">Single 16x16 — ${PRICING.single16x16.price.toLocaleString()}</h3>
                {collageType === 'single' && <Check className="w-5 h-5 text-green-600" />}
              </div>
              <ul className="space-y-1 text-sm ml-4">
                <li className="flex items-start gap-2">
                  <span className="text-zinc-400 mt-0.5">●</span>
                  <span>1 16x16 custom-edited print</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-zinc-400 mt-0.5">●</span>
                  <span>Mounted on canvas stretcher</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-zinc-400 mt-0.5">●</span>
                  <span>Black float-frame</span>
                </li>
              </ul>
            </div>

            {/* No Collage */}
            <div 
              onClick={() => setCollageType('none')}
              className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${
                collageType === 'none' ? 'border-zinc-500 bg-zinc-100' : 'border-zinc-200 hover:border-zinc-300'
              }`}
            >
              <div className="flex justify-between items-start">
                <h3 className="font-medium text-zinc-500">No Collage</h3>
                {collageType === 'none' && <Check className="w-5 h-5 text-zinc-500" />}
              </div>
            </div>

            {/* 5x5 Photos Toggle */}
            {calculations.qualifiesFor5x5 && (
              <div 
                onClick={() => setInclude5x5(!include5x5)}
                className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${
                  include5x5 ? 'border-green-500 bg-green-50' : 'border-zinc-200'
                }`}
              >
                <div className="flex justify-between items-center">
                  <div>
                    <h3 className="font-semibold">50 5x5 Engagement Photos</h3>
                    <p className="text-sm text-green-600">FREE with your purchase!</p>
                  </div>
                  <div className={`w-6 h-6 rounded flex items-center justify-center ${
                    include5x5 ? 'bg-green-500 text-white' : 'bg-zinc-200'
                  }`}>
                    {include5x5 && <Check className="w-4 h-4" />}
                  </div>
                </div>
              </div>
            )}

            {/* Collage Photo Selection */}
            {collageType !== 'none' && (
              <div className="border-t pt-6 mt-6">
                <h3 className="font-bold text-lg mb-4">Photo Selection</h3>
                
                {/* LEFT PHOTO */}
                <div className="mb-6">
                  <div className="flex items-center gap-4 mb-2">
                    <label className="font-semibold text-base">Left Photo</label>
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-muted-foreground">Proof #</span>
                      <input
                        type="text"
                        value={collagePhotos.leftProof}
                        onChange={(e) => setCollagePhotos(prev => ({ ...prev, leftProof: e.target.value }))}
                        placeholder="23"
                        className="w-20 px-3 py-2 text-lg font-semibold border rounded-lg text-center"
                      />
                    </div>
                  </div>
                  <textarea
                    value={collagePhotos.leftNotes}
                    onChange={(e) => setCollagePhotos(prev => ({ ...prev, leftNotes: e.target.value }))}
                    placeholder="Editing notes..."
                    rows={5}
                    className="w-full px-3 py-2 border rounded-lg text-sm"
                  />
                </div>

                {/* CENTER PHOTO */}
                <div className="mb-6">
                  <div className="flex items-center gap-4 mb-2">
                    <label className="font-semibold text-base">Center Photo</label>
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-muted-foreground">Proof #</span>
                      <input
                        type="text"
                        value={collagePhotos.centerProof}
                        onChange={(e) => setCollagePhotos(prev => ({ ...prev, centerProof: e.target.value }))}
                        placeholder="36"
                        className="w-20 px-3 py-2 text-lg font-semibold border rounded-lg text-center"
                      />
                    </div>
                  </div>
                  <textarea
                    value={collagePhotos.centerNotes}
                    onChange={(e) => setCollagePhotos(prev => ({ ...prev, centerNotes: e.target.value }))}
                    placeholder="Editing notes..."
                    rows={5}
                    className="w-full px-3 py-2 border rounded-lg text-sm"
                  />
                </div>

                {/* RIGHT PHOTO - only show for collages with 3 photos */}
                {(collageType === 'A' || collageType === 'B' || collageType === 'C') && (
                  <div className="mb-2">
                    <div className="flex items-center gap-4 mb-2">
                      <label className="font-semibold text-base">Right Photo</label>
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-muted-foreground">Proof #</span>
                        <input
                          type="text"
                          value={collagePhotos.rightProof}
                          onChange={(e) => setCollagePhotos(prev => ({ ...prev, rightProof: e.target.value }))}
                          placeholder="28"
                          className="w-20 px-3 py-2 text-lg font-semibold border rounded-lg text-center"
                        />
                      </div>
                    </div>
                    <textarea
                      value={collagePhotos.rightNotes}
                      onChange={(e) => setCollagePhotos(prev => ({ ...prev, rightNotes: e.target.value }))}
                      placeholder="Editing notes..."
                      rows={5}
                      className="w-full px-3 py-2 border rounded-lg text-sm"
                    />
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* ============================================================ */}
        {/* ALBUMS */}
        {/* ============================================================ */}
        <div className="bg-white border rounded-lg overflow-hidden">
          <div className="bg-zinc-900 text-white px-6 py-4">
            <h2 className="text-xl font-semibold">Albums</h2>
          </div>
          
          <div className="p-6 space-y-6">
            {/* Bride & Groom Album */}
            <div>
              <h3 className="font-bold text-lg mb-2">Bride & Groom Album</h3>
              <p className="text-sm text-green-600 mb-4">*Omakase style if purchased — $500 discount on layflat pro</p>
              
              <div className="grid grid-cols-3 gap-3">
                <div 
                  onClick={() => setAlbumType('none')}
                  className={`p-4 rounded-lg border-2 cursor-pointer text-center transition-all ${
                    albumType === 'none' ? 'border-zinc-500 bg-zinc-100' : 'border-zinc-200 hover:border-zinc-300'
                  }`}
                >
                  <div className="font-medium">No Album</div>
                </div>
                <div 
                  onClick={() => setAlbumType('standard')}
                  className={`p-4 rounded-lg border-2 cursor-pointer text-center transition-all ${
                    albumType === 'standard' ? 'border-green-500 bg-green-50' : 'border-zinc-200 hover:border-zinc-300'
                  }`}
                >
                  <div className="font-medium">Standard Album</div>
                  <div className="text-sm text-muted-foreground line-through">${PRICING.albumStandard.fullPrice.toLocaleString()}</div>
                  <div className="font-bold text-green-600">${PRICING.albumStandard.price.toLocaleString()}</div>
                </div>
                <div 
                  onClick={() => setAlbumType('premium')}
                  className={`p-4 rounded-lg border-2 cursor-pointer text-center transition-all ${
                    albumType === 'premium' ? 'border-green-500 bg-green-50' : 'border-zinc-200 hover:border-zinc-300'
                  }`}
                >
                  <div className="font-medium">Premium Album</div>
                  <div className="text-sm text-muted-foreground line-through">${PRICING.albumPremium.fullPrice.toLocaleString()}</div>
                  <div className="font-bold text-green-600">${PRICING.albumPremium.price.toLocaleString()}</div>
                </div>
              </div>
            </div>

            {/* Parent Albums */}
            <div>
              <h3 className="font-bold text-lg mb-2">Parent Albums</h3>
              <p className="text-sm text-muted-foreground mb-4">10"×8" • 6 spreads • 30 photos • Linen cover — $295 each</p>
              
              <div className="grid grid-cols-5 gap-3">
                {[0, 1, 2, 3, 4].map((qty) => (
                  <div 
                    key={qty}
                    onClick={() => setParentAlbumQty(qty)}
                    className={`p-4 rounded-lg border-2 cursor-pointer text-center transition-all ${
                      parentAlbumQty === qty 
                        ? qty === 0 ? 'border-zinc-500 bg-zinc-100' : 'border-green-500 bg-green-50'
                        : 'border-zinc-200 hover:border-zinc-300'
                    }`}
                  >
                    <div className="font-medium">{qty === 0 ? 'None' : `${qty} Album${qty > 1 ? 's' : ''}`}</div>
                    {qty > 0 && <div className="text-sm font-bold text-green-600">${(qty * PRICING.parentAlbum.price).toLocaleString()}</div>}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* ============================================================ */}
        {/* WEDDING FRAME */}
        {/* ============================================================ */}
        <div className="bg-white border rounded-lg overflow-hidden">
          <div className="bg-zinc-900 text-white px-6 py-4">
            <h2 className="text-xl font-semibold">Wedding Frame</h2>
          </div>
          
          <div className="p-6 space-y-4">
            {/* Frame A */}
            <div 
              onClick={() => setFrameType('A')}
              className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${
                frameType === 'A' ? 'border-green-500 bg-green-50' : 'border-zinc-200 hover:border-zinc-300'
              }`}
            >
              <div className="flex justify-between items-start mb-2">
                <h3 className="font-bold">Wedding Frame A — ${PRICING.frameA.price}</h3>
                {frameType === 'A' && <Check className="w-5 h-5 text-green-600" />}
              </div>
              <ul className="space-y-1 text-sm ml-4">
                <li className="flex items-start gap-2">
                  <span className="text-zinc-400 mt-0.5">●</span>
                  <span>Black floating frame same style as Eng portraits</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-zinc-400 mt-0.5">●</span>
                  <span>24x30 photo (in wedding package) mounted on canvas stretcher</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-zinc-400 mt-0.5">●</span>
                  <span>Assembly including D rings and wire</span>
                </li>
              </ul>
            </div>

            {/* Frame B */}
            <div 
              onClick={() => setFrameType('B')}
              className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${
                frameType === 'B' ? 'border-green-500 bg-green-50' : 'border-zinc-200 hover:border-zinc-300'
              }`}
            >
              <div className="flex justify-between items-start mb-2">
                <h3 className="font-bold">Wedding Frame B — ${PRICING.frameB.price}</h3>
                {frameType === 'B' && <Check className="w-5 h-5 text-green-600" />}
              </div>
              <ul className="space-y-1 text-sm ml-4">
                <li className="flex items-start gap-2">
                  <span className="text-zinc-400 mt-0.5">●</span>
                  <span>Black small michelle frame</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-zinc-400 mt-0.5">●</span>
                  <span>24x30 photo (in wedding package) mounted on foam core for lightness</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-zinc-400 mt-0.5">●</span>
                  <span>24x30 glass</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-zinc-400 mt-0.5">●</span>
                  <span>Assembly including D rings and wire</span>
                </li>
              </ul>
            </div>

            {/* Frame C */}
            <div 
              onClick={() => setFrameType('C')}
              className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${
                frameType === 'C' ? 'border-green-500 bg-green-50' : 'border-zinc-200 hover:border-zinc-300'
              }`}
            >
              <div className="flex justify-between items-start mb-2">
                <h3 className="font-bold">Wedding Frame C — ${PRICING.frameC.price}</h3>
                {frameType === 'C' && <Check className="w-5 h-5 text-green-600" />}
              </div>
              <ul className="space-y-1 text-sm ml-4">
                <li className="flex items-start gap-2">
                  <span className="text-zinc-400 mt-0.5">●</span>
                  <span>Large michelle frame</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-zinc-400 mt-0.5">●</span>
                  <span>24x30 photo (in wedding package) mounted on foam core for lightness</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-zinc-400 mt-0.5">●</span>
                  <span>24x30 glass</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-zinc-400 mt-0.5">●</span>
                  <span>Assembly including D rings and wire</span>
                </li>
              </ul>
            </div>

            {/* No Frame */}
            <div 
              onClick={() => setFrameType('none')}
              className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${
                frameType === 'none' ? 'border-zinc-500 bg-zinc-100' : 'border-zinc-200 hover:border-zinc-300'
              }`}
            >
              <div className="flex justify-between items-start">
                <h3 className="font-medium text-zinc-500">No Wedding Frame</h3>
                {frameType === 'none' && <Check className="w-5 h-5 text-zinc-500" />}
              </div>
            </div>
          </div>
        </div>

        {/* ============================================================ */}
        {/* EXTRAS */}
        {/* ============================================================ */}
        <div className="bg-white border rounded-lg overflow-hidden">
          <div className="bg-zinc-900 text-white px-6 py-4">
            <h2 className="text-xl font-semibold">Extras</h2>
          </div>
          
          <div className="p-6 space-y-3">
            {/* Engagement Proofs */}
            <div 
              onClick={() => setIncludeEngProofs(!includeEngProofs)}
              className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${
                includeEngProofs ? 'border-green-500 bg-green-50' : 'border-zinc-200'
              }`}
            >
              <div className="flex justify-between items-center">
                <div>
                  <span className="font-medium">Engagement Proofs — ${PRICING.engProofs.price}</span>
                  <p className="text-sm text-muted-foreground">Download link of all Engagement Proof files Dropbox without watermark</p>
                </div>
                <div className={`w-6 h-6 rounded flex items-center justify-center ${
                  includeEngProofs ? 'bg-green-500 text-white' : 'bg-zinc-200'
                }`}>
                  {includeEngProofs && <Check className="w-4 h-4" />}
                </div>
              </div>
            </div>

            {/* Hi-Res Files */}
            <div 
              onClick={() => setIncludeHiRes(!includeHiRes)}
              className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${
                includeHiRes ? 'border-green-500 bg-green-50' : 'border-zinc-200'
              }`}
            >
              <div className="flex justify-between items-center">
                <div>
                  <span className="font-medium">High-Resolution Digital Files — FREE</span>
                  <p className="text-sm text-muted-foreground">Wedding 16x24 300dpi + Engagement 16x16 300dpi</p>
                  <p className="text-xs text-green-600">Retail value ${PRICING.hiResFiles.retailPrice.toLocaleString()} — included with package</p>
                </div>
                <div className={`w-6 h-6 rounded flex items-center justify-center ${
                  includeHiRes ? 'bg-green-500 text-white' : 'bg-zinc-200'
                }`}>
                  {includeHiRes && <Check className="w-4 h-4" />}
                </div>
              </div>
            </div>

            {/* Online Proofing - always included */}
            <div className="p-4 rounded-lg border bg-zinc-50">
              <span className="font-medium text-zinc-600">Online proofing and download share and customer gallery</span>
              <span className="text-sm text-green-600 ml-2">INCLUDED</span>
            </div>

            {/* Custom Items */}
            <div className="pt-4 border-t">
              <label className="block font-medium mb-2">Additional Items</label>
              <textarea
                value={customItems}
                onChange={(e) => setCustomItems(e.target.value)}
                placeholder="Add any custom items here..."
                rows={3}
                className="w-full px-3 py-2 border rounded-lg text-sm"
              />
            </div>
          </div>
        </div>

        {/* ============================================================ */}
        {/* EXPENSE BREAKDOWN */}
        {/* ============================================================ */}
        <div className="bg-card border rounded-lg overflow-hidden">
          <div className="bg-zinc-100 px-4 py-3 border-b">
            <h2 className="font-semibold flex items-center gap-2">
              <DollarSign className="w-4 h-4" />
              Expense Breakdown
            </h2>
          </div>
          
          <div className="p-4">
            <div className="space-y-2">
              {collageType === 'A' && (
                <div className="flex justify-between py-2 border-b">
                  <span>Collage A (3x 16x16 canvas + float frame)</span>
                  <span>${PRICING.collageA.price.toLocaleString()} CAD</span>
                </div>
              )}
              {collageType === 'B' && (
                <div className="flex justify-between py-2 border-b">
                  <span>Collage B (Big Michelle Frame 50x18)</span>
                  <span>${PRICING.collageB.price.toLocaleString()} CAD</span>
                </div>
              )}
              {collageType === 'C' && (
                <div className="flex justify-between py-2 border-b">
                  <span>Collage C (Small Michelle Frame 38x14)</span>
                  <span>${PRICING.collageC.price.toLocaleString()} CAD</span>
                </div>
              )}
              {collageType === 'single' && (
                <div className="flex justify-between py-2 border-b">
                  <span>Single 16x16 Canvas</span>
                  <span>${PRICING.single16x16.price.toLocaleString()} CAD</span>
                </div>
              )}
              
              {albumType === 'standard' && (
                <div className="flex justify-between py-2 border-b">
                  <span>Wedding Album ($1,750 - $500 print credit)</span>
                  <span>${PRICING.albumStandard.price.toLocaleString()} CAD</span>
                </div>
              )}
              {albumType === 'premium' && (
                <div className="flex justify-between py-2 border-b">
                  <span>Premium Wedding Album ($2,250 - $500 print credit)</span>
                  <span>${PRICING.albumPremium.price.toLocaleString()} CAD</span>
                </div>
              )}
              
              {parentAlbumQty > 0 && (
                <div className="flex justify-between py-2 border-b">
                  <span>{parentAlbumQty} Parent Album{parentAlbumQty > 1 ? 's' : ''} @ $295 each</span>
                  <span>${(parentAlbumQty * PRICING.parentAlbum.price).toLocaleString()} CAD</span>
                </div>
              )}
              
              {frameType === 'A' && (
                <div className="flex justify-between py-2 border-b">
                  <span>Wedding Frame A (canvas mount)</span>
                  <span>${PRICING.frameA.price} CAD</span>
                </div>
              )}
              {frameType === 'B' && (
                <div className="flex justify-between py-2 border-b">
                  <span>Wedding Frame B (foam + glass)</span>
                  <span>${PRICING.frameB.price} CAD</span>
                </div>
              )}
              {frameType === 'C' && (
                <div className="flex justify-between py-2 border-b">
                  <span>Wedding Frame C (large, foam + glass)</span>
                  <span>${PRICING.frameC.price} CAD</span>
                </div>
              )}
              
              {includeEngProofs && (
                <div className="flex justify-between py-2 border-b">
                  <span>Engagement Proofs</span>
                  <span>${PRICING.engProofs.price} CAD</span>
                </div>
              )}
              
              {includeHiRes && (
                <div className="flex justify-between py-2 border-b">
                  <span>High-Resolution Digital Files</span>
                  <span>$0.00 CAD</span>
                </div>
              )}
              
              <div className="flex justify-between py-2 font-medium">
                <span>Subtotal</span>
                <span>${calculations.subtotal.toLocaleString()} CAD</span>
              </div>
              <div className="flex justify-between py-2 border-b">
                <span>Tax (13% HST)</span>
                <span>${calculations.tax.toFixed(2)} CAD</span>
              </div>
              <div className="flex justify-between py-2 border-b">
                <span>Subtotal including Tax</span>
                <span>${calculations.subtotalWithTax.toFixed(2)} CAD</span>
              </div>
              <div className="flex justify-between py-2 border-b text-green-600">
                <span>SIGS Customer Discount (25%)</span>
                <span>-${calculations.discount.toFixed(2)} CAD</span>
              </div>
              <div className="flex justify-between py-3 text-xl font-bold bg-green-50 -mx-4 px-4 rounded">
                <span>Total Cost after Discount</span>
                <span className="text-green-600">${calculations.total.toFixed(2)} CAD</span>
              </div>
            </div>
            
            {includeHiRes && (
              <p className="text-sm text-muted-foreground mt-4 p-3 bg-zinc-50 rounded">
                <strong>Note:</strong> The cost for Engagement and Wedding High-Resolution files is listed as $0.00 CAD, 
                however, the retail price is ${PRICING.hiResFiles.retailPrice.toLocaleString()} plus tax. When purchasing 
                the above package there is no additional charge for these files. SIGS Customer Discount (25%) applies 
                only when purchasing the package.
              </p>
            )}
          </div>
        </div>

        {/* ============================================================ */}
        {/* PAYMENT SCHEDULE */}
        {/* ============================================================ */}
        <div className="bg-card border rounded-lg overflow-hidden">
          <div className="bg-zinc-100 px-4 py-3 border-b">
            <h2 className="font-semibold flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              Payment Schedule
            </h2>
          </div>
          
          <div className="p-4 space-y-4">
            {balanceRemaining && (
              <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
                <div className="flex justify-between items-center">
                  <span className="font-medium">Remaining from wedding agreement</span>
                  <span className="font-semibold">{balanceRemaining}</span>
                </div>
              </div>
            )}
            
            <div className="p-4 bg-zinc-50 border rounded-lg">
              <div className="flex justify-between items-center">
                <span className="font-medium">Frames & Albums Package (including tax)</span>
                <span className="font-semibold">${calculations.total.toFixed(2)}</span>
              </div>
            </div>
            
            <div className="border-t pt-4">
              <h3 className="font-medium mb-3">Suggested Payment Plan (7 installments):</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between py-2 border-b">
                  <span>1. Pick Up Portraits</span>
                  <span>$500.00</span>
                </div>
                <div className="flex justify-between py-2 border-b">
                  <span>2. July 1st</span>
                  <span>$500.00</span>
                </div>
                <div className="flex justify-between py-2 border-b">
                  <span>3. Aug 1st</span>
                  <span>$500.00</span>
                </div>
                <div className="flex justify-between py-2 border-b">
                  <span>4. Nov 1st</span>
                  <span>$500.00</span>
                </div>
                <div className="flex justify-between py-2 border-b">
                  <span>5. 2 Weeks before wedding</span>
                  <span>$500.00</span>
                </div>
                <div className="flex justify-between py-2 border-b">
                  <span>6. Pick up proof disk/Dropbox</span>
                  <span>$500.00</span>
                </div>
                <div className="flex justify-between py-2 border-b">
                  <span>7. Pick up final wedding album & prints</span>
                  <span>$500.00</span>
                </div>
              </div>
              <p className="text-xs text-muted-foreground mt-3">
                NOTE: This schedule replaces the original payment plan.
              </p>
            </div>
          </div>
        </div>

        {/* ============================================================ */}
        {/* ACTION BUTTONS */}
        {/* ============================================================ */}
        <div className="flex gap-4 justify-end py-4">
          <button className="px-6 py-3 border rounded-lg hover:bg-zinc-50 flex items-center gap-2">
            <Save className="w-4 h-4" />
            Save Quote
          </button>
          <button className="px-6 py-3 border rounded-lg hover:bg-zinc-50 flex items-center gap-2">
            <Printer className="w-4 h-4" />
            Print / Save PDF
          </button>
          <button className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center gap-2">
            <Send className="w-4 h-4" />
            Email to Client
          </button>
        </div>

        {/* ============================================================ */}
        {/* PRE-APPOINTMENT SETUP (at bottom) */}
        {/* ============================================================ */}
        <div className="bg-card border rounded-lg overflow-hidden border-dashed border-zinc-300">
          <div className="bg-zinc-50 px-4 py-3 border-b border-dashed">
            <h2 className="font-semibold flex items-center gap-2 text-zinc-600">
              <FileText className="w-4 h-4" />
              Pre-Appointment Setup
            </h2>
            <p className="text-sm text-muted-foreground">Enter this data BEFORE the couple arrives — it will appear in the banner above</p>
          </div>
          
          <div className="p-4 space-y-4">
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">Couple Name</label>
                <input
                  type="text"
                  value={coupleName}
                  onChange={(e) => setCoupleName(e.target.value)}
                  placeholder="Selena & John"
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Wedding Date</label>
                <input
                  type="text"
                  value={weddingDate}
                  onChange={(e) => setWeddingDate(e.target.value)}
                  placeholder="May 16, 2026"
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1 flex items-center gap-2">
                  <Youtube className="w-4 h-4 text-red-600" />
                  Slideshow Link
                </label>
                <input
                  type="text"
                  value={youtubeLink}
                  onChange={(e) => setYoutubeLink(e.target.value)}
                  placeholder="https://youtu.be/..."
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
                />
              </div>
            </div>
            
            <div className="border-t pt-4 mt-4">
              <h3 className="font-medium mb-3">Original Contract Balance</h3>
              <div className="grid grid-cols-3 gap-4 mb-4">
                <div>
                  <label className="block text-sm text-muted-foreground mb-1">Contract Amount</label>
                  <input
                    type="text"
                    value={contractAmount}
                    onChange={(e) => setContractAmount(e.target.value)}
                    placeholder="$3,850.00"
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
                  />
                </div>
                <div>
                  <label className="block text-sm text-muted-foreground mb-1">Payments Received</label>
                  <input
                    type="text"
                    value={paymentsReceived}
                    onChange={(e) => setPaymentsReceived(e.target.value)}
                    placeholder="$2,750.00"
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
                  />
                </div>
                <div>
                  <label className="block text-sm text-muted-foreground mb-1">Balance Remaining</label>
                  <input
                    type="text"
                    value={balanceRemaining}
                    onChange={(e) => setBalanceRemaining(e.target.value)}
                    placeholder="$1,100.00"
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary focus:border-primary font-semibold"
                  />
                </div>
              </div>
              
              <div>
                <label className="block text-sm text-muted-foreground mb-1">Payment History (paste from records)</label>
                <textarea
                  value={paymentHistory}
                  onChange={(e) => setPaymentHistory(e.target.value)}
                  placeholder="April 18, 2025 JOAO BENTO $550.00&#10;January 13, 2025 JOAO BENTO $550.00&#10;..."
                  rows={4}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary focus:border-primary font-mono text-sm"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center text-sm text-muted-foreground py-4 border-t">
          <p>265 Rimrock Rd Dr Toronto Ontario M3J 9C8</p>
          <p>SIGS Photography Ltd.</p>
        </div>
      </div>
    </Layout>
  )
}
