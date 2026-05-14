'use server'

import { headers } from 'next/headers'
import { getAuth } from '@/lib/auth'
import { getDbFromContext } from '@/lib/db'
import { getUserProfile } from '@/lib/db/queries/users'
import { createEvent } from '@/lib/db/queries/events'
import { revalidatePath } from 'next/cache'

export async function createEventAction(form: {
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
}): Promise<{ eventId?: string; error?: string }> {
  const auth = getAuth()
  const session = await auth.api.getSession({ headers: await headers() })
  const user = session?.user
  if (!user) return { error: 'ログインが必要です' }

  const db = getDbFromContext()
  const profile = await getUserProfile(db, user.id)
  if (!profile?.currentOrganizationId) return { error: '組織が見つかりません' }

  const event = await createEvent(db, {
    organizationId: profile.currentOrganizationId,
    title: form.title,
    description: form.description || undefined,
    eventType: form.event_type,
    startDate: form.start_date || undefined,
    endDate: form.end_date || undefined,
    location: form.location || undefined,
    isOnline: form.is_online,
    onlineUrl: form.online_url || undefined,
    capacity: form.capacity ? parseInt(form.capacity) : undefined,
    status: form.status,
    visibility: form.visibility,
    createdBy: user.id,
  })

  if (!event) return { error: 'イベントの作成に失敗しました' }

  revalidatePath('/events')
  return { eventId: event.id }
}
