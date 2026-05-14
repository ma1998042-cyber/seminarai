import { auth } from './auth'
import { getDb, userProfiles } from './db'
import { eq } from 'drizzle-orm'

export async function getCurrentUser() {
  const session = await auth()
  return session?.user ?? null
}

export async function getCurrentOrgId(): Promise<string | null> {
  const user = await getCurrentUser()
  if (!user) return null

  const db = getDb()
  const profile = await db
    .select({ currentOrganizationId: userProfiles.currentOrganizationId })
    .from(userProfiles)
    .where(eq(userProfiles.id, user.id))
    .get()

  return profile?.currentOrganizationId ?? null
}
