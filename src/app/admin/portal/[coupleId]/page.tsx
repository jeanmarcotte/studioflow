'use client'

import { useState, useEffect, useRef } from 'react'
import { useParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Loader2, Upload, Trash2, ExternalLink, Image as ImageIcon, Video, LayoutGrid, Type, Eye, Share2, Send, Copy, Mail } from 'lucide-react'
import { formatWeddingDate } from '@/lib/formatters'
import { toast } from 'sonner'
import Image from 'next/image'

interface CouplePortalData {
  id: string
  bride_first_name: string
  groom_first_name: string
  wedding_date: string | null
  email: string | null
  portal_slug: string | null
  portal_invite_sent_at: string | null
  portal_first_login_at: string | null
  portal_last_login_at: string | null
  hero_image_url: string | null
  portal_video_url: string | null
  portal_video_type: string | null
  collage_img_left: string | null
  collage_img_center: string | null
  collage_img_right: string | null
  collage_caption: string | null
  share_enabled: boolean | null
  share_token: string | null
}

function extractYouTubeId(url: string): string | null {
  const patterns = [
    /youtu\.be\/([^?&]+)/,
    /youtube\.com\/watch\?v=([^&]+)/,
    /youtube\.com\/embed\/([^?&]+)/,
  ]
  for (const p of patterns) {
    const match = url.match(p)
    if (match) return match[1]
  }
  return null
}

