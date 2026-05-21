"use client";

import { useState, useEffect, useRef } from "react";
import { Loader2, Plus, Trash2, Image as ImageIcon, ExternalLink, Pencil, Monitor, Smartphone } from "lucide-react";
import { getBannersData, addBanner, editBanner, toggleBanner, removeBanner } from "./actions";

interface BannerItem {
  id: string;
  title: string;
  imageUrl: string;
  mobileImageUrl: string | null;
  linkUrl: string;
  sortOrder: number;
  isActive: boolean;
}

function ImageUploader({
  label,
  hint,
  imageKey,
  existingUrl,
  uploading,
  onUpload,
  onClear,
  aspectClass,
  required,
}: {
  label: string;
  hint: string;
  imageKey: string;
  existingUrl?: string;
  uploading: boolean;
  onUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onClear: () => void;
  aspectClass: string;
  required?: boolean;
}) {
  const ref = useRef<HTMLInputElement>(null);
  const previewUrl = imageKey ? `/api/images/${imageKey}` : existingUrl;

  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1.5">
        {label} {required && <span className="text-red-500">*</span>}
        <span className="text-xs text-gray-400 font-normal ml-2">{hint}</span>
      </label>
      {previewUrl ? (
        <div className={`relative w-full max-w-md ${aspectClass} border border-gray-200 rounded-lg overflow-hidden`}>
          <img src={previewUrl} alt="プレビュー" className="w-full h-full object-cover" />
          <button
            type="button"
            onClick={() => { onClear(); if (ref.current) ref.current.value = ""; }}
            className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 hover:bg-red-600"
          >
            <Trash2 className="w-3 h-3" />
          </button>
        </div>
      ) : (
        <div>
          <input ref={ref} type="file" accept="image/jpeg,image/png,image/webp,image/gif" onChange={onUpload} className="hidden" />
          <button
            type="button"
            onClick={() => ref.current?.click()}
            disabled={uploading}
            className="flex items-center gap-2 px-4 py-3 border-2 border-dashed border-gray-300 rounded-lg text-gray-500 hover:border-indigo-400 hover:text-indigo-600 transition-colors w-full justify-center"
          >
            {uploading ? <Loader2 className="w-5 h-5 animate-spin" /> : <ImageIcon className="w-5 h-5" />}
            {uploading ? "アップロード中..." : "画像を選択"}
          </button>
        </div>
      )}
    </div>
  );
}

