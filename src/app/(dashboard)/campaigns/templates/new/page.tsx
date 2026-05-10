"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Loader2, Save } from "lucide-react";
import { saveTemplate } from "../actions";

export default function NewTemplatePage() {
  return <TemplateForm />;
}

export function TemplateForm({ initial }: { initial?: { id: string; name: string; subject: string; preview_text?: string; body_html: string } }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    name: initial?.name ?? "",
    subject: initial?.subject ?? "",
    preview_text: initial?.preview_text ?? "",
    body_html: initial?.body_html ?? "",
  });

  const handleSave = async () => {
    if (!form.name || !form.subject || !form.body_html) {
      setError("テンプレート名・件名・本文は必須です");
      return;
    }
    setLoading(true);
    setError("");
    const result = await saveTemplate({ id: initial?.id, ...form });
    setLoading(false);
    if (result.error) { setError(result.error); return; }
    router.push("/campaigns/templates");
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/campaigns/templates" className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
          <ArrowLeft className="w-5 h-5 text-gray-500" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{initial ? "テンプレートを編集" : "テンプレートを作成"}</h1>
          <p className="text-sm text-gray-500">繰り返し使うメール文面を保存しておけます</p>
        </div>
      </div>

      {error && <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600">{error}</div>}

      <div className="space-y-4">
        <div className="bg-white rounded-2xl border border-gray-100 p-6 space-y-4">
          <h2 className="font-semibold text-gray-900">基本情報</h2>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">テンプレート名 <span className="text-red-500">*</span></label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
              placeholder="例：セミナー後フォローアップ"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">メール件名 <span className="text-red-500">*</span></label>
            <input
              type="text"
              value={form.subject}
              onChange={(e) => setForm({ ...form, subject: e.target.value })}
              className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
              placeholder="例：先日のセミナーへのご参加ありがとうございました"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">プレビューテキスト</label>
            <input
              type="text"
              value={form.preview_text}
              onChange={(e) => setForm({ ...form, preview_text: e.target.value })}
              className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
              placeholder="メール一覧に表示される短いテキスト"
            />
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-gray-900">メール本文</h2>
            <span className="text-xs text-gray-400">HTML対応</span>
          </div>
          <textarea
            value={form.body_html}
            onChange={(e) => setForm({ ...form, body_html: e.target.value })}
            rows={16}
            className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono text-sm resize-none"
            placeholder={"<p>{{name}}様</p>\n<p>先日はセミナーにご参加いただきありがとうございました。</p>"}
          />
          <p className="text-xs text-gray-400">{"{{name}} で顧客名を差し込み可能です"}</p>
        </div>
      </div>

      <div className="flex gap-3">
        <Link href="/campaigns/templates" className="flex-1 py-3 rounded-lg border border-gray-200 text-gray-600 text-sm font-medium text-center hover:bg-gray-50 transition-colors">
          キャンセル
        </Link>
        <button
          onClick={handleSave}
          disabled={loading}
          className="flex-1 bg-indigo-600 text-white py-3 rounded-lg font-semibold hover:bg-indigo-700 disabled:opacity-50 flex items-center justify-center gap-2 transition-colors"
        >
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          保存する
        </button>
      </div>
    </div>
  );
}
