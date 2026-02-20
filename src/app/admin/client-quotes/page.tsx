'use client'

import { useState, useEffect, useMemo } from 'react'
import { supabase } from '@/lib/supabase'
import { FileText, Search, ChevronUp, ChevronDown } from 'lucide-react'
import { format, parseISO } from 'date-fns'

interface Quote {
  id: string
  couple_id: string | null
  quote_type: string | null
  quote_date: string | null
  subtotal: number | null
  tax: number | null
  total: number | null
  status: string | null
  sent_date: string | null
  created_at: string | null
  couples: { couple_name: string } | null
}

type SortField = 'couple_name' | 'quote_date' | 'total' | 'status' | 'created_at'
type SortDir = 'asc' | 'desc'

const STATUSES = [
  { value: 'all', label: 'All Statuses' },
  { value: 'draft', label: 'Draft' },
  { value: 'sent', label: 'Sent' },
  { value: 'accepted', label: 'Accepted' },
  { value: 'expired', label: 'Expired' },
]

function statusBadge(status: string | null) {
  if (!status) return <span className="text-muted-foreground text-xs">—</span>
  const map: Record<string, string> = {
    draft: 'bg-gray-100 text-gray-700',
    sent: 'bg-blue-100 text-blue-700',
    accepted: 'bg-green-100 text-green-700',
    expired: 'bg-red-100 text-red-700',
  }
  const cls = map[status] || 'bg-gray-100 text-gray-600'
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${cls}`}>
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  )
}

function formatQuoteType(type: string | null): string {
  if (!type) return '—'
  if (type === 'photo_only') return 'Photo Only'
  if (type === 'photo_video') return 'Photo + Video'
  return type
}

export default function ClientQuotesPage() {
  const [quotes, setQuotes] = useState<Quote[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [sortField, setSortField] = useState<SortField>('created_at')
  const [sortDir, setSortDir] = useState<SortDir>('desc')

  useEffect(() => {
    const fetchQuotes = async () => {
      const { data, error } = await supabase
        .from('quotes')
        .select('id, couple_id, quote_type, quote_date, subtotal, tax, total, status, sent_date, created_at, couples(couple_name)')
        .order('created_at', { ascending: false })

      if (!error && data) {
        setQuotes(data as unknown as Quote[])
      }
      setLoading(false)
    }
    fetchQuotes()
  }, [])

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortDir('asc')
    }
  }

  const filtered = useMemo(() => {
    let result = [...quotes]

    if (search.trim()) {
      const q = search.toLowerCase()
      result = result.filter(r =>
        r.couples?.couple_name?.toLowerCase().includes(q) ||
        r.quote_type?.toLowerCase().includes(q)
      )
    }

    if (statusFilter !== 'all') {
      result = result.filter(r => r.status === statusFilter)
    }

    result.sort((a, b) => {
      let cmp = 0
      switch (sortField) {
        case 'couple_name':
          cmp = (a.couples?.couple_name || '').localeCompare(b.couples?.couple_name || '')
          break
        case 'quote_date':
          cmp = (a.quote_date || '').localeCompare(b.quote_date || '')
          break
        case 'total':
          cmp = (Number(a.total) || 0) - (Number(b.total) || 0)
          break
        case 'status':
          cmp = (a.status || '').localeCompare(b.status || '')
          break
        case 'created_at':
          cmp = (a.created_at || '').localeCompare(b.created_at || '')
          break
      }
      return sortDir === 'asc' ? cmp : -cmp
    })

    return result
  }, [quotes, search, statusFilter, sortField, sortDir])

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return <ChevronUp className="h-3 w-3 opacity-0 group-hover:opacity-30" />
    return sortDir === 'asc'
      ? <ChevronUp className="h-3 w-3" />
      : <ChevronDown className="h-3 w-3" />
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold">Client Quotes</h1>
        <p className="text-muted-foreground">{quotes.length} quotes from the quote builder</p>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search by couple name..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 !w-full"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="!w-auto"
        >
          {STATUSES.map(s => (
            <option key={s.value} value={s.value}>{s.label}</option>
          ))}
        </select>
      </div>

      {/* Results count */}
      <div className="text-sm text-muted-foreground">
        Showing {filtered.length} of {quotes.length} quotes
        {statusFilter !== 'all' && ` — ${statusFilter}`}
      </div>

      {/* Table */}
      <div className="rounded-xl border bg-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="text-left p-3 font-medium">
                  <button onClick={() => handleSort('couple_name')} className="group flex items-center gap-1 hover:text-foreground">
                    Couple <SortIcon field="couple_name" />
                  </button>
                </th>
                <th className="text-left p-3 font-medium hidden md:table-cell">Type</th>
                <th className="text-left p-3 font-medium">
                  <button onClick={() => handleSort('quote_date')} className="group flex items-center gap-1 hover:text-foreground">
                    Quote Date <SortIcon field="quote_date" />
                  </button>
                </th>
                <th className="text-left p-3 font-medium hidden md:table-cell">
                  <button onClick={() => handleSort('status')} className="group flex items-center gap-1 hover:text-foreground">
                    Status <SortIcon field="status" />
                  </button>
                </th>
                <th className="text-right p-3 font-medium">
                  <button onClick={() => handleSort('total')} className="group flex items-center gap-1 justify-end hover:text-foreground">
                    Total <SortIcon field="total" />
                  </button>
                </th>
                <th className="text-left p-3 font-medium hidden lg:table-cell">
                  <button onClick={() => handleSort('created_at')} className="group flex items-center gap-1 hover:text-foreground">
                    Created <SortIcon field="created_at" />
                  </button>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-muted-foreground">
                    <FileText className="h-8 w-8 mx-auto mb-2 opacity-30" />
                    No quotes found.
                  </td>
                </tr>
              ) : (
                filtered.map((quote) => (
                  <tr key={quote.id} className="hover:bg-accent/50 transition-colors">
                    <td className="p-3">
                      <div className="font-medium">{quote.couples?.couple_name || 'Unknown'}</div>
                    </td>
                    <td className="p-3 hidden md:table-cell text-muted-foreground">
                      {formatQuoteType(quote.quote_type)}
                    </td>
                    <td className="p-3">
                      {quote.quote_date
                        ? format(parseISO(quote.quote_date), 'MMM d, yyyy')
                        : <span className="text-muted-foreground">—</span>
                      }
                    </td>
                    <td className="p-3 hidden md:table-cell">
                      {statusBadge(quote.status)}
                    </td>
                    <td className="p-3 text-right">
                      {quote.total
                        ? <span className="font-medium">${Number(quote.total).toLocaleString()}</span>
                        : <span className="text-muted-foreground">—</span>
                      }
                    </td>
                    <td className="p-3 hidden lg:table-cell text-muted-foreground">
                      {quote.created_at
                        ? format(parseISO(quote.created_at), 'MMM d, yyyy')
                        : '—'
                      }
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
