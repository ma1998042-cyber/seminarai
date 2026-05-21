"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Trash2, Upload, Loader2, Eye, EyeOff } from "lucide-react";
import { updateServiceAction, deleteServiceAction } from "../actions";

interface Props {
  service: {
    id: string;
    title: string;
    description: string;
    imageUrl: string;
    inquiryUrl: string;
    sortOrder: number;
    isPublished: boolean;
  };
}

export default function ServiceEditForm({ service }: Props) {
  const router = useRouter();
  const [title, setTitle] = useState(service.title);
  const [description, setDescription] = useState(service.description);
  const [imageUrl, setImageUrl] = useState(service.imageUrl);
  const [inquiryUrl, setInquiryUrl] = useState(service.inquiryUrl);
  const [sortOrder, setSortOrder] = useState(service.sortOrder);
  const [isPublished, setIsPublished] = useState(service.isPublished);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [uploading, setUploading] = useState(false);

  async function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("prefix", "services");
      const res = await fetch("/api/upload", { method: "POST", body: formData });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "アップロードに失敗しました");
      setImageUrl(`/api/images/${data.key}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "アップロードに失敗しました");
    } finally {
      setUploading(false);
    }
  }

  async function handleSave() {
    setError("");
    setSaving(true);
    const result = await updateServiceAction(service.id, {
      title,
      description,
      imageUrl,
      inquiryUrl,
      sortOrder,
      isPublished,
    });
    setSaving(false);
    if (result.error) {
      setError(result.error);
      return;
    }
    router.refresh();
  }

  async function handleDelete() {
    if (!confirm("このサービスを削除してもよろしいですか？")) return;
    setDeleting(true);
    const result = await deleteServiceAction(service.id);
    if (result.error) {
      setError(result.error);
      setDeleting(false);
      return;
    }
    router.push("/services");
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <Link
            href="/services"
            className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 mb-4"
          >
            <ArrowLeft className="w-4 h-4" />
            サービス管理に戻る
          </Link>
          <h1 className="text-2xl font-bold text-gray-900">サービスを編集</h1>
        </div>
        <span
          className={`inline-flex px-2.5 py-1 rounded-full text-xs font-medium ${
            isPublished ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-600"
          }`}
        >
          {isPublished ? "公開中" : "非公開"}
        </span>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">{error}</div>
      )}

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
          <label className="block text-sm font-medium text-gray-700 mb-1">画像</label>
          <div className="flex gap-2">
            <input
              type="url"
              value={imageUrl}
              onChange={(e) => setImageUrl(e.target.value)}
              placeholder="画像URL"
              className="flex-1 border border-gray-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            />
            <label className="inline-flex items-center gap-1.5 px-4 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm font-medium rounded-lg cursor-pointer transition-colors whitespace-nowrap">
              {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
              {uploading ? "..." : "アップロード"}
              <input type="file" accept="image/*" className="hidden" disabled={uploading} onChange={handleImageUpload} />
            </label>
          </div>
          {imageUrl && (
            <img src={imageUrl} alt="プレビュー" className="mt-2 h-32 w-auto rounded border border-gray-200 object-cover" />
          )}
        </div>

        <div>
          <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">説明文</label>
          <textarea
            id="description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={4}
            className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
          />
        </div>

        <div>
          <label htmlFor="inquiryUrl" className="block text-sm font-medium text-gray-700 mb-1">お問い合わせリンク</label>
          <input
            id="inquiryUrl"
            type="url"
            value={inquiryUrl}
            onChange={(e) => setInquiryUrl(e.target.value)}
            placeholder="https://example.com/contact"
            className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
          />
        </div>

        <div>
          <label htmlFor="sortOrder" className="block text-sm font-medium text-gray-700 mb-1">並び順</label>
          <input
            id="sortOrder"
            type="number"
            value={sortOrder}
            onChange={(e) => setSortOrder(Number(e.target.value))}
            className="w-32 border border-gray-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
          />
        </div>

        <div className="flex items-center gap-2">
          <label className="text-sm font-medium text-gray-700">公開状態:</label>
          <button
            type="button"
            onClick={() => setIsPublished(!isPublished)}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              isPublished
                ? "bg-green-100 text-green-700 hover:bg-green-200"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}
          >
            {isPublished ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
            {isPublished ? "公開中" : "非公開"}
          </button>
        </div>
      </div>

      <div className="flex items-center justify-between">
        <button
          onClick={handleDelete}
          disabled={deleting}
          className="inline-flex items-center gap-1.5 text-sm text-red-600 hover:text-red-700 disabled:opacity-50"
        >
          <Trash2 className="w-4 h-4" />
          {deleting ? "削除中..." : "このサービスを削除"}
        </button>
        <div className="flex items-center gap-3">
          <Link href="/services" className="text-sm text-gray-500 hover:text-gray-700">キャンセル</Link>
          <button
            onClick={handleSave}
            disabled={saving || !title.trim()}
            className="bg-indigo-600 text-white px-6 py-2.5 rounded-lg text-sm font-semibold hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? "保存中..." : "保存"}
          </button>
        </div>
      </div>
    </div>
  );
}
