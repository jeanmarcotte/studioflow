'use client'

import { useState } from 'react'
import { ChevronDown, ChevronRight, AlertTriangle, ExternalLink } from 'lucide-react'
import Link from 'next/link'

interface AlertItem {
  coupleId: string
  coupleName: string
  detail: string
  daysWaiting: number
}

interface ActionAlertsProps {
  urgent: AlertItem[]
  followUp: AlertItem[]
  ready: AlertItem[]
}

export default function ActionAlerts({ urgent, followUp, ready }: ActionAlertsProps) {
  const totalCount = urgent.length + followUp.length + ready.length
  const [open, setOpen] = useState(totalCount > 0)

  if (totalCount === 0) return null

  return (
    <div className="rounded-xl border bg-card overflow-hidden">
      <button
        onClick={() => setOpen(v => !v)}
        className="flex items-center justify-between w-full p-4 hover:bg-accent/30 transition-colors"
      >
        <div className="flex items-center gap-2">
          <AlertTriangle className="h-5 w-5 text-amber-500" />
          <span className="font-semibold">Action Needed ({totalCount})</span>
        </div>
        {open ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
      </button>

      {open && (
        <div className="px-4 pb-4 space-y-4">
          {urgent.length > 0 && (
            <div>
              <div className="text-xs font-semibold uppercase tracking-wide text-red-500 mb-2 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-red-500 inline-block" />
                Urgent: Shot 30+ days ago, not quoted
              </div>
              <div className="space-y-1.5">
                {urgent.map(item => (
                  <div key={item.coupleId} className="flex items-center justify-between pl-4 py-1.5 rounded-lg hover:bg-accent/30">
                    <div className="text-sm">
                      <span className="font-medium">{item.coupleName}</span>
                      <span className="text-muted-foreground ml-2">— {item.detail}</span>
                    </div>
                    <Link
                      href={`/admin/couples/${item.coupleId}`}
                      className="text-xs font-medium text-red-600 hover:text-red-700 px-3 py-1 rounded-md border border-red-200 hover:bg-red-50 transition-colors flex items-center gap-1"
                    >
                      Quote <ExternalLink className="h-3 w-3" />
                    </Link>
                  </div>
                ))}
              </div>
            </div>
          )}

          {followUp.length > 0 && (
            <div>
              <div className="text-xs font-semibold uppercase tracking-wide text-amber-600 mb-2 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-amber-500 inline-block" />
                Follow Up: Quoted 14+ days ago, no response
              </div>
              <div className="space-y-1.5">
                {followUp.map(item => (
                  <div key={item.coupleId} className="flex items-center justify-between pl-4 py-1.5 rounded-lg hover:bg-accent/30">
                    <div className="text-sm">
                      <span className="font-medium">{item.coupleName}</span>
                      <span className="text-muted-foreground ml-2">— {item.detail}</span>
                    </div>
                    <Link
                      href={`/admin/couples/${item.coupleId}`}
                      className="text-xs font-medium text-amber-600 hover:text-amber-700 px-3 py-1 rounded-md border border-amber-200 hover:bg-amber-50 transition-colors flex items-center gap-1"
                    >
                      Remind <ExternalLink className="h-3 w-3" />
                    </Link>
                  </div>
                ))}
              </div>
            </div>
          )}

          {ready.length > 0 && (
            <div>
              <div className="text-xs font-semibold uppercase tracking-wide text-green-600 mb-2 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-green-500 inline-block" />
                Ready: Deposit received, schedule delivery
              </div>
              <div className="space-y-1.5">
                {ready.map(item => (
                  <div key={item.coupleId} className="flex items-center justify-between pl-4 py-1.5 rounded-lg hover:bg-accent/30">
                    <div className="text-sm">
                      <span className="font-medium">{item.coupleName}</span>
                      <span className="text-muted-foreground ml-2">— {item.detail}</span>
                    </div>
                    <Link
                      href={`/admin/couples/${item.coupleId}`}
                      className="text-xs font-medium text-green-600 hover:text-green-700 px-3 py-1 rounded-md border border-green-200 hover:bg-green-50 transition-colors flex items-center gap-1"
                    >
                      Schedule <ExternalLink className="h-3 w-3" />
                    </Link>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
