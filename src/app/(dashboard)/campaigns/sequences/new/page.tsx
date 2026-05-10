"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Loader2, ChevronRight } from "lucide-react";
import { saveSequence } from "../actions";

const triggerTypes = [
  { value: "manual", label: "手動登録", desc: "管理画面から顧客を手動で登録" },
  { value: "event_registration", label: "イベント参加時", desc: "イベントに参加登録された顧客を自動登録" },
  { value: "tag_added", label: "タグ追加時", desc: "特定タグが付与された顧客を自動登録" },
];

export default function NewSequencePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    name: "",
    description: "",
    trigger_type: "manual",
  });

  const handleSave = async () => {
    if (!form.name) { setError("シーケンス名は必須です"); return; }
    setLoading(true);
    setError("");
    const result = await saveSequence(form);
    setLoading(false);
    if (result.error) { setError(result.error); return; }
    router.push(`/campaigns/sequences/${result.id}`);
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/campaigns/sequences" className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
          <ArrowLeft className="w-5 h-5 text-gray-500" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">ステップ配信を作成</h1>
          <p className="text-sm text-gray-500">登録後の日数に応じてメールを自動送信します</p>
        </div>
      </div>

      {error && <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600">{error}</div>}

      <div className="bg-white rounded-2xl border border-gray-100 p-6 space-y-5">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">シーケンス名 <span className="text-red-500">*</span></label>
          <input
            type="text"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
            placeholder="例：セミナー後フォローアップシーケンス"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">説明（任意）</label>
          <textarea
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            rows={2}
            className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
            placeholder="このシーケンスの目的や対象を記入"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">トリガー（登録のきっかけ）</label>
          <div className="space-y-2">
            {triggerTypes.map((t) => (
              <label key={t.value} className={`flex items-start gap-3 p-3.5 rounded-xl border cursor-pointer transition-colors ${form.trigger_type === t.value ? "border-indigo-500 bg-indigo-50" : "border-gray-200 hover:border-gray-300"}`}>
                <input type="radio" name="trigger" value={t.value} checked={form.trigger_type === t.value} onChange={() => setForm({ ...form, trigger_type: t.value })} className="mt-0.5 accent-indigo-600" />
                <div>
                  <p className="text-sm font-medium text-gray-800">{t.label}</p>
                  <p className="text-xs text-gray-400 mt-0.5">{t.desc}</p>
                </div>
              </label>
            ))}
          </div>
        </div>
      </div>

      <div className="flex gap-3">
        <Link href="/campaigns/sequences" className="flex-1 py-3 rounded-lg border border-gray-200 text-gray-600 text-sm font-medium text-center hover:bg-gray-50 transition-colors">
          キャンセル
        </Link>
        <button
          onClick={handleSave}
          disabled={loading}
          className="flex-1 bg-indigo-600 text-white py-3 rounded-lg font-semibold hover:bg-indigo-700 disabled:opacity-50 flex items-center justify-center gap-2 transition-colors"
        >
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ChevronRight className="w-4 h-4" />}
          作成してステップを追加
        </button>
      </div>
    </div>
  );
}
