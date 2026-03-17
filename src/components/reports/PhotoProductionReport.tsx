'use client'

import { Document, Page, Text, View, StyleSheet, Font } from '@react-pdf/renderer'

// ── Types ────────────────────────────────────────────────────────

interface Job {
  id: string
  couple_id: string
  job_type: string
  category: string
  photos_taken: number | null
  vendor: string | null
  status: string
  due_date: string | null
  at_lab_date: string | null
  notes: string | null
  created_at: string
  updated_at: string
  couples?: { couple_name: string; wedding_date: string | null } | null
}

interface WaitingOrderCouple {
  id: string
  couple_name: string
  wedding_date: string | null
}

interface ReportProps {
  jobs: Job[]
  waitingOrderCouples: WaitingOrderCouple[]
  completedCount: number
  reeditYtdCount: number
  editedSoFar: number
  totalPhotos: number
}

// ── Constants ────────────────────────────────────────────────────

const JOB_TYPE_LABELS: Record<string, string> = {
  wedding_proofs: 'Wedding Proofs',
  parent_album: 'Parent Album',
  bg_album: 'B&G Album',
  bg_portrait_canvas: 'B&G Portrait (Canvas)',
  bg_portrait_print: 'B&G Portrait (Print)',
  parent_portrait_canvas: 'Parent Portrait (Canvas)',
  parent_portrait_print: 'Parent Portrait (Print)',
  tyc: 'Thank You Cards',
  hires_wedding: 'Hi-Res Wedding',
  eng_proofs: 'Engagement Proofs',
  eng_collage: 'Engagement Collage',
  eng_signing_book: 'Engagement Signing Book',
  eng_album: 'Engagement Album',
  eng_prints: 'Engagement Prints',
  hires_engagement: 'Hi-Res Engagement',
}

const VENDOR_LABELS: Record<string, string> = {
  cci: 'CCI',
  uaf: 'UAF',
  best_canvas: 'Best Canvas',
  in_house: 'In-house',
}

const SECTIONS = [
  { status: 'in_progress', label: 'In Progress', color: '#2563eb' },
  { status: 'waiting_approval', label: 'Waiting for Bride', color: '#d97706' },
  { status: 'ready_to_reedit', label: 'Ready to Re-edit', color: '#ea580c' },
  { status: 'reediting', label: 'Re-editing', color: '#e11d48' },
  { status: 'at_lab', label: 'At Lab', color: '#4f46e5' },
  { status: 'at_studio', label: 'At Studio', color: '#7c3aed' },
  { status: 'on_hold', label: 'On Hold', color: '#6b7280' },
  { status: 'ready_to_order', label: 'Ready to Order', color: '#d97706' },
] as const

// ── Styles ───────────────────────────────────────────────────────

