'use client'

import { Button } from '@/components/ui/button'
import { Printer } from 'lucide-react'

interface Contract {
  id: string
  bride_first_name: string
  bride_last_name: string
  groom_first_name: string
  groom_last_name: string
  email: string
  groom_email: string | null
  phone: string
  wedding_date: string
  day_of_week: string
  start_time: string
  end_time: string
  ceremony_location: string | null
  reception_venue: string | null
  engagement_session: boolean
  engagement_location: string | null
  num_photographers: number
  num_videographers: number
  drone_photography: boolean
  num_guests: number | null
  subtotal: string
  tax: string
  total: string
  signed_date: string
  photographer: string
  videographer: string | null
  appointment_notes: string | null
  loc_groom: boolean
  loc_bride: boolean
  loc_ceremony: boolean
  loc_park: boolean
  loc_reception: boolean
  prints_postcard_thankyou: number
  prints_5x7: number
  prints_8x10: number
  prints_11x14: number
  prints_16x16: number
  prints_16x20: number
  prints_20x24: number
  prints_24x30: number
  prints_30x40: number
  bride_groom_album_qty: number
  bride_groom_album_size: string | null
  bride_groom_album_spreads: number | null
  bride_groom_album_images: number | null
  bride_groom_album_cover: string | null
  parent_albums_qty: number
  parent_albums_size: string | null
  video_long_form: boolean
  video_highlights: number
  video_recap: boolean
  video_usb: boolean
  web_personal_page: boolean
  web_engagement_upload: number
  web_wedding_upload: number
}

interface ContractPrintViewProps {
  contract: Contract
  coupleName: string
}

