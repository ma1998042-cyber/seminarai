"use client";

import { useState } from "react";
import { Plus, Link2 } from "lucide-react";
import { linkSurveyToEvent } from "./actions";
import { useRouter } from "next/navigation";

interface Survey {
  id: string;
  title: string;
}

export default function LinkSurveyButton({ eventId, unlinkedSurveys }: { eventId: string; unlinkedSurveys: Survey[] }) {
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();

  const handleLink = async () => {
    if (!selected) return;
    setLoading(true);
    setError("");
    const result = await linkSurveyToEvent(selected, eventId);
    setLoading(false);
    if (result.error) { setError(result.error); return; }
    setOpen(false);
    setSelected("");
    router.refresh();
  };

  if (unlinkedSurveys.length === 0) return null;

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1 text-sm text-gray-400 hover:text-indigo-600 transition-colors"
      >
        <Link2 className="w-3.5 h-3.5" />
        既存のアンケートを追加
      </button>

      {open && (
        <div className="absolute right-0 top-8 z-10 w-72 bg-white rounded-xl border border-gray-200 shadow-lg p-4 space-y-3">
          <p className="text-xs font-semibold text-gray-500">既存のアンケートをリンク</p>
          <select
            value={selected}
            onChange={(e) => setSelected(e.target.value)}
            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
          >
            <option value="">アンケートを選択...</option>
            {unlinkedSurveys.map((s) => (
              <option key={s.id} value={s.id}>{s.title}</option>
            ))}
          </select>
          {error && <p className="text-xs text-red-500">{error}</p>}
          <div className="flex gap-2">
            <button
              onClick={() => setOpen(false)}
              className="flex-1 py-2 text-xs border border-gray-200 rounded-lg text-gray-500 hover:bg-gray-50"
            >
              キャンセル
            </button>
            <button
              onClick={handleLink}
              disabled={!selected || loading}
              className="flex-1 py-2 text-xs bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50"
            >
              追加する
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
