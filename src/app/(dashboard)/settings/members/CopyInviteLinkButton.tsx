"use client";

import { useState } from "react";
import { Copy, Check } from "lucide-react";

export default function CopyInviteLinkButton({ token }: { token: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    const url = `${window.location.origin}/invite/${token}`;
    await navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <button
      onClick={handleCopy}
      className="text-xs text-gray-500 hover:text-indigo-600 flex items-center gap-1 transition-colors"
      title="招待リンクをコピー"
    >
      {copied ? (
        <>
          <Check className="w-3.5 h-3.5 text-green-500" />
          <span className="text-green-500">コピー済み</span>
        </>
      ) : (
        <>
          <Copy className="w-3.5 h-3.5" />
          <span>リンクをコピー</span>
        </>
      )}
    </button>
  );
}
