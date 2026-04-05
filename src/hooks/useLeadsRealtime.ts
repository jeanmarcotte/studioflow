'use client'

import { useEffect, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import type { Lead } from '@/lib/lead-utils'

type RealtimeCallback = (payload: {
  eventType: 'INSERT' | 'UPDATE' | 'DELETE'
  new: Lead | null
  old: Partial<Lead> | null
}) => void

export function useLeadsRealtime(onUpdate: RealtimeCallback) {
  const callbackRef = useRef(onUpdate)
  callbackRef.current = onUpdate

  useEffect(() => {
    const channel = supabase
      .channel('leads-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'ballots' },
        (payload) => {
          callbackRef.current({
            eventType: payload.eventType as 'INSERT' | 'UPDATE' | 'DELETE',
            new: (payload.new as Lead) || null,
            old: (payload.old as Partial<Lead>) || null,
          })
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [])
}