export function ContractPrintView({ contract, coupleName }: ContractPrintViewProps) {
  const handlePrint = () => {
    window.print()
  }

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  }

  const locations = []
  if (contract.loc_groom) locations.push('Groom Prep')
  if (contract.loc_bride) locations.push('Bride Prep')
  if (contract.loc_ceremony) locations.push('Ceremony')
  if (contract.loc_park) locations.push('Park/Outdoor')
  if (contract.loc_reception) locations.push('Reception')

  return (
    <div className="min-h-screen bg-white">
      {/* Print Button - Hidden when printing */}
      <div className="print:hidden fixed top-4 right-4 z-50">
        <Button onClick={handlePrint} className="bg-teal-600 hover:bg-teal-700">
          <Printer className="w-4 h-4 mr-2" />
          Print Contract
        </Button>
      </div>

      {/* Contract Content */}
      <div className="max-w-4xl mx-auto p-8 print:p-4">
        {/* Header */}
        <div className="text-center mb-8 border-b pb-6">
          <h1 className="text-3xl font-bold text-gray-900">SIGS Photography</h1>
          <p className="text-gray-600 mt-2">Wedding Photography Contract</p>
        </div>

        {/* Couple Info */}
        <div className="mb-8">
          <h2 className="text-xl font-semibold text-teal-700 mb-4">Couple Information</h2>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-gray-500">Bride</p>
              <p className="font-medium">{contract.bride_first_name} {contract.bride_last_name}</p>
            </div>
            <div>
              <p className="text-gray-500">Groom</p>
              <p className="font-medium">{contract.groom_first_name} {contract.groom_last_name}</p>
            </div>
            <div>
              <p className="text-gray-500">Email</p>
              <p className="font-medium">{contract.email}</p>
            </div>
            <div>
              <p className="text-gray-500">Phone</p>
              <p className="font-medium">{contract.phone}</p>
            </div>
          </div>
        </div>

        {/* Wedding Details */}
        <div className="mb-8">
          <h2 className="text-xl font-semibold text-teal-700 mb-4">Wedding Details</h2>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-gray-500">Wedding Date</p>
              <p className="font-medium">{formatDate(contract.wedding_date)}</p>
            </div>
            <div>
              <p className="text-gray-500">Coverage Hours</p>
              <p className="font-medium">{contract.start_time} — {contract.end_time}</p>
            </div>
            <div>
              <p className="text-gray-500">Ceremony Location</p>
              <p className="font-medium">{contract.ceremony_location ?? 'Not specified'}</p>
            </div>
            <div>
              <p className="text-gray-500">Reception Venue</p>
              <p className="font-medium">{contract.reception_venue ?? 'Not specified'}</p>
            </div>
            <div>
              <p className="text-gray-500">Locations Covered</p>
              <p className="font-medium">{locations.join(', ') || 'Not specified'}</p>
            </div>
            <div>
              <p className="text-gray-500">Number of Guests</p>
              <p className="font-medium">{contract.num_guests ?? 'Not specified'}</p>
            </div>
          </div>
        </div>

        {/* Team */}
        <div className="mb-8">
          <h2 className="text-xl font-semibold text-teal-700 mb-4">Team</h2>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-gray-500">Photographers</p>
              <p className="font-medium">{contract.num_photographers} ({contract.photographer})</p>
            </div>
            <div>
              <p className="text-gray-500">Videographers</p>
              <p className="font-medium">{contract.num_videographers > 0 ? `${contract.num_videographers} (${contract.videographer})` : 'None'}</p>
            </div>
            <div>
              <p className="text-gray-500">Drone Photography</p>
              <p className="font-medium">{contract.drone_photography ? 'Yes' : 'No'}</p>
            </div>
          </div>
        </div>

        {/* Engagement Session */}
        {contract.engagement_session && (
          <div className="mb-8">
            <h2 className="text-xl font-semibold text-teal-700 mb-4">Engagement Session</h2>
            <div className="text-sm">
              <p className="text-gray-500">Location</p>
              <p className="font-medium">{contract.engagement_location ?? 'To be determined'}</p>
            </div>
          </div>
        )}

        {/* Products Included */}
        <div className="mb-8">
          <h2 className="text-xl font-semibold text-teal-700 mb-4">Products Included</h2>
          <div className="grid grid-cols-2 gap-4 text-sm">
            {contract.bride_groom_album_qty > 0 && (
              <div>
                <p className="text-gray-500">Wedding Album</p>
                <p className="font-medium">{contract.bride_groom_album_qty}× {contract.bride_groom_album_size} ({contract.bride_groom_album_cover})</p>
              </div>
            )}
            {contract.parent_albums_qty > 0 && (
              <div>
                <p className="text-gray-500">Parent Albums</p>
                <p className="font-medium">{contract.parent_albums_qty}× {contract.parent_albums_size}</p>
              </div>
            )}
            {contract.web_personal_page && (
              <div>
                <p className="text-gray-500">Online Gallery</p>
                <p className="font-medium">Personal wedding page</p>
              </div>
            )}
            {contract.prints_postcard_thankyou > 0 && (
              <div>
                <p className="text-gray-500">Thank You Cards</p>
                <p className="font-medium">{contract.prints_postcard_thankyou} postcards</p>
              </div>
            )}
          </div>
        </div>

        {/* Video Package */}
        {contract.num_videographers > 0 && (
          <div className="mb-8">
            <h2 className="text-xl font-semibold text-teal-700 mb-4">Video Package</h2>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-gray-500">Long Form Video</p>
                <p className="font-medium">{contract.video_long_form ? 'Yes' : 'No'}</p>
              </div>
              <div>
                <p className="text-gray-500">Highlights</p>
                <p className="font-medium">{contract.video_highlights > 0 ? `${contract.video_highlights} video(s)` : 'No'}</p>
              </div>
              <div>
                <p className="text-gray-500">Recap Video</p>
                <p className="font-medium">{contract.video_recap ? 'Yes' : 'No'}</p>
              </div>
              <div>
                <p className="text-gray-500">USB Delivery</p>
                <p className="font-medium">{contract.video_usb ? 'Yes' : 'No'}</p>
              </div>
            </div>
          </div>
        )}

        {/* Financial Summary */}
        <div className="mb-8 bg-gray-50 p-6 rounded-lg">
          <h2 className="text-xl font-semibold text-teal-700 mb-4">Financial Summary</h2>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-500">Subtotal</span>
              <span className="font-medium">${Number(contract.subtotal).toLocaleString()}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">HST (13%)</span>
              <span className="font-medium">${Number(contract.tax).toLocaleString()}</span>
            </div>
            <div className="flex justify-between text-lg font-semibold border-t pt-2">
              <span>Total</span>
              <span>${Number(contract.total).toLocaleString()}</span>
            </div>
          </div>
        </div>

        {/* Notes */}
        {contract.appointment_notes && (
          <div className="mb-8">
            <h2 className="text-xl font-semibold text-teal-700 mb-4">Notes</h2>
            <p className="text-sm text-gray-700 whitespace-pre-wrap">{contract.appointment_notes}</p>
          </div>
        )}

        {/* Signature Line */}
        <div className="mt-12 pt-8 border-t">
          <div className="grid grid-cols-2 gap-8">
            <div>
              <p className="text-sm text-gray-500 mb-8">Contract Signed</p>
              <p className="font-medium">{formatDate(contract.signed_date)}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500 mb-8">Signature</p>
              <div className="border-b border-gray-400 h-8"></div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-8 text-center text-xs text-gray-400">
          <p>SIGS Photography Ltd. • Toronto, Ontario • www.sigsphoto.ca</p>
        </div>
      </div>
    </div>
  )
}
