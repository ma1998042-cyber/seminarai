"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Building2, Loader2, ArrowRight } from "lucide-react";
import { createOrganizationFromDashboard } from "./actions";

const orgTypes = [
  { value: "seminar", label: "セミナー講師" },
  { value: "webinar", label: "ウェビナー開催者" },
  { value: "consultant", label: "コンサルタント" },
  { value: "school", label: "スクール運営者" },
  { value: "community", label: "コミュニティ運営者" },
  { value: "other", label: "その他" },
];

export default function CreateOrgCard() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [orgName, setOrgName] = useState("");
  const [orgType, setOrgType] = useState("seminar");

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

  return (
    <div className="max-w-lg mx-auto">
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8">
        <div className="text-center mb-6">
          <div className="w-14 h-14 bg-indigo-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Building2 className="w-7 h-7 text-indigo-600" />
          </div>
          <h2 className="text-xl font-bold text-gray-900">組織を設定する</h2>
          <p className="text-sm text-gray-500 mt-1">SeminarFlowを使い始めるために、あなたのビジネス情報を入力してください</p>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600">{error}</div>
        )}

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
      </div>
    </div>
  );
}
