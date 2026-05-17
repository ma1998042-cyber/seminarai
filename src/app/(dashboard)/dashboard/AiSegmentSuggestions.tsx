"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Sparkles,
  Send,
  Users,
  RefreshCw,
  AlertCircle,
  ChevronRight,
  Zap,
  Target,
} from "lucide-react";
import type {
  SegmentSuggestion,
  SegmentSuggestionsResponse,
} from "@/app/api/ai/segment-suggestions/route";

const priorityConfig = {
  high: {
    label: "高",
    className: "bg-red-50 text-red-700 border-red-200",
  },
  medium: {
    label: "中",
    className: "bg-amber-50 text-amber-700 border-amber-200",
  },
  low: {
    label: "低",
    className: "bg-green-50 text-green-700 border-green-200",
  },
};

export function AiSegmentSuggestions() {
  const [suggestions, setSuggestions] = useState<SegmentSuggestion[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [generated, setGenerated] = useState(false);
  const [generatedAt, setGeneratedAt] = useState<string | null>(null);

  const fetchSuggestions = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/ai/segment-suggestions");
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "提案の取得に失敗しました");
      }
      const data: SegmentSuggestionsResponse = await res.json();
      setSuggestions(data.suggestions);
      setGeneratedAt(data.generatedAt);
      setGenerated(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "エラーが発生しました");
    } finally {
      setLoading(false);
    }
  };

  const buildCampaignUrl = (suggestion: SegmentSuggestion) => {
    const params = new URLSearchParams();
    if (suggestion.targetTagIds.length > 0) {
      params.set("targetType", "tag");
      params.set("targetTagIds", suggestion.targetTagIds.join(","));
    }
    params.set("subject", suggestion.subjectLine);
    params.set("title", `[AI提案] ${suggestion.segmentName}`);
    return `/campaigns/new?${params.toString()}`;
  };

  // Initial state: prompt to generate
  if (!generated && !loading && !error) {
    return (
      <div className="bg-gradient-to-br from-violet-50 to-indigo-50 rounded-2xl border border-violet-100 p-6">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-10 h-10 bg-violet-100 rounded-xl flex items-center justify-center">
            <Sparkles className="w-5 h-5 text-violet-600" />
          </div>
          <div>
            <h2 className="font-semibold text-gray-900">
              AIセグメント提案
            </h2>
            <p className="text-sm text-gray-500">
              顧客データを分析して最適なメール配信セグメントを提案します
            </p>
          </div>
        </div>
        <button
          onClick={fetchSuggestions}
          className="mt-3 inline-flex items-center gap-2 bg-violet-600 text-white px-5 py-2.5 rounded-lg text-sm font-semibold hover:bg-violet-700 transition-colors"
        >
          <Zap className="w-4 h-4" />
          AI分析を実行
        </button>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl border border-gray-100">
      {/* Header */}
      <div className="flex items-center justify-between p-5 border-b border-gray-50">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-violet-100 rounded-lg flex items-center justify-center">
            <Sparkles className="w-4 h-4 text-violet-600" />
          </div>
          <div>
            <h2 className="font-semibold text-gray-900">AIセグメント提案</h2>
            {generatedAt && (
              <p className="text-xs text-gray-400">
                {new Date(generatedAt).toLocaleString("ja-JP")} に生成
              </p>
            )}
          </div>
        </div>
        <button
          onClick={fetchSuggestions}
          disabled={loading}
          className="text-sm text-violet-600 hover:text-violet-700 font-medium flex items-center gap-1 disabled:opacity-50"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
          再生成
        </button>
      </div>

      {/* Content */}
      <div className="p-5">
        {/* Loading */}
        {loading && (
          <div className="flex flex-col items-center justify-center py-12 gap-3">
            <div className="w-10 h-10 bg-violet-100 rounded-full flex items-center justify-center">
              <RefreshCw className="w-5 h-5 text-violet-600 animate-spin" />
            </div>
            <p className="text-sm text-gray-500">
              顧客データを分析しています...
            </p>
            <p className="text-xs text-gray-400">
              数秒かかる場合があります
            </p>
          </div>
        )}

        {/* Error */}
        {error && !loading && (
          <div className="flex items-start gap-3 p-4 bg-red-50 rounded-xl">
            <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-red-800">{error}</p>
              <button
                onClick={fetchSuggestions}
                className="text-sm text-red-600 hover:text-red-700 underline mt-1"
              >
                再試行
              </button>
            </div>
          </div>
        )}

        {/* Empty state */}
        {generated && !loading && !error && suggestions.length === 0 && (
          <div className="text-center py-8">
            <Target className="w-8 h-8 text-gray-200 mx-auto mb-2" />
            <p className="text-sm text-gray-400">
              顧客データが不足しているため、提案を生成できませんでした
            </p>
            <p className="text-xs text-gray-400 mt-1">
              顧客を追加してから再度お試しください
            </p>
          </div>
        )}

        {/* Suggestion cards */}
        {!loading && !error && suggestions.length > 0 && (
          <div className="space-y-4">
            {suggestions.map((suggestion) => {
              const priority = priorityConfig[suggestion.priority];
              return (
                <div
                  key={suggestion.id}
                  className="border border-gray-100 rounded-xl p-4 hover:border-violet-200 hover:shadow-sm transition-all"
                >
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-semibold text-gray-900 text-sm">
                          {suggestion.segmentName}
                        </h3>
                        <span
                          className={`text-xs px-1.5 py-0.5 rounded border font-medium ${priority.className}`}
                        >
                          優先度: {priority.label}
                        </span>
                      </div>
                      <p className="text-xs text-gray-500">
                        {suggestion.description}
                      </p>
                    </div>
                    <div className="flex items-center gap-1 text-xs text-gray-400 flex-shrink-0">
                      <Users className="w-3.5 h-3.5" />
                      <span>{suggestion.customerCount}名</span>
                    </div>
                  </div>

                  {/* Tags */}
                  {suggestion.targetTagNames.length > 0 && (
                    <div className="flex flex-wrap gap-1 mb-3">
                      {suggestion.targetTagNames.map((tagName) => (
                        <span
                          key={tagName}
                          className="text-xs bg-violet-50 text-violet-700 px-2 py-0.5 rounded-full"
                        >
                          {tagName}
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Email suggestion */}
                  <div className="bg-gray-50 rounded-lg p-3 mb-3">
                    <p className="text-xs text-gray-500 mb-1 font-medium">
                      提案メール件名
                    </p>
                    <p className="text-sm text-gray-800 font-medium">
                      {suggestion.subjectLine}
                    </p>
                    <p className="text-xs text-gray-500 mt-2">
                      {suggestion.emailSuggestion}
                    </p>
                  </div>

                  {/* Action */}
                  <Link
                    href={buildCampaignUrl(suggestion)}
                    className="inline-flex items-center gap-1.5 text-sm font-medium text-violet-600 hover:text-violet-700 transition-colors"
                  >
                    <Send className="w-3.5 h-3.5" />
                    このセグメントにメール送信
                    <ChevronRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
