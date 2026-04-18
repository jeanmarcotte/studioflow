import { NextResponse } from 'next/server'
import { trackLogin } from '@/lib/portal/track-login'

export async function POST(request: Request) {
  try {
    const { coupleId } = await request.json()
    if (!coupleId) {
      return NextResponse.json({ error: 'coupleId required' }, { status: 400 })
    }
    await trackLogin(coupleId)
    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('[Portal] track-login error:', err)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
