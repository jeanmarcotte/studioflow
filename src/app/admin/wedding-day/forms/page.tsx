'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { differenceInDays, parseISO } from 'date-fns'
import { ChevronDown, ChevronRight, Search, Copy, ExternalLink, Check, Send, X, Loader2, Printer } from 'lucide-react'
import { ColumnDef } from '@tanstack/react-table'
import { supabase } from '@/lib/supabase'
import { ProductionPills, ProductionSidebar } from '@/components/shared'
import { DataTable, DataTableColumnHeader } from '@/components/ui/data-table'

interface WeddingFormCouple {
  couple_id: string
  couple_name: string
  wedding_date: string | null
  email: string | null
  form_id: string | null
  form_submitted_at: string | null
}

function CopyLinkButton({ coupleId }: { coupleId: string }) {
  const [copied, setCopied] = useState(false)
  const url = `https://studioflow-zeta.vercel.app/client/wedding-day-form?couple=${coupleId}`

  const handleCopy = async (e: React.MouseEvent) => {
    e.stopPropagation()
    await navigator.clipboard.writeText(url)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <button
      onClick={handleCopy}
      className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded border border-input bg-background hover:bg-muted transition-colors"
      title={url}
    >
      {copied ? <Check className="h-3 w-3 text-green-600" /> : <Copy className="h-3 w-3" />}
      {copied ? 'Copied' : 'Copy Link'}
    </button>
  )
}

