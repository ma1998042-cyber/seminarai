"use client";

import { useState, useMemo, useTransition } from "react";
import Link from "next/link";
import { MessageSquare, X, Tag, Check } from "lucide-react";
import { formatDateTime } from "@/lib/utils";
import { bulkAssignTag } from "./actions";

type Question = {
  id: string;
  sortOrder: number;
  questionType: string;
  title: string;
  options: unknown[] | null;
};

type Response = {
  id: string;
  respondentName: string | null;
  respondentEmail: string | null;
  answers: Record<string, unknown>;
  submittedAt: string;
};

type TagItem = {
  id: string;
  name: string;
  color: string;
};

type Filters = Record<string, string>;

export default function ResponsesFilterTable({
  surveyId,
  organizationId,
  questions,
  responses,
  tags,
}: {
  surveyId: string;
  organizationId: string;
  questions: Question[];
  responses: Response[];
  tags: TagItem[];
}) {
  const [filters, setFilters] = useState<Filters>({});
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [showTagModal, setShowTagModal] = useState(false);
  const [selectedTagId, setSelectedTagId] = useState<string>("");
  const [isPending, startTransition] = useTransition();
  const [result, setResult] = useState<{ message: string; type: "success" | "error" } | null>(null);

  const selectQuestions = useMemo(
    () => questions.filter((q) => ["radio", "select", "checkbox"].includes(q.questionType) && q.options?.length),
    [questions],
  );

  const filteredResponses = useMemo(() => {
    return responses.filter((r) => {
      return Object.entries(filters).every(([questionId, value]) => {
        if (!value) return true;
        const answer = r.answers[questionId];
        if (Array.isArray(answer)) return answer.includes(value);
        return String(answer) === value;
      });
    });
  }, [responses, filters]);

  const hasActiveFilters = Object.values(filters).some(Boolean);

  const allSelected = filteredResponses.length > 0 && filteredResponses.every((r) => selectedIds.has(r.id));

  const toggleAll = () => {
    if (allSelected) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredResponses.map((r) => r.id)));
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

  const selectedEmails = useMemo(() => {
    return responses
      .filter((r) => selectedIds.has(r.id) && r.respondentEmail)
      .map((r) => r.respondentEmail!);
  }, [responses, selectedIds]);

  const handleOpenTagModal = () => {
    setSelectedTagId("");
    setResult(null);
    setShowTagModal(true);
  };

  const handleAssignTag = () => {
    if (!selectedTagId || selectedEmails.length === 0) return;
    startTransition(async () => {
      const res = await bulkAssignTag(organizationId, selectedEmails, selectedTagId);
      if (res.error) {
        setResult({ message: res.error, type: "error" });
      } else {
        const parts: string[] = [];
        if (res.assigned && res.assigned > 0) parts.push(`${res.assigned}件にタグを付与しました`);
        if (res.alreadyAssigned && res.alreadyAssigned > 0) parts.push(`${res.alreadyAssigned}件は既にタグ付与済み`);
        if (res.skipped && res.skipped > 0) parts.push(`${res.skipped}件は顧客未登録のためスキップ`);
        setResult({ message: parts.join("、"), type: "success" });
        setSelectedIds(new Set());
      }
    });
  };

  return (
    <div className="space-y-4">
      {selectQuestions.length > 0 && (
        <div className="flex flex-wrap items-center gap-3">
          {selectQuestions.map((q) => (
            <div key={q.id} className="flex flex-col gap-1">
              <label className="text-xs text-gray-500 font-medium truncate max-w-[200px]">{q.title}</label>
              <select
                value={filters[q.id] || ""}
                onChange={(e) => setFilters((prev) => ({ ...prev, [q.id]: e.target.value }))}
                className="text-sm border border-gray-200 rounded-lg px-3 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="">すべて</option>
                {(q.options as string[]).map((opt) => (
                  <option key={String(opt)} value={String(opt)}>
                    {String(opt)}
                  </option>
                ))}
              </select>
            </div>
          ))}
          {hasActiveFilters && (
            <button
              onClick={() => setFilters({})}
              className="self-end flex items-center gap-1 text-xs text-gray-500 hover:text-gray-700 px-2 py-1.5 rounded-lg hover:bg-gray-100 transition-colors"
            >
              <X className="w-3 h-3" />
              リセット
            </button>
          )}
        </div>
      )}

      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-500">
          {hasActiveFilters
            ? `${filteredResponses.length} / ${responses.length} 件`
            : `${responses.length} 件`}
          {selectedIds.size > 0 && (
            <span className="ml-2 text-indigo-600 font-medium">({selectedIds.size}件選択中)</span>
          )}
        </p>
        {selectedIds.size > 0 && tags.length > 0 && (
          <button
            onClick={handleOpenTagModal}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 transition-colors"
          >
            <Tag className="w-4 h-4" />
            選択した回答者にタグ付与
          </button>
        )}
      </div>

      {result && (
        <div
          className={`px-4 py-3 rounded-lg text-sm ${
            result.type === "success"
              ? "bg-green-50 text-green-700 border border-green-200"
              : "bg-red-50 text-red-700 border border-red-200"
          }`}
        >
          {result.message}
          <button
            onClick={() => setResult(null)}
            className="ml-2 text-current opacity-60 hover:opacity-100"
          >
            <X className="w-3.5 h-3.5 inline" />
          </button>
        </div>
      )}

      {filteredResponses.length > 0 ? (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="py-2 px-3 w-10">
                  <input
                    type="checkbox"
                    checked={allSelected}
                    onChange={toggleAll}
                    className="w-4 h-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                  />
                </th>
                <th className="text-left py-2 px-3 text-gray-500 font-medium whitespace-nowrap">回答者</th>
                <th className="text-left py-2 px-3 text-gray-500 font-medium whitespace-nowrap">メール</th>
                <th className="text-left py-2 px-3 text-gray-500 font-medium whitespace-nowrap">回答日時</th>
                {selectQuestions.map((q) => (
                  <th key={q.id} className="text-left py-2 px-3 text-gray-500 font-medium whitespace-nowrap max-w-[200px] truncate">
                    {q.title}
                  </th>
                ))}
                <th className="py-2 px-3"></th>
              </tr>
            </thead>
            <tbody>
              {filteredResponses.map((response) => (
                <tr key={response.id} className={`border-b border-gray-50 hover:bg-gray-50 transition-colors ${selectedIds.has(response.id) ? "bg-indigo-50/50" : ""}`}>
                  <td className="py-2.5 px-3">
                    <input
                      type="checkbox"
                      checked={selectedIds.has(response.id)}
                      onChange={() => toggleOne(response.id)}
                      className="w-4 h-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                    />
                  </td>
                  <td className="py-2.5 px-3 text-gray-700 whitespace-nowrap">
                    {response.respondentName || "匿名"}
                  </td>
                  <td className="py-2.5 px-3 text-gray-500 whitespace-nowrap">
                    {response.respondentEmail || "-"}
                  </td>
                  <td className="py-2.5 px-3 text-gray-400 whitespace-nowrap">
                    {formatDateTime(response.submittedAt)}
                  </td>
                  {selectQuestions.map((q) => {
                    const answer = response.answers[q.id];
                    const display = Array.isArray(answer) ? answer.join(", ") : answer ? String(answer) : "-";
                    return (
                      <td key={q.id} className="py-2.5 px-3 text-gray-600 whitespace-nowrap max-w-[200px] truncate">
                        {display}
                      </td>
                    );
                  })}
                  <td className="py-2.5 px-3 text-right">
                    <Link
                      href={`/surveys/${surveyId}/responses/${response.id}`}
                      className="text-xs text-indigo-600 font-medium hover:text-indigo-800"
                    >
                      詳細
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="text-center py-12">
          <MessageSquare className="w-10 h-10 text-gray-200 mx-auto mb-3" />
          <p className="text-sm text-gray-400">
            {hasActiveFilters ? "フィルタに一致する回答がありません" : "まだ回答がありません"}
          </p>
        </div>
      )}

      {/* タグ選択モーダル */}
      {showTagModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/40" onClick={() => setShowTagModal(false)} />
          <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-md mx-4 p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-gray-900">タグを選択</h3>
              <button
                onClick={() => setShowTagModal(false)}
                className="p-1 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-gray-400" />
              </button>
            </div>
            <p className="text-sm text-gray-500 mb-4">
              {selectedIds.size}件の回答者に付与するタグを選択してください
            </p>
            <div className="space-y-2 max-h-60 overflow-y-auto mb-6">
              {tags.map((tag) => (
                <button
                  key={tag.id}
                  onClick={() => setSelectedTagId(tag.id)}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg border transition-colors text-left ${
                    selectedTagId === tag.id
                      ? "border-indigo-500 bg-indigo-50"
                      : "border-gray-200 hover:bg-gray-50"
                  }`}
                >
                  <span
                    className="w-3 h-3 rounded-full shrink-0"
                    style={{ backgroundColor: tag.color }}
                  />
                  <span className="text-sm font-medium text-gray-700 flex-1">{tag.name}</span>
                  {selectedTagId === tag.id && (
                    <Check className="w-4 h-4 text-indigo-600" />
                  )}
                </button>
              ))}
            </div>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setShowTagModal(false)}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
              >
                キャンセル
              </button>
              <button
                onClick={handleAssignTag}
                disabled={!selectedTagId || isPending}
                className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {isPending ? "処理中..." : "タグを付与"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
