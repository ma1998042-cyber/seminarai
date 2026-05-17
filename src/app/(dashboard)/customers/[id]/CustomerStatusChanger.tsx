"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";
import { updateCustomerStatusId } from "../actions";

interface StatusOption {
  id: string;
  name: string;
  color: string;
}

interface Props {
  customerId: string;
  currentStatusId: string | null;
  allStatuses: StatusOption[];
}

export default function CustomerStatusChanger({ customerId, currentStatusId, allStatuses }: Props) {
  const [statusId, setStatusId] = useState(currentStatusId ?? "");
  const [loading, setLoading] = useState(false);
  const [saved, setSaved] = useState(false);

  const handleChange = async (newStatusId: string) => {
    setStatusId(newStatusId);
    setLoading(true);
    setSaved(false);

    const result = await updateCustomerStatusId(customerId, newStatusId || null);
    setLoading(false);
    if (!result.error) {
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    }
  };

  const currentStatus = allStatuses.find(s => s.id === statusId);

  if (allStatuses.length === 0) return null;

  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-5 space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-gray-700">習熟度</h3>
        {loading && <Loader2 className="w-3.5 h-3.5 animate-spin text-gray-400" />}
        {saved && <span className="text-xs text-green-600">保存しました</span>}
      </div>

      {currentStatus && (
        <div className="flex items-center gap-2">
          <span
            className="text-xs px-2.5 py-1 rounded-full font-medium"
            style={{ backgroundColor: currentStatus.color + "20", color: currentStatus.color }}
          >
            {currentStatus.name}
          </span>
        </div>
      )}

      <select
        value={statusId}
        onChange={(e) => handleChange(e.target.value)}
        disabled={loading}
        className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white text-gray-700 disabled:opacity-50"
      >
        <option value="">未設定</option>
        {allStatuses.map((s) => (
          <option key={s.id} value={s.id}>{s.name}</option>
        ))}
      </select>
    </div>
  );
}
