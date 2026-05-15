"use server";

import { getAuth } from "@/lib/auth";
import { getDbFromContext } from "@/lib/db";
import { getInvitationByToken, acceptInvitation } from "@/lib/db/queries/invitations";
import { addOrganizationMember } from "@/lib/db/queries/organizations";
import { headers } from "next/headers";

export async function acceptInvitationAction(invitationId: string, token: string) {
  const auth = getAuth();
  const session = await auth.api.getSession({ headers: await headers() });

  if (!session?.user) {
    return { error: "ログインが必要です。" };
  }

  const db = getDbFromContext();
  const invitation = await getInvitationByToken(db, token);

  if (!invitation) {
    return { error: "招待が見つかりません。" };
  }

  if (invitation.id !== invitationId) {
    return { error: "無効な招待です。" };
  }

  if (invitation.acceptedAt) {
    return { error: "この招待はすでに使用されています。" };
  }

  const now = new Date().toISOString();
  if (invitation.expiresAt < now) {
    return { error: "招待の有効期限が切れています。" };
  }

  // 招待を承認してメンバーとして追加
  await acceptInvitation(db, invitation.id);
  await addOrganizationMember(db, {
    organizationId: invitation.organizationId,
    userId: session.user.id,
    role: invitation.role,
    invitedBy: invitation.invitedBy || undefined,
    invitedAt: invitation.createdAt,
    joinedAt: now,
  });

  return { success: true };
}
