'use server'

import { headers } from 'next/headers'
import { getAuth } from '@/lib/auth'
import { getDbFromContext } from '@/lib/db'
import { updateSurvey } from '@/lib/db/queries/surveys'
import { revalidatePath } from 'next/cache'

export async function linkSurveyToEvent(surveyId: string, eventId: string): Promise<{ error?: string }> {
  const auth = getAuth()
  const session = await auth.api.getSession({ headers: await headers() })
  const user = session?.user
  if (!user) return { error: 'ログインが必要です' }

  const db = getDbFromContext()

  await updateSurvey(db, surveyId, { eventId })

  revalidatePath(`/events/${eventId}`)
  return {}
}

export async function getUnlinkedSurveys(eventId: string, orgId: string): Promise<{ id: string; title: string }[]> {
  const { surveys } = await import('@/lib/db/schema')
  const { eq, and, or, isNull, ne } = await import('drizzle-orm')

  const db = getDbFromContext()
  const data = await db.query.surveys.findMany({
    where: and(
      eq(surveys.organizationId, orgId),
      or(isNull(surveys.eventId), ne(surveys.eventId, eventId)),
    ),
    columns: { id: true, title: true },
    orderBy: (s, { desc }) => [desc(s.createdAt)],
  })

  return data
}
