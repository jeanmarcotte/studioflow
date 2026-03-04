import { Search, ExternalLink } from 'lucide-react'

type RankStatus = 'good' | 'warning' | 'bad' | 'unknown'

interface CityRanking {
  city: string
  queryA: { rank: string; status: RankStatus }
  queryB: { rank: string; status: RankStatus }
}

function statusBadge(rank: string, status: RankStatus) {
  const styles: Record<RankStatus, string> = {
    good: 'text-green-700 bg-green-50 border-green-200',
    warning: 'text-amber-700 bg-amber-50 border-amber-200',
    bad: 'text-red-700 bg-red-50 border-red-200',
    unknown: 'text-gray-500 bg-gray-50 border-gray-200',
  }
  const icons: Record<RankStatus, string> = {
    good: '\u2705',
    warning: '\u26a0\ufe0f',
    bad: '\u274c',
    unknown: '?',
  }
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium ${styles[status]}`}>
      {rank === '?' ? '?' : `#${rank}`} {icons[status]}
    </span>
  )
}

const rankings: CityRanking[] = [
  { city: 'Toronto', queryA: { rank: '53', status: 'bad' }, queryB: { rank: '?', status: 'unknown' } },
  { city: 'Vaughan', queryA: { rank: '8-16', status: 'warning' }, queryB: { rank: '15.9', status: 'warning' } },
  { city: 'Mississauga', queryA: { rank: '11-26', status: 'warning' }, queryB: { rank: '26.1', status: 'warning' } },
  { city: 'Markham', queryA: { rank: '8', status: 'good' }, queryB: { rank: '?', status: 'unknown' } },
  { city: 'Richmond Hill', queryA: { rank: '47', status: 'bad' }, queryB: { rank: '?', status: 'unknown' } },
  { city: 'Brampton', queryA: { rank: '?', status: 'unknown' }, queryB: { rank: '?', status: 'unknown' } },
  { city: 'Scarborough', queryA: { rank: '?', status: 'unknown' }, queryB: { rank: '?', status: 'unknown' } },
  { city: 'Hamilton', queryA: { rank: '?', status: 'unknown' }, queryB: { rank: '?', status: 'unknown' } },
]

export default function SigsSeoPage() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold">SIGS SEO Rankings</h1>
        <p className="text-muted-foreground">
          Goal: sigsphoto.ca #1 for &ldquo;wedding photographer&rdquo; in all 8 GTA cities
        </p>
      </div>

      <div className="rounded-xl border bg-card">
        <div className="p-5 border-b">
          <h2 className="font-semibold flex items-center gap-2">
            <Search className="h-4 w-4 text-blue-600" />
            Google Search Rankings
          </h2>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="text-left font-medium px-5 py-3">City</th>
                <th className="text-left font-medium px-5 py-3">&ldquo;[City] wedding photographer&rdquo;</th>
                <th className="text-left font-medium px-5 py-3">&ldquo;wedding photographer [City]&rdquo;</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {rankings.map((r) => (
                <tr key={r.city} className="hover:bg-accent/50 transition-colors">
                  <td className="px-5 py-3 font-medium">{r.city}</td>
                  <td className="px-5 py-3">{statusBadge(r.queryA.rank, r.queryA.status)}</td>
                  <td className="px-5 py-3">{statusBadge(r.queryB.rank, r.queryB.status)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="px-5 py-3 border-t text-xs text-muted-foreground flex items-center justify-between">
          <span>Last updated: March 5, 2026</span>
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

      <div className="grid grid-cols-3 gap-4">
        <div className="rounded-xl border bg-card p-5">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-medium text-muted-foreground">Top 10</span>
            <div className="rounded-lg p-2 text-green-600 bg-green-50">
              <Search className="h-4 w-4" />
            </div>
          </div>
          <div className="text-2xl font-bold">
            {rankings.filter(r => r.queryA.status === 'good' || r.queryB.status === 'good').length}
          </div>
          <p className="text-xs text-muted-foreground mt-1">cities with a top-10 ranking</p>
        </div>
        <div className="rounded-xl border bg-card p-5">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-medium text-muted-foreground">Needs Work</span>
            <div className="rounded-lg p-2 text-amber-600 bg-amber-50">
              <Search className="h-4 w-4" />
            </div>
          </div>
          <div className="text-2xl font-bold">
            {rankings.filter(r => r.queryA.status === 'warning' || r.queryB.status === 'warning').length}
          </div>
          <p className="text-xs text-muted-foreground mt-1">cities ranking 11-30</p>
        </div>
        <div className="rounded-xl border bg-card p-5">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-medium text-muted-foreground">Not Tracked</span>
            <div className="rounded-lg p-2 text-gray-500 bg-gray-50">
              <Search className="h-4 w-4" />
            </div>
          </div>
          <div className="text-2xl font-bold">
            {rankings.filter(r => r.queryA.status === 'unknown' && r.queryB.status === 'unknown').length}
          </div>
          <p className="text-xs text-muted-foreground mt-1">cities with no data yet</p>
        </div>
      </div>
    </div>
  )
}
