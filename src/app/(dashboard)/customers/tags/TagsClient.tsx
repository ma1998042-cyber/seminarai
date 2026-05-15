"use client";

import { useState, useTransition } from "react";
import { Plus, Tag, Trash2, Loader2, Pencil, Check, X } from "lucide-react";
import { createTag, deleteTag, updateTagAction } from "../actions";
import { useRouter } from "next/navigation";

const PRESET_COLORS = [
  "#6366f1", "#ec4899", "#14b8a6", "#f59e0b",
  "#ef4444", "#22c55e", "#3b82f6", "#8b5cf6",
];

interface TagItem {
  id: string;
  name: string;
  color: string;
  is_auto: boolean;
  customer_tags?: { count: number }[];
}

export default function TagsClient({ initialTags }: { initialTags: TagItem[] }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [tags, setTags] = useState(initialTags);
  const [newTagName, setNewTagName] = useState("");
  const [newTagColor, setNewTagColor] = useState(PRESET_COLORS[0]);
  const [error, setError] = useState("");
  const [editingTagId, setEditingTagId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");
  const [editingColor, setEditingColor] = useState("");

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTagName.trim()) return;
    setError("");
    const result = await createTag(newTagName.trim(), newTagColor);
    if (result.error) { setError(result.error); return; }
    setNewTagName("");
    router.refresh();
    startTransition(() => { });
  };

  const startEditing = (tag: TagItem) => {
    setEditingTagId(tag.id);
    setEditingName(tag.name);
    setEditingColor(tag.color);
  };

  const cancelEditing = () => {
    setEditingTagId(null);
    setEditingName("");
    setEditingColor("");
  };

  const handleUpdate = async () => {
    if (!editingTagId || !editingName.trim()) return;
    setError("");
    const result = await updateTagAction(editingTagId, { name: editingName.trim(), color: editingColor });
    if (result.error) { setError(result.error); return; }
    setTags((prev) => prev.map((t) => t.id === editingTagId ? { ...t, name: editingName.trim(), color: editingColor } : t));
    cancelEditing();
  };

  const handleDelete = async (tagId: string) => {
    if (!confirm("このタグを削除してもよいですか？顧客への付与も解除されます。")) return;
    const result = await deleteTag(tagId);
    if (result.error) { setError(result.error); return; }
    setTags((prev) => prev.filter((t) => t.id !== tagId));
  };

  return (
    <div className="space-y-4">
      {error && <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600">{error}</div>}

      <div className="bg-white rounded-2xl border border-gray-100 p-6">
        <h2 className="font-semibold text-gray-900 mb-4">新しいタグを作成</h2>
        <form onSubmit={handleCreate} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">タグ名</label>
            <input
              type="text"
              value={newTagName}
              onChange={(e) => setNewTagName(e.target.value)}
              className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
              placeholder="例：高関心、購入検討中、セミナー参加者"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">カラー</label>
            <div className="flex items-center gap-2 flex-wrap">
              {PRESET_COLORS.map((color) => (
                <button
                  key={color}
                  type="button"
                  onClick={() => setNewTagColor(color)}
                  className={`w-8 h-8 rounded-full transition-all ${newTagColor === color ? "ring-2 ring-offset-2 ring-gray-400 scale-110" : ""}`}
                  style={{ backgroundColor: color }}
                />
              ))}
              <input
                type="color"
                value={newTagColor}
                onChange={(e) => setNewTagColor(e.target.value)}
                className="w-8 h-8 rounded-full border border-gray-200 cursor-pointer"
              />
            </div>
          </div>

          {newTagName && (
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-500">プレビュー：</span>
              <span
                className="text-xs px-3 py-1.5 rounded-full font-medium"
                style={{ backgroundColor: newTagColor + "20", color: newTagColor }}
              >
                {newTagName}
              </span>
            </div>
          )}

          <button
            type="submit"
            disabled={!newTagName.trim()}
            className="flex items-center gap-2 bg-indigo-600 text-white px-5 py-2.5 rounded-lg text-sm font-semibold hover:bg-indigo-700 disabled:opacity-50 transition-colors"
          >
            <Plus className="w-4 h-4" />
            タグを作成
          </button>
        </form>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 p-6">
        <h2 className="font-semibold text-gray-900 mb-4">タグ一覧</h2>
        {tags.length > 0 ? (
          <div className="space-y-2">
            {tags.map((tag) => (
              <div key={tag.id} className="flex items-center justify-between p-3 rounded-lg border border-gray-100 hover:bg-gray-50">
                {editingTagId === tag.id ? (
                  <>
                    <div className="flex items-center gap-3 flex-1 mr-3">
                      <div className="flex items-center gap-1.5">
                        {PRESET_COLORS.map((color) => (
                          <button
                            key={color}
                            type="button"
                            onClick={() => setEditingColor(color)}
                            className={`w-5 h-5 rounded-full transition-all ${editingColor === color ? "ring-2 ring-offset-1 ring-gray-400 scale-110" : ""}`}
                            style={{ backgroundColor: color }}
                          />
                        ))}
                        <input
                          type="color"
                          value={editingColor}
                          onChange={(e) => setEditingColor(e.target.value)}
                          className="w-5 h-5 rounded-full border border-gray-200 cursor-pointer"
                        />
                      </div>
                      <input
                        type="text"
                        value={editingName}
                        onChange={(e) => setEditingName(e.target.value)}
                        onKeyDown={(e) => { if (e.key === "Enter") handleUpdate(); if (e.key === "Escape") cancelEditing(); }}
                        className="flex-1 px-3 py-1.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        autoFocus
                      />
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={handleUpdate}
                        disabled={!editingName.trim()}
                        className="p-1.5 text-green-600 hover:bg-green-50 rounded-lg transition-colors disabled:opacity-50"
                      >
                        <Check className="w-4 h-4" />
                      </button>
                      <button
                        onClick={cancelEditing}
                        className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="flex items-center gap-3">
                      <div className="w-4 h-4 rounded-full flex-shrink-0" style={{ backgroundColor: tag.color }} />
                      <span className="text-sm font-medium text-gray-700">{tag.name}</span>
                      {tag.is_auto && (
                        <span className="text-xs bg-indigo-100 text-indigo-600 px-2 py-0.5 rounded-full">自動</span>
                      )}
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => startEditing(tag)}
                        className="p-1.5 text-gray-300 hover:text-indigo-500 hover:bg-indigo-50 rounded-lg transition-colors"
                      >
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(tag.id)}
                        className="p-1.5 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8">
            <Tag className="w-8 h-8 text-gray-200 mx-auto mb-2" />
            <p className="text-sm text-gray-400">まだタグがありません</p>
          </div>
        )}
      </div>
    </div>
  );
}
