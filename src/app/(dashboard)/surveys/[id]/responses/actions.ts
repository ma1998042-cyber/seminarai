"use server";

import { headers } from "next/headers";
import { getAuth } from "@/lib/auth";
import { getDbFromContext } from "@/lib/db";
import { getUserProfile } from "@/lib/db/queries/users";
import { customers, customerTags } from "@/lib/db/schema";
import { eq, and, inArray } from "drizzle-orm";

export async function bulkAssignTag(
  organizationId: string,
  emails: string[],
  tagId: string,
) {
  const auth = getAuth();
  const session = await auth.api.getSession({ headers: await headers() });
  const user = session?.user;
  if (!user) return { error: "ログインが必要です" };

  const db = getDbFromContext();
  const profile = await getUserProfile(db, user.id);
  if (profile?.currentOrganizationId !== organizationId) {
    return { error: "権限がありません" };
  }

  // メールアドレスで顧客を検索
  const matchedCustomers = await db
    .select({ id: customers.id, email: customers.email })
    .from(customers)
    .where(
      and(
        eq(customers.organizationId, organizationId),
        inArray(customers.email, emails),
      ),
    );

  if (matchedCustomers.length === 0) {
    return { success: true, assigned: 0, skipped: emails.length };
  }

  // 既存のタグ割り当てを取得して重複を除外
  const customerIds = matchedCustomers.map((c) => c.id);
  const existingTags = await db
    .select({ customerId: customerTags.customerId })
    .from(customerTags)
    .where(
      and(
        eq(customerTags.tagId, tagId),
        inArray(customerTags.customerId, customerIds),
      ),
    );

  const existingCustomerIds = new Set(existingTags.map((t) => t.customerId));
  const newCustomerIds = customerIds.filter((id) => !existingCustomerIds.has(id));

  if (newCustomerIds.length > 0) {
    await db.insert(customerTags).values(
      newCustomerIds.map((customerId) => ({
        customerId,
        tagId,
        addedBy: user.id,
      })),
    );
  }

  const skipped = emails.length - matchedCustomers.length;
  return {
    success: true,
    assigned: newCustomerIds.length,
    alreadyAssigned: existingCustomerIds.size,
    skipped,
  };
}
