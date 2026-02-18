'use client'

import React, { useState, useMemo } from 'react'
import { Layout } from '@/components/layout/layout'
import { studioflowClientConfig } from '@/config/sidebar'
import { 
  Calendar, DollarSign, FileText, Save, Send, 
  Check, Image, Frame, BookOpen, Printer, Download,
  Youtube, ExternalLink, Plus, Minus
} from 'lucide-react'

// ============================================================
// SIGS PHOTOGRAPHY - FRAMES & ALBUMS QUOTE
// Engagement Photo Presentation Sales Tool
// ============================================================

// Pricing Configuration - Based on Selena & John example
const PRICING = {
  engagementCollage: {
    name: 'Engagement Photo Collage',
    description: '3x 16x16 custom-edited prints, canvas mounted, black float-frame',
    price: 1500,
    included: true
  },
  weddingAlbum: {
    name: 'Wedding Album',
    description: '28x11 Omakase style, 80 photos, 15 spreads, Leather or Acrylic cover',
    fullPrice: 1750,
    printCredit: 500,
    price: 1250, // After $500 print credit from original package
    included: true
  },
  engSignBook: {
    name: 'Engagement Signing Book',
    description: '8x10 Black Linen, 6 spreads, 22 images',
    price: 250,
    included: true // Most couples remove this to save $200
  },
  engProofs: {
    name: 'Engagement Proofs',
    description: 'Download link of all Engagement Proof files without watermark',
    price: 250,
    included: true
  },
  weddingFrame: {
    name: 'Wedding Frame & Canvas',
    description: '24x30 photo mounted on canvas stretcher, black floating frame',
    price: 400,
    included: true
  },
  hiResFiles: {
    name: 'High-Resolution Digital Files',
    description: 'Engagement 16x16 300dpi + Wedding 16x24 300dpi',
    retailPrice: 2250,
    price: 0, // Free when purchasing package
    included: true
  },
  // Additional extras that can be added
  extra8x10: {
    name: 'Extra 8x10 Print',
    price: 35,
    qty: 3
  },
  extra5x5: {
    name: '5x5 Engagement Photos',
    price: 0, // Included with collage purchase
    qty: 50
  }
}

const SIGS_DISCOUNT_PERCENT = 25

