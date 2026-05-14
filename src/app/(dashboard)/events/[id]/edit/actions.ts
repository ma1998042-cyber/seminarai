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
}): Promise<{ error?: string }> {
  const auth = getAuth()
  const session = await auth.api.getSession({ headers: await headers() })
  const user = session?.user
  if (!user) return { error: 'ログインが必要です' }

  const db = getDbFromContext()
  const profile = await getUserProfile(db, user.id)
  if (!profile?.currentOrganizationId) return { error: '組織が見つかりません' }

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
  })

  if (!event) return { error: 'イベントの更新に失敗しました' }

  revalidatePath('/events')
  revalidatePath(`/events/${eventId}`)
  return {}
}
