"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Building2, Loader2, ArrowRight, Users } from "lucide-react";
import { createOrganizationFromDashboard, acceptInvitationFromDashboard } from "./actions";

type PendingInvitation = {
  token: string;
  role: string;
  organizationName: string;
};

const orgTypes = [
  { value: "seminar", label: "セミナー講師" },
  { value: "webinar", label: "ウェビナー開催者" },
  { value: "consultant", label: "コンサルタント" },
  { value: "school", label: "スクール運営者" },
  { value: "community", label: "コミュニティ運営者" },
  { value: "other", label: "その他" },
];

const roleLabels: Record<string, string> = {
  owner: "オーナー",
  admin: "管理者",
  editor: "編集者",
  viewer: "閲覧者",
};

export default function CreateOrgCard({ pendingInvitations = [] }: { pendingInvitations?: PendingInvitation[] }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [orgName, setOrgName] = useState("");
  const [orgType, setOrgType] = useState("seminar");
  const [showCreateForm, setShowCreateForm] = useState(pendingInvitations.length === 0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!orgName.trim()) return;
    setLoading(true);
    setError("");

    const result = await createOrganizationFromDashboard(orgName, orgType);
    setLoading(false);

    if (result.error) {
      setError(result.error);
      return;
    }

    router.refresh();
  };

  const handleAcceptInvitation = async (token: string) => {
    setLoading(true);
    setError("");

    const result = await acceptInvitationFromDashboard(token);
    setLoading(false);

    if (result.error) {
      setError(result.error);
      return;
    }

    router.refresh();
  };

  return (
    <div className="max-w-lg mx-auto">
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8">
        <div className="text-center mb-6">
          <div className="w-14 h-14 bg-indigo-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Building2 className="w-7 h-7 text-indigo-600" />
          </div>
          <h2 className="text-xl font-bold text-gray-900">
            {pendingInvitations.length > 0 ? "組織を選択する" : "組織を設定する"}
          </h2>
          <p className="text-sm text-gray-500 mt-1">
            {pendingInvitations.length > 0
              ? "招待されている組織に参加するか、新しい組織を作成してください"
              : "SeminarFlowを使い始めるために、あなたのビジネス情報を入力してください"}
          </p>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600">{error}</div>
        )}

        {/* Pending invitations */}
        {pendingInvitations.length > 0 && (
          <div className="space-y-3 mb-6">
            <p className="text-sm font-medium text-gray-700">招待されている組織</p>
            {pendingInvitations.map((inv) => (
              <div
                key={inv.token}
                className="flex items-center justify-between p-4 rounded-xl border border-gray-200 hover:border-indigo-300 hover:bg-indigo-50/50 transition-all"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-indigo-100 rounded-lg flex items-center justify-center">
                    <Users className="w-5 h-5 text-indigo-600" />
                  </div>
                  <div>
                    <div className="font-semibold text-gray-900">{inv.organizationName}</div>
                    <div className="text-xs text-gray-500">
                      {roleLabels[inv.role] ?? inv.role}として招待されています
                    </div>
                  </div>
                </div>
                <button
                  type="button"
                  disabled={loading}
                  onClick={() => handleAcceptInvitation(inv.token)}
                  className="px-4 py-2 bg-indigo-600 text-white text-sm font-semibold rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50 flex items-center gap-1.5"
                >
                  {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ArrowRight className="w-3.5 h-3.5" />}
                  参加する
                </button>
              </div>
            ))}

            <div className="relative my-4">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-200" />
              </div>
              <div className="relative flex justify-center">
                <span className="bg-white px-3 text-sm text-gray-400">または</span>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setShowCreateForm(!showCreateForm)}
              className={`w-full p-4 rounded-xl border-2 text-left transition-all ${
                showCreateForm
                  ? "border-indigo-500 bg-indigo-50"
                  : "border-gray-200 hover:border-gray-300"
              }`}
            >
              <div className="flex items-center gap-3">
                <Building2 className={`w-5 h-5 ${showCreateForm ? "text-indigo-600" : "text-gray-400"}`} />
                <span className={`text-sm font-semibold ${showCreateForm ? "text-indigo-700" : "text-gray-700"}`}>
                  新しい組織を作成する
                </span>
              </div>
            </button>
          </div>
        )}

        {/* Create org form */}
        {showCreateForm && (
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                組織名・ビジネス名 <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={orgName}
                onChange={(e) => setOrgName(e.target.value)}
                required
                className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                placeholder="例：山田太郎コンサルティング"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">ビジネスタイプ</label>
              <div className="grid grid-cols-2 gap-2">
                {orgTypes.map((type) => (
                  <button
                    key={type.value}
                    type="button"
                    onClick={() => setOrgType(type.value)}
                    className={`p-3 rounded-lg border text-sm font-medium transition-all text-left ${
                      orgType === type.value
                        ? "border-indigo-500 bg-indigo-50 text-indigo-700"
                        : "border-gray-200 text-gray-600 hover:border-gray-300"
                    }`}
                  >
                    {type.label}
                  </button>
                ))}
              </div>
            </div>

            <button
              type="submit"
              disabled={loading || !orgName.trim()}
              className="w-full bg-indigo-600 text-white py-3 rounded-lg font-semibold hover:bg-indigo-700 disabled:opacity-50 flex items-center justify-center gap-2 transition-colors"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowRight className="w-4 h-4" />}
              使い始める
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
