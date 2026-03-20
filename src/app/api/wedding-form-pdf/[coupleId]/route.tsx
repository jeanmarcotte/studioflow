import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { renderToBuffer } from '@react-pdf/renderer'
import WeddingDayFormPDF from '@/components/reports/WeddingDayFormPDF'

function getServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

export async function GET(
  _request: Request,
  { params }: { params: { coupleId: string } }
) {
  try {
    const { coupleId } = params
    const supabase = getServiceClient()

    // Parallel queries
    const [formRes, coupleRes, assignmentRes] = await Promise.all([
      supabase
        .from('wedding_day_forms')
        .select('*')
        .eq('couple_id', coupleId)
        .single(),
      supabase
        .from('couples')
        .select('couple_name, bride_first_name, groom_first_name, wedding_date')
        .eq('id', coupleId)
        .single(),
      supabase
        .from('wedding_assignments')
        .select('photo_1, photo_2, video_1')
        .eq('couple_id', coupleId)
        .single(),
    ])

    if (coupleRes.error || !coupleRes.data) {
      return NextResponse.json({ error: 'Couple not found' }, { status: 404 })
    }

    if (formRes.error || !formRes.data) {
      return NextResponse.json({ error: 'Wedding day form not submitted yet' }, { status: 404 })
    }

    // Generate PDF
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const pdfBuffer = await renderToBuffer(
      <WeddingDayFormPDF
        form={formRes.data}
        couple={coupleRes.data}
        assignment={assignmentRes.data || null}
      /> as any
    )

    // Build filename from couple name
    const safeName = coupleRes.data.couple_name.replace(/[^a-zA-Z0-9& ]/g, '').replace(/\s+/g, '_').replace(/&/g, '_')
    const filename = `${safeName}_Wedding_Day_Form.pdf`

    return new Response(new Uint8Array(pdfBuffer), {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    })
  } catch (err) {
    console.error('[GET /api/wedding-form-pdf] Error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
