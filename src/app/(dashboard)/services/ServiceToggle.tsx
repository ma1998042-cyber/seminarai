"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { toggleServicePublishAction } from "./actions";

export default function ServiceToggle({
  id,
  isPublished,
}: {
  id: string;
  isPublished: boolean;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleToggle() {
    setLoading(true);
    await toggleServicePublishAction(id);
    router.refresh();
    setLoading(false);
  }

  return (
    <button
      onClick={handleToggle}
      disabled={loading}
      className={`inline-flex px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${
        isPublished
          ? "bg-green-100 text-green-700 hover:bg-green-200"
          : "bg-gray-100 text-gray-600 hover:bg-gray-200"
      } disabled:opacity-50`}
    >
      {isPublished ? "公開中" : "非公開"}
    </button>
  );
}
