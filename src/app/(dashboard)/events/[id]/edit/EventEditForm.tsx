"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Loader2, Save } from "lucide-react";
import { updateEventAction } from "./actions";

const eventTypes = [
  { value: "seminar", label: "セミナー" },
  { value: "webinar", label: "ウェビナー" },
  { value: "workshop", label: "ワークショップ" },
  { value: "course", label: "講座" },
  { value: "other", label: "その他" },
];

type EventData = {
  id: string;
  title: string;
  description: string | null;
  eventType: string;
  startDate: string | null;
  endDate: string | null;
  location: string | null;
  isOnline: boolean;
  onlineUrl: string | null;
  capacity: number | null;
  status: string;
  visibility: string;
};

export default function EventEditForm({ event }: { event: EventData }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [form, setForm] = useState({
    title: event.title,
    description: event.description || "",
    event_type: event.eventType,
    start_date: event.startDate || "",
    end_date: event.endDate || "",
    location: event.location || "",
    is_online: event.isOnline,
    online_url: event.onlineUrl || "",
    capacity: event.capacity?.toString() || "",
    status: event.status,
    visibility: event.visibility,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    if (form.visibility === "public" && !form.start_date) {
      setError("一般公開するには開催日時を設定してください");
      setLoading(false);
      return;
    }

    const result = await updateEventAction(event.id, form);

    if (result.error) {
      setError(result.error);
      setLoading(false);
      return;
    }

    router.push(`/events/${event.id}`);
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Link href={`/events/${event.id}`} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
          <ArrowLeft className="w-5 h-5 text-gray-500" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">イベントを編集</h1>
          <p className="text-sm text-gray-500">{event.title}</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="bg-white rounded-2xl border border-gray-100 p-6 space-y-6">
        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600">
            {error}
          </div>
        )}

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">
            イベント名 <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
            required
            className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">説明</label>
          <textarea
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            rows={3}
            className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all resize-none"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">イベントタイプ</label>
          <div className="flex flex-wrap gap-2">
            {eventTypes.map((type) => (
              <button
                key={type.value}
                type="button"
                onClick={() => setForm({ ...form, event_type: type.value })}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all border ${
                  form.event_type === type.value
                    ? "border-indigo-500 bg-indigo-50 text-indigo-700"
                    : "border-gray-200 text-gray-600 hover:border-gray-300"
                }`}
              >
                {type.label}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">開催日時</label>
            <input
              type="datetime-local"
              value={form.start_date}
              onChange={(e) => setForm({ ...form, start_date: e.target.value })}
              className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">終了日時</label>
            <input
              type="datetime-local"
              value={form.end_date}
              onChange={(e) => setForm({ ...form, end_date: e.target.value })}
              className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">開催形式</label>
          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => setForm({ ...form, is_online: false })}
              className={`flex-1 py-3 rounded-lg border text-sm font-medium transition-all ${
                !form.is_online ? "border-indigo-500 bg-indigo-50 text-indigo-700" : "border-gray-200 text-gray-600"
              }`}
            >
              オフライン
            </button>
            <button
              type="button"
              onClick={() => setForm({ ...form, is_online: true })}
              className={`flex-1 py-3 rounded-lg border text-sm font-medium transition-all ${
                form.is_online ? "border-indigo-500 bg-indigo-50 text-indigo-700" : "border-gray-200 text-gray-600"
              }`}
            >
              オンライン
            </button>
          </div>
        </div>

        {form.is_online ? (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">開催URL</label>
            <input
              type="url"
              value={form.online_url}
              onChange={(e) => setForm({ ...form, online_url: e.target.value })}
              className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
              placeholder="https://zoom.us/j/..."
            />
          </div>
        ) : (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">会場</label>
            <input
              type="text"
              value={form.location}
              onChange={(e) => setForm({ ...form, location: e.target.value })}
              className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
            />
          </div>
        )}

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">定員</label>
          <input
            type="number"
            value={form.capacity}
            onChange={(e) => setForm({ ...form, capacity: e.target.value })}
            min="1"
            className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">公開ステータス</label>
          <div className="flex gap-3">
            {[
              { value: "draft", label: "下書き" },
              { value: "active", label: "公開中" },
              { value: "closed", label: "終了" },
            ].map((s) => (
              <button
                key={s.value}
                type="button"
                onClick={() => setForm({ ...form, status: s.value })}
                className={`flex-1 py-3 rounded-lg border text-sm font-medium transition-all ${
                  form.status === s.value ? "border-indigo-500 bg-indigo-50 text-indigo-700" : "border-gray-200 text-gray-600"
                }`}
              >
                {s.label}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">公開設定</label>
          <div className="flex gap-3">
            {[
              { value: "draft", label: "下書き" },
              { value: "unlisted", label: "限定公開" },
              { value: "public", label: "一般公開" },
            ].map((v) => (
              <button
                key={v.value}
                type="button"
                onClick={() => setForm({ ...form, visibility: v.value })}
                className={`flex-1 py-3 rounded-lg border text-sm font-medium transition-all ${
                  form.visibility === v.value ? "border-indigo-500 bg-indigo-50 text-indigo-700" : "border-gray-200 text-gray-600"
                }`}
              >
                {v.label}
              </button>
            ))}
          </div>
        </div>

        <div className="flex gap-3 pt-2">
          <Link
            href={`/events/${event.id}`}
            className="flex-1 py-3 rounded-lg border border-gray-200 text-gray-600 text-sm font-medium text-center hover:bg-gray-50 transition-colors"
          >
            キャンセル
          </Link>
          <button
            type="submit"
            disabled={loading || !form.title.trim()}
            className="flex-1 bg-indigo-600 text-white py-3 rounded-lg font-semibold hover:bg-indigo-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {loading && <Loader2 className="w-4 h-4 animate-spin" />}
            <Save className="w-4 h-4" />
            保存する
          </button>
        </div>
      </form>
    </div>
  );
}
