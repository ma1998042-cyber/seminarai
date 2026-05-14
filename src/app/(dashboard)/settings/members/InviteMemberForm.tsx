"use client";

import { useState } from "react";
import { UserPlus, Loader2, Send } from "lucide-react";
import { inviteMember } from "../actions";

interface InviteMemberFormProps {
  orgId: string;
}

export default function InviteMemberForm({ orgId }: InviteMemberFormProps) {
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("editor");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setSuccess(false);

    const result = await inviteMember(orgId, email, role);

    if (result.error) {
      setError(result.error);
      setLoading(false);
      return;
    }

    setSuccess(true);
    setEmail("");
    setLoading(false);
  };

  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-6">
      <div className="flex items-center gap-2 mb-4">
        <UserPlus className="w-5 h-5 text-indigo-600" />
        <h2 className="font-semibold text-gray-900">メンバーを招待</h2>
      </div>

      {success && (
        <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg text-sm text-green-700">
          招待メールを送信しました
        </div>
      )}

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600">
          {error}
        </div>
      )}

      <form onSubmit={handleInvite} className="space-y-4">
        <div className="flex gap-3">
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="flex-1 px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all text-sm"
            placeholder="メールアドレスを入力"
          />
          <select
            value={role}
            onChange={(e) => setRole(e.target.value)}
            className="px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all text-sm bg-white"
          >
            <option value="admin">管理者</option>
            <option value="editor">編集者</option>
            <option value="viewer">閲覧者</option>
          </select>
          <button
            type="submit"
            disabled={loading || !email.trim()}
            className="flex items-center gap-2 bg-indigo-600 text-white px-5 py-3 rounded-lg text-sm font-semibold hover:bg-indigo-700 transition-colors disabled:opacity-50"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            招待
          </button>
        </div>
      </form>
    </div>
  );
}
