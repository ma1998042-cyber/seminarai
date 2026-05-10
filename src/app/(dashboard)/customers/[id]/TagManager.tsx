"use client";

import { useState } from "react";
import { Plus, X, Tag } from "lucide-react";
import { addTagToCustomer, removeTagFromCustomer } from "../actions";
import { useRouter } from "next/navigation";

interface TagItem { id: string; name: string; color: string }

export default function TagManager({
  customerId,
  currentTags,
  allTags,
}: {
  customerId: string;
  currentTags: TagItem[];
  allTags: TagItem[];
}) {
  const router = useRouter();
  const [adding, setAdding] = useState(false);
  const [open, setOpen] = useState(false);

  const appliedIds = new Set(currentTags.map((t) => t.id));
  const availableTags = allTags.filter((t) => !appliedIds.has(t.id));

  const handleAdd = async (tagId: string) => {
    setAdding(true);
    await addTagToCustomer(customerId, tagId);
    setAdding(false);
    setOpen(false);
    router.refresh();
  };

  const handleRemove = async (tagId: string) => {
    await removeTagFromCustomer(customerId, tagId);
    router.refresh();
  };

  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-5 space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-gray-700">タグ</h3>
        {availableTags.length > 0 && (
          <button
            onClick={() => setOpen(!open)}
            className="flex items-center gap-1 text-xs text-indigo-600 hover:underline"
          >
            <Plus className="w-3.5 h-3.5" />
            追加
          </button>
        )}
      </div>

      {currentTags.length > 0 ? (
        <div className="flex flex-wrap gap-1.5">
          {currentTags.map((tag) => (
            <span
              key={tag.id}
              className="inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-full font-medium"
              style={{ backgroundColor: tag.color + "20", color: tag.color }}
            >
              {tag.name}
              <button onClick={() => handleRemove(tag.id)} className="ml-0.5 hover:opacity-70">
                <X className="w-3 h-3" />
              </button>
            </span>
          ))}
        </div>
      ) : (
        <div className="text-center py-3">
          <Tag className="w-6 h-6 text-gray-200 mx-auto mb-1" />
          <p className="text-xs text-gray-400">タグなし</p>
        </div>
      )}

      {open && availableTags.length > 0 && (
        <div className="border border-gray-100 rounded-xl overflow-hidden">
          {availableTags.map((tag) => (
            <button
              key={tag.id}
              onClick={() => handleAdd(tag.id)}
              disabled={adding}
              className="w-full flex items-center gap-2 px-3 py-2 hover:bg-gray-50 transition-colors text-left"
            >
              <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: tag.color }} />
              <span className="text-sm text-gray-700">{tag.name}</span>
            </button>
          ))}
        </div>
      )}

      {allTags.length === 0 && (
        <p className="text-xs text-gray-400">
          <a href="/customers/tags" className="text-indigo-600 hover:underline">タグを作成</a>してから付与できます
        </p>
      )}
    </div>
  );
}
