'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import {
  ArrowLeft, Calendar, MapPin, Camera, Heart, DollarSign,
  Clock, Users, Package, FileText, CreditCard, CheckCircle2,
  AlertCircle, Truck, StickyNote, Upload, Download, Trash2, Loader2
} from 'lucide-react'
import { format, parseISO, differenceInDays } from 'date-fns'

interface Couple {
  id: string
  couple_name: string
  bride_name: string | null
  bride_email: string | null
  bride_phone: string | null
  groom_name: string | null
  groom_email: string | null
  groom_phone: string | null
  wedding_date: string | null
  wedding_year: number | null
  ceremony_venue: string | null
  reception_venue: string | null
  park_location: string | null
  package_type: string | null
  coverage_hours: number | null
  photographer: string | null
  lead_source: string | null
  booked_date: string | null
  contract_total: number | null
  extras_total: number | null
  total_paid: number | null
  balance_owing: number | null
  status: string | null
  frame_sale_status: string | null
  engagement_status: string | null
  engagement_date: string | null
  engagement_location: string | null
  notes: string | null
  created_at: string | null
}

interface Payment {
  id: string
  payment_date: string
  amount: number
  method: string | null
  from_name: string | null
  payment_type: string | null
  label: string | null
  notes: string | null
}

interface Deliverable {
  id: string
  deliverable_type: string
  status: string | null
  total_photos: number | null
  edited_photos: number | null
  started_date: string | null
  completed_date: string | null
  delivered_date: string | null
  notes: string | null
}

interface StaffAssignment {
  id: string
  role: string
  staff_name: string
  confirmed: boolean | null
  confirmed_date: string | null
  notes: string | null
}

function formatPackage(pkg: string | null): string {
  if (!pkg) return 'Not set'
  if (pkg === 'photo_only') return 'Photo Only'
  if (pkg === 'photo_video') return 'Photo + Video'
  return pkg
}

function deliverableStatusColor(status: string | null) {
  switch (status) {
    case 'completed': return 'bg-green-100 text-green-700'
    case 'delivered': return 'bg-blue-100 text-blue-700'
    case 'in_progress': return 'bg-amber-100 text-amber-700'
    case 'not_started': return 'bg-gray-100 text-gray-600'
    default: return 'bg-gray-100 text-gray-600'
  }
}

