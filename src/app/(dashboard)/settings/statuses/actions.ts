"use server";

import { getAuth } from "@/lib/auth";
import { getDbFromContext } from "@/lib/db";
import { getUserProfile } from "@/lib/db/queries/users";
import {
  getCustomerStatuses,
  createCustomerStatus,
  updateCustomerStatus,
  deleteCustomerStatus,
} from "@/lib/db/queries/customerStatuses";
import { headers } from "next/headers";
import { revalidatePath } from "next/cache";

async function getSessionAndOrg() {
  const auth = getAuth();
  const session = await auth.api.getSession({ headers: await headers() });
  const user = session?.user;
  if (!user) return { error: "ログインが必要です" } as const;

  const db = getDbFromContext();
  const profile = await getUserProfile(db, user.id);
  if (!profile?.currentOrganizationId) return { error: "組織が見つかりません" } as const;

  return { db, orgId: profile.currentOrganizationId } as const;
}

export async function getStatusesData() {
  const result = await getSessionAndOrg();
  if ("error" in result) return { error: result.error, statuses: [] };

  const statusesList = await getCustomerStatuses(result.db, result.orgId);
  return {
    statuses: statusesList.map((s) => ({
      id: s.id,
      name: s.name,
      color: s.color,
      sortOrder: s.sortOrder,
    })),
  };
}

export async function addStatus(data: {
  name: string;
  color: string;
}): Promise<{ error?: string }> {
  const result = await getSessionAndOrg();
  if ("error" in result) return { error: result.error };

  try {
    // 既存の最大sortOrderを取得
    const existing = await getCustomerStatuses(result.db, result.orgId);
    const maxOrder = existing.reduce((max, s) => Math.max(max, s.sortOrder), -1);

    await createCustomerStatus(result.db, {
      organizationId: result.orgId,
      name: data.name.trim(),
      color: data.color,
      sortOrder: maxOrder + 1,
    });
    revalidatePath("/settings/statuses");
    revalidatePath("/customers");
    return {};
  } catch (e: any) {
    if (e.message?.includes("UNIQUE constraint")) {
      return { error: "同じ名前のステータスが既に存在します" };
    }
    return { error: "ステータスの追加に失敗しました" };
  }
}

export async function editStatus(
  statusId: string,
  data: { name: string; color: string },
): Promise<{ error?: string }> {
  const result = await getSessionAndOrg();
  if ("error" in result) return { error: result.error };

  try {
    await updateCustomerStatus(result.db, result.orgId, statusId, {
      name: data.name.trim(),
      color: data.color,
    });
    revalidatePath("/settings/statuses");
    revalidatePath("/customers");
    return {};
  } catch (e: any) {
    if (e.message?.includes("UNIQUE constraint")) {
      return { error: "同じ名前のステータスが既に存在します" };
    }
    return { error: "ステータスの更新に失敗しました" };
  }
}

export async function removeStatus(statusId: string): Promise<{ error?: string }> {
  const result = await getSessionAndOrg();
  if ("error" in result) return { error: result.error };

  try {
    await deleteCustomerStatus(result.db, result.orgId, statusId);
    revalidatePath("/settings/statuses");
    revalidatePath("/customers");
    return {};
  } catch (e: any) {
    return { error: "ステータスの削除に失敗しました" };
  }
}
