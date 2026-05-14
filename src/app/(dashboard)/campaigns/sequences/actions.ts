'use server'

import { getDb, stepCampaigns, stepCampaignSteps, stepCampaignEnrollments } from '@/lib/db'
import { getCurrentUser, getCurrentOrgId } from '@/lib/session'
import { eq, and } from 'drizzle-orm'

export async function saveSequence(data: {
  id?: string
  name: string
  description?: string
  trigger_type: string
  trigger_event_id?: string
  trigger_tag_id?: string
}) {
  const user = await getCurrentUser()
  if (!user) return { error: 'ログインが必要です' }
  const orgId = await getCurrentOrgId()
  if (!orgId) return { error: '組織が設定されていません' }

  const db = getDb()
  const payload = {
    name: data.name,
    description: data.description || null,
    triggerType: data.trigger_type,
    triggerEventId: data.trigger_event_id || null,
    triggerTagId: data.trigger_tag_id || null,
  }

  if (data.id) {
    await db
      .update(stepCampaigns)
      .set({ ...payload, updatedAt: new Date().toISOString() })
      .where(and(eq(stepCampaigns.id, data.id), eq(stepCampaigns.organizationId, orgId)))
    return { id: data.id }
  }

  const seq = await db
    .insert(stepCampaigns)
    .values({ ...payload, organizationId: orgId, createdBy: user.id })
    .returning()
    .get()

  return { id: seq.id }
}

export async function updateSequenceStatus(id: string, status: string) {
  const orgId = await getCurrentOrgId()
  if (!orgId) return { error: '組織が設定されていません' }

  const db = getDb()
  await db
    .update(stepCampaigns)
    .set({ status, updatedAt: new Date().toISOString() })
    .where(and(eq(stepCampaigns.id, id), eq(stepCampaigns.organizationId, orgId)))
  return {}
}

export async function saveStep(data: {
  id?: string
  step_campaign_id: string
  step_number: number
  name?: string
  delay_days: number
  subject: string
  preview_text?: string
  body_html: string
}) {
  const user = await getCurrentUser()
  if (!user) return { error: 'ログインが必要です' }

  const db = getDb()
  const payload = {
    stepCampaignId: data.step_campaign_id,
    stepNumber: data.step_number,
    name: data.name || null,
    delayDays: data.delay_days,
    subject: data.subject,
    previewText: data.preview_text || null,
    bodyHtml: data.body_html,
  }

  if (data.id) {
    await db
      .update(stepCampaignSteps)
      .set({ ...payload, updatedAt: new Date().toISOString() })
      .where(eq(stepCampaignSteps.id, data.id))
    return { id: data.id }
  }

  const step = await db.insert(stepCampaignSteps).values(payload).returning().get()
  return { id: step.id }
}

export async function deleteStep(id: string) {
  const db = getDb()
  await db.delete(stepCampaignSteps).where(eq(stepCampaignSteps.id, id))
  return {}
}

export async function enrollCustomers(sequenceId: string, customerIds: string[]) {
  const orgId = await getCurrentOrgId()
  if (!orgId) return { error: '組織が設定されていません' }

  const db = getDb()
  for (const customerId of customerIds) {
    await db
      .insert(stepCampaignEnrollments)
      .values({
        stepCampaignId: sequenceId,
        customerId,
        organizationId: orgId,
        status: 'active',
        currentStep: 0,
      })
      .onConflictDoNothing()
  }

  return { enrolled: customerIds.length }
}