export default function BannersSettingsPage() {
  const [loading, setLoading] = useState(true);
  const [banners, setBanners] = useState<BannerItem[]>([]);
  const [adding, setAdding] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingBanner, setEditingBanner] = useState<BannerItem | null>(null);
  const [form, setForm] = useState({ title: "", linkUrl: "" });
  const [imageKey, setImageKey] = useState("");
  const [mobileImageKey, setMobileImageKey] = useState("");
  const [clearedPc, setClearedPc] = useState(false);
  const [clearedMobile, setClearedMobile] = useState(false);
  const [uploadingTarget, setUploadingTarget] = useState<"pc" | "mobile" | null>(null);
  const [error, setError] = useState("");

  const fetchBanners = async () => {
    const result = await getBannersData();
    if (result.banners) setBanners(result.banners);
    setLoading(false);
  };

  useEffect(() => { fetchBanners(); }, []);

  const handleUpload = async (file: File, target: "pc" | "mobile") => {
    setUploadingTarget(target);
    setError("");
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/upload", { method: "POST", body: formData });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "アップロードに失敗しました");
        setUploadingTarget(null);
        return;
      }
      if (target === "pc") { setImageKey(data.key); setClearedPc(false); }
      else { setMobileImageKey(data.key); setClearedMobile(false); }
    } catch {
      setError("アップロードに失敗しました");
    }
    setUploadingTarget(null);
  };

  const resetForm = () => {
    setForm({ title: "", linkUrl: "" });
    setImageKey("");
    setMobileImageKey("");
    setClearedPc(false);
    setClearedMobile(false);
    setShowForm(false);
    setEditingBanner(null);
    setError("");
  };

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!imageKey) { setError("PC用バナー画像をアップロードしてください"); return; }
    setAdding(true);
    setError("");

    const result = await addBanner({
      title: form.title,
      imageUrl: `/api/images/${imageKey}`,
      mobileImageUrl: mobileImageKey ? `/api/images/${mobileImageKey}` : null,
      linkUrl: form.linkUrl,
    });

    if (result.error) { setError(result.error); }
    else { resetForm(); await fetchBanners(); }
    setAdding(false);
  };

  const handleEditStart = (banner: BannerItem) => {
    setEditingBanner(banner);
    setForm({ title: banner.title, linkUrl: banner.linkUrl });
    setImageKey("");
    setMobileImageKey("");
    setClearedPc(false);
    setClearedMobile(false);
    setShowForm(false);
    setError("");
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingBanner) return;
    setAdding(true);
    setError("");

    const updateData: { title?: string; linkUrl?: string; imageUrl?: string; mobileImageUrl?: string | null } = {
      title: form.title,
      linkUrl: form.linkUrl,
    };
    if (imageKey) updateData.imageUrl = `/api/images/${imageKey}`;
    if (mobileImageKey) updateData.mobileImageUrl = `/api/images/${mobileImageKey}`;
    else if (clearedMobile) updateData.mobileImageUrl = null;

    const result = await editBanner(editingBanner.id, updateData);
    if (result.error) { setError(result.error); }
    else { resetForm(); await fetchBanners(); }
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

  const formFields = (
    <>
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

      {/* PC用バナー画像 */}
      <div className="p-4 bg-gray-50 rounded-xl space-y-3">
        <div className="flex items-center gap-2 text-sm font-medium text-gray-700">
          <Monitor className="w-4 h-4" />
          PC用バナー画像（サイドバー表示）
        </div>
        <ImageUploader
          label="PC用画像"
          hint="推奨: 正方形（例: 500×500px）"
          imageKey={imageKey}
          existingUrl={editingBanner && !imageKey && !clearedPc ? editingBanner.imageUrl : undefined}
          uploading={uploadingTarget === "pc"}
          onUpload={(e) => { const f = e.target.files?.[0]; if (f) handleUpload(f, "pc"); }}
          onClear={() => { setImageKey(""); setClearedPc(true); }}
          aspectClass="aspect-square"
          required={!editingBanner}
        />
      </div>

      {/* スマホ用バナー画像 */}
      <div className="p-4 bg-blue-50 rounded-xl space-y-3">
        <div className="flex items-center gap-2 text-sm font-medium text-gray-700">
          <Smartphone className="w-4 h-4" />
          スマホ用バナー画像（画面下部に表示）
        </div>
        <ImageUploader
          label="スマホ用画像"
          hint="推奨: 750×140px（JPG/PNG・透過なし）"
          imageKey={mobileImageKey}
          existingUrl={editingBanner && !mobileImageKey && !clearedMobile ? (editingBanner.mobileImageUrl ?? undefined) : undefined}
          uploading={uploadingTarget === "mobile"}
          onUpload={(e) => { const f = e.target.files?.[0]; if (f) handleUpload(f, "mobile"); }}
          onClear={() => { setMobileImageKey(""); setClearedMobile(true); }}
          aspectClass="aspect-[4/1]"
        />
        <div className="text-xs text-gray-400 space-y-1">
          <p>未設定の場合、スマホでもPC用画像が使われます</p>
          <p className="text-amber-500 font-medium">※ 透過PNG不可。背景色付きの画像を使用してください。2件登録時は横幅半分で表示されます。</p>
        </div>
      </div>
    </>
  );

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">バナー管理</h1>
          <p className="text-sm text-gray-500 mt-1">公開イベントページに表示するバナーを管理します</p>
        </div>
        {!showForm && !editingBanner && (
          banners.length >= 2 ? (
            <span className="text-sm text-gray-500">バナーは最大2件まで登録できます</span>
          ) : (
            <button
              onClick={() => setShowForm(true)}
              className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2.5 rounded-lg font-semibold hover:bg-indigo-700 transition-colors text-sm"
            >
              <Plus className="w-4 h-4" />
              バナーを追加
            </button>
          )
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
          {formFields}
          <div className="flex gap-3 pt-2">
            <button
              type="submit"
              disabled={adding || !imageKey}
              className="flex items-center gap-2 bg-indigo-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-indigo-700 transition-colors disabled:opacity-50 text-sm"
            >
              {adding && <Loader2 className="w-4 h-4 animate-spin" />}
              追加する
            </button>
            <button type="button" onClick={resetForm} className="px-6 py-3 border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50 transition-colors text-sm">
              キャンセル
            </button>
          </div>
        </form>
      )}

      {/* 編集フォーム */}
      {editingBanner && (
        <form onSubmit={handleEditSubmit} className="bg-white rounded-2xl border border-gray-100 p-6 space-y-4">
          <h2 className="font-semibold text-gray-900">バナーを編集</h2>
          {formFields}
          <div className="flex gap-3 pt-2">
            <button
              type="submit"
              disabled={adding}
              className="flex items-center gap-2 bg-indigo-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-indigo-700 transition-colors disabled:opacity-50 text-sm"
            >
              {adding && <Loader2 className="w-4 h-4 animate-spin" />}
              更新する
            </button>
            <button type="button" onClick={resetForm} className="px-6 py-3 border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50 transition-colors text-sm">
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
              className="bg-white rounded-2xl border border-gray-100 p-4 space-y-3"
            >
              <div className="flex items-center gap-4">
                {/* PC用サムネイル */}
                <div className="w-16 h-16 rounded-lg overflow-hidden bg-gray-100 flex-shrink-0">
                  <img src={banner.imageUrl} alt={banner.title} className="w-full h-full object-cover" />
                </div>

                {/* スマホ用サムネイル */}
                {banner.mobileImageUrl && (
                  <div className="w-24 h-6 rounded overflow-hidden bg-gray-100 flex-shrink-0">
                    <img src={banner.mobileImageUrl} alt={`${banner.title} (スマホ)`} className="w-full h-full object-cover" />
                  </div>
                )}

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
                  <div className="flex items-center gap-2 mt-1">
                    <span className="inline-flex items-center gap-1 text-xs text-gray-400">
                      <Monitor className="w-3 h-3" /> PC
                    </span>
                    <span className={`inline-flex items-center gap-1 text-xs ${banner.mobileImageUrl ? "text-blue-500" : "text-gray-300"}`}>
                      <Smartphone className="w-3 h-3" /> {banner.mobileImageUrl ? "スマホ" : "スマホ未設定"}
                    </span>
                  </div>
                </div>

                {/* 操作 */}
                <div className="flex items-center gap-2 flex-shrink-0">
                  <button
                    onClick={() => handleEditStart(banner)}
                    className="p-2 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                  >
                    <Pencil className="w-4 h-4" />
                  </button>
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
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
