import { supabase } from '@/lib/supabase'

export function calculateTemperature(lastContactDate: Date | null): 'hot' | 'warm' | 'cool' | 'cold' {
  if (!lastContactDate) return 'cold'
  const hoursSince = (Date.now() - lastContactDate.getTime()) / (1000 * 60 * 60)
  if (hoursSince < 24) return 'hot'
  if (hoursSince < 48) return 'warm'
  if (hoursSince < 72) return 'cool'
  return 'cold'
}

export async function logTouch(
  ballotId: string,
  entityId: string | null,
  contactType: 'call' | 'text' | 'email' | 'view',
  notes?: string
): Promise<{ contactId: string; touchNumber: number; cooldownHoursLeft?: number } | null> {
  // 1. Get current contact_count
  const { data: ballot } = await supabase
    .from('ballots')
    .select('contact_count, last_contact_date')
    .eq('id', ballotId)
    .limit(1)

  const current = ballot?.[0]
  if (!current) return null

  // Check 4-hour cooldown (skip for 'view' type)
  if (contactType !== 'view' && current.last_contact_date) {
    const hoursSince = (Date.now() - new Date(current.last_contact_date).getTime()) / (1000 * 60 * 60)
    if (hoursSince < 4) {
      const hoursLeft = Math.ceil(4 - hoursSince)
      return { contactId: '', touchNumber: -1, cooldownHoursLeft: hoursLeft }
    }
  }

  const newCount = (current.contact_count || 0) + 1
  const now = new Date()
  const nextDue = new Date()
  nextDue.setDate(nextDue.getDate() + 2)
  const newTemp = calculateTemperature(now)

  // 2. Insert lead_contacts
  const { data: contact, error: contactErr } = await supabase
    .from('lead_contacts')
    .insert({
      ballot_id: ballotId,
      entity_id: entityId,
      contact_number: newCount,
      contact_type: contactType,
      contact_date: now.toISOString(),
      outcome: 'sent',
      notes: notes || null,
    })
    .select('id')
    .limit(1)

  if (contactErr || !contact?.[0]) return null

  // 3. Update ballot
  await supabase
    .from('ballots')
    .update({
      contact_count: newCount,
      last_contact_date: now.toISOString(),
      next_contact_due: nextDue.toISOString().split('T')[0],
      temperature: newTemp,
      status: newCount === 1 && current.contact_count === 0 ? 'contacted' : undefined,
    })
    .eq('id', ballotId)

  // 4. Check exhaustion (Touch 6)
  if (newCount >= 6) {
    await supabase
      .from('ballots')
      .update({ status: 'dead', contact_status: 'exhausted' })
      .eq('id', ballotId)

    if (entityId) {
      await supabase.from('entity_events').insert({
        entity_id: entityId,
        event_type: 'exhausted',
        event_data: { touches: 6, ballot_id: ballotId },
        created_by: 'marianna',
      })
    }
  }

  return { contactId: contact[0].id, touchNumber: newCount }
}

export async function undoTouch(contactId: string, ballotId: string): Promise<boolean> {
  // 1. Delete from lead_contacts
  const { error: delErr } = await supabase
    .from('lead_contacts')
    .delete()
    .eq('id', contactId)

  if (delErr) return false

  // 2. Get updated count
  const { data: remaining } = await supabase
    .from('lead_contacts')
    .select('id, contact_date')
    .eq('ballot_id', ballotId)
    .order('contact_number', { ascending: false })
    .limit(1)

  const lastDate = remaining?.[0]?.contact_date ? new Date(remaining[0].contact_date) : null
  const newCount = remaining?.length ? (await supabase.from('lead_contacts').select('id').eq('ballot_id', ballotId)).data?.length || 0 : 0

  // 3. Update ballot
  await supabase
    .from('ballots')
    .update({
      contact_count: newCount,
      last_contact_date: lastDate?.toISOString() || null,
      temperature: calculateTemperature(lastDate),
      // If was dead from exhaustion, revert to contacted
      ...(newCount < 6 ? { status: 'contacted', contact_status: 'active' } : {}),
    })
    .eq('id', ballotId)

  return true
}

export async function resurrectLead(ballotId: string, entityId: string | null): Promise<boolean> {
  const { error } = await supabase
    .from('ballots')
    .update({
      status: 'contacted',
      contact_count: 0,
      contact_status: 'active',
      reactivated_at: new Date().toISOString(),
    })
    .eq('id', ballotId)

  if (error) return false

  // Increment reactivation_count manually
  const { data: rcData } = await supabase.from('ballots').select('reactivation_count').eq('id', ballotId).limit(1)
  const currentRc = rcData?.[0]?.reactivation_count || 0
  await supabase.from('ballots').update({ reactivation_count: currentRc + 1 }).eq('id', ballotId)

  // Log event
  if (entityId) {
    await supabase.from('entity_events').insert({
      entity_id: entityId,
      event_type: 'lead_resurrected',
      event_data: { ballot_id: ballotId },
      created_by: 'marianna',
    })
  }

  return true
}
