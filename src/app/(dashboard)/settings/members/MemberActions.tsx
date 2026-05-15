"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, UserMinus } from "lucide-react";
import { changeMemberRole, removeMemberFromOrg } from "../actions";
import { ROLE_LABELS } from "@/lib/utils";

interface MemberActionsProps {
  memberId: string;
  currentRole: string;
  memberName: string;
  currentUserRole: string;
}

export default function MemberActions({ memberId, currentRole, memberName, currentUserRole }: MemberActionsProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [removing, setRemoving] = useState(false);

  // ownerは変更対象外
  if (currentRole === "owner") return null;

  // adminのロール変更・除外はownerのみ
  const canModify = currentRole === "admin" ? currentUserRole === "owner" : true;

  const handleRoleChange = async (newRole: string) => {
    if (newRole === currentRole) return;
    setLoading(true);
    const result = await changeMemberRole(memberId, newRole);
    if (result.error) {
      alert(result.error);
    }
    setLoading(false);
    router.refresh();
  };

  const handleRemove = async () => {
    if (!confirm(`${memberName}さんを組織から除外しますか？`)) return;
    setRemoving(true);
    const result = await removeMemberFromOrg(memberId);
    if (result.error) {
      alert(result.error);
      setRemoving(false);
      return;
    }
    router.refresh();
  };

  // 変更可能なロール一覧
  const roleOptions = ["admin", "editor", "viewer"];

  return (
    <div className="flex items-center gap-2">
      {canModify ? (
        <>
          <select
            value={currentRole}
            onChange={(e) => handleRoleChange(e.target.value)}
            disabled={loading}
            className="text-sm border border-gray-200 rounded-lg px-2 py-1.5 text-gray-600 bg-white hover:border-gray-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent disabled:opacity-50"
          >
            {roleOptions.map((role) => (
              <option key={role} value={role}>
                {ROLE_LABELS[role]}
              </option>
            ))}
          </select>
          <button
            onClick={handleRemove}
            disabled={removing}
            className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
            title="メンバーを除外"
          >
            {removing ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserMinus className="w-4 h-4" />}
          </button>
        </>
      ) : (
        <span className="text-sm text-gray-600">{ROLE_LABELS[currentRole]}</span>
      )}
    </div>
  );
}
