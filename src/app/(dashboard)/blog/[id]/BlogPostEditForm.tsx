"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Trash2, Eye, EyeOff } from "lucide-react";
import {
  updateBlogPostAction,
  deleteBlogPostAction,
  publishBlogPostAction,
  unpublishBlogPostAction,
} from "../actions";

interface BlogPostEditFormProps {
  post: {
    id: string;
    title: string;
    slug: string;
    bodyHtml: string;
    excerpt: string;
    thumbnailUrl: string;
    status: string;
    publishedAt: string;
    metaTitle: string;
    metaDescription: string;
    ogImageUrl: string;
    categoryIds: string[];
  };
  categories: { id: string; name: string; slug: string }[];
}

export default function BlogPostEditForm({ post, categories }: BlogPostEditFormProps) {
  const router = useRouter();
  const [title, setTitle] = useState(post.title);
  const [slug, setSlug] = useState(post.slug);
  const [bodyHtml, setBodyHtml] = useState(post.bodyHtml);
  const [excerpt, setExcerpt] = useState(post.excerpt);
  const [thumbnailUrl, setThumbnailUrl] = useState(post.thumbnailUrl);
  const [metaTitle, setMetaTitle] = useState(post.metaTitle);
  const [metaDescription, setMetaDescription] = useState(post.metaDescription);
  const [ogImageUrl, setOgImageUrl] = useState(post.ogImageUrl);
  const [selectedCategoryIds, setSelectedCategoryIds] = useState<string[]>(post.categoryIds);
  const [status, setStatus] = useState(post.status);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  function toggleCategory(categoryId: string) {
    setSelectedCategoryIds((prev) =>
      prev.includes(categoryId)
        ? prev.filter((id) => id !== categoryId)
        : [...prev, categoryId]
    );
  }

  async function handleSave() {
    setError("");
    setSaving(true);

    const result = await updateBlogPostAction(post.id, {
      title,
      slug,
      bodyHtml,
      excerpt,
      thumbnailUrl,
      metaTitle,
      metaDescription,
      ogImageUrl,
      categoryIds: selectedCategoryIds,
    });

    setSaving(false);
    if (result.error) {
      setError(result.error);
      return;
    }
    router.refresh();
  }

  async function handlePublish() {
    setSaving(true);
    // Save current changes first
    const saveResult = await updateBlogPostAction(post.id, {
      title,
      slug,
      bodyHtml,
      excerpt,
      thumbnailUrl,
      metaTitle,
      metaDescription,
      ogImageUrl,
      categoryIds: selectedCategoryIds,
    });
    if (saveResult.error) {
      setError(saveResult.error);
      setSaving(false);
      return;
    }

    const result = await publishBlogPostAction(post.id);
    setSaving(false);
    if (result.error) {
      setError(result.error);
      return;
    }
    setStatus("published");
    router.refresh();
  }

  async function handleUnpublish() {
    setSaving(true);
    const result = await unpublishBlogPostAction(post.id);
    setSaving(false);
    if (result.error) {
      setError(result.error);
      return;
    }
    setStatus("draft");
    router.refresh();
  }

  async function handleDelete() {
    if (!confirm("この記事を削除してもよろしいですか？")) return;
    setDeleting(true);
    const result = await deleteBlogPostAction(post.id);
    if (result.error) {
      setError(result.error);
      setDeleting(false);
      return;
    }
    router.push("/blog");
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <Link
            href="/blog"
            className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 mb-4"
          >
            <ArrowLeft className="w-4 h-4" />
            ブログ管理に戻る
          </Link>
          <h1 className="text-2xl font-bold text-gray-900">記事を編集</h1>
        </div>
        <div className="flex items-center gap-2">
          <span
            className={`inline-flex px-2.5 py-1 rounded-full text-xs font-medium ${
              status === "published"
                ? "bg-green-100 text-green-700"
                : "bg-gray-100 text-gray-600"
            }`}
          >
            {status === "published" ? "公開中" : "下書き"}
          </span>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
          {error}
        </div>
      )}

      {/* Main form */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Main content */}
        <div className="lg:col-span-2 space-y-5">
          <div className="bg-white rounded-2xl border border-gray-100 p-6 space-y-5">
            <div>
              <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-1">
                タイトル <span className="text-red-500">*</span>
              </label>
              <input
                id="title"
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              />
            </div>

            <div>
              <label htmlFor="slug" className="block text-sm font-medium text-gray-700 mb-1">
                スラッグ <span className="text-red-500">*</span>
              </label>
              <input
                id="slug"
                type="text"
                value={slug}
                onChange={(e) => setSlug(e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent font-mono"
              />
            </div>

            <div>
              <label htmlFor="bodyHtml" className="block text-sm font-medium text-gray-700 mb-1">
                本文 (HTML)
              </label>
              <textarea
                id="bodyHtml"
                value={bodyHtml}
                onChange={(e) => setBodyHtml(e.target.value)}
                rows={16}
                className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent font-mono"
                placeholder="HTMLで本文を入力してください"
              />
            </div>

            <div>
              <label htmlFor="excerpt" className="block text-sm font-medium text-gray-700 mb-1">
                抜粋
              </label>
              <textarea
                id="excerpt"
                value={excerpt}
                onChange={(e) => setExcerpt(e.target.value)}
                rows={3}
                className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                placeholder="記事の概要を入力（一覧表示等で使用）"
              />
            </div>

            <div>
              <label htmlFor="thumbnailUrl" className="block text-sm font-medium text-gray-700 mb-1">
                サムネイルURL
              </label>
              <input
                id="thumbnailUrl"
                type="url"
                value={thumbnailUrl}
                onChange={(e) => setThumbnailUrl(e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                placeholder="https://..."
              />
            </div>
          </div>

          {/* SEO Settings */}
          <div className="bg-white rounded-2xl border border-gray-100 p-6 space-y-5">
            <h2 className="text-lg font-semibold text-gray-900">SEO設定</h2>

            <div>
              <label htmlFor="metaTitle" className="block text-sm font-medium text-gray-700 mb-1">
                Meta Title
              </label>
              <input
                id="metaTitle"
                type="text"
                value={metaTitle}
                onChange={(e) => setMetaTitle(e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                placeholder="検索結果に表示されるタイトル"
              />
            </div>

            <div>
              <label htmlFor="metaDescription" className="block text-sm font-medium text-gray-700 mb-1">
                Meta Description
              </label>
              <textarea
                id="metaDescription"
                value={metaDescription}
                onChange={(e) => setMetaDescription(e.target.value)}
                rows={2}
                className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                placeholder="検索結果に表示される説明文"
              />
            </div>

            <div>
              <label htmlFor="ogImageUrl" className="block text-sm font-medium text-gray-700 mb-1">
                OG画像URL
              </label>
              <input
                id="ogImageUrl"
                type="url"
                value={ogImageUrl}
                onChange={(e) => setOgImageUrl(e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                placeholder="https://..."
              />
            </div>
          </div>
        </div>

        {/* Right: Sidebar */}
        <div className="space-y-5">
          {/* Actions */}
          <div className="bg-white rounded-2xl border border-gray-100 p-6 space-y-3">
            <h2 className="text-sm font-semibold text-gray-900 mb-3">アクション</h2>

            <button
              onClick={handleSave}
              disabled={saving || !title.trim() || !slug.trim()}
              className="w-full bg-indigo-600 text-white px-4 py-2.5 rounded-lg text-sm font-semibold hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving ? "保存中..." : "下書き保存"}
            </button>

            {status === "draft" ? (
              <button
                onClick={handlePublish}
                disabled={saving}
                className="w-full flex items-center justify-center gap-2 bg-green-600 text-white px-4 py-2.5 rounded-lg text-sm font-semibold hover:bg-green-700 transition-colors disabled:opacity-50"
              >
                <Eye className="w-4 h-4" />
                公開する
              </button>
            ) : (
              <button
                onClick={handleUnpublish}
                disabled={saving}
                className="w-full flex items-center justify-center gap-2 border border-gray-200 text-gray-700 px-4 py-2.5 rounded-lg text-sm font-semibold hover:bg-gray-50 transition-colors disabled:opacity-50"
              >
                <EyeOff className="w-4 h-4" />
                非公開にする
              </button>
            )}

            <hr className="border-gray-100" />

            <button
              onClick={handleDelete}
              disabled={deleting}
              className="w-full flex items-center justify-center gap-2 text-red-600 border border-red-200 px-4 py-2.5 rounded-lg text-sm font-semibold hover:bg-red-50 transition-colors disabled:opacity-50"
            >
              <Trash2 className="w-4 h-4" />
              {deleting ? "削除中..." : "記事を削除"}
            </button>
          </div>

          {/* Categories */}
          <div className="bg-white rounded-2xl border border-gray-100 p-6">
            <h2 className="text-sm font-semibold text-gray-900 mb-3">カテゴリ</h2>
            {categories.length > 0 ? (
              <div className="space-y-2">
                {categories.map((cat) => (
                  <label key={cat.id} className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={selectedCategoryIds.includes(cat.id)}
                      onChange={() => toggleCategory(cat.id)}
                      className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                    />
                    <span className="text-sm text-gray-700">{cat.name}</span>
                  </label>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-400">
                カテゴリがありません。
                <Link href="/blog/categories" className="text-indigo-600 hover:underline">
                  カテゴリを作成
                </Link>
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
