import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Clock, MapPin } from 'lucide-react'
import { formatMilitaryTime } from '@/lib/formatters'

interface WeddingDayFormData {
  reception_venue_name: string | null
  groom_start_time: string | null
  groom_finish_time: string | null
  bride_start_time: string | null
  bride_finish_time: string | null
  ceremony_start_time: string | null
  ceremony_finish_time: string | null
  venue_arrival_time: string | null
  park_start_time: string | null
  park_finish_time: string | null
}

interface WeddingDayItineraryProps {
  formData: WeddingDayFormData | null
}

export function WeddingDayItinerary({ formData }: WeddingDayItineraryProps) {
  if (!formData) return null

  const timeline = []

  if (formData.groom_start_time) {
    timeline.push({
      label: 'Groom Prep',
      time: `${formatMilitaryTime(formData.groom_start_time)}${formData.groom_finish_time ? ` — ${formatMilitaryTime(formData.groom_finish_time)}` : ''}`
    })
  }

  if (formData.bride_start_time) {
    timeline.push({
      label: 'Bride Prep',
      time: `${formatMilitaryTime(formData.bride_start_time)}${formData.bride_finish_time ? ` — ${formatMilitaryTime(formData.bride_finish_time)}` : ''}`
    })
  }

  if (formData.ceremony_start_time) {
    timeline.push({
      label: 'Ceremony',
      time: `${formatMilitaryTime(formData.ceremony_start_time)}${formData.ceremony_finish_time ? ` — ${formatMilitaryTime(formData.ceremony_finish_time)}` : ''}`
    })
  }

  if (formData.park_start_time) {
    timeline.push({
      label: 'Park/Photos',
      time: `${formatMilitaryTime(formData.park_start_time)}${formData.park_finish_time ? ` — ${formatMilitaryTime(formData.park_finish_time)}` : ''}`
    })
  }

  if (formData.venue_arrival_time) {
    timeline.push({
      label: 'Venue Arrival',
      time: formatMilitaryTime(formData.venue_arrival_time) || ''
    })
  }

  if (timeline.length === 0) return null

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-medium flex items-center gap-2">
          <Clock className="w-4 h-4 text-teal-600" />
          Wedding Day Timeline
        </CardTitle>
      </CardHeader>
      <CardContent>
        {/* Venue name */}
        {formData.reception_venue_name && (
          <div className="flex items-center gap-2 mb-4 pb-3 border-b">
            <MapPin className="w-4 h-4 text-gray-400" />
            <span className="text-sm font-medium text-gray-900">{formData.reception_venue_name}</span>
          </div>
        )}

        {/* Timeline */}
        <div className="relative">
          {/* Vertical line */}
          <div className="absolute left-[7px] top-2 bottom-2 w-0.5 bg-teal-200" />

          <div className="space-y-3">
            {timeline.map((item, idx) => (
              <div key={idx} className="flex items-start gap-4">
                {/* Dot */}
                <div className="w-4 h-4 rounded-full bg-teal-600 border-2 border-white shadow-sm flex-shrink-0 mt-0.5" />

                {/* Content */}
                <div className="flex-1 flex justify-between items-baseline">
                  <span className="text-sm font-medium text-gray-900">{item.label}</span>
                  <span className="text-sm text-gray-600 font-mono">{item.time}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
