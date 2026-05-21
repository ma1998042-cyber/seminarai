'use server'

import { headers } from 'next/headers'
import { getAuth } from '@/lib/auth'
import { getDbFromContext } from '@/lib/db'
import { getUserProfile } from '@/lib/db/queries/users'
import { updateEvent } from '@/lib/db/queries/events'
import { surveys } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'
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
  participation_requirements: string
  recommended_for: string
  participation_benefits: string
  registration_deadline: string
  reminder_enabled: boolean
  reminder_days: number[]
  reminder_subject: string
  reminder_body: string
  scheduling_type: string
}): Promise<{ error?: string }> {
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
    participationRequirements: form.participation_requirements || null,
    recommendedFor: form.recommended_for || null,
    participationBenefits: form.participation_benefits || null,
    registrationDeadline: form.registration_deadline || null,
    reminderEnabled: form.reminder_enabled ? 1 : 0,
    reminderDays: JSON.stringify(form.reminder_days),
    reminderSubject: form.reminder_subject || null,
    reminderBody: form.reminder_body || null,
    settings: { schedulingType: form.scheduling_type },
  })

  if (!event) return { error: 'イベントの更新に失敗しました' }

  revalidatePath('/events')
  revalidatePath(`/events/${eventId}`)
  return {}
}

export async function updateSurveyPublicAction(surveyId: string, isPublic: boolean): Promise<{ error?: string }> {
  const auth = getAuth()
  const session = await auth.api.getSession({ headers: await headers() })
  const user = session?.user
  if (!user) return { error: 'ログインが必要です' }

  const db = getDbFromContext()
  const profile = await getUserProfile(db, user.id)
  if (!profile?.currentOrganizationId) return { error: '組織が見つかりません' }

  // アンケートが自組織のものか確認
  const survey = await db.query.surveys.findFirst({
    where: eq(surveys.id, surveyId),
  })
  if (!survey || survey.organizationId !== profile.currentOrganizationId) {
    return { error: 'アンケートが見つかりません' }
  }

  await db.update(surveys).set({ isPublic }).where(eq(surveys.id, surveyId))

  revalidatePath('/events')
  return {}
}