export default function WeddingDayFormsPage() {
  const router = useRouter()
  const [couples, setCouples] = useState<WeddingFormCouple[]>([])
  const [loading, setLoading] = useState(true)
  const [searchValue, setSearchValue] = useState('')
  const [collapsedLanes, setCollapsedLanes] = useState<Set<string>>(new Set())
  const [showPast, setShowPast] = useState(false)
  const [showReminder, setShowReminder] = useState(false)
  const [selectedForReminder, setSelectedForReminder] = useState<Set<string>>(new Set())
  const [sending, setSending] = useState(false)
  const [sent, setSent] = useState(false)

  useEffect(() => {
    async function fetchData() {
      // Fetch ALL booked couples + ALL forms separately (no date filter in query)
      const [couplesRes, formsRes] = await Promise.all([
        supabase
          .from('couples')
          .select('id, couple_name, wedding_date, email')
          .eq('status', 'booked')
          .order('wedding_date', { ascending: true }),
        supabase
          .from('wedding_day_forms')
          .select('couple_id, id, created_at'),
      ])

      // Map couple_id → form
      const formMap = new Map<string, { id: string; created_at: string }>()
      if (formsRes.data) {
        for (const f of formsRes.data) {
          formMap.set(f.couple_id, { id: f.id, created_at: f.created_at })
        }
      }

      const merged: WeddingFormCouple[] = (couplesRes.data ?? []).map((c: any) => {
        const form = formMap.get(c.id) ?? null
        return {
          couple_id: c.id,
          couple_name: c.couple_name ?? '',
          wedding_date: c.wedding_date ?? null,
          email: c.email ?? null,
          form_id: form ? form.id : null,
          form_submitted_at: form ? form.created_at : null,
        }
      })

      setCouples(merged)
      setLoading(false)
    }
    fetchData()
  }, [])

  const toggleLane = (key: string) => {
    setCollapsedLanes((prev) => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

  const today = new Date()
  const todayStr = new Date().toISOString().split('T')[0]
  const search = searchValue.toLowerCase()

  // Split ALL couples by form status
  const allSubmitted = couples.filter(c => c.form_id !== null)
  const allMissing = couples.filter(c => c.form_id === null)

  // Apply date filter (default: future only)
  const dateFilter = (c: WeddingFormCouple) => {
    if (showPast) return true
    if (!c.wedding_date) return true
    return c.wedding_date >= todayStr
  }

  // Apply search + date filter
  const submitted = allSubmitted.filter(c =>
    dateFilter(c) && (!search || c.couple_name.toLowerCase().includes(search))
  )
  const missing = allMissing.filter(c =>
    dateFilter(c) && (!search || c.couple_name.toLowerCase().includes(search))
  )

  const submittedCount = allSubmitted.filter(dateFilter).length
  const missingCount = allMissing.filter(dateFilter).length
  const totalCount = submittedCount + missingCount

  // Columns for submitted forms
  const submittedColumns: ColumnDef<WeddingFormCouple>[] = [
    {
      accessorKey: 'couple_name',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Couple" />,
      cell: ({ row }) => (
        <button
          onClick={() => router.push(`/admin/couples/${row.original.couple_id}`)}
          className="text-blue-600 hover:underline font-medium text-left"
        >
          {row.original.couple_name}
        </button>
      ),
    },
    {
      accessorKey: 'wedding_date',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Wedding Date" />,
      cell: ({ row }) => {
        const d = row.original.wedding_date
        if (!d) return <span className="text-muted-foreground">—</span>
        return (
          <span>
            {new Date(d + 'T00:00:00').toLocaleDateString('en-CA', {
              year: 'numeric',
              month: 'short',
              day: 'numeric',
            })}
          </span>
        )
      },
    },
    {
      accessorKey: 'form_submitted_at',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Form Submitted" />,
      cell: ({ row }) => {
        const d = row.original.form_submitted_at
        if (!d) return <span className="text-muted-foreground">—</span>
        return (
          <span>
            {new Date(d).toLocaleDateString('en-US', {
              month: 'short',
              day: 'numeric',
              year: 'numeric',
            })}
          </span>
        )
      },
    },
    {
      id: 'actions',
      header: 'Actions',
      cell: ({ row }) => (
        <div className="flex gap-1">
          <a
            href={`/client/wedding-day-form?couple=${row.original.couple_id}`}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded border border-input bg-background hover:bg-muted transition-colors"
          >
            <ExternalLink className="h-3 w-3" />
            View
          </a>
          <button
            onClick={(e) => {
              e.stopPropagation()
              window.open(`/admin/wedding-day/forms/${row.original.couple_id}/print`, '_blank')
            }}
            className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded border border-input bg-background hover:bg-muted transition-colors"
          >
            <Printer className="h-3 w-3" />
            Print
          </button>
        </div>
      ),
    },
  ]

  // Columns for missing forms
  const missingColumns: ColumnDef<WeddingFormCouple>[] = [
    {
      accessorKey: 'couple_name',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Couple" />,
      cell: ({ row }) => (
        <button
          onClick={() => router.push(`/admin/couples/${row.original.couple_id}`)}
          className="text-blue-600 hover:underline font-medium text-left"
        >
          {row.original.couple_name}
        </button>
      ),
    },
    {
      accessorKey: 'wedding_date',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Wedding Date" />,
      cell: ({ row }) => {
        const d = row.original.wedding_date
        if (!d) return <span className="text-muted-foreground">—</span>
        return (
          <span>
            {new Date(d + 'T00:00:00').toLocaleDateString('en-CA', {
              year: 'numeric',
              month: 'short',
              day: 'numeric',
            })}
          </span>
        )
      },
    },
    {
      id: 'days_until_wedding',
      accessorFn: (row) => {
        if (!row.wedding_date) return Infinity
        return differenceInDays(parseISO(row.wedding_date), today)
      },
      header: ({ column }) => <DataTableColumnHeader column={column} title="Days Until Wedding" />,
      cell: ({ row }) => {
        const d = row.original.wedding_date
        if (!d) return <span className="text-muted-foreground">—</span>
        const days = differenceInDays(parseISO(d), today)
        if (days === 0) return <span className="text-red-600 font-semibold">Today</span>
        if (days <= 14)
          return <span className="text-red-600 font-semibold">{days} days</span>
        if (days <= 30)
          return <span className="text-amber-600 font-medium">{days} days</span>
        return <span>{days} days</span>
      },
    },
    {
      id: 'actions',
      header: 'Actions',
      cell: ({ row }) => (
        <CopyLinkButton coupleId={row.original.couple_id} />
      ),
    },
  ]

  return (
    <div className="space-y-0">
      {/* Header */}
      <div className="px-6 pt-6 pb-4 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Wedding Day Forms</h1>
          <p className="text-sm text-muted-foreground">2026 season — client submissions</p>
        </div>
        <button
          onClick={() => {
            setSelectedForReminder(new Set(missing.map(c => c.couple_id)))
            setSent(false)
            setShowReminder(true)
          }}
          className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90 transition-colors"
        >
          <Send className="h-4 w-4" />
          Send Reminder
        </button>
      </div>

      <ProductionPills
        pills={[
          { label: 'Submitted', count: submittedCount, color: 'green' },
          { label: 'Missing', count: missingCount, color: 'red' },
          { label: 'Total', count: totalCount, color: 'default' },
        ]}
      />

      <div className="flex">
        <div className="flex-1 overflow-y-auto p-6 border-r border-border">
          {/* Search + Toggle */}
          <div className="flex items-center gap-4 mb-6">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search couples..."
                value={searchValue}
                onChange={(e) => setSearchValue(e.target.value)}
                className="w-full pl-9 pr-4 py-2 text-sm border border-input rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-ring"
                style={{ paddingLeft: '2.25rem' }}
              />
            </div>
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={showPast}
                onChange={(e) => setShowPast(e.target.checked)}
                className="rounded"
              />
              <span className="text-sm text-muted-foreground">Show past weddings</span>
            </label>
          </div>

          {loading ? (
            <div className="text-sm text-muted-foreground py-8 text-center">Loading...</div>
          ) : (
            <>
              {/* Submitted Forms Section */}
              <div id="section-submitted" className="mb-6">
                <button
                  onClick={() => toggleLane('submitted')}
                  className="w-full flex items-center justify-between px-4 py-3 bg-secondary/50 rounded-lg mb-3 hover:bg-secondary/80 transition-colors"
                >
                  <div className="flex items-center gap-2">
                    {collapsedLanes.has('submitted') ? (
                      <ChevronRight className="h-4 w-4 text-muted-foreground" />
                    ) : (
                      <ChevronDown className="h-4 w-4 text-muted-foreground" />
                    )}
                    <span className="font-semibold text-sm">Submitted Forms</span>
                    <span className="text-xs rounded-full px-2 py-0.5 font-medium bg-green-100 text-green-700">
                      {submittedCount}
                    </span>
                  </div>
                </button>
                {!collapsedLanes.has('submitted') && (
                  <DataTable
                    columns={submittedColumns}
                    data={submitted}
                    showPagination={submitted.length > 20}
                    pageSize={20}
                    emptyMessage="No submitted forms."
                  />
                )}
              </div>

              {/* Missing Forms Section */}
              <div id="section-missing" className="mb-6">
                <button
                  onClick={() => toggleLane('missing')}
                  className="w-full flex items-center justify-between px-4 py-3 bg-secondary/50 rounded-lg mb-3 hover:bg-secondary/80 transition-colors"
                >
                  <div className="flex items-center gap-2">
                    {collapsedLanes.has('missing') ? (
                      <ChevronRight className="h-4 w-4 text-muted-foreground" />
                    ) : (
                      <ChevronDown className="h-4 w-4 text-muted-foreground" />
                    )}
                    <span className="font-semibold text-sm">Missing Forms</span>
                    <span className="text-xs rounded-full px-2 py-0.5 font-medium bg-red-100 text-red-700">
                      {missingCount}
                    </span>
                  </div>
                </button>
                {!collapsedLanes.has('missing') && (
                  <DataTable
                    columns={missingColumns}
                    data={missing}
                    showPagination={missing.length > 20}
                    pageSize={20}
                    emptyMessage="No missing forms — all couples have submitted!"
                  />
                )}
              </div>
            </>
          )}
        </div>

        <ProductionSidebar
          boxes={[
            { label: 'TOTAL COUPLES', value: totalCount, scrollToId: 'section-missing', color: 'default' },
            { label: 'SUBMITTED', value: submittedCount, scrollToId: 'section-submitted', color: 'green' },
            { label: 'MISSING', value: missingCount, scrollToId: 'section-missing', color: 'red' },
            {
              label: 'COMPLETION',
              value: `${totalCount > 0 ? Math.round((submittedCount / totalCount) * 100) : 0}%`,
              scrollToId: 'section-submitted',
              color: 'teal',
            },
          ]}
        />
      </div>

      {/* Send Reminder Modal */}
      {showReminder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setShowReminder(false)}>
          <div className="bg-card rounded-xl border shadow-xl w-full max-w-lg mx-4 max-h-[80vh] flex flex-col" onClick={e => e.stopPropagation()}>
            <div className="p-5 border-b flex items-center justify-between flex-shrink-0">
              <h2 className="font-semibold">Send Form Reminder</h2>
              <button onClick={() => setShowReminder(false)} className="rounded-lg p-1 hover:bg-accent transition-colors">
                <X className="h-5 w-5" />
              </button>
            </div>

            {sent ? (
              <div className="p-8 text-center">
                <Check className="h-10 w-10 text-green-600 mx-auto mb-3" />
                <p className="font-semibold">Reminders sent!</p>
                <p className="text-sm text-muted-foreground mt-1">{selectedForReminder.size} email(s) queued</p>
                <button onClick={() => setShowReminder(false)} className="mt-4 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium">
                  Close
                </button>
              </div>
            ) : (
              <>
                <div className="p-4 border-b text-sm text-muted-foreground">
                  Select couples to send a reminder email with their form link.
                  <div className="flex gap-2 mt-2">
                    <button
                      onClick={() => setSelectedForReminder(new Set(missing.map(c => c.couple_id)))}
                      className="text-xs text-blue-600 hover:underline"
                    >
                      Select all
                    </button>
                    <button
                      onClick={() => setSelectedForReminder(new Set())}
                      className="text-xs text-blue-600 hover:underline"
                    >
                      Clear all
                    </button>
                  </div>
                </div>
                <div className="divide-y overflow-y-auto flex-1">
                  {missing.map(c => (
                    <label key={c.couple_id} className="flex items-center gap-3 p-3 hover:bg-accent/50 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={selectedForReminder.has(c.couple_id)}
                        onChange={() => {
                          setSelectedForReminder(prev => {
                            const next = new Set(prev)
                            if (next.has(c.couple_id)) next.delete(c.couple_id)
                            else next.add(c.couple_id)
                            return next
                          })
                        }}
                        className="rounded"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium">{c.couple_name}</div>
                        <div className="text-xs text-muted-foreground">{c.email || 'No email'}</div>
                      </div>
                      {c.wedding_date && (
                        <span className="text-xs text-muted-foreground flex-shrink-0">
                          {new Date(c.wedding_date + 'T00:00:00').toLocaleDateString('en-CA', { month: 'short', day: 'numeric' })}
                        </span>
                      )}
                    </label>
                  ))}
                </div>
                <div className="p-4 border-t flex items-center justify-between flex-shrink-0">
                  <span className="text-sm text-muted-foreground">{selectedForReminder.size} selected</span>
                  <button
                    onClick={async () => {
                      setSending(true)
                      try {
                        const selected = missing.filter(c => selectedForReminder.has(c.couple_id))
                        await fetch('/api/wedding-day-forms/send-reminders', {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ couples: selected.map(c => ({
                            couple_id: c.couple_id,
                            couple_name: c.couple_name,
                            email: c.email,
                            wedding_date: c.wedding_date,
                          })) }),
                        })
                        setSent(true)
                      } catch (err) {
                        console.error('Failed to send reminders:', err)
                      } finally {
                        setSending(false)
                      }
                    }}
                    disabled={sending || selectedForReminder.size === 0}
                    className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                    {sending ? 'Sending...' : `Send ${selectedForReminder.size} Reminder${selectedForReminder.size !== 1 ? 's' : ''}`}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
