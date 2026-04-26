'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { toast } from 'sonner'
import { MessageSquare, Mail, Phone, FileText, Plus } from 'lucide-react'
import { CommLogEntry } from './types'

const TYPE_ICONS: Record<string, typeof MessageSquare> = {
  note: FileText,
  email: Mail,
  call: Phone,
  text: MessageSquare,
  feedback: MessageSquare,
}

const TYPE_OPTIONS = [
  { value: 'note', label: 'Note' },
  { value: 'email', label: 'Email' },
  { value: 'call', label: 'Call' },
  { value: 'text', label: 'Text' },
  { value: 'feedback', label: 'Feedback' },
]

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 60) return `${mins}m ago`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  if (days < 30) return `${days}d ago`
  return new Date(dateStr).toLocaleDateString('en-CA')
}

interface Props {
  coupleId: string
  entries: CommLogEntry[]
  onRefresh: () => void
}

export function CommunicationLog({ coupleId, entries, onRefresh }: Props) {
  const [showForm, setShowForm] = useState(false)
  const [type, setType] = useState('note')
  const [body, setBody] = useState('')
  const [saving, setSaving] = useState(false)

  const handleSubmit = async () => {
    if (!body.trim()) return
    setSaving(true)
    const { error } = await supabase
      .from('communication_log')
      .insert({ couple_id: coupleId, type, body: body.trim(), logged_by: 'Jean' })
    setSaving(false)
    if (error) {
      toast.error(`Failed to save: ${error.message}`)
    } else {
      toast.success('Note added')
      setBody('')
      setShowForm(false)
      onRefresh()
    }
  }

  return (
    <div className="rounded-xl border bg-card">
      <div className="flex items-center justify-between px-4 py-3 border-b">
        <h3 className="text-sm font-semibold">Communication Log</h3>
        <button
          onClick={() => setShowForm(!showForm)}
          className="inline-flex items-center gap-1 rounded-md bg-teal-600 text-white px-3 py-1.5 text-xs font-medium hover:bg-teal-700 transition-colors"
        >
          <Plus className="h-3 w-3" />
          Add Note
        </button>
      </div>

      {showForm && (
        <div className="px-4 py-3 border-b bg-muted/30 space-y-2">
          <div className="flex items-center gap-2">
            <select value={type} onChange={(e) => setType(e.target.value)} className="text-sm rounded border border-input bg-background px-2 py-1">
              {TYPE_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="What happened?"
            rows={3}
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:border-ring outline-none"
          />
          <div className="flex gap-2">
            <button
              onClick={handleSubmit}
              disabled={saving || !body.trim()}
              className="rounded-md bg-teal-600 text-white px-4 py-1.5 text-xs font-medium hover:bg-teal-700 disabled:opacity-50 transition-colors"
            >
              {saving ? 'Saving...' : 'Save'}
            </button>
            <button onClick={() => { setShowForm(false); setBody('') }} className="text-xs text-muted-foreground hover:text-foreground">
              Cancel
            </button>
          </div>
        </div>
      )}

      <div className="divide-y max-h-[400px] overflow-y-auto">
        {entries.length === 0 ? (
          <div className="px-4 py-6 text-sm text-muted-foreground text-center">No communication logged yet</div>
        ) : (
          entries.map(entry => {
            const Icon = TYPE_ICONS[entry.type] || FileText
            return (
              <div key={entry.id} className="px-4 py-3 flex gap-3">
                <div className="flex-shrink-0 mt-0.5">
                  <Icon className="h-4 w-4 text-muted-foreground" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm">{entry.body}</p>
                  <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                    <span className="font-medium">{entry.logged_by}</span>
                    <span>{timeAgo(entry.logged_at)}</span>
                    <span className="rounded bg-gray-100 px-1.5 py-0.5">{entry.type}</span>
                  </div>
                </div>
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}
