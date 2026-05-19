"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Pencil, Trash2, X, Check, Tag } from "lucide-react";
import {
  createBlogCategoryAction,
  updateBlogCategoryAction,
  deleteBlogCategoryAction,
} from "../actions";

interface Category {
  id: string;
  name: string;
  slug: string;
  sortOrder: number;
}

function toSlug(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[\s\u3000]+/g, "-")
    .replace(/[^\w\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FFF-]/g, "")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

export default function BlogCategoryManager({
  initialCategories,
}: {
  initialCategories: Category[];
}) {
  const router = useRouter();
  const [categories, setCategories] = useState<Category[]>(initialCategories);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [slugManual, setSlugManual] = useState(false);
  const [sortOrder, setSortOrder] = useState(0);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  function resetForm() {
    setName("");
    setSlug("");
    setSlugManual(false);
    setSortOrder(0);
    setError("");
    setShowForm(false);
    setEditingId(null);
  }

  function handleNameChange(value: string) {
    setName(value);
    if (!slugManual) {
      setSlug(toSlug(value));
    }
  }

  function startEdit(cat: Category) {
    setEditingId(cat.id);
    setName(cat.name);
    setSlug(cat.slug);
    setSortOrder(cat.sortOrder);
    setSlugManual(true);
    setShowForm(false);
    setError("");
  }

  function startAdd() {
    resetForm();
    setShowForm(true);
    setEditingId(null);
  }

  async function handleAdd() {
    if (!name.trim() || !slug.trim()) return;
    setError("");
    setSaving(true);

    const result = await createBlogCategoryAction({ name, slug, sortOrder });
    setSaving(false);

    if (result.error) {
      setError(result.error);
      return;
    }

    resetForm();
    router.refresh();
  }

  async function handleUpdate() {
    if (!editingId || !name.trim() || !slug.trim()) return;
    setError("");
    setSaving(true);

    const result = await updateBlogCategoryAction(editingId, { name, slug, sortOrder });
    setSaving(false);

    if (result.error) {
      setError(result.error);
      return;
    }

    setCategories((prev) =>
      prev.map((c) => (c.id === editingId ? { ...c, name, slug, sortOrder } : c))
    );
    resetForm();
    router.refresh();
  }

  async function handleDelete(id: string) {
    if (!confirm("このカテゴリを削除してもよろしいですか？")) return;

    const result = await deleteBlogCategoryAction(id);
    if (result.error) {
      setError(result.error);
      return;
    }

    setCategories((prev) => prev.filter((c) => c.id !== id));
    if (editingId === id) resetForm();
    router.refresh();
  }

  const formRow = (
    <div className="flex items-end gap-3 p-4 bg-gray-50 rounded-lg">
      <div className="flex-1">
        <label className="block text-xs font-medium text-gray-500 mb-1">名前</label>
        <input
          type="text"
          value={name}
          onChange={(e) => handleNameChange(e.target.value)}
          placeholder="カテゴリ名"
          className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
        />
      </div>
      <div className="flex-1">
        <label className="block text-xs font-medium text-gray-500 mb-1">スラッグ</label>
        <input
          type="text"
          value={slug}
          onChange={(e) => {
            setSlug(e.target.value);
            setSlugManual(true);
          }}
          placeholder="slug"
          className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent font-mono"
        />
      </div>
      <div className="w-24">
        <label className="block text-xs font-medium text-gray-500 mb-1">並び順</label>
        <input
          type="number"
          value={sortOrder}
          onChange={(e) => setSortOrder(parseInt(e.target.value) || 0)}
          className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
        />
      </div>
      <div className="flex items-center gap-1">
        <button
          onClick={editingId ? handleUpdate : handleAdd}
          disabled={saving || !name.trim() || !slug.trim()}
          className="p-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition-colors"
        >
          <Check className="w-4 h-4" />
        </button>
        <button
          onClick={resetForm}
          className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );

  return (
    <div className="space-y-4">
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
          {error}
        </div>
      )}

      <div className="bg-white rounded-2xl border border-gray-100 p-6 space-y-4">
        {/* Add button */}
        {!showForm && !editingId && (
          <button
            onClick={startAdd}
            className="flex items-center gap-2 text-sm font-semibold text-indigo-600 hover:text-indigo-700 transition-colors"
          >
            <Plus className="w-4 h-4" />
            カテゴリを追加
          </button>
        )}

        {/* Add form */}
        {showForm && formRow}

        {/* Category list */}
        {categories.length > 0 ? (
          <div className="divide-y divide-gray-50">
            {categories.map((cat) =>
              editingId === cat.id ? (
                <div key={cat.id} className="py-2">
                  {formRow}
                </div>
              ) : (
                <div
                  key={cat.id}
                  className="flex items-center justify-between py-3 group"
                >
                  <div className="flex items-center gap-3">
                    <Tag className="w-4 h-4 text-gray-300" />
                    <div>
                      <span className="text-sm font-medium text-gray-900">
                        {cat.name}
                      </span>
                      <span className="text-xs text-gray-400 ml-2 font-mono">
                        /{cat.slug}
                      </span>
                    </div>
                    <span className="text-xs text-gray-300">
                      並び順: {cat.sortOrder}
                    </span>
                  </div>
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => startEdit(cat)}
                      className="p-1.5 text-gray-400 hover:text-indigo-600 transition-colors"
                    >
                      <Pencil className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(cat.id)}
                      className="p-1.5 text-gray-400 hover:text-red-600 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )
            )}
          </div>
        ) : (
          !showForm && (
            <div className="text-center py-8">
              <Tag className="w-8 h-8 text-gray-200 mx-auto mb-2" />
              <p className="text-sm text-gray-400">カテゴリがありません</p>
            </div>
          )
        )}
      </div>
    </div>
  );
}
