import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Check, Clock, Minus, ExternalLink } from 'lucide-react'
import Link from 'next/link'

interface FormItem {
  name: string
  status: 'complete' | 'awaiting' | 'na'
  viewUrl?: string
}

interface FormsCardProps {
  forms: FormItem[]
}

export function FormsCard({ forms }: FormsCardProps) {
  const statusIcon = {
    complete: <Check className="w-5 h-5 text-green-500" />,
    awaiting: <Clock className="w-5 h-5 text-yellow-500" />,
    na: <Minus className="w-5 h-5 text-gray-300" />
  }

  const statusLabel = {
    complete: null,
    awaiting: 'Awaiting',
    na: 'N/A'
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-medium">Forms</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {forms.map((form) => (
          <div key={form.name} className="flex items-center justify-between py-2 border-b last:border-0">
            <div className="flex items-center gap-3">
              {statusIcon[form.status]}
              <span className="text-sm text-gray-900">{form.name}</span>
            </div>
            {form.status === 'complete' && form.viewUrl ? (
              <Link href={form.viewUrl} className="text-sm text-teal-600 hover:text-teal-700 flex items-center gap-1">
                View <ExternalLink className="w-3 h-3" />
              </Link>
            ) : statusLabel[form.status] ? (
              <span className="text-sm text-gray-400">{statusLabel[form.status]}</span>
            ) : null}
          </div>
        ))}
      </CardContent>
    </Card>
  )
}
