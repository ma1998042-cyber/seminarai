"use server";

import { getAuth } from "@/lib/auth";
import { getDbFromContext } from "@/lib/db";
import { getUserProfile } from "@/lib/db/queries/users";
import {
  getBanners,
  createBanner,
  updateBanner,
  deleteBanner,
} from "@/lib/db/queries/banners";
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

export async function getBannersData() {
  const result = await getSessionAndOrg();
  if ("error" in result) return { error: result.error, banners: [] };

  const bannersList = await getBanners(result.db, result.orgId);
  return {
    banners: bannersList.map((b) => ({
      id: b.id,
      title: b.title,
      imageUrl: b.imageUrl,
      linkUrl: b.linkUrl,
      sortOrder: b.sortOrder,
      isActive: b.isActive,
    })),
  };
}

export async function addBanner(data: {
  title: string;
  imageUrl: string;
  linkUrl: string;
}) {
  const result = await getSessionAndOrg();
  if ("error" in result) return { error: result.error };

  try {
    await createBanner(result.db, {
      organizationId: result.orgId,
      title: data.title,
      imageUrl: data.imageUrl,
      linkUrl: data.linkUrl,
    });
    revalidatePath("/settings/banners");
    revalidatePath("/events/public");
    return { success: true };
  } catch {
    return { error: "バナーの追加に失敗しました" };
  }
}

export async function toggleBanner(bannerId: string, isActive: boolean) {
  const result = await getSessionAndOrg();
  if ("error" in result) return { error: result.error };

  try {
    await updateBanner(result.db, result.orgId, bannerId, { isActive });
    revalidatePath("/settings/banners");
    revalidatePath("/events/public");
    return { success: true };
  } catch {
    return { error: "バナーの更新に失敗しました" };
  }
}

export async function editBanner(
  bannerId: string,
  data: { title?: string; linkUrl?: string; imageUrl?: string }
) {
  const result = await getSessionAndOrg();
  if ("error" in result) return { error: result.error };

  try {
    await updateBanner(result.db, result.orgId, bannerId, data);
    revalidatePath("/settings/banners");
    revalidatePath("/events/public");
    return { success: true };
  } catch {
    return { error: "バナーの更新に失敗しました" };
  }
}

export async function removeBanner(bannerId: string) {
  const result = await getSessionAndOrg();
  if ("error" in result) return { error: result.error };

  try {
    await deleteBanner(result.db, result.orgId, bannerId);
    revalidatePath("/settings/banners");
    revalidatePath("/events/public");
    return { success: true };
  } catch {
    return { error: "バナーの削除に失敗しました" };
  }
}
