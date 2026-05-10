"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Loader2, CalendarDays } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

const eventTypes = [
  { value: "seminar", label: "セミナー" },
  { value: "webinar", label: "ウェビナー" },
  { value: "workshop", label: "ワークショップ" },
  { value: "course", label: "講座" },
  { value: "other", label: "その他" },
];

export default function NewEventPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [form, setForm] = useState({
    title: "",
    description: "",
    event_type: "seminar",
    start_date: "",
    end_date: "",
    location: "",
    is_online: false,
    online_url: "",
    capacity: "",
    status: "draft",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { router.push("/auth/login"); return; }

    const { data: profile } = await supabase
      .from("user_profiles")
      .select("current_organization_id")
      .eq("id", user.id)
      .single();

    if (!profile?.current_organization_id) {
      setError("組織が見つかりません");
      setLoading(false);
      return;
    }

    const { data: event, error: err } = await supabase
      .from("events")
      .insert({
        organization_id: profile.current_organization_id,
        title: form.title,
        description: form.description || null,
        event_type: form.event_type,
        start_date: form.start_date || null,
        end_date: form.end_date || null,
        location: form.location || null,
        is_online: form.is_online,
        online_url: form.online_url || null,
        capacity: form.capacity ? parseInt(form.capacity) : null,
        status: form.status,
        created_by: user.id,
      })
      .select()
      .single();

    if (err || !event) {
      setError("イベントの作成に失敗しました");
      setLoading(false);
      return;
    }

    router.push(`/events/${event.id}`);
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/events" className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
          <ArrowLeft className="w-5 h-5 text-gray-500" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">イベントを作成</h1>
          <p className="text-sm text-gray-500">新しいセミナー・イベントの情報を入力してください</p>
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
            placeholder="例：マーケティング入門セミナー2024"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">
            説明
          </label>
          <textarea
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            rows={3}
            className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all resize-none"
            placeholder="イベントの詳細を入力してください"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            イベントタイプ
          </label>
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

        {/* Online/Offline toggle */}
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
              placeholder="例：東京都渋谷区○○ビル3F"
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
            placeholder="例：50"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">公開ステータス</label>
          <div className="flex gap-3">
            {[
              { value: "draft", label: "下書き" },
              { value: "active", label: "公開中" },
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

        <div className="flex gap-3 pt-2">
          <Link
            href="/events"
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
            <CalendarDays className="w-4 h-4" />
            作成する
          </button>
        </div>
      </form>
    </div>
  );
}
