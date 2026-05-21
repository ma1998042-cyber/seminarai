'use server'

import { headers } from 'next/headers'
import { getAuth } from '@/lib/auth'
import { getDbFromContext } from '@/lib/db'
import { getUserProfile } from '@/lib/db/queries/users'
import {
  createWorkshopContent,
  updateWorkshopContent,
  deleteWorkshopContent,
  getWorkshopContent,
} from '@/lib/db/queries/workshopContents'
import { revalidatePath } from 'next/cache'

async function getOrgContext() {
  const auth = getAuth()
  const session = await auth.api.getSession({ headers: await headers() })
  const user = session?.user
  if (!user) return { error: 'ログインが必要です' } as const

  const db = getDbFromContext()
  const profile = await getUserProfile(db, user.id)
  const orgId = profile?.currentOrganizationId
  if (!orgId) return { error: '組織が見つかりません' } as const

  return { db, user, orgId } as const
}

export async function createContentAction(form: {
  eventId: string
  title: string
  description?: string
  contentType: string
  fileUrl?: string
  sortOrder?: number
}): Promise<{ contentId?: string; error?: string }> {
  const ctx = await getOrgContext()
  if ('error' in ctx) return { error: ctx.error }

  if (!form.title.trim()) return { error: 'タイトルは必須です' }

  const row = await createWorkshopContent(ctx.db, {
    organizationId: ctx.orgId,
    eventId: form.eventId,
    title: form.title.trim(),
    description: form.description || null,
    contentType: form.contentType || 'manual',
    fileUrl: form.fileUrl || null,
    sortOrder: form.sortOrder ?? 0,
  })

  if (!row) return { error: 'コンテンツの作成に失敗しました' }

  revalidatePath(`/events/${form.eventId}/contents`)
  return { contentId: row.id }
}

export async function updateContentAction(
  id: string,
  form: {
    eventId: string
    title?: string
    description?: string
    contentType?: string
    fileUrl?: string
    sortOrder?: number
    isPublished?: number
  }
): Promise<{ success?: boolean; error?: string }> {
  const ctx = await getOrgContext()
  if ('error' in ctx) return { error: ctx.error }

  const row = await updateWorkshopContent(ctx.db, ctx.orgId, id, {
    ...(form.title !== undefined && { title: form.title.trim() }),
    ...(form.description !== undefined && { description: form.description || null }),
    ...(form.contentType !== undefined && { contentType: form.contentType }),
    ...(form.fileUrl !== undefined && { fileUrl: form.fileUrl || null }),
    ...(form.sortOrder !== undefined && { sortOrder: form.sortOrder }),
    ...(form.isPublished !== undefined && { isPublished: form.isPublished }),
  })

  if (!row) return { error: 'コンテンツが見つかりません' }

  revalidatePath(`/events/${form.eventId}/contents`)
  return { success: true }
}

export async function deleteContentAction(
  id: string,
  eventId: string
): Promise<{ success?: boolean; error?: string }> {
  const ctx = await getOrgContext()
  if ('error' in ctx) return { error: ctx.error }

  await deleteWorkshopContent(ctx.db, ctx.orgId, id)

  revalidatePath(`/events/${eventId}/contents`)
  return { success: true }
}

export async function toggleContentPublishAction(
  id: string,
  eventId: string
): Promise<{ success?: boolean; error?: string }> {
  const ctx = await getOrgContext()
  if ('error' in ctx) return { error: ctx.error }

  const existing = await getWorkshopContent(ctx.db, ctx.orgId, id)
  if (!existing) return { error: 'コンテンツが見つかりません' }

  await updateWorkshopContent(ctx.db, ctx.orgId, id, {
    isPublished: existing.isPublished ? 0 : 1,
  })

  revalidatePath(`/events/${eventId}/contents`)
  return { success: true }
}
