"use server";

import { getAuth } from "@/lib/auth";
import { getDbFromContext } from "@/lib/db";
import { getUserProfile, updateUserProfile } from "@/lib/db/queries/users";
import { getOrganizationById, updateOrganization } from "@/lib/db/queries/organizations";
import { createInvitation } from "@/lib/db/queries/invitations";
import { headers } from "next/headers";
import { revalidatePath } from "next/cache";

// =============================================
// プロフィール
// =============================================

export async function getProfileData() {
  const auth = getAuth();
  const session = await auth.api.getSession({ headers: await headers() });
  const user = session?.user;
  if (!user) return { error: "ログインが必要です" };

  const db = getDbFromContext();
  const profile = await getUserProfile(db, user.id);

  return {
    email: user.email || "",
    fullName: profile?.fullName || "",
  };
}

export async function saveProfile(fullName: string) {
  const auth = getAuth();
  const session = await auth.api.getSession({ headers: await headers() });
  const user = session?.user;
  if (!user) return { error: "ログインが必要です" };

  const db = getDbFromContext();
  await updateUserProfile(db, user.id, { fullName });

  revalidatePath("/settings/profile");
  return { success: true };
}

// =============================================
// 組織設定
// =============================================

export async function getOrganizationData() {
  const auth = getAuth();
  const session = await auth.api.getSession({ headers: await headers() });
  const user = session?.user;
  if (!user) return { error: "ログインが必要です" };

  const db = getDbFromContext();
  const profile = await getUserProfile(db, user.id);
  if (!profile?.currentOrganizationId) return { error: "組織が見つかりません" };

  const org = await getOrganizationById(db, profile.currentOrganizationId);
  if (!org) return { error: "組織が見つかりません" };

  return {
    orgId: org.id,
    name: org.name,
    description: org.description || "",
    website: org.website || "",
  };
}

export async function saveOrganization(
  orgId: string,
  data: { name: string; description: string; website: string }
) {
  const auth = getAuth();
  const session = await auth.api.getSession({ headers: await headers() });
  const user = session?.user;
  if (!user) return { error: "ログインが必要です" };

  const db = getDbFromContext();
  try {
    await updateOrganization(db, orgId, {
      name: data.name,
      description: data.description || null,
      website: data.website || null,
    });
    revalidatePath("/settings/organization");
    return { success: true };
  } catch {
    return { error: "保存に失敗しました" };
  }
}

// =============================================
// メンバー招待
// =============================================

export async function inviteMember(
  orgId: string,
  email: string,
  role: string
) {
  const auth = getAuth();
  const session = await auth.api.getSession({ headers: await headers() });
  const user = session?.user;
  if (!user) return { error: "ログインが必要です" };

  const db = getDbFromContext();

  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 7);

  try {
    await createInvitation(db, {
      organizationId: orgId,
      email: email.trim().toLowerCase(),
      role,
      invitedBy: user.id,
      expiresAt: expiresAt.toISOString(),
    });
    revalidatePath("/settings/members");
    return { success: true };
  } catch (err: any) {
    if (err?.message?.includes("UNIQUE constraint")) {
      return { error: "このメールアドレスにはすでに招待を送信しています" };
    }
    return { error: "招待の送信に失敗しました" };
  }
}
