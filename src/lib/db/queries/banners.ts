import { eq, and, asc } from "drizzle-orm";
import { banners } from "../schema";
import type { Database } from "..";

export async function getBanners(db: Database, orgId: string) {
  return db.query.banners.findMany({
    where: eq(banners.organizationId, orgId),
    orderBy: [asc(banners.sortOrder)],
  });
}

export async function getActiveBanners(db: Database) {
  return db.query.banners.findMany({
    where: eq(banners.isActive, true),
    orderBy: [asc(banners.sortOrder)],
    limit: 2,
  });
}

export async function getActiveBannersByOrg(db: Database, orgId: string) {
  return db.query.banners.findMany({
    where: and(eq(banners.organizationId, orgId), eq(banners.isActive, true)),
    orderBy: [asc(banners.sortOrder)],
    limit: 2,
  });
}

export async function createBanner(
  db: Database,
  data: {
    organizationId: string;
    title: string;
    imageUrl: string;
    mobileImageUrl?: string | null;
    linkUrl: string;
    sortOrder?: number;
    isActive?: boolean;
  },
) {
  const [banner] = await db.insert(banners).values(data).returning();
  return banner;
}

export async function updateBanner(
  db: Database,
  orgId: string,
  id: string,
  data: Partial<{
    title: string;
    imageUrl: string;
    mobileImageUrl: string | null;
    linkUrl: string;
    sortOrder: number;
    isActive: boolean;
  }>,
) {
  const [banner] = await db
    .update(banners)
    .set(data)
    .where(and(eq(banners.id, id), eq(banners.organizationId, orgId)))
    .returning();
  return banner;
}

export async function deleteBanner(db: Database, orgId: string, id: string) {
  await db
    .delete(banners)
    .where(and(eq(banners.id, id), eq(banners.organizationId, orgId)));
}
