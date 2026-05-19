'use server'

import { headers } from 'next/headers'
import { getAuth } from '@/lib/auth'
import { getDbFromContext } from '@/lib/db'
import { getUserProfile } from '@/lib/db/queries/users'
import {
  createResource,
  updateResource,
  deleteResource,
  getResource,
} from '@/lib/db/queries/resources'
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

export async function createResourceAction(form: {
  title: string
  description?: string
  imageUrl?: string
  sortOrder?: number
}): Promise<{ resourceId?: string; error?: string }> {
  const ctx = await getOrgContext()
  if ('error' in ctx) return { error: ctx.error }

  if (!form.title.trim()) return { error: 'タイトルは必須です' }

  const row = await createResource(ctx.db, {
    organizationId: ctx.orgId,
    title: form.title.trim(),
    description: form.description || null,
    imageUrl: form.imageUrl || null,
    sortOrder: form.sortOrder ?? 0,
  })

  if (!row) return { error: '資料の作成に失敗しました' }

  revalidatePath('/resources')
  return { resourceId: row.id }
}

export async function updateResourceAction(
  id: string,
  form: {
    title?: string
    description?: string
    imageUrl?: string
    sortOrder?: number
    isPublished?: boolean
  }
): Promise<{ success?: boolean; error?: string }> {
  const ctx = await getOrgContext()
  if ('error' in ctx) return { error: ctx.error }

  const row = await updateResource(ctx.db, ctx.orgId, id, {
    ...(form.title !== undefined && { title: form.title.trim() }),
    ...(form.description !== undefined && { description: form.description || null }),
    ...(form.imageUrl !== undefined && { imageUrl: form.imageUrl || null }),
    ...(form.sortOrder !== undefined && { sortOrder: form.sortOrder }),
    ...(form.isPublished !== undefined && { isPublished: form.isPublished }),
  })

  if (!row) return { error: '資料が見つかりません' }

  revalidatePath('/resources')
  return { success: true }
}

export async function deleteResourceAction(id: string): Promise<{ success?: boolean; error?: string }> {
  const ctx = await getOrgContext()
  if ('error' in ctx) return { error: ctx.error }

  await deleteResource(ctx.db, ctx.orgId, id)

  revalidatePath('/resources')
  return { success: true }
}

export async function toggleResourcePublishAction(id: string): Promise<{ success?: boolean; error?: string }> {
  const ctx = await getOrgContext()
  if ('error' in ctx) return { error: ctx.error }

  const existing = await getResource(ctx.db, ctx.orgId, id)
  if (!existing) return { error: '資料が見つかりません' }

  await updateResource(ctx.db, ctx.orgId, id, {
    isPublished: !existing.isPublished,
  })

  revalidatePath('/resources')
  return { success: true }
}
