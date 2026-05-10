'use server'

import { createClient, createAdminClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function linkSurveyToEvent(surveyId: string, eventId: string): Promise<{ error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'ログインが必要です' }

  const admin = await createAdminClient()

  const { error } = await admin
    .from('surveys')
    .update({ event_id: eventId })
    .eq('id', surveyId)

  if (error) return { error: error.message }

  revalidatePath(`/events/${eventId}`)
  return {}
}

export async function getUnlinkedSurveys(eventId: string, orgId: string): Promise<{ id: string; title: string }[]> {
  const admin = await createAdminClient()
  const { data } = await admin
    .from('surveys')
    .select('id, title')
    .eq('organization_id', orgId)
    .or(`event_id.is.null,event_id.neq.${eventId}`)
    .order('created_at', { ascending: false })

  return data ?? []
}
