'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { Loader2, Printer } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { format, parseISO } from 'date-fns'
import Image from 'next/image'

function formatWeddingDate(dateStr: string, dayOfWeek?: string): string {
  const d = parseISO(dateStr)
  const day = dayOfWeek?.toUpperCase() || format(d, 'EEEE').toUpperCase()
  return `${day} ${format(d, 'MMMM do, yyyy')}`
}

export default function AlbumViewPage() {
  const params = useParams()
  const id = params.id as string

  const [contract, setContract] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchData() {
      if (!id) return

      // Try as contract ID first, then as couple_id
      let { data: contractData } = await supabase
        .from('contracts')
        .select('*')
        .eq('id', id)
        .limit(1)

      if (!contractData || contractData.length === 0) {
        const { data: byCoupleId } = await supabase
          .from('contracts')
          .select('*')
          .eq('couple_id', id)
          .limit(1)
        contractData = byCoupleId
      }

      setContract(contractData?.[0] ?? null)
      setLoading(false)
    }

    fetchData()
  }, [id])

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-teal-600" />
      </div>
    )
  }

  if (!contract) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-gray-500">Contract not found</p>
      </div>
    )
  }

  const brideName = [contract.bride_first_name, contract.bride_last_name].filter(Boolean).join(' ')
  const groomName = [contract.groom_first_name, contract.groom_last_name].filter(Boolean).join(' ')
  const weddingDateStr = contract.wedding_date ? formatWeddingDate(contract.wedding_date, contract.day_of_week) : '___'

  const bg = contract.bride_groom_album_qty || 0
  const bgSize = contract.bride_groom_album_size || 'n/a'
  const bgSpreads = contract.bride_groom_album_spreads || 'n/a'
  const bgImages = contract.bride_groom_album_images || 'n/a'
  const bgCover = contract.bride_groom_album_cover || 'n/a'

  const pQty = contract.parent_albums_qty || 0
  const pSize = contract.parent_albums_size || '___'
  const pSpreads = contract.parent_albums_spreads || '___'
  const pImages = contract.parent_albums_images || '___'
  const pCover = contract.parent_albums_cover || '___'

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Print Button */}
      <div className="no-print fixed top-4 right-4 z-50">
        <Button onClick={() => window.print()} className="bg-teal-600 hover:bg-teal-700">
          <Printer className="w-4 h-4 mr-2" />
          Print
        </Button>
      </div>

      <style jsx global>{`
        .contract-form {
          font-family: 'Courier New', Courier, monospace;
          font-size: 13px;
          line-height: 1.7;
          color: #000;
        }
        .contract-header {
          font-family: 'Georgia', serif;
          font-size: 18px;
          font-weight: bold;
        }
        .field {
          border-bottom: 1px solid #000;
          display: inline;
          padding: 0 4px;
        }
        .field-wide {
          border-bottom: 1px solid #000;
          display: inline-block;
          min-width: 300px;
          padding: 0 4px;
        }
        .field-med {
          border-bottom: 1px solid #000;
          display: inline;
          min-width: 150px;
          padding: 0 4px;
        }
        .divider {
          border-top: 1px solid #000;
          margin: 20px 0;
        }
        @media print {
          .no-print { display: none !important; }
          @page { size: letter; margin: 0.75in; }
          body { background: white !important; }
        }
      `}</style>

      <div className="max-w-[8.5in] mx-auto bg-white shadow-md print:shadow-none p-10 mb-8 contract-form">
        {/* Header */}
        <div className="flex justify-between items-start mb-2">
          <div>
            <Image src="/images/sigslogo.png" alt="SIGS Photography" width={180} height={60} className="mb-1" />
            <div className="contract-header">SIGS Photography Ltd.</div>
          </div>
          <div className="text-right text-sm">Page | 1</div>
        </div>
        <div className="divider" />

        <p className="font-bold text-base mt-4 mb-4">ALBUM AGREEMENT</p>

        <p>Wedding Date: <span className="field-wide">{weddingDateStr}</span></p>

        <div className="mt-4">
          <p>Bride&apos;s Name: <span className="field-wide">{brideName}</span></p>
          <p>Groom&apos;s Name: <span className="field-wide">{groomName}</span></p>
        </div>

        <div className="divider" />

        <p className="font-bold">BRIDE &amp; GROOM ALBUM</p>
        <div className="mt-2 space-y-1">
          <p>Quantity: <span className="field-med">{bg}</span></p>
          <p>Size: <span className="field-med">{bgSize}</span></p>
          <p># of Spreads: <span className="field-med">{bgSpreads}</span></p>
          <p># of Images: <span className="field-med">{bgImages}</span></p>
          <p>Cover Type: <span className="field-med">{bgCover}</span></p>
        </div>

        <div className="divider" />

        <p className="font-bold">PARENT ALBUMS</p>
        <div className="mt-2 space-y-1">
          <p>Quantity: <span className="field-med">{pQty}</span></p>
          <p>Size: <span className="field-med">{pSize}</span></p>
          <p># of Spreads: <span className="field-med">{pSpreads}</span></p>
          <p># of Images: <span className="field-med">{pImages}</span></p>
          <p>Cover Type: <span className="field-med">{pCover}</span></p>
        </div>

        <div className="divider" />

        <p className="text-xs">*Omakase style if album purchased &amp; $500 print credit</p>

        <div className="divider" />

        <p className="mt-12 mb-12">All terms of this agreement are understood and agreed upon.</p>

        <div className="flex justify-between mt-16">
          <div>
            <div className="border-b border-black w-64 mb-2" />
            <p>Jean Marcotte</p>
            <p className="text-xs text-gray-500">SIGS Photography Ltd.</p>
          </div>
          <div>
            <div className="border-b border-black w-64 mb-2" />
            <p>Client Signature</p>
          </div>
        </div>
      </div>
    </div>
  )
}
