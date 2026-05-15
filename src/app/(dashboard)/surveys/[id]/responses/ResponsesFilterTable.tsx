"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { MessageSquare, X } from "lucide-react";
import { formatDateTime } from "@/lib/utils";

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

type Filters = Record<string, string>;

export default function ResponsesFilterTable({
  surveyId,
  questions,
  responses,
}: {
  surveyId: string;
  questions: Question[];
  responses: Response[];
}) {
  const [filters, setFilters] = useState<Filters>({});

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

      <p className="text-sm text-gray-500">
        {hasActiveFilters
          ? `${filteredResponses.length} / ${responses.length} 件`
          : `${responses.length} 件`}
      </p>

      {filteredResponses.length > 0 ? (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200">
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
                <tr key={response.id} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
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
    </div>
  );
}
