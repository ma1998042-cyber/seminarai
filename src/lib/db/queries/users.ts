import { eq } from "drizzle-orm";
import { userProfiles } from "../schema";
import type { Database } from "..";

export async function getUserProfile(db: Database, userId: string) {
  return db.query.userProfiles.findFirst({
    where: eq(userProfiles.id, userId),
  });
}

export async function upsertUserProfile(
  db: Database,
  userId: string,
  data: Partial<{
    fullName: string | null;
    avatarUrl: string | null;
    phone: string | null;
    currentOrganizationId: string | null;
    onboardingCompleted: boolean;
  }>,
) {
  const [profile] = await db
    .insert(userProfiles)
    .values({ id: userId, ...data })
    .onConflictDoUpdate({
      target: userProfiles.id,
      set: { ...data, updatedAt: new Date().toISOString() },
    })
    .returning();
  return profile;
}

export async function updateUserProfile(
  db: Database,
  userId: string,
  data: Partial<{
    fullName: string | null;
    avatarUrl: string | null;
    phone: string | null;
    currentOrganizationId: string | null;
    onboardingCompleted: boolean;
  }>,
) {
  const [profile] = await db
    .update(userProfiles)
    .set({ ...data, updatedAt: new Date().toISOString() })
    .where(eq(userProfiles.id, userId))
    .returning();
  return profile;
}
