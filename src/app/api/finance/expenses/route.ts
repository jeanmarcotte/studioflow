import { NextRequest, NextResponse } from 'next/server'
import { opsSupabase } from '@/lib/ops-supabase'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const fyStart = searchParams.get('fyStart') || '2025-05-01'
  const fyEnd = searchParams.get('fyEnd') || '2026-04-30'

  const { data, error } = await opsSupabase
    .from('transactions')
    .select('id, account_id, transaction_date, description, amount_cad')
    .in('account_id', ['td-business-2147', 'rbc-visa'])
    .lt('amount_cad', 0)
    .gte('transaction_date', fyStart)
    .lte('transaction_date', fyEnd)
    .order('transaction_date', { ascending: false })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ expenses: data || [] })
}
