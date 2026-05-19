"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useState } from "react";
import { Search } from "lucide-react";

const EVENT_TYPES = [
  { value: "", label: "すべての種類" },
  { value: "seminar", label: "セミナー" },
  { value: "webinar", label: "ウェビナー" },
  { value: "workshop", label: "ワークショップ" },
  { value: "course", label: "講座" },
  { value: "other", label: "その他" },
];

export default function EventFilters() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const currentType = searchParams.get("type") || "";
  const currentQ = searchParams.get("q") || "";
  const [query, setQuery] = useState(currentQ);

  const updateParams = useCallback(
    (updates: Record<string, string>) => {
      const params = new URLSearchParams(searchParams.toString());
      for (const [key, value] of Object.entries(updates)) {
        if (value) {
          params.set(key, value);
        } else {
          params.delete(key);
        }
      }
      router.push(`/events/public?${params.toString()}`);
    },
    [router, searchParams],
  );

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    updateParams({ q: query });
  };

  return (
    <div className="space-y-4 mb-8">
      {/* 検索バー */}
      <form onSubmit={handleSearch} className="flex justify-center">
        <div className="relative w-full max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="イベント名で検索..."
            className="w-full pl-10 pr-4 py-2 rounded-full border border-gray-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
          />
          {query && (
            <button
              type="button"
              onClick={() => {
                setQuery("");
                updateParams({ q: "" });
              }}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 text-sm"
            >
              &times;
            </button>
          )}
        </div>
      </form>

      {/* イベント種類フィルタ */}
      <div className="flex justify-center flex-wrap gap-2">
        {EVENT_TYPES.map((type) => (
          <button
            key={type.value}
            onClick={() => updateParams({ type: type.value })}
            className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
              currentType === type.value
                ? "bg-indigo-600 text-white"
                : "bg-white text-gray-600 border border-gray-200 hover:bg-gray-50"
            }`}
          >
            {type.label}
          </button>
        ))}
      </div>
    </div>
  );
}
