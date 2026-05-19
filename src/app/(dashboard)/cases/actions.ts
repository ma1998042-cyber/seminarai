'use server'

import { headers } from 'next/headers'
import { getAuth } from '@/lib/auth'
import { getDbFromContext } from '@/lib/db'
import { getUserProfile } from '@/lib/db/queries/users'
import {
  createCaseStudy,
  updateCaseStudy,
  deleteCaseStudy,
  getCaseStudy,
} from '@/lib/db/queries/caseStudies'
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

export async function createCaseStudyAction(form: {
  title: string
  imageUrl?: string
  productionPeriod?: string
  productionCost?: string
  description?: string
  sortOrder?: number
}): Promise<{ caseStudyId?: string; error?: string }> {
  const ctx = await getOrgContext()
  if ('error' in ctx) return { error: ctx.error }

  if (!form.title.trim()) return { error: 'タイトルは必須です' }

  const row = await createCaseStudy(ctx.db, {
    organizationId: ctx.orgId,
    title: form.title.trim(),
    imageUrl: form.imageUrl || null,
    productionPeriod: form.productionPeriod || null,
    productionCost: form.productionCost || null,
    description: form.description || null,
    sortOrder: form.sortOrder ?? 0,
  })

  if (!row) return { error: '事例の作成に失敗しました' }

  revalidatePath('/cases')
  return { caseStudyId: row.id }
}

export async function updateCaseStudyAction(
  id: string,
  form: {
    title?: string
    imageUrl?: string
    productionPeriod?: string
    productionCost?: string
    description?: string
    sortOrder?: number
    isPublished?: boolean
  }
): Promise<{ success?: boolean; error?: string }> {
  const ctx = await getOrgContext()
  if ('error' in ctx) return { error: ctx.error }

  const row = await updateCaseStudy(ctx.db, ctx.orgId, id, {
    ...(form.title !== undefined && { title: form.title.trim() }),
    ...(form.imageUrl !== undefined && { imageUrl: form.imageUrl || null }),
    ...(form.productionPeriod !== undefined && { productionPeriod: form.productionPeriod || null }),
    ...(form.productionCost !== undefined && { productionCost: form.productionCost || null }),
    ...(form.description !== undefined && { description: form.description || null }),
    ...(form.sortOrder !== undefined && { sortOrder: form.sortOrder }),
    ...(form.isPublished !== undefined && { isPublished: form.isPublished }),
  })

  if (!row) return { error: '事例が見つかりません' }

  revalidatePath('/cases')
  revalidatePath(`/cases/${id}`)
  return { success: true }
}

export async function deleteCaseStudyAction(id: string): Promise<{ success?: boolean; error?: string }> {
  const ctx = await getOrgContext()
  if ('error' in ctx) return { error: ctx.error }

  await deleteCaseStudy(ctx.db, ctx.orgId, id)

  revalidatePath('/cases')
  return { success: true }
}

export async function togglePublishAction(id: string): Promise<{ success?: boolean; error?: string }> {
  const ctx = await getOrgContext()
  if ('error' in ctx) return { error: ctx.error }

  const existing = await getCaseStudy(ctx.db, ctx.orgId, id)
  if (!existing) return { error: '事例が見つかりません' }

  await updateCaseStudy(ctx.db, ctx.orgId, id, {
    isPublished: !existing.isPublished,
  })

  revalidatePath('/cases')
  return { success: true }
}
