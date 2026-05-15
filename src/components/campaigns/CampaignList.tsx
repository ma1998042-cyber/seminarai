"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Mail,
  Send,
  Eye,
  MousePointer,
  ExternalLink,
  Pencil,
  Trash2,
  XCircle,
  Loader2,
} from "lucide-react";
import { formatDate, cn } from "@/lib/utils";
import { deleteCampaignAction } from "@/app/(dashboard)/campaigns/[id]/actions";

interface Campaign {
  id: string;
  title: string;
  subject: string;
  status: string;
  sentCount: number;
  openCount: number;
  clickCount: number;
  scheduledAt: string | null;
  createdAt: string;
}

const statusColors: Record<string, string> = {
  draft: "bg-gray-100 text-gray-600",
  scheduled: "bg-blue-100 text-blue-700",
  sending: "bg-amber-100 text-amber-700",
  sent: "bg-green-100 text-green-700",
  canceled: "bg-red-100 text-red-500",
};

const statusLabels: Record<string, string> = {
  draft: "下書き",
  scheduled: "予約済み",
  sending: "送信中",
  sent: "送信済み",
  canceled: "キャンセル",
};

const filterTabs = [
  { value: "", label: "すべて" },
  { value: "draft", label: "下書き" },
  { value: "scheduled", label: "予約済み" },
  { value: "sent", label: "送信済み" },
  { value: "canceled", label: "キャンセル" },
];

interface CampaignListProps {
  campaigns: Campaign[];
  currentStatus?: string;
}