export default function FramesAlbumsQuotePage() {
  // ============================================================
  // STATE - Pre-appointment Data
  // ============================================================
  const [coupleName, setCoupleName] = useState('')
  const [weddingDate, setWeddingDate] = useState('')
  const [youtubeLink, setYoutubeLink] = useState('')
  
  // Contract Balance Info (paste from records)
  const [contractAmount, setContractAmount] = useState('')
  const [paymentsReceived, setPaymentsReceived] = useState('')
  const [balanceRemaining, setBalanceRemaining] = useState('')
  const [paymentHistory, setPaymentHistory] = useState('')
  
  // ============================================================
  // STATE - Package Items (toggleable)
  // ============================================================
  const [items, setItems] = useState({
    engagementCollage: true,
    weddingAlbum: true,
    engSignBook: true,
    engProofs: true,
    weddingFrame: true,
    hiResFiles: true
  })
  
  // Extra items quantities
  const [extra8x10Qty, setExtra8x10Qty] = useState(3)
  const [extra5x5Qty, setExtra5x5Qty] = useState(50)
  
  // Collage photo selections (proof numbers + editing notes)
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
    
    if (items.engagementCollage) subtotal += PRICING.engagementCollage.price
    if (items.weddingAlbum) subtotal += PRICING.weddingAlbum.price
    if (items.engSignBook) subtotal += PRICING.engSignBook.price
    if (items.engProofs) subtotal += PRICING.engProofs.price
    if (items.weddingFrame) subtotal += PRICING.weddingFrame.price
    if (items.hiResFiles) subtotal += PRICING.hiResFiles.price
    
    // Extra 8x10s
    subtotal += extra8x10Qty * PRICING.extra8x10.price
    
    const tax = subtotal * 0.13
    const subtotalWithTax = subtotal + tax
    const discount = subtotalWithTax * (SIGS_DISCOUNT_PERCENT / 100)
    const total = subtotalWithTax - discount
    
    return {
      subtotal,
      tax,
      subtotalWithTax,
      discount,
      total
    }
  }, [items, extra8x10Qty])
  
  // Toggle item inclusion
  const toggleItem = (key: keyof typeof items) => {
    setItems(prev => ({ ...prev, [key]: !prev[key] }))
  }

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
            {/* YouTube Link - Shows when entered */}
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
        {/* ITEMS - Clean PDF-style presentation */}
        {/* ============================================================ */}
        <div className="bg-white border rounded-lg overflow-hidden">
          <div className="bg-zinc-900 text-white px-6 py-4">
            <h2 className="text-xl font-semibold">Items</h2>
          </div>
          
          <div className="p-6 space-y-6">
            
            {/* COLLAGE */}
            <div 
              className={`transition-opacity ${items.engagementCollage ? 'opacity-100' : 'opacity-40'}`}
              onClick={() => toggleItem('engagementCollage')}
            >
              <h3 className="font-bold text-lg mb-2 cursor-pointer hover:text-zinc-600">Collage</h3>
              <ul className="space-y-1 text-sm ml-4">
                <li className="flex items-start gap-2">
                  <span className="text-zinc-400 mt-1">●</span>
                  <span>3 16x16 custom-edited prints with editing</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-zinc-400 mt-1">●</span>
                  <span>All 3 mounted on canvas stretcher</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-zinc-400 mt-1">●</span>
                  <span>All 3 framed with black float-frame</span>
                </li>
              </ul>
              
              {/* Collage Photo Summary - only show when photos selected */}
              {items.engagementCollage && (collagePhotos.leftProof || collagePhotos.centerProof || collagePhotos.rightProof) && (
                <div className="mt-3 ml-4 p-3 bg-zinc-50 rounded text-sm">
                  <p className="font-medium mb-1">Selected Photos:</p>
                  <p className="text-muted-foreground">
                    Left: #{collagePhotos.leftProof || '—'} | Center: #{collagePhotos.centerProof || '—'} | Right: #{collagePhotos.rightProof || '—'}
                  </p>
                </div>
              )}
            </div>

            {/* ALBUMS */}
            <div>
              <h3 className="font-bold text-lg mb-2">Albums</h3>
              <div className="space-y-2 text-sm ml-4">
                <p 
                  className={`cursor-pointer hover:text-zinc-600 transition-opacity ${items.weddingAlbum ? 'opacity-100' : 'opacity-40 line-through'}`}
                  onClick={() => toggleItem('weddingAlbum')}
                >
                  1 28x11 digital album with a leather cover or acrylic cover, matt pages. Choice of 80 selected photographs or Omakase style. 15 spreads
                </p>
                <p 
                  className={`cursor-pointer hover:text-zinc-600 transition-opacity ${items.engSignBook ? 'opacity-100' : 'opacity-40 line-through'}`}
                  onClick={() => toggleItem('engSignBook')}
                >
                  8x10 Engagement signing book blk linen 6 spreads 22 images.
                </p>
              </div>
            </div>

            {/* WEDDING FRAME */}
            <div 
              className={`transition-opacity ${items.weddingFrame ? 'opacity-100' : 'opacity-40'}`}
              onClick={() => toggleItem('weddingFrame')}
            >
              <h3 className="font-bold text-lg mb-2 cursor-pointer hover:text-zinc-600">Wedding Frame</h3>
              <ul className="space-y-1 text-sm ml-4">
                <li className="flex items-start gap-2">
                  <span className="text-zinc-400 mt-1">●</span>
                  <span>Black floating frame same style as Eng portraits</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-zinc-400 mt-1">●</span>
                  <span>24x30 photo (in wedding package) mounted on canvas stretcher</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-zinc-400 mt-1">●</span>
                  <span>Assembly including D rings and wire</span>
                </li>
              </ul>
            </div>

            {/* EXTRAS */}
            <div>
              <h3 className="font-bold text-lg mb-2">Extras</h3>
              <ul className="space-y-1 text-sm ml-4">
                <li className="flex items-start gap-2">
                  <span className="text-zinc-400 mt-1">●</span>
                  <span>{extra8x10Qty} 8x10s</span>
                </li>
                <li 
                  className={`flex items-start gap-2 cursor-pointer hover:text-zinc-600 transition-opacity ${items.engProofs ? 'opacity-100' : 'opacity-40'}`}
                  onClick={() => toggleItem('engProofs')}
                >
                  <span className="text-zinc-400 mt-1">●</span>
                  <span>Download link of all Engagement Proof files Dropbox without watermark</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-zinc-400 mt-1">●</span>
                  <span>Online proofing and download share and customer gallery</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-zinc-400 mt-1">●</span>
                  <span>50 5x5 Engagement photo</span>
                </li>
                <li 
                  className={`flex items-start gap-2 cursor-pointer hover:text-zinc-600 transition-opacity ${items.hiResFiles ? 'opacity-100' : 'opacity-40'}`}
                  onClick={() => toggleItem('hiResFiles')}
                >
                  <span className="text-zinc-400 mt-1">●</span>
                  <span>High-resolution digital files for Wedding images 16x24 300 dpi</span>
                </li>
                <li 
                  className={`flex items-start gap-2 cursor-pointer hover:text-zinc-600 transition-opacity ${items.hiResFiles ? 'opacity-100' : 'opacity-40'}`}
                  onClick={() => toggleItem('hiResFiles')}
                >
                  <span className="text-zinc-400 mt-1">●</span>
                  <span>High-resolution digital files for Engagement images 16x16 300dpi</span>
                </li>
              </ul>
            </div>

            {/* Collage Photo Selection - Full note-taking area */}
            {items.engagementCollage && (
              <div className="border-t pt-6 mt-6">
                <h3 className="font-bold text-lg mb-4">Collage Photo Selection</h3>
                
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
                    placeholder="Editing notes: horns, small stick, his jeans, remove background object..."
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
                    placeholder="Editing notes: her hand, light behind head, spiky hair, paint the railing, frillies..."
                    rows={5}
                    className="w-full px-3 py-2 border rounded-lg text-sm"
                  />
                </div>

                {/* RIGHT PHOTO */}
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
                    placeholder="Editing notes: stick, sweater, bra, enhance green..."
                    rows={5}
                    className="w-full px-3 py-2 border rounded-lg text-sm"
                  />
                </div>
              </div>
            )}
          </div>
          
          {/* Subtle toggle hint at bottom */}
          <div className="px-6 py-2 bg-zinc-50 border-t text-xs text-zinc-400 text-center">
            Click any section to adjust package
          </div>
        </div>

        {/* ============================================================ */}
        {/* SECTION 3: EXPENSE BREAKDOWN (Page 3 in PDF) */}
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
              {items.engagementCollage && (
                <div className="flex justify-between py-2 border-b">
                  <span>Engagement Photo Collage</span>
                  <span>${PRICING.engagementCollage.price.toLocaleString()} CAD</span>
                </div>
              )}
              {items.weddingAlbum && (
                <div className="flex justify-between py-2 border-b">
                  <span>Wedding Album ($1,750 - $500 print credit)</span>
                  <span>${PRICING.weddingAlbum.price.toLocaleString()} CAD</span>
                </div>
              )}
              {items.engSignBook && (
                <div className="flex justify-between py-2 border-b">
                  <span>Engagement Sign Book</span>
                  <span>${PRICING.engSignBook.price.toLocaleString()} CAD</span>
                </div>
              )}
              {items.engProofs && (
                <div className="flex justify-between py-2 border-b">
                  <span>Engagement Proofs</span>
                  <span>${PRICING.engProofs.price.toLocaleString()} CAD</span>
                </div>
              )}
              {items.weddingFrame && (
                <div className="flex justify-between py-2 border-b">
                  <span>Wedding Frame & Canvas</span>
                  <span>${PRICING.weddingFrame.price.toLocaleString()} CAD</span>
                </div>
              )}
              {items.hiResFiles && (
                <div className="flex justify-between py-2 border-b">
                  <span>High-Resolution Digital Files</span>
                  <span>$0.00 CAD</span>
                </div>
              )}
              {extra8x10Qty > 0 && (
                <div className="flex justify-between py-2 border-b">
                  <span>{extra8x10Qty}x 8x10 Prints</span>
                  <span>${(extra8x10Qty * PRICING.extra8x10.price).toLocaleString()} CAD</span>
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
            
            {items.hiResFiles && (
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
        {/* SECTION 4: PAYMENT SCHEDULE (Page 2 in PDF) */}
        {/* ============================================================ */}
        <div className="bg-card border rounded-lg overflow-hidden">
          <div className="bg-zinc-100 px-4 py-3 border-b">
            <h2 className="font-semibold flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              Payment Schedule
            </h2>
          </div>
          
          <div className="p-4 space-y-4">
            {/* Balance from original contract */}
            {balanceRemaining && (
              <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
                <div className="flex justify-between items-center">
                  <span className="font-medium">Remaining from wedding agreement</span>
                  <span className="font-semibold">{balanceRemaining}</span>
                </div>
              </div>
            )}
            
            {/* New package amount */}
            <div className="p-4 bg-zinc-50 border rounded-lg">
              <div className="flex justify-between items-center">
                <span className="font-medium">Album & Collage Package (including tax)</span>
                <span className="font-semibold">${calculations.total.toFixed(2)}</span>
              </div>
            </div>
            
            {/* Combined payment plan preview */}
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
        {/* PRE-APPOINTMENT SETUP (at bottom - fill BEFORE couple arrives) */}
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
            {/* Couple Info Row */}
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
            
            {/* Contract Balance Section */}
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
              
              {/* Payment History Paste Area */}
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
