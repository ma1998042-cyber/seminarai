"use client";

import { useState, useEffect, useRef } from "react";
import { Loader2, Plus, Trash2, Image as ImageIcon, ExternalLink } from "lucide-react";
import { getBannersData, addBanner, toggleBanner, removeBanner } from "./actions";

interface BannerItem {
  id: string;
  title: string;
  imageUrl: string;
  linkUrl: string;
  sortOrder: number;
  isActive: boolean;
}

export default function BannersSettingsPage() {
  const [loading, setLoading] = useState(true);
  const [banners, setBanners] = useState<BannerItem[]>([]);
  const [adding, setAdding] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ title: "", linkUrl: "" });
  const [imageKey, setImageKey] = useState("");
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchBanners = async () => {
    const result = await getBannersData();
    if (result.banners) {
      setBanners(result.banners);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchBanners();
  }, []);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setError("");

    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/upload", { method: "POST", body: formData });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "アップロードに失敗しました");
        setUploading(false);
        return;
      }
      setImageKey(data.key);
    } catch {
      setError("アップロードに失敗しました");
    }
    setUploading(false);
  };

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!imageKey) {
      setError("画像をアップロードしてください");
      return;
    }
    setAdding(true);
    setError("");

    const result = await addBanner({
      title: form.title,
      imageUrl: `/api/images/${imageKey}`,
      linkUrl: form.linkUrl,
    });

    if (result.error) {
      setError(result.error);
    } else {
      setForm({ title: "", linkUrl: "" });
      setImageKey("");
      setShowForm(false);
      await fetchBanners();
    }
    setAdding(false);
  };

  const handleToggle = async (id: string, current: boolean) => {
    await toggleBanner(id, !current);
    await fetchBanners();
  };

  const handleDelete = async (id: string) => {
    if (!confirm("このバナーを削除しますか？")) return;
    await removeBanner(id);
    await fetchBanners();
  };

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">バナー管理</h1>
          <p className="text-sm text-gray-500 mt-1">公開イベントページに表示するバナーを管理します</p>
        </div>
        {!showForm && (
          <button
            onClick={() => setShowForm(true)}
            className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2.5 rounded-lg font-semibold hover:bg-indigo-700 transition-colors text-sm"
          >
            <Plus className="w-4 h-4" />
            バナーを追加
          </button>
        )}
      </div>

      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600">
          {error}
        </div>
      )}

      {/* 追加フォーム */}
      {showForm && (
        <form onSubmit={handleAdd} className="bg-white rounded-2xl border border-gray-100 p-6 space-y-4">
          <h2 className="font-semibold text-gray-900">新しいバナーを追加</h2>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              タイトル <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              required
              className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
              placeholder="バナーのタイトル"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              リンクURL <span className="text-red-500">*</span>
            </label>
            <input
              type="url"
              value={form.linkUrl}
              onChange={(e) => setForm({ ...form, linkUrl: e.target.value })}
              required
              className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
              placeholder="https://example.com"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              バナー画像 <span className="text-red-500">*</span>
            </label>
            {imageKey ? (
              <div className="relative w-48 aspect-square border border-gray-200 rounded-lg overflow-hidden">
                <img
                  src={`/api/images/${imageKey}`}
                  alt="プレビュー"
                  className="w-full h-full object-cover"
                />
                <button
                  type="button"
                  onClick={() => { setImageKey(""); if (fileInputRef.current) fileInputRef.current.value = ""; }}
                  className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 hover:bg-red-600"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>
            ) : (
              <div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/gif"
                  onChange={handleUpload}
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                  className="flex items-center gap-2 px-4 py-3 border-2 border-dashed border-gray-300 rounded-lg text-gray-500 hover:border-indigo-400 hover:text-indigo-600 transition-colors w-full justify-center"
                >
                  {uploading ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <ImageIcon className="w-5 h-5" />
                  )}
                  {uploading ? "アップロード中..." : "画像を選択"}
                </button>
              </div>
            )}
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="submit"
              disabled={adding || !imageKey}
              className="flex items-center gap-2 bg-indigo-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-indigo-700 transition-colors disabled:opacity-50 text-sm"
            >
              {adding && <Loader2 className="w-4 h-4 animate-spin" />}
              追加する
            </button>
            <button
              type="button"
              onClick={() => { setShowForm(false); setForm({ title: "", linkUrl: "" }); setImageKey(""); setError(""); }}
              className="px-6 py-3 border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50 transition-colors text-sm"
            >
              キャンセル
            </button>
          </div>
        </form>
      )}

      {/* バナー一覧 */}
      {banners.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-2xl border border-gray-100">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <ImageIcon className="w-8 h-8 text-gray-400" />
          </div>
          <h2 className="text-lg font-bold text-gray-700 mb-1">バナーがありません</h2>
          <p className="text-sm text-gray-400">公開イベントページに表示するバナーを追加しましょう</p>
        </div>
      ) : (
        <div className="space-y-3">
          {banners.map((banner) => (
            <div
              key={banner.id}
              className="bg-white rounded-2xl border border-gray-100 p-4 flex items-center gap-4"
            >
              {/* サムネイル */}
              <div className="w-20 h-20 rounded-lg overflow-hidden bg-gray-100 flex-shrink-0">
                <img
                  src={banner.imageUrl}
                  alt={banner.title}
                  className="w-full h-full object-cover"
                />
              </div>

              {/* 情報 */}
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-gray-900 truncate">{banner.title}</h3>
                <a
                  href={banner.linkUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-indigo-600 hover:underline flex items-center gap-1 truncate"
                >
                  {banner.linkUrl}
                  <ExternalLink className="w-3 h-3 flex-shrink-0" />
                </a>
              </div>

              {/* 操作 */}
              <div className="flex items-center gap-2 flex-shrink-0">
                <button
                  onClick={() => handleToggle(banner.id, banner.isActive)}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                    banner.isActive
                      ? "bg-green-100 text-green-700 hover:bg-green-200"
                      : "bg-gray-100 text-gray-500 hover:bg-gray-200"
                  }`}
                >
                  {banner.isActive ? "有効" : "無効"}
                </button>
                <button
                  onClick={() => handleDelete(banner.id)}
                  className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
