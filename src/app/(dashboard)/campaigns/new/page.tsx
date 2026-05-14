"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Loader2, Mail, Users, Tag } from "lucide-react";
import { cn } from "@/lib/utils";
import { getTagsForOrg, createCampaignAction } from "./actions";

export default function NewCampaignPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [tags, setTags] = useState<any[]>([]);

  const [form, setForm] = useState({
    title: "",
    subject: "",
    preview_text: "",
    body_html: "",
    target_type: "all",
    target_tag_ids: [] as string[],
    scheduled_at: "",
  });

  useEffect(() => {
    const fetchTags = async () => {
      const data = await getTagsForOrg();
      setTags(data);
    };
    fetchTags();
  }, []);

  const toggleTagSelection = (tagId: string) => {
    setForm((prev) => ({
      ...prev,
      target_tag_ids: prev.target_tag_ids.includes(tagId)
        ? prev.target_tag_ids.filter((id) => id !== tagId)
        : [...prev.target_tag_ids, tagId],
    }));
  };

  const handleSubmit = async (status: "draft" | "scheduled") => {
    if (!form.title || !form.subject || !form.body_html) {
      setError("タイトル・件名・本文は必須です");
      return;
    }
    setLoading(true);
    setError("");

    const result = await createCampaignAction({ ...form, status });

    if (result.error) {
      setError(result.error);
      setLoading(false);
      return;
    }

    if (result.campaignId) {
      router.push(`/campaigns/${result.campaignId}`);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/campaigns" className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
          <ArrowLeft className="w-5 h-5 text-gray-500" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">メルマガを作成</h1>
          <p className="text-sm text-gray-500">配信するメールの内容を作成してください</p>
        </div>
      </div>

      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600">
          {error}
        </div>
      )}

      <div className="space-y-4">
        {/* Basic info */}
        <div className="bg-white rounded-2xl border border-gray-100 p-6 space-y-4">
          <h2 className="font-semibold text-gray-900">基本情報</h2>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              キャンペーン名（内部管理用）<span className="text-red-500"> *</span>
            </label>
            <input
              type="text"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
              placeholder="例：2024年10月セミナーフォローアップ"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              メール件名 <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={form.subject}
              onChange={(e) => setForm({ ...form, subject: e.target.value })}
              className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
              placeholder="例：先日のセミナーについて、追加情報をお届けします"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              プレビューテキスト
            </label>
            <input
              type="text"
              value={form.preview_text}
              onChange={(e) => setForm({ ...form, preview_text: e.target.value })}
              className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
              placeholder="メール一覧に表示される短いテキスト"
            />
          </div>
        </div>

        {/* Email body */}
        <div className="bg-white rounded-2xl border border-gray-100 p-6 space-y-4">
          <h2 className="font-semibold text-gray-900">メール本文</h2>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              本文（HTML） <span className="text-red-500">*</span>
            </label>
            <textarea
              value={form.body_html}
              onChange={(e) => setForm({ ...form, body_html: e.target.value })}
              rows={12}
              className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all font-mono text-sm resize-none"
              placeholder={`<h1>こんにちは！</h1>\n<p>先日はセミナーにご参加いただきありがとうございました。</p>\n<p>...</p>`}
            />
            <p className="text-xs text-gray-400 mt-1">HTMLまたはテキストで本文を入力してください</p>
          </div>
        </div>

        {/* Target audience */}
        <div className="bg-white rounded-2xl border border-gray-100 p-6 space-y-4">
          <h2 className="font-semibold text-gray-900">配信対象</h2>
          <div className="grid grid-cols-3 gap-3">
            {[
              { value: "all", label: "全顧客", icon: <Users className="w-4 h-4" />, desc: "全員に配信" },
              { value: "tag", label: "タグ指定", icon: <Tag className="w-4 h-4" />, desc: "タグで絞り込み" },
            ].map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => setForm({ ...form, target_type: option.value })}
                className={cn(
                  "flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all text-sm font-medium",
                  form.target_type === option.value
                    ? "border-indigo-500 bg-indigo-50 text-indigo-700"
                    : "border-gray-200 text-gray-600 hover:border-gray-300"
                )}
              >
                {option.icon}
                <span>{option.label}</span>
                <span className="text-xs text-gray-400 font-normal">{option.desc}</span>
              </button>
            ))}
          </div>

          {form.target_type === "tag" && tags.length > 0 && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">配信するタグを選択</label>
              <div className="flex flex-wrap gap-2">
                {tags.map((tag) => (
                  <button
                    key={tag.id}
                    type="button"
                    onClick={() => toggleTagSelection(tag.id)}
                    className={cn(
                      "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-all",
                      form.target_tag_ids.includes(tag.id)
                        ? "border-transparent text-white"
                        : "border-gray-200 text-gray-600"
                    )}
                    style={
                      form.target_tag_ids.includes(tag.id)
                        ? { backgroundColor: tag.color }
                        : {}
                    }
                  >
                    <span
                      className="w-2 h-2 rounded-full"
                      style={{ backgroundColor: form.target_tag_ids.includes(tag.id) ? "white" : tag.color }}
                    />
                    {tag.name}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Schedule */}
        <div className="bg-white rounded-2xl border border-gray-100 p-6 space-y-4">
          <h2 className="font-semibold text-gray-900">配信タイミング</h2>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              予約配信日時（空白の場合は今すぐ配信）
            </label>
            <input
              type="datetime-local"
              value={form.scheduled_at}
              onChange={(e) => setForm({ ...form, scheduled_at: e.target.value })}
              className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
            />
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-3">
        <Link
          href="/campaigns"
          className="flex-1 py-3 rounded-lg border border-gray-200 text-gray-600 text-sm font-medium text-center hover:bg-gray-50 transition-colors"
        >
          キャンセル
        </Link>
        <button
          onClick={() => handleSubmit("draft")}
          disabled={loading}
          className="flex-1 py-3 rounded-lg border border-indigo-200 text-indigo-600 text-sm font-semibold hover:bg-indigo-50 transition-colors disabled:opacity-50"
        >
          下書き保存
        </button>
        <button
          onClick={() => handleSubmit("scheduled")}
          disabled={loading}
          className="flex-1 bg-indigo-600 text-white py-3 rounded-lg font-semibold hover:bg-indigo-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
        >
          {loading && <Loader2 className="w-4 h-4 animate-spin" />}
          <Mail className="w-4 h-4" />
          {form.scheduled_at ? "予約する" : "今すぐ配信"}
        </button>
      </div>
    </div>
  );
}
