import { Playfair_Display } from 'next/font/google'

const playfair = Playfair_Display({ subsets: ['latin'], weight: ['700'] })

export default function PaymentsPage() {
  return (
    <div className="text-center py-20">
      <h2 className={`${playfair.className} text-2xl`}>Your Payments</h2>
      <p className="text-gray-500 mt-2">Coming soon — view your balance and installments</p>
    </div>
  )
}
