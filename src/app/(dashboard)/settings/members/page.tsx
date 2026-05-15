import { getAuth } from "@/lib/auth";
import { getDbFromContext } from "@/lib/db";
import { getUserProfile } from "@/lib/db/queries/users";
import { getOrganizationMembers } from "@/lib/db/queries/organizations";
import { getInvitations } from "@/lib/db/queries/invitations";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, UserPlus, Crown, Settings, Edit, Eye, Users } from "lucide-react";
import { formatDate, ROLE_LABELS, getInitials } from "@/lib/utils";
import InviteMemberForm from "./InviteMemberForm";
import CopyInviteLinkButton from "./CopyInviteLinkButton";
import CancelInvitationButton from "./CancelInvitationButton";
import MemberActions from "./MemberActions";

export default async function MembersPage() {
  const auth = getAuth();
  const session = await auth.api.getSession({ headers: await headers() });
  const user = session?.user;
  if (!user) redirect("/auth/login");

  const db = getDbFromContext();

  const profile = await getUserProfile(db, user.id);
  const orgId = profile?.currentOrganizationId;
  if (!orgId) redirect("/onboarding");

  const allMembers = await getOrganizationMembers(db, orgId);
  const members = allMembers.filter((m) => m.isActive);

  // メンバーのユーザープロフィールを取得
  const memberProfiles = await Promise.all(
    members.map(async (m) => {
      const p = await getUserProfile(db, m.userId);
      return { memberId: m.id, fullName: p?.fullName, avatarUrl: p?.avatarUrl };
    })
  );
  const profileMap = new Map(memberProfiles.map((p) => [p.memberId, p]));

  const allInvitations = await getInvitations(db, orgId);
  const now = new Date().toISOString();
  const invitations = allInvitations.filter(
    (inv) => !inv.acceptedAt && inv.expiresAt > now
  );

  const currentUserRole = members.find((m) => m.userId === user.id)?.role || "viewer";
  const canManage = ["owner", "admin"].includes(currentUserRole);

  const roleIcons: Record<string, React.ReactNode> = {
    owner: <Crown className="w-4 h-4 text-amber-500" />,
    admin: <Settings className="w-4 h-4 text-indigo-500" />,
    editor: <Edit className="w-4 h-4 text-blue-500" />,
    viewer: <Eye className="w-4 h-4 text-gray-400" />,
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">メンバー管理</h1>
          <p className="text-sm text-gray-500">チームメンバーを招待・管理します</p>
        </div>
      </div>

      {/* Members list */}
      <div className="bg-white rounded-2xl border border-gray-100">
        <div className="flex items-center justify-between p-5 border-b border-gray-50">
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-gray-400" />
            <h2 className="font-semibold text-gray-900">メンバー（{members?.length || 0}名）</h2>
          </div>
        </div>
        <div className="divide-y divide-gray-50">
          {members?.map((member) => {
            const mp = profileMap.get(member.id);
            const name = mp?.fullName || "ユーザー";
            const isCurrentUser = member.userId === user.id;
            return (
              <div key={member.id} className="flex items-center justify-between p-4">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 bg-indigo-100 rounded-full flex items-center justify-center">
                    <span className="text-sm font-semibold text-indigo-700">{getInitials(name)}</span>
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5">
                      <p className="text-sm font-medium text-gray-900">{name}</p>
                      {isCurrentUser && (
                        <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">あなた</span>
                      )}
                    </div>
                    <p className="text-xs text-gray-400">参加日：{formatDate(member.joinedAt || member.createdAt)}</p>
                  </div>
                </div>
                {canManage && !isCurrentUser ? (
                  <MemberActions
                    memberId={member.id}
                    currentRole={member.role}
                    memberName={name}
                    currentUserRole={currentUserRole}
                  />
                ) : (
                  <div className="flex items-center gap-2">
                    {roleIcons[member.role]}
                    <span className="text-sm text-gray-600">{ROLE_LABELS[member.role] || member.role}</span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Pending invitations */}
      {invitations && invitations.length > 0 && (
        <div className="bg-white rounded-2xl border border-gray-100">
          <div className="p-5 border-b border-gray-50">
            <h2 className="font-semibold text-gray-900">招待中（{invitations.length}件）</h2>
          </div>
          <div className="divide-y divide-gray-50">
            {invitations.map((inv) => (
              <div key={inv.id} className="flex items-center justify-between p-4">
                <div>
                  <p className="text-sm font-medium text-gray-700">{inv.email}</p>
                  <p className="text-xs text-gray-400">
                    {ROLE_LABELS[inv.role]}として招待中・
                    {formatDate(inv.expiresAt)}まで有効
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <CopyInviteLinkButton token={inv.token} />
                  <span className="text-xs bg-amber-100 text-amber-700 px-2 py-1 rounded-full font-medium">保留中</span>
                  {canManage && <CancelInvitationButton invitationId={inv.id} />}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Invite form */}
      {canManage && <InviteMemberForm orgId={orgId} />}

      {/* Role descriptions */}
      <div className="bg-white rounded-2xl border border-gray-100 p-6">
        <h2 className="font-semibold text-gray-900 mb-4">権限の説明</h2>
        <div className="space-y-3">
          {[
            { role: "owner", desc: "すべての操作・設定・課金管理ができます" },
            { role: "admin", desc: "メンバー管理を含むほぼすべての操作ができます" },
            { role: "editor", desc: "イベント・アンケート・顧客・メルマガの作成・編集ができます" },
            { role: "viewer", desc: "データの閲覧のみ可能です" },
          ].map(({ role, desc }) => (
            <div key={role} className="flex items-center gap-3">
              {roleIcons[role]}
              <div>
                <span className="text-sm font-medium text-gray-700">{ROLE_LABELS[role]}</span>
                <span className="text-sm text-gray-400"> — {desc}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
