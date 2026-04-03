"use client"

import { useSearchParams } from "next/navigation"
import { useEffect, useState, Suspense } from "react"
import { supabase } from "@/lib/supabase"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { format } from "date-fns"

interface ExtrasOrder {
  id: string
  order_date: string
  status: string
  extras_sale_amount: number
  collage_size: string | null
  collage_frame_color: string | null
  album_qty: number | null
  album_cover: string | null
  wedding_frame_size: string | null
  signing_book: boolean | null
  downpayment: number | null
  num_installments: number | null
  payment_per_installment: number | null
  couples: {
    bride_name: string
    groom_name: string
    wedding_date: string
  }
}

function formatCurrency(amount: number | null): string {
  if (!amount) return "$0"
  return new Intl.NumberFormat("en-CA", {
    style: "currency",
    currency: "CAD",
    minimumFractionDigits: 0,
  }).format(amount)
}

function ExtrasQuoteContent() {
  const searchParams = useSearchParams()
  const orderId = searchParams.get("id")

  const [order, setOrder] = useState<ExtrasOrder | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!orderId) {
      setError("No order ID provided")
      setLoading(false)
      return
    }

    async function fetchOrder() {
      const { data, error } = await supabase
        .from("extras_orders")
        .select(`
          *,
          couples (
            bride_name,
            groom_name,
            wedding_date
          )
        `)
        .eq("id", orderId)
        .limit(1)

      if (error) {
        setError(error.message)
      } else if (data && data.length > 0) {
        setOrder(data[0] as ExtrasOrder)
      } else {
        setError("Order not found")
      }
      setLoading(false)
    }

    fetchOrder()
  }, [orderId])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    )
  }

  if (error || !order) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="max-w-md">
          <CardContent className="pt-6">
            <p className="text-destructive">{error || "Order not found"}</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  const items = []
  if (order.collage_size) items.push({ name: `Collage (${order.collage_size})`, detail: order.collage_frame_color || "" })
  if (order.album_qty) items.push({ name: `Album x${order.album_qty}`, detail: order.album_cover || "" })
  if (order.wedding_frame_size) items.push({ name: `Wedding Frame (${order.wedding_frame_size})`, detail: "" })
  if (order.signing_book) items.push({ name: "Signing Book", detail: "" })

  return (
    <div className="min-h-screen bg-muted/30 py-8 print:bg-white print:py-0">
      <div className="container mx-auto px-4 max-w-2xl">
        {/* Header */}
        <header className="text-center mb-8 print:mb-4">
          <h1 className="text-3xl font-bold tracking-tight">SIGS Photography</h1>
          <p className="text-muted-foreground">Extras & Frames Quote</p>
        </header>

        {/* Quote Card */}
        <Card className="print:shadow-none print:border-0">
          <CardHeader className="border-b">
            <div className="flex justify-between items-start">
              <div>
                <CardTitle className="text-xl">
                  {order.couples.bride_name} & {order.couples.groom_name}
                </CardTitle>
                <p className="text-muted-foreground text-sm">
                  Wedding: {format(new Date(order.couples.wedding_date), "MMMM d, yyyy")}
                </p>
              </div>
              <Badge variant={order.status === "signed" ? "default" : "secondary"}>
                {order.status}
              </Badge>
            </div>
          </CardHeader>

          <CardContent className="pt-6 space-y-6">
            {/* Order Details */}
            <div>
              <h3 className="font-semibold mb-3">Order Details</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Quote Date: {format(new Date(order.order_date), "MMMM d, yyyy")}
              </p>

              <div className="space-y-2">
                {items.map((item, i) => (
                  <div key={i} className="flex justify-between py-2 border-b last:border-0">
                    <span>{item.name}</span>
                    <span className="text-muted-foreground">{item.detail}</span>
                  </div>
                ))}
              </div>
            </div>

            <Separator />

            {/* Pricing */}
            <div>
              <h3 className="font-semibold mb-3">Pricing</h3>
              <div className="space-y-2">
                <div className="flex justify-between text-lg font-semibold">
                  <span>Total</span>
                  <span className="text-primary">{formatCurrency(order.extras_sale_amount)}</span>
                </div>

                {order.downpayment && (
                  <div className="flex justify-between text-sm">
                    <span>Downpayment</span>
                    <span>{formatCurrency(order.downpayment)}</span>
                  </div>
                )}

                {order.num_installments && order.payment_per_installment && (
                  <div className="flex justify-between text-sm text-muted-foreground">
                    <span>{order.num_installments} monthly payments</span>
                    <span>{formatCurrency(order.payment_per_installment)}/month</span>
                  </div>
                )}
              </div>
            </div>

            <Separator />

            {/* Footer */}
            <div className="text-center text-sm text-muted-foreground pt-4">
              <p>Questions? Contact us at info@sigsphoto.ca</p>
              <p className="mt-1">SIGS Photography — Toronto & GTA</p>
            </div>
          </CardContent>
        </Card>

        {/* Print Button (hidden when printing) */}
        <div className="text-center mt-6 print:hidden">
          <button
            onClick={() => window.print()}
            className="text-sm text-muted-foreground hover:text-foreground"
          >
            Print this quote
          </button>
        </div>
      </div>
    </div>
  )
}

export default function ExtrasQuotePage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    }>
      <ExtrasQuoteContent />
    </Suspense>
  )
}
