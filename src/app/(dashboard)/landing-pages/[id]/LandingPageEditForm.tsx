"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Loader2, Save, Trash2, Eye, EyeOff, Users } from "lucide-react";
import {
  updateLandingPageAction,
  deleteLandingPageAction,
  togglePublishAction,
} from "../actions";

type FormField = {
  name: string;
  label: string;
  type: string;
  required: boolean;
  options?: string[];
};

type LandingPageData = {
  id: string;
  title: string;
  slug: string;
  description: string | null;
  bodyHtml: string | null;
  heroImageUrl: string | null;
  formFields: FormField[];
  ctaText: string;
  thankYouMessage: string | null;
  isPublished: boolean;
  metaTitle: string | null;
  metaDescription: string | null;
  ogImageUrl: string | null;
};

export default function LandingPageEditForm({
  lp,
  submissionCount,
}: {
  lp: LandingPageData;
  submissionCount: number;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const [form, setForm] = useState({
    title: lp.title,
    slug: lp.slug,
    description: lp.description ?? "",
    bodyHtml: lp.bodyHtml ?? "",
    heroImageUrl: lp.heroImageUrl ?? "",
    formFields: JSON.stringify(lp.formFields, null, 2),
    ctaText: lp.ctaText,
    thankYouMessage: lp.thankYouMessage ?? "",
    metaTitle: lp.metaTitle ?? "",
    metaDescription: lp.metaDescription ?? "",
    ogImageUrl: lp.ogImageUrl ?? "",
  });

  const [isPublished, setIsPublished] = useState(lp.isPublished);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setSuccess("");

    const result = await updateLandingPageAction(lp.id, {
      title: form.title,
      slug: form.slug,
      description: form.description,
      bodyHtml: form.bodyHtml,
      heroImageUrl: form.heroImageUrl,
      formFields: form.formFields,
      ctaText: form.ctaText,
      thankYouMessage: form.thankYouMessage,
      metaTitle: form.metaTitle,
      metaDescription: form.metaDescription,
      ogImageUrl: form.ogImageUrl,
    });

    setLoading(false);

    if (result.error) {
      setError(result.error);
    } else {
      setSuccess("保存しました");
      setTimeout(() => setSuccess(""), 3000);
    }
  };

  const handleTogglePublish = async () => {
    setPublishing(true);
    setError("");
    setSuccess("");

    const result = await togglePublishAction(lp.id, !isPublished);
    setPublishing(false);

    if (result.error) {
      setError(result.error);
    } else {
      setIsPublished(!isPublished);
      setSuccess(isPublished ? "非公開にしました" : "公開しました");
      setTimeout(() => setSuccess(""), 3000);
    }
  };

  const handleDelete = async () => {
    setDeleting(true);
    setError("");

    const result = await deleteLandingPageAction(lp.id);

    if (result.error) {
      setError(result.error);
      setDeleting(false);
    } else {
      router.push("/landing-pages");
    }
  };

  const inputClass =
    "w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all";

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/landing-pages" className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
            <ArrowLeft className="w-5 h-5 text-gray-500" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">LP編集</h1>
            <p className="text-sm text-gray-500">{lp.title}</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span
            className={`px-3 py-1 rounded-full text-xs font-medium ${
              isPublished ? "bg-green-50 text-green-700" : "bg-gray-100 text-gray-500"
            }`}
          >
            {isPublished ? "公開中" : "非公開"}
          </span>
          <div className="flex items-center gap-1.5 text-sm text-gray-500">
            <Users className="w-4 h-4" />
            <span>申込数: {submissionCount}</span>
          </div>
        </div>
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600">
            {error}
          </div>
        )}
        {success && (
          <div className="p-3 bg-green-50 border border-green-200 rounded-lg text-sm text-green-600">
            {success}
          </div>
        )}

        {/* 基本情報 */}
        <div className="bg-white rounded-2xl border border-gray-100 p-6 space-y-5">
          <h2 className="text-lg font-semibold text-gray-900">基本情報</h2>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              タイトル <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              required
              className={inputClass}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              スラッグ <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={form.slug}
              onChange={(e) => setForm({ ...form, slug: e.target.value })}
              required
              className={inputClass}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">説明</label>
            <textarea
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              rows={3}
              className={`${inputClass} resize-none`}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">CTA文言</label>
            <input
              type="text"
              value={form.ctaText}
              onChange={(e) => setForm({ ...form, ctaText: e.target.value })}
              className={inputClass}
              placeholder="申し込む"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              サンクスメッセージ
            </label>
            <textarea
              value={form.thankYouMessage}
              onChange={(e) => setForm({ ...form, thankYouMessage: e.target.value })}
              rows={2}
              className={`${inputClass} resize-none`}
              placeholder="お申し込みありがとうございます"
            />
          </div>
        </div>

        {/* コンテンツ */}
        <div className="bg-white rounded-2xl border border-gray-100 p-6 space-y-5">
          <h2 className="text-lg font-semibold text-gray-900">コンテンツ</h2>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              ヒーロー画像URL
            </label>
            <input
              type="text"
              value={form.heroImageUrl}
              onChange={(e) => setForm({ ...form, heroImageUrl: e.target.value })}
              className={inputClass}
              placeholder="https://..."
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              本文HTML
            </label>
            <textarea
              value={form.bodyHtml}
              onChange={(e) => setForm({ ...form, bodyHtml: e.target.value })}
              rows={10}
              className={`${inputClass} font-mono text-sm resize-y`}
              placeholder="<div>...</div>"
            />
          </div>
        </div>

        {/* フォームフィールド */}
        <div className="bg-white rounded-2xl border border-gray-100 p-6 space-y-5">
          <h2 className="text-lg font-semibold text-gray-900">フォームフィールド設定</h2>
          <p className="text-xs text-gray-400">
            JSON形式で入力フィールドを定義します。例: {`[{"name":"email","label":"メール","type":"email","required":true}]`}
          </p>
          <textarea
            value={form.formFields}
            onChange={(e) => setForm({ ...form, formFields: e.target.value })}
            rows={8}
            className={`${inputClass} font-mono text-sm resize-y`}
          />
        </div>

        {/* SEO設定 */}
        <div className="bg-white rounded-2xl border border-gray-100 p-6 space-y-5">
          <h2 className="text-lg font-semibold text-gray-900">SEO設定</h2>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              メタタイトル
            </label>
            <input
              type="text"
              value={form.metaTitle}
              onChange={(e) => setForm({ ...form, metaTitle: e.target.value })}
              className={inputClass}
              placeholder="ページタイトル（未設定の場合はLPタイトルが使用されます）"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              メタディスクリプション
            </label>
            <textarea
              value={form.metaDescription}
              onChange={(e) => setForm({ ...form, metaDescription: e.target.value })}
              rows={2}
              className={`${inputClass} resize-none`}
              placeholder="ページの説明文"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              OG画像URL
            </label>
            <input
              type="text"
              value={form.ogImageUrl}
              onChange={(e) => setForm({ ...form, ogImageUrl: e.target.value })}
              className={inputClass}
              placeholder="https://..."
            />
          </div>
        </div>

        {/* アクションボタン */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handleTogglePublish}
              disabled={publishing}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold transition-colors ${
                isPublished
                  ? "border border-gray-200 text-gray-700 hover:bg-gray-50"
                  : "bg-green-600 text-white hover:bg-green-700"
              }`}
            >
              {publishing ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : isPublished ? (
                <EyeOff className="w-4 h-4" />
              ) : (
                <Eye className="w-4 h-4" />
              )}
              {isPublished ? "非公開にする" : "公開する"}
            </button>

            <button
              type="button"
              onClick={() => setShowDeleteConfirm(true)}
              className="flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold border border-red-200 text-red-600 hover:bg-red-50 transition-colors"
            >
              <Trash2 className="w-4 h-4" />
              削除
            </button>
          </div>

          <button
            type="submit"
            disabled={loading || !form.title.trim() || !form.slug.trim()}
            className="flex items-center gap-2 bg-indigo-600 text-white px-6 py-2.5 rounded-lg text-sm font-semibold hover:bg-indigo-700 transition-colors disabled:opacity-50"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            保存する
          </button>
        </div>
      </form>

      {/* 削除確認モーダル */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full mx-4 space-y-4">
            <h3 className="text-lg font-semibold text-gray-900">LPを削除しますか？</h3>
            <p className="text-sm text-gray-500">
              この操作は取り消せません。関連する申し込みデータも削除されます。
            </p>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setShowDeleteConfirm(false)}
                className="flex-1 py-2.5 rounded-lg border border-gray-200 text-gray-600 text-sm font-medium hover:bg-gray-50 transition-colors"
              >
                キャンセル
              </button>
              <button
                type="button"
                onClick={handleDelete}
                disabled={deleting}
                className="flex-1 bg-red-600 text-white py-2.5 rounded-lg text-sm font-semibold hover:bg-red-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {deleting && <Loader2 className="w-4 h-4 animate-spin" />}
                削除する
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
