import { eq, and, like, or, sql } from "drizzle-orm";
import { customers, customerTags, tags } from "../schema";
import type { Database } from "..";

// =============================================
// 顧客 CRUD（組織スコープ付き）
// =============================================

export async function getCustomers(
  db: Database,
  orgId: string,
  options?: {
    search?: string;
    status?: string;
    limit?: number;
    offset?: number;
  },
) {
  const conditions = [eq(customers.organizationId, orgId)];

  if (options?.status) {
    conditions.push(eq(customers.status, options.status));
  }

  if (options?.search) {
    const pattern = `%${options.search}%`;
    conditions.push(
      or(
        like(customers.email, pattern),
        like(customers.fullName, pattern),
        like(customers.company, pattern),
      )!,
    );
  }

  return db.query.customers.findMany({
    where: and(...conditions),
    limit: options?.limit ?? 50,
    offset: options?.offset ?? 0,
    orderBy: (customers, { desc }) => [desc(customers.createdAt)],
  });
}

export async function getCustomerById(db: Database, orgId: string, id: string) {
  return db.query.customers.findFirst({
    where: and(
      eq(customers.id, id),
      eq(customers.organizationId, orgId),
    ),
    with: {
      customerTags: {
        with: { tag: true },
      },
    },
  });
}

export async function createCustomer(
  db: Database,
  data: {
    organizationId: string;
    email: string;
    fullName?: string;
    phone?: string;
    company?: string;
    jobTitle?: string;
    notes?: string;
    status?: string;
    source?: string;
    sourceEventId?: string;
    customFields?: Record<string, unknown>;
    emailOptIn?: boolean;
  },
) {
  const [customer] = await db.insert(customers).values(data).returning();
  return customer;
}

export async function updateCustomer(
  db: Database,
  orgId: string,
  id: string,
  data: Partial<{
    email: string;
    fullName: string | null;
    phone: string | null;
    company: string | null;
    jobTitle: string | null;
    notes: string | null;
    status: string;
    source: string | null;
    sourceEventId: string | null;
    customFields: Record<string, unknown>;
    emailOptIn: boolean;
    lastActivityAt: string | null;
  }>,
) {
  const [customer] = await db
    .update(customers)
    .set({ ...data, updatedAt: new Date().toISOString() })
    .where(and(eq(customers.id, id), eq(customers.organizationId, orgId)))
    .returning();
  return customer;
}

export async function deleteCustomer(db: Database, orgId: string, id: string) {
  const [deleted] = await db
    .delete(customers)
    .where(and(eq(customers.id, id), eq(customers.organizationId, orgId)))
    .returning();
  return deleted;
}

export async function upsertCustomerByEmail(
  db: Database,
  orgId: string,
  data: {
    email: string;
    fullName?: string;
    phone?: string;
    company?: string;
    jobTitle?: string;
    source?: string;
    sourceEventId?: string;
  },
) {
  const [customer] = await db
    .insert(customers)
    .values({ organizationId: orgId, ...data })
    .onConflictDoUpdate({
      target: [customers.organizationId, customers.email],
      set: {
        ...(data.fullName !== undefined && { fullName: data.fullName }),
        ...(data.phone !== undefined && { phone: data.phone }),
        ...(data.company !== undefined && { company: data.company }),
        ...(data.jobTitle !== undefined && { jobTitle: data.jobTitle }),
        lastActivityAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    })
    .returning();
  return customer;
}

// =============================================
// 顧客タグ
// =============================================

export async function getCustomerTags(db: Database, customerId: string) {
  return db.query.customerTags.findMany({
    where: eq(customerTags.customerId, customerId),
    with: { tag: true },
  });
}

export async function addCustomerTag(
  db: Database,
  customerId: string,
  tagId: string,
  addedBy?: string,
) {
  const [result] = await db
    .insert(customerTags)
    .values({ customerId, tagId, addedBy })
    .onConflictDoNothing()
    .returning();
  return result;
}

export async function removeCustomerTag(db: Database, customerId: string, tagId: string) {
  const [removed] = await db
    .delete(customerTags)
    .where(and(eq(customerTags.customerId, customerId), eq(customerTags.tagId, tagId)))
    .returning();
  return removed;
}
