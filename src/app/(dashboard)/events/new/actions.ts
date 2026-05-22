'use server'

import { headers } from 'next/headers'
import { getAuth } from '@/lib/auth'
import { getDbFromContext } from '@/lib/db'
import { getUserProfile } from '@/lib/db/queries/users'
import { createEvent } from '@/lib/db/queries/events'
import { createSurvey } from '@/lib/db/queries/surveys'
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
  thumbnail_url: string
  image_urls: string[]
  participation_requirements: string
  recommended_for: string
  participation_benefits: string
  scheduling_type: string
}): Promise<{ eventId?: string; error?: string }> {
  const auth = getAuth()
  const session = await auth.api.getSession({ headers: await headers() })
  const user = session?.user
  if (!user) return { error: 'ログインが必要です' }

  const db = getDbFromContext()
  const profile = await getUserProfile(db, user.id)
  if (!profile?.currentOrganizationId) return { error: '組織が見つかりません' }

  if (form.visibility === 'public' && form.scheduling_type === 'admin_specified' && !form.start_date) {
    return { error: '一般公開するには開催日時を設定してください' }
  }

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
    thumbnailUrl: form.image_urls[0] || form.thumbnail_url || undefined,
    imageUrls: form.image_urls.length > 0 ? form.image_urls : (form.thumbnail_url ? [form.thumbnail_url] : []),
    participationRequirements: form.participation_requirements || undefined,
    recommendedFor: form.recommended_for || undefined,
    participationBenefits: form.participation_benefits || undefined,
    settings: { schedulingType: form.scheduling_type },
    createdBy: user.id,
  })

  if (!event) return { error: 'イベントの作成に失敗しました' }

  // アンケートを自動作成（申し込みアンケート・終了後アンケート）
  await Promise.all([
    createSurvey(db, {
      organizationId: profile.currentOrganizationId,
      eventId: event.id,
      title: `${form.title} - 申し込みアンケート`,
      category: 'pre_event',
      status: 'draft',
      completionEmailEnabled: true,
      createdBy: user.id,
    }),
    createSurvey(db, {
      organizationId: profile.currentOrganizationId,
      eventId: event.id,
      title: `${form.title} - 終了後アンケート`,
      category: 'post_event',
      status: 'draft',
      completionEmailEnabled: true,
      createdBy: user.id,
    }),
  ])

  revalidatePath('/events')
  return { eventId: event.id }
}
