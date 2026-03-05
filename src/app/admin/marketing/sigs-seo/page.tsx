'use client'

import { useEffect, useState } from 'react'
import { Search, ExternalLink, TrendingUp, TrendingDown, Hash, MapPin } from 'lucide-react'
import { supabase } from '@/lib/supabase'

interface KeywordRow {
  keyword: string
  type: string | null
  city: string | null
  position: number | null
  clicks: number
  impressions: number
  ctr: string | null
  status: string | null
  recorded_date: string
}

interface CityBreakdown {
  city: string
  ranked: number
  bestPosition: number | null
  page1Count: number
  badge: 'green' | 'yellow' | 'red'
}

const CITIES = ['Toronto', 'Vaughan', 'Mississauga', 'Markham', 'Richmond Hill', 'Brampton', 'Scarborough', 'Hamilton']

function statusBadge(badge: CityBreakdown['badge']) {
  const config = {
    green: { label: 'Page 1', style: 'text-green-700 bg-green-50 border-green-200' },
    yellow: { label: 'Top 20', style: 'text-amber-700 bg-amber-50 border-amber-200' },
    red: { label: 'Needs Work', style: 'text-red-700 bg-red-50 border-red-200' },
  }
  const c = config[badge]
  return (
    <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${c.style}`}>
      {c.label}
    </span>
  )
}

export default function SigsSeoPage() {
  const [data, setData] = useState<KeywordRow[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchData() {
      const { data: rows, error } = await supabase
        .from('seo_keyword_rankings')
        .select('keyword, type, city, position, clicks, impressions, ctr, status, recorded_date')
        .order('recorded_date', { ascending: false })

      if (!error && rows) {
        setData(rows)
      }
      setLoading(false)
    }
    fetchData()
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    )
  }

  const latestDate = data[0]?.recorded_date ?? '—'
  const latestData = data.filter(r => r.recorded_date === latestDate)

  const totalKeywords = latestData.length
  const rankedCount = latestData.filter(r => r.status === 'ranked').length
  const notRankedCount = latestData.filter(r => r.status === 'not ranked').length
  const citiesOnPage1 = new Set(
    latestData.filter(r => r.position !== null && r.position <= 10).map(r => r.city)
  ).size

  const cityRows: CityBreakdown[] = CITIES.map(city => {
    const cityData = latestData.filter(r => r.type === 'city' && r.city === city)
    const rankedInCity = cityData.filter(r => r.status === 'ranked')
    const positions = rankedInCity.map(r => r.position).filter((p): p is number => p !== null)
    const bestPosition = positions.length > 0 ? Math.min(...positions) : null
    const page1Count = positions.filter(p => p <= 10).length

    let badge: CityBreakdown['badge'] = 'red'
    if (page1Count > 0) badge = 'green'
    else if (bestPosition !== null && bestPosition < 20) badge = 'yellow'

    return { city, ranked: rankedInCity.length, bestPosition, page1Count, badge }
  })

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold">SIGS SEO Rankings</h1>
        <p className="text-muted-foreground">
          Live keyword tracking for sigsphoto.ca across the GTA
        </p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="rounded-xl border bg-card p-5">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-medium text-muted-foreground">Total Keywords</span>
            <div className="rounded-lg p-2 text-blue-600 bg-blue-50">
              <Hash className="h-4 w-4" />
            </div>
          </div>
          <div className="text-2xl font-bold">{totalKeywords}</div>
          <p className="text-xs text-muted-foreground mt-1">tracked in database</p>
        </div>

        <div className="rounded-xl border bg-card p-5">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-medium text-muted-foreground">Ranked</span>
            <div className="rounded-lg p-2 text-green-600 bg-green-50">
              <TrendingUp className="h-4 w-4" />
            </div>
          </div>
          <div className="text-2xl font-bold">{rankedCount}</div>
          <p className="text-xs text-muted-foreground mt-1">keywords with position</p>
        </div>

        <div className="rounded-xl border bg-card p-5">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-medium text-muted-foreground">Not Ranked</span>
            <div className="rounded-lg p-2 text-red-600 bg-red-50">
              <TrendingDown className="h-4 w-4" />
            </div>
          </div>
          <div className="text-2xl font-bold">{notRankedCount}</div>
          <p className="text-xs text-muted-foreground mt-1">no position yet</p>
        </div>

        <div className="rounded-xl border bg-card p-5">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-medium text-muted-foreground">Cities on Page 1</span>
            <div className="rounded-lg p-2 text-amber-600 bg-amber-50">
              <MapPin className="h-4 w-4" />
            </div>
          </div>
          <div className="text-2xl font-bold">{citiesOnPage1}</div>
          <p className="text-xs text-muted-foreground mt-1">with a top-10 keyword</p>
        </div>
      </div>

      <div className="rounded-xl border bg-card">
        <div className="p-5 border-b">
          <h2 className="font-semibold flex items-center gap-2">
            <Search className="h-4 w-4 text-blue-600" />
            City Breakdown
          </h2>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="text-left font-medium px-5 py-3">City</th>
                <th className="text-left font-medium px-5 py-3">Keywords Ranked</th>
                <th className="text-left font-medium px-5 py-3">Best Position</th>
                <th className="text-left font-medium px-5 py-3">Page 1 Count</th>
                <th className="text-left font-medium px-5 py-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {cityRows.map(row => (
                <tr key={row.city} className="hover:bg-accent/50 transition-colors">
                  <td className="px-5 py-3 font-medium">{row.city}</td>
                  <td className="px-5 py-3">{row.ranked}</td>
                  <td className="px-5 py-3">
                    {row.bestPosition !== null ? `#${row.bestPosition}` : '—'}
                  </td>
                  <td className="px-5 py-3">{row.page1Count}</td>
                  <td className="px-5 py-3">{statusBadge(row.badge)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="px-5 py-3 border-t text-xs text-muted-foreground flex items-center justify-between">
          <span>Recorded date: {latestDate}</span>
          <a
            href="https://sigsphoto.ca"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 hover:text-foreground transition-colors"
          >
            sigsphoto.ca <ExternalLink className="h-3 w-3" />
          </a>
        </div>
      </div>
    </div>
  )
}