export default function CoupleDetailPage() {
  const params = useParams()
  const router = useRouter()
  const coupleId = params.id as string

  const [couple, setCouple] = useState<Couple | null>(null)
  const [payments, setPayments] = useState<Payment[]>([])
  const [deliverables, setDeliverables] = useState<Deliverable[]>([])
  const [staff, setStaff] = useState<StaffAssignment[]>([])
  const [loading, setLoading] = useState(true)
  const [documents, setDocuments] = useState<{name: string, created_at: string}[]>([])
  const [uploading, setUploading] = useState(false)

  useEffect(() => {
    const fetchAll = async () => {
      const [coupleRes, paymentsRes, deliverablesRes, staffRes] = await Promise.all([
        supabase.from('couples').select('*').eq('id', coupleId).single(),
        supabase.from('payments').select('*').eq('couple_id', coupleId).order('payment_date', { ascending: false }),
        supabase.from('deliverables').select('*').eq('couple_id', coupleId).order('deliverable_type'),
        supabase.from('staff_assignments').select('*').eq('couple_id', coupleId).order('role'),
      ])

      if (coupleRes.data) setCouple(coupleRes.data)
      if (paymentsRes.data) setPayments(paymentsRes.data)
      if (deliverablesRes.data) setDeliverables(deliverablesRes.data)
      if (staffRes.data) setStaff(staffRes.data)

      // Fetch documents from storage
      const { data: files } = await supabase.storage
        .from('couple-documents')
        .list(coupleId, { sortBy: { column: 'created_at', order: 'desc' } })
      if (files) setDocuments(files.map(f => ({ name: f.name, created_at: f.created_at })))

      setLoading(false)
    }
    fetchAll()
  }, [coupleId])

  const uploadDocument = async (file: File) => {
    setUploading(true)
    const filePath = `${coupleId}/${file.name}`
    const { error } = await supabase.storage
      .from('couple-documents')
      .upload(filePath, file, { upsert: true })
    if (!error) {
      setDocuments(prev => [{ name: file.name, created_at: new Date().toISOString() }, ...prev])
    }
    setUploading(false)
  }

  const deleteDocument = async (fileName: string) => {
    const { error } = await supabase.storage
      .from('couple-documents')
      .remove([`${coupleId}/${fileName}`])
    if (!error) {
      setDocuments(prev => prev.filter(d => d.name !== fileName))
    }
  }

  const getDocumentUrl = (fileName: string) => {
    const { data } = supabase.storage
      .from('couple-documents')
      .getPublicUrl(`${coupleId}/${fileName}`)
    return data.publicUrl
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    )
  }

  if (!couple) {
    return (
      <div className="text-center py-20">
        <h2 className="text-xl font-semibold mb-2">Couple not found</h2>
        <button onClick={() => router.push('/admin/couples')} className="text-primary hover:underline text-sm">
          Back to Couples
        </button>
      </div>
    )
  }

  const today = new Date()
  const weddingDate = couple.wedding_date ? parseISO(couple.wedding_date) : null
  const daysUntil = weddingDate ? differenceInDays(weddingDate, today) : null

  const contractTotal = Number(couple.contract_total) || 0
  const extrasTotal = Number(couple.extras_total) || 0
  const totalPaid = Number(couple.total_paid) || 0
  const balanceOwing = Number(couple.balance_owing) || 0
  const grandTotal = contractTotal + extrasTotal

  // Milestones
  const milestones = [
    {
      label: 'Booked',
      done: !!couple.booked_date,
      detail: couple.booked_date ? format(parseISO(couple.booked_date), 'MMM d, yyyy') : null,
    },
    {
      label: 'Engagement',
      done: couple.engagement_status === 'completed',
      detail: couple.engagement_status === 'completed' ? 'Done'
        : couple.engagement_status === 'scheduled' ? `Scheduled${couple.engagement_date ? ': ' + format(parseISO(couple.engagement_date), 'MMM d') : ''}`
        : 'Not scheduled',
    },
    {
      label: 'Frame Sale',
      done: couple.frame_sale_status?.toUpperCase() === 'BOUGHT',
      detail: couple.frame_sale_status || 'Pending',
    },
    {
      label: 'Wedding',
      done: couple.status === 'completed' || (daysUntil !== null && daysUntil < 0),
      detail: weddingDate ? format(weddingDate, 'MMM d, yyyy') : 'TBD',
    },
    {
      label: 'Delivered',
      done: deliverables.length > 0 && deliverables.every(d => d.status === 'delivered'),
      detail: deliverables.length === 0 ? 'No deliverables' : `${deliverables.filter(d => d.status === 'delivered').length}/${deliverables.length}`,
    },
  ]

  return (
    <div className="space-y-6 max-w-5xl">
      {/* Back + Header */}
      <div>
        <button
          onClick={() => router.push('/admin/couples')}
          className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-3 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" /> All Couples
        </button>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold">{couple.couple_name}</h1>
            <p className="text-muted-foreground text-sm">
              {formatPackage(couple.package_type)}
              {couple.wedding_year && ` — ${couple.wedding_year}`}
              {couple.lead_source && ` — ${couple.lead_source}`}
            </p>
          </div>

          {/* Status badge */}
          <div>
            {couple.status === 'booked' && (
              <span className="inline-flex items-center rounded-full bg-blue-100 text-blue-700 px-3 py-1 text-sm font-medium">Booked</span>
            )}
            {couple.status === 'completed' && (
              <span className="inline-flex items-center rounded-full bg-green-100 text-green-700 px-3 py-1 text-sm font-medium">Completed</span>
            )}
            {couple.status === 'cancelled' && (
              <span className="inline-flex items-center rounded-full bg-red-100 text-red-700 px-3 py-1 text-sm font-medium">Cancelled</span>
            )}
          </div>
        </div>
      </div>

      {/* Wedding Countdown */}
      {weddingDate && (
        <div className={`rounded-xl p-5 border ${
          daysUntil !== null && daysUntil < 0
            ? 'bg-muted/50'
            : daysUntil !== null && daysUntil <= 30
              ? 'bg-amber-50 border-amber-200'
              : 'bg-blue-50 border-blue-200'
        }`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Calendar className={`h-5 w-5 ${daysUntil !== null && daysUntil < 0 ? 'text-muted-foreground' : 'text-blue-600'}`} />
              <div>
                <div className="font-semibold">{format(weddingDate, 'EEEE, MMMM d, yyyy')}</div>
                <div className="text-sm text-muted-foreground">
                  {couple.ceremony_venue || couple.reception_venue || 'Venue TBD'}
                </div>
              </div>
            </div>
            <div className="text-right">
              {daysUntil !== null && (
                daysUntil === 0 ? (
                  <div className="text-xl font-bold text-red-600">TODAY</div>
                ) : daysUntil > 0 ? (
                  <>
                    <div className="text-2xl font-bold">{daysUntil}</div>
                    <div className="text-xs text-muted-foreground">days away</div>
                  </>
                ) : (
                  <>
                    <div className="text-2xl font-bold text-muted-foreground">{Math.abs(daysUntil)}</div>
                    <div className="text-xs text-muted-foreground">days ago</div>
                  </>
                )
              )}
            </div>
          </div>
        </div>
      )}

      {/* Milestone Banner */}
      <div className="rounded-xl border bg-card p-4">
        <div className="flex items-center gap-2 mb-3">
          <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium text-muted-foreground">Milestones</span>
        </div>
        <div className="flex flex-wrap gap-3">
          {milestones.map((m) => (
            <div
              key={m.label}
              className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm border ${
                m.done
                  ? 'bg-green-50 border-green-200 text-green-800'
                  : 'bg-muted/30 border-border text-muted-foreground'
              }`}
            >
              <div className={`h-2 w-2 rounded-full ${m.done ? 'bg-green-500' : 'bg-gray-300'}`} />
              <span className="font-medium">{m.label}</span>
              {m.detail && <span className="text-xs opacity-75">({m.detail})</span>}
            </div>
          ))}
        </div>
      </div>

      {/* Financial Summary + Overview side-by-side */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Financial Summary */}
        <div className="rounded-xl border bg-card">
          <div className="p-4 border-b flex items-center gap-2">
            <DollarSign className="h-4 w-4 text-green-600" />
            <h2 className="font-semibold">Financial Summary</h2>
          </div>
          <div className="p-4 space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Contract Total</span>
              <span className="font-medium">${contractTotal.toLocaleString()}</span>
            </div>
            {extrasTotal > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Extras</span>
                <span className="font-medium">${extrasTotal.toLocaleString()}</span>
              </div>
            )}
            {grandTotal > 0 && extrasTotal > 0 && (
              <div className="flex justify-between text-sm border-t pt-2">
                <span className="text-muted-foreground">Grand Total</span>
                <span className="font-semibold">${grandTotal.toLocaleString()}</span>
              </div>
            )}
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Total Paid</span>
              <span className="font-medium text-green-600">${totalPaid.toLocaleString()}</span>
            </div>
            <div className="flex justify-between text-sm border-t pt-2">
              <span className="font-medium">Balance Owing</span>
              <span className={`font-bold text-lg ${balanceOwing > 0 ? 'text-red-600' : 'text-green-600'}`}>
                ${balanceOwing.toLocaleString()}
              </span>
            </div>
            {grandTotal > 0 && (
              <div className="pt-1">
                <div className="h-2 bg-muted rounded-full overflow-hidden">
                  <div
                    className="h-full bg-green-500 rounded-full transition-all"
                    style={{ width: `${Math.min((totalPaid / grandTotal) * 100, 100)}%` }}
                  />
                </div>
                <div className="text-xs text-muted-foreground mt-1 text-right">
                  {grandTotal > 0 ? Math.round((totalPaid / grandTotal) * 100) : 0}% collected
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Overview */}
        <div className="rounded-xl border bg-card">
          <div className="p-4 border-b flex items-center gap-2">
            <FileText className="h-4 w-4 text-blue-600" />
            <h2 className="font-semibold">Overview</h2>
          </div>
          <div className="p-4 space-y-3">
            <Row label="Package" value={formatPackage(couple.package_type)} />
            <Row label="Coverage" value={couple.coverage_hours ? `${couple.coverage_hours} hours` : 'Not set'} />
            <Row label="Photographer" value={couple.photographer || 'Not assigned'} />
            <Row label="Ceremony" value={couple.ceremony_venue || '—'} icon={<MapPin className="h-3 w-3" />} />
            <Row label="Reception" value={couple.reception_venue || '—'} icon={<MapPin className="h-3 w-3" />} />
            <Row label="Park / Outdoor" value={couple.park_location || '—'} icon={<MapPin className="h-3 w-3" />} />
            <Row label="Booked" value={couple.booked_date ? format(parseISO(couple.booked_date), 'MMM d, yyyy') : '—'} />
            <Row label="Lead Source" value={couple.lead_source || '—'} />
            {couple.engagement_date && (
              <Row label="Engagement" value={`${format(parseISO(couple.engagement_date), 'MMM d, yyyy')}${couple.engagement_location ? ' — ' + couple.engagement_location : ''}`} icon={<Heart className="h-3 w-3" />} />
            )}
          </div>
        </div>
      </div>

      {/* Contact Info (if any populated) */}
      {(couple.bride_name || couple.bride_email || couple.bride_phone || couple.groom_name || couple.groom_email || couple.groom_phone) && (
        <div className="rounded-xl border bg-card">
          <div className="p-4 border-b flex items-center gap-2">
            <Users className="h-4 w-4 text-pink-600" />
            <h2 className="font-semibold">Contact Info</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 divide-y sm:divide-y-0 sm:divide-x">
            <div className="p-4 space-y-2">
              <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Bride</div>
              <div className="text-sm">{couple.bride_name || '—'}</div>
              {couple.bride_email && <div className="text-sm text-muted-foreground">{couple.bride_email}</div>}
              {couple.bride_phone && <div className="text-sm text-muted-foreground">{couple.bride_phone}</div>}
            </div>
            <div className="p-4 space-y-2">
              <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Groom</div>
              <div className="text-sm">{couple.groom_name || '—'}</div>
              {couple.groom_email && <div className="text-sm text-muted-foreground">{couple.groom_email}</div>}
              {couple.groom_phone && <div className="text-sm text-muted-foreground">{couple.groom_phone}</div>}
            </div>
          </div>
        </div>
      )}

      {/* Payments */}
      <div className="rounded-xl border bg-card">
        <div className="p-4 border-b flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CreditCard className="h-4 w-4 text-green-600" />
            <h2 className="font-semibold">Payments</h2>
            {payments.length > 0 && (
              <span className="text-xs bg-muted rounded-full px-2 py-0.5">{payments.length}</span>
            )}
          </div>
        </div>
        {payments.length === 0 ? (
          <div className="p-6 text-center text-sm text-muted-foreground">
            No payments recorded yet.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/30">
                  <th className="text-left p-3 font-medium">Date</th>
                  <th className="text-left p-3 font-medium">Amount</th>
                  <th className="text-left p-3 font-medium hidden sm:table-cell">Method</th>
                  <th className="text-left p-3 font-medium hidden sm:table-cell">From</th>
                  <th className="text-left p-3 font-medium hidden md:table-cell">Type</th>
                  <th className="text-left p-3 font-medium hidden md:table-cell">Notes</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {payments.map((p) => (
                  <tr key={p.id}>
                    <td className="p-3">{format(parseISO(p.payment_date), 'MMM d, yyyy')}</td>
                    <td className="p-3 font-medium text-green-600">${Number(p.amount).toLocaleString()}</td>
                    <td className="p-3 hidden sm:table-cell text-muted-foreground">{p.method || '—'}</td>
                    <td className="p-3 hidden sm:table-cell text-muted-foreground">{p.from_name || '—'}</td>
                    <td className="p-3 hidden md:table-cell text-muted-foreground">{p.payment_type || '—'}</td>
                    <td className="p-3 hidden md:table-cell text-muted-foreground truncate max-w-[200px]">{p.notes || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Deliverables */}
      <div className="rounded-xl border bg-card">
        <div className="p-4 border-b flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Package className="h-4 w-4 text-purple-600" />
            <h2 className="font-semibold">Deliverables</h2>
            {deliverables.length > 0 && (
              <span className="text-xs bg-muted rounded-full px-2 py-0.5">{deliverables.length}</span>
            )}
          </div>
        </div>
        {deliverables.length === 0 ? (
          <div className="p-6 text-center text-sm text-muted-foreground">
            No deliverables tracked yet.
          </div>
        ) : (
          <div className="divide-y">
            {deliverables.map((d) => (
              <div key={d.id} className="p-4 flex items-center justify-between">
                <div>
                  <div className="font-medium text-sm capitalize">{d.deliverable_type.replace(/_/g, ' ')}</div>
                  <div className="text-xs text-muted-foreground">
                    {d.total_photos && `${d.edited_photos || 0}/${d.total_photos} photos edited`}
                    {d.started_date && ` — Started ${format(parseISO(d.started_date), 'MMM d')}`}
                    {d.delivered_date && ` — Delivered ${format(parseISO(d.delivered_date), 'MMM d')}`}
                  </div>
                </div>
                <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${deliverableStatusColor(d.status)}`}>
                  {(d.status || 'not started').replace(/_/g, ' ')}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Staff Assignments */}
      <div className="rounded-xl border bg-card">
        <div className="p-4 border-b flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4 text-blue-600" />
            <h2 className="font-semibold">Staff Assignments</h2>
          </div>
        </div>
        {staff.length === 0 ? (
          <div className="p-6 text-center text-sm text-muted-foreground">
            No staff assigned yet.
          </div>
        ) : (
          <div className="divide-y">
            {staff.map((s) => (
              <div key={s.id} className="p-4 flex items-center justify-between">
                <div>
                  <div className="font-medium text-sm">{s.staff_name}</div>
                  <div className="text-xs text-muted-foreground capitalize">{s.role.replace(/_/g, ' ')}</div>
                </div>
                <div className="flex items-center gap-2">
                  {s.confirmed ? (
                    <span className="inline-flex items-center gap-1 rounded-full bg-green-100 text-green-700 px-2 py-0.5 text-xs font-medium">
                      <CheckCircle2 className="h-3 w-3" /> Confirmed
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 text-amber-700 px-2 py-0.5 text-xs font-medium">
                      <AlertCircle className="h-3 w-3" /> Pending
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Documents */}
      <div className="rounded-xl border bg-card">
        <div className="p-4 border-b flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FileText className="h-4 w-4 text-indigo-600" />
            <h2 className="font-semibold">Documents</h2>
            {documents.length > 0 && (
              <span className="text-xs bg-muted rounded-full px-2 py-0.5">{documents.length}</span>
            )}
          </div>
          <label className={`inline-flex items-center gap-1.5 text-sm font-medium px-3 py-1.5 rounded-lg cursor-pointer transition-colors ${
            uploading ? 'bg-muted text-muted-foreground' : 'bg-indigo-50 text-indigo-700 hover:bg-indigo-100'
          }`}>
            {uploading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />}
            {uploading ? 'Uploading...' : 'Upload PDF'}
            <input
              type="file"
              accept=".pdf"
              className="hidden"
              disabled={uploading}
              onChange={(e) => {
                const file = e.target.files?.[0]
                if (file) uploadDocument(file)
                e.target.value = ''
              }}
            />
          </label>
        </div>
        {documents.length === 0 ? (
          <div className="p-6 text-center text-sm text-muted-foreground">
            No documents uploaded yet.
          </div>
        ) : (
          <div className="divide-y">
            {documents.map((doc) => (
              <div key={doc.name} className="p-4 flex items-center justify-between">
                <div className="flex items-center gap-3 min-w-0">
                  <FileText className="h-4 w-4 text-red-500 shrink-0" />
                  <div className="min-w-0">
                    <div className="text-sm font-medium truncate">{doc.name}</div>
                    {doc.created_at && (
                      <div className="text-xs text-muted-foreground">
                        {format(new Date(doc.created_at), 'MMM d, yyyy')}
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <a
                    href={getDocumentUrl(doc.name)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-1.5 rounded hover:bg-muted transition-colors text-blue-600"
                    title="Download"
                  >
                    <Download className="h-4 w-4" />
                  </a>
                  <button
                    onClick={() => deleteDocument(doc.name)}
                    className="p-1.5 rounded hover:bg-muted transition-colors text-red-500"
                    title="Delete"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Notes */}
      <div className="rounded-xl border bg-card">
        <div className="p-4 border-b flex items-center gap-2">
          <StickyNote className="h-4 w-4 text-amber-600" />
          <h2 className="font-semibold">Notes</h2>
        </div>
        <div className="p-4">
          {couple.notes ? (
            <p className="text-sm whitespace-pre-wrap">{couple.notes}</p>
          ) : (
            <p className="text-sm text-muted-foreground">No notes.</p>
          )}
        </div>
      </div>
    </div>
  )
}

function Row({ label, value, icon }: { label: string; value: string; icon?: React.ReactNode }) {
  return (
    <div className="flex justify-between text-sm">
      <span className="text-muted-foreground flex items-center gap-1">
        {icon}{label}
      </span>
      <span>{value}</span>
    </div>
  )
}
