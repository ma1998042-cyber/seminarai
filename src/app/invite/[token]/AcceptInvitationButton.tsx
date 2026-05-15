"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { acceptInvitationAction } from "./actions";

type Props = {
  invitationId: string;
  token: string;
};

export default function AcceptInvitationButton({ invitationId, token }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleAccept() {
    setLoading(true);
    setError(null);
    try {
      const result = await acceptInvitationAction(invitationId, token);
      if (result.error) {
        setError(result.error);
        setLoading(false);
      } else {
        router.push("/dashboard");
      }
    } catch {
      setError("エラーが発生しました。もう一度お試しください。");
      setLoading(false);
    }
  }

  return (
    <div className="space-y-3">
      <button
        onClick={handleAccept}
        disabled={loading}
        className="w-full px-6 py-3 bg-indigo-600 text-white text-sm font-medium rounded-xl hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {loading ? "参加中..." : "この組織に参加する"}
      </button>
      <a
        href="/dashboard"
        className="block w-full text-center px-6 py-3 text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors"
      >
        キャンセル
      </a>
      {error && (
        <p className="text-sm text-red-600 text-center">{error}</p>
      )}
    </div>
  );
}
