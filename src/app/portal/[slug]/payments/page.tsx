import { createClient } from '@supabase/supabase-js'
import { notFound } from 'next/navigation'
import { Playfair_Display, DM_Sans } from 'next/font/google'
import { formatCurrency, formatDateCompact } from '@/lib/formatters'
import { differenceInDays, parseISO } from 'date-fns'

const playfair = Playfair_Display({ subsets: ['latin'], weight: ['700'] })
const dmSans = DM_Sans({ subsets: ['latin'], weight: ['400', '500', '600'] })

function getSupabase() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
}

function ProgressRing({ percent }: { percent: number }) {
  const r = 70
  const circ = 2 * Math.PI * r
  const offset = circ - (Math.min(percent, 100) / 100) * circ
  const isFull = percent >= 100

  return (
    <div className="flex flex-col items-center">
      <svg width={180} height={180} viewBox="0 0 180 180">
        <circle cx={90} cy={90} r={r} fill="none" stroke="#e5e7eb" strokeWidth={12} />
        <circle
          cx={90} cy={90} r={r} fill="none"
          stroke={isFull ? '#16a34a' : '#0d9488'}
          strokeWidth={12}
          strokeLinecap="round"
          strokeDasharray={circ}
          strokeDashoffset={offset}
          transform="rotate(-90 90 90)"
          style={{ transition: 'stroke-dashoffset 1s ease' }}
        />
        <text x={90} y={82} textAnchor="middle" className={dmSans.className} style={{ fontSize: 36, fontWeight: 700, fill: isFull ? '#16a34a' : '#1a1a1a' }}>
          {isFull ? '100' : percent}%
        </text>
        <text x={90} y={108} textAnchor="middle" className={dmSans.className} style={{ fontSize: 14, fontWeight: 500, fill: isFull ? '#16a34a' : '#999', textTransform: 'uppercase' as const, letterSpacing: 2 }}>
          {isFull ? 'PAID IN FULL' : 'PAID'}
        </text>
      </svg>
    </div>
  )
}

