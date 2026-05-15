'use server'

import { headers } from 'next/headers'
import { eq } from 'drizzle-orm'
import { getAuth } from '@/lib/auth'
import { getDbFromContext } from '@/lib/db'
import { plans } from '@/lib/db/schema'
import {
  createOrganization as createOrg,
  addOrganizationMember,
} from '@/lib/db/queries/organizations'
import { upsertUserProfile } from '@/lib/db/queries/users'
import { createEvent as createEvt } from '@/lib/db/queries/events'
import {
  getPendingInvitationsByEmail,
  getInvitationByToken,
  acceptInvitation,
} from '@/lib/db/queries/invitations'
import { generateSlug } from '@/lib/utils'

async function getSessionUser() {
  const auth = getAuth()
  const headersList = await headers()
  const session = await auth.api.getSession({ headers: headersList })
  return session?.user ?? null
}

export async function createOrganization(orgName: string, orgType: string) {
  const user = await getSessionUser()
  if (!user) return { error: 'ログインが必要です' }

  const db = getDbFromContext()
  const slug = generateSlug(orgName)

  // Get free plan
  const freePlan = await db.query.plans.findFirst({
    where: eq(plans.name, 'free'),
    columns: { id: true },
  })

  let org: { id: string }
  try {
    org = await createOrg(db, {
      name: orgName,
      slug,
      settings: { business_type: orgType },
      planId: freePlan?.id ?? undefined,
    })
  } catch (e) {
    const message = e instanceof Error ? e.message : '不明なエラー'
    return { error: `${message}` }
  }

  await addOrganizationMember(db, {
    organizationId: org.id,
    userId: user.id,
    role: 'owner',
    joinedAt: new Date().toISOString(),
  })

  await upsertUserProfile(db, user.id, {
    currentOrganizationId: org.id,
  })

  return { orgId: org.id }
}

export async function createEvent(orgId: string, eventTitle: string, eventType: string) {
  const user = await getSessionUser()
  if (!user) return { error: 'ログインが必要です' }

  const db = getDbFromContext()
  try {
    await createEvt(db, {
      organizationId: orgId,
      title: eventTitle,
      eventType,
      status: 'draft',
      createdBy: user.id,
    })
  } catch (e) {
    return { error: e instanceof Error ? e.message : '不明なエラー' }
  }

  return {}
}

export async function getPendingInvitations() {
  const user = await getSessionUser()
  if (!user?.email) return []

  const db = getDbFromContext()
  return getPendingInvitationsByEmail(db, user.email)
}

export async function acceptInvitationAndCompleteOnboarding(token: string) {
  const user = await getSessionUser()
  if (!user) return { error: 'ログインが必要です' }

  const db = getDbFromContext()
  const invitation = await getInvitationByToken(db, token)

  if (!invitation) return { error: '招待が見つかりません。' }
  if (invitation.acceptedAt) return { error: 'この招待はすでに使用されています。' }

  const now = new Date().toISOString()
  if (invitation.expiresAt < now) return { error: '招待の有効期限が切れています。' }

  await acceptInvitation(db, invitation.id)
  await addOrganizationMember(db, {
    organizationId: invitation.organizationId,
    userId: user.id,
    role: invitation.role,
    invitedBy: invitation.invitedBy || undefined,
    invitedAt: invitation.createdAt,
    joinedAt: now,
  })

  await upsertUserProfile(db, user.id, {
    currentOrganizationId: invitation.organizationId,
    onboardingCompleted: true,
  })

  return { success: true }
}

export async function completeOnboarding() {
  const user = await getSessionUser()
  if (!user) return { error: 'ログインが必要です' }

  const db = getDbFromContext()
  await upsertUserProfile(db, user.id, {
    onboardingCompleted: true,
  })

  return {}
}
