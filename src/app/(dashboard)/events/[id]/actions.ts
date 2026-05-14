'use server'

import { getDb, surveys, events } from '@/lib/db'
import { getCurrentUser } from '@/lib/session'
import { revalidatePath } from 'next/cache'
import { eq, or, isNull, ne } from 'drizzle-orm'

export async function linkSurveyToEvent(surveyId: string, eventId: string): Promise<{ error?: string }> {
  const user = await getCurrentUser()
  if (!user) return { error: 'ログインが必要です' }

  const db = getDb()
  await db.update(surveys).set({ eventId, updatedAt: new Date().toISOString() }).where(eq(surveys.id, surveyId))

  revalidatePath(`/events/${eventId}`)
  return {}
}

export async function getUnlinkedSurveys(eventId: string, orgId: string): Promise<{ id: string; title: string }[]> {
  const db = getDb()
  const rows = await db
    .select({ id: surveys.id, title: surveys.title })
    .from(surveys)
    .where(
      or(isNull(surveys.eventId), ne(surveys.eventId, eventId))
    )

  return rows.filter((r) => r.id != null)
}
