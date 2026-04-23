'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { ArrowLeft, Loader2, Search } from 'lucide-react'
import { formatWeddingDate, formatCurrency } from '@/lib/formatters'
import Link from 'next/link'
import { Playfair_Display, DM_Sans } from 'next/font/google'

const playfair = Playfair_Display({ subsets: ['latin'], weight: ['400', '700'] })
const dmSans = DM_Sans({ subsets: ['latin'], weight: ['400', '500', '600'] })

const GOLD = '#C9A84C'
const BG = '#FAFAF5'
const TEXT = '#1A1A1A'

interface CoupleOption {
  id: string
  bride_first_name: string
  groom_first_name: string
  wedding_date: string | null
  total_paid: number | null
  balance_owing: number | null
}

interface ContractData {
  reception_venue: string | null
  total: number | null
}

export default function FrameSaleCoupleSelector() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [couples, setCouples] = useState<CoupleOption[]>([])
  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState<CoupleOption | null>(null)
  const [contract, setContract] = useState<ContractData | null>(null)

  useEffect(() => {
    async function fetch() {
      const { data: allCouples } = await supabase
        .from('couples')
        .select('id, bride_first_name, groom_first_name, wedding_date, total_paid, balance_owing')
        .eq('status', 'booked')
        .order('wedding_date', { ascending: true })

      const { data: existingOrders } = await supabase
        .from('extras_orders')
        .select('couple_id')

      const usedIds = new Set((existingOrders ?? []).map((o: any) => o.couple_id))
      const eligible = (allCouples ?? []).filter((c: any) => !usedIds.has(c.id))

      setCouples(eligible)
      setLoading(false)
    }
    fetch()
  }, [])

  async function selectCouple(couple: CoupleOption) {
    setSelected(couple)
    setSearch(`${couple.bride_first_name} & ${couple.groom_first_name}`)
    const { data } = await supabase
      .from('contracts')
      .select('reception_venue, total')
      .eq('couple_id', couple.id)
      .limit(1)
    setContract(data?.[0] ?? null)
  }

  const filtered = search.trim().length > 0 && !selected
    ? couples.filter((c) => {
        const name = `${c.bride_first_name} ${c.groom_first_name}`.toLowerCase()
        return name.includes(search.toLowerCase())
      }).slice(0, 5)
    : []

  if (loading) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ backgroundColor: BG }}>
        <Loader2 className="w-8 h-8 animate-spin" style={{ color: GOLD }} />
      </div>
    )
  }

  return (
    <div className={dmSans.className} style={{ position: 'fixed', inset: 0, zIndex: 50, backgroundColor: BG, color: TEXT, overflow: 'auto' }}>
      {/* Back arrow */}
      <div className="fixed top-4 left-4 md:top-6 md:left-6 z-50">
        <Link
          href="/admin/sales/frames"
          className="flex items-center gap-1.5 text-sm transition-colors"
          style={{ color: '#999' }}
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back</span>
        </Link>
      </div>

      {/* Centered content */}
      <div className="flex items-start justify-center min-h-full px-4" style={{ paddingTop: '23vh' }}>
        <div className="w-full md:max-w-[560px]">
          {/* Branding */}
          <p className="text-xs tracking-[0.2em] uppercase mb-2" style={{ color: '#BBBBBB' }}>
            SIGS Photography Ltd.
          </p>

          {/* Title */}
          <h1
            className={playfair.className}
            style={{ fontSize: 32, fontWeight: 700, letterSpacing: '-0.01em', marginBottom: 32 }}
          >
            Frame & Album Sale
          </h1>

          {/* Search input */}
          <div className="relative mb-2">
            <Search
              className="absolute left-5 top-1/2 -translate-y-1/2 pointer-events-none"
              style={{ width: 18, height: 18, color: '#CCCCCC' }}
            />
            <input
              type="text"
              placeholder="Search by couple name..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value)
                if (selected) { setSelected(null); setContract(null) }
              }}
              className={`${dmSans.className} w-full pr-4 py-4 rounded-xl text-base outline-none transition-shadow`}
              style={{
                paddingLeft: 52,
                backgroundColor: '#FFFFFF',
                border: '1px solid #E8E8E3',
                boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
                fontSize: 16,
                color: TEXT,
              }}
            />
          </div>

          {/* Search results dropdown */}
          {filtered.length > 0 && (
            <div
              className="rounded-xl overflow-hidden mb-6"
              style={{
                backgroundColor: '#FFFFFF',
                border: '1px solid #E8E8E3',
                boxShadow: '0 4px 16px rgba(0,0,0,0.06)',
              }}
            >
              {filtered.map((c, i) => (
                <button
                  key={c.id}
                  onClick={() => selectCouple(c)}
                  className="w-full flex items-center justify-between px-5 py-3.5 text-left transition-colors"
                  style={{
                    borderBottom: i < filtered.length - 1 ? '1px solid #F3F3EE' : 'none',
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#FAFAF5')}
                  onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#FFFFFF')}
                >
                  <span className="font-medium" style={{ fontSize: 15 }}>
                    {c.bride_first_name} & {c.groom_first_name}
                  </span>
                  <span style={{ fontSize: 13, color: '#999' }}>
                    {formatWeddingDate(c.wedding_date)}
                  </span>
                </button>
              ))}
            </div>
          )}

          {/* No results */}
          {search.trim().length > 0 && !selected && filtered.length === 0 && (
            <p className="text-center text-sm mt-4" style={{ color: '#BBBBBB' }}>
              No eligible couples found
            </p>
          )}

          {/* Selected couple card */}
          {selected && (
            <div className="mt-8">
              <div
                className="rounded-2xl overflow-hidden"
                style={{
                  backgroundColor: '#FFFFFF',
                  border: '1px solid #E8E8E3',
                  boxShadow: '0 4px 20px rgba(0,0,0,0.06)',
                }}
              >
                <div className="px-7 pt-7 pb-5">
                  <div className="flex items-start justify-between">
                    <div>
                      <h2
                        className={playfair.className}
                        style={{ fontSize: 26, fontWeight: 700, lineHeight: 1.2 }}
                      >
                        {selected.bride_first_name} & {selected.groom_first_name}
                      </h2>
                      <p className="mt-1.5" style={{ fontSize: 14, color: '#888' }}>
                        {formatWeddingDate(selected.wedding_date)}
                      </p>
                      {contract?.reception_venue && (
                        <p style={{ fontSize: 14, color: '#AAAAAA', marginTop: 2 }}>
                          {contract.reception_venue}
                        </p>
                      )}
                    </div>
                    <button
                      onClick={() => { setSelected(null); setContract(null); setSearch('') }}
                      className="text-xs transition-colors"
                      style={{ color: '#CCCCCC', marginTop: 4 }}
                      onMouseEnter={(e) => (e.currentTarget.style.color = '#888')}
                      onMouseLeave={(e) => (e.currentTarget.style.color = '#CCCCCC')}
                    >
                      Change
                    </button>
                  </div>
                </div>

                <div style={{ borderTop: '1px solid #F3F3EE' }}>
                  <div className="grid grid-cols-1 md:grid-cols-3">
                    {[
                      { label: 'Contract', value: formatCurrency(contract?.total) },
                      { label: 'Paid', value: formatCurrency(selected.total_paid) },
                      { label: 'Balance', value: formatCurrency(selected.balance_owing) },
                    ].map((stat, i) => (
                      <div
                        key={stat.label}
                        className="text-center py-5"
                        style={{ borderRight: i < 2 ? '1px solid #F3F3EE' : 'none' }}
                      >
                        <p className="text-xs uppercase tracking-wider mb-1.5" style={{ color: '#BBBBBB' }}>
                          {stat.label}
                        </p>
                        <p className="text-lg font-semibold tabular-nums">{stat.value}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* CTA */}
              <button
                onClick={() => router.push(`/admin/sales/frames/new/${selected.id}`)}
                className="w-full mt-6 py-4 rounded-xl text-base font-semibold tracking-wide transition-all"
                style={{
                  backgroundColor: GOLD,
                  color: '#FFFFFF',
                  boxShadow: '0 2px 12px rgba(201,168,76,0.3)',
                  letterSpacing: '0.02em',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.boxShadow = '0 4px 20px rgba(201,168,76,0.4)')}
                onMouseLeave={(e) => (e.currentTarget.style.boxShadow = '0 2px 12px rgba(201,168,76,0.3)')}
              >
                Begin Presentation &rarr;
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
