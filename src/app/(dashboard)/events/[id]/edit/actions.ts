'use server'

import { headers } from 'next/headers'
import { getAuth } from '@/lib/auth'
import { getDbFromContext } from '@/lib/db'
import { getUserProfile } from '@/lib/db/queries/users'
import { updateEvent } from '@/lib/db/queries/events'
import { revalidatePath } from 'next/cache'

export async function updateEventAction(eventId: string, form: {
  title: string
  description: string
  event_type: string
  start_date: string
  end_date: string
  location: string
  is_online: boolean
  online_url: string
  capacity: string
  status: string
  visibility: string
  thumbnail_url: string
  image_urls: string[]
  show_remaining_capacity: boolean
}): Promise<{ error?: string }> {
  const auth = getAuth()
  const session = await auth.api.getSession({ headers: await headers() })
  const user = session?.user
  if (!user) return { error: 'ログインが必要です' }

  const db = getDbFromContext()
  const profile = await getUserProfile(db, user.id)
  if (!profile?.currentOrganizationId) return { error: '組織が見つかりません' }

  if (form.visibility === 'public' && !form.start_date) {
    return { error: '一般公開するには開催日時を設定してください' }
  }

  const event = await updateEvent(db, profile.currentOrganizationId, eventId, {
    title: form.title,
    description: form.description || null,
    eventType: form.event_type,
    startDate: form.start_date || null,
    endDate: form.end_date || null,
    location: form.location || null,
    isOnline: form.is_online,
    onlineUrl: form.online_url || null,
    capacity: form.capacity ? parseInt(form.capacity) : null,
    status: form.status,
    visibility: form.visibility,
    thumbnailUrl: form.image_urls[0] || form.thumbnail_url || null,
    imageUrls: form.image_urls.length > 0 ? form.image_urls : (form.thumbnail_url ? [form.thumbnail_url] : []),
    showRemainingCapacity: form.show_remaining_capacity ? 1 : 0,
  })

  if (!event) return { error: 'イベントの更新に失敗しました' }

  revalidatePath('/events')
  revalidatePath(`/events/${eventId}`)
  return {}
}