const s = StyleSheet.create({
  page: {
    fontFamily: 'Helvetica',
    fontSize: 9,
    paddingTop: 40,
    paddingBottom: 60,
    paddingHorizontal: 40,
    color: '#1a1a1a',
  },
  // Header
  headerBar: {
    backgroundColor: '#1a1a1a',
    padding: 20,
    marginBottom: 20,
    marginTop: -40,
    marginHorizontal: -40,
  },
  logoText: {
    fontFamily: 'Helvetica-Bold',
    fontSize: 18,
    color: '#ffffff',
    letterSpacing: 3,
  },
  reportTitle: {
    fontFamily: 'Helvetica',
    fontSize: 11,
    color: '#a3a3a3',
    marginTop: 4,
  },
  timestamp: {
    fontFamily: 'Helvetica',
    fontSize: 8,
    color: '#737373',
    marginTop: 2,
  },
  // Executive Summary
  summaryBox: {
    backgroundColor: '#f5f5f5',
    borderRadius: 4,
    padding: 16,
    marginBottom: 20,
    marginTop: 10,
  },
  summaryTitle: {
    fontFamily: 'Helvetica-Bold',
    fontSize: 11,
    marginBottom: 10,
    color: '#1a1a1a',
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  summaryItem: {
    flexDirection: 'column',
    alignItems: 'center',
    flex: 1,
  },
  summaryValue: {
    fontFamily: 'Helvetica-Bold',
    fontSize: 20,
    color: '#1a1a1a',
  },
  summaryLabel: {
    fontSize: 7,
    color: '#737373',
    marginTop: 2,
    textTransform: 'uppercase',
  },
  // Progress bar
  progressContainer: {
    marginTop: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  progressBarBg: {
    flex: 1,
    height: 8,
    backgroundColor: '#e5e5e5',
    borderRadius: 4,
  },
  progressBarFill: {
    height: 8,
    backgroundColor: '#22c55e',
    borderRadius: 4,
  },
  progressText: {
    fontSize: 8,
    color: '#525252',
    width: 80,
    textAlign: 'right',
  },
  // Section headers
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 3,
    marginBottom: 4,
    marginTop: 14,
  },
  sectionTitle: {
    fontFamily: 'Helvetica-Bold',
    fontSize: 9,
    color: '#ffffff',
    flex: 1,
  },
  sectionCount: {
    fontFamily: 'Helvetica-Bold',
    fontSize: 9,
    color: '#ffffff',
  },
  // Tables
  tableHeader: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#d4d4d4',
    paddingBottom: 4,
    paddingHorizontal: 4,
    marginBottom: 2,
  },
  tableHeaderCell: {
    fontFamily: 'Helvetica-Bold',
    fontSize: 7,
    color: '#737373',
    textTransform: 'uppercase',
  },
  tableRow: {
    flexDirection: 'row',
    paddingVertical: 5,
    paddingHorizontal: 4,
    borderBottomWidth: 0.5,
    borderBottomColor: '#e5e5e5',
  },
  tableRowAlt: {
    backgroundColor: '#fafafa',
  },
  cellCouple: { width: '30%' },
  cellDate: { width: '18%' },
  cellJobType: { width: '24%' },
  cellPhotos: { width: '10%', textAlign: 'right' },
  cellVendor: { width: '18%' },
  // Follow-up box
  followUpBox: {
    backgroundColor: '#fef3c7',
    borderRadius: 4,
    padding: 14,
    marginTop: 20,
    borderLeftWidth: 3,
    borderLeftColor: '#d97706',
  },
  followUpTitle: {
    fontFamily: 'Helvetica-Bold',
    fontSize: 10,
    color: '#92400e',
    marginBottom: 8,
  },
  cellDays: { width: '20%', textAlign: 'right' },
  cellFollowCouple: { width: '40%' },
  cellFollowDate: { width: '40%' },
  // Empty section
  emptyText: {
    fontSize: 8,
    color: '#a3a3a3',
    fontStyle: 'italic',
    paddingVertical: 6,
    paddingHorizontal: 4,
  },
  // Footer
  footer: {
    position: 'absolute',
    bottom: 25,
    left: 40,
    right: 40,
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderTopWidth: 0.5,
    borderTopColor: '#d4d4d4',
    paddingTop: 8,
  },
  footerText: {
    fontSize: 7,
    color: '#a3a3a3',
  },
})

// ── Helpers ──────────────────────────────────────────────────────

