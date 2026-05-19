"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { deleteCaseStudyAction } from "./actions";

export default function CaseStudyDeleteButton({ id, title }: { id: string; title: string }) {
  const router = useRouter();
  const [deleting, setDeleting] = useState(false);

  async function handleDelete() {
    if (!confirm(`「${title}」を削除してもよろしいですか？`)) return;
    setDeleting(true);
    const result = await deleteCaseStudyAction(id);
    if (result.error) {
      alert(result.error);
      setDeleting(false);
      return;
    }
    router.refresh();
  }

  return (
    <button
      onClick={handleDelete}
      disabled={deleting}
      className="inline-flex items-center gap-1 text-xs text-red-600 hover:text-red-800 font-medium disabled:opacity-50"
    >
      <Trash2 className="w-3.5 h-3.5" />
      {deleting ? "削除中..." : "削除"}
    </button>
  );
}
