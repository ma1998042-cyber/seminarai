"use client";

import { useState, useEffect } from "react";
import { Loader2, Plus, Trash2, Pencil, X, Check } from "lucide-react";
import { getStatusesData, addStatus, editStatus, removeStatus } from "./actions";

const COLOR_PALETTE = [
  { name: "red", value: "#ef4444" },
  { name: "blue", value: "#3b82f6" },
  { name: "green", value: "#22c55e" },
  { name: "yellow", value: "#eab308" },
  { name: "purple", value: "#a855f7" },
  { name: "pink", value: "#ec4899" },
  { name: "indigo", value: "#6366f1" },
  { name: "gray", value: "#6b7280" },
  { name: "orange", value: "#f97316" },
  { name: "teal", value: "#14b8a6" },
];

interface StatusItem {
  id: string;
  name: string;
  color: string;
  sortOrder: number;
}

export default function StatusesSettingsPage() {
  const [loading, setLoading] = useState(true);
  const [statuses, setStatuses] = useState<StatusItem[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [adding, setAdding] = useState(false);
  const [formName, setFormName] = useState("");
  const [formColor, setFormColor] = useState(COLOR_PALETTE[0].value);
  const [error, setError] = useState("");

  // 編集中のステータスID
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editColor, setEditColor] = useState("");

  const fetchStatuses = async () => {
    const result = await getStatusesData();
    if (result.statuses) {
      setStatuses(result.statuses);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchStatuses();
  }, []);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim()) return;
    setAdding(true);
    setError("");

    const result = await addStatus({ name: formName, color: formColor });
    if (result.error) {
      setError(result.error);
    } else {
      setFormName("");
      setFormColor(COLOR_PALETTE[0].value);
      setShowForm(false);
      await fetchStatuses();
    }
    setAdding(false);
  };

  const handleStartEdit = (status: StatusItem) => {
    setEditingId(status.id);
    setEditName(status.name);
    setEditColor(status.color);
    setError("");
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditName("");
    setEditColor("");
  };

  const handleSaveEdit = async () => {
    if (!editingId || !editName.trim()) return;
    setError("");

    const result = await editStatus(editingId, { name: editName, color: editColor });
    if (result.error) {
      setError(result.error);
    } else {
      setEditingId(null);
      await fetchStatuses();
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("このステータスを削除しますか？該当する顧客のステータスは未設定になります。")) return;
    setError("");

    const result = await removeStatus(id);
    if (result.error) {
      setError(result.error);
    } else {
      await fetchStatuses();
    }
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
          <h1 className="text-2xl font-bold text-gray-900">ステータス管理</h1>
          <p className="text-sm text-gray-500 mt-1">顧客の習熟度・ステータスを管理します</p>
        </div>
        {!showForm && (
          <button
            onClick={() => { setShowForm(true); setError(""); }}
            className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2.5 rounded-lg font-semibold hover:bg-indigo-700 transition-colors text-sm"
          >
            <Plus className="w-4 h-4" />
            ステータスを追加
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
          <h2 className="font-semibold text-gray-900">新しいステータスを追加</h2>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              ステータス名 <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={formName}
              onChange={(e) => setFormName(e.target.value)}
              required
              className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
              placeholder="例: 初級、中級、上級、見込み客"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">色</label>
            <div className="flex flex-wrap gap-2">
              {COLOR_PALETTE.map((c) => (
                <button
                  key={c.value}
                  type="button"
                  onClick={() => setFormColor(c.value)}
                  className={`w-8 h-8 rounded-full border-2 transition-all ${
                    formColor === c.value ? "border-gray-800 scale-110" : "border-transparent hover:scale-105"
                  }`}
                  style={{ backgroundColor: c.value }}
                  title={c.name}
                />
              ))}
            </div>
          </div>

          <div className="flex items-center gap-2 pt-1">
            <span className="text-sm text-gray-500">プレビュー:</span>
            <span
              className="text-xs px-2.5 py-1 rounded-full font-medium"
              style={{ backgroundColor: formColor + "20", color: formColor }}
            >
              {formName || "ステータス名"}
            </span>
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="submit"
              disabled={adding || !formName.trim()}
              className="flex items-center gap-2 bg-indigo-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-indigo-700 transition-colors disabled:opacity-50 text-sm"
            >
              {adding && <Loader2 className="w-4 h-4 animate-spin" />}
              追加する
            </button>
            <button
              type="button"
              onClick={() => { setShowForm(false); setFormName(""); setFormColor(COLOR_PALETTE[0].value); setError(""); }}
              className="px-6 py-3 border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50 transition-colors text-sm"
            >
              キャンセル
            </button>
          </div>
        </form>
      )}

      {/* ステータス一覧 */}
      {statuses.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-2xl border border-gray-100">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-2xl text-gray-400">S</span>
          </div>
          <h2 className="text-lg font-bold text-gray-700 mb-1">ステータスがありません</h2>
          <p className="text-sm text-gray-400">顧客の習熟度を管理するステータスを追加しましょう</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-100 divide-y divide-gray-50">
          {statuses.map((status) => (
            <div key={status.id} className="px-6 py-4 flex items-center gap-4">
              {editingId === status.id ? (
                /* 編集モード */
                <div className="flex-1 flex items-center gap-3 flex-wrap">
                  <input
                    type="text"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 w-48"
                  />
                  <div className="flex gap-1.5">
                    {COLOR_PALETTE.map((c) => (
                      <button
                        key={c.value}
                        type="button"
                        onClick={() => setEditColor(c.value)}
                        className={`w-6 h-6 rounded-full border-2 transition-all ${
                          editColor === c.value ? "border-gray-800 scale-110" : "border-transparent hover:scale-105"
                        }`}
                        style={{ backgroundColor: c.value }}
                      />
                    ))}
                  </div>
                  <div className="flex items-center gap-1.5 ml-auto">
                    <button
                      onClick={handleSaveEdit}
                      className="p-1.5 text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                    >
                      <Check className="w-4 h-4" />
                    </button>
                    <button
                      onClick={handleCancelEdit}
                      className="p-1.5 text-gray-400 hover:bg-gray-50 rounded-lg transition-colors"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ) : (
                /* 表示モード */
                <>
                  <span
                    className="text-xs px-2.5 py-1 rounded-full font-medium"
                    style={{ backgroundColor: status.color + "20", color: status.color }}
                  >
                    {status.name}
                  </span>
                  <div className="flex-1" />
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => handleStartEdit(status)}
                      className="p-2 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                    >
                      <Pencil className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(status.id)}
                      className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
