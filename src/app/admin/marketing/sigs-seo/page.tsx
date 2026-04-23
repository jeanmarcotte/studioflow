'use client'

import { useEffect, useState, useMemo } from 'react'
import { Search, ExternalLink, TrendingUp, TrendingDown, Hash, MapPin, Building, Shield, ChevronDown, ChevronRight, Clock, Zap } from 'lucide-react'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import { supabase } from '@/lib/supabase'
import { formatDate } from '@/lib/formatters'

interface KeywordRow {
  keyword: string
  type: string | null
  city: string | null
  venue: string | null
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

interface AuditScore {
  audit_date: string
  source: string
  category: string
  score: number
  max_score: number
}

interface AuditItem {
  id: string
  audit_date: string
  item_number: number
  priority: 'critical' | 'high' | 'medium' | 'low'
  title: string
  description: string | null
  category: string
  source: string
  time_estimate: string | null
  impact: 'high' | 'medium' | 'low'
  status: 'open' | 'in_progress' | 'done' | 'wont_fix'
}

const CITIES = ['Toronto', 'Vaughan', 'Mississauga', 'Markham', 'Richmond Hill', 'Brampton', 'Scarborough', 'Hamilton']

const PRIORITY_ORDER: Record<string, number> = { critical: 0, high: 1, medium: 2, low: 3 }
const IMPACT_ORDER: Record<string, number> = { high: 0, medium: 1, low: 2 }
const STATUS_ORDER: Record<string, number> = { open: 0, in_progress: 1, done: 2, wont_fix: 3 }

type AuditSortField = 'item_number' | 'priority' | 'title' | 'category' | 'source' | 'time_estimate' | 'impact' | 'status'

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

function priorityBadge(priority: string) {
  const config: Record<string, string> = {
    critical: 'text-red-700 bg-red-50 border-red-200',
    high: 'text-orange-700 bg-orange-50 border-orange-200',
    medium: 'text-amber-700 bg-amber-50 border-amber-200',
    low: 'text-gray-600 bg-gray-50 border-gray-200',
  }
  return (
    <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium ${config[priority] || config.low}`}>
      {priority}
    </span>
  )
}

function impactBadge(impact: string) {
  const config: Record<string, string> = {
    high: 'text-green-700 bg-green-50 border-green-200',
    medium: 'text-amber-700 bg-amber-50 border-amber-200',
    low: 'text-gray-600 bg-gray-50 border-gray-200',
  }
  return (
    <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium ${config[impact] || config.low}`}>
      {impact}
    </span>
  )
}

function itemStatusBadge(status: string) {
  const config: Record<string, { label: string; style: string }> = {
    open: { label: 'Open', style: 'text-gray-600 bg-white border-gray-300' },
    in_progress: { label: 'In Progress', style: 'text-blue-700 bg-blue-50 border-blue-200' },
    done: { label: 'Done', style: 'text-green-700 bg-green-50 border-green-200' },
    wont_fix: { label: "Won't Fix", style: 'text-gray-500 bg-gray-50 border-gray-200' },
  }
  const c = config[status] || config.open
  return (
    <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium ${c.style}`}>
      {c.label}
    </span>
  )
}

function sourceBadge(source: string) {
  const label = source === 'sitemap_audit' ? 'Sitemap' : 'SEO'
  const style = source === 'sitemap_audit'
    ? 'text-purple-600 bg-purple-50 border-purple-200'
    : 'text-blue-600 bg-blue-50 border-blue-200'
  return (
    <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium ${style}`}>
      {label}
    </span>
  )
}

function scoreColor(pct: number) {
  if (pct >= 70) return 'text-green-600'
  if (pct >= 50) return 'text-amber-600'
  return 'text-red-600'
}

function barColor(pct: number) {
  if (pct >= 70) return 'bg-green-500'
  if (pct >= 50) return 'bg-amber-500'
  return 'bg-red-500'
}

function trendArrow(current: number, previous: number | null) {
  if (previous === null) return null
  if (current > previous) return <span className="text-green-600 ml-1">↑</span>
  if (current < previous) return <span className="text-red-600 ml-1">↓</span>
  return <span className="text-muted-foreground ml-1">→</span>
}

