'use server'

import { getDb, organizations, organizationMembers, userProfiles, plans, events } from '@/lib/db'
import { getCurrentUser } from '@/lib/session'
import { generateSlug } from '@/lib/utils'
import { eq } from 'drizzle-orm'
import { revalidatePath } from 'next/cache'

export async function createOrganizationFromDashboard(orgName: string, orgType: string) {
  const user = await getCurrentUser()
  if (!user) return { error: 'ログインが必要です' }

  const db = getDb()
  const slug = generateSlug(orgName)
  const plan = await db.select().from(plans).where(eq(plans.name, 'free')).get()

  const org = await db
    .insert(organizations)
    .values({
      name: orgName,
      slug,
      settings: JSON.stringify({ business_type: orgType }),
      planId: plan?.id ?? null,
    })
    .returning()
    .get()

  if (!org) return { error: '組織の作成に失敗しました' }

  await db.insert(organizationMembers).values({
    organizationId: org.id,
    userId: user.id,
    role: 'owner',
    joinedAt: new Date().toISOString(),
  })

  await db
    .insert(userProfiles)
    .values({ id: user.id, currentOrganizationId: org.id, onboardingCompleted: true })
    .onConflictDoUpdate({
      target: userProfiles.id,
      set: { currentOrganizationId: org.id, onboardingCompleted: true },
    })

  revalidatePath('/dashboard')
  return { orgId: org.id }
}
