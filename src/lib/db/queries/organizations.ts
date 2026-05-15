import { eq, and } from "drizzle-orm";
import { organizations, organizationMembers, subscriptions } from "../schema";
import type { Database } from "..";

// =============================================
// 組織 CRUD
// =============================================

export async function getOrganizationById(db: Database, id: string) {
  return db.query.organizations.findFirst({
    where: eq(organizations.id, id),
  });
}

export async function getOrganizationBySlug(db: Database, slug: string) {
  return db.query.organizations.findFirst({
    where: eq(organizations.slug, slug),
  });
}

export async function getOrganizationByStripeCustomerId(db: Database, stripeCustomerId: string) {
  return db.query.organizations.findFirst({
    where: eq(organizations.stripeCustomerId, stripeCustomerId),
  });
}

export async function createOrganization(
  db: Database,
  data: {
    name: string;
    slug: string;
    description?: string;
    logoUrl?: string;
    website?: string;
    planId?: string;
    stripeCustomerId?: string;
    trialEndsAt?: string;
    settings?: Record<string, unknown>;
  },
) {
  const [org] = await db.insert(organizations).values(data).returning();
  return org;
}

export async function updateOrganization(
  db: Database,
  id: string,
  data: Partial<{
    name: string;
    slug: string;
    description: string | null;
    logoUrl: string | null;
    website: string | null;
    planId: string | null;
    stripeCustomerId: string | null;
    trialEndsAt: string | null;
    isActive: boolean;
    settings: Record<string, unknown>;
  }>,
) {
  const [org] = await db
    .update(organizations)
    .set({ ...data, updatedAt: new Date().toISOString() })
    .where(eq(organizations.id, id))
    .returning();
  return org;
}

// =============================================
// 組織メンバー（RLS代替: 必ずorganization_idでフィルタ）
// =============================================

export async function getOrganizationMembers(db: Database, orgId: string) {
  return db.query.organizationMembers.findMany({
    where: eq(organizationMembers.organizationId, orgId),
  });
}

export async function addOrganizationMember(
  db: Database,
  data: {
    organizationId: string;
    userId: string;
    role?: string;
    invitedBy?: string;
    invitedAt?: string;
    joinedAt?: string;
  },
) {
  const [member] = await db.insert(organizationMembers).values(data).returning();
  return member;
}

export async function getUserOrganizations(db: Database, userId: string) {
  return db.query.organizationMembers.findMany({
    where: and(
      eq(organizationMembers.userId, userId),
      eq(organizationMembers.isActive, true),
    ),
    with: {
      organization: true,
    },
  });
}

export async function getUserOrgRole(db: Database, orgId: string, userId: string) {
  const member = await db.query.organizationMembers.findFirst({
    where: and(
      eq(organizationMembers.organizationId, orgId),
      eq(organizationMembers.userId, userId),
      eq(organizationMembers.isActive, true),
    ),
  });
  return member?.role ?? null;
}

export async function updateMemberRole(db: Database, memberId: string, role: string) {
  const [member] = await db
    .update(organizationMembers)
    .set({ role, updatedAt: new Date().toISOString() })
    .where(eq(organizationMembers.id, memberId))
    .returning();
  return member;
}

export async function removeMember(db: Database, memberId: string) {
  const [member] = await db
    .delete(organizationMembers)
    .where(eq(organizationMembers.id, memberId))
    .returning();
  return member;
}

export async function isOrgMember(db: Database, orgId: string, userId: string) {
  const member = await db.query.organizationMembers.findFirst({
    where: and(
      eq(organizationMembers.organizationId, orgId),
      eq(organizationMembers.userId, userId),
      eq(organizationMembers.isActive, true),
    ),
    columns: { id: true },
  });
  return !!member;
}
