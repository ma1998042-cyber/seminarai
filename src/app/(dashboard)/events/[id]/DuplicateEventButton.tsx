"use client";

import { useState } from "react";
import { Copy, Loader2 } from "lucide-react";
import { duplicateEventAction } from "../actions";
import { useRouter } from "next/navigation";

export default function DuplicateEventButton({ eventId }: { eventId: string }) {
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleDuplicate = async () => {
    setLoading(true);
    const result = await duplicateEventAction(eventId);
    if (result.error) {
      alert(result.error);
      setLoading(false);
      return;
    }
    if (result.eventId) {
      router.push(`/events/${result.eventId}/edit`);
    }
  };

  return (
    <button
      onClick={handleDuplicate}
      disabled={loading}
      className="flex items-center gap-2 px-4 py-2 border border-gray-200 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors disabled:opacity-50"
    >
      {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Copy className="w-4 h-4" />}
      複製
    </button>
  );
}
