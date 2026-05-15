"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { X, Loader2 } from "lucide-react";
import { cancelInvitation } from "../actions";

export default function CancelInvitationButton({ invitationId }: { invitationId: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const handleCancel = async () => {
    if (!confirm("この招待を取り消しますか？")) return;

    setLoading(true);
    const result = await cancelInvitation(invitationId);

    if (result.error) {
      alert(result.error);
      setLoading(false);
      return;
    }

    router.refresh();
  };

  return (
    <button
      onClick={handleCancel}
      disabled={loading}
      className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
      title="招待を取り消す"
    >
      {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <X className="w-4 h-4" />}
    </button>
  );
}
