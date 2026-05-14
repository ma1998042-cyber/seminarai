'use server'

import { headers } from 'next/headers'
import { eq, and } from 'drizzle-orm'
import { getAuth } from '@/lib/auth'
import { getDbFromContext } from '@/lib/db'
import { getUserProfile } from '@/lib/db/queries/users'
import { stepCampaigns, stepCampaignSteps, stepCampaignEnrollments } from '@/lib/db/schema'

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

export async function saveSequence(data: {
  id?: string
  name: string
  description?: string
  trigger_type: string
  trigger_event_id?: string
  trigger_tag_id?: string
}) {
  const user = await getAuthUser()
  if (!user) return { error: 'ログインが必要です' }
  const orgId = await getOrgId(user.id)
  if (!orgId) return { error: '組織が設定されていません' }

  const db = getDbFromContext()
  const payload = {
    name: data.name,
    description: data.description || null,
    triggerType: data.trigger_type,
    triggerEventId: data.trigger_event_id || null,
    triggerTagId: data.trigger_tag_id || null,
  }

  if (data.id) {
    await db.update(stepCampaigns).set({
      ...payload,
      updatedAt: new Date().toISOString(),
    }).where(and(eq(stepCampaigns.id, data.id), eq(stepCampaigns.organizationId, orgId)))
    return { id: data.id }
  } else {
    const [seq] = await db.insert(stepCampaigns).values({
      ...payload,
      organizationId: orgId,
      createdBy: user.id,
    }).returning()
    if (!seq) return { error: '作成に失敗しました' }
    return { id: seq.id }
  }
}

export async function updateSequenceStatus(id: string, status: string) {
  const user = await getAuthUser()
  if (!user) return { error: 'ログインが必要です' }
  const orgId = await getOrgId(user.id)
  if (!orgId) return { error: '組織が設定されていません' }

  const db = getDbFromContext()
  await db.update(stepCampaigns).set({
    status,
    updatedAt: new Date().toISOString(),
  }).where(and(eq(stepCampaigns.id, id), eq(stepCampaigns.organizationId, orgId)))
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
  const user = await getAuthUser()
  if (!user) return { error: 'ログインが必要です' }

  const db = getDbFromContext()
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
    await db.update(stepCampaignSteps).set(payload).where(eq(stepCampaignSteps.id, data.id))
    return { id: data.id }
  } else {
    const [step] = await db.insert(stepCampaignSteps).values(payload).returning()
    if (!step) return { error: '作成に失敗しました' }
    return { id: step.id }
  }
}

export async function deleteStep(id: string) {
  const user = await getAuthUser()
  if (!user) return { error: 'ログインが必要です' }

  const db = getDbFromContext()
  await db.delete(stepCampaignSteps).where(eq(stepCampaignSteps.id, id))
  return {}
}

export async function enrollCustomers(sequenceId: string, customerIds: string[]) {
  const user = await getAuthUser()
  if (!user) return { error: 'ログインが必要です' }
  const orgId = await getOrgId(user.id)
  if (!orgId) return { error: '組織が設定されていません' }

  const db = getDbFromContext()
  const rows = customerIds.map(cid => ({
    stepCampaignId: sequenceId,
    customerId: cid,
    organizationId: orgId,
    status: 'active',
    currentStep: 0,
  }))

  await db.insert(stepCampaignEnrollments).values(rows).onConflictDoNothing({
    target: [stepCampaignEnrollments.stepCampaignId, stepCampaignEnrollments.customerId],
  })
  return { enrolled: rows.length }
}

export async function getSequenceData(id: string): Promise<{
  sequence: {
    id: string
    name: string
    description: string | null
    status: string
    triggerType: string
  } | null
  steps: {
    id: string
    stepNumber: number
    name: string | null
    delayDays: number
    subject: string
    previewText: string | null
    bodyHtml: string
  }[]
}> {
  const db = getDbFromContext()
  const sequence = await db.query.stepCampaigns.findFirst({
    where: eq(stepCampaigns.id, id),
  })
  if (!sequence) return { sequence: null, steps: [] }

  const steps = await db.query.stepCampaignSteps.findMany({
    where: eq(stepCampaignSteps.stepCampaignId, id),
    orderBy: (s, { asc }) => [asc(s.stepNumber)],
  })

  return {
    sequence: {
      id: sequence.id,
      name: sequence.name,
      description: sequence.description,
      status: sequence.status,
      triggerType: sequence.triggerType,
    },
    steps: steps.map(s => ({
      id: s.id,
      stepNumber: s.stepNumber,
      name: s.name,
      delayDays: s.delayDays,
      subject: s.subject,
      previewText: s.previewText,
      bodyHtml: s.bodyHtml,
    })),
  }
}
