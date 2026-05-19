import { getDbFromContext } from "@/lib/db";
import { User } from "lucide-react";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "運営者情報 | SeminarAI",
  description: "SeminarAIの運営者情報",
};

export default async function AboutPage() {
  const db = getDbFromContext();

  // 最初の組織情報を取得（将来的にはダッシュボードから編集可能に）
  const org = await db.query.organizations.findFirst();

  return (
    <div className="py-12 px-4">
      <div className="max-w-3xl mx-auto">
        <div className="text-center mb-10">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">運営者情報</h1>
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8">
          <div className="flex flex-col items-center text-center mb-8">
            <div className="w-24 h-24 bg-indigo-100 rounded-full flex items-center justify-center mb-4">
              <User className="w-12 h-12 text-indigo-400" />
            </div>
            <h2 className="text-xl font-bold text-gray-900">
              {org?.name || "SeminarAI"}
            </h2>
            {org?.website && (
              <a
                href={org.website}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-indigo-600 hover:text-indigo-700 mt-1"
              >
                {org.website}
              </a>
            )}
          </div>

          {org?.description && (
            <div className="border-t border-gray-100 pt-6">
              <h3 className="text-sm font-semibold text-gray-700 mb-3">紹介</h3>
              <p className="text-sm text-gray-600 leading-relaxed whitespace-pre-wrap">
                {org.description}
              </p>
            </div>
          )}

          <div className="border-t border-gray-100 pt-6 mt-6">
            <h3 className="text-sm font-semibold text-gray-700 mb-3">サービスについて</h3>
            <p className="text-sm text-gray-600 leading-relaxed">
              SeminarAIは、セミナー・イベントの企画から集客、顧客管理、フォローアップまでを一元管理できるプラットフォームです。
              効率的なイベント運営を実現し、参加者との関係構築をサポートします。
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