export default function CampaignList({ campaigns, currentStatus }: CampaignListProps) {
  const router = useRouter();
  const [deleteTarget, setDeleteTarget] = useState<Campaign | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState("");

  const handleFilterChange = (status: string) => {
    if (status) {
      router.push(`/campaigns?status=${status}`);
    } else {
      router.push("/campaigns");
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setActionLoading(true);
    setError("");
    const result = await deleteCampaignAction(deleteTarget.id);
    if (result.error) {
      setError(result.error);
      setActionLoading(false);
      return;
    }
    setDeleteTarget(null);
    setActionLoading(false);
    router.refresh();
  };

  return (
    <>
      {/* ステータスフィルタータブ */}
      <div className="flex gap-1 bg-gray-100 p-1 rounded-xl w-fit">
        {filterTabs.map((tab) => {
          const isActive = (currentStatus ?? "") === tab.value;
          return (
            <button
              key={tab.value}
              onClick={() => handleFilterChange(tab.value)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                isActive
                  ? "bg-white text-gray-900 shadow-sm"
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600">
          {error}
        </div>
      )}

      {campaigns.length > 0 ? (
        <div className="space-y-3">
          {campaigns.map((campaign) => (
            <div
              key={campaign.id}
              className="flex items-center gap-4 bg-white rounded-xl p-5 border border-gray-100 hover:shadow-md transition-all group"
            >
              <Link
                href={`/campaigns/${campaign.id}`}
                className="flex items-center gap-4 flex-1 min-w-0"
              >
                <div className="w-12 h-12 bg-purple-50 rounded-xl flex items-center justify-center flex-shrink-0">
                  <Mail className="w-6 h-6 text-purple-500" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-semibold text-gray-900 truncate">
                      {campaign.title}
                    </h3>
                    <span
                      className={cn(
                        "text-xs px-2 py-0.5 rounded-full font-medium flex-shrink-0",
                        statusColors[campaign.status] || statusColors.draft
                      )}
                    >
                      {statusLabels[campaign.status] || campaign.status}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 truncate mb-2">
                    {campaign.subject}
                  </p>
                  {campaign.status === "sent" && (
                    <div className="flex items-center gap-4 text-xs text-gray-400">
                      <span className="flex items-center gap-1">
                        <Send className="w-3 h-3" />
                        {campaign.sentCount}件送信
                      </span>
                      <span className="flex items-center gap-1">
                        <Eye className="w-3 h-3" />
                        開封率{" "}
                        {campaign.sentCount > 0
                          ? Math.round(
                              (campaign.openCount / campaign.sentCount) * 100
                            )
                          : 0}
                        %
                      </span>
                      <span className="flex items-center gap-1">
                        <MousePointer className="w-3 h-3" />
                        クリック率{" "}
                        {campaign.sentCount > 0
                          ? Math.round(
                              (campaign.clickCount / campaign.sentCount) * 100
                            )
                          : 0}
                        %
                      </span>
                    </div>
                  )}
                  {campaign.scheduledAt && campaign.status === "scheduled" && (
                    <p className="text-xs text-blue-500">
                      {formatDate(campaign.scheduledAt)} 送信予定
                    </p>
                  )}
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="text-xs text-gray-400">
                    {formatDate(campaign.createdAt)}
                  </p>
                  <ExternalLink className="w-4 h-4 text-gray-300 group-hover:text-gray-500 transition-colors mt-2 ml-auto" />
                </div>
              </Link>

              {/* ステータスに応じたアクションボタン */}
              <div className="flex items-center gap-2 flex-shrink-0">
                {campaign.status === "draft" && (
                  <>
                    <Link
                      href={`/campaigns/${campaign.id}`}
                      className="px-3 py-1.5 text-xs font-medium text-gray-500 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors flex items-center gap-1"
                    >
                      <Pencil className="w-3 h-3" />
                      編集
                    </Link>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setDeleteTarget(campaign);
                      }}
                      className="px-3 py-1.5 text-xs font-medium text-red-500 border border-red-200 rounded-lg hover:bg-red-50 transition-colors flex items-center gap-1"
                    >
                      <Trash2 className="w-3 h-3" />
                      削除
                    </button>
                  </>
                )}
                {campaign.status === "scheduled" && (
                  <>
                    <Link
                      href={`/campaigns/${campaign.id}`}
                      className="px-3 py-1.5 text-xs font-medium text-gray-500 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors flex items-center gap-1"
                    >
                      <Pencil className="w-3 h-3" />
                      編集
                    </Link>
                    <Link
                      href={`/campaigns/${campaign.id}`}
                      className="px-3 py-1.5 text-xs font-medium text-amber-600 border border-amber-200 rounded-lg hover:bg-amber-50 transition-colors flex items-center gap-1"
                    >
                      <XCircle className="w-3 h-3" />
                      キャンセル
                    </Link>
                  </>
                )}
                {campaign.status === "sent" && (
                  <Link
                    href={`/campaigns/${campaign.id}`}
                    className="px-3 py-1.5 text-xs font-medium text-indigo-600 border border-indigo-200 rounded-lg hover:bg-indigo-50 transition-colors flex items-center gap-1"
                  >
                    <Eye className="w-3 h-3" />
                    詳細
                  </Link>
                )}
                {campaign.status === "canceled" && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setDeleteTarget(campaign);
                    }}
                    className="px-3 py-1.5 text-xs font-medium text-red-500 border border-red-200 rounded-lg hover:bg-red-50 transition-colors flex items-center gap-1"
                  >
                    <Trash2 className="w-3 h-3" />
                    削除
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-100 p-16 text-center">
          <Mail className="w-12 h-12 text-gray-200 mx-auto mb-4" />
          <h3 className="font-semibold text-gray-700 mb-2">
            {currentStatus
              ? "該当するメルマガがありません"
              : "まだメルマガがありません"}
          </h3>
          {!currentStatus && (
            <>
              <p className="text-sm text-gray-400 mb-6">
                顧客にパーソナライズされたメールを送りましょう
              </p>
              <Link
                href="/campaigns/new"
                className="inline-flex items-center gap-2 bg-indigo-600 text-white px-6 py-3 rounded-lg text-sm font-semibold hover:bg-indigo-700 transition-colors"
              >
                最初のメルマガを作成する
              </Link>
            </>
          )}
        </div>
      )}

      {/* 削除確認ダイアログ */}
      {deleteTarget && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full mx-4 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
                <Trash2 className="w-5 h-5 text-red-600" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">キャンペーンを削除</h3>
                <p className="text-sm text-gray-500">
                  「{deleteTarget.title}」を削除します。この操作は取り消せません。
                </p>
              </div>
            </div>
            {error && (
              <p className="text-sm text-red-600">{error}</p>
            )}
            <div className="flex gap-3">
              <button
                onClick={() => {
                  setDeleteTarget(null);
                  setError("");
                }}
                className="flex-1 py-2.5 rounded-lg border border-gray-200 text-gray-600 text-sm font-medium hover:bg-gray-50 transition-colors"
              >
                キャンセル
              </button>
              <button
                onClick={handleDelete}
                disabled={actionLoading}
                className="flex-1 py-2.5 rounded-lg bg-red-600 text-white text-sm font-semibold hover:bg-red-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {actionLoading && <Loader2 className="w-4 h-4 animate-spin" />}
                削除する
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
