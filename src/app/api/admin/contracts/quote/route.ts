import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

function getServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const quoteId = searchParams.get('quote_id')

    if (!quoteId) {
      return NextResponse.json({ error: 'quote_id is required' }, { status: 400 })
    }

    const supabase = getServiceClient()

    const { data, error } = await supabase
      .from('client_quotes')
      .select('*')
      .eq('id', quoteId)
      .single()

    if (error || !data) {
      return NextResponse.json(
        { error: 'Quote not found' },
        { status: 404 }
      )
    }

    return NextResponse.json(data)
  } catch (err) {
    console.error('[GET /api/admin/contracts/quote] Error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
