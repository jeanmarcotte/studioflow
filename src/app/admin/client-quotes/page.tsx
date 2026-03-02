import { redirect } from 'next/navigation'

export default function ClientQuotesRedirect() {
  redirect('/admin/sales/quotes')
}
