'use server'

import { headers } from 'next/headers'
import { getAuth } from '@/lib/auth'
import { getDbFromContext } from '@/lib/db'
import { getUserProfile } from '@/lib/db/queries/users'
import {
  createBlogPost,
  updateBlogPost,
  deleteBlogPost,
  setBlogPostCategories,
  createBlogCategory,
  updateBlogCategory,
  deleteBlogCategory,
} from '@/lib/db/queries/blogPosts'
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

// =============================================
// Blog Posts
// =============================================

export async function createBlogPostAction(form: {
  title: string
  slug: string
}): Promise<{ postId?: string; error?: string }> {
  const ctx = await getOrgContext()
  if ('error' in ctx) return { error: ctx.error }

  if (!form.title.trim()) return { error: 'タイトルは必須です' }
  if (!form.slug.trim()) return { error: 'スラッグは必須です' }

  try {
    const post = await createBlogPost(ctx.db, {
      organizationId: ctx.orgId,
      title: form.title.trim(),
      slug: form.slug.trim(),
      status: 'draft',
      authorId: ctx.user.id,
    })

    if (!post) return { error: '記事の作成に失敗しました' }

    revalidatePath('/blog')
    return { postId: post.id }
  } catch (e: any) {
    if (e?.message?.includes('UNIQUE')) {
      return { error: 'このスラッグは既に使用されています' }
    }
    return { error: '記事の作成に失敗しました' }
  }
}

export async function updateBlogPostAction(
  id: string,
  form: {
    title: string
    slug: string
    bodyHtml?: string
    excerpt?: string
    thumbnailUrl?: string
    metaTitle?: string
    metaDescription?: string
    ogImageUrl?: string
    categoryIds?: string[]
  }
): Promise<{ success?: boolean; error?: string }> {
  const ctx = await getOrgContext()
  if ('error' in ctx) return { error: ctx.error }

  if (!form.title.trim()) return { error: 'タイトルは必須です' }
  if (!form.slug.trim()) return { error: 'スラッグは必須です' }

  try {
    const post = await updateBlogPost(ctx.db, ctx.orgId, id, {
      title: form.title.trim(),
      slug: form.slug.trim(),
      bodyHtml: form.bodyHtml || null,
      excerpt: form.excerpt || null,
      thumbnailUrl: form.thumbnailUrl || null,
      metaTitle: form.metaTitle || null,
      metaDescription: form.metaDescription || null,
      ogImageUrl: form.ogImageUrl || null,
    })

    if (!post) return { error: '記事が見つかりません' }

    if (form.categoryIds !== undefined) {
      await setBlogPostCategories(ctx.db, id, form.categoryIds)
    }

    revalidatePath('/blog')
    revalidatePath(`/blog/${id}`)
    return { success: true }
  } catch (e: any) {
    if (e?.message?.includes('UNIQUE')) {
      return { error: 'このスラッグは既に使用されています' }
    }
    return { error: '記事の更新に失敗しました' }
  }
}

export async function deleteBlogPostAction(id: string): Promise<{ success?: boolean; error?: string }> {
  const ctx = await getOrgContext()
  if ('error' in ctx) return { error: ctx.error }

  await deleteBlogPost(ctx.db, ctx.orgId, id)

  revalidatePath('/blog')
  return { success: true }
}

export async function publishBlogPostAction(id: string): Promise<{ success?: boolean; error?: string }> {
  const ctx = await getOrgContext()
  if ('error' in ctx) return { error: ctx.error }

  const post = await updateBlogPost(ctx.db, ctx.orgId, id, {
    status: 'published',
    publishedAt: new Date().toISOString(),
  })

  if (!post) return { error: '記事が見つかりません' }

  revalidatePath('/blog')
  revalidatePath(`/blog/${id}`)
  return { success: true }
}

export async function unpublishBlogPostAction(id: string): Promise<{ success?: boolean; error?: string }> {
  const ctx = await getOrgContext()
  if ('error' in ctx) return { error: ctx.error }

  const post = await updateBlogPost(ctx.db, ctx.orgId, id, {
    status: 'draft',
  })

  if (!post) return { error: '記事が見つかりません' }

  revalidatePath('/blog')
  revalidatePath(`/blog/${id}`)
  return { success: true }
}

// =============================================
// Blog Categories
// =============================================

export async function createBlogCategoryAction(form: {
  name: string
  slug: string
  sortOrder?: number
}): Promise<{ categoryId?: string; error?: string }> {
  const ctx = await getOrgContext()
  if ('error' in ctx) return { error: ctx.error }

  if (!form.name.trim()) return { error: 'カテゴリ名は必須です' }
  if (!form.slug.trim()) return { error: 'スラッグは必須です' }

  try {
    const cat = await createBlogCategory(ctx.db, {
      organizationId: ctx.orgId,
      name: form.name.trim(),
      slug: form.slug.trim(),
      sortOrder: form.sortOrder ?? 0,
    })

    if (!cat) return { error: 'カテゴリの作成に失敗しました' }

    revalidatePath('/blog/categories')
    return { categoryId: cat.id }
  } catch (e: any) {
    if (e?.message?.includes('UNIQUE')) {
      return { error: 'このスラッグは既に使用されています' }
    }
    return { error: 'カテゴリの作成に失敗しました' }
  }
}

export async function updateBlogCategoryAction(
  id: string,
  form: {
    name: string
    slug: string
    sortOrder?: number
  }
): Promise<{ success?: boolean; error?: string }> {
  const ctx = await getOrgContext()
  if ('error' in ctx) return { error: ctx.error }

  if (!form.name.trim()) return { error: 'カテゴリ名は必須です' }
  if (!form.slug.trim()) return { error: 'スラッグは必須です' }

  try {
    const cat = await updateBlogCategory(ctx.db, ctx.orgId, id, {
      name: form.name.trim(),
      slug: form.slug.trim(),
      sortOrder: form.sortOrder ?? 0,
    })

    if (!cat) return { error: 'カテゴリが見つかりません' }

    revalidatePath('/blog/categories')
    return { success: true }
  } catch (e: any) {
    if (e?.message?.includes('UNIQUE')) {
      return { error: 'このスラッグは既に使用されています' }
    }
    return { error: 'カテゴリの更新に失敗しました' }
  }
}

export async function deleteBlogCategoryAction(id: string): Promise<{ success?: boolean; error?: string }> {
  const ctx = await getOrgContext()
  if ('error' in ctx) return { error: ctx.error }

  await deleteBlogCategory(ctx.db, ctx.orgId, id)

  revalidatePath('/blog/categories')
  return { success: true }
}
