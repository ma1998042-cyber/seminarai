"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Trash2, Loader2 } from "lucide-react";
import { deleteSurveyAction } from "./actions";

interface DeleteSurveyButtonProps {
  surveyId: string;
  redirectTo?: string;
  variant?: "default" | "icon";
}

export default function DeleteSurveyButton({ surveyId, redirectTo = "/surveys", variant = "default" }: DeleteSurveyButtonProps) {
  const router = useRouter();
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleDelete = async () => {
    setLoading(true);
    setError("");
    const result = await deleteSurveyAction(surveyId);
    if (result.error) {
      setError(result.error);
      setLoading(false);
      return;
    }
    router.push(redirectTo);
    router.refresh();
  };

  return (
    <>
      {variant === "icon" ? (
        <button
          onClick={(e) => { e.preventDefault(); e.stopPropagation(); setConfirmDelete(true); }}
          className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
          title="削除"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      ) : (
        <button
          onClick={() => setConfirmDelete(true)}
          className="px-4 py-2 border border-red-200 rounded-lg text-sm font-medium text-red-600 hover:bg-red-50 transition-colors flex items-center gap-1.5"
        >
          <Trash2 className="w-4 h-4" />
          削除
        </button>
      )}

      {confirmDelete && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full mx-4 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
                <Trash2 className="w-5 h-5 text-red-600" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">アンケートを削除</h3>
                <p className="text-sm text-gray-500">回答データも含めてすべて削除されます。この操作は取り消せません。</p>
              </div>
            </div>
            {error && (
              <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">{error}</p>
            )}
            <div className="flex gap-3">
              <button
                onClick={() => { setConfirmDelete(false); setError(""); }}
                className="flex-1 py-2.5 rounded-lg border border-gray-200 text-gray-600 text-sm font-medium hover:bg-gray-50 transition-colors"
              >
                キャンセル
              </button>
              <button
                onClick={handleDelete}
                disabled={loading}
                className="flex-1 py-2.5 rounded-lg bg-red-600 text-white text-sm font-semibold hover:bg-red-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                削除する
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
