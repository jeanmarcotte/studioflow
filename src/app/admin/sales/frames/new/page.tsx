'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { ArrowLeft, Loader2, ChevronRight, Search } from 'lucide-react'
import { formatWeddingDate, formatCurrency } from '@/lib/formatters'
import Link from 'next/link'

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
      // Get all booked couples
      const { data: allCouples } = await supabase
        .from('couples')
        .select('id, bride_first_name, groom_first_name, wedding_date, total_paid, balance_owing')
        .eq('status', 'booked')
        .order('wedding_date', { ascending: false })

      // Get couple IDs that already have extras_orders
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
    const { data } = await supabase
      .from('contracts')
      .select('reception_venue, total')
      .eq('couple_id', couple.id)
      .limit(1)
    setContract(data?.[0] ?? null)
  }

  const filtered = couples.filter((c) => {
    const name = `${c.bride_first_name} ${c.groom_first_name}`.toLowerCase()
    return name.includes(search.toLowerCase())
  })

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link href="/admin/sales/frames" className="p-2 rounded-md hover:bg-accent/50 transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold">Frame & Album Sale</h1>
          <p className="text-sm text-muted-foreground">Select a couple to begin</p>
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
        <input
          type="text"
          placeholder="Search couples..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-10 pr-4 py-3 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
        />
      </div>

      {/* Couple list */}
      {!selected && (
        <div className="border rounded-lg divide-y">
          {filtered.length === 0 && (
            <p className="p-4 text-sm text-muted-foreground text-center">No eligible couples found</p>
          )}
          {filtered.map((c) => (
            <button
              key={c.id}
              onClick={() => selectCouple(c)}
              className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-accent/50 transition-colors"
            >
              <div>
                <p className="font-medium">{c.bride_first_name} & {c.groom_first_name}</p>
                <p className="text-sm text-muted-foreground">{formatWeddingDate(c.wedding_date)}</p>
              </div>
              <ChevronRight className="w-4 h-4 text-muted-foreground" />
            </button>
          ))}
        </div>
      )}

      {/* Selected couple summary */}
      {selected && (
        <div className="space-y-4">
          <div className="border rounded-lg p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold">{selected.bride_first_name} & {selected.groom_first_name}</h2>
                <p className="text-sm text-muted-foreground">{formatWeddingDate(selected.wedding_date)}</p>
                {contract?.reception_venue && (
                  <p className="text-sm text-muted-foreground">{contract.reception_venue}</p>
                )}
              </div>
              <button
                onClick={() => { setSelected(null); setContract(null) }}
                className="text-sm text-muted-foreground hover:underline"
              >
                Change
              </button>
            </div>

            <div className="grid grid-cols-3 gap-4 pt-4 border-t">
              <div>
                <p className="text-xs uppercase tracking-wider text-muted-foreground mb-1">Contract Total</p>
                <p className="text-lg font-semibold">{formatCurrency(contract?.total)}</p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-wider text-muted-foreground mb-1">Total Paid</p>
                <p className="text-lg font-semibold">{formatCurrency(selected.total_paid)}</p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-wider text-muted-foreground mb-1">Balance Owing</p>
                <p className="text-lg font-semibold">{formatCurrency(selected.balance_owing)}</p>
              </div>
            </div>
          </div>

          <button
            onClick={() => router.push(`/admin/sales/frames/new/${selected.id}`)}
            className="w-full flex items-center justify-center gap-2 px-6 py-3 rounded-lg bg-primary text-primary-foreground font-semibold hover:bg-primary/90 transition-colors"
          >
            Continue <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  )
}
