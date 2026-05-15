import { getAuth } from "@/lib/auth";
import { getDbFromContext } from "@/lib/db";
import { getInvitationByToken, acceptInvitation } from "@/lib/db/queries/invitations";
import { addOrganizationMember } from "@/lib/db/queries/organizations";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { ROLE_LABELS } from "@/lib/utils";
import AcceptInvitationButton from "./AcceptInvitationButton";

type Props = {
  params: Promise<{ token: string }>;
};

export default async function InvitePage({ params }: Props) {
  const { token } = await params;

  const auth = getAuth();
  const session = await auth.api.getSession({ headers: await headers() });

  // 未ログインならログインページへリダイレクト
  if (!session?.user) {
    redirect(`/auth/login?next=/invite/${token}`);
  }

  const db = getDbFromContext();
  const invitation = await getInvitationByToken(db, token);

  // トークンが存在しない
  if (!invitation) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="max-w-md w-full bg-white rounded-2xl border border-gray-100 p-8 text-center space-y-4">
          <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto">
            <svg className="w-6 h-6 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>
          <h1 className="text-xl font-bold text-gray-900">無効な招待リンク</h1>
          <p className="text-sm text-gray-500">
            この招待リンクは存在しないか、すでに無効になっています。
          </p>
          <a
            href="/dashboard"
            className="inline-block mt-4 px-6 py-2.5 bg-indigo-600 text-white text-sm font-medium rounded-xl hover:bg-indigo-700 transition-colors"
          >
            ダッシュボードへ
          </a>
        </div>
      </div>
    );
  }

  // 既に使用済み
  if (invitation.acceptedAt) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="max-w-md w-full bg-white rounded-2xl border border-gray-100 p-8 text-center space-y-4">
          <div className="w-12 h-12 bg-amber-100 rounded-full flex items-center justify-center mx-auto">
            <svg className="w-6 h-6 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h1 className="text-xl font-bold text-gray-900">招待は使用済みです</h1>
          <p className="text-sm text-gray-500">
            この招待リンクはすでに使用されています。
          </p>
          <a
            href="/dashboard"
            className="inline-block mt-4 px-6 py-2.5 bg-indigo-600 text-white text-sm font-medium rounded-xl hover:bg-indigo-700 transition-colors"
          >
            ダッシュボードへ
          </a>
        </div>
      </div>
    );
  }

  // 有効期限切れ
  const now = new Date().toISOString();
  if (invitation.expiresAt < now) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="max-w-md w-full bg-white rounded-2xl border border-gray-100 p-8 text-center space-y-4">
          <div className="w-12 h-12 bg-amber-100 rounded-full flex items-center justify-center mx-auto">
            <svg className="w-6 h-6 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h1 className="text-xl font-bold text-gray-900">招待の有効期限切れ</h1>
          <p className="text-sm text-gray-500">
            この招待リンクは有効期限が切れています。組織の管理者に再度招待を依頼してください。
          </p>
          <a
            href="/dashboard"
            className="inline-block mt-4 px-6 py-2.5 bg-indigo-600 text-white text-sm font-medium rounded-xl hover:bg-indigo-700 transition-colors"
          >
            ダッシュボードへ
          </a>
        </div>
      </div>
    );
  }

  const orgName = invitation.organization?.name || "組織";
  const roleName = ROLE_LABELS[invitation.role] || invitation.role;

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full bg-white rounded-2xl border border-gray-100 p-8 space-y-6">
        <div className="text-center space-y-2">
          <div className="w-12 h-12 bg-indigo-100 rounded-full flex items-center justify-center mx-auto">
            <svg className="w-6 h-6 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
            </svg>
          </div>
          <h1 className="text-xl font-bold text-gray-900">組織への招待</h1>
          <p className="text-sm text-gray-500">
            以下の組織に招待されています
          </p>
        </div>

        <div className="bg-gray-50 rounded-xl p-5 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-500">組織名</span>
            <span className="text-sm font-semibold text-gray-900">{orgName}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-500">ロール</span>
            <span className="text-sm font-semibold text-gray-900">{roleName}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-500">招待先メール</span>
            <span className="text-sm font-semibold text-gray-900">{invitation.email}</span>
          </div>
        </div>

        <AcceptInvitationButton
          invitationId={invitation.id}
          token={token}
        />
      </div>
    </div>
  );
}
