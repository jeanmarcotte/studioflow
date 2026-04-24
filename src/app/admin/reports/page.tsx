'use client'

import { useState } from 'react'
import { DollarSign, Calendar, Users, Video, Camera, TrendingUp, FileText, BarChart3 } from 'lucide-react'

const YEARS = [2025, 2026, 2027]

interface SnapshotCard {
  label: string
  value: string
  description: string
  icon: React.ElementType
  iconColor: string
  iconBg: string
}

interface ReportCard {
  emoji: string
  title: string
  description: string
}

const snapshotCards: SnapshotCard[] = [
  { label: 'Revenue This Year', value: '—', description: 'C2 frames & albums signed', icon: DollarSign, iconColor: 'text-green-600', iconBg: 'bg-green-50' },
  { label: 'Weddings Remaining', value: '—', description: 'Booked, not yet shot', icon: Calendar, iconColor: 'text-blue-600', iconBg: 'bg-blue-50' },
  { label: 'Balance Owed', value: '—', description: 'Outstanding across all couples', icon: TrendingUp, iconColor: 'text-red-600', iconBg: 'bg-red-50' },
  { label: 'Video Backlog', value: '—', description: 'Videos in production', icon: Video, iconColor: 'text-purple-600', iconBg: 'bg-purple-50' },
  { label: 'Photo Pipeline', value: '—', description: 'Editing jobs active', icon: Camera, iconColor: 'text-teal-600', iconBg: 'bg-teal-50' },
  { label: 'Avg Package Value', value: '—', description: 'Mean contract total', icon: BarChart3, iconColor: 'text-amber-600', iconBg: 'bg-amber-50' },
]

const reportCards: ReportCard[] = [
  { emoji: '📄', title: 'Production Report', description: 'Photo & video status for all active couples' },
  { emoji: '👥', title: 'Couples Summary', description: 'Full couples list with milestones & balances' },
  { emoji: '💰', title: 'Financial Summary', description: 'Revenue, payments, outstanding balances' },
  { emoji: '📅', title: 'Wedding Calendar', description: 'Upcoming weddings with crew & venues' },
  { emoji: '🌸', title: 'BridalFlow Leads', description: 'Active leads with source & temperature' },
  { emoji: '📊', title: 'Year Comparison', description: '2026 vs 2025 — bookings, revenue, packages' },
]

export default function ReportsPage() {
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear())

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Reports</h1>
          <p className="text-muted-foreground">SIGS Photography — Business Intelligence</p>
        </div>
        <div className="flex gap-1 rounded-lg border bg-card p-1">
          {YEARS.map(year => (
            <button
              key={year}
              onClick={() => setSelectedYear(year)}
              className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                selectedYear === year
                  ? 'bg-primary text-primary-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground hover:bg-accent'
              }`}
            >
              {year}
            </button>
          ))}
        </div>
      </div>

      {/* Business Snapshot */}
      <div>
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3 flex items-center gap-2">
          📊 Business Snapshot
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {snapshotCards.map(card => (
            <div key={card.label} className="rounded-xl border bg-card p-4">
              <div className="flex items-center gap-2 mb-2">
                <div className={`rounded-lg p-1.5 ${card.iconBg}`}>
                  <card.icon className={`h-4 w-4 ${card.iconColor}`} />
                </div>
              </div>
              <div className="text-2xl font-bold">{card.value}</div>
              <div className="text-sm font-medium mt-1">{card.label}</div>
              <div className="text-xs text-muted-foreground mt-0.5">{card.description}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Downloadable Reports */}
      <div>
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3 flex items-center gap-2">
          📋 Downloadable Reports
        </h2>
        <div className="rounded-xl border bg-card divide-y">
          {reportCards.map(report => (
            <div key={report.title} className="flex items-center justify-between p-4">
              <div className="flex items-center gap-3">
                <span className="text-lg">{report.emoji}</span>
                <div>
                  <div className="text-sm font-medium">{report.title}</div>
                  <div className="text-xs text-muted-foreground">{report.description}</div>
                </div>
              </div>
              <button
                disabled
                title="Coming soon"
                className="px-3 py-1.5 text-xs font-medium rounded-md border bg-muted text-muted-foreground cursor-not-allowed"
              >
                Generate
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
