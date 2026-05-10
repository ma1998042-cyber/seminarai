"use client";

import { useRouter, usePathname } from "next/navigation";
import { Search } from "lucide-react";
import { useCallback } from "react";

interface Event {
  id: string;
  title: string;
}

interface SurveySearchProps {
  events: Event[];
  currentQ?: string;
  currentEvent?: string;
  currentStatus?: string;
}

const statusOptions = [
  { value: "", label: "すべてのステータス" },
  { value: "draft", label: "下書き" },
  { value: "active", label: "公開中" },
  { value: "closed", label: "終了" },
  { value: "archived", label: "アーカイブ" },
];

export default function SurveySearch({ events, currentQ, currentEvent, currentStatus }: SurveySearchProps) {
  const router = useRouter();
  const pathname = usePathname();

  const updateParams = useCallback((key: string, value: string) => {
    const params = new URLSearchParams();
    if (key !== "q" && currentQ) params.set("q", currentQ);
    if (key !== "event" && currentEvent) params.set("event", currentEvent);
    if (key !== "status" && currentStatus) params.set("status", currentStatus);
    if (value) params.set(key, value);
    const qs = params.toString();
    router.push(qs ? `${pathname}?${qs}` : pathname);
  }, [router, pathname, currentQ, currentEvent, currentStatus]);

  return (
    <div className="flex flex-col sm:flex-row gap-3">
      <div className="relative flex-1">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input
          type="text"
          placeholder="アンケート名で検索..."
          defaultValue={currentQ ?? ""}
          onChange={(e) => {
            const val = e.target.value;
            clearTimeout((window as any).__surveySearchTimer);
            (window as any).__surveySearchTimer = setTimeout(() => updateParams("q", val), 400);
          }}
          className="w-full pl-9 pr-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
        />
      </div>

      <select
        value={currentEvent ?? ""}
        onChange={(e) => updateParams("event", e.target.value)}
        className="px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white text-gray-700"
      >
        <option value="">すべてのイベント</option>
        {events.map((ev) => (
          <option key={ev.id} value={ev.id}>{ev.title}</option>
        ))}
      </select>

      <select
        value={currentStatus ?? ""}
        onChange={(e) => updateParams("status", e.target.value)}
        className="px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white text-gray-700"
      >
        {statusOptions.map((s) => (
          <option key={s.value} value={s.value}>{s.label}</option>
        ))}
      </select>
    </div>
  );
}
