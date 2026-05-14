'use server'

import { headers } from 'next/headers'
import { eq, and } from 'drizzle-orm'
import { getAuth } from '@/lib/auth'
import { getDbFromContext } from '@/lib/db'
import { getUserProfile } from '@/lib/db/queries/users'
import { emailTemplates } from '@/lib/db/schema'

async function getAuthUser() {
  const auth = getAuth()
  const session = await auth.api.getSession({ headers: await headers() })
  return session?.user ?? null
}

async function getOrgId(userId: string) {
  const db = getDbFromContext()
  const profile = await getUserProfile(db, userId)
  return profile?.currentOrganizationId ?? null
}

export async function saveTemplate(data: {
  id?: string
  name: string
  subject: string
  preview_text?: string
  body_html: string
}) {
  const user = await getAuthUser()
  if (!user) return { error: 'ログインが必要です' }
  const orgId = await getOrgId(user.id)
  if (!orgId) return { error: '組織が設定されていません' }

  const db = getDbFromContext()

  if (data.id) {
    const [updated] = await db.update(emailTemplates).set({
      name: data.name,
      subject: data.subject,
      previewText: data.preview_text || null,
      bodyHtml: data.body_html,
      updatedAt: new Date().toISOString(),
    }).where(and(eq(emailTemplates.id, data.id), eq(emailTemplates.organizationId, orgId))).returning()
    if (!updated) return { error: '更新に失敗しました' }
    return { id: data.id }
  } else {
    const [tmpl] = await db.insert(emailTemplates).values({
      organizationId: orgId,
      name: data.name,
      subject: data.subject,
      previewText: data.preview_text || null,
      bodyHtml: data.body_html,
      createdBy: user.id,
    }).returning()
    if (!tmpl) return { error: '作成に失敗しました' }
    return { id: tmpl.id }
  }
}

export async function deleteTemplate(id: string) {
  const user = await getAuthUser()
  if (!user) return { error: 'ログインが必要です' }
  const orgId = await getOrgId(user.id)
  if (!orgId) return { error: '組織が設定されていません' }

  const db = getDbFromContext()
  await db.delete(emailTemplates).where(and(eq(emailTemplates.id, id), eq(emailTemplates.organizationId, orgId)))
  return {}
}
