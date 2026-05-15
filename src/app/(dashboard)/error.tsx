"use client";

import { useEffect } from "react";
import { AlertTriangle, RotateCcw } from "lucide-react";

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex items-center justify-center min-h-[50vh]">
      <div className="bg-white rounded-2xl border border-gray-100 p-8 max-w-md w-full text-center">
        <div className="w-12 h-12 bg-red-50 rounded-xl flex items-center justify-center mx-auto mb-4">
          <AlertTriangle className="w-6 h-6 text-red-600" />
        </div>
        <h2 className="text-lg font-semibold text-gray-900 mb-2">
          エラーが発生しました
        </h2>
        <p className="text-sm text-gray-500 mb-6">
          {error.message || "予期しないエラーが発生しました。もう一度お試しください。"}
        </p>
        <button
          onClick={reset}
          className="inline-flex items-center gap-2 bg-indigo-600 text-white px-5 py-2.5 rounded-lg text-sm font-semibold hover:bg-indigo-700 transition-colors"
        >
          <RotateCcw className="w-4 h-4" />
          もう一度試す
        </button>
      </div>
    </div>
  );
}
