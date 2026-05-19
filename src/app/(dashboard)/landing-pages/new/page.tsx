"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Loader2, FileText } from "lucide-react";
import { createLandingPageAction } from "../actions";

function toSlug(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\u3040-\u309f\u30a0-\u30ff\u4e00-\u9faf]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export default function NewLandingPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [slugManual, setSlugManual] = useState(false);
  const [form, setForm] = useState({
    title: "",
    slug: "",
    description: "",
    ctaText: "申し込む",
  });

  const handleTitleChange = (title: string) => {
    setForm((prev) => ({
      ...prev,
      title,
      slug: slugManual ? prev.slug : toSlug(title),
    }));
  };

  const handleSlugChange = (slug: string) => {
    setSlugManual(true);
    setForm((prev) => ({ ...prev, slug }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim() || !form.slug.trim()) return;
    setLoading(true);
    setError("");

    const result = await createLandingPageAction({
      title: form.title,
      slug: form.slug,
      description: form.description || undefined,
      ctaText: form.ctaText || undefined,
    });

    if (result.error) {
      setError(result.error);
      setLoading(false);
      return;
    }

    if (result.id) {
      router.push(`/landing-pages/${result.id}`);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/landing-pages" className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
          <ArrowLeft className="w-5 h-5 text-gray-500" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">LPを作成</h1>
          <p className="text-sm text-gray-500">新しいランディングページの情報を入力してください</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="bg-white rounded-2xl border border-gray-100 p-6 space-y-6">
        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600">
            {error}
          </div>
        )}

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">
            タイトル <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={form.title}
            onChange={(e) => handleTitleChange(e.target.value)}
            required
            className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
            placeholder="例：新規会員登録キャンペーン"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">
            スラッグ <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={form.slug}
            onChange={(e) => handleSlugChange(e.target.value)}
            required
            className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
            placeholder="例：campaign-2024"
          />
          <p className="mt-1 text-xs text-gray-400">URLの一部になります（タイトルから自動生成）</p>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">説明</label>
          <textarea
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            rows={3}
            className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all resize-none"
            placeholder="LPの概要を入力してください"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">CTA文言</label>
          <input
            type="text"
            value={form.ctaText}
            onChange={(e) => setForm({ ...form, ctaText: e.target.value })}
            className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
            placeholder="申し込む"
          />
        </div>

        <div className="flex gap-3 pt-2">
          <Link
            href="/landing-pages"
            className="flex-1 py-3 rounded-lg border border-gray-200 text-gray-600 text-sm font-medium text-center hover:bg-gray-50 transition-colors"
          >
            キャンセル
          </Link>
          <button
            type="submit"
            disabled={loading || !form.title.trim() || !form.slug.trim()}
            className="flex-1 bg-indigo-600 text-white py-3 rounded-lg font-semibold hover:bg-indigo-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {loading && <Loader2 className="w-4 h-4 animate-spin" />}
            <FileText className="w-4 h-4" />
            作成する
          </button>
        </div>
      </form>
    </div>
  );
}
