'use server'

import { headers } from 'next/headers'
import { getAuth } from '@/lib/auth'
import { getDbFromContext } from '@/lib/db'
import { getUserProfile } from '@/lib/db/queries/users'
import {
  createService,
  updateService,
  deleteService,
  getService,
} from '@/lib/db/queries/services'
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

export async function createServiceAction(form: {
  title: string
  description?: string
  imageUrl?: string
  inquiryUrl?: string
  sortOrder?: number
}): Promise<{ serviceId?: string; error?: string }> {
  const ctx = await getOrgContext()
  if ('error' in ctx) return { error: ctx.error }

  if (!form.title.trim()) return { error: 'タイトルは必須です' }

  const row = await createService(ctx.db, {
    organizationId: ctx.orgId,
    title: form.title.trim(),
    description: form.description || null,
    imageUrl: form.imageUrl || null,
    inquiryUrl: form.inquiryUrl || null,
    sortOrder: form.sortOrder ?? 0,
  })

  if (!row) return { error: 'サービスの作成に失敗しました' }

  revalidatePath('/services')
  return { serviceId: row.id }
}

export async function updateServiceAction(
  id: string,
  form: {
    title?: string
    description?: string
    imageUrl?: string
    inquiryUrl?: string
    sortOrder?: number
    isPublished?: boolean
  }
): Promise<{ success?: boolean; error?: string }> {
  const ctx = await getOrgContext()
  if ('error' in ctx) return { error: ctx.error }

  const row = await updateService(ctx.db, ctx.orgId, id, {
    ...(form.title !== undefined && { title: form.title.trim() }),
    ...(form.description !== undefined && { description: form.description || null }),
    ...(form.imageUrl !== undefined && { imageUrl: form.imageUrl || null }),
    ...(form.inquiryUrl !== undefined && { inquiryUrl: form.inquiryUrl || null }),
    ...(form.sortOrder !== undefined && { sortOrder: form.sortOrder }),
    ...(form.isPublished !== undefined && { isPublished: form.isPublished }),
  })

  if (!row) return { error: 'サービスが見つかりません' }

  revalidatePath('/services')
  return { success: true }
}

export async function deleteServiceAction(id: string): Promise<{ success?: boolean; error?: string }> {
  const ctx = await getOrgContext()
  if ('error' in ctx) return { error: ctx.error }

  await deleteService(ctx.db, ctx.orgId, id)

  revalidatePath('/services')
  return { success: true }
}

export async function toggleServicePublishAction(id: string): Promise<{ success?: boolean; error?: string }> {
  const ctx = await getOrgContext()
  if ('error' in ctx) return { error: ctx.error }

  const existing = await getService(ctx.db, ctx.orgId, id)
  if (!existing) return { error: 'サービスが見つかりません' }

  await updateService(ctx.db, ctx.orgId, id, {
    isPublished: !existing.isPublished,
  })

  revalidatePath('/services')
  return { success: true }
}
