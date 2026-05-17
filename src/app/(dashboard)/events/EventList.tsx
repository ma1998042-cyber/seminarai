"use client";

import { useState } from "react";
import Link from "next/link";
import { CalendarDays, Users, ExternalLink, Trash2, Loader2 } from "lucide-react";
import { formatDate, EVENT_TYPE_LABELS, EVENT_STATUS_LABELS, EVENT_VISIBILITY_LABELS, cn } from "@/lib/utils";
import { deleteEventsAction } from "./actions";
import { useRouter } from "next/navigation";

type Event = {
  id: string;
  title: string;
  status: string;
  visibility: string;
  eventType: string;
  startDate: string | null;
  registrationCount: number;
};

const statusColors: Record<string, string> = {
  draft: "bg-gray-100 text-gray-600",
  active: "bg-green-100 text-green-700",
  closed: "bg-gray-100 text-gray-500",
  archived: "bg-amber-100 text-amber-700",
};

const visibilityColors: Record<string, string> = {
  public: "bg-blue-100 text-blue-700",
  unlisted: "bg-yellow-100 text-yellow-700",
  draft: "bg-gray-100 text-gray-500",
};

export default function EventList({ events }: { events: Event[] }) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();

  const allSelected = events.length > 0 && selectedIds.size === events.length;

  const toggleAll = () => {
    if (allSelected) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(events.map((e) => e.id)));
    }
  };

  const toggleOne = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handleDelete = async () => {
    setLoading(true);
    setError("");
    const result = await deleteEventsAction(Array.from(selectedIds));
    if (result.error) {
      setError(result.error);
      setLoading(false);
      return;
    }
    setSelectedIds(new Set());
    setConfirmDelete(false);
    setLoading(false);
    router.refresh();
  };

  return (
    <>
      {/* Selection toolbar */}
      {selectedIds.size > 0 && (
        <div className="flex items-center gap-4 bg-indigo-50 border border-indigo-200 rounded-xl px-5 py-3">
          <span className="text-sm font-medium text-indigo-700">
            {selectedIds.size}件選択中
          </span>
          <button
            onClick={() => setConfirmDelete(true)}
            className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-semibold hover:bg-red-700 transition-colors"
          >
            <Trash2 className="w-4 h-4" />
            選択した{selectedIds.size}件を削除
          </button>
          <button
            onClick={() => setSelectedIds(new Set())}
            className="text-sm text-gray-500 hover:text-gray-700 transition-colors"
          >
            選択解除
          </button>
        </div>
      )}

      {/* Select all checkbox */}
      <div className="flex items-center gap-3 px-2">
        <label className="flex items-center gap-2 cursor-pointer text-sm text-gray-500">
          <input
            type="checkbox"
            checked={allSelected}
            onChange={toggleAll}
            className="w-4 h-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
          />
          全選択
        </label>
      </div>

      {/* Events list */}
      <div className="space-y-3">
        {events.map((event) => (
          <div
            key={event.id}
            className="flex items-center gap-4 bg-white rounded-xl p-5 border border-gray-100 hover:shadow-md transition-all group"
          >
            <input
              type="checkbox"
              checked={selectedIds.has(event.id)}
              onChange={() => toggleOne(event.id)}
              onClick={(e) => e.stopPropagation()}
              className="w-4 h-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 flex-shrink-0"
            />
            <Link
              href={`/events/${event.id}`}
              className="flex items-center gap-4 flex-1 min-w-0"
            >
              <div className="w-12 h-12 bg-indigo-50 rounded-xl flex items-center justify-center flex-shrink-0">
                <CalendarDays className="w-6 h-6 text-indigo-500" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="font-semibold text-gray-900 truncate">{event.title}</h3>
                  <span className={cn("text-xs px-2 py-0.5 rounded-full font-medium flex-shrink-0", statusColors[event.status] || statusColors.draft)}>
                    {EVENT_STATUS_LABELS[event.status] || event.status}
                  </span>
                  <span className={cn("text-xs px-2 py-0.5 rounded-full font-medium flex-shrink-0", visibilityColors[event.visibility] || visibilityColors.draft)}>
                    {EVENT_VISIBILITY_LABELS[event.visibility] || event.visibility}
                  </span>
                </div>
                <div className="flex items-center gap-4 text-xs text-gray-400">
                  <span>{EVENT_TYPE_LABELS[event.eventType] || event.eventType}</span>
                  {event.startDate && (
                    <span>{formatDate(event.startDate)}</span>
                  )}
                  <span className="flex items-center gap-1">
                    <Users className="w-3 h-3" />
                    {event.registrationCount}名
                  </span>
                </div>
              </div>
              <ExternalLink className="w-4 h-4 text-gray-300 group-hover:text-gray-500 transition-colors flex-shrink-0" />
            </Link>
          </div>
        ))}
      </div>

      {/* Delete confirmation modal */}
      {confirmDelete && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full mx-4 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
                <Trash2 className="w-5 h-5 text-red-600" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">{selectedIds.size}件のイベントを削除</h3>
                <p className="text-sm text-gray-500">この操作は取り消せません</p>
              </div>
            </div>
            {error && <p className="text-sm text-red-500">{error}</p>}
            <div className="flex gap-3">
              <button
                onClick={() => { setConfirmDelete(false); setError(""); }}
                className="flex-1 py-2.5 rounded-lg border border-gray-200 text-gray-600 text-sm font-medium hover:bg-gray-50 transition-colors"
              >
                キャンセル
              </button>
              <button
                onClick={handleDelete}
                disabled={loading}
                className="flex-1 py-2.5 rounded-lg bg-red-600 text-white text-sm font-semibold hover:bg-red-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                削除する
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
