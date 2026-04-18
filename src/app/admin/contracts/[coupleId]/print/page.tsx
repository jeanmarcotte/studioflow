'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { Loader2 } from 'lucide-react'
import { ContractPrintView } from './ContractPrintView'

export default function ContractPrintPage() {
  const params = useParams()
  const coupleId = params.coupleId as string

  const [contract, setContract] = useState<any>(null)
  const [coupleName, setCoupleName] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  useEffect(() => {
    async function fetchData() {
      if (!coupleId) return

      const { data: contractData } = await supabase
        .from('contracts')
        .select('*')
        .eq('couple_id', coupleId)
        .limit(1)

      if (!contractData || contractData.length === 0) {
        setError(true)
        setLoading(false)
        return
      }

      const { data: coupleData } = await supabase
        .from('couples')
        .select('couple_name')
        .eq('id', coupleId)
        .limit(1)

      setContract(contractData[0])
      setCoupleName(coupleData?.[0]?.couple_name ?? 'Unknown')
      setLoading(false)
    }

    fetchData()
  }, [coupleId])

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-teal-600" />
      </div>
    )
  }

  if (error || !contract) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-gray-500">Contract not found</p>
      </div>
    )
  }

  return <ContractPrintView contract={contract} coupleName={coupleName} />
}
