'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { useParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { Plus } from 'lucide-react'
import { HubHeader } from '@/components/production-hub/HubHeader'
import { MilestoneBar } from '@/components/production-hub/MilestoneBar'
import { MilestoneBadges } from '@/components/production-hub/MilestoneBadges'
import { PhotoJobsTable } from '@/components/production-hub/PhotoJobsTable'
import { VideoJobsTable } from '@/components/production-hub/VideoJobsTable'
import { CommunicationLog } from '@/components/production-hub/CommunicationLog'
import { OrderCards } from '@/components/production-hub/OrderCards'
import { AddJobModal } from '@/components/production-hub/AddJobModal'
import { EngSlideshowCheck } from '@/components/production-hub/EngSlideshowCheck'
import { HubCouple, HubContract, HubMilestones, PhotoJob, VideoJob, CommLogEntry, OrderJob, ProductItem, EXCLUDED_ORDER_CODES } from '@/components/production-hub/types'

const ENG_MILESTONES = ['m06_eng_session_shot', 'm07_eng_photos_edited', 'm08_eng_proofs_to_lab', 'm09_eng_prints_picked_up', 'm10_frame_sale_quote', 'm11_frame_sale_complete', 'm12_eng_order_to_lab', 'm13_eng_items_framed', 'm14_eng_items_picked_up']
const WED_MILESTONES = ['m19_wedding_day', 'm20_files_backed_up', 'm22_proofs_edited', 'm24_photo_order_in', 'm26_photo_order_to_lab', 'm29_lab_order_back', 'm32_ready_at_studio', 'm34_items_picked_up']
const VID_MILESTONES = ['m25_video_order_in', 'm27_video_long_form', 'm28_recap_edited', 'm30_hires_on_usb', 'm31_video_on_usb']

