'use server'

import { getDb, emailTemplates } from '@/lib/db'
import { getCurrentUser, getCurrentOrgId } from '@/lib/session'
import { eq, and } from 'drizzle-orm'

export async function saveTemplate(data: {
  id?: string
  name: string
  subject: string
  preview_text?: string
  body_html: string
}) {
  const user = await getCurrentUser()
  if (!user) return { error: 'ログインが必要です' }
  const orgId = await getCurrentOrgId()
  if (!orgId) return { error: '組織が設定されていません' }

  const db = getDb()

  if (data.id) {
    await db
      .update(emailTemplates)
      .set({
        name: data.name,
        subject: data.subject,
        previewText: data.preview_text || null,
        bodyHtml: data.body_html,
        updatedAt: new Date().toISOString(),
      })
      .where(and(eq(emailTemplates.id, data.id), eq(emailTemplates.organizationId, orgId)))
    return { id: data.id }
  }

  const tmpl = await db
    .insert(emailTemplates)
    .values({
      organizationId: orgId,
      name: data.name,
      subject: data.subject,
      previewText: data.preview_text || null,
      bodyHtml: data.body_html,
      createdBy: user.id,
    })
    .returning()
    .get()

  return { id: tmpl.id }
}

export async function deleteTemplate(id: string) {
  const orgId = await getCurrentOrgId()
  if (!orgId) return { error: '組織が設定されていません' }

  const db = getDb()
  await db
    .delete(emailTemplates)
    .where(and(eq(emailTemplates.id, id), eq(emailTemplates.organizationId, orgId)))
  return {}
}
