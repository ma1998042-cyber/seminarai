"use client";

import { useState } from "react";
import { FileText, Download, Loader2, X, CheckCircle } from "lucide-react";

interface Props {
  resource: {
    id: string;
    title: string;
    description: string;
    imageUrl: string;
    hasFile: boolean;
  };
}

const PROFICIENCY_OPTIONS = [
  { value: "beginner", label: "初心者（まだ使ったことがない）" },
  { value: "novice", label: "初級（少し触ったことがある）" },
  { value: "intermediate", label: "中級（日常的に使っている）" },
  { value: "advanced", label: "上級（高度な活用ができる）" },
];

export default function ResourceDownloadCard({ resource }: Props) {
  const [showModal, setShowModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [proficiencyLevel, setProficiencyLevel] = useState("");
  const [goals, setGoals] = useState("");
  const [jobDescription, setJobDescription] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSubmitting(true);

    try {
      const res = await fetch("/api/resource-download", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          resourceId: resource.id,
          name,
          email,
          proficiencyLevel,
          goals,
          jobDescription,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "エラーが発生しました");
        setSubmitting(false);
        return;
      }

      setSuccess(true);
      setSubmitting(false);

      // ダウンロード開始
      const link = document.createElement("a");
      link.href = data.fileUrl;
      link.download = "";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch {
      setError("通信エラーが発生しました");
      setSubmitting(false);
    }
  }

  function handleClose() {
    setShowModal(false);
    setSuccess(false);
    setError("");
  }

  return (
    <>
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden flex flex-col">
        {resource.imageUrl ? (
          <div className="w-full aspect-video bg-gray-100">
            <img
              src={resource.imageUrl}
              alt={resource.title}
              className="w-full h-full object-cover"
            />
          </div>
        ) : (
          <div className="w-full aspect-video bg-gradient-to-br from-indigo-50 to-blue-50 flex items-center justify-center">
            <FileText className="w-12 h-12 text-indigo-200" />
          </div>
        )}
        <div className="p-5 flex flex-col flex-1">
          <h2 className="text-lg font-bold text-gray-900 mb-2">
            {resource.title}
          </h2>
          {resource.description && (
            <p className="text-sm text-gray-500 line-clamp-3 mb-4">
              {resource.description}
            </p>
          )}
          <div className="mt-auto">
            {resource.hasFile ? (
              <button
                onClick={() => setShowModal(true)}
                className="w-full flex items-center justify-center gap-2 bg-indigo-600 text-white px-4 py-2.5 rounded-lg text-sm font-semibold hover:bg-indigo-700 transition-colors"
              >
                <Download className="w-4 h-4" />
                資料をダウンロード
              </button>
            ) : (
              <span className="block text-center text-sm text-gray-400">
                準備中
              </span>
            )}
          </div>
        </div>
      </div>

      {/* ダウンロードフォームモーダル */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="fixed inset-0 bg-black/50"
            onClick={handleClose}
          />
          <div className="relative bg-white rounded-2xl shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto p-6">
            <button
              onClick={handleClose}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
            >
              <X className="w-5 h-5" />
            </button>

            {success ? (
              <div className="text-center py-8">
                <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
                <h3 className="text-xl font-bold text-gray-900 mb-2">
                  ダウンロードを開始しました
                </h3>
                <p className="text-sm text-gray-500 mb-6">
                  ダウンロードが始まらない場合は、ポップアップブロックを解除してください。
                </p>
                <button
                  onClick={handleClose}
                  className="bg-indigo-600 text-white px-6 py-2.5 rounded-lg text-sm font-semibold hover:bg-indigo-700 transition-colors"
                >
                  閉じる
                </button>
              </div>
            ) : (
              <>
                <h3 className="text-xl font-bold text-gray-900 mb-1">
                  {resource.title}
                </h3>
                <p className="text-sm text-gray-500 mb-6">
                  以下の情報を入力すると資料をダウンロードできます
                </p>

                {error && (
                  <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm mb-4">
                    {error}
                  </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <label htmlFor="dl-name" className="block text-sm font-medium text-gray-700 mb-1">
                      お名前 <span className="text-red-500">*</span>
                    </label>
                    <input
                      id="dl-name"
                      type="text"
                      required
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="山田 太郎"
                      className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    />
                  </div>

                  <div>
                    <label htmlFor="dl-email" className="block text-sm font-medium text-gray-700 mb-1">
                      メールアドレス <span className="text-red-500">*</span>
                    </label>
                    <input
                      id="dl-email"
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="example@example.com"
                      className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    />
                  </div>

                  <div>
                    <label htmlFor="dl-proficiency" className="block text-sm font-medium text-gray-700 mb-1">
                      Claude Codeの習熟度 <span className="text-red-500">*</span>
                    </label>
                    <select
                      id="dl-proficiency"
                      required
                      value={proficiencyLevel}
                      onChange={(e) => setProficiencyLevel(e.target.value)}
                      className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    >
                      <option value="">選択してください</option>
                      {PROFICIENCY_OPTIONS.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label htmlFor="dl-goals" className="block text-sm font-medium text-gray-700 mb-1">
                      Claude Codeでどんなことをやりたいですか？ <span className="text-red-500">*</span>
                    </label>
                    <textarea
                      id="dl-goals"
                      required
                      value={goals}
                      onChange={(e) => setGoals(e.target.value)}
                      rows={3}
                      placeholder="例: Webアプリケーション開発の効率化、コードレビューの自動化など"
                      className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    />
                  </div>

                  <div>
                    <label htmlFor="dl-job" className="block text-sm font-medium text-gray-700 mb-1">
                      現在のお仕事について教えてください <span className="text-red-500">*</span>
                    </label>
                    <textarea
                      id="dl-job"
                      required
                      value={jobDescription}
                      onChange={(e) => setJobDescription(e.target.value)}
                      rows={3}
                      placeholder="例: SaaS企業でバックエンドエンジニアをしています"
                      className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={submitting}
                    className="w-full flex items-center justify-center gap-2 bg-indigo-600 text-white px-4 py-3 rounded-lg text-sm font-semibold hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {submitting ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        送信中...
                      </>
                    ) : (
                      <>
                        <Download className="w-4 h-4" />
                        入力してダウンロード
                      </>
                    )}
                  </button>
                </form>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}