export default function ProductionHubPage() {
  const params = useParams()
  const coupleId = params.id as string

  const [couple, setCouple] = useState<HubCouple | null>(null)
  const [contract, setContract] = useState<HubContract | null>(null)
  const [milestones, setMilestones] = useState<HubMilestones | null>(null)
  const [photoJobs, setPhotoJobs] = useState<PhotoJob[]>([])
  const [videoJobs, setVideoJobs] = useState<VideoJob[]>([])
  const [allJobs, setAllJobs] = useState<any[]>([])
  const [commLog, setCommLog] = useState<CommLogEntry[]>([])
  const [products, setProducts] = useState<ProductItem[]>([])
  const [tab, setTab] = useState<'photo' | 'video' | 'orders'>('photo')
  const [loading, setLoading] = useState(true)
  const [showAddJob, setShowAddJob] = useState(false)

  const fetchData = useCallback(async () => {
    const [coupleRes, contractRes, msRes, jobsRes, vidRes, commRes, productsRes] = await Promise.all([
      supabase.from('couples').select('id, couple_name, bride_first_name, groom_first_name, wedding_date, phase, is_cancelled').eq('id', coupleId).limit(1),
      supabase.from('contracts').select('package_name, reception_venue').eq('couple_id', coupleId).limit(1),
      supabase.from('couple_milestones').select('*').eq('couple_id', coupleId).limit(1),
      supabase.from('jobs').select('id, couple_id, job_type, category, product_code, description, quantity, photos_taken, photos_selected, edited_so_far, total_proofs, status, vendor, order_date, at_lab_date, pickup_date, completed_date, assigned_to, notes, approval_round, sent_for_review_date, reedit_count, updated_at').eq('couple_id', coupleId).order('order_date', { ascending: true }),
      supabase.from('video_jobs').select('id, couple_id, job_type, status, hours_raw, assigned_to, due_date, completed_date, ceremony_done, reception_done, park_done, prereception_done, groom_done, bride_done, proxies_run, video_form, notes').eq('couple_id', coupleId).order('sort_order', { ascending: true }),
      supabase.from('communication_log').select('id, couple_id, job_id, video_job_id, type, direction, channel, subject, body, logged_by, logged_at').eq('couple_id', coupleId).order('logged_at', { ascending: false }),
      supabase.from('product_catalog').select('product_code, item_name, category').eq('active', true).eq('production_visible', true).order('category').order('sort_order'),
    ])

    setCouple(coupleRes.data?.[0] || null)
    setContract(contractRes.data?.[0] || null)
    setMilestones(msRes.data?.[0] || null)
    const jobs = jobsRes.data || []
    setAllJobs(jobs)
    setPhotoJobs(jobs as PhotoJob[])
    setVideoJobs((vidRes.data || []) as VideoJob[])
    setCommLog((commRes.data || []) as CommLogEntry[])
    setProducts((productsRes.data || []) as ProductItem[])
    setLoading(false)
  }, [coupleId])

  useEffect(() => { fetchData() }, [fetchData])

  // Product name lookup
  const productMap = useMemo(() => {
    const map = new Map<string, string>()
    products.forEach(p => map.set(p.product_code, p.item_name))
    return map
  }, [products])

  // Order jobs = jobs NOT in the excluded codes
  const orderJobs: OrderJob[] = useMemo(() => {
    return allJobs.filter(j => {
      const code = j.product_code || j.job_type || ''
      return !EXCLUDED_ORDER_CODES.includes(code)
    })
  }, [allJobs])

  // Slideshow job
  const slideshowJob = useMemo(() => {
    const j = allJobs.find(j => j.product_code === 'PROD-VID-SLIDESHOW' || j.job_type === 'PROD-VID-SLIDESHOW')
    if (!j) return null
    return { id: j.id, status: j.status, updated_at: j.updated_at || j.completed_date || '' }
  }, [allJobs])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    )
  }

  if (!couple) {
    return <div className="p-8 text-center text-muted-foreground">Couple not found</div>
  }

  const engJobs = photoJobs.filter(j => j.category === 'engagement' && (j as any).product_code === 'PROD-ENG-PROOFS')
  const wedJobs = photoJobs.filter(j => j.category === 'wedding' && (j as any).product_code === 'PROD-WED-PROOFS')

  return (
    <div className="space-y-5 max-w-6xl">
      <HubHeader couple={couple} contract={contract} milestones={milestones} />
      <MilestoneBar milestones={milestones} />

      {/* Tab Navigation + Add Job */}
      <div className="flex items-center justify-between border-b">
        <div className="flex gap-1">
          {(['photo', 'video', 'orders'] as const).map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                tab === t
                  ? 'border-teal-600 text-teal-700'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              {t === 'photo' ? 'Photo' : t === 'video' ? 'Video' : `Orders (${orderJobs.length})`}
            </button>
          ))}
        </div>
        <button
          onClick={() => setShowAddJob(true)}
          className="flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground hover:bg-primary/90 transition-colors mb-1"
        >
          <Plus className="h-3.5 w-3.5" />
          Add Job
        </button>
      </div>

      {tab === 'photo' && (
        <div className="space-y-6">
          {/* Engagement */}
          <div className="rounded-xl border bg-card p-4">
            <h3 className="text-sm font-semibold mb-2">Engagement</h3>
            <MilestoneBadges milestones={milestones} keys={ENG_MILESTONES} />
            <PhotoJobsTable jobs={engJobs} title="engagement" onRefresh={fetchData} />
          </div>

          {/* Engagement Slideshow */}
          <EngSlideshowCheck job={slideshowJob} onRefresh={fetchData} />

          {/* Wedding */}
          <div className="rounded-xl border bg-card p-4">
            <h3 className="text-sm font-semibold mb-2">Wedding</h3>
            <MilestoneBadges milestones={milestones} keys={WED_MILESTONES} />
            <PhotoJobsTable jobs={wedJobs} title="wedding" onRefresh={fetchData} />
          </div>

          <CommunicationLog coupleId={coupleId} entries={commLog} onRefresh={fetchData} />
        </div>
      )}

      {tab === 'video' && (
        <div className="space-y-6">
          <div className="rounded-xl border bg-card p-4">
            <h3 className="text-sm font-semibold mb-2">Video Jobs</h3>
            <MilestoneBadges milestones={milestones} keys={VID_MILESTONES} />
            <VideoJobsTable jobs={videoJobs} onRefresh={fetchData} />
          </div>

          <CommunicationLog coupleId={coupleId} entries={commLog} onRefresh={fetchData} />
        </div>
      )}

      {tab === 'orders' && (
        <div className="space-y-6">
          <OrderCards jobs={orderJobs} productMap={productMap} onRefresh={fetchData} />
          <CommunicationLog coupleId={coupleId} entries={commLog} onRefresh={fetchData} />
        </div>
      )}

      {/* Add Job Modal */}
      {showAddJob && (
        <AddJobModal
          coupleId={coupleId}
          products={products}
          onClose={() => setShowAddJob(false)}
          onCreated={fetchData}
        />
      )}
    </div>
  )
}