export default function SigsSeoPage() {
  const [data, setData] = useState<KeywordRow[]>([])
  const [loading, setLoading] = useState(true)
  const [auditScores, setAuditScores] = useState<AuditScore[]>([])
  const [prevAuditScores, setPrevAuditScores] = useState<AuditScore[]>([])
  const [auditItems, setAuditItems] = useState<AuditItem[]>([])
  const [priorityFilter, setPriorityFilter] = useState<string>('all')
  const [auditSortField, setAuditSortField] = useState<AuditSortField>('item_number')
  const [auditSortDir, setAuditSortDir] = useState<'asc' | 'desc'>('asc')
  const [expandedItems, setExpandedItems] = useState<Set<number>>(new Set())

  useEffect(() => {
    async function fetchData() {
      const [keywordRes, scoresRes, itemsRes] = await Promise.all([
        supabase
          .from('seo_keyword_rankings')
          .select('keyword, type, city, venue, position, clicks, impressions, ctr, status, recorded_date')
          .order('recorded_date', { ascending: false }),
        supabase
          .from('seo_audit_scores')
          .select('*')
          .order('audit_date', { ascending: false }),
        supabase
          .from('seo_audit_items')
          .select('*')
          .order('item_number', { ascending: true }),
      ])

      if (!keywordRes.error && keywordRes.data) {
        setData(keywordRes.data)
      }

      if (!scoresRes.error && scoresRes.data && scoresRes.data.length > 0) {
        const allScores = scoresRes.data as AuditScore[]
        const dates = Array.from(new Set(allScores.map(s => s.audit_date))).sort().reverse()
        setAuditScores(allScores.filter(s => s.audit_date === dates[0]))
        if (dates.length > 1) {
          setPrevAuditScores(allScores.filter(s => s.audit_date === dates[1]))
        }
      }

      if (!itemsRes.error && itemsRes.data && itemsRes.data.length > 0) {
        const allItems = itemsRes.data as AuditItem[]
        const dates = Array.from(new Set(allItems.map(i => i.audit_date))).sort().reverse()
        setAuditItems(allItems.filter(i => i.audit_date === dates[0]))
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

  // ─── Keyword ranking computed values (existing, unchanged) ────────
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

  const venueKeywords = latestData
    .filter(r => r.type === 'venue' && r.status === 'ranked' && r.position !== null)
    .sort((a, b) => (a.position ?? 999) - (b.position ?? 999))
    .slice(0, 20)

  const venuesWithRankings = new Set(
    latestData.filter(r => r.type === 'venue' && r.status === 'ranked').map(r => r.venue)
  ).size

  const dateMap = new Map<string, { ranked: number; page1: number }>()
  for (const row of data) {
    const d = row.recorded_date
    if (!dateMap.has(d)) dateMap.set(d, { ranked: 0, page1: 0 })
    const entry = dateMap.get(d)!
    if (row.status === 'ranked') {
      entry.ranked++
      if (row.position !== null && row.position <= 10) entry.page1++
    }
  }
  const chartData = Array.from(dateMap.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, counts]) => ({ date, ...counts }))

  // ─── Audit computed values ────────────────────────────────────────
  const seoScores = auditScores.filter(s => s.source === 'seo_audit')
  const sitemapScores = auditScores.filter(s => s.source === 'sitemap_audit')
  const prevSeoScores = prevAuditScores.filter(s => s.source === 'seo_audit')
  const prevSitemapScores = prevAuditScores.filter(s => s.source === 'sitemap_audit')

  const overallScore = seoScores.length > 0
    ? Math.round(seoScores.reduce((sum, s) => sum + (s.score / s.max_score) * 100, 0) / seoScores.length)
    : null
  const prevOverallScore = prevSeoScores.length > 0
    ? Math.round(prevSeoScores.reduce((sum, s) => sum + (s.score / s.max_score) * 100, 0) / prevSeoScores.length)
    : null

  const auditDate = auditScores[0]?.audit_date
  const auditDateFormatted = auditDate
    ? formatDate(auditDate)
    : '—'

  const priorityCounts: Record<string, number> = {
    all: auditItems.length,
    critical: auditItems.filter(i => i.priority === 'critical').length,
    high: auditItems.filter(i => i.priority === 'high').length,
    medium: auditItems.filter(i => i.priority === 'medium').length,
    low: auditItems.filter(i => i.priority === 'low').length,
  }

  const filteredItems = (() => {
    let items = priorityFilter === 'all'
      ? [...auditItems]
      : auditItems.filter(i => i.priority === priorityFilter)

    items.sort((a, b) => {
      let cmp = 0
      switch (auditSortField) {
        case 'item_number':
          cmp = a.item_number - b.item_number
          break
        case 'priority':
          cmp = (PRIORITY_ORDER[a.priority] ?? 9) - (PRIORITY_ORDER[b.priority] ?? 9)
          break
        case 'title':
          cmp = a.title.localeCompare(b.title)
          break
        case 'category':
          cmp = a.category.localeCompare(b.category)
          break
        case 'source':
          cmp = a.source.localeCompare(b.source)
          break
        case 'time_estimate':
          cmp = (a.time_estimate || '').localeCompare(b.time_estimate || '')
          break
        case 'impact':
          cmp = (IMPACT_ORDER[a.impact] ?? 9) - (IMPACT_ORDER[b.impact] ?? 9)
          break
        case 'status':
          cmp = (STATUS_ORDER[a.status] ?? 9) - (STATUS_ORDER[b.status] ?? 9)
          break
      }
      return auditSortDir === 'asc' ? cmp : -cmp
    })

    return items
  })()

  const quickWins = auditItems.filter(i =>
    i.time_estimate && /min/i.test(i.time_estimate) && i.impact === 'high' && i.status !== 'done' && i.status !== 'wont_fix'
  )

  function handleAuditSort(field: AuditSortField) {
    if (auditSortField === field) {
      setAuditSortDir(d => d === 'asc' ? 'desc' : 'asc')
    } else {
      setAuditSortField(field)
      setAuditSortDir('asc')
    }
  }

  function toggleExpand(itemNumber: number) {
    setExpandedItems(prev => {
      const next = new Set(prev)
      if (next.has(itemNumber)) next.delete(itemNumber)
      else next.add(itemNumber)
      return next
    })
  }

  function SortIcon({ field }: { field: AuditSortField }) {
    if (auditSortField !== field) return <span className="text-muted-foreground/40 ml-0.5">↕</span>
    return <span className="text-blue-600 ml-0.5">{auditSortDir === 'asc' ? '↑' : '↓'}</span>
  }

  return (
    <div className="p-4 md:p-6 space-y-8">
      {/* ═══════════════════════════════════════════════════════════════
          EXISTING: Keyword Rankings (unchanged)
         ═══════════════════════════════════════════════════════════════ */}
      <div>
        <h1 className="text-xl md:text-2xl font-bold">SIGS SEO Rankings</h1>
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

      {chartData.length > 1 && (
        <div className="rounded-xl border bg-card">
          <div className="p-5 border-b">
            <h2 className="font-semibold flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-blue-600" />
              Ranking Progress Over Time
            </h2>
          </div>
          <div className="p-5">
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="ranked" name="Total Ranked" stroke="#2563eb" strokeWidth={2} dot={{ r: 4 }} />
                <Line type="monotone" dataKey="page1" name="Page 1 (Top 10)" stroke="#16a34a" strokeWidth={2} dot={{ r: 4 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

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

      </div>

      <div className="rounded-xl border bg-card p-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="rounded-lg p-2 text-purple-600 bg-purple-50">
              <Building className="h-4 w-4" />
            </div>
            <div>
              <div className="text-2xl font-bold">{venuesWithRankings} <span className="text-sm font-normal text-muted-foreground">of 46</span></div>
              <p className="text-xs text-muted-foreground">venues have ranked keywords</p>
            </div>
          </div>
        </div>
      </div>

      {venueKeywords.length > 0 && (
        <div className="rounded-xl border bg-card">
          <div className="p-5 border-b">
            <h2 className="font-semibold flex items-center gap-2">
              <Building className="h-4 w-4 text-purple-600" />
              Top Ranked Venue Keywords
            </h2>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="text-left font-medium px-5 py-3">Keyword</th>
                  <th className="text-left font-medium px-5 py-3">Venue</th>
                  <th className="text-left font-medium px-5 py-3">Position</th>
                  <th className="text-left font-medium px-5 py-3">Clicks</th>
                  <th className="text-left font-medium px-5 py-3">Impressions</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {venueKeywords.map(row => (
                  <tr key={row.keyword} className="hover:bg-accent/50 transition-colors">
                    <td className="px-5 py-3 font-medium">{row.keyword}</td>
                    <td className="px-5 py-3">{row.venue}</td>
                    <td className="px-5 py-3">#{row.position}</td>
                    <td className="px-5 py-3">{row.clicks}</td>
                    <td className="px-5 py-3">{row.impressions}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════
          NEW SECTION 1: SEO Audit Benchmarks
         ═══════════════════════════════════════════════════════════════ */}
      {auditScores.length > 0 && (
        <>
          <div className="border-t pt-8 mt-4">
            <h2 className="text-xl font-bold flex items-center gap-2">
              <Shield className="h-5 w-5 text-blue-600" />
              SEO Audit Benchmarks
            </h2>
            <p className="text-muted-foreground text-sm">
              Audit date: {auditDateFormatted}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* Overall Score */}
            <div className="rounded-xl border bg-card p-6 flex flex-col items-center justify-center">
              {overallScore !== null && (
                <>
                  <div className={`text-5xl font-bold ${scoreColor(overallScore)}`}>
                    {overallScore}
                  </div>
                  <div className="text-sm text-muted-foreground mt-1 flex items-center">
                    / 100 Overall
                    {trendArrow(overallScore, prevOverallScore)}
                  </div>
                </>
              )}
            </div>

            {/* Category Progress Bars */}
            <div className="rounded-xl border bg-card p-5 md:col-span-2 space-y-3">
              {seoScores.map(score => {
                const pct = Math.round((score.score / score.max_score) * 100)
                const prevScore = prevSeoScores.find(p => p.category === score.category)
                const prevPct = prevScore ? Math.round((prevScore.score / prevScore.max_score) * 100) : null

                return (
                  <div key={score.category}>
                    <div className="flex items-center justify-between text-sm mb-1">
                      <span className="font-medium">{score.category}</span>
                      <span className={`font-semibold tabular-nums ${scoreColor(pct)}`}>
                        {pct}/100
                        {trendArrow(pct, prevPct)}
                      </span>
                    </div>
                    <div className="h-2.5 bg-muted rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${barColor(pct)}`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                )
              })}
            </div>

            {/* Sitemap Score */}
            {sitemapScores.length > 0 && (
              <div className="rounded-xl border bg-card p-6 flex flex-col items-center justify-center">
                {sitemapScores.map(s => {
                  const prevSm = prevSitemapScores.find(p => p.category === s.category)
                  return (
                    <div key={s.category}>
                      <div className={`text-4xl font-bold text-center ${s.score / s.max_score >= 0.7 ? 'text-green-600' : s.score / s.max_score >= 0.5 ? 'text-amber-600' : 'text-red-600'}`}>
                        {s.score}<span className="text-lg font-normal text-muted-foreground">/{s.max_score}</span>
                      </div>
                      <div className="text-sm text-muted-foreground mt-1 text-center flex items-center justify-center">
                        Sitemap Score
                        {prevSm ? trendArrow(s.score, prevSm.score) : null}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </>
      )}

      {/* ═══════════════════════════════════════════════════════════════
          NEW SECTION 2: Audit Action Items Tracker
         ═══════════════════════════════════════════════════════════════ */}
      {auditItems.length > 0 && (
        <div className="rounded-xl border bg-card">
          <div className="p-5 border-b">
            <h2 className="font-semibold flex items-center gap-2">
              <Clock className="h-4 w-4 text-blue-600" />
              Audit Action Items
            </h2>
          </div>

          {/* Filter Tabs */}
          <div className="flex gap-2 px-5 pt-4 pb-2 flex-wrap">
            {(['all', 'critical', 'high', 'medium', 'low'] as const).map(p => (
              <button
                key={p}
                onClick={() => setPriorityFilter(p)}
                className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                  priorityFilter === p
                    ? 'bg-blue-600 text-white'
                    : 'bg-muted hover:bg-muted/80 text-muted-foreground'
                }`}
              >
                {p === 'all' ? 'All' : p.charAt(0).toUpperCase() + p.slice(1)} ({priorityCounts[p]})
              </button>
            ))}
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-sm" style={{ minWidth: 900 }}>
              <thead>
                <tr className="border-b bg-muted/50">
                  <th style={{ width: 32 }} className="px-2 py-3" />
                  <th className="text-left font-medium px-3 py-3" style={{ width: 50 }}>
                    <button onClick={() => handleAuditSort('item_number')} className="flex items-center gap-0.5 hover:text-foreground">
                      # <SortIcon field="item_number" />
                    </button>
                  </th>
                  <th className="text-left font-medium px-3 py-3" style={{ width: 90 }}>
                    <button onClick={() => handleAuditSort('priority')} className="flex items-center gap-0.5 hover:text-foreground">
                      Priority <SortIcon field="priority" />
                    </button>
                  </th>
                  <th className="text-left font-medium px-3 py-3">
                    <button onClick={() => handleAuditSort('title')} className="flex items-center gap-0.5 hover:text-foreground">
                      Title <SortIcon field="title" />
                    </button>
                  </th>
                  <th className="text-left font-medium px-3 py-3" style={{ width: 140 }}>
                    <button onClick={() => handleAuditSort('category')} className="flex items-center gap-0.5 hover:text-foreground">
                      Category <SortIcon field="category" />
                    </button>
                  </th>
                  <th className="text-left font-medium px-3 py-3" style={{ width: 80 }}>
                    <button onClick={() => handleAuditSort('source')} className="flex items-center gap-0.5 hover:text-foreground">
                      Source <SortIcon field="source" />
                    </button>
                  </th>
                  <th className="text-left font-medium px-3 py-3" style={{ width: 80 }}>
                    <button onClick={() => handleAuditSort('time_estimate')} className="flex items-center gap-0.5 hover:text-foreground">
                      Time <SortIcon field="time_estimate" />
                    </button>
                  </th>
                  <th className="text-left font-medium px-3 py-3" style={{ width: 80 }}>
                    <button onClick={() => handleAuditSort('impact')} className="flex items-center gap-0.5 hover:text-foreground">
                      Impact <SortIcon field="impact" />
                    </button>
                  </th>
                  <th className="text-left font-medium px-3 py-3" style={{ width: 100 }}>
                    <button onClick={() => handleAuditSort('status')} className="flex items-center gap-0.5 hover:text-foreground">
                      Status <SortIcon field="status" />
                    </button>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {filteredItems.map(item => {
                  const isDone = item.status === 'done' || item.status === 'wont_fix'
                  const isExpanded = expandedItems.has(item.item_number)

                  return (
                    <tr
                      key={item.item_number}
                      className={`hover:bg-accent/50 transition-colors cursor-pointer ${isDone ? 'opacity-60' : ''}`}
                      onClick={() => item.description && toggleExpand(item.item_number)}
                    >
                      <td className="px-2 py-3 text-muted-foreground">
                        {item.description ? (
                          isExpanded ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />
                        ) : null}
                      </td>
                      <td className="px-3 py-3 tabular-nums text-muted-foreground">{item.item_number}</td>
                      <td className="px-3 py-3">{priorityBadge(item.priority)}</td>
                      <td className="px-3 py-3">
                        <div className={isDone ? 'line-through text-muted-foreground' : 'font-medium'}>
                          {item.title}
                        </div>
                        {isExpanded && item.description && (
                          <div className="mt-2 text-xs text-muted-foreground bg-muted/50 rounded-lg p-3 leading-relaxed">
                            {item.description}
                          </div>
                        )}
                      </td>
                      <td className="px-3 py-3 text-muted-foreground text-xs">{item.category}</td>
                      <td className="px-3 py-3">{sourceBadge(item.source)}</td>
                      <td className="px-3 py-3 text-muted-foreground text-xs whitespace-nowrap">{item.time_estimate || '—'}</td>
                      <td className="px-3 py-3">{impactBadge(item.impact)}</td>
                      <td className="px-3 py-3">{itemStatusBadge(item.status)}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════
          NEW SECTION 3: Quick Wins
         ═══════════════════════════════════════════════════════════════ */}
      {quickWins.length > 0 && (
        <div>
          <h2 className="font-semibold mb-4 flex items-center gap-2">
            <Zap className="h-4 w-4 text-amber-500" />
            Quick Wins
          </h2>
          <p className="text-sm text-muted-foreground mb-4">
            High-impact fixes you can do in minutes
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {quickWins.map(item => (
              <div key={item.item_number} className="rounded-xl border bg-card p-4 hover:shadow-sm transition-shadow">
                <div className="font-medium text-sm mb-3">{item.title}</div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="inline-flex items-center gap-1 rounded-full border border-blue-200 bg-blue-50 text-blue-700 px-2 py-0.5 text-xs font-medium">
                    <Clock className="h-3 w-3" />
                    {item.time_estimate}
                  </span>
                  {impactBadge(item.impact)}
                  <span className="inline-flex items-center rounded-full border border-border bg-muted text-muted-foreground px-2 py-0.5 text-xs">
                    {item.category}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════
          Footer (existing, unchanged)
         ═══════════════════════════════════════════════════════════════ */}
      <div className="rounded-xl border bg-card px-5 py-3 text-xs text-muted-foreground flex items-center justify-between">
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
  )
}
