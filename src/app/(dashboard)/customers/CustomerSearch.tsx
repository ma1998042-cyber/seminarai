"use client";

import { useRouter, usePathname } from "next/navigation";
import { Search } from "lucide-react";
import { useCallback } from "react";

interface Tag { id: string; name: string; color: string }

const statusOptions = [
  { value: "", label: "すべてのステータス" },
  { value: "active", label: "有効" },
  { value: "unsubscribed", label: "配信停止" },
  { value: "bounced", label: "バウンス" },
  { value: "blocked", label: "ブロック" },
];

export default function CustomerSearch({
  tags, currentQ, currentTag, currentStatus,
}: {
  tags: Tag[];
  currentQ?: string;
  currentTag?: string;
  currentStatus?: string;
}) {
  const router = useRouter();
  const pathname = usePathname();

  const update = useCallback((key: string, value: string) => {
    const params = new URLSearchParams();
    if (key !== "q" && currentQ) params.set("q", currentQ);
    if (key !== "tag" && currentTag) params.set("tag", currentTag);
    if (key !== "status" && currentStatus) params.set("status", currentStatus);
    if (value) params.set(key, value);
    const qs = params.toString();
    router.push(qs ? `${pathname}?${qs}` : pathname);
  }, [router, pathname, currentQ, currentTag, currentStatus]);

  return (
    <div className="flex flex-col sm:flex-row gap-3">
      <div className="relative flex-1">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input
          type="text"
          placeholder="名前・メールで検索..."
          defaultValue={currentQ ?? ""}
          onChange={(e) => {
            const val = e.target.value;
            clearTimeout((window as any).__custSearchTimer);
            (window as any).__custSearchTimer = setTimeout(() => update("q", val), 400);
          }}
          className="w-full pl-9 pr-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
        />
      </div>

      {tags.length > 0 && (
        <select
          value={currentTag ?? ""}
          onChange={(e) => update("tag", e.target.value)}
          className="px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white text-gray-700"
        >
          <option value="">すべてのタグ</option>
          {tags.map((t) => (
            <option key={t.id} value={t.id}>{t.name}</option>
          ))}
        </select>
      )}

      <select
        value={currentStatus ?? ""}
        onChange={(e) => update("status", e.target.value)}
        className="px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white text-gray-700"
      >
        {statusOptions.map((s) => (
          <option key={s.value} value={s.value}>{s.label}</option>
        ))}
      </select>
    </div>
  );
}
