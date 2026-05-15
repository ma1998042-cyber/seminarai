"use server";

import { getAuth } from "@/lib/auth";
import { getDbFromContext } from "@/lib/db";
import { getUserProfile, updateUserProfile } from "@/lib/db/queries/users";
import { getOrganizationById, updateOrganization } from "@/lib/db/queries/organizations";
import { createInvitation, deleteInvitation } from "@/lib/db/queries/invitations";
import { getOrganizationMembers } from "@/lib/db/queries/organizations";
import { getOrganizationById as getOrgById2 } from "@/lib/db/queries/organizations";
import { sendEmail } from "@/lib/email";
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
    const invitation = await createInvitation(db, {
      organizationId: orgId,
      email: email.trim().toLowerCase(),
      role,
      invitedBy: user.id,
      expiresAt: expiresAt.toISOString(),
    });

    // 招待メールを送信
    const org = await getOrgById2(db, orgId);
    const hdrs = await headers();
    const host = hdrs.get("host") || "localhost:3000";
    const protocol = host.startsWith("localhost") ? "http" : "https";
    const inviteUrl = `${protocol}://${host}/invite/${invitation.token}`;

    try {
      await sendEmail(
        email.trim().toLowerCase(),
        `${org?.name || "組織"}への招待`,
        `
        <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto; padding: 24px;">
          <h2 style="color: #1a1a1a;">${org?.name || "組織"}に招待されました</h2>
          <p style="color: #555;">以下のリンクをクリックして組織に参加してください。</p>
          <a href="${inviteUrl}" style="display: inline-block; background: #4f46e5; color: #fff; padding: 12px 24px; border-radius: 8px; text-decoration: none; margin: 16px 0;">組織に参加する</a>
          <p style="color: #999; font-size: 14px;">このリンクは7日間有効です。</p>
        </div>
        `
      );
    } catch (emailErr) {
      console.error("招待メール送信に失敗:", emailErr);
      // メール送信失敗でも招待レコードは維持
    }

    revalidatePath("/settings/members");
    return { success: true };
  } catch (err: any) {
    if (err?.message?.includes("UNIQUE constraint")) {
      return { error: "このメールアドレスにはすでに招待を送信しています" };
    }
    return { error: "招待の送信に失敗しました" };
  }
}

// =============================================
// 招待取り消し
// =============================================

export async function cancelInvitation(invitationId: string) {
  const auth = getAuth();
  const session = await auth.api.getSession({ headers: await headers() });
  const user = session?.user;
  if (!user) return { error: "ログインが必要です" };

  const db = getDbFromContext();

  const profile = await getUserProfile(db, user.id);
  if (!profile?.currentOrganizationId) return { error: "組織が見つかりません" };

  // owner/admin のみ取り消し可能
  const members = await getOrganizationMembers(db, profile.currentOrganizationId);
  const currentMember = members.find((m) => m.userId === user.id);
  if (!currentMember || !["owner", "admin"].includes(currentMember.role)) {
    return { error: "権限がありません" };
  }

  try {
    await deleteInvitation(db, invitationId);
    revalidatePath("/settings/members");
    return { success: true };
  } catch {
    return { error: "招待の取り消しに失敗しました" };
  }
}