export default function PortalEditorPage() {
  const params = useParams()
  const coupleId = params.coupleId as string

  const [loading, setLoading] = useState(true)
  const [couple, setCouple] = useState<CouplePortalData | null>(null)
  const [uploading, setUploading] = useState<Record<string, boolean>>({})
  const [videoUrl, setVideoUrl] = useState('')
  const [caption, setCaption] = useState('')
  const [cacheBust, setCacheBust] = useState<Record<string, number>>({})
  const heroInputRef = useRef<HTMLInputElement>(null)
  const collageLeftRef = useRef<HTMLInputElement>(null)
  const collageCenterRef = useRef<HTMLInputElement>(null)
  const collageRightRef = useRef<HTMLInputElement>(null)
  const collageRefs: Record<string, React.RefObject<HTMLInputElement | null>> = {
    left: collageLeftRef,
    center: collageCenterRef,
    right: collageRightRef,
  }

  useEffect(() => {
    fetchCouple()
  }, [coupleId])

  async function fetchCouple() {
    const { data } = await supabase
      .from('couples')
      .select('id, bride_first_name, groom_first_name, wedding_date, email, portal_slug, portal_invite_sent_at, portal_first_login_at, portal_last_login_at, hero_image_url, portal_video_url, portal_video_type, collage_img_left, collage_img_center, collage_img_right, collage_caption, share_enabled, share_token')
      .eq('id', coupleId)
      .limit(1)

    const c = data?.[0] ?? null
    setCouple(c)
    if (c) {
      setVideoUrl(c.portal_video_url ?? '')
      setCaption(c.collage_caption ?? '')
    }
    setLoading(false)
  }

  async function uploadImage(file: File, filePath: string, column: string) {
    setUploading(prev => ({ ...prev, [column]: true }))
    try {
      const { error: uploadError } = await supabase.storage
        .from('portal-assets')
        .upload(filePath, file, { upsert: true })

      if (uploadError) {
        toast.error(`Upload failed: ${uploadError.message}`)
        return
      }

      const { data: { publicUrl } } = supabase.storage
        .from('portal-assets')
        .getPublicUrl(filePath)

      const { error: updateError } = await supabase
        .from('couples')
        .update({ [column]: publicUrl })
        .eq('id', coupleId)

      if (updateError) {
        toast.error(`Save failed: ${updateError.message}`)
        return
      }

      toast.success('Image uploaded')
      setCacheBust(prev => ({ ...prev, [column]: Date.now() }))
      fetchCouple()
    } finally {
      setUploading(prev => ({ ...prev, [column]: false }))
    }
  }

  async function removeImage(filePath: string, column: string, inputRef?: React.RefObject<HTMLInputElement | null>) {
    await supabase.storage.from('portal-assets').remove([filePath])
    await supabase.from('couples').update({ [column]: null }).eq('id', coupleId)
    if (inputRef?.current) inputRef.current.value = ''
    setCacheBust(prev => { const next = { ...prev }; delete next[column]; return next })
    toast.success('Image removed')
    fetchCouple()
  }

  async function saveVideoUrl() {
    if (!videoUrl.trim()) {
      toast.error('Enter a YouTube URL')
      return
    }
    const videoId = extractYouTubeId(videoUrl.trim())
    if (!videoId) {
      toast.error('Invalid YouTube URL')
      return
    }
    const embedUrl = `https://www.youtube.com/embed/${videoId}`
    await supabase.from('couples').update({ portal_video_url: embedUrl, portal_video_type: 'youtube' }).eq('id', coupleId)
    toast.success('Video saved')
    fetchCouple()
  }

  async function removeVideo() {
    await supabase.from('couples').update({ portal_video_url: null, portal_video_type: null }).eq('id', coupleId)
    setVideoUrl('')
    toast.success('Video removed')
    fetchCouple()
  }

  async function saveCaption() {
    await supabase.from('couples').update({ collage_caption: caption }).eq('id', coupleId)
    toast.success('Caption saved')
  }

  async function toggleShare() {
    const newVal = !couple?.share_enabled
    await supabase.from('couples').update({ share_enabled: newVal }).eq('id', coupleId)
    toast.success(newVal ? 'Sharing enabled' : 'Sharing disabled')
    fetchCouple()
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (!couple) {
    return <div className="p-6 text-center text-muted-foreground">Couple not found</div>
  }

  const coupleName = `${couple.bride_first_name} & ${couple.groom_first_name}`

  // Extract video ID for thumbnail preview
  const currentVideoId = couple.portal_video_url ? extractYouTubeId(couple.portal_video_url) : null

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <div>
        <h1 className="text-xl md:text-2xl font-bold">{coupleName} — Portal Editor</h1>
        <p className="text-sm text-muted-foreground">{formatWeddingDate(couple.wedding_date)}</p>
      </div>

      {/* Portal Access */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-medium flex items-center gap-2">
            <Mail className="w-4 h-4" /> Portal Access
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="text-sm">
            <span className="font-medium">Status: </span>
            {couple.portal_first_login_at ? (
              <span className="text-green-700">Active — last login {couple.portal_last_login_at ? new Date(couple.portal_last_login_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '—'}</span>
            ) : couple.portal_invite_sent_at ? (
              <span className="text-amber-700">Invited {new Date(couple.portal_invite_sent_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
            ) : (
              <span className="text-gray-500">Never invited</span>
            )}
          </div>
          {couple.email && <div className="text-sm text-muted-foreground">Email: {couple.email}</div>}
          {couple.portal_slug && (
            <div className="text-xs text-muted-foreground break-all">
              Portal URL: https://studioflow-zeta.vercel.app/portal/{couple.portal_slug}
            </div>
          )}
          <div className="flex flex-wrap gap-2">
            <Button
              size="sm"
              variant="default"
              disabled={!couple.email}
              onClick={async () => {
                if (!couple.email) { toast.error('No email on file'); return }
                const res = await fetch('/api/portal/send-magic-link', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ email: couple.email }),
                })
                if (res.ok) {
                  await supabase.from('couples').update({ portal_invite_sent_at: new Date().toISOString() }).eq('id', coupleId)
                  toast.success(`Portal invite sent to ${couple.email}`)
                  fetchCouple()
                } else {
                  toast.error('Failed to send invite')
                }
              }}
              className="bg-teal-600 hover:bg-teal-700"
            >
              <Send className="w-3.5 h-3.5 mr-1.5" />
              Send Portal Invite
            </Button>
            {couple.portal_slug && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  navigator.clipboard.writeText(`https://studioflow-zeta.vercel.app/portal/${couple.portal_slug}`)
                  toast.success('Portal link copied!')
                }}
              >
                <Copy className="w-3.5 h-3.5 mr-1.5" />
                Copy Portal Link
              </Button>
            )}
          </div>
          {!couple.email && (
            <p className="text-xs text-amber-600">Add an email to this couple&apos;s record to send portal invites.</p>
          )}
        </CardContent>
      </Card>

      {/* 3A: Hero Photo */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-medium flex items-center gap-2">
            <ImageIcon className="w-4 h-4" /> Hero Photo
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {couple.hero_image_url && (
            <div className="relative w-full max-w-md">
              <Image src={`${couple.hero_image_url}${cacheBust.hero_image_url ? `?t=${cacheBust.hero_image_url}` : ''}`} alt="Hero" width={480} height={270} className="rounded-lg object-cover" />
            </div>
          )}
          <div className="flex items-center gap-3">
            <label className="cursor-pointer">
              <input
                ref={heroInputRef}
                type="file"
                accept=".jpg,.jpeg,.png,.webp"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0]
                  if (file) uploadImage(file, `${coupleId}/hero.jpg`, 'hero_image_url')
                }}
              />
              <span className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-md border border-input bg-background hover:bg-accent/50 transition-colors">
                {uploading.hero_image_url ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                Upload Hero
              </span>
            </label>
            {couple.hero_image_url && (
              <Button variant="outline" size="sm" onClick={() => removeImage(`${coupleId}/hero.jpg`, 'hero_image_url', heroInputRef)}>
                <Trash2 className="w-4 h-4 mr-1" /> Remove
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* 3B: YouTube Video URL */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-medium flex items-center gap-2">
            <Video className="w-4 h-4" /> YouTube Video
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-col md:flex-row gap-2">
            <Input
              placeholder="https://youtu.be/VIDEO_ID"
              value={videoUrl}
              onChange={(e) => setVideoUrl(e.target.value)}
              className="flex-1"
            />
            <Button onClick={saveVideoUrl}>Save</Button>
            {couple.portal_video_url && (
              <Button variant="outline" onClick={removeVideo}>
                <Trash2 className="w-4 h-4 mr-1" /> Remove
              </Button>
            )}
          </div>
          {currentVideoId && (
            <div className="max-w-md">
              <Image
                src={`https://img.youtube.com/vi/${currentVideoId}/maxresdefault.jpg`}
                alt="Video thumbnail"
                width={480}
                height={270}
                className="rounded-lg"
                unoptimized
              />
            </div>
          )}
        </CardContent>
      </Card>

      {/* 3C: Collage Photos */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-medium flex items-center gap-2">
            <LayoutGrid className="w-4 h-4" /> Collage Photos
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {(['left', 'center', 'right'] as const).map((pos) => {
              const column = `collage_img_${pos}`
              const url = couple[column as keyof CouplePortalData] as string | null
              const ref = collageRefs[pos]
              const previewUrl = url ? `${url}${cacheBust[column] ? `?t=${cacheBust[column]}` : ''}` : null
              return (
                <div key={pos} className="space-y-2">
                  <p className="text-sm font-medium text-muted-foreground capitalize">{pos}</p>
                  {previewUrl && (
                    <Image src={previewUrl} alt={`Collage ${pos}`} width={200} height={200} className="rounded-lg object-cover w-full aspect-square" />
                  )}
                  <div className="flex gap-1">
                    <label className="cursor-pointer flex-1">
                      <input
                        ref={ref}
                        type="file"
                        accept=".jpg,.jpeg,.png,.webp"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0]
                          if (file) uploadImage(file, `${coupleId}/collage-${pos}.jpg`, column)
                        }}
                      />
                      <span className="inline-flex items-center justify-center gap-1 w-full px-2 py-1.5 text-xs font-medium rounded-md border border-input bg-background hover:bg-accent/50 transition-colors">
                        {uploading[column] ? <Loader2 className="w-3 h-3 animate-spin" /> : <Upload className="w-3 h-3" />}
                        Upload
                      </span>
                    </label>
                    {url && (
                      <Button variant="outline" size="sm" className="text-xs px-2" onClick={() => removeImage(`${coupleId}/collage-${pos}.jpg`, column, ref)}>
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>

      {/* 3D: Collage Caption */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-medium flex items-center gap-2">
            <Type className="w-4 h-4" /> Collage Caption
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2">
            <Input
              placeholder="A caption for the collage..."
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              className="flex-1"
            />
            <Button onClick={saveCaption}>Save</Button>
          </div>
        </CardContent>
      </Card>

      {/* 3E: Share Toggle */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-medium flex items-center gap-2">
            <Share2 className="w-4 h-4" /> Sharing
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <label className="flex items-center gap-3 cursor-pointer">
            <input type="checkbox" checked={!!couple.share_enabled} onChange={toggleShare} className="w-4 h-4 rounded" />
            <span className="text-sm">{couple.share_enabled ? 'Sharing enabled' : 'Sharing disabled'}</span>
          </label>
          {couple.share_enabled && couple.share_token && (
            <p className="text-xs text-muted-foreground break-all">
              Share URL: https://studioflow-zeta.vercel.app/portal/share/{couple.share_token}
            </p>
          )}
        </CardContent>
      </Card>

      {/* 3F: Live Preview Link */}
      {couple.portal_slug && (
        <a
          href={`/portal/${couple.portal_slug}`}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-medium rounded-md border border-input bg-background hover:bg-accent/50 transition-colors"
        >
          <Eye className="w-4 h-4" /> Preview Portal <ExternalLink className="w-3 h-3" />
        </a>
      )}
    </div>
  )
}
