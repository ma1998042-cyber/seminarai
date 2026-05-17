"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ClipboardList, Mail } from "lucide-react";
import { formatDate, cn } from "@/lib/utils";

interface CustomerTag {
  id: string;
  name: string;
  color: string;
}

interface CustomerStatusBadge {
  id: string;
  name: string;
  color: string;
}

interface Customer {
  id: string;
  email: string;
  fullName: string | null;
  company: string | null;
  jobTitle: string | null;
  status: string;
  statusId: string | null;
  customerStatus: CustomerStatusBadge | null;
  createdAt: string;
  customerTags: { tag: CustomerTag }[];
}

interface CustomerTableProps {
  customerList: Customer[];
  surveyCountMap: Record<string, number>;
  statusColors: Record<string, string>;
  statusLabels: Record<string, string>;
}

export default function CustomerTable({
  customerList,
  surveyCountMap,
  statusColors,
  statusLabels,
}: CustomerTableProps) {
  const router = useRouter();
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const allSelected = customerList.length > 0 && selectedIds.size === customerList.length;
  const someSelected = selectedIds.size > 0 && !allSelected;

  const toggleAll = () => {
    if (allSelected) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(customerList.map((c) => c.id)));
    }
  };

  const toggleOne = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handleSendEmail = () => {
    const ids = Array.from(selectedIds).join(",");
    router.push(`/campaigns/new?targetType=specific_customers&customerIds=${ids}`);
  };

  return (
    <>
      {selectedIds.size > 0 && (
        <div className="flex items-center gap-3 bg-indigo-50 border border-indigo-200 rounded-xl px-4 py-3">
          <span className="text-sm font-medium text-indigo-700">
            {selectedIds.size}名を選択中
          </span>
          <button
            onClick={handleSendEmail}
            className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-indigo-700 transition-colors"
          >
            <Mail className="w-4 h-4" />
            選択した顧客にメール送信
          </button>
          <button
            onClick={() => setSelectedIds(new Set())}
            className="text-sm text-gray-500 hover:text-gray-700 transition-colors ml-auto"
          >
            選択解除
          </button>
        </div>
      )}

      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-50 bg-gray-50/50">
              <th className="px-4 py-3.5 w-10">
                <input
                  type="checkbox"
                  checked={allSelected}
                  ref={(el) => {
                    if (el) el.indeterminate = someSelected;
                  }}
                  onChange={toggleAll}
                  className="w-4 h-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                />
              </th>
              <th className="text-left px-6 py-3.5 text-xs font-semibold text-gray-400 uppercase tracking-wider">顧客</th>
              <th className="text-left px-6 py-3.5 text-xs font-semibold text-gray-400 uppercase tracking-wider">会社・役職</th>
              <th className="text-left px-6 py-3.5 text-xs font-semibold text-gray-400 uppercase tracking-wider">ステータス</th>
              <th className="text-left px-6 py-3.5 text-xs font-semibold text-gray-400 uppercase tracking-wider">習熟度</th>
              <th className="text-left px-6 py-3.5 text-xs font-semibold text-gray-400 uppercase tracking-wider">タグ</th>
              <th className="text-left px-6 py-3.5 text-xs font-semibold text-gray-400 uppercase tracking-wider">回答数</th>
              <th className="text-left px-6 py-3.5 text-xs font-semibold text-gray-400 uppercase tracking-wider">登録日</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {customerList.map((customer) => {
              const customerTags = (customer.customerTags as any[])
                ?.map((ct: any) => ct.tag)
                .filter(Boolean) ?? [];
              const isSelected = selectedIds.has(customer.id);
              return (
                <tr
                  key={customer.id}
                  className={cn(
                    "hover:bg-gray-50 transition-colors",
                    isSelected && "bg-indigo-50/50"
                  )}
                >
                  <td className="px-4 py-4">
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => toggleOne(customer.id)}
                      className="w-4 h-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                    />
                  </td>
                  <td className="px-6 py-4">
                    <Link href={`/customers/${customer.id}`} className="flex items-center gap-3 group">
                      <div className="w-9 h-9 bg-indigo-100 rounded-full flex items-center justify-center flex-shrink-0">
                        <span className="text-sm font-bold text-indigo-700">
                          {(customer.fullName || customer.email || "U").charAt(0).toUpperCase()}
                        </span>
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-gray-900 group-hover:text-indigo-600 transition-colors">
                          {customer.fullName || "名前なし"}
                        </p>
                        <p className="text-xs text-gray-400">{customer.email}</p>
                      </div>
                    </Link>
                  </td>
                  <td className="px-6 py-4">
                    <p className="text-sm text-gray-600">{customer.company || "\u2014"}</p>
                    {customer.jobTitle && (
                      <p className="text-xs text-gray-400">{customer.jobTitle}</p>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <span className={cn("text-xs px-2.5 py-1 rounded-full font-medium", statusColors[customer.status] || statusColors.active)}>
                      {statusLabels[customer.status] || customer.status}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    {customer.customerStatus ? (
                      <span
                        className="text-xs px-2.5 py-1 rounded-full font-medium"
                        style={{ backgroundColor: customer.customerStatus.color + "20", color: customer.customerStatus.color }}
                      >
                        {customer.customerStatus.name}
                      </span>
                    ) : (
                      <span className="text-xs text-gray-300">--</span>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-1 flex-wrap">
                      {customerTags.slice(0, 3).map((tag: any) => (
                        <span
                          key={tag.id}
                          className="text-xs px-2 py-0.5 rounded-full font-medium"
                          style={{ backgroundColor: tag.color + "20", color: tag.color }}
                        >
                          {tag.name}
                        </span>
                      ))}
                      {customerTags.length > 3 && (
                        <span className="text-xs text-gray-400">+{customerTags.length - 3}</span>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    {surveyCountMap[customer.email] ? (
                      <span className="inline-flex items-center gap-1 text-xs text-emerald-600 font-medium">
                        <ClipboardList className="w-3.5 h-3.5" />
                        {surveyCountMap[customer.email]}
                      </span>
                    ) : (
                      <span className="text-xs text-gray-300">0</span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-xs text-gray-400">
                    {formatDate(customer.createdAt)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </>
  );
}
