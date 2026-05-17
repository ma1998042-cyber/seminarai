"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { Search, Loader2, X, Check, Users } from "lucide-react";
import { cn } from "@/lib/utils";
import { getAllCustomersForSelection, getTagsForOrg } from "./actions";

interface CustomerItem {
  id: string;
  fullName: string | null;
  email: string;
  company: string | null;
  tags: { id: string; name: string; color: string }[];
}

interface CustomerSelectorProps {
  selectedIds: string[];
  onChange: (ids: string[]) => void;
}

export default function CustomerSelector({ selectedIds, onChange }: CustomerSelectorProps) {
  const [customers, setCustomers] = useState<CustomerItem[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [filterTagId, setFilterTagId] = useState("");
  const [tags, setTags] = useState<{ id: string; name: string; color: string }[]>([]);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();

  // タグ一覧を取得
  useEffect(() => {
    getTagsForOrg().then(setTags);
  }, []);

  // 顧客一覧を取得
  const fetchCustomers = useCallback(async (searchVal: string, tagId: string) => {
    setLoading(true);
    try {
      const result = await getAllCustomersForSelection({
        search: searchVal || undefined,
        tagId: tagId || undefined,
      });
      setCustomers(result.customers);
      setTotal(result.total);
    } catch {
      setCustomers([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCustomers("", "");
  }, [fetchCustomers]);

  // 検索のデバウンス
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      fetchCustomers(search, filterTagId);
    }, 300);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [search, filterTagId, fetchCustomers]);

  const toggleCustomer = (id: string) => {
    if (selectedIds.includes(id)) {
      onChange(selectedIds.filter((i) => i !== id));
    } else {
      onChange([...selectedIds, id]);
    }
  };

  const toggleAll = () => {
    const allCurrentIds = customers.map((c) => c.id);
    const allSelected = allCurrentIds.every((id) => selectedIds.includes(id));
    if (allSelected) {
      // 現在表示中の全顧客を解除
      onChange(selectedIds.filter((id) => !allCurrentIds.includes(id)));
    } else {
      // 現在表示中の全顧客を追加（重複除去）
      const merged = new Set([...selectedIds, ...allCurrentIds]);
      onChange(Array.from(merged));
    }
  };

  const clearAll = () => {
    onChange([]);
  };

  const allCurrentSelected = customers.length > 0 && customers.every((c) => selectedIds.includes(c.id));
  const someCurrentSelected = customers.some((c) => selectedIds.includes(c.id)) && !allCurrentSelected;

  return (
    <div className="space-y-3">
      <label className="block text-sm font-medium text-gray-700">配信する顧客を選択</label>

      {/* 検索・フィルタ */}
      <div className="flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="名前・メール・会社名で検索..."
            className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
          />
          {search && (
            <button
              type="button"
              onClick={() => setSearch("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
        {tags.length > 0 && (
          <select
            value={filterTagId}
            onChange={(e) => setFilterTagId(e.target.value)}
            className="px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white min-w-[160px]"
          >
            <option value="">全てのタグ</option>
            {tags.map((tag) => (
              <option key={tag.id} value={tag.id}>
                {tag.name}
              </option>
            ))}
          </select>
        )}
      </div>

      {/* 選択状況バー */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Users className="w-4 h-4 text-indigo-500" />
          <span className="text-sm text-gray-600">
            <span className="font-semibold text-indigo-600">{selectedIds.length}名</span> 選択中
            {total > 0 && (
              <span className="text-gray-400 ml-1">/ {total}名</span>
            )}
          </span>
        </div>
        {selectedIds.length > 0 && (
          <button
            type="button"
            onClick={clearAll}
            className="text-xs text-gray-500 hover:text-gray-700 transition-colors"
          >
            選択をすべて解除
          </button>
        )}
      </div>

      {/* テーブル */}
      <div className="border border-gray-200 rounded-lg overflow-hidden max-h-[400px] overflow-y-auto">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-5 h-5 animate-spin text-gray-400" />
            <span className="ml-2 text-sm text-gray-400">読み込み中...</span>
          </div>
        ) : customers.length === 0 ? (
          <div className="text-center py-12 text-sm text-gray-400">
            該当する顧客が見つかりません
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="sticky top-0 z-10">
              <tr className="bg-gray-50 text-gray-500 text-xs">
                <th className="px-3 py-2.5 w-10">
                  <input
                    type="checkbox"
                    checked={allCurrentSelected}
                    ref={(el) => {
                      if (el) el.indeterminate = someCurrentSelected;
                    }}
                    onChange={toggleAll}
                    className="w-4 h-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                  />
                </th>
                <th className="text-left px-3 py-2.5 font-medium">名前</th>
                <th className="text-left px-3 py-2.5 font-medium">メールアドレス</th>
                <th className="text-left px-3 py-2.5 font-medium hidden sm:table-cell">会社</th>
                <th className="text-left px-3 py-2.5 font-medium hidden sm:table-cell">タグ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {customers.map((customer) => {
                const isSelected = selectedIds.includes(customer.id);
                return (
                  <tr
                    key={customer.id}
                    onClick={() => toggleCustomer(customer.id)}
                    className={cn(
                      "hover:bg-gray-50 transition-colors cursor-pointer",
                      isSelected && "bg-indigo-50/50"
                    )}
                  >
                    <td className="px-3 py-2.5">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleCustomer(customer.id)}
                        onClick={(e) => e.stopPropagation()}
                        className="w-4 h-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                      />
                    </td>
                    <td className="px-3 py-2.5">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 bg-indigo-100 rounded-full flex items-center justify-center flex-shrink-0">
                          <span className="text-xs font-bold text-indigo-700">
                            {(customer.fullName || customer.email || "U").charAt(0).toUpperCase()}
                          </span>
                        </div>
                        <span className="text-gray-900 font-medium truncate max-w-[140px]">
                          {customer.fullName || <span className="text-gray-400">未設定</span>}
                        </span>
                      </div>
                    </td>
                    <td className="px-3 py-2.5 text-gray-600 truncate max-w-[200px]">
                      {customer.email}
                    </td>
                    <td className="px-3 py-2.5 text-gray-600 hidden sm:table-cell truncate max-w-[120px]">
                      {customer.company || <span className="text-gray-300">--</span>}
                    </td>
                    <td className="px-3 py-2.5 hidden sm:table-cell">
                      <div className="flex flex-wrap gap-1">
                        {customer.tags.slice(0, 2).map((tag) => (
                          <span
                            key={tag.id}
                            className="inline-flex items-center px-1.5 py-0.5 rounded-full text-xs font-medium text-white"
                            style={{ backgroundColor: tag.color }}
                          >
                            {tag.name}
                          </span>
                        ))}
                        {customer.tags.length > 2 && (
                          <span className="text-xs text-gray-400">+{customer.tags.length - 2}</span>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {total > 200 && (
        <p className="text-xs text-gray-400 text-center">
          検索結果が200件を超えています。検索やタグで絞り込んでください。
        </p>
      )}
    </div>
  );
}