function formatDate(dateStr: string | null): string {
  if (!dateStr) return '—'
  const d = new Date(dateStr + 'T00:00:00')
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

function daysSince(dateStr: string | null): number {
  if (!dateStr) return 0
  const d = new Date(dateStr + 'T00:00:00')
  const now = new Date()
  return Math.floor((now.getTime() - d.getTime()) / (1000 * 60 * 60 * 24))
}

// ── Component ────────────────────────────────────────────────────

export default function PhotoProductionReport({
  jobs,
  waitingOrderCouples,
  completedCount,
  reeditYtdCount,
  editedSoFar,
  totalPhotos,
}: ReportProps) {
  const now = new Date()
  const timestamp = now.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })

  const photosPercent = totalPhotos > 0 ? Math.round((editedSoFar / totalPhotos) * 100) : 0

  return (
    <Document>
      <Page size="A4" style={s.page}>
        {/* Header Bar */}
        <View style={s.headerBar}>
          <Text style={s.logoText}>SIGS PHOTOGRAPHY</Text>
          <Text style={s.reportTitle}>Photo Production Status Report</Text>
          <Text style={s.timestamp}>{timestamp}</Text>
        </View>

        {/* Executive Summary */}
        <View style={s.summaryBox}>
          <Text style={s.summaryTitle}>Executive Summary</Text>
          <View style={s.summaryRow}>
            <View style={s.summaryItem}>
              <Text style={s.summaryValue}>{jobs.length}</Text>
              <Text style={s.summaryLabel}>Active Jobs</Text>
            </View>
            <View style={s.summaryItem}>
              <Text style={s.summaryValue}>{completedCount}</Text>
              <Text style={s.summaryLabel}>Completed</Text>
            </View>
            <View style={s.summaryItem}>
              <Text style={s.summaryValue}>{waitingOrderCouples.length}</Text>
              <Text style={s.summaryLabel}>Waiting for Order</Text>
            </View>
            <View style={s.summaryItem}>
              <Text style={s.summaryValue}>{reeditYtdCount}</Text>
              <Text style={s.summaryLabel}>Re-edits YTD</Text>
            </View>
          </View>
          <View style={s.progressContainer}>
            <Text style={{ fontSize: 8, color: '#525252', width: 80 }}>Photos Edited</Text>
            <View style={s.progressBarBg}>
              <View style={[s.progressBarFill, { width: `${photosPercent}%` }]} />
            </View>
            <Text style={s.progressText}>
              {editedSoFar} of {totalPhotos} ({photosPercent}%)
            </Text>
          </View>
        </View>

        {/* Status Sections */}
        {SECTIONS.map(section => {
          const sectionJobs = jobs.filter(j => j.status === section.status)
          return (
            <View key={section.status} wrap={false}>
              <View style={[s.sectionHeader, { backgroundColor: section.color }]}>
                <Text style={s.sectionTitle}>{section.label}</Text>
                <Text style={s.sectionCount}>{sectionJobs.length}</Text>
              </View>
              {sectionJobs.length > 0 ? (
                <View>
                  <View style={s.tableHeader}>
                    <Text style={[s.tableHeaderCell, s.cellCouple]}>Couple</Text>
                    <Text style={[s.tableHeaderCell, s.cellDate]}>Wedding Date</Text>
                    <Text style={[s.tableHeaderCell, s.cellJobType]}>Job Type</Text>
                    <Text style={[s.tableHeaderCell, s.cellPhotos]}>Photos</Text>
                    <Text style={[s.tableHeaderCell, s.cellVendor]}>Vendor</Text>
                  </View>
                  {sectionJobs.map((job, i) => (
                    <View key={job.id} style={[s.tableRow, i % 2 === 1 ? s.tableRowAlt : {}]}>
                      <Text style={s.cellCouple}>{job.couples?.couple_name || 'Unknown'}</Text>
                      <Text style={s.cellDate}>{formatDate(job.couples?.wedding_date ?? null)}</Text>
                      <Text style={s.cellJobType}>{JOB_TYPE_LABELS[job.job_type] || job.job_type}</Text>
                      <Text style={s.cellPhotos}>{job.photos_taken ?? '—'}</Text>
                      <Text style={s.cellVendor}>{VENDOR_LABELS[job.vendor || ''] || job.vendor || '—'}</Text>
                    </View>
                  ))}
                </View>
              ) : (
                <Text style={s.emptyText}>No jobs</Text>
              )}
            </View>
          )
        })}

        {/* Follow-Up Required */}
        {waitingOrderCouples.length > 0 && (
          <View style={s.followUpBox} wrap={false}>
            <Text style={s.followUpTitle}>Follow-Up Required — Couples Awaiting Photo Order</Text>
            <View style={s.tableHeader}>
              <Text style={[s.tableHeaderCell, s.cellFollowCouple, { color: '#92400e' }]}>Couple</Text>
              <Text style={[s.tableHeaderCell, s.cellFollowDate, { color: '#92400e' }]}>Wedding Date</Text>
              <Text style={[s.tableHeaderCell, s.cellDays, { color: '#92400e' }]}>Days Since</Text>
            </View>
            {waitingOrderCouples.map((couple, i) => (
              <View key={couple.id} style={[s.tableRow, i % 2 === 1 ? { backgroundColor: '#fef9ee' } : {}, { borderBottomColor: '#fde68a' }]}>
                <Text style={s.cellFollowCouple}>{couple.couple_name}</Text>
                <Text style={s.cellFollowDate}>{formatDate(couple.wedding_date)}</Text>
                <Text style={[s.cellDays, { fontFamily: 'Helvetica-Bold' }]}>{daysSince(couple.wedding_date)}</Text>
              </View>
            ))}
          </View>
        )}

        {/* Footer */}
        <View style={s.footer} fixed>
          <Text style={s.footerText}>Generated by StudioFlow • SIGS Photography</Text>
          <Text style={s.footerText} render={({ pageNumber, totalPages }) => `Page ${pageNumber} of ${totalPages}`} />
        </View>
      </Page>
    </Document>
  )
}
