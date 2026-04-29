import { createClient } from '@supabase/supabase-js'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { Playfair_Display } from 'next/font/google'
import { format, parseISO } from 'date-fns'
import { ChevronLeft, Check, Wallet } from 'lucide-react'
import { formatCurrency } from '@/lib/formatters'

const playfair = Playfair_Display({ subsets: ['latin'], weight: ['700'] })

const TEAL = '#0F6E56'

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

function formatPaymentDate(dateStr: string | null): string {
  if (!dateStr) return '—'
  try {
    const parsed = parseISO(dateStr)
    return format(parsed, 'EEE MMM d, yyyy').replace(/^(\w{3})/, (m) => m.toUpperCase())
  } catch {
    return dateStr
  }
}

function formatMethod(method: string | null): string {
  if (!method) return 'Payment'
  const map: Record<string, string> = {
    e_transfer: 'E-Transfer',
    etransfer: 'E-Transfer',
    'e-transfer': 'E-Transfer',
    cash: 'Cash',
    cheque: 'Cheque',
    check: 'Cheque',
    credit_card: 'Credit Card',
    card: 'Credit Card',
    bank_transfer: 'Bank Transfer',
    wire: 'Wire Transfer',
  }
  const key = method.toLowerCase().replace(/\s+/g, '_')
  return map[key] ?? method
}

export default async function PortalPaymentsPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const supabase = getSupabase()

  const { data: couples } = await supabase
    .from('couples')
    .select('id, bride_first_name, groom_first_name, portal_slug')
    .eq('portal_slug', slug)
    .limit(1)
  const couple = couples?.[0]
  if (!couple) return notFound()

  const { data: contracts } = await supabase
    .from('contracts')
    .select('total')
    .eq('couple_id', couple.id)
    .limit(1)
  const contract = contracts?.[0]

  const { data: payments } = await supabase
    .from('payments')
    .select('amount, payment_date, method, from_name, label')
    .eq('couple_id', couple.id)
    .order('payment_date', { ascending: false })

  const contractTotal = Number(contract?.total ?? 0)
  const totalPaid = (payments ?? []).reduce((sum, p) => sum + Number(p.amount ?? 0), 0)
  const balance = contractTotal - totalPaid
  const isPaidInFull = contract != null && balance === 0 && contractTotal > 0

  return (
    <div>
      {/* Back to portal */}
      <Link
        href={`/portal/${slug}`}
        className="inline-flex items-center gap-1 text-sm font-medium mb-4"
        style={{ color: TEAL }}
      >
        <ChevronLeft size={16} /> Back to Portal
      </Link>

      {/* Header */}
      <div className="flex items-center gap-2 mb-6">
        <Wallet size={22} style={{ color: TEAL }} />
        <h1 className={`${playfair.className} text-2xl`} style={{ color: '#1a1a1a' }}>
          Your Account
        </h1>
      </div>

      {/* Ledger card */}
      {!contract ? (
        <div className="bg-white rounded-xl p-6 mb-6 text-center" style={{ boxShadow: '0 2px 12px rgba(0,0,0,0.04)' }}>
          <p className="text-sm" style={{ color: '#777' }}>No contract on file.</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl p-5 sm:p-6 mb-6" style={{ boxShadow: '0 2px 12px rgba(0,0,0,0.04)' }}>
          <div className="flex justify-between items-baseline py-2">
            <span className="text-sm" style={{ color: '#666' }}>Contract Total</span>
            <span className="text-base font-semibold" style={{ color: '#1a1a1a' }}>{formatCurrency(contractTotal)}</span>
          </div>
          <div className="flex justify-between items-baseline py-2">
            <span className="text-sm" style={{ color: '#666' }}>Total Paid</span>
            <span className="text-base font-semibold" style={{ color: '#1a1a1a' }}>−{formatCurrency(totalPaid)}</span>
          </div>
          <div style={{ height: 1, backgroundColor: '#eee', margin: '12px 0' }} />
          <div className="flex justify-between items-baseline py-2">
            <span className="text-sm font-semibold" style={{ color: '#1a1a1a' }}>Balance Remaining</span>
            <span
              className={`${playfair.className} text-xl`}
              style={{ color: isPaidInFull ? TEAL : '#1a1a1a' }}
            >
              {formatCurrency(balance)}
            </span>
          </div>

          {isPaidInFull && (
            <div className="mt-4 flex items-center justify-center gap-2 py-3 rounded-lg" style={{ backgroundColor: '#f0f9f7' }}>
              <Check size={18} style={{ color: TEAL }} />
              <span className="text-sm font-semibold" style={{ color: TEAL }}>Paid in Full</span>
            </div>
          )}
        </div>
      )}

      {/* Payment History */}
      <div className="mb-6">
        <h2 className={`${playfair.className} text-lg mb-3`} style={{ color: '#1a1a1a' }}>
          Payment History
        </h2>
        {(!payments || payments.length === 0) ? (
          <div className="bg-white rounded-xl p-6 text-center" style={{ boxShadow: '0 2px 12px rgba(0,0,0,0.04)' }}>
            <p className="text-sm" style={{ color: '#777' }}>No payments recorded yet.</p>
          </div>
        ) : (
          <div className="bg-white rounded-xl overflow-hidden" style={{ boxShadow: '0 2px 12px rgba(0,0,0,0.04)' }}>
            {payments.map((p, i) => (
              <div
                key={i}
                className="px-4 sm:px-5 py-4"
                style={{ borderBottom: i < payments.length - 1 ? '1px solid #f5f2ed' : 'none' }}
              >
                <div className="flex justify-between items-baseline gap-3">
                  <div>
                    <p className="text-sm font-semibold" style={{ color: '#1a1a1a' }}>
                      {formatPaymentDate(p.payment_date)}
                    </p>
                    <p className="text-xs mt-1" style={{ color: '#777' }}>
                      {formatMethod(p.method)}
                      {p.label ? ` · ${p.label}` : ''}
                      {p.from_name ? ` · from ${p.from_name}` : ''}
                    </p>
                  </div>
                  <span className="text-sm font-semibold whitespace-nowrap" style={{ color: '#1a1a1a' }}>
                    {formatCurrency(Number(p.amount ?? 0))}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Help */}
      <div className="text-center text-sm mb-6" style={{ color: '#777' }}>
        Questions? Text Marianna<br />
        <a href="tel:+14168318942" style={{ color: TEAL, fontWeight: 500 }}>(416) 831-8942</a>
      </div>
    </div>
  )
}