export default async function PaymentsPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const supabase = getSupabase()

  const { data: couples } = await supabase.from('couples').select('id, bride_first_name, groom_first_name, wedding_date').eq('portal_slug', slug).limit(1)
  const couple = couples?.[0]
  if (!couple) return notFound()

  const [contractRes, extrasRes, c3Res, paymentsRes] = await Promise.all([
    supabase.from('contracts').select('total, package_name').eq('couple_id', couple.id).limit(1),
    supabase.from('extras_orders').select('id, extras_sale_amount, status').eq('couple_id', couple.id),
    supabase.from('c3_line_items').select('total').eq('couple_id', couple.id),
    supabase.from('payments').select('amount, payment_date, payment_method, notes').eq('couple_id', couple.id).order('payment_date', { ascending: false }),
  ])

  const contract = contractRes.data?.[0]
  const c1 = parseFloat(contract?.total) || 0
  const signedExtras = (extrasRes.data || []).filter((e: any) => ['signed', 'paid', 'completed'].includes(e.status))
  const c2 = signedExtras.reduce((sum: number, e: any) => sum + (parseFloat(e.extras_sale_amount) || 0), 0)
  const c3 = (c3Res.data || []).reduce((sum: number, i: any) => sum + (parseFloat(i.total) || 0), 0)
  const invoiced = c1 + c2 + c3
  const received = (paymentsRes.data || []).reduce((sum: number, p: any) => sum + (parseFloat(p.amount) || 0), 0)
  const balance = invoiced - received
  const paidInFull = Math.abs(balance) < 50
  const paidPercent = invoiced > 0 ? Math.round((received / invoiced) * 100) : 0

  // Installments
  const orderIds = signedExtras.map((e: any) => e.id)
  let installments: any[] = []
  if (orderIds.length > 0) {
    const { data } = await supabase
      .from('extras_installments')
      .select('amount, due_date, paid, due_description')
      .in('extras_order_id', orderIds)
      .order('due_date', { ascending: true })
    installments = data ?? []
  }

  const today = new Date()
  const payments = paymentsRes.data || []

  return (
    <div className={`${dmSans.className} space-y-6`}>
      {/* Progress Ring */}
      <div className="text-center">
        <ProgressRing percent={paidInFull ? 100 : paidPercent} />
      </div>

      {/* Totals */}
      <div className="bg-white rounded-xl p-5" style={{ boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }}>
        <div className="space-y-3">
          <div className="flex justify-between text-sm">
            <span style={{ color: '#666' }}>Total Invoiced</span>
            <span className="font-semibold">{formatCurrency(invoiced.toFixed(2))}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span style={{ color: '#666' }}>Total Paid</span>
            <span className="font-semibold" style={{ color: '#0d9488' }}>{formatCurrency(received.toFixed(2))}</span>
          </div>
          <hr style={{ borderColor: '#f0f0f0' }} />
          <div className="flex justify-between text-sm">
            <span style={{ color: '#666' }}>Remaining</span>
            <span className="font-bold" style={{ color: paidInFull ? '#16a34a' : '#dc2626' }}>
              {paidInFull ? '$0.00' : formatCurrency(balance.toFixed(2))}
            </span>
          </div>
        </div>
      </div>

      {/* Installments */}
      {installments.length > 0 && (
        <div>
          <h3 className={`${playfair.className} text-lg mb-3`}>Upcoming Installments</h3>
          <div className="bg-white rounded-xl overflow-hidden" style={{ boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }}>
            {installments.map((inst: any, i: number) => {
              const dueDate = inst.due_date ? parseISO(inst.due_date) : null
              const overdueDays = dueDate && !inst.paid ? differenceInDays(today, dueDate) : 0
              const isOverdue = overdueDays > 0 && !inst.paid
              const isPaid = inst.paid === true

              return (
                <div key={i} className={`flex items-center justify-between px-4 py-3 ${i > 0 ? 'border-t' : ''}`} style={{ borderColor: '#f0f0f0', backgroundColor: isOverdue ? '#fef2f2' : 'transparent' }}>
                  <div>
                    <p className="text-sm font-medium">{inst.due_description || `Installment #${i + 1}`}</p>
                    <p className="text-xs" style={{ color: '#999' }}>{inst.due_date ? formatDateCompact(inst.due_date) : '—'}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-semibold">{formatCurrency(inst.amount)}</span>
                    {isPaid ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-green-100 text-green-700 px-2 py-0.5 text-xs font-medium">Paid</span>
                    ) : isOverdue ? (
                      <span className="inline-flex items-center rounded-full bg-red-100 text-red-700 px-2 py-0.5 text-xs font-medium">{overdueDays}d overdue</span>
                    ) : (
                      <span className="inline-flex items-center rounded-full bg-gray-100 text-gray-600 px-2 py-0.5 text-xs font-medium">Due</span>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Payment History */}
      {payments.length > 0 && (
        <div>
          <h3 className={`${playfair.className} text-lg mb-3`}>Payment History</h3>
          <div className="bg-white rounded-xl overflow-hidden" style={{ boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }}>
            {payments.map((p: any, i: number) => (
              <div key={i} className={`flex items-center justify-between px-4 py-3 ${i > 0 ? 'border-t' : ''}`} style={{ borderColor: '#f0f0f0' }}>
                <div>
                  <p className="text-sm font-medium">{formatDateCompact(p.payment_date)}</p>
                  {p.notes && <p className="text-xs" style={{ color: '#999' }}>{p.notes}</p>}
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-sm font-semibold" style={{ color: '#0d9488' }}>{formatCurrency(p.amount)}</span>
                  <span className="text-xs" style={{ color: '#999' }}>{p.payment_method || 'E-Transfer'}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* How to Pay */}
      <div>
        <h3 className={`${playfair.className} text-lg mb-3`}>How to Pay</h3>
        <div className="rounded-xl p-5" style={{ backgroundColor: '#f0fdfa', border: '1px solid #ccfbf1' }}>
          <p className="text-sm font-semibold mb-2" style={{ color: '#0d9488' }}>E-Transfer to:</p>
          <p className="text-base font-bold mb-3">info@sigsphoto.ca</p>
          <p className="text-sm" style={{ color: '#666' }}>Please include your names in the message field.</p>
        </div>
        <p className="text-xs text-center mt-3" style={{ color: '#999' }}>
          Questions? Email <a href="mailto:info@sigsphoto.ca" style={{ color: '#0d9488' }}>info@sigsphoto.ca</a>
        </p>
      </div>
    </div>
  )
}
