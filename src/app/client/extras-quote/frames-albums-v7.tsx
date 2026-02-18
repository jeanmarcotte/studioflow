'use client'

import React, { useState, useMemo } from 'react'
import { Layout } from '@/components/layout/layout'
import { studioflowClientConfig } from '@/config/sidebar'
import { 
  Calendar, DollarSign, FileText, Save, Send, 
  Check, Frame, Printer, ChevronDown, ChevronUp,
  Youtube, ExternalLink, Settings
} from 'lucide-react'

// ============================================================
// SIGS PHOTOGRAPHY - FRAMES & ALBUMS QUOTE
// Engagement Photo Presentation Sales Tool
// ============================================================

// Pricing Configuration
const PRICING = {
  collageA: { price: 1500 },
  collageB: { price: 1750 },
  collageC: { price: 1200 },
  single16x16: { price: 500 },
  frameA: { price: 200 },
  frameB: { price: 250 },
  frameC: { price: 300 },
  albumStandard: { price: 1250, fullPrice: 1750 },
  albumPremium: { price: 1750, fullPrice: 2250 },
  parentAlbum: { price: 295 },
  engProofs: { price: 250 },
  hiResFiles: { price: 0, retailPrice: 2250 },
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
  const [paidInstallment, setPaidInstallment] = useState('')
  
  // ============================================================
  // STATE - Product Selections (hidden at bottom)
  // ============================================================
  const [collageType, setCollageType] = useState<'none' | 'A' | 'B' | 'C' | 'single'>('A')
  const [include5x5, setInclude5x5] = useState(true)
  const [albumType, setAlbumType] = useState<'none' | 'standard' | 'premium'>('standard')
  const [parentAlbumQty, setParentAlbumQty] = useState(0)
  const [frameType, setFrameType] = useState<'none' | 'A' | 'B' | 'C'>('A')
  const [includeEngProofs, setIncludeEngProofs] = useState(true)
  const [includeHiRes, setIncludeHiRes] = useState(true)
  const [includeSignBook, setIncludeSignBook] = useState(false)
  
  // Show/hide product options section
  const [showOptions, setShowOptions] = useState(false)
  
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
    
    if (collageType === 'A') subtotal += PRICING.collageA.price
    if (collageType === 'B') subtotal += PRICING.collageB.price
    if (collageType === 'C') subtotal += PRICING.collageC.price
    if (collageType === 'single') subtotal += PRICING.single16x16.price
    
    if (albumType === 'standard') subtotal += PRICING.albumStandard.price
    if (albumType === 'premium') subtotal += PRICING.albumPremium.price
    subtotal += parentAlbumQty * PRICING.parentAlbum.price
    
    if (frameType === 'A') subtotal += PRICING.frameA.price
    if (frameType === 'B') subtotal += PRICING.frameB.price
    if (frameType === 'C') subtotal += PRICING.frameC.price
    
    if (includeEngProofs) subtotal += PRICING.engProofs.price
    if (includeHiRes) subtotal += PRICING.hiResFiles.price
    
    const tax = subtotal * 0.13
    const subtotalWithTax = subtotal + tax
    const discount = subtotalWithTax * (SIGS_DISCOUNT_PERCENT / 100)
    const total = subtotalWithTax - discount
    
    return { subtotal, tax, subtotalWithTax, discount, total }
  }, [collageType, albumType, parentAlbumQty, frameType, includeEngProofs, includeHiRes])

  // Get collage description for display
  const getCollageDescription = () => {
    switch (collageType) {
      case 'A': return {
        title: 'Collage',
        items: [
          '3 16x16 custom-edited prints with editing',
          'All 3 mounted on canvas stretcher',
          'All 3 framed with black float-frame'
        ]
      }
      case 'B': return {
        title: 'Collage — Big Michelle Frame 50x18',
        items: [
          '3 14x14 edited matt portraits',
          '3 14x14 photos mounted on masonite with UV spray protection',
          '1 acid-free cut for 3 photos with ⅛" allowance',
          '1 low glare glass cut to fit 50x18',
          'Assembly including D rings and wire'
        ]
      }
      case 'C': return {
        title: 'Collage — Small Michelle Frame 38x14',
        items: [
          '3 10x10 custom-edited prints with editing',
          '3 10x10 photos mounted on masonite with UV spray protection',
          '1 acid-free cut for 3 photos with ⅛" allowance',
          '1 low glare glass cut to fit 38x14',
          'Assembly including D rings and wire'
        ]
      }
      case 'single': return {
        title: 'Single 16x16',
        items: [
          '1 16x16 custom-edited print',
          'Mounted on canvas stretcher',
          'Black float-frame'
        ]
      }
      default: return null
    }
  }

  const getFrameDescription = () => {
    switch (frameType) {
      case 'A': return [
        'Black floating frame same style as Eng portraits',
        '24x30 photo (in wedding package) mounted on canvas stretcher',
        'Assembly including D rings and wire'
      ]
      case 'B': return [
        'Black small michelle frame',
        '24x30 photo (in wedding package) mounted on foam core for lightness',
        '24x30 glass',
        'Assembly including D rings and wire'
      ]
      case 'C': return [
        'Large michelle frame',
        '24x30 photo (in wedding package) mounted on foam core for lightness',
        '24x30 glass',
        'Assembly including D rings and wire'
      ]
      default: return null
    }
  }

  const collageDesc = getCollageDescription()
  const frameDesc = getFrameDescription()

  return (
    <Layout sidebarConfig={studioflowClientConfig}>
      {/* Dark Banner */}
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
                {weddingDate || 'Engagement Photo Presentation'}
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

      <div className="max-w-4xl mx-auto space-y-6">

        {/* ============================================================ */}
        {/* ITEMS - Clean presentation text */}
        {/* ============================================================ */}
        <div className="bg-white border rounded-lg overflow-hidden">
          <div className="bg-zinc-900 text-white px-6 py-4">
            <h2 className="text-xl font-semibold">Items</h2>
          </div>
          
          <div className="p-6 space-y-6">
            {/* Collage */}
            {collageDesc && (
              <div>
                <h3 className="font-bold text-lg mb-2">{collageDesc.title}</h3>
                <ul className="space-y-1 text-sm ml-4">
                  {collageDesc.items.map((item, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <span className="text-zinc-400 mt-0.5">●</span>
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Albums */}
            {(albumType !== 'none' || parentAlbumQty > 0) && (
              <div>
                <h3 className="font-bold text-lg mb-2">Albums</h3>
                <div className="space-y-1 text-sm ml-4">
                  {albumType !== 'none' && (
                    <p>1 28x11 digital album with a leather cover or acrylic cover, matt pages. Choice of 80 selected photographs or Omakase style. 15 spreads</p>
                  )}
                  {includeSignBook && (
                    <p>8x10 Engagement signing book blk linen 6 spreads 22 images.</p>
                  )}
                  {parentAlbumQty > 0 && (
                    <p>{parentAlbumQty} Parent Album{parentAlbumQty > 1 ? 's' : ''} 10"×8" • 6 spreads • 30 photos • Linen cover</p>
                  )}
                </div>
              </div>
            )}

            {/* Wedding Frame */}
            {frameDesc && (
              <div>
                <h3 className="font-bold text-lg mb-2">Wedding Frame</h3>
                <ul className="space-y-1 text-sm ml-4">
                  {frameDesc.map((item, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <span className="text-zinc-400 mt-0.5">●</span>
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Extras */}
            <div>
              <h3 className="font-bold text-lg mb-2">Extras</h3>
              <ul className="space-y-1 text-sm ml-4">
                {includeEngProofs && (
                  <li className="flex items-start gap-2">
                    <span className="text-zinc-400 mt-0.5">●</span>
                    <span>Download link of all Engagement Proof files Dropbox without watermark</span>
                  </li>
                )}
                <li className="flex items-start gap-2">
                  <span className="text-zinc-400 mt-0.5">●</span>
                  <span>Online proofing and download share and customer gallery</span>
                </li>
                {include5x5 && (
                  <li className="flex items-start gap-2">
                    <span className="text-zinc-400 mt-0.5">●</span>
                    <span>50 5x5 Engagement photo</span>
                  </li>
                )}
                {includeHiRes && (
                  <>
                    <li className="flex items-start gap-2">
                      <span className="text-zinc-400 mt-0.5">●</span>
                      <span>High-resolution digital files for Wedding images 16x24 300 dpi</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-zinc-400 mt-0.5">●</span>
                      <span>High-resolution digital files for Engagement images 16x16 300dpi</span>
                    </li>
                  </>
                )}
              </ul>
            </div>
          </div>
        </div>

        {/* ============================================================ */}
        {/* PHOTO SELECTION */}
        {/* ============================================================ */}
        {collageType !== 'none' && (
          <div className="bg-white border rounded-lg overflow-hidden">
            <div className="bg-zinc-900 text-white px-6 py-4">
              <h2 className="text-xl font-semibold">Photo Selection</h2>
            </div>
            
            <div className="p-6 space-y-6">
              {/* LEFT PHOTO */}
              <div>
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
              <div>
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

              {/* RIGHT PHOTO */}
              {(collageType === 'A' || collageType === 'B' || collageType === 'C') && (
                <div>
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
          </div>
        )}

        {/* ============================================================ */}
        {/* PAYMENT SCHEDULE */}
        {/* ============================================================ */}
        <div className="bg-white border rounded-lg overflow-hidden">
          <div className="bg-zinc-900 text-white px-6 py-4">
            <h2 className="text-xl font-semibold">Payment Schedule</h2>
          </div>
          
          <div className="p-6">
            <p className="text-sm text-muted-foreground mb-4">Including the balance remaining from Photo/Video agreement</p>
            
            <div className="space-y-2 mb-6">
              {balanceRemaining && (
                <div className="flex justify-between py-2 border-b">
                  <span>{balanceRemaining} Remaining in wedding agreement.</span>
                </div>
              )}
              <div className="flex justify-between py-2 border-b">
                <span>+${calculations.total.toFixed(0)} Album & Collage including tax</span>
              </div>
              {paidInstallment && (
                <div className="flex justify-between py-2 border-b text-green-600">
                  <span>- {paidInstallment} installment etransfer PAID</span>
                </div>
              )}
            </div>
            
            <div className="bg-zinc-50 p-4 rounded-lg mb-4">
              <p className="font-semibold">$3500 divided into 7 equal payments of $500 including tax</p>
            </div>
            
            <div className="space-y-2 text-sm">
              <div className="flex justify-between py-2 border-b">
                <span>1. Pick Up Portraits</span>
              </div>
              <div className="flex justify-between py-2 border-b">
                <span>2. July 1st 2025</span>
              </div>
              <div className="flex justify-between py-2 border-b">
                <span>3. Aug 1st 2025</span>
              </div>
              <div className="flex justify-between py-2 border-b">
                <span>4. Nov 1st 2025</span>
              </div>
              <div className="flex justify-between py-2 border-b">
                <span>5. 2 Weeks before wedding</span>
              </div>
              <div className="flex justify-between py-2 border-b">
                <span>6. Pick up proof disk/Dropbox</span>
              </div>
              <div className="flex justify-between py-2 border-b">
                <span>7. Pick up the final wedding album & prints</span>
              </div>
            </div>
            
            <p className="text-xs text-muted-foreground mt-4">
              NOTE: The schedule above replaces the original payment plan.
            </p>
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
                  <span>Engagement Photo Collage</span>
                  <span>${PRICING.collageA.price.toLocaleString()} CAD</span>
                </div>
              )}
              {collageType === 'B' && (
                <div className="flex justify-between py-2 border-b">
                  <span>Engagement Photo Collage (Big Michelle)</span>
                  <span>${PRICING.collageB.price.toLocaleString()} CAD</span>
                </div>
              )}
              {collageType === 'C' && (
                <div className="flex justify-between py-2 border-b">
                  <span>Engagement Photo Collage (Small Michelle)</span>
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
                  <span>Wedding Album: $1,750 - $500 (print credit) =</span>
                  <span>${PRICING.albumStandard.price.toLocaleString()} CAD</span>
                </div>
              )}
              {albumType === 'premium' && (
                <div className="flex justify-between py-2 border-b">
                  <span>Premium Wedding Album: $2,250 - $500 (print credit) =</span>
                  <span>${PRICING.albumPremium.price.toLocaleString()} CAD</span>
                </div>
              )}
              
              {parentAlbumQty > 0 && (
                <div className="flex justify-between py-2 border-b">
                  <span>{parentAlbumQty} Parent Album{parentAlbumQty > 1 ? 's' : ''}</span>
                  <span>${(parentAlbumQty * PRICING.parentAlbum.price).toLocaleString()} CAD</span>
                </div>
              )}
              
              {frameType !== 'none' && (
                <div className="flex justify-between py-2 border-b">
                  <span>Wedding Frame & Canvas</span>
                  <span>${frameType === 'A' ? PRICING.frameA.price : frameType === 'B' ? PRICING.frameB.price : PRICING.frameC.price} CAD</span>
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
                  <span>Engagement and Wedding High-Resolution files</span>
                  <span>$0.00 CAD</span>
                </div>
              )}
              
              <div className="flex justify-between py-2 font-medium">
                <span>Subtotal</span>
                <span>${calculations.subtotal.toLocaleString()} CAD</span>
              </div>
              <div className="flex justify-between py-2 border-b">
                <span>Tax (13%)</span>
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
                however, the retail price is $2,250 plus tax. When purchasing the above package there is no additional 
                charge for these files. SIGS Customer Discount (25%) applies only when purchasing the package.
              </p>
            )}
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
        {/* PRE-APPOINTMENT SETUP */}
        {/* ============================================================ */}
        <div className="bg-card border rounded-lg overflow-hidden border-dashed border-zinc-300">
          <div className="bg-zinc-50 px-4 py-3 border-b border-dashed">
            <h2 className="font-semibold flex items-center gap-2 text-zinc-600">
              <FileText className="w-4 h-4" />
              Pre-Appointment Setup
            </h2>
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
                  className="w-full px-3 py-2 border rounded-lg"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Wedding Date</label>
                <input
                  type="text"
                  value={weddingDate}
                  onChange={(e) => setWeddingDate(e.target.value)}
                  placeholder="May 16, 2026"
                  className="w-full px-3 py-2 border rounded-lg"
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
                  className="w-full px-3 py-2 border rounded-lg"
                />
              </div>
            </div>
            
            <div className="grid grid-cols-4 gap-4">
              <div>
                <label className="block text-sm text-muted-foreground mb-1">Contract Amount</label>
                <input
                  type="text"
                  value={contractAmount}
                  onChange={(e) => setContractAmount(e.target.value)}
                  placeholder="$3,850.00"
                  className="w-full px-3 py-2 border rounded-lg"
                />
              </div>
              <div>
                <label className="block text-sm text-muted-foreground mb-1">Payments Received</label>
                <input
                  type="text"
                  value={paymentsReceived}
                  onChange={(e) => setPaymentsReceived(e.target.value)}
                  placeholder="$2,750.00"
                  className="w-full px-3 py-2 border rounded-lg"
                />
              </div>
              <div>
                <label className="block text-sm text-muted-foreground mb-1">Balance Remaining</label>
                <input
                  type="text"
                  value={balanceRemaining}
                  onChange={(e) => setBalanceRemaining(e.target.value)}
                  placeholder="$1,100"
                  className="w-full px-3 py-2 border rounded-lg font-semibold"
                />
              </div>
              <div>
                <label className="block text-sm text-muted-foreground mb-1">Paid Installment</label>
                <input
                  type="text"
                  value={paidInstallment}
                  onChange={(e) => setPaidInstallment(e.target.value)}
                  placeholder="$600"
                  className="w-full px-3 py-2 border rounded-lg"
                />
              </div>
            </div>
            
            <div>
              <label className="block text-sm text-muted-foreground mb-1">Payment History</label>
              <textarea
                value={paymentHistory}
                onChange={(e) => setPaymentHistory(e.target.value)}
                placeholder="April 18, 2025 JOAO BENTO $550.00..."
                rows={3}
                className="w-full px-3 py-2 border rounded-lg font-mono text-sm"
              />
            </div>
          </div>
        </div>

        {/* ============================================================ */}
        {/* PRODUCT OPTIONS (Collapsible - for Jean to configure) */}
        {/* ============================================================ */}
        <div className="bg-card border rounded-lg overflow-hidden">
          <button
            onClick={() => setShowOptions(!showOptions)}
            className="w-full px-4 py-3 flex items-center justify-between bg-zinc-100 hover:bg-zinc-200 transition-colors"
          >
            <h2 className="font-semibold flex items-center gap-2">
              <Settings className="w-4 h-4" />
              Product Options (Configure Package)
            </h2>
            {showOptions ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
          </button>
          
          {showOptions && (
            <div className="p-6 space-y-8">
              {/* COLLAGE OPTIONS */}
              <div>
                <h3 className="font-bold text-lg mb-3">Collage</h3>
                <div className="space-y-2">
                  {(['A', 'B', 'C', 'single', 'none'] as const).map((type) => (
                    <div
                      key={type}
                      onClick={() => setCollageType(type)}
                      className={`p-3 rounded-lg border-2 cursor-pointer transition-all ${
                        collageType === type ? 'border-green-500 bg-green-50' : 'border-zinc-200 hover:border-zinc-300'
                      }`}
                    >
                      <div className="flex justify-between items-center">
                        <span className="font-medium">
                          {type === 'A' && 'Collage A — 3x 16x16 canvas + float frame'}
                          {type === 'B' && 'Collage B — Big Michelle Frame 50x18'}
                          {type === 'C' && 'Collage C — Small Michelle Frame 38x14'}
                          {type === 'single' && 'Single 16x16'}
                          {type === 'none' && 'No Collage'}
                        </span>
                        <span className="font-semibold">
                          {type === 'A' && `$${PRICING.collageA.price}`}
                          {type === 'B' && `$${PRICING.collageB.price}`}
                          {type === 'C' && `$${PRICING.collageC.price}`}
                          {type === 'single' && `$${PRICING.single16x16.price}`}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
                
                {/* 5x5 Toggle */}
                <div
                  onClick={() => setInclude5x5(!include5x5)}
                  className={`mt-3 p-3 rounded-lg border-2 cursor-pointer ${
                    include5x5 ? 'border-green-500 bg-green-50' : 'border-zinc-200'
                  }`}
                >
                  <div className="flex justify-between items-center">
                    <span>50 5x5 Engagement Photos (FREE)</span>
                    {include5x5 && <Check className="w-5 h-5 text-green-600" />}
                  </div>
                </div>
              </div>

              {/* ALBUM OPTIONS */}
              <div>
                <h3 className="font-bold text-lg mb-3">Albums</h3>
                <div className="grid grid-cols-3 gap-3 mb-3">
                  {(['none', 'standard', 'premium'] as const).map((type) => (
                    <div
                      key={type}
                      onClick={() => setAlbumType(type)}
                      className={`p-3 rounded-lg border-2 cursor-pointer text-center ${
                        albumType === type ? 'border-green-500 bg-green-50' : 'border-zinc-200 hover:border-zinc-300'
                      }`}
                    >
                      <div className="font-medium">
                        {type === 'none' && 'No Album'}
                        {type === 'standard' && 'Standard'}
                        {type === 'premium' && 'Premium'}
                      </div>
                      {type !== 'none' && (
                        <div className="text-sm text-green-600 font-semibold">
                          ${type === 'standard' ? PRICING.albumStandard.price : PRICING.albumPremium.price}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
                
                <div className="flex items-center gap-4">
                  <span className="text-sm">Parent Albums:</span>
                  {[0, 1, 2, 3, 4].map((qty) => (
                    <button
                      key={qty}
                      onClick={() => setParentAlbumQty(qty)}
                      className={`w-10 h-10 rounded-lg border-2 ${
                        parentAlbumQty === qty ? 'border-green-500 bg-green-50' : 'border-zinc-200'
                      }`}
                    >
                      {qty}
                    </button>
                  ))}
                </div>
                
                {/* Sign Book Toggle */}
                <div
                  onClick={() => setIncludeSignBook(!includeSignBook)}
                  className={`mt-3 p-3 rounded-lg border-2 cursor-pointer ${
                    includeSignBook ? 'border-green-500 bg-green-50' : 'border-zinc-200'
                  }`}
                >
                  <div className="flex justify-between items-center">
                    <span>Engagement Signing Book</span>
                    {includeSignBook && <Check className="w-5 h-5 text-green-600" />}
                  </div>
                </div>
              </div>

              {/* FRAME OPTIONS */}
              <div>
                <h3 className="font-bold text-lg mb-3">Wedding Frame</h3>
                <div className="space-y-2">
                  {(['A', 'B', 'C', 'none'] as const).map((type) => (
                    <div
                      key={type}
                      onClick={() => setFrameType(type)}
                      className={`p-3 rounded-lg border-2 cursor-pointer transition-all ${
                        frameType === type ? 'border-green-500 bg-green-50' : 'border-zinc-200 hover:border-zinc-300'
                      }`}
                    >
                      <div className="flex justify-between items-center">
                        <span className="font-medium">
                          {type === 'A' && 'Frame A — Canvas mount'}
                          {type === 'B' && 'Frame B — Small michelle, foam + glass'}
                          {type === 'C' && 'Frame C — Large michelle, foam + glass'}
                          {type === 'none' && 'No Frame'}
                        </span>
                        <span className="font-semibold">
                          {type === 'A' && `$${PRICING.frameA.price}`}
                          {type === 'B' && `$${PRICING.frameB.price}`}
                          {type === 'C' && `$${PRICING.frameC.price}`}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* EXTRAS OPTIONS */}
              <div>
                <h3 className="font-bold text-lg mb-3">Extras</h3>
                <div className="space-y-2">
                  <div
                    onClick={() => setIncludeEngProofs(!includeEngProofs)}
                    className={`p-3 rounded-lg border-2 cursor-pointer ${
                      includeEngProofs ? 'border-green-500 bg-green-50' : 'border-zinc-200'
                    }`}
                  >
                    <div className="flex justify-between items-center">
                      <span>Engagement Proofs</span>
                      <span className="font-semibold">${PRICING.engProofs.price}</span>
                    </div>
                  </div>
                  <div
                    onClick={() => setIncludeHiRes(!includeHiRes)}
                    className={`p-3 rounded-lg border-2 cursor-pointer ${
                      includeHiRes ? 'border-green-500 bg-green-50' : 'border-zinc-200'
                    }`}
                  >
                    <div className="flex justify-between items-center">
                      <span>Hi-Res Digital Files</span>
                      <span className="font-semibold text-green-600">FREE</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
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
