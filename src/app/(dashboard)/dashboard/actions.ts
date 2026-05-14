'use server'

import { headers } from 'next/headers'
import { revalidatePath } from 'next/cache'
import { eq } from 'drizzle-orm'
import { getAuth } from '@/lib/auth'
import { getDbFromContext } from '@/lib/db'
import { plans } from '@/lib/db/schema'
import { createOrganization } from '@/lib/db/queries/organizations'
import { addOrganizationMember } from '@/lib/db/queries/organizations'
import { upsertUserProfile } from '@/lib/db/queries/users'
import { generateSlug } from '@/lib/utils'

export async function createOrganizationFromDashboard(orgName: string, orgType: string) {
  const auth = getAuth()
  const headersList = await headers()
  const session = await auth.api.getSession({ headers: headersList })
  const user = session?.user
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
    org = await createOrganization(db, {
      name: orgName,
      slug,
      settings: { business_type: orgType },
      planId: freePlan?.id ?? undefined,
    })
  } catch (e) {
    return { error: e instanceof Error ? e.message : '組織の作成に失敗しました' }
  }

  await addOrganizationMember(db, {
    organizationId: org.id,
    userId: user.id,
    role: 'owner',
    joinedAt: new Date().toISOString(),
  })

  await upsertUserProfile(db, user.id, {
    currentOrganizationId: org.id,
    onboardingCompleted: true,
  })

  revalidatePath('/dashboard')
  return { orgId: org.id }
}
