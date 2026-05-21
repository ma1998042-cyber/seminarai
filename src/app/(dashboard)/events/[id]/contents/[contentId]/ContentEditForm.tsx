"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Trash2, Upload, Loader2, Eye, EyeOff, FileDown, X } from "lucide-react";
import { updateContentAction, deleteContentAction } from "../actions";

const CONTENT_TYPES = [
  { value: "manual", label: "マニュアル" },
  { value: "template", label: "テンプレート" },
  { value: "video", label: "動画" },
  { value: "other", label: "その他" },
];

interface Props {
  eventId: string;
  content: {
    id: string;
    title: string;
    description: string;
    contentType: string;
    fileUrl: string;
    sortOrder: number;
    isPublished: boolean;
  };
}

export default function ContentEditForm({ eventId, content }: Props) {
  const router = useRouter();
  const [title, setTitle] = useState(content.title);
  const [description, setDescription] = useState(content.description);
  const [contentType, setContentType] = useState(content.contentType);
  const [fileUrl, setFileUrl] = useState(content.fileUrl);
  const [sortOrder, setSortOrder] = useState(content.sortOrder);
  const [isPublished, setIsPublished] = useState(content.isPublished);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [uploading, setUploading] = useState(false);

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("prefix", "contents");
      formData.append("type", "document");
      const res = await fetch("/api/upload", { method: "POST", body: formData });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "アップロードに失敗しました");
      setFileUrl(`/api/images/${data.key}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "アップロードに失敗しました");
    } finally {
      setUploading(false);
    }
  }

  async function handleSave() {
    setError("");
    setSaving(true);
    const result = await updateContentAction(content.id, {
      eventId,
      title,
      description,
      contentType,
      fileUrl,
      sortOrder,
      isPublished: isPublished ? 1 : 0,
    });
    setSaving(false);
    if (result.error) {
      setError(result.error);
      return;
    }
    router.refresh();
  }

  async function handleDelete() {
    if (!confirm("このコンテンツを削除してもよろしいですか？")) return;
    setDeleting(true);
    const result = await deleteContentAction(content.id, eventId);
    if (result.error) {
      setError(result.error);
      setDeleting(false);
      return;
    }
    router.push(`/events/${eventId}/contents`);
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <Link
            href={`/events/${eventId}/contents`}
            className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 mb-4"
          >
            <ArrowLeft className="w-4 h-4" />
            コンテンツ一覧に戻る
          </Link>
          <h1 className="text-2xl font-bold text-gray-900">コンテンツを編集</h1>
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
          <label htmlFor="contentType" className="block text-sm font-medium text-gray-700 mb-1">
            種別
          </label>
          <select
            id="contentType"
            value={contentType}
            onChange={(e) => setContentType(e.target.value)}
            className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
          >
            {CONTENT_TYPES.map((ct) => (
              <option key={ct.value} value={ct.value}>
                {ct.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">ファイル</label>
          {fileUrl ? (
            <div className="flex items-center gap-3 bg-gray-50 rounded-lg px-4 py-3">
              <FileDown className="w-5 h-5 text-indigo-500 shrink-0" />
              <span className="text-sm text-gray-700 truncate flex-1">{fileUrl.split("/").pop()}</span>
              <button
                type="button"
                onClick={() => setFileUrl("")}
                className="text-gray-400 hover:text-red-500 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <label className="flex items-center justify-center gap-2 px-4 py-6 border-2 border-dashed border-gray-200 rounded-lg cursor-pointer hover:border-indigo-300 hover:bg-indigo-50/50 transition-colors">
              {uploading ? <Loader2 className="w-5 h-5 animate-spin text-indigo-500" /> : <Upload className="w-5 h-5 text-gray-400" />}
              <span className="text-sm text-gray-500">
                {uploading ? "アップロード中..." : "ファイルをアップロード"}
              </span>
              <input
                type="file"
                className="hidden"
                disabled={uploading}
                onChange={handleFileUpload}
              />
            </label>
          )}
        </div>

        <div>
          <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">説明</label>
          <textarea
            id="description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={4}
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
          {deleting ? "削除中..." : "このコンテンツを削除"}
        </button>
        <div className="flex items-center gap-3">
          <Link href={`/events/${eventId}/contents`} className="text-sm text-gray-500 hover:text-gray-700">
            キャンセル
          </Link>
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
