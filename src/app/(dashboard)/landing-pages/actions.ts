'use server'

import { headers } from 'next/headers'
import { revalidatePath } from 'next/cache'
import { getAuth } from '@/lib/auth'
import { getDbFromContext } from '@/lib/db'
import { getUserProfile } from '@/lib/db/queries/users'
import {
  createLandingPage,
  updateLandingPage,
  deleteLandingPage,
} from '@/lib/db/queries/landingPages'

async function getOrgId() {
  const auth = getAuth()
  const session = await auth.api.getSession({ headers: await headers() })
  const user = session?.user
  if (!user) return null
  const db = getDbFromContext()
  const profile = await getUserProfile(db, user.id)
  return profile?.currentOrganizationId ?? null
}

export async function createLandingPageAction(data: {
  title: string
  slug: string
  description?: string
  ctaText?: string
}): Promise<{ id?: string; error?: string }> {
  const orgId = await getOrgId()
  if (!orgId) return { error: '組織が見つかりません' }

  try {
    const db = getDbFromContext()
    const lp = await createLandingPage(db, {
      organizationId: orgId,
      title: data.title.trim(),
      slug: data.slug.trim(),
      description: data.description?.trim() || null,
      ctaText: data.ctaText?.trim() || '申し込む',
      formFields: [],
    })
    revalidatePath('/landing-pages')
    return { id: lp.id }
  } catch (e: any) {
    if (e.message?.includes('UNIQUE constraint')) {
      return { error: 'このスラッグは既に使用されています' }
    }
    return { error: e.message }
  }
}

export async function updateLandingPageAction(
  id: string,
  data: {
    title?: string
    slug?: string
    description?: string
    bodyHtml?: string
    heroImageUrl?: string
    formFields?: string
    ctaText?: string
    thankYouMessage?: string
    metaTitle?: string
    metaDescription?: string
    ogImageUrl?: string
  }
): Promise<{ error?: string }> {
  const orgId = await getOrgId()
  if (!orgId) return { error: '組織が見つかりません' }

  try {
    const db = getDbFromContext()
    const updateData: Record<string, unknown> = {}
    if (data.title !== undefined) updateData.title = data.title.trim()
    if (data.slug !== undefined) updateData.slug = data.slug.trim()
    if (data.description !== undefined) updateData.description = data.description.trim() || null
    if (data.bodyHtml !== undefined) updateData.bodyHtml = data.bodyHtml || null
    if (data.heroImageUrl !== undefined) updateData.heroImageUrl = data.heroImageUrl.trim() || null
    if (data.ctaText !== undefined) updateData.ctaText = data.ctaText.trim() || '申し込む'
    if (data.thankYouMessage !== undefined) updateData.thankYouMessage = data.thankYouMessage.trim() || null
    if (data.metaTitle !== undefined) updateData.metaTitle = data.metaTitle.trim() || null
    if (data.metaDescription !== undefined) updateData.metaDescription = data.metaDescription.trim() || null
    if (data.ogImageUrl !== undefined) updateData.ogImageUrl = data.ogImageUrl.trim() || null
    if (data.formFields !== undefined) {
      try {
        updateData.formFields = JSON.parse(data.formFields)
      } catch {
        return { error: 'フォームフィールドのJSON形式が正しくありません' }
      }
    }

    await updateLandingPage(db, orgId, id, updateData)
    revalidatePath(`/landing-pages/${id}`)
    revalidatePath('/landing-pages')
    return {}
  } catch (e: any) {
    if (e.message?.includes('UNIQUE constraint')) {
      return { error: 'このスラッグは既に使用されています' }
    }
    return { error: e.message }
  }
}

export async function deleteLandingPageAction(id: string): Promise<{ error?: string }> {
  const orgId = await getOrgId()
  if (!orgId) return { error: '組織が見つかりません' }

  try {
    const db = getDbFromContext()
    await deleteLandingPage(db, orgId, id)
    revalidatePath('/landing-pages')
    return {}
  } catch (e: any) {
    return { error: e.message }
  }
}

export async function togglePublishAction(id: string, publish: boolean): Promise<{ error?: string }> {
  const orgId = await getOrgId()
  if (!orgId) return { error: '組織が見つかりません' }

  try {
    const db = getDbFromContext()
    await updateLandingPage(db, orgId, id, {
      isPublished: publish,
      publishedAt: publish ? new Date().toISOString() : null,
    })
    revalidatePath(`/landing-pages/${id}`)
    revalidatePath('/landing-pages')
    return {}
  } catch (e: any) {
    return { error: e.message }
  }
}
